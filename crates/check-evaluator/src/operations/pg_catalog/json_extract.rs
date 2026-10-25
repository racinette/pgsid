pub fn sql__pg_catalog__json_object_field__ubt9(input: JsonValue, key: TextValue) -> JsonValue {
    let selected = json_read_field(input, key, false);
    json_from_coerced_text(selected)
}

pub fn sql__pg_catalog__json_object_field_text__zdkt(
    input: JsonValue,
    key: TextValue,
) -> TextValue {
    json_read_field(input, key, true)
}

pub fn sql__pg_catalog__json_array_element__8yh4(input: JsonValue, index: Int4Value) -> JsonValue {
    let selected = json_read_element(input, index, false);
    json_from_coerced_text(selected)
}

pub fn sql__pg_catalog__json_array_element_text__t2sr(
    input: JsonValue,
    index: Int4Value,
) -> TextValue {
    json_read_element(input, index, true)
}

pub fn sql__pg_catalog__json_array_length__97pw(input: JsonValue) -> Int4Value {
    json_read_length(input)
}

pub fn json_object_field_context(input: JsonValue, key: TextValue, utf8: bool) -> JsonValue {
    json_from_coerced_text(json_read_field_context(input,key,false,utf8))
}

pub fn json_object_field_text_context(input: JsonValue, key: TextValue, utf8: bool) -> TextValue {
    json_read_field_context(input,key,true,utf8)
}

pub fn json_array_element_context(input: JsonValue, index: Int4Value, utf8: bool) -> JsonValue {
    json_from_coerced_text(json_read_element_context(input,index,false,utf8))
}

pub fn json_array_element_text_context(input: JsonValue, index: Int4Value, utf8: bool) -> TextValue {
    json_read_element_context(input,index,true,utf8)
}
