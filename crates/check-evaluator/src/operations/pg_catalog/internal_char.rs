pub fn internal_char_from_text(input: TextValue) -> InternalCharValue {
    if let TextValue::Error(error) = input { return InternalCharValue::Error(error); };
    if input == TextValue::Null { return InternalCharValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() == 0 { return make_internal_char_value(0); };
        if chars.len() == 4 && chars[0] == '\\' {
            let a = chars[1] as i32;
            let b = chars[2] as i32;
            let c = chars[3] as i32;
            if a >= 48 && a <= 55 && b >= 48 && b <= 55 && c >= 48 && c <= 55 {
                return make_internal_char_value(((a - 48) * 64 + (b - 48) * 8 + c - 48) % 256);
            };
        };
        let code = chars[0] as i32;
        if code < 128 { return make_internal_char_value(code); };
        if code < 2048 { return make_internal_char_value(192 + code / 64); };
        if code < 65536 { return make_internal_char_value(224 + code / 4096); };
        return make_internal_char_value(240 + code / 262144);
    };
    InternalCharValue::Unknown
}
fn internal_char_compare(left: InternalCharValue, right: InternalCharValue) -> Int4Value {
    if let InternalCharValue::Error(error) = left { return Int4Value::Error(error); };
    if let InternalCharValue::Error(error) = right { return Int4Value::Error(error); };
    if left == InternalCharValue::Unknown || right == InternalCharValue::Unknown { return Int4Value::Unknown; };
    if left == InternalCharValue::Null || right == InternalCharValue::Null { return Int4Value::Null; };
    if let InternalCharValue::Value(a) = left {
        if let InternalCharValue::Value(b) = right { return make_int4_value(a - b); };
    };
    Int4Value::Unknown
}
fn internal_char_relation(left: InternalCharValue, right: InternalCharValue, mode: i32) -> BoolValue {
    let result = internal_char_compare(left, right);
    if let Int4Value::Error(error) = result { return BoolValue::Error(error); };
    if result == Int4Value::Null { return BoolValue::Null; };
    if let Int4Value::Value(order) = result {
        if mode == 0 { return make_bool_value(order == 0); };
        if mode == 1 { return make_bool_value(order != 0); };
        if mode == 2 { return make_bool_value(order < 0); };
        if mode == 3 { return make_bool_value(order <= 0); };
        if mode == 4 { return make_bool_value(order > 0); };
        return make_bool_value(order >= 0);
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__int4__9xis(input: InternalCharValue) -> Int4Value {
    if let InternalCharValue::Error(error) = input { return Int4Value::Error(error); };
    if input == InternalCharValue::Null { return Int4Value::Null; };
    if let InternalCharValue::Value(octet) = input {
        if octet >= 128 { return make_int4_value(octet - 256); };
        return make_int4_value(octet);
    };
    Int4Value::Unknown
}
pub fn sql__pg_catalog__char__ame0(input: Int4Value) -> InternalCharValue {
    if let Int4Value::Error(error) = input { return InternalCharValue::Error(error); };
    if input == Int4Value::Null { return InternalCharValue::Null; };
    if let Int4Value::Value(value) = input {
        if value < -128 || value > 127 { return InternalCharValue::Error(SqlError { state: SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE }); };
        if value < 0 { return make_internal_char_value(value + 256); };
        return make_internal_char_value(value);
    };
    InternalCharValue::Unknown
}
pub fn sql__pg_catalog__char__oiu0(input: TextValue) -> InternalCharValue { internal_char_from_text(input) }
pub fn sql__pg_catalog__btcharcmp__gfia(left: InternalCharValue, right: InternalCharValue) -> Int4Value { internal_char_compare(left, right) }
pub fn sql__pg_catalog__charsend__12ys(input: InternalCharValue) -> ByteaValue {
    if let InternalCharValue::Error(error) = input { return ByteaValue::Error(error); };
    if input == InternalCharValue::Null { return ByteaValue::Null; };
    if let InternalCharValue::Value(octet) = input { return ByteaValue::Value(bytea_append_byte(String::new(), octet)); };
    ByteaValue::Unknown
}
pub fn sql__pg_catalog__text__j1jh(input: InternalCharValue) -> TextValue {
    if let InternalCharValue::Error(error) = input { return TextValue::Error(error); };
    if input == InternalCharValue::Null { return TextValue::Null; };
    if let InternalCharValue::Value(octet) = input {
        let mut output = String::new();
        if octet == 0 { return TextValue::Value(output); };
        if octet < 128 { output.push(char::from_u32(octet as u32).unwrap_or(' ')); }
        else {
            output.push('\\');
            output.push(char::from_u32((48 + octet / 64) as u32).unwrap_or(' '));
            output.push(char::from_u32((48 + octet / 8 % 8) as u32).unwrap_or(' '));
            output.push(char::from_u32((48 + octet % 8) as u32).unwrap_or(' '));
        };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
pub fn sql__pg_catalog__bpchar__p75w(input: InternalCharValue) -> TextValue {
    if let InternalCharValue::Error(error) = input { return TextValue::Error(error); };
    if input == InternalCharValue::Null { return TextValue::Null; };
    if let InternalCharValue::Value(octet) = input {
        if octet == 0 || octet >= 128 { return TextValue::Unknown; };
        let mut output = String::new();
        output.push(char::from_u32(octet as u32).unwrap_or(' '));
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
fn internal_char_hash_word(input: InternalCharValue) -> Int4Value {
    if let InternalCharValue::Error(error) = input { return Int4Value::Error(error); };
    if input == InternalCharValue::Null { return Int4Value::Null; };
    if let InternalCharValue::Value(octet) = input {
        if octet < 128 { return make_int4_value(octet); };
    };
    Int4Value::Unknown
}
pub fn sql__pg_catalog__hashchar__j6eu(input: InternalCharValue) -> Int4Value { sql__pg_catalog__hashint4__zr00(internal_char_hash_word(input)) }
pub fn sql__pg_catalog__hashcharextended__uyia(input: InternalCharValue, seed: Int8Value) -> Int8Value { sql__pg_catalog__hashint4extended__xf6v(internal_char_hash_word(input), seed) }
pub fn sql__pg_catalog__chareq__nib3(left: InternalCharValue, right: InternalCharValue) -> BoolValue { internal_char_relation(left, right, 0) }
pub fn sql__pg_catalog__charne__4yyr(left: InternalCharValue, right: InternalCharValue) -> BoolValue { internal_char_relation(left, right, 1) }
pub fn sql__pg_catalog__charlt__fpze(left: InternalCharValue, right: InternalCharValue) -> BoolValue { internal_char_relation(left, right, 2) }
pub fn sql__pg_catalog__charle__ofg6(left: InternalCharValue, right: InternalCharValue) -> BoolValue { internal_char_relation(left, right, 3) }
pub fn sql__pg_catalog__chargt__m7sf(left: InternalCharValue, right: InternalCharValue) -> BoolValue { internal_char_relation(left, right, 4) }
pub fn sql__pg_catalog__charge__m8zc(left: InternalCharValue, right: InternalCharValue) -> BoolValue { internal_char_relation(left, right, 5) }
