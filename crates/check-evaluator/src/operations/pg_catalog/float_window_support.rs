const FLOAT_INVALID_FRAME_SIZE: u32 = 3452583;
const FLOAT_INVALID_BUCKET_ARGUMENT: u32 = 3452596;

// in_range_float8_float8: NaN sorts after every other value, so it decides the comparison before
// the offset is applied, and an infinite offset from the matching infinity contains every value.
fn float_in_range(
    value: Float8Value,
    base: Float8Value,
    offset: Float8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    if let Float8Value::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let Float8Value::Error(error) = base {
        return BoolValue::Error(error);
    };
    if let Float8Value::Error(error) = offset {
        return BoolValue::Error(error);
    };
    if let BoolValue::Error(error) = subtract {
        return BoolValue::Error(error);
    };
    if let BoolValue::Error(error) = less {
        return BoolValue::Error(error);
    };
    if value == Float8Value::Unknown
        || base == Float8Value::Unknown
        || offset == Float8Value::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
    };
    if value == Float8Value::Null
        || base == Float8Value::Null
        || offset == Float8Value::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    let known_value = float8_semantic(value);
    let known_base = float8_semantic(base);
    let known_offset = float8_semantic(offset);
    if let Float8Value::Value(value_bits) = known_value {
        if let Float8Value::Value(base_bits) = known_base {
            if let Float8Value::Value(offset_bits) = known_offset {
                if let BoolValue::Value(sub) = subtract {
                    if let BoolValue::Value(lower) = less {
                        let input = float8_number(value_bits);
                        let center = float8_number(base_bits);
                        let distance = float8_number(offset_bits);
                        if distance != distance || distance < 0.0f64 {
                            return BoolValue::Error(make_sql_error(FLOAT_INVALID_FRAME_SIZE));
                        };
                        if input != input {
                            if center != center {
                                return BoolValue::Value(true);
                            };
                            return BoolValue::Value(lower == false);
                        };
                        if center != center {
                            return BoolValue::Value(lower);
                        };
                        let infinity = 1.0f64 / 0.0f64;
                        if distance == infinity
                            && center.abs() == infinity
                            && ((sub && center > 0.0f64) || (sub == false && center < 0.0f64))
                        {
                            return BoolValue::Value(true);
                        };
                        let mut boundary = center + distance;
                        if sub {
                            boundary = center - distance;
                        };
                        if lower {
                            return BoolValue::Value(input <= boundary);
                        };
                        return BoolValue::Value(input >= boundary);
                    };
                };
            };
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__in_range__t6r5(
    value: Float8Value,
    base: Float8Value,
    offset: Float8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    float_in_range(value, base, offset, subtract, less)
}

// Widening float4 is exact, and PostgreSQL computes the boundary in float8 as well.
pub fn sql__pg_catalog__in_range__kw9k(
    value: Float4Value,
    base: Float4Value,
    offset: Float8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    float_in_range(
        float4_widen(value),
        float4_widen(base),
        offset,
        subtract,
        less,
    )
}

// The quotient lies in [0, 1], so the product truncates into the int32 range; a quotient that
// rounds to one is pulled back into the last bucket. Bounds whose difference overflows are
// halved first, as PostgreSQL does.
fn float_bucket(operand: f64, first: f64, last: f64, count: i32) -> Int4Value {
    if count <= 0 {
        return Int4Value::Error(make_sql_error(FLOAT_INVALID_BUCKET_ARGUMENT));
    };
    if operand != operand || first != first || last != last {
        return Int4Value::Error(make_sql_error(FLOAT_INVALID_BUCKET_ARGUMENT));
    };
    let infinity = 1.0f64 / 0.0f64;
    if first.abs() == infinity || last.abs() == infinity {
        return Int4Value::Error(make_sql_error(FLOAT_INVALID_BUCKET_ARGUMENT));
    };
    if first == last {
        return Int4Value::Error(make_sql_error(FLOAT_INVALID_BUCKET_ARGUMENT));
    };
    let ascending = first < last;
    if (ascending && operand < first) || (ascending == false && operand > first) {
        return Int4Value::Value(0);
    };
    if (ascending && operand >= last) || (ascending == false && operand <= last) {
        if count == 2147483647 {
            return Int4Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        return Int4Value::Value(count + 1);
    };
    let mut quotient = (operand - first) / (last - first);
    if ascending == false {
        quotient = (first - operand) / (first - last);
    };
    if (last - first).abs() == infinity {
        quotient = (operand / 2.0f64 - first / 2.0f64) / (last / 2.0f64 - first / 2.0f64);
        if ascending == false {
            quotient = (first / 2.0f64 - operand / 2.0f64) / (first / 2.0f64 - last / 2.0f64);
        };
    };
    let mut bucket = ((count as f64) * quotient) as i32;
    if bucket >= count {
        bucket = count - 1;
    };
    Int4Value::Value(bucket + 1)
}

pub fn sql__pg_catalog__width_bucket__wbi9(
    operand: Float8Value,
    lower: Float8Value,
    upper: Float8Value,
    count: Int4Value,
) -> Int4Value {
    if let Float8Value::Error(error) = operand {
        return Int4Value::Error(error);
    };
    if let Float8Value::Error(error) = lower {
        return Int4Value::Error(error);
    };
    if let Float8Value::Error(error) = upper {
        return Int4Value::Error(error);
    };
    if let Int4Value::Error(error) = count {
        return Int4Value::Error(error);
    };
    if operand == Float8Value::Unknown
        || lower == Float8Value::Unknown
        || upper == Float8Value::Unknown
        || count == Int4Value::Unknown
    {
        return Int4Value::Unknown;
    };
    if operand == Float8Value::Null
        || lower == Float8Value::Null
        || upper == Float8Value::Null
        || count == Int4Value::Null
    {
        return Int4Value::Null;
    };
    let known_operand = float8_semantic(operand);
    let known_lower = float8_semantic(lower);
    let known_upper = float8_semantic(upper);
    if let Float8Value::Value(operand_bits) = known_operand {
        if let Float8Value::Value(lower_bits) = known_lower {
            if let Float8Value::Value(upper_bits) = known_upper {
                if let Int4Value::Value(buckets) = count {
                    return float_bucket(
                        float8_number(operand_bits),
                        float8_number(lower_bits),
                        float8_number(upper_bits),
                        buckets,
                    );
                };
            };
        };
    };
    Int4Value::Unknown
}

// regr_count's transition function counts rows whose two arguments are both non-null; the
// strictness of the float arguments is the only part they play.
pub fn sql__pg_catalog__int8inc_float8_float8__naop(
    count: Int8Value,
    left: Float8Value,
    right: Float8Value,
) -> Int8Value {
    if let Int8Value::Error(error) = count {
        return Int8Value::Error(error);
    };
    if let Float8Value::Error(error) = left {
        return Int8Value::Error(error);
    };
    if let Float8Value::Error(error) = right {
        return Int8Value::Error(error);
    };
    if count == Int8Value::Unknown || left == Float8Value::Unknown || right == Float8Value::Unknown
    {
        return Int8Value::Unknown;
    };
    if count == Int8Value::Null || left == Float8Value::Null || right == Float8Value::Null {
        return Int8Value::Null;
    };
    sql__pg_catalog__int8inc__ke95(count)
}
