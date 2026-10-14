const OID_INPUT_INVALID: u32 = 3484946;
pub fn oid_from_text(input: TextValue) -> OidValue {
    if let TextValue::Error(error) = input { return OidValue::Error(error); };
    if input == TextValue::Null { return OidValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() > 4096 { return OidValue::Unknown; };
        let mut start: usize = 0;
        let mut end = chars.len();
        while start < end && oid_input_space(chars[start]) { start += 1; };
        while end > start && oid_input_space(chars[end - 1]) { end = end - 1; };
        let mut negative = false;
        if start < end && (chars[start] == '+' || chars[start] == '-') {
            negative = chars[start] == '-'; start += 1;
        };
        let mut radix = 10i64;
        if start + 1 < end && chars[start] == '0' {
            if chars[start + 1] == 'x' || chars[start + 1] == 'X' { radix = 16i64; start += 2; }
            else if chars[start + 1] == 'b' || chars[start + 1] == 'B' { return OidValue::Unknown; }
            else { radix = 8i64; };
        };
        let mut units = 0i64;
        let mut high = 0i64;
        let mut digits = false;
        let mut overflow = false;
        while start < end {
            let digit = oid_input_digit(chars[start]);
            if digit < 0i64 || digit >= radix { break; };
            digits = true;
            if overflow == false {
                let combined = units * radix + digit;
                units = combined % 4294967296i64;
                high = high * radix + combined / 4294967296i64;
                if high > 4294967295i64 { overflow = true; };
            };
            start += 1;
        };
        if digits == false {
            if radix == 16i64 && start == end { return OidValue::Unknown; };
            return OidValue::Error(SqlError { state: OID_INPUT_INVALID });
        };
        if overflow { return OidValue::Error(SqlError { state: SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE }); };
        if high != 0i64 {
            if start != end || (negative && high == 4294967295i64 && units != 0i64) || (negative == false && high == 4294967295i64 && units >= 2147483648i64) { return OidValue::Unknown; };
            return OidValue::Error(SqlError { state: SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE });
        };
        if start != end { return OidValue::Error(SqlError { state: OID_INPUT_INVALID }); };
        if negative && units > 2147483648i64 { return OidValue::Unknown; };
        if negative && units != 0i64 { units = 4294967296i64 - units; };
        return make_oid_value(units);
    };
    OidValue::Unknown
}
fn oid_input_space(ch: char) -> bool { ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\x0b' || ch == '\x0c' }
fn oid_input_digit(ch: char) -> i64 {
    let value = ch as i32;
    if value >= 48 && value <= 57 { let digit = value - 48; return digit as i64; };
    if value >= 65 && value <= 70 { let digit = value - 55; return digit as i64; };
    if value >= 97 && value <= 102 { let digit = value - 87; return digit as i64; };
    -1i64
}
