#[derive(Clone, Copy)]
pub struct NullCountArguments {
    pub nulls: Int4Value,
    pub nonnulls: Int4Value,
}

pub fn make_null_count_arguments() -> NullCountArguments {
    NullCountArguments {
        nulls: Int4Value::Value(0),
        nonnulls: Int4Value::Value(0),
    }
}

fn null_count_step(input: Int4Value, nullness: BoolValue, count_nulls: bool) -> Int4Value {
    if let Int4Value::Error(_) = input {
        return input;
    };
    if let BoolValue::Error(error) = nullness {
        return Int4Value::Error(error);
    };
    if let Int4Value::Value(count) = input {
        if let BoolValue::Value(is_null) = nullness {
            if is_null == count_nulls {
                return Int4Value::Value(count + 1);
            };
            return input;
        };
    };
    Int4Value::Unknown
}

pub fn append_null_count_argument(
    input: NullCountArguments,
    nullness: BoolValue,
) -> NullCountArguments {
    NullCountArguments {
        nulls: null_count_step(input.nulls, nullness, true),
        nonnulls: null_count_step(input.nonnulls, nullness, false),
    }
}

pub fn null_count_array_arguments(input: ArrayValue) -> NullCountArguments {
    if let ArrayValue::Error(error) = input {
        return NullCountArguments {
            nulls: Int4Value::Error(error),
            nonnulls: Int4Value::Error(error),
        };
    };
    if let ArrayValue::Null = input {
        return NullCountArguments {
            nulls: Int4Value::Null,
            nonnulls: Int4Value::Null,
        };
    };
    if let ArrayValue::Value(value) = input {
        let mut result = make_null_count_arguments();
        let mut index: usize = 0;
        while index < value.elements.len() {
            let mut nullness = array_element_bitmap(value.elements[index].clone());
            if nullness == BoolValue::Unknown && value.null_bitmap == BoolValue::Value(false) {
                nullness = BoolValue::Value(false);
            };
            result = append_null_count_argument(result, nullness);
            index += 1;
        }
        return result;
    };
    NullCountArguments {
        nulls: Int4Value::Unknown,
        nonnulls: Int4Value::Unknown,
    }
}

pub fn sql__pg_catalog__num_nulls__jx40(input: NullCountArguments) -> Int4Value {
    input.nulls
}

pub fn sql__pg_catalog__num_nonnulls__y0jf(input: NullCountArguments) -> Int4Value {
    input.nonnulls
}
