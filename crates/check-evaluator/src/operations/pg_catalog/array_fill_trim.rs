const ARRAY_FILL_NULL: u32 = 3452548;
const ARRAY_FILL_SHAPE: u32 = 3452630;
const ARRAY_FILL_LIMIT: u32 = 8584704;
const ARRAY_FILL_PORTABLE_ITEMS: i64 = 134217727i64;
const ARRAY_FILL_MAX_ITEMS: i64 = 268435455i64;

fn array_fill_nulls(input: &ArrayPayload) -> Int4Value {
    let mut unknown = false;
    let mut position: usize = 0;
    while position < input.elements.len() {
        let element = input.elements[position].clone();
        if let ArrayElement::Null = element {
            return Int4Value::Error(make_sql_error(ARRAY_FILL_NULL));
        };
        if let ArrayElement::Unknown = element {
            unknown = true;
        };
        position += 1;
    }
    if unknown {
        return Int4Value::Unknown;
    };
    Int4Value::Value(0)
}

fn array_fill_payload(
    element: ArrayElement,
    lengths: ArrayPayload,
    bounds: ArrayPayload,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if bounds.dimensions.len() > 1 {
        return ArrayValue::Error(make_sql_error(ARRAY_FILL_SHAPE));
    };
    let bound_nulls = array_fill_nulls(&bounds);
    if let Int4Value::Error(error) = bound_nulls {
        return ArrayValue::Error(error);
    };
    if bound_nulls == Int4Value::Unknown {
        return ArrayValue::Unknown;
    };
    if bounds.elements.len() != lengths.elements.len() {
        return ArrayValue::Error(make_sql_error(ARRAY_FILL_SHAPE));
    };
    let mut count: i64 = 1i64;
    if lengths.elements.len() == 0 {
        count = 0i64;
    };
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    let mut position: usize = 0;
    while position < lengths.elements.len() {
        let length = array_element_to_int4(lengths.elements[position].clone());
        let lower = array_element_to_int4(bounds.elements[position].clone());
        if let Int4Value::Value(size) = length {
            if size < 0 {
                return ArrayValue::Error(make_sql_error(ARRAY_FILL_LIMIT));
            };
            let size64 = size as i64;
            if size64 > 0i64 && count > 2147483647i64 / size64 {
                return ArrayValue::Error(make_sql_error(ARRAY_FILL_LIMIT));
            };
            count = count * size64;
            if let Int4Value::Value(start) = lower {
                dimensions.push(ArrayDimension {
                    lower: start,
                    length: size,
                });
            };
        };
        position += 1;
    }
    if dimensions.len() != lengths.elements.len() {
        return ArrayValue::Unknown;
    };
    if count > ARRAY_FILL_MAX_ITEMS {
        return ArrayValue::Error(make_sql_error(ARRAY_FILL_LIMIT));
    };
    position = 0;
    while position < dimensions.len() {
        let dimension = dimensions[position];
        if (dimension.lower as i64) + (dimension.length as i64) > 2147483647i64 {
            return ArrayValue::Error(make_sql_error(ARRAY_FILL_LIMIT));
        };
        position += 1;
    }
    if count == 0i64 {
        let empty = make_array_arguments(element_type, element_kind);
        return finish_array_arguments(empty);
    };
    if count > ARRAY_FILL_PORTABLE_ITEMS {
        return ArrayValue::Unknown;
    };
    let mut elements: Vec<ArrayElement> = Vec::new();
    let mut filled: i64 = 0i64;
    while filled < count {
        elements.push(element.clone());
        filled = filled + 1i64;
    }
    make_array_value(ArrayPayload {
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        dimensions: dimensions,
        elements: elements,
    })
}

fn array_fill_value(
    element: ArrayElement,
    lengths: ArrayValue,
    bounds: ArrayValue,
    provided: bool,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if let ArrayElement::Error(error) = element {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Error(error) = lengths {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Error(error) = bounds {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = lengths {
        return ArrayValue::Error(make_sql_error(ARRAY_FILL_NULL));
    };
    if provided {
        if let ArrayValue::Null = bounds {
            return ArrayValue::Error(make_sql_error(ARRAY_FILL_NULL));
        };
    };
    if let ArrayValue::Value(shape) = lengths {
        if shape.dimensions.len() > 1 {
            return ArrayValue::Error(make_sql_error(ARRAY_FILL_SHAPE));
        };
        let nulls = array_fill_nulls(&shape);
        if let Int4Value::Error(error) = nulls {
            return ArrayValue::Error(error);
        };
        if nulls == Int4Value::Unknown {
            return ArrayValue::Unknown;
        };
        if shape.elements.len() > 6 {
            return ArrayValue::Error(make_sql_error(ARRAY_FILL_LIMIT));
        };
        if provided {
            if let ArrayValue::Value(lower) = bounds {
                return array_fill_payload(element, shape, lower, element_type, element_kind);
            };
        } else {
            let mut builder = make_array_arguments("pg_catalog.int4", 2);
            let mut position: usize = 0;
            while position < shape.elements.len() {
                let one = array_element_from_int4(make_int4_value(1));
                builder = append_array_argument(builder, one);
                position += 1;
            }
            let defaults = finish_array_constructor(builder);
            if let ArrayValue::Value(lower) = defaults {
                return array_fill_payload(element, shape, lower, element_type, element_kind);
            };
        };
    };
    ArrayValue::Unknown
}

pub fn sql__pg_catalog__array_fill__8l6w(
    element: ArrayElement,
    lengths: ArrayValue,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    array_fill_value(
        element,
        lengths,
        ArrayValue::Null,
        false,
        element_type,
        element_kind,
    )
}

pub fn sql__pg_catalog__array_fill__3xoe(
    element: ArrayElement,
    lengths: ArrayValue,
    bounds: ArrayValue,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    array_fill_value(element, lengths, bounds, true, element_type, element_kind)
}

pub fn sql__pg_catalog__trim_array__uzie(input: ArrayValue, count: Int4Value) -> ArrayValue {
    if let ArrayValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let Int4Value::Error(error) = count {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayValue::Null;
    };
    if count == Int4Value::Null {
        return ArrayValue::Null;
    };
    if let ArrayValue::Value(payload) = input {
        if let Int4Value::Value(remove) = count {
            let mut length: i32 = 0;
            let mut lower: i32 = 1;
            if payload.dimensions.len() > 0 {
                length = payload.dimensions[0].length;
                lower = payload.dimensions[0].lower;
            };
            if remove < 0 || remove > length {
                return ArrayValue::Error(make_sql_error(ARRAY_FILL_SHAPE));
            };
            let mut upper = (lower as i64) + (length as i64) - (remove as i64) - 1i64;
            if upper < -2147483648i64 {
                upper = upper + 4294967296i64;
            };
            let mut bounds = make_array_subscripts();
            bounds = append_array_subscript(bounds, make_int4_value(upper as i32), false, true);
            bounds = append_array_subscript(bounds, make_int4_value(0), true, false);
            return array_slice_subscript(ArrayValue::Value(payload), bounds);
        };
    };
    ArrayValue::Unknown
}
