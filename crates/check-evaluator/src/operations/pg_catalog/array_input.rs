pub fn array_integer_text_element(input: TextValue, family: i32) -> ArrayElement {
    let mut bits: i32 = 64;
    if family == 1 {
        bits = 16;
    };
    if family == 2 {
        bits = 32;
    };
    let number = scalar_integer_from_text(input, bits);
    if let Int8Value::Value(value) = number {
        if family == 1 {
            return ArrayElement::Int2(value as i32);
        };
        if family == 2 {
            return ArrayElement::Int4(value as i32);
        };
        return ArrayElement::Int8(value);
    };
    array_element_from_int8(number)
}

pub(crate) fn array_element_typmod(
    input: ArrayElement,
    identity: &str,
    modifier: i32,
) -> ArrayElement {
    let width = Int4Value::Value(modifier);
    let explicit = BoolValue::Value(true);
    if identity == "pg_catalog.\"varchar\"" {
        return array_element_from_text(sql__pg_catalog__varchar__2rhn(
            array_element_to_text(input),
            width,
            explicit,
        ));
    };
    if identity == "pg_catalog.bpchar" {
        return array_element_from_text(sql__pg_catalog__bpchar__2uas(
            array_element_to_text(input),
            width,
            explicit,
        ));
    };
    if identity == "pg_catalog.\"numeric\"" {
        return array_element_from_numeric(sql__pg_catalog__numeric__879l(
            array_element_to_numeric(input),
            width,
        ));
    };
    if identity == "pg_catalog.\"bit\"" {
        return array_element_from_bit(sql__pg_catalog__bit__eqck(
            array_element_to_bit(input),
            width,
            explicit,
        ));
    };
    if identity == "pg_catalog.varbit" {
        return array_element_from_bit(sql__pg_catalog__varbit__7ap7(
            array_element_to_bit(input),
            width,
            explicit,
        ));
    };
    if identity == "pg_catalog.\"time\"" {
        return array_element_from_time(sql__pg_catalog__time__bg2r(
            array_element_to_time(input),
            width,
        ));
    };
    if identity == "pg_catalog.timetz" {
        return array_element_from_timetz(sql__pg_catalog__timetz__7slr(
            array_element_to_timetz(input),
            width,
        ));
    };
    if identity == "pg_catalog.\"timestamp\"" {
        return array_element_from_timestamp(sql__pg_catalog__timestamp__akly(
            array_element_to_timestamp(input),
            width,
        ));
    };
    if identity == "pg_catalog.timestamptz" {
        return array_element_from_timestamptz(sql__pg_catalog__timestamptz__uwsx(
            array_element_to_timestamptz(input),
            width,
        ));
    };
    if identity == "pg_catalog.\"interval\"" {
        return array_element_from_interval(sql__pg_catalog__interval__drcl(
            array_element_to_interval(input),
            width,
        ));
    };
    ArrayElement::Unknown
}

pub fn array_with_typmod(input: ArrayValue, modifier: i32) -> ArrayValue {
    if modifier < 0 {
        return input;
    };
    if let ArrayValue::Value(payload) = input {
        let mut elements = payload.elements;
        let mut position: usize = 0;
        let unknown_valid = payload.element_type == "pg_catalog.\"varchar\""
            || payload.element_type == "pg_catalog.bpchar"
            || payload.element_type == "pg_catalog.\"bit\""
            || payload.element_type == "pg_catalog.varbit"
            || payload.element_type == "pg_catalog.\"time\""
            || payload.element_type == "pg_catalog.timetz";
        while position < elements.len() {
            let converted = array_element_typmod(
                elements[position].clone(),
                payload.element_type.as_str(),
                modifier,
            );
            if let ArrayElement::Error(error) = converted {
                return ArrayValue::Error(error);
            };
            if unknown_valid == false {
                if let ArrayElement::Unknown = converted {
                    return ArrayValue::Unknown;
                };
            };
            elements[position] = converted;
            position += 1;
        }
        return make_array_value(ArrayPayload {
            element_type: payload.element_type,
            element_kind: payload.element_kind,
            dimensions: payload.dimensions,
            elements: elements,
        });
    };
    input
}
