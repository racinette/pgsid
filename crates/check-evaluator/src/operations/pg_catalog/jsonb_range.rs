pub fn jsonb_input_from_range(input: RangeValue) -> JsonbInput {
    let text = range_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_multirange(input: MultirangeValue) -> JsonbInput {
    let text = multirange_to_text(input);
    jsonb_input_from_text(text)
}
