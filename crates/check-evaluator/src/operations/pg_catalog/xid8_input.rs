pub fn xid8_from_text(input: TextValue) -> Xid8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Error(error) = input { return Xid8Value::Error(error); };
    if input == TextValue::Null { return Xid8Value::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() > 4096 { return xid8_unresolved(unresolved_flavor); };
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
            else if chars[start + 1] == 'b' || chars[start + 1] == 'B' { return xid8_unresolved(unresolved_flavor); }
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
            if radix == 16i64 && start == end { return xid8_unresolved(unresolved_flavor); };
            return Xid8Value::Error(SqlError { state: OID_INPUT_INVALID });
        };
        if overflow { return Xid8Value::Error(SqlError { state: SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE }); };
        if start != end { return Xid8Value::Error(SqlError { state: OID_INPUT_INVALID }); };
        if high >= 2147483648i64 { high = high - 4294967296i64; };
        let mut bits = high * 4294967296i64 + units;
        if negative && bits != -9223372036854775808i64 { bits = 0i64 - bits; };
        return make_xid8_bits(bits);
    };
    xid8_unresolved(unresolved_flavor)
}
