fn literal_text_fields_value(elements: Vec<ArrayElement>) -> ArrayValue {
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    if elements.len() > 0 {
        dimensions.push(ArrayDimension {
            lower: 1,
            length: elements.len() as i32,
        });
    };
    let mut null_bitmap = false;
    let mut index: usize = 0;
    while index < elements.len() {
        let item = elements[index].clone();
        if let ArrayElement::Null = item {
            null_bitmap = true;
        };
        index += 1;
    };
    make_array_value(ArrayPayload {
        element_type: "pg_catalog.text".to_owned(),
        element_kind: 8,
        dimensions,
        elements,
        null_bitmap: make_bool_value(null_bitmap),
    })
}

pub fn literal_text_fields(input: TextValue, kind: i32) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let TextValue::Null = input {
        return ArrayValue::Null;
    };
    let mut fields: Vec<ArrayElement> = Vec::new();
    if kind == 0 {
        let plan = prepare_range_text(input);
        if let RangeTextPlan::Error(error) = plan {
            return ArrayValue::Error(error);
        };
        if let RangeTextPlan::Value(value) = plan {
            if value.empty == false {
                if value.lower_present {
                    fields.push(ArrayElement::Text(value.lower));
                } else {
                    fields.push(ArrayElement::Null);
                };
                if value.upper_present {
                    fields.push(ArrayElement::Text(value.upper));
                } else {
                    fields.push(ArrayElement::Null);
                };
            };
            return literal_text_fields_value(fields);
        };
    } else if kind == 1 {
        let mut cursor = prepare_multirange_text(input);
        while multirange_text_has_member(&cursor) {
            fields.push(array_element_from_text(multirange_text_member(&cursor)));
            cursor = multirange_text_advance(multirange_text_payload(
                cursor.characters,
                cursor.position,
                String::new(),
                true,
                cursor.ranges,
                1,
                cursor.error,
            ));
        };
        if cursor.state == -2 {
            return ArrayValue::Error(cursor.error);
        };
        if cursor.state == 2 {
            return literal_text_fields_value(fields);
        };
    } else if kind == 2 {
        let plan = parse_array_text(input, ',', 1);
        if let ArrayTextPlan::Value(value) = plan {
            let mut index: usize = 0;
            while index < value.events.len() {
                let event = value.events[index].clone();
                if let ArrayTextEvent::Error(error) = event {
                    return ArrayValue::Error(error);
                };
                let mut condition_flavor_87_16: i32 = unresolved_flavor; if let ArrayTextEvent::Unknown = event { if condition_flavor_87_16 < 1 { condition_flavor_87_16 = 1; }; }; if let ArrayTextEvent::Unknown = event {
                    return array_unresolved(condition_flavor_87_16);
                }; let mut condition_flavor_89_19: i32 = unresolved_flavor; if let ArrayTextEvent::Unimplemented = event { condition_flavor_89_19 = 2; }; if let ArrayTextEvent::Unimplemented = event {
                    return array_unresolved(condition_flavor_89_19);
                };
                if let ArrayTextEvent::Null = event {
                    fields.push(ArrayElement::Null);
                };
                if let ArrayTextEvent::Text(text) = event {
                    fields.push(ArrayElement::Text(text));
                };
                index += 1;
            }
            return literal_text_fields_value(fields);
        };
    };
    array_unresolved(unresolved_flavor)
}
