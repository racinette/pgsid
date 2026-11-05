const OID_ALIAS_INVALID_NAME: u32 = 6819554;
const OID_ALIAS_INVALID_SIGNATURE: u32 = 3484946;
const OID_ALIAS_INVALID_TYPE: u32 = 6819553;
const OID_ALIAS_OPERATOR_ARGUMENTS: u32 = 8584779;

// Grammars: 0 a qualified name, 1 a name with an argument list, 2 a type name, 3 a single name.
pub fn oid_alias_from_text(input: TextValue, dash: bool, grammar: i32) -> OidValue {
    oid_alias_read(input, dash, grammar, false)
}

// A soft read answers NULL where the to_reg* lookups catch the input error. Too many dotted names
// and type syntax errors are raised outside that catch and stay errors.
fn oid_alias_read(input: TextValue, dash: bool, grammar: i32, soft: bool) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input { return OidValue::Error(error); };
    if input == TextValue::Null { return OidValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if dash && chars.len() == 1 && chars[0] == '-' { return make_oid_value(0i64); };
        let mut numeric = chars.len() != 0;
        let mut index: usize = 0;
        while index < chars.len() {
            let code = chars[index] as i32;
            if code < 48 || code > 57 { numeric = false; };
            index += 1;
        };
        if numeric {
            let value = oid_from_text(TextValue::Value(text));
            if soft { if let OidValue::Error(_) = value { return OidValue::Null; }; };
            return value;
        };
        let mut outcome: i32 = 0;
        if grammar == 1 {
            // Operators are the signatures without the dash spelling of zero.
            outcome = oid_alias_signature_read(text.as_str(), dash == false);
        } else if grammar == 2 {
            outcome = oid_alias_type_read(text.as_str());
        } else {
            let parts = oid_alias_name_parts(text.as_str(), 0, chars.len());
            if parts < 1 || (grammar == 3 && parts != 1) { outcome = 1; };
            if grammar != 3 && parts > 3 { outcome = 3; };
        };
        if soft && (outcome == 1 || outcome == 2 || outcome == 4 || outcome == 5) { return OidValue::Null; };
        if outcome == 1 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_NAME)); };
        if outcome == 2 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_SIGNATURE)); };
        if outcome == 3 || outcome == 4 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_TYPE)); };
        if outcome == 5 { return OidValue::Error(make_sql_error(OID_ALIAS_OPERATOR_ARGUMENTS)); };
        if outcome == 6 { return oid_unresolved(2); };
    };
    // A name resolves through the deployment's catalog, and a three-part name through the
    // current database's name.
    oid_unresolved(resolution_context(unresolved_flavor))
}

// The server's identifier list splitter: a part is a quoted name with doubled quotes, or text up
// to a dot or whitespace; whitespace may surround the dots. Returns the part count, 0 for blank
// text, and -1 where the server reports invalid name syntax.
fn oid_alias_name_parts(text: &str, start: usize, end: usize) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let mut index = start;
    while index < end && oid_input_space(chars[index]) { index += 1; };
    if index == end { return 0; };
    let mut parts: i32 = 0;
    while index < end {
        if chars[index] == '"' {
            index += 1;
            let mut closed = false;
            while index < end && closed == false {
                if chars[index] == '"' {
                    if index + 1 < end && chars[index + 1] == '"' { index += 2; } else { closed = true; index += 1; };
                } else {
                    index += 1;
                };
            }
            if closed == false { return -1; };
        } else {
            let first = index;
            while index < end && chars[index] != '.' && oid_input_space(chars[index]) == false { index += 1; };
            if index == first { return -1; };
        };
        parts = parts + 1;
        while index < end && oid_input_space(chars[index]) { index += 1; };
        if index < end {
            if chars[index] != '.' { return -1; };
            index += 1;
            while index < end && oid_input_space(chars[index]) { index += 1; };
            if index == end { return -1; };
        };
    }
    parts
}

