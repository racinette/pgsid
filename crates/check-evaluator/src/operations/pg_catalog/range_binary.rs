fn range_storage_flags(input: &RangePayload) -> i32 {
    if input.empty {
        return 1;
    };
    let mut flags = 0;
    if input.lower_inclusive {
        flags = flags + 2;
    };
    if input.upper_inclusive {
        flags = flags + 4;
    };
    let lower = input.bounds[0].clone();
    let upper = input.bounds[1].clone();
    if let ArrayElement::Null = lower {
        flags = flags + 8;
    };
    if let ArrayElement::Null = upper {
        flags = flags + 16;
    };
    flags
}

pub fn range_hash_flags(input: RangeValue) -> Int4Value {
    if let RangeValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let RangeValue::Null = input {
        return Int4Value::Null;
    };
    if let RangeValue::Value(value) = input {
        return make_int4_value(range_storage_flags(&value));
    };
    Int4Value::Unknown
}

fn range_binary_append(output: ByteaValue, bound: ByteaValue) -> ByteaValue {
    if let ByteaValue::Error(error) = bound {
        return ByteaValue::Error(error);
    };
    if let ByteaValue::Unknown = bound {
        return ByteaValue::Unknown;
    };
    if let ByteaValue::Null = bound {
        return ByteaValue::Unknown;
    };
    let length = bytea_length(bound.clone());
    let prefix = sql__pg_catalog__int4send__fjzt(length);
    let with_length = sql__pg_catalog__byteacat__zitv(output, prefix);
    sql__pg_catalog__byteacat__zitv(with_length, bound)
}

pub fn sql__pg_catalog__range_send__b1w5(
    input: RangeValue,
    lower: ByteaValue,
    upper: ByteaValue,
) -> ByteaValue {
    if let RangeValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let RangeValue::Null = input {
        return ByteaValue::Null;
    };
    if let RangeValue::Value(value) = input {
        let flags = range_storage_flags(&value);
        let header = bytea_append_byte(String::new(), flags);
        let mut result = ByteaValue::Value(header);
        if value.empty {
            return result;
        };
        let lo = value.bounds[0].clone();
        let hi = value.bounds[1].clone();
        let mut lower_present = true;
        let mut upper_present = true;
        if let ArrayElement::Null = lo {
            lower_present = false;
        };
        if let ArrayElement::Null = hi {
            upper_present = false;
        };
        if lower_present {
            result = range_binary_append(result, lower);
            if let ByteaValue::Error(error) = result {
                return ByteaValue::Error(error);
            };
            if let ByteaValue::Unknown = result {
                return result;
            };
        };
        if upper_present {
            result = range_binary_append(result, upper);
        };
        return result;
    };
    ByteaValue::Unknown
}
