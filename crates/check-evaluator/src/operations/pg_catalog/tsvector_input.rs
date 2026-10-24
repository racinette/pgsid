const TSVECTOR_SYNTAX_ERROR: u32 = 6819553;
const TSVECTOR_PROGRAM_LIMIT: u32 = 8584704;

fn tsvector_normalize_lexeme(text: String, positions: Vec<TsvectorPosition>) -> TsvectorLexeme {
    let lexemes: Vec<TsvectorLexeme> = Vec::new();
    let source = TsvectorSortSource {lexemes:lexemes,positions:positions,by_position:true};
    let order = tsvector_sort(&source);
    let mut values: Vec<TsvectorPosition> = Vec::new();
    let mut i: usize = 0;
    while i < order.indexes.len() {
        let value = source.positions[order.indexes[i].value];
        if values.len() == 0 { values.push(value); }
        else {
            let last = values.len() - 1;
            if values[last].position == value.position {
                if values[last].weight < value.weight { values[last] = value; };
            } else {
                values.push(value);
                if values.len() == 256 || value.position == 16383 {
                    return TsvectorLexeme {text:text,positions:values};
                };
            };
        };
        i += 1;
    }
    TsvectorLexeme {text:text,positions:values}
}

#[derive(Clone)]
struct TsvectorPositionBuffer { values: Vec<TsvectorPosition> }
fn tsvector_position_append(input: TsvectorPositionBuffer, value: TsvectorPosition) -> TsvectorPositionBuffer {
    let mut values = input.values;
    values.push(value);
    TsvectorPositionBuffer {values:values}
}

fn tsvector_normalize(lexemes: Vec<TsvectorLexeme>) -> TsvectorValue {
    let positions: Vec<TsvectorPosition> = Vec::new();
    let source = TsvectorSortSource {lexemes:lexemes,positions:positions,by_position:false};
    let order = tsvector_sort(&source);
    let mut result: Vec<TsvectorLexeme> = Vec::new();
    let mut current = String::new();
    let initial: Vec<TsvectorPosition> = Vec::new();
    let mut collected = TsvectorPositionBuffer {values:initial};
    let mut i: usize = 0;
    while i < order.indexes.len() {
        let lexeme = source.lexemes[order.indexes[i].value].clone();
        if current != lexeme.text {
            if current != "" { result.push(tsvector_normalize_lexeme(current,collected.values)); };
            current = lexeme.text;
            let empty: Vec<TsvectorPosition> = Vec::new();
            collected = TsvectorPositionBuffer {values:empty};
        };
        let mut p: usize = 0;
        while p < lexeme.positions.len() { collected = tsvector_position_append(collected,lexeme.positions[p]); p += 1; }
        i += 1;
    }
    if current != "" { result.push(tsvector_normalize_lexeme(current,collected.values)); };
    let payload = TsvectorPayload {lexemes:result,native_bytes:-1};
    let bytes = tsvector_canonical_bytes(&payload);
    if bytes < 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_PROGRAM_LIMIT)); };
    make_tsvector_value(TsvectorPayload {lexemes:payload.lexemes,native_bytes:bytes})
}

