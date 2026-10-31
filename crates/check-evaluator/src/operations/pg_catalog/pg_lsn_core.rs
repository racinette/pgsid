const PG_LSN_SPECIAL_ERROR: u32 = 466560;
const PG_LSN_RANGE_ERROR: u32 = 3452619;
fn pg_lsn_compare(left: PgLsnValue, right: PgLsnValue) -> Int4Value {
    if let PgLsnValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let PgLsnValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    if left == PgLsnValue::Unknown || right == PgLsnValue::Unknown {
        return Int4Value::Unknown;
    };
    if left == PgLsnValue::Null || right == PgLsnValue::Null {
        return Int4Value::Null;
    };
    if let PgLsnValue::Value(a) = left {
        if let PgLsnValue::Value(b) = right {
            if a < 0i64 && b >= 0i64 { return Int4Value::Value(1); };
            if a >= 0i64 && b < 0i64 { return Int4Value::Value(-1); };
            if a < b {
                return Int4Value::Value(-1);
            };
            if a > b {
                return Int4Value::Value(1);
            };
            return Int4Value::Value(0);
        };
    };
    Int4Value::Unknown
}
fn pg_lsn_relation(left: PgLsnValue, right: PgLsnValue, mode: i32) -> BoolValue {
    let comparison = pg_lsn_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return BoolValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return BoolValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if mode == 0 {
            return make_bool_value(order == 0);
        };
        if mode == 1 {
            return make_bool_value(order != 0);
        };
        if mode == 2 {
            return make_bool_value(order < 0);
        };
        if mode == 3 {
            return make_bool_value(order <= 0);
        };
        if mode == 4 {
            return make_bool_value(order > 0);
        };
        return make_bool_value(order >= 0);
    };
    BoolValue::Unknown
}
fn pg_lsn_select(left: PgLsnValue, right: PgLsnValue, larger: bool) -> PgLsnValue {
    let comparison = pg_lsn_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return PgLsnValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return PgLsnValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        };
        return right;
    };
    PgLsnValue::Unknown
}


fn pg_lsn_bits(input: PgLsnValue) -> Int8Value {
    if let PgLsnValue::Error(error) = input { return Int8Value::Error(error); };
    if input == PgLsnValue::Null { return Int8Value::Null; };
    if let PgLsnValue::Value(value) = input { return make_int8_value(value); };
    Int8Value::Unknown
}

pub fn pg_lsn_to_text(input: PgLsnValue) -> TextValue {
    if let PgLsnValue::Error(error) = input { return TextValue::Error(error); };
    if input == PgLsnValue::Null { return TextValue::Null; };
    if let PgLsnValue::Value(value) = input {
        let bits = integer_bits_from_value(value);
        let high = integer_base_text(make_int8_value(bits.high), false, 16i64);
        let low = integer_base_text(make_int8_value(bits.low), false, 16i64);
        if let TextValue::Value(first) = high {
            if let TextValue::Value(second) = low {
                let mut combined = String::new();
                combined.push_str(first.as_str());
                combined.push('/');
                combined.push_str(second.as_str());
                let mut output = String::new();
                let chars: Vec<char> = combined.chars().collect();
                let mut index: usize = 0;
                while index < chars.len() {
                    let ch = chars[index];
                    index += 1;
                    if ch == 'a' { output.push('A'); }
                    else if ch == 'b' { output.push('B'); }
                    else if ch == 'c' { output.push('C'); }
                    else if ch == 'd' { output.push('D'); }
                    else if ch == 'e' { output.push('E'); }
                    else if ch == 'f' { output.push('F'); }
                    else { output.push(ch); };
                };
                return TextValue::Value(output);
            };
        };
    };
    TextValue::Unknown
}
fn pg_lsn_numeric(input: PgLsnValue) -> NumericValue {
    let text = integer_base_text(pg_lsn_bits(input), true, 10i64);
    if let TextValue::Error(error) = text { return NumericValue::Error(error); };
    if text == TextValue::Null { return NumericValue::Null; };
    if let TextValue::Value(value) = text { return make_numeric_value(value.as_str()); };
    NumericValue::Unknown
}
fn pg_lsn_from_numeric(input: NumericValue) -> PgLsnValue {
    if let NumericValue::Error(error) = input { return PgLsnValue::Error(error); };
    if input == NumericValue::Null { return PgLsnValue::Null; };
    if let NumericValue::Value(text) = input {
        let work = numeric_work_from_value(text.as_str());
        if work.valid == false { return PgLsnValue::Unknown; };
        if work.special != 1 { return PgLsnValue::Error(make_sql_error(PG_LSN_SPECIAL_ERROR)); };
        if work.sign != 0 && work.weight > 19 { return PgLsnValue::Error(make_sql_error(PG_LSN_RANGE_ERROR)); };
        let rounded = numeric_work_round(work, 0, 1);
        if let NumericValue::Error(error) = rounded { return PgLsnValue::Error(error); };
        if let NumericValue::Value(value) = rounded {
            let parts = numeric_parts(value.as_str());
            if parts.sign == 0 { return make_pg_lsn_bits(0i64); };
            if parts.sign < 0 || parts.weight > 19 { return PgLsnValue::Error(make_sql_error(PG_LSN_RANGE_ERROR)); };
            let chars: Vec<char> = value.chars().collect();
            let mut high = 0i64;
            let mut low = 0i64;
            let mut index = parts.first;
            let mut position = 0;
            while position <= parts.weight {
                let mut digit = 0i64;
                if index < parts.end { digit = numeric_wire_decimal_digit(chars[index]) as i64; index += 1; };
                let next = low * 10i64 + digit;
                low = next % 4294967296i64;
                high = high * 10i64 + next / 4294967296i64;
                if high > 4294967295i64 { return PgLsnValue::Error(make_sql_error(PG_LSN_RANGE_ERROR)); };
                position = position + 1;
            };
            return make_pg_lsn_bits(integer_bits_value(IntegerBits { high: high, low: low }));
        };
    };
    PgLsnValue::Unknown
}
fn pg_lsn_adjust(left: PgLsnValue, right: NumericValue, subtract: bool) -> PgLsnValue {
    if let PgLsnValue::Error(error) = left { return PgLsnValue::Error(error); };
    if let NumericValue::Error(error) = right { return PgLsnValue::Error(error); };
    if left == PgLsnValue::Unknown || right == NumericValue::Unknown { return PgLsnValue::Unknown; };
    if left == PgLsnValue::Null || right == NumericValue::Null { return PgLsnValue::Null; };
    let numeric = pg_lsn_numeric(left);
    if subtract { return pg_lsn_from_numeric(sql__pg_catalog__numeric_sub__ys09(numeric, right)); };
    pg_lsn_from_numeric(sql__pg_catalog__numeric_add__o3d7(numeric, right))
}