// Outcomes, in the server's order: no unquoted parenthesis, an unreadable name, no closing
// parenthesis, then a first argument with an open quote or unbalanced brackets. Later arguments
// are reached only after the first type resolves through the catalog. Without arguments an
// operator has the wrong count (54023) and a function name is split before any lookup.
fn oid_alias_signature_read(text: &str, operator: bool) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let end = chars.len();
    let mut quoted = false;
    let mut open = end;
    let mut index: usize = 0;
    while index < end && open == end {
        if chars[index] == '"' {
            quoted = quoted == false;
        } else if chars[index] == '(' && quoted == false {
            open = index;
        };
        index += 1;
    }
    if open == end { return 2; };
    let parts = oid_alias_name_parts(text, 0, open);
    if parts < 1 { return 1; };
    let mut close = end;
    while close > open + 1 && oid_input_space(chars[close - 1]) { close = close - 1; };
    if close == open + 1 || chars[close - 1] != ')' { return 2; };
    let last = close - 1;
    index = open + 1;
    while index < last && oid_input_space(chars[index]) { index += 1; };
    if index == last {
        if operator { return 5; };
        if parts > 3 { return 3; };
        return 0;
    };
    quoted = false;
    let mut depth: i32 = 0;
    while index < last {
        let ch = chars[index];
        if ch == '"' {
            quoted = quoted == false;
        } else if ch == ',' && quoted == false && depth == 0 {
            break;
        } else if quoted == false {
            if ch == '(' || ch == '[' { depth = depth + 1; };
            if ch == ')' || ch == ']' { depth = depth - 1; };
        };
        index += 1;
    }
    if quoted || depth != 0 { return 2; };
    0
}

// Type names go through the SQL parser, whose lexer reads a comment as whitespace (block comments
// nest) and rejects one left open. A literal or parameter needs the full grammar, so text with
// one is not decided here; otherwise an open quote, an empty quoted name, unbalanced brackets, an
// empty or fourth dotted part, or a leading digit or sign cannot parse. Blank text is the one
// syntax error the lookups catch, and only before comments are read.
fn oid_alias_type_read(text: &str) -> i32 {
    let source: Vec<char> = text.chars().collect();
    let mut stripped = String::new();
    let mut commented = false;
    let mut cursor: usize = 0;
    while cursor < source.len() {
        let ch = source[cursor];
        if ch == '"' {
            stripped.push(ch);
            cursor += 1;
            let mut open = true;
            while cursor < source.len() && open {
                if source[cursor] == '"' && cursor + 1 < source.len() && source[cursor + 1] == '"' {
                    stripped.push('"');
                    stripped.push('"');
                    cursor += 2;
                } else {
                    if source[cursor] == '"' { open = false; };
                    stripped.push(source[cursor]);
                    cursor += 1;
                };
            }
        } else if ch == '-' && cursor + 1 < source.len() && source[cursor + 1] == '-' {
            commented = true;
            while cursor < source.len() && source[cursor] != '\n' && source[cursor] != '\r' {
                cursor += 1;
            }
            stripped.push(' ');
        } else if ch == '/' && cursor + 1 < source.len() && source[cursor + 1] == '*' {
            commented = true;
            let mut nesting: i32 = 1;
            cursor += 2;
            while cursor < source.len() && nesting > 0 {
                if source[cursor] == '/' && cursor + 1 < source.len() && source[cursor + 1] == '*' {
                    nesting = nesting + 1;
                    cursor += 2;
                } else if source[cursor] == '*' && cursor + 1 < source.len() && source[cursor + 1] == '/' {
                    nesting = nesting - 1;
                    cursor += 2;
                } else {
                    cursor += 1;
                };
            }
            if nesting > 0 { return 3; };
            stripped.push(' ');
        } else {
            if ch == '\'' { return 6; };
            if ch == '$' {
                // A dollar inside an identifier is part of it; elsewhere it opens a literal or a
                // parameter.
                let mut inside = false;
                if cursor > 0 {
                    let previous = source[cursor - 1] as i32;
                    inside = (previous >= 48 && previous <= 57) || (previous >= 65 && previous <= 90) || (previous >= 97 && previous <= 122) || previous == 95 || previous == 36;
                };
                if inside == false { return 6; };
            };
            stripped.push(ch);
            cursor += 1;
        };
    }
    let chars: Vec<char> = stripped.chars().collect();
    let mut first = ' ';
    let mut index: usize = 0;
    while index < chars.len() {
        let ch = chars[index];
        if first == ' ' && oid_input_space(ch) == false { first = ch; };
        index += 1;
    }
    if first == ' ' {
        if commented { return 3; };
        return 4;
    };
    let code = first as i32;
    if (code >= 48 && code <= 57) || first == '+' || first == '-' { return 3; };
    let mut quoted = false;
    let mut parts: i32 = 1;
    let mut part_length: i32 = 0;
    let mut empty_part = false;
    let mut depth: i32 = 0;
    let mut brackets: i32 = 0;
    let mut balanced = true;
    index = 0;
    while index < chars.len() {
        let ch = chars[index];
        if ch == '"' {
            // A quoted name runs to a quote that is not doubled; an empty one is a lexer error.
            if index + 2 >= chars.len() || chars[index + 2] != '"' {
                if index + 1 < chars.len() && chars[index + 1] == '"' {
                    return 3;
                };
            };
            index += 1;
            quoted = true;
            while index < chars.len() && quoted {
                if chars[index] == '"' && index + 1 < chars.len() && chars[index + 1] == '"' {
                    index += 2;
                } else if chars[index] == '"' {
                    quoted = false;
                } else {
                    index += 1;
                };
            }
            part_length = part_length + 1;
        } else if ch == '.' && depth == 0 {
            if part_length == 0 { empty_part = true; };
            parts = parts + 1;
            part_length = 0;
        } else {
            if ch == '(' { depth = depth + 1; };
            if ch == ')' { depth = depth - 1; };
            if ch == '[' { brackets = brackets + 1; };
            if ch == ']' { brackets = brackets - 1; };
            if depth < 0 || brackets < 0 { balanced = false; };
            if oid_input_space(ch) == false { part_length = part_length + 1; };
        };
        index += 1;
    }
    if parts > 1 && part_length == 0 { empty_part = true; };
    if quoted || empty_part || parts > 3 || depth != 0 || brackets != 0 || balanced == false { return 3; };
    oid_alias_type_words(stripped.as_str())
}

