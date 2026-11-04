const OID_ALIAS_INVALID_NAME: u32 = 6819554;
const OID_ALIAS_INVALID_SIGNATURE: u32 = 3484946;
const OID_ALIAS_INVALID_TYPE: u32 = 6819553;

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
            outcome = oid_alias_signature_read(text.as_str());
        } else if grammar == 2 {
            outcome = oid_alias_type_read(text.as_str());
        } else {
            let parts = oid_alias_name_parts(text.as_str(), 0, chars.len());
            if parts < 1 || (grammar == 3 && parts != 1) { outcome = 1; };
            if grammar != 3 && parts > 3 { outcome = 3; };
        };
        if soft && (outcome == 1 || outcome == 2 || outcome == 4) { return OidValue::Null; };
        if outcome == 1 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_NAME)); };
        if outcome == 2 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_SIGNATURE)); };
        if outcome == 3 || outcome == 4 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_TYPE)); };
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
// are reached only after the first type resolves through the catalog.
fn oid_alias_signature_read(text: &str) -> i32 {
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
    if oid_alias_name_parts(text, 0, open) < 1 { return 1; };
    let mut close = end;
    while close > open + 1 && oid_input_space(chars[close - 1]) { close = close - 1; };
    if close == open + 1 || chars[close - 1] != ')' { return 2; };
    let last = close - 1;
    index = open + 1;
    while index < last && oid_input_space(chars[index]) { index += 1; };
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

// Type names go through the SQL parser. Comments and literals can hold any character, so text
// with them is left to the server; otherwise an open quote, unbalanced brackets, an empty or
// fourth dotted part, or a leading digit or sign cannot parse. Blank text is the one syntax
// error the lookups catch.
fn oid_alias_type_read(text: &str) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let mut first = ' ';
    let mut index: usize = 0;
    while index < chars.len() {
        let ch = chars[index];
        if ch == '\'' || ch == '$' { return 0; };
        if index + 1 < chars.len() && ((ch == '-' && chars[index + 1] == '-') || (ch == '/' && chars[index + 1] == '*')) { return 0; };
        if first == ' ' && oid_input_space(ch) == false { first = ch; };
        index += 1;
    }
    if first == ' ' { return 4; };
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
            quoted = quoted == false;
            part_length = part_length + 1;
        } else if quoted {
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
    0
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
