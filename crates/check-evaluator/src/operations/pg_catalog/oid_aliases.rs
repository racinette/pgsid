const OID_ALIAS_INVALID_NAME: u32 = 6819554;
const OID_ALIAS_INVALID_SIGNATURE: u32 = 3484946;
const OID_ALIAS_INVALID_TYPE: u32 = 6819553;

pub fn oid_alias_from_text(input: TextValue, dash: bool, grammar: i32) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input { return OidValue::Error(error); };
    if input == TextValue::Null { return OidValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() > 4096 { return oid_unresolved(unresolved_flavor); };
        if dash && chars.len() == 1 && chars[0] == '-' { return make_oid_value(0i64); };
        let mut numeric = chars.len() != 0;
        let mut whitespace = true;
        let mut quoted = false;
        let mut signature = false;
        let mut index: usize = 0;
        while index < chars.len() {
            let ch = chars[index];
            let code = ch as i32;
            if code < 48 || code > 57 { numeric = false; };
            if oid_input_space(ch) == false { whitespace = false; };
            if ch == '"' { quoted = quoted == false; };
            if ch == '(' && quoted == false { signature = true; };
            index += 1;
        };
        if numeric { return oid_from_text(TextValue::Value(text)); };
        if grammar == 1 && signature == false { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_SIGNATURE)); };
        if whitespace {
            if grammar == 2 { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_TYPE)); };
            return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_NAME));
        };
        if oid_alias_grammar_read(text.as_str(), grammar) == false { return oid_unresolved(unresolved_flavor); };
    };
    // A name resolves through the deployment's catalog.
    oid_unresolved(resolution_context(unresolved_flavor))
}

// Whether the evaluator reads the name's shape, leaving only the catalog lookup: quotes close,
// dotted parts are present and at most three, and parentheses and brackets balance. Type names
// must also start like an identifier.
fn oid_alias_grammar_read(text: &str, grammar: i32) -> bool {
    let chars: Vec<char> = text.chars().collect();
    let mut quoted = false;
    let mut parts: i32 = 1;
    let mut part_length: i32 = 0;
    let mut empty_part = false;
    let mut depth: i32 = 0;
    let mut brackets: i32 = 0;
    let mut balanced = true;
    let mut first = ' ';
    let mut index: usize = 0;
    while index < chars.len() {
        let ch = chars[index];
        if first == ' ' && oid_input_space(ch) == false {
            first = ch;
        };
        let mut consumed = false;
        if ch == '"' {
            quoted = quoted == false;
            part_length = part_length + 1;
            consumed = true;
        };
        if consumed == false && quoted {
            part_length = part_length + 1;
            consumed = true;
        };
        if consumed == false && ch == '.' && depth == 0 {
            if part_length == 0 {
                empty_part = true;
            };
            parts = parts + 1;
            part_length = 0;
            consumed = true;
        };
        if consumed == false {
            if ch == '(' {
                depth = depth + 1;
            };
            if ch == ')' {
                depth = depth - 1;
            };
            if ch == '[' {
                brackets = brackets + 1;
            };
            if ch == ']' {
                brackets = brackets - 1;
            };
            if depth < 0 || brackets < 0 {
                balanced = false;
            };
            if oid_input_space(ch) == false {
                part_length = part_length + 1;
            };
        };
        index += 1;
    }
    if parts > 1 && part_length == 0 {
        empty_part = true;
    };
    if quoted || empty_part || depth != 0 || brackets != 0 || balanced == false {
        return false;
    };
    if grammar != 1 && parts > 3 {
        return false;
    };
    let code = first as i32;
    if grammar == 2 && ((code >= 48 && code <= 57) || first == '+' || first == '-') {
        return false;
    };
    true
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
    if let TextValue::Error(error) = input { return OidValue::Error(error); };
    let value = oid_alias_from_text(input, dash, grammar);
    if let OidValue::Error(_) = value { return OidValue::Null; };
    value
}

pub fn sql__pg_catalog__regclasssend__c6c0(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regclass__l3ff(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regcollationsend__4bem(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regcollation__2net(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regconfigsend__db3d(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }

pub fn sql__pg_catalog__regdictionarysend__ok9z(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }

pub fn sql__pg_catalog__regnamespacesend__jpj3(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regnamespace__525a(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regopersend__4lv2(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regoper__g8ia(input: TextValue) -> OidValue { oid_alias_lookup(input, false, 0) }

pub fn sql__pg_catalog__regoperatorsend__vsu1(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regoperator__x9az(input: TextValue) -> OidValue { oid_alias_lookup(input, false, 1) }

pub fn sql__pg_catalog__regprocsend__lxet(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regproc__t1l3(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

pub fn sql__pg_catalog__regproceduresend__txe7(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regprocedure__byf2(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 1) }

pub fn sql__pg_catalog__regrolesend__a3kd(input: OidValue) -> ByteaValue { sql__pg_catalog__oidsend__kq2v(input) }
pub fn sql__pg_catalog__to_regrole__2dsk(input: TextValue) -> OidValue { oid_alias_lookup(input, true, 0) }

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
        if chars.len() > 4096 { return oid_unresolved(unresolved_flavor); };
        let mut whitespace = true;
        let mut index: usize = 0;
        while index < chars.len() {
            if oid_input_space(chars[index]) == false { whitespace = false; };
            index += 1;
        };
        if whitespace { return OidValue::Error(make_sql_error(OID_ALIAS_INVALID_NAME)); };
        if oid_alias_grammar_read(text.as_str(), 0) == false { return oid_unresolved(unresolved_flavor); };
    };
    // A relation name resolves through the deployment's catalog and search path.
    oid_unresolved(resolution_context(unresolved_flavor))
}
