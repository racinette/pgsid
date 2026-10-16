pub fn sql__pg_catalog__cardinality__m1rn(input: ArrayValue) -> Int4Value {
    if let ArrayValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let ArrayValue::Null = input {
        return Int4Value::Null;
    };
    if let ArrayValue::Value(value) = input {
        return Int4Value::Value(value.elements.len() as i32);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__array_ndims__8wu3(input: ArrayValue) -> Int4Value {
    if let ArrayValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let ArrayValue::Null = input {
        return Int4Value::Null;
    };
    if let ArrayValue::Value(value) = input {
        if value.dimensions.len() == 0 {
            return Int4Value::Null;
        };
        return Int4Value::Value(value.dimensions.len() as i32);
    };
    Int4Value::Unknown
}

fn array_dimension_value(input: ArrayValue, dimension: Int4Value, mode: i32) -> Int4Value {
    if let ArrayValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let Int4Value::Error(error) = dimension {
        return Int4Value::Error(error);
    };
    if let ArrayValue::Null = input {
        return Int4Value::Null;
    };
    if let Int4Value::Null = dimension {
        return Int4Value::Null;
    };
    if let ArrayValue::Value(value) = input {
        if let Int4Value::Value(index) = dimension {
            if index < 1 {
                return Int4Value::Null;
            };
            let position = usize::try_from(index - 1).unwrap_or(0);
            if position >= value.dimensions.len() {
                return Int4Value::Null;
            };
            let selected = value.dimensions[position];
            if mode == 0 {
                return Int4Value::Value(selected.length);
            };
            if mode == 1 {
                return Int4Value::Value(selected.lower);
            };
            return Int4Value::Value(selected.lower + selected.length - 1);
        };
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__array_length__pebh(input: ArrayValue, dimension: Int4Value) -> Int4Value {
    array_dimension_value(input, dimension, 0)
}

pub fn sql__pg_catalog__array_lower__3uq2(input: ArrayValue, dimension: Int4Value) -> Int4Value {
    array_dimension_value(input, dimension, 1)
}

pub fn sql__pg_catalog__array_upper__lnz3(input: ArrayValue, dimension: Int4Value) -> Int4Value {
    array_dimension_value(input, dimension, 2)
}

pub fn sql__pg_catalog__array_dims__01ex(input: ArrayValue) -> TextValue {
    if let ArrayValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return TextValue::Null;
    };
    if let ArrayValue::Value(value) = input {
        if value.dimensions.len() == 0 {
            return TextValue::Null;
        };
        let mut text = String::new();
        let mut position: usize = 0;
        while position < value.dimensions.len() {
            let selected = value.dimensions[position];
            let lower = int4_to_text(Int4Value::Value(selected.lower));
            let upper = int4_to_text(Int4Value::Value(selected.lower + selected.length - 1));
            if let TextValue::Value(first) = lower {
                if let TextValue::Value(last) = upper {
                    text.push('[');
                    text.push_str(first.as_str());
                    text.push(':');
                    text.push_str(last.as_str());
                    text.push(']');
                };
            };
            position += 1;
        }
        return TextValue::Value(text);
    };
    TextValue::Unknown
}
