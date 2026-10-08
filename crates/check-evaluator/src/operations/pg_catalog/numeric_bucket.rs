const NUMERIC_BUCKET_INVALID_ARGUMENT: u32 = 3452596;

fn numeric_bucket_order(left: NumericWork, right: NumericWork) -> i32 {
    if left.special == 0 {
        return -1;
    }
    if left.special == 2 {
        return 1;
    }
    if left.sign < right.sign {
        return -1;
    }
    if left.sign > right.sign {
        return 1;
    }
    let order = numeric_work_magnitude(left.clone(), right);
    if left.sign < 0 {
        return 0 - order;
    }
    order
}

fn numeric_bucket(value: &str, lower: &str, upper: &str, count: i32) -> Int4Value {
    let operand = numeric_work_from_value(value);
    let first = numeric_work_from_value(lower);
    let last = numeric_work_from_value(upper);
    if operand.valid == false || first.valid == false || last.valid == false {
        return Int4Value::Unknown;
    }
    if count <= 0 || operand.special == 3 || first.special != 1 || last.special != 1 {
        return Int4Value::Error(make_sql_error(NUMERIC_BUCKET_INVALID_ARGUMENT));
    }
    let direction = numeric_bucket_order(first.clone(), last.clone());
    if direction == 0 {
        return Int4Value::Error(make_sql_error(NUMERIC_BUCKET_INVALID_ARGUMENT));
    }
    let start = numeric_bucket_order(operand.clone(), first.clone());
    let end = numeric_bucket_order(operand.clone(), last.clone());
    if (direction < 0 && start < 0) || (direction > 0 && start > 0) {
        return Int4Value::Value(0);
    }
    if (direction < 0 && end >= 0) || (direction > 0 && end <= 0) {
        if count == 2147483647 {
            return Int4Value::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        return Int4Value::Value(count + 1);
    }
    let distance = numeric_work_sum(operand, first.clone(), true);
    let span = numeric_work_sum(last, first, true);
    let multiplier = numeric_work_from_value(text_number(count, 10).as_str());
    let scaled = numeric_work_product(distance, multiplier);
    let quotient = numeric_division_work(scaled, span, 0, false);
    let integer = numeric_integer_value(NumericValue::Value(numeric_work_text(quotient)));
    if let Int8Value::Error(error) = integer {
        return Int4Value::Error(error);
    }
    if let Int8Value::Value(number) = integer {
        if number < 0i64 || number >= 2147483647i64 {
            return Int4Value::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        let bucket = number as i32;
        return Int4Value::Value(bucket + 1);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__width_bucket__mx75(
    value: NumericValue,
    lower: NumericValue,
    upper: NumericValue,
    count: Int4Value,
) -> Int4Value {
    if let NumericValue::Error(error) = value {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = lower {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = upper {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = count {
        return Int4Value::Error(error);
    }
    if value == NumericValue::Unknown
        || lower == NumericValue::Unknown
        || upper == NumericValue::Unknown
        || count == Int4Value::Unknown
    {
        return Int4Value::Unknown;
    }
    if value == NumericValue::Null
        || lower == NumericValue::Null
        || upper == NumericValue::Null
        || count == Int4Value::Null
    {
        return Int4Value::Null;
    }
    if let NumericValue::Value(input) = value {
        if let NumericValue::Value(first) = lower {
            if let NumericValue::Value(last) = upper {
                if let Int4Value::Value(buckets) = count {
                    return numeric_bucket(input.as_str(), first.as_str(), last.as_str(), buckets);
                }
            }
        }
    }
    Int4Value::Unknown
}
