const TSVECTOR_NULL_ELEMENT: u32 = 3452548;
const TSVECTOR_EMPTY_LEXEME: u32 = 3452559;

fn tsvector_weight_code(code: i32) -> i32 {
    if code == 65 || code == 97 { return 3; };
    if code == 66 || code == 98 { return 2; };
    if code == 67 || code == 99 { return 1; };
    if code == 68 || code == 100 { return 0; };
    -1
}

fn tsvector_rebuild(lexemes: Vec<TsvectorLexeme>) -> TsvectorValue {
    let payload = TsvectorPayload {lexemes:lexemes,native_bytes:-1};
    let bytes = tsvector_canonical_bytes(&payload);
    if bytes < 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_PROGRAM_LIMIT)); };
    make_tsvector_value(TsvectorPayload {lexemes:payload.lexemes,native_bytes:bytes})
}

fn tsvector_find_lexeme(input: &TsvectorPayload, text: &str) -> i32 {
    let mut low: i32 = 0;
    let mut high = input.lexemes.len() as i32;
    while low < high {
        let middle = (low + high) / 2;
        let order = tsvector_lexeme_order(text,input.lexemes[usize::try_from(middle).unwrap_or(0)].text.as_str());
        if order == 0 { return middle; };
        if order < 0 { high = middle; }
        else { low = middle + 1; };
    }
    -1
}

fn tsvector_apply_selection(input: TsvectorPayload, selected: Vec<usize>, weight: i32, reweight: bool) -> TsvectorValue {
    let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
    let mut i: usize = 0;
    while i < input.lexemes.len() {
        let lexeme = input.lexemes[i].clone();
        if reweight && selected[i] == 1 {
            let mut positions = lexeme.positions;
            let mut p: usize = 0;
            while p < positions.len() {
                let original = positions[p];
                positions[p] = TsvectorPosition {position:original.position,weight:weight};
                p += 1;
            }
            lexemes.push(TsvectorLexeme {text:lexeme.text,positions:positions});
        } else if reweight || selected[i] == 0 { lexemes.push(lexeme); };
        i += 1;
    }
    if reweight { return TsvectorValue::Value(TsvectorPayload {lexemes:lexemes,native_bytes:input.native_bytes}); };
    tsvector_rebuild(lexemes)
}

fn tsvector_select_array(input: TsvectorValue, weight: InternalCharValue, selectors: ArrayValue, reweight: bool) -> TsvectorValue {
    if let TsvectorValue::Error(error) = input { return TsvectorValue::Error(error); };
    if let InternalCharValue::Error(error) = weight { return TsvectorValue::Error(error); };
    if let ArrayValue::Error(error) = selectors { return TsvectorValue::Error(error); };
    if let TsvectorValue::Unknown = input { return TsvectorValue::Unknown; };
    if weight == InternalCharValue::Unknown { return TsvectorValue::Unknown; };
    if let ArrayValue::Unknown = selectors { return TsvectorValue::Unknown; };
    if let TsvectorValue::Null = input { return TsvectorValue::Null; };
    if weight == InternalCharValue::Null { return TsvectorValue::Null; };
    if let ArrayValue::Null = selectors { return TsvectorValue::Null; };
    if let TsvectorValue::Value(payload) = input {
        if let InternalCharValue::Value(code) = weight {
            let selected_weight = tsvector_weight_code(code);
            if selected_weight < 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_INVALID_PARAMETER)); };
            if let ArrayValue::Value(array) = selectors {
                if array.element_kind != 8 { return TsvectorValue::Unknown; };
                let mut selected: Vec<usize> = Vec::new();
                let mut i: usize = 0;
                while i < payload.lexemes.len() { selected.push(0); i += 1; }
                i = 0;
                while i < array.elements.len() {
                    let cell = array_element_to_text(array.elements[i].clone());
                    if let TextValue::Error(error) = cell { return TsvectorValue::Error(error); };
                    if cell == TextValue::Unknown { return TsvectorValue::Unknown; };
                    if let TextValue::Value(text) = cell {
                        let index = tsvector_find_lexeme(&payload,text.as_str());
                        if index >= 0 { selected[usize::try_from(index).unwrap_or(0)] = 1; };
                    };
                    i += 1;
                }
                return tsvector_apply_selection(payload,selected,selected_weight,reweight);
            };
        };
    };
    TsvectorValue::Unknown
}

pub fn sql__pg_catalog__setweight__ozd9(input: TsvectorValue, weight: InternalCharValue, selectors: ArrayValue) -> TsvectorValue {
    tsvector_select_array(input,weight,selectors,true)
}

pub fn sql__pg_catalog__ts_delete__ytqn(input: TsvectorValue, selectors: ArrayValue) -> TsvectorValue {
    tsvector_select_array(input,InternalCharValue::Value(68),selectors,false)
}

