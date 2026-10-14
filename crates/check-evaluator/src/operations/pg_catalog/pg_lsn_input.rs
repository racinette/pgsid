const PG_LSN_INPUT_ERROR: u32 = 3484946;

pub fn pg_lsn_from_text(input: TextValue) -> PgLsnValue {
    if let TextValue::Error(error) = input { return PgLsnValue::Error(error); };
    if input == TextValue::Null { return PgLsnValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() < 3 || chars.len() > 17 { return PgLsnValue::Error(make_sql_error(PG_LSN_INPUT_ERROR)); };
        let mut index: usize = 0;
        let mut high = 0i64;
        while index < chars.len() && chars[index] != '/' {
            let digit = oid_input_digit(chars[index]);
            if digit < 0i64 || index >= 8 { return PgLsnValue::Error(make_sql_error(PG_LSN_INPUT_ERROR)); };
            high = high * 16i64 + digit;
            index += 1;
        };
        if index == 0 || index >= chars.len() { return PgLsnValue::Error(make_sql_error(PG_LSN_INPUT_ERROR)); };
        index += 1;
        let first = index;
        let mut low = 0i64;
        while index < chars.len() {
            let digit = oid_input_digit(chars[index]);
            if digit < 0i64 || index - first >= 8 { return PgLsnValue::Error(make_sql_error(PG_LSN_INPUT_ERROR)); };
            low = low * 16i64 + digit;
            index += 1;
        };
        if index == first { return PgLsnValue::Error(make_sql_error(PG_LSN_INPUT_ERROR)); };
        return make_pg_lsn_bits(integer_bits_value(IntegerBits { high: high, low: low }));
    };
    PgLsnValue::Unknown
}
