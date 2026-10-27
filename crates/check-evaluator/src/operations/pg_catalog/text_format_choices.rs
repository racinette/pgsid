fn format_choice_value(original: ArrayElement, family: i32, choice: i32) -> TextValue {
    if family == 4 {
        let value = array_element_to_timestamp(original);
        return timestamp_output_context(value, choice);
    };
    if family == 7 {
        let value = array_element_to_date(original);
        return date_output_context(value, choice);
    };
    if family == 15 {
        let value = array_element_to_bytea(original);
        return bytea_output_context(value, choice, false);
    };
    if family == 19 {
        let value = array_element_to_float4(original);
        let extra = choice - 16;
        return float4_output_context(value, extra, true);
    };
    if family == 20 {
        let value = array_element_to_float8(original);
        let extra = choice - 16;
        return float8_output_context(value, extra, true);
    };
    if family == 23 {
        let value = array_element_to_interval(original);
        return interval_output_context(value, choice);
    };
    let extra = choice - 16;
    if family == 24 {
        let value = array_element_to_point(original);
        return geometry_point_output_context(value, extra, true);
    };
    if family == 25 {
        let value = array_element_to_line(original);
        return geometry_line_output_context(value, extra, true);
    };
    if family == 26 {
        let value = array_element_to_lseg(original);
        return geometry_lseg_output_context(value, extra, true);
    };
    if family == 27 {
        let value = array_element_to_box(original);
        return geometry_box_output_context(value, extra, true);
    };
    if family == 28 {
        let value = array_element_to_path(original);
        return geometry_path_output_context(value, extra, true);
    };
    if family == 29 {
        let value = array_element_to_polygon(original);
        return geometry_polygon_output_context(value, extra, true);
    };
    if family == 30 {
        let value = array_element_to_circle(original);
        return geometry_circle_output_context(value, extra, true);
    };
    TextValue::Unknown
}

fn format_choice_bounds(
    input: &TextFormatState,
    original: ArrayElement,
    family: i32,
    quote_all: i32,
) -> TextFormatBounds {
    let mut count: i32 = 0;
    if family == 4 || family == 7 {
        count = 6;
    };
    if family == 15 {
        count = 2;
    };
    if family == 19 || family == 20 || (family >= 24 && family <= 30) {
        count = 19;
    };
    if family == 23 {
        count = 4;
    };
    let mut result = TextFormatBounds {
        status: CheckOutcome::Null,
        minimum: 0i64,
        maximum: 0i64,
        width: Int4Value::Unknown,
    };
    let mut index: i32 = 1;
    while index <= count {
        let source = original.clone();
        let candidate = format_choice_value(source, family, index);
        let bounds = format_candidate_bounds(input, candidate, quote_all);
        result = format_merge_bounds(result, bounds);
        if result.status == CheckOutcome::Unknown {
            return result;
        };
        index = index + 1;
    }
    if count == 0 {
        return format_unknown_bounds();
    };
    result
}