// Two words name a type only through the grammar's multi-word spellings, which begin with one of
// a few keywords and continue with words of their own; any other second word, except a trailing
// array marker, is a syntax error. SETOF before a type is rejected before the type resolves, and
// the lookups catch that error.
fn oid_alias_type_words(text: &str) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let mut first_word = String::new();
    let mut second_word = String::new();
    let mut second_start = ' ';
    let mut token: i32 = 0;
    let mut depth: i32 = 0;
    let mut quoted = false;
    let mut first_quoted = false;
    let mut first_dotted = false;
    let mut first_open = false;
    let mut first_last = ' ';
    let mut first_end: usize = 0;
    let mut second_broken = false;
    let mut index: usize = 0;
    let mut previous_space = true;
    while index < chars.len() && token < 3 {
        let ch = chars[index];
        if quoted {
            if ch == '"' { quoted = false; };
        } else if ch == '"' {
            quoted = true;
        };
        let space = oid_input_space(ch) && quoted == false && depth == 0;
        if space == false && previous_space && depth == 0 {
            token = token + 1;
            if token == 2 { second_start = ch; };
        };
        if ch == '(' || ch == '[' { depth = depth + 1; };
        if ch == ')' || ch == ']' { depth = depth - 1; };
        if token == 1 {
            if ch == '"' { first_quoted = true; };
            if ch == '.' { first_dotted = true; };
            if ch == '(' || ch == '[' { first_open = true; };
            if first_open == false && space == false { first_word.push(ch.to_ascii_lowercase()); };
            if space == false {
                first_last = ch;
                first_end = index + 1;
            };
        };
        if token == 2 {
            let code = ch as i32;
            let letter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code == 95;
            if letter == false && space == false { second_broken = true; };
            if letter && second_broken == false { second_word.push(ch.to_ascii_lowercase()); };
        };
        previous_space = space;
        index += 1;
    }
    let setof = first_quoted == false && first_dotted == false && first_open == false && first_word == "setof";
    if setof {
        if token < 2 { return 3; };
        let mut rest = String::new();
        let mut plain = true;
        let mut position = first_end;
        while position < chars.len() {
            let code = chars[position] as i32;
            let allowed = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code == 95 || code == 36 || code == 34 || code == 46 || code == 40 || code == 41 || code == 91 || code == 93 || code == 44 || oid_input_space(chars[position]);
            if allowed == false { plain = false; };
            rest.push(chars[position]);
            position += 1;
        }
        if plain == false { return 6; };
        let inner = oid_alias_type_read(rest.as_str());
        if inner == 0 { return 4; };
        if inner == 6 { return 6; };
        return 3;
    };
    // Whitespace may surround the dot of a qualified name.
    if token < 2 || first_last == '.' { return 0; };
    let start = second_start as i32;
    let identifier = (start >= 65 && start <= 90) || (start >= 97 && start <= 122) || start == 95 || second_start == '"';
    // Only a modifier, array bounds or the rest of a qualified name continue a type otherwise.
    if identifier == false {
        if second_start == '(' || second_start == '[' || second_start == '.' { return 0; };
        return 3;
    };
    if second_word == "array" { return 0; };
    let keyword = first_quoted == false && first_dotted == false && (first_word == "double" || first_word == "character" || first_word == "char" || first_word == "national" || first_word == "nchar" || first_word == "bit" || first_word == "time" || first_word == "timestamp" || first_word == "interval");
    if keyword == false { return 3; };
    if second_word == "precision" || second_word == "varying" || second_word == "character" || second_word == "char" || second_word == "with" || second_word == "without" || second_word == "year" || second_word == "month" || second_word == "day" || second_word == "hour" || second_word == "minute" || second_word == "second" {
        // Words of the multi-word spellings in other orders need the rest of the grammar.
        if oid_alias_type_spelling(text) { return 0; };
        return 6;
    };
    3
}

