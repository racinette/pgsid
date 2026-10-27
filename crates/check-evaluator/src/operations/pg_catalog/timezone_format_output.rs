pub(crate) fn format_accept_timezone(
    input: TextFormatState,
    value: TextValue,
    original: ArrayElement,
    quote_all: i32,
    zone: &str,
) -> TextFormatState {
    let mut facts = format_unknown_bounds();
    if input.phase == 2 && input.conversion == 73 && quote_all == -1 {
        let raw = value.clone();
        facts = format_candidate_bounds(&input, raw, quote_all);
    };
    if facts.status == CheckOutcome::Unknown
        && (value == TextValue::Unknown || value == TextValue::NonNull)
    {
        let mut bounds = TextFormatBounds {
            status: CheckOutcome::Null,
            minimum: 0i64,
            maximum: 0i64,
            width: Int4Value::Unknown,
        };
        let mut style: i32 = 1;
        while style <= 6 {
            let source = original.clone();
            let instant = array_element_to_timestamptz(source);
            let text = timestamptz_output_context(instant, style, zone, false);
            let candidate = format_candidate_bounds(&input, text, quote_all);
            bounds = format_merge_bounds(bounds, candidate);
            style = style + 1;
        }
        facts = bounds;
    };
    format_accept_with_bounds(input, value, quote_all, facts)
}