pub fn sql__pg_catalog__ts_delete__y2kd(input: TsvectorValue, selector: TextValue) -> TsvectorValue {
    if let TsvectorValue::Error(error) = input { return TsvectorValue::Error(error); };
    if let TextValue::Error(error) = selector { return TsvectorValue::Error(error); };
    if let TsvectorValue::Unknown = input { return TsvectorValue::Unknown; };
    if selector == TextValue::Unknown { return TsvectorValue::Unknown; };
    if let TsvectorValue::Null = input { return TsvectorValue::Null; };
    if selector == TextValue::Null { return TsvectorValue::Null; };
    if let TsvectorValue::Value(payload) = input {
        if let TextValue::Value(text) = selector {
            let index = tsvector_find_lexeme(&payload,text.as_str());
            if index < 0 { return TsvectorValue::Value(payload); };
            let mut selected: Vec<usize> = Vec::new();
            let mut i: usize = 0;
            while i < payload.lexemes.len() { selected.push(0); i += 1; }
            selected[usize::try_from(index).unwrap_or(0)] = 1;
            return tsvector_apply_selection(payload,selected,0,false);
        };
    };
    TsvectorValue::Unknown
}

pub fn sql__pg_catalog__ts_filter__82l1(input: TsvectorValue, weights: ArrayValue) -> TsvectorValue {
    if let TsvectorValue::Error(error) = input { return TsvectorValue::Error(error); };
    if let ArrayValue::Error(error) = weights { return TsvectorValue::Error(error); };
    if let TsvectorValue::Unknown = input { return TsvectorValue::Unknown; };
    if let ArrayValue::Unknown = weights { return TsvectorValue::Unknown; };
    if let TsvectorValue::Null = input { return TsvectorValue::Null; };
    if let ArrayValue::Null = weights { return TsvectorValue::Null; };
    if let TsvectorValue::Value(payload) = input {
        if let ArrayValue::Value(array) = weights {
            if array.element_kind != 32 { return TsvectorValue::Unknown; };
            let mut mask: Vec<usize> = Vec::new();
            mask.push(0); mask.push(0); mask.push(0); mask.push(0);
            let mut i: usize = 0;
            while i < array.elements.len() {
                let cell = array_element_to_internal_char(array.elements[i].clone());
                if let InternalCharValue::Error(error) = cell { return TsvectorValue::Error(error); };
                if cell == InternalCharValue::Unknown { return TsvectorValue::Unknown; };
                if cell == InternalCharValue::Null { return TsvectorValue::Error(make_sql_error(TSVECTOR_NULL_ELEMENT)); };
                if let InternalCharValue::Value(code) = cell {
                    let weight = tsvector_weight_code(code);
                    if weight < 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_INVALID_PARAMETER)); };
                    mask[usize::try_from(weight).unwrap_or(0)] = 1;
                };
                i += 1;
            }
            let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
            i = 0;
            while i < payload.lexemes.len() {
                let lexeme = payload.lexemes[i].clone();
                let mut positions: Vec<TsvectorPosition> = Vec::new();
                let mut p: usize = 0;
                while p < lexeme.positions.len() {
                    let value = lexeme.positions[p];
                    if mask[usize::try_from(value.weight).unwrap_or(0)] == 1 { positions.push(value); };
                    p += 1;
                }
                if positions.len() > 0 { lexemes.push(TsvectorLexeme {text:lexeme.text,positions:positions}); };
                i += 1;
            }
            return tsvector_rebuild(lexemes);
        };
    };
    TsvectorValue::Unknown
}

pub fn sql__pg_catalog__array_to_tsvector__y8ia(input: ArrayValue, utf8: bool) -> TsvectorValue {
    if let ArrayValue::Error(error) = input { return TsvectorValue::Error(error); };
    if let ArrayValue::Null = input { return TsvectorValue::Null; };
    if let ArrayValue::Value(array) = input {
        if array.element_kind != 8 { return TsvectorValue::Unknown; };
        let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
        let mut i: usize = 0;
        while i < array.elements.len() {
            let cell = array_element_to_text(array.elements[i].clone());
            if let TextValue::Error(error) = cell { return TsvectorValue::Error(error); };
            if cell == TextValue::Unknown { return TsvectorValue::Unknown; };
            if cell == TextValue::Null { return TsvectorValue::Error(make_sql_error(TSVECTOR_NULL_ELEMENT)); };
            if let TextValue::Value(text) = cell {
                if text == "" { return TsvectorValue::Error(make_sql_error(TSVECTOR_EMPTY_LEXEME)); };
                let chars: Vec<char> = text.chars().collect();
                let mut c: usize = 0;
                while c < chars.len() {
                    if utf8 == false && (chars[c] as i32) > 127 { return TsvectorValue::Unknown; };
                    c += 1;
                }
                if tsvector_lexeme_bytes(text.as_str()) > 2046 { return TsvectorValue::Error(make_sql_error(TSVECTOR_PROGRAM_LIMIT)); };
                let positions: Vec<TsvectorPosition> = Vec::new();
                lexemes.push(TsvectorLexeme {text:text,positions:positions});
            };
            i += 1;
        }
        return tsvector_normalize(lexemes);
    };
    TsvectorValue::Unknown
}

