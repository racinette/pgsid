fn money_scale_available(digits: i32) -> bool { digits >= 0 && digits <= 10 }

fn money_scale_factor(digits: i32) -> i64 {
    let mut factor: i64 = 1i64;
    let mut position: i32 = 0;
    while position < digits { factor = factor * 10i64; position = position + 1; }
    factor
}

pub fn sql__pg_catalog__money__u7ss(input: Int8Value, digits: i32) -> MoneyValue {
    if let Int8Value::Error(error) = input { return MoneyValue::Error(error); };
    if let Int8Value::Null = input { return MoneyValue::Null; };
    if let Int8Value::Value(value) = input {
        if value == 0i64 { return make_money_value(0i64); };
        if money_scale_available(digits) == false { return MoneyValue::Unknown; };
        let factor = Int8Value::Value(money_scale_factor(digits));
        return money_from_units(sql__pg_catalog__int8mul__6t1m(input,factor));
    };
    MoneyValue::Unknown
}

pub fn sql__pg_catalog__money__2ie3(input: Int4Value, digits: i32) -> MoneyValue {
    sql__pg_catalog__money__u7ss(sql__pg_catalog__int8__mzac(input),digits)
}

pub fn sql__pg_catalog__money__z8lp(input: NumericValue, digits: i32) -> MoneyValue {
    if let NumericValue::Error(error) = input { return MoneyValue::Error(error); };
    if let NumericValue::Null = input { return MoneyValue::Null; };
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false { return MoneyValue::Unknown; };
        let amount = NumericValue::Value(value);
        if work.special != 1 { return money_from_units(sql__pg_catalog__int8__xy54(amount)); };
        if work.sign == 0 { return make_money_value(0i64); };
        if money_scale_available(digits) == false { return MoneyValue::Unknown; };
        let factor = sql__pg_catalog__numeric__11bc(Int8Value::Value(money_scale_factor(digits)));
        let scaled = sql__pg_catalog__numeric_mul__bj4l(amount,factor);
        return money_from_units(sql__pg_catalog__int8__xy54(scaled));
    };
    MoneyValue::Unknown
}

pub fn sql__pg_catalog__numeric__khij(input: MoneyValue, digits: i32) -> NumericValue {
    if let MoneyValue::Error(error) = input { return NumericValue::Error(error); };
    if let MoneyValue::Null = input { return NumericValue::Null; };
    if let MoneyValue::Value(value) = input {
        if money_scale_available(digits) == false { return NumericValue::Unknown; };
        let amount = sql__pg_catalog__numeric__11bc(Int8Value::Value(value));
        if digits == 0 { return amount; };
        let scale = Int4Value::Value(digits);
        let factor = sql__pg_catalog__numeric__11bc(Int8Value::Value(money_scale_factor(digits)));
        let denominator = sql__pg_catalog__round__otcq(factor,scale);
        let quotient = sql__pg_catalog__numeric_div__pnzm(amount,denominator);
        return sql__pg_catalog__round__otcq(quotient,scale);
    };
    NumericValue::Unknown
}
