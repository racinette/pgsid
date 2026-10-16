fn array_string_field(input: &str, marker: TextValue, deterministic: bool) -> ArrayElement {
    if marker == TextValue::Null {
        return array_element_from_text(make_text_value(input));
    };
    if let TextValue::Value(value) = marker {
        if deterministic {
            if input == value.as_str() {
                return ArrayElement::Null;
            };
            return array_element_from_text(make_text_value(input));
        };
    };
    ArrayElement::Unknown
}

fn array_string_finish(input: ArrayArguments, count: i32) -> ArrayValue {
    if count == 0 {
        return finish_array_arguments(input);
    };
    let shaped = append_array_dimension(input, 1, count);
    finish_array_arguments(shaped)
}

fn array_string_split(
    input: TextValue,
    delimiter: TextValue,
    marker: TextValue,
    deterministic: bool,
    utf8: bool,
) -> ArrayValue {
    if let TextValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let TextValue::Error(error) = delimiter {
        return ArrayValue::Error(error);
    };
    if let TextValue::Error(error) = marker {
        return ArrayValue::Error(error);
    };
    if input == TextValue::Null {
        return ArrayValue::Null;
    };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut builder = make_array_arguments("pg_catalog.text", 8);
        if characters.len() == 0 {
            return finish_array_arguments(builder);
        };
        let mut count: i32 = 0;
        let mut position: usize = 0;
        if delimiter == TextValue::Null {
            while position < characters.len() {
                let ch = characters[position];
                if utf8 == false && (ch as i32) > 127 {
                    return ArrayValue::Unknown;
                };
                let mut field = String::new();
                field.push(ch);
                let element = array_string_field(field.as_str(), marker.clone(), deterministic);
                builder = append_array_argument(builder, element);
                count = count + 1;
                position += 1;
            }
            return array_string_finish(builder, count);
        };
        if let TextValue::Value(separator) = delimiter {
            let needle: Vec<char> = separator.chars().collect();
            if needle.len() == 0 {
                let element = array_string_field(value.as_str(), marker, deterministic);
                builder = append_array_argument(builder, element);
                return array_string_finish(builder, 1);
            };
            if deterministic == false {
                return ArrayValue::Unknown;
            };
            let mut field = String::new();
            while position < characters.len() {
                let mut matched = position + needle.len() <= characters.len();
                let mut offset: usize = 0;
                while matched && offset < needle.len() {
                    if characters[position + offset] != needle[offset] {
                        matched = false;
                    };
                    offset += 1;
                }
                if matched {
                    let element = array_string_field(field.as_str(), marker.clone(), deterministic);
                    builder = append_array_argument(builder, element);
                    field = String::new();
                    count = count + 1;
                    position += needle.len();
                } else {
                    field.push(characters[position]);
                    position += 1;
                };
            }
            let last = array_string_field(field.as_str(), marker, deterministic);
            builder = append_array_argument(builder, last);
            return array_string_finish(builder, count + 1);
        };
    };
    ArrayValue::Unknown
}

pub fn sql__pg_catalog__string_to_array__yhwp(
    input: TextValue,
    delimiter: TextValue,
    deterministic: bool,
    utf8: bool,
) -> ArrayValue {
    array_string_split(input, delimiter, TextValue::Null, deterministic, utf8)
}

pub fn sql__pg_catalog__string_to_array__umps(
    input: TextValue,
    delimiter: TextValue,
    marker: TextValue,
    deterministic: bool,
    utf8: bool,
) -> ArrayValue {
    array_string_split(input, delimiter, marker, deterministic, utf8)
}

pub fn prepare_array_string_output(
    input: ArrayValue,
    delimiter: TextValue,
    marker: TextValue,
) -> ArrayOutputPayload {
    if let ArrayValue::Error(error) = input {
        return prepare_array_output(ArrayValue::Error(error));
    };
    if let TextValue::Error(error) = delimiter {
        return prepare_array_output(ArrayValue::Error(error));
    };
    if let TextValue::Error(error) = marker {
        return prepare_array_output(ArrayValue::Error(error));
    };
    if let ArrayValue::Null = input {
        return prepare_array_output(ArrayValue::Null);
    };
    if delimiter == TextValue::Null {
        return prepare_array_output(ArrayValue::Null);
    };
    prepare_array_output(input)
}

fn array_string_join(
    input: ArrayOutputPayload,
    rendered: ArrayArguments,
    delimiter: TextValue,
    marker: TextValue,
) -> TextValue {
    if input.state == -2 {
        return TextValue::Error(input.error);
    };
    if input.state == 0 {
        return TextValue::Null;
    };
    if input.state != 1 {
        return TextValue::Unknown;
    };
    if let ArrayArguments::Error(error) = rendered {
        return TextValue::Error(error);
    };
    if let ArrayArguments::Value(values) = rendered {
        if values.elements.len() != input.elements.len() {
            return TextValue::Unknown;
        };
        let mut output = String::new();
        let mut printed = false;
        let mut known = true;
        let mut position: usize = 0;
        while position < values.elements.len() {
            let element = values.elements[position].clone();
            let mut text = array_element_to_text(element.clone());
            let mut skip = false;
            if let ArrayElement::Null = element {
                if marker == TextValue::Null {
                    skip = true;
                };
                text = marker.clone();
            };
            if skip == false {
                if printed {
                    let mut separator_known = false;
                    let separator_value = delimiter.clone();
                    if let TextValue::Value(separator) = separator_value {
                        output.push_str(separator.as_str());
                        separator_known = true;
                    };
                    if separator_known == false {
                        known = false;
                    };
                };
                let mut field_known = false;
                if let TextValue::Value(field) = text {
                    output.push_str(field.as_str());
                    field_known = true;
                };
                if field_known == false {
                    known = false;
                };
                printed = true;
            };
            position += 1;
        }
        if known {
            return TextValue::Value(output);
        };
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__array_to_string__jpbb(
    input: ArrayValue,
    rendered: ArrayArguments,
    delimiter: TextValue,
) -> TextValue {
    let plan = prepare_array_string_output(input, delimiter.clone(), TextValue::Null);
    array_string_join(plan, rendered, delimiter, TextValue::Null)
}

pub fn sql__pg_catalog__array_to_string__prn2(
    input: ArrayValue,
    rendered: ArrayArguments,
    delimiter: TextValue,
    marker: TextValue,
) -> TextValue {
    let plan = prepare_array_string_output(input, delimiter.clone(), marker.clone());
    array_string_join(plan, rendered, delimiter, marker)
}