fn tsvector_concat_positions(left: TsvectorLexeme, right: TsvectorLexeme, offset: i32) -> TsvectorLexeme {
    let mut positions = left.positions;
    let mut i: usize = 0;
    while i < right.positions.len() && positions.len() < 256 {
        if positions.len() > 0 && positions[positions.len() - 1].position == 16383 { return TsvectorLexeme {text:left.text,positions:positions}; };
        let value = right.positions[i];
        let mut position = value.position + offset;
        if position > 16383 { position = 16383; };
        positions.push(TsvectorPosition {position:position,weight:value.weight});
        i += 1;
    }
    TsvectorLexeme {text:left.text,positions:positions}
}

pub fn sql__pg_catalog__tsvector_concat__0ejl(left: TsvectorValue, right: TsvectorValue) -> TsvectorValue {
    if let TsvectorValue::Error(error) = left { return TsvectorValue::Error(error); };
    if let TsvectorValue::Error(error) = right { return TsvectorValue::Error(error); };
    if let TsvectorValue::Unknown = left { return TsvectorValue::Unknown; };
    if let TsvectorValue::Unknown = right { return TsvectorValue::Unknown; };
    if let TsvectorValue::Null = left { return TsvectorValue::Null; };
    if let TsvectorValue::Null = right { return TsvectorValue::Null; };
    if let TsvectorValue::Value(a) = left {
        if let TsvectorValue::Value(b) = right {
            let mut offset: i32 = 0;
            let mut i: usize = 0;
            while i < a.lexemes.len() {
                let mut p: usize = 0;
                while p < a.lexemes[i].positions.len() {
                    if a.lexemes[i].positions[p].position > offset { offset = a.lexemes[i].positions[p].position; };
                    p += 1;
                }
                i += 1;
            }
            let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
            i = 0;
            let mut j: usize = 0;
            while i < a.lexemes.len() || j < b.lexemes.len() {
                let mut order: i32 = 0;
                if i == a.lexemes.len() { order = 1; }
                else if j == b.lexemes.len() { order = -1; }
                else { order = tsvector_lexeme_order(a.lexemes[i].text.as_str(),b.lexemes[j].text.as_str()); };
                if order < 0 { lexemes.push(a.lexemes[i].clone()); i += 1; }
                else if order > 0 {
                    let word = b.lexemes[j].clone();
                    let positions: Vec<TsvectorPosition> = Vec::new();
                    let empty = TsvectorLexeme {text:word.text.clone(),positions:positions};
                    lexemes.push(tsvector_concat_positions(empty,word,offset));
                    j += 1;
                } else {
                    lexemes.push(tsvector_concat_positions(a.lexemes[i].clone(),b.lexemes[j].clone(),offset));
                    i += 1;
                    j += 1;
                };
            }
            return tsvector_rebuild(lexemes);
        };
    };
    TsvectorValue::Unknown
}

pub fn sql__pg_catalog__tsvectorsend__37x7(input: TsvectorValue, utf8: bool) -> ByteaValue {
    if let TsvectorValue::Error(error) = input { return ByteaValue::Error(error); };
    if let TsvectorValue::Null = input { return ByteaValue::Null; };
    if let TsvectorValue::Value(payload) = input {
        let count = payload.lexemes.len() as i32;
        let mut output = String::new();
        output = bytea_append_byte(output,count / 16777216 % 256);
        output = bytea_append_byte(output,count / 65536 % 256);
        output = bytea_append_byte(output,count / 256 % 256);
        output = bytea_append_byte(output,count % 256);
        let mut i: usize = 0;
        while i < payload.lexemes.len() {
            let lexeme = payload.lexemes[i].clone();
            let chars: Vec<char> = lexeme.text.chars().collect();
            let mut c: usize = 0;
            while c < chars.len() {
                if utf8 == false && (chars[c] as i32) > 127 { return ByteaValue::Unknown; };
                output = bytea_utf8_character(output,chars[c]);
                c += 1;
            }
            output = bytea_append_byte(output,0);
            let length = lexeme.positions.len() as i32;
            output = bytea_append_byte(output,length / 256);
            output = bytea_append_byte(output,length % 256);
            let mut p: usize = 0;
            while p < lexeme.positions.len() {
                let value = lexeme.positions[p];
                let word = value.weight * 16384 + value.position;
                output = bytea_append_byte(output,word / 256);
                output = bytea_append_byte(output,word % 256);
                p += 1;
            }
            i += 1;
        }
        return ByteaValue::Value(output);
    };
    ByteaValue::Unknown
}