pub fn sql__pg_catalog__pg_lsn_send__r284(left: PgLsnValue) -> ByteaValue {
    sql__pg_catalog__int8send__pjz0(pg_lsn_bits(left))
}

pub fn sql__pg_catalog__numeric_pl_pg_lsn__jhoo(left: NumericValue, right: PgLsnValue) -> PgLsnValue {
    if let NumericValue::Error(error) = left {
        return PgLsnValue::Error(error);
    }
    if let PgLsnValue::Error(error) = right {
        return PgLsnValue::Error(error);
    }
    // The SQL body is one strict operator on the arguments, so a NULL decides beside an unknown.
    if let NumericValue::Null = left {
        return PgLsnValue::Null;
    }
    if let PgLsnValue::Null = right {
        return PgLsnValue::Null;
    }
    pg_lsn_adjust(right, left, false)
}

pub fn sql__pg_catalog__pg_lsn__8qf1(left: NumericValue) -> PgLsnValue {
    pg_lsn_from_numeric(left)
}

pub fn sql__pg_catalog__pg_lsn_cmp__46uk(left: PgLsnValue, right: PgLsnValue) -> Int4Value {
    pg_lsn_compare(left, right)
}

pub fn sql__pg_catalog__pg_lsn_eq__isht(left: PgLsnValue, right: PgLsnValue) -> BoolValue {
    pg_lsn_relation(left, right, 0)
}

pub fn sql__pg_catalog__pg_lsn_ge__fqvw(left: PgLsnValue, right: PgLsnValue) -> BoolValue {
    pg_lsn_relation(left, right, 5)
}

pub fn sql__pg_catalog__pg_lsn_gt__hlz9(left: PgLsnValue, right: PgLsnValue) -> BoolValue {
    pg_lsn_relation(left, right, 4)
}

pub fn sql__pg_catalog__pg_lsn_hash__f4fo(left: PgLsnValue) -> Int4Value {
    sql__pg_catalog__hashint8__3wid(pg_lsn_bits(left))
}

pub fn sql__pg_catalog__pg_lsn_hash_extended__mll2(left: PgLsnValue, right: Int8Value) -> Int8Value {
    sql__pg_catalog__hashint8extended__frvh(pg_lsn_bits(left), right)
}

pub fn sql__pg_catalog__pg_lsn_larger__u28j(left: PgLsnValue, right: PgLsnValue) -> PgLsnValue {
    pg_lsn_select(left, right, true)
}

pub fn sql__pg_catalog__pg_lsn_le__gaq2(left: PgLsnValue, right: PgLsnValue) -> BoolValue {
    pg_lsn_relation(left, right, 3)
}

pub fn sql__pg_catalog__pg_lsn_lt__autv(left: PgLsnValue, right: PgLsnValue) -> BoolValue {
    pg_lsn_relation(left, right, 2)
}

pub fn sql__pg_catalog__pg_lsn_mi__f4h2(left: PgLsnValue, right: PgLsnValue) -> NumericValue {
    sql__pg_catalog__numeric_sub__ys09(pg_lsn_numeric(left), pg_lsn_numeric(right))
}

pub fn sql__pg_catalog__pg_lsn_mii__kdo3(left: PgLsnValue, right: NumericValue) -> PgLsnValue {
    pg_lsn_adjust(left, right, true)
}

pub fn sql__pg_catalog__pg_lsn_ne__cw52(left: PgLsnValue, right: PgLsnValue) -> BoolValue {
    pg_lsn_relation(left, right, 1)
}

pub fn sql__pg_catalog__pg_lsn_pli__rpc5(left: PgLsnValue, right: NumericValue) -> PgLsnValue {
    pg_lsn_adjust(left, right, false)
}

pub fn sql__pg_catalog__pg_lsn_smaller__txge(left: PgLsnValue, right: PgLsnValue) -> PgLsnValue {
    pg_lsn_select(left, right, false)
}

pub fn sql__pg_catalog__pg_wal_lsn_diff__secp(left: PgLsnValue, right: PgLsnValue) -> NumericValue {
    sql__pg_catalog__numeric_sub__ys09(pg_lsn_numeric(left), pg_lsn_numeric(right))
}