fn tsvector_parse_text(input: TextValue, utf8: bool, stored: bool) -> TsvectorValue {
    if let TextValue::Error(error) = input { return TsvectorValue::Error(error); };
    if input == TextValue::Null { return TsvectorValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut index: usize = 0;
        let mut raw_bytes: i64 = 0i64;
        let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
        while index < chars.len() {
            while index < chars.len() && numeric_space(chars[index]) { index += 1; }
            if index == chars.len() { return tsvector_normalize(lexemes); };
            let mut word = String::new();
            let mut state: i32 = 0;
            if chars[index] == '\'' { state = 1; index += 1; };
            let mut reading = true;
            let mut first = true;
            while index < chars.len() && reading {
                let character = chars[index];
                if character == '\0' { return TsvectorValue::Unknown; };
                if (character as i32) >= 128 && utf8 == false { return TsvectorValue::Unknown; };
                if character == '\\' {
                    index += 1;
                    if index == chars.len() { return TsvectorValue::Error(make_sql_error(TSVECTOR_SYNTAX_ERROR)); };
                    let escaped = chars[index];
                    if escaped == '\0' || ((escaped as i32) >= 128 && utf8 == false) { return TsvectorValue::Unknown; };
                    word.push(escaped);
                    index += 1;
                    first = false;
                } else if state == 1 {
                    if character == '\'' {
                        if index + 1 < chars.len() && chars[index + 1] == '\'' {
                            word.push('\'');
                            index += 2;
                        } else { state = 2; reading = false; index += 1; };
                    } else { word.push(character); index += 1; };
                    first = false;
                } else if first == false && (numeric_space(character) || character == ':') {
                    reading = false;
                } else {
                    word.push(character);
                    index += 1;
                    first = false;
                };
            }
            if state == 1 || word == "" { return TsvectorValue::Error(make_sql_error(TSVECTOR_SYNTAX_ERROR)); };
            let mut positions: Vec<TsvectorPosition> = Vec::new();
            if index < chars.len() && chars[index] == ':' {
                index += 1;
                let mut more = true;
                while more {
                    if index == chars.len() || (chars[index] as i32) < 48 || (chars[index] as i32) > 57 {
                        return TsvectorValue::Error(make_sql_error(TSVECTOR_SYNTAX_ERROR));
                    };
                    let mut position: i32 = 0;
                    while index < chars.len() && (chars[index] as i32) >= 48 && (chars[index] as i32) <= 57 {
                        let digit = (chars[index] as i32) - 48;
                        if position > 214748364 || (position == 214748364 && digit > 7) { return TsvectorValue::Unknown; };
                        position = position * 10 + digit;
                        index += 1;
                    }
                    if position == 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_SYNTAX_ERROR)); };
                    if position > 16383 { position = 16383; };
                    let mut weight: i32 = 0;
                    let mut modifiers = true;
                    while index < chars.len() && modifiers {
                        let character = chars[index];
                        let mut selected: i32 = -1;
                        if character == 'a' || character == 'A' || character == '*' { selected = 3; };
                        if character == 'b' || character == 'B' { selected = 2; };
                        if character == 'c' || character == 'C' { selected = 1; };
                        if character == 'd' || character == 'D' { selected = 0; };
                        if selected >= 0 {
                            if weight != 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_SYNTAX_ERROR)); };
                            weight = selected;
                            index += 1;
                        } else if (character as i32) >= 48 && (character as i32) <= 57 { index += 1; }
                        else if character == ',' || numeric_space(character) { modifiers = false; }
                        else { return TsvectorValue::Error(make_sql_error(TSVECTOR_SYNTAX_ERROR)); };
                    }
                    positions.push(TsvectorPosition {position:position,weight:weight});
                    more = index < chars.len() && chars[index] == ',';
                    if more { index += 1; };
                }
            };
            let width = tsvector_lexeme_bytes(word.as_str());
            if width < 0 { return TsvectorValue::Unknown; };
            if (width >= 2047 && stored == false) || width > 2047 || raw_bytes > 1048575i64 { return TsvectorValue::Error(make_sql_error(TSVECTOR_PROGRAM_LIMIT)); };
            raw_bytes = raw_bytes + (width as i64);
            lexemes.push(TsvectorLexeme {text:word,positions:positions});
        }
        return tsvector_normalize(lexemes);
    };
    TsvectorValue::Unknown
}

pub fn tsvector_from_text_context(input: TextValue, utf8: bool) -> TsvectorValue { tsvector_parse_text(input,utf8,false) }

pub fn tsvector_from_stored_text_context(input: TextValue, utf8: bool) -> TsvectorValue {
    if let TextValue::Error(error) = input { return TsvectorValue::Error(error); };
    let value = tsvector_parse_text(input,utf8,true);
    if let TsvectorValue::Value(payload) = value {
        return make_tsvector_value(TsvectorPayload {lexemes:payload.lexemes,native_bytes:-1});
    };
    if let TsvectorValue::Error(_) = value { return TsvectorValue::Unknown; };
    value
}

pub fn tsvector_from_text(input: TextValue) -> TsvectorValue { tsvector_from_text_context(input,false) }

pub fn tsvector_to_text(input: TsvectorValue) -> TextValue {
    if let TsvectorValue::Error(error) = input { return TextValue::Error(error); };
    if let TsvectorValue::Null = input { return TextValue::Null; };
    if let TsvectorValue::Value(value) = input {
        let mut text = String::new();
        let mut i: usize = 0;
        while i < value.lexemes.len() {
            if i > 0 { text.push(' '); };
            text.push('\'');
            let chars: Vec<char> = value.lexemes[i].text.chars().collect();
            let mut c: usize = 0;
            while c < chars.len() {
                if chars[c] == '\'' || chars[c] == '\\' { text.push(chars[c]); };
                text.push(chars[c]); c += 1;
            }
            text.push('\'');
            let mut p: usize = 0;
            while p < value.lexemes[i].positions.len() {
                if p == 0 { text.push(':'); } else { text.push(','); };
                let position = value.lexemes[i].positions[p];
                let digits = text_number(position.position,10);
                text.push_str(digits.as_str());
                if position.weight == 3 { text.push('A'); };
                if position.weight == 2 { text.push('B'); };
                if position.weight == 1 { text.push('C'); };
                p += 1;
            }
            i += 1;
        }
        return TextValue::Value(text);
    };
    TextValue::Unknown
}