const OID_ALIAS_TYPE_SPELLINGS: &[&str] = &[
    "double precision", "character varying", "char varying", "national character",
    "national char", "national character varying", "national char varying", "nchar varying",
    "bit varying", "time with time zone", "time without time zone", "timestamp with time zone",
    "timestamp without time zone", "interval year", "interval month", "interval day",
    "interval hour", "interval minute", "interval second", "interval year to month",
    "interval day to hour", "interval day to minute", "interval day to second",
    "interval hour to minute", "interval hour to second", "interval minute to second",
];

// The words outside modifiers and bounds, with a trailing array marker removed, must form one of
// the grammar's multi-word spellings.
fn oid_alias_type_spelling(text: &str) -> bool {
    let chars: Vec<char> = text.chars().collect();
    let mut words = String::new();
    let mut word = String::new();
    let mut depth: i32 = 0;
    let mut index: usize = 0;
    while index <= chars.len() {
        let mut letter = false;
        if index < chars.len() {
            let code = chars[index] as i32;
            letter = depth == 0 && ((code >= 65 && code <= 90) || (code >= 97 && code <= 122));
            if chars[index] == '(' || chars[index] == '[' { depth = depth + 1; };
            if chars[index] == ')' || chars[index] == ']' { depth = depth - 1; };
        };
        if letter {
            word.push(chars[index].to_ascii_lowercase());
        } else if word != "" {
            if words != "" { words.push(' '); };
            words.push_str(word.as_str());
            word = String::new();
        };
        index += 1;
    }
    let mut spelled = words.clone();
    let all: Vec<char> = words.chars().collect();
    let count = all.len();
    if count > 6 && all[count - 6] == ' ' && all[count - 5] == 'a' && all[count - 4] == 'r' && all[count - 3] == 'r' && all[count - 2] == 'a' && all[count - 1] == 'y' {
        let mut trimmed = String::new();
        let mut position: usize = 0;
        while position + 6 < count {
            trimmed.push(all[position]);
            position += 1;
        }
        spelled = trimmed;
    };
    let mut entry: usize = 0;
    while entry < OID_ALIAS_TYPE_SPELLINGS.len() {
        if OID_ALIAS_TYPE_SPELLINGS[entry] == spelled.as_str() { return true; };
        entry += 1;
    }
    false
}

pub fn oid_alias_to_text(input: OidValue, dash: bool) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input { return TextValue::Error(error); };
    if input == OidValue::Null { return TextValue::Null; };
    if let OidValue::Value(value) = input {
        if value == 0i64 {
            if dash { return TextValue::Value("-".to_owned()); };
            return TextValue::Value("0".to_owned());
        };
    };
    // A nonzero alias renders the object's name, which the deployment's catalog holds.
    text_unresolved(resolution_context(unresolved_flavor))
}

fn oid_alias_lookup(input: TextValue, dash: bool, grammar: i32) -> OidValue {
    oid_alias_read(input, dash, grammar, true)
}

pub fn sql__pg_catalog__regclasssend__c6c0(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regclass__l3ff(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regcollationsend__4bem(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regcollation__2net(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regconfigsend__db3d(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }

pub fn sql__pg_catalog__regdictionarysend__ok9z(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }

pub fn sql__pg_catalog__regnamespacesend__jpj3(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regnamespace__525a(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 3) }

pub fn sql__pg_catalog__regopersend__4lv2(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regoper__g8ia(input: TextValue) -> OidValue { oid_alias_lookup(input, false, 0) }

pub fn sql__pg_catalog__regoperatorsend__vsu1(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regoperator__x9az(input: TextValue) -> OidValue { oid_alias_lookup(input, false, 1) }

pub fn sql__pg_catalog__regprocsend__lxet(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regproc__t1l3(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regproceduresend__txe7(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regprocedure__byf2(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 1) }

pub fn sql__pg_catalog__regrolesend__a3kd(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regrole__2dsk(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 3) }

pub fn sql__pg_catalog__regtypesend__42nl(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regtype__t5ks(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 2) }


pub fn sql__pg_catalog__regclass__wqix(input: TextValue) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input { return OidValue::Error(error); };
    if input == TextValue::Null { return OidValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let parts = oid_alias_name_parts(text.as_str(), 0, chars.len());
        if parts < 1 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_NAME)); };
        if parts > 3 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_TYPE)); };
    };
    // A relation name resolves through the deployment's catalog and search path.
    oid_unresolved(resolution_context(unresolved_flavor))
}
