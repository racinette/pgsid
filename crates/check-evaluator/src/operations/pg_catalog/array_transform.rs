const ARRAY_TRANSFORM_RANK: u32 = 3452544;
const ARRAY_TRANSFORM_SHAPE: u32 = 3452630;
const ARRAY_TRANSFORM_LIMIT: u32 = 8584704;
const ARRAY_TRANSFORM_OVERFLOW: u32 = 3452547;
const ARRAY_TRANSFORM_TYPE: u32 = 6822148;

fn array_transform_finish(input: ArrayPayload, bound_adjustment: i32) -> ArrayValue {
    let mut position: usize = 0;
    let mut count: i64 = 1i64;
    while position < input.dimensions.len() {
        let dimension = input.dimensions[position];
        let length = dimension.length as i64;
        let end = (dimension.lower as i64) + length;
        let mut adjustment: i64 = 0i64;
        if position == 0 {
            adjustment = bound_adjustment as i64;
        };
        if length < 0i64 || (length > 0i64 && count > 2147483647i64 / length) || end - adjustment > 2147483647i64 {
            return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_LIMIT));
        };
        count = count * length;
        position += 1;
    }
    make_array_value(input)
}

fn array_push(
    input: ArrayValue,
    element: ArrayElement,
    element_type: &str,
    element_kind: i32,
    prepend: bool,
) -> ArrayValue {
    if prepend {
        if let ArrayElement::Error(error) = element {
            return ArrayValue::Error(error);
        };
    };
    if let ArrayValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayElement::Error(error) = element {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Unknown = input {
        return ArrayValue::Unknown;
    };
    if let ArrayValue::Value(value) = input {
        return array_push_payload(value, element, element_type, element_kind, prepend);
    };
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    let empty = ArrayPayload {
        null_bitmap: BoolValue::Value(false),
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        dimensions: dimensions,
        elements: elements,
    };
    array_push_payload(empty, element, element_type, element_kind, prepend)
}

fn array_push_payload(
    value: ArrayPayload,
    element: ArrayElement,
    element_type: &str,
    element_kind: i32,
    prepend: bool,
) -> ArrayValue {
    if value.element_type != element_type || value.element_kind != element_kind {
        return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_TYPE));
    };
    if value.dimensions.len() > 1 {
        return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_RANK));
    };
    let mut lower: i32 = 1;
    let mut length: i32 = 0;
    if value.dimensions.len() == 1 {
        lower = value.dimensions[0].lower;
        length = value.dimensions[0].length;
        if prepend && lower == -2147483647 - 1 {
            return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_OVERFLOW));
        };
        if prepend == false && (lower as i64) + (length as i64) > 2147483647i64 {
            return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_OVERFLOW));
        };
    };
    if length == 2147483647 {
        return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_LIMIT));
    };
    let mut output: Vec<ArrayElement> = Vec::new();
    let null_bitmap = array_bitmap_union(value.null_bitmap, array_element_bitmap(element.clone()));
    if prepend {
        output.push(element.clone());
    };
    let mut position: usize = 0;
    while position < value.elements.len() {
        output.push(value.elements[position].clone());
        position += 1;
    }
    if prepend == false {
        output.push(element);
    };
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    dimensions.push(ArrayDimension {
        lower: lower,
        length: length + 1,
    });
    let mut adjustment: i32 = 0;
    if prepend && length > 0 {
        adjustment = 1;
    };
    array_transform_finish(
        ArrayPayload {
            null_bitmap: null_bitmap,
            element_type: element_type.to_owned(),
            element_kind: element_kind,
            dimensions: dimensions,
            elements: output,
        },
        adjustment,
    )
}

pub fn sql__pg_catalog__array_append__k9mc(
    input: ArrayValue,
    element: ArrayElement,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    array_push(input, element, element_type, element_kind, false)
}

pub fn sql__pg_catalog__array_prepend__0tgl(
    element: ArrayElement,
    input: ArrayValue,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    array_push(input, element, element_type, element_kind, true)
}

pub fn sql__pg_catalog__array_cat__6rla(left: ArrayValue, right: ArrayValue) -> ArrayValue {
    if let ArrayValue::Error(error) = left {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Error(error) = right {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = left {
        return right;
    };
    if let ArrayValue::Null = right {
        return left;
    };
    if let ArrayValue::Value(a) = left {
        if let ArrayValue::Value(b) = right {
            if a.element_type != b.element_type || a.element_kind != b.element_kind {
                return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_TYPE));
            };
            let rank_a = a.dimensions.len();
            let rank_b = b.dimensions.len();
            if rank_b == 0 {
                return ArrayValue::Value(a);
            };
            if rank_a == 0 {
                return ArrayValue::Value(b);
            };
            if rank_a > rank_b + 1 || rank_b > rank_a + 1 {
                return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_SHAPE));
            };
            let mut dimensions: Vec<ArrayDimension> = Vec::new();
            let mut position: usize = 0;
            let mut outer_length: i64 = 0i64;
            let mut outer_lower: i32 = 1;
            if rank_a == rank_b {
                outer_length = (a.dimensions[0].length as i64) + (b.dimensions[0].length as i64);
                outer_lower = a.dimensions[0].lower;
                position = 1;
                while position < rank_a {
                    let first = a.dimensions[position];
                    let second = b.dimensions[position];
                    if first.lower != second.lower || first.length != second.length {
                        return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_SHAPE));
                    };
                    position += 1;
                }
            };
            if rank_a < rank_b {
                outer_length = (b.dimensions[0].length as i64) + 1i64;
                outer_lower = b.dimensions[0].lower;
                position = 0;
                while position < rank_a {
                    let first = a.dimensions[position];
                    let second = b.dimensions[position + 1];
                    if first.lower != second.lower || first.length != second.length {
                        return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_SHAPE));
                    };
                    position += 1;
                }
            };
            if rank_a > rank_b {
                outer_length = (a.dimensions[0].length as i64) + 1i64;
                outer_lower = a.dimensions[0].lower;
                position = 0;
                while position < rank_b {
                    let first = b.dimensions[position];
                    let second = a.dimensions[position + 1];
                    if first.lower != second.lower || first.length != second.length {
                        return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_SHAPE));
                    };
                    position += 1;
                }
            };
            if outer_length > 2147483647i64 {
                return ArrayValue::Error(make_sql_error(ARRAY_TRANSFORM_LIMIT));
            };
            dimensions.push(ArrayDimension {
                lower: outer_lower,
                length: outer_length as i32,
            });
            position = 1;
            if rank_a >= rank_b {
                while position < rank_a {
                    dimensions.push(a.dimensions[position]);
                    position += 1;
                }
            } else {
                while position < rank_b {
                    dimensions.push(b.dimensions[position]);
                    position += 1;
                }
            };
            let mut elements = a.elements;
            position = 0;
            while position < b.elements.len() {
                elements.push(b.elements[position].clone());
                position += 1;
            }
            return array_transform_finish(
                ArrayPayload {
                    null_bitmap: array_bitmap_union(a.null_bitmap, b.null_bitmap),
                    element_type: a.element_type,
                    element_kind: a.element_kind,
                    dimensions: dimensions,
                    elements: elements,
                },
                0,
            );
        };
    };
    ArrayValue::Unknown
}
