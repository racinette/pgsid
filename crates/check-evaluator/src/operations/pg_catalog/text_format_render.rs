const TEXT_FORMAT_NULL_ERROR: u32 = 3452548;

fn format_pad_output(
    input: TextConcatState,
    value: TextValue,
    width: i32,
    left: bool,
) -> TextConcatState {
    if let TextValue::Error(_) = value {
        return concat_after_argument(input, value);
    };
    if value == TextValue::Unknown || value == TextValue::Null {
        let missing = TextValue::Unknown;
        return concat_after_argument(input, missing);
    };
    if width == -2147483647 - 1 {
        let error = make_sql_error(TEXT_FORMAT_RANGE_ERROR);
        let failed = TextValue::Error(error);
        return concat_after_argument(input, failed);
    };
    let mut absolute = width;
    let mut align_left = left;
    if width < 0 {
        absolute = 0 - width;
        align_left = true;
    };
    if let TextValue::Value(text) = value {
        let characters: Vec<char> = text.chars().collect();
        let mut padding: i32 = 0;
        let width_limit = usize::try_from(absolute).unwrap_or(characters.len());
        if characters.len() < width_limit {
            let count = characters.len() as i32;
            padding = absolute - count;
        };
        let bytes = text_build_octets(text.as_str());
        let spaces = padding as i64;
        if input.length + bytes + spaces >= 1073741823i64 {
            let error = make_sql_error(TEXT_CONCAT_LIMIT_ERROR);
            let failed = TextValue::Error(error);
            return concat_after_argument(input, failed);
        };
        let mut rendered = String::new();
        if align_left {
            rendered.push_str(text.as_str());
        };
        let mut index: i32 = 0;
        while index < padding {
            rendered.push(' ');
            index = index + 1;
        }
        if align_left == false {
            rendered.push_str(text.as_str());
        };
        let result = TextValue::Value(rendered);
        return concat_after_argument(input, result);
    };
    let missing = TextValue::Unknown;
    concat_after_argument(input, missing)
}

fn format_accept_with_bounds(
    input: TextFormatState,
    value: TextValue,
    quote_all: i32,
    hint: TextFormatBounds,
) -> TextFormatState {
    let mut status = input.status;
    let mut phase = input.phase;
    let mut request = input.request;
    let mut next_argument = input.next_argument;
    let mut width = input.width;
    let mut output = input.output;
    if phase == 1 {
        let mut parsed = scalar_integer_from_text(value, 32);
        if parsed == Int8Value::Unknown {
            let hinted_width = hint.width;
            if let Int4Value::Value(width) = hinted_width {
                let number = width as i64;
                parsed = Int8Value::Value(number);
            };
            let hint_status = hint.status;
            if let CheckOutcome::Error(error) = hint_status {
                parsed = Int8Value::Error(error);
            };
        };
        status = CheckOutcome::Unknown;
        if let Int8Value::Error(error) = parsed {
            status = CheckOutcome::Error(error);
        };
        if let Int8Value::Value(number) = parsed {
            width = number as i32;
            request = next_argument;
            if input.argument > 0 {
                request = input.argument;
            };
            status = CheckOutcome::True;
            if request > input.count {
                let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
                status = CheckOutcome::Error(error);
            } else {
                next_argument = request + 1;
            };
            phase = 2;
        };
    } else {
        let rendered = format_quoted_value(value, input.conversion, quote_all);
        let prepared = rendered.clone();
        let mut facts = format_prepared_bounds(prepared, width);
        if facts.status == CheckOutcome::Unknown {
            facts = hint;
        };
        output = format_append_output(output, rendered, facts, width, input.left);
        status = output.status;
        phase = 0;
    };
    TextFormatState {
        source: input.source,
        position: input.position,
        status: status,
        output: output,
        next_argument: next_argument,
        argument: input.argument,
        width: width,
        left: input.left,
        conversion: input.conversion,
        phase: phase,
        request: request,
        count: input.count,
        render: false,
    }
}

pub(crate) fn format_before_argument(
    input: TextFormatState,
    nullness: BoolValue,
    quote_all: i32,
) -> TextFormatState {
    if nullness == BoolValue::Value(true) {
        let mut value = TextValue::Null;
        if input.phase == 1 {
            value = make_text_value("0");
        };
        return format_accept(input, value, quote_all);
    };
    let mut status = input.status;
    let mut render = false;
    if nullness == BoolValue::Value(false) {
        render = true;
    } else {
        status = CheckOutcome::Unknown;
    };
    if let BoolValue::Error(error) = nullness {
        status = CheckOutcome::Error(error);
    };
    TextFormatState {
        source: input.source,
        position: input.position,
        status: status,
        output: input.output,
        next_argument: input.next_argument,
        argument: input.argument,
        width: input.width,
        left: input.left,
        conversion: input.conversion,
        phase: input.phase,
        request: input.request,
        count: input.count,
        render: render,
    }
}

pub(crate) fn format_accept(
    input: TextFormatState,
    value: TextValue,
    quote_all: i32,
) -> TextFormatState {
    let mut facts = format_unknown_bounds();
    if input.phase == 2 && input.conversion == 73 && quote_all == -1 {
        let raw = value.clone();
        facts = format_candidate_bounds(&input, raw, quote_all);
    };
    format_accept_with_bounds(input, value, quote_all, facts)
}

pub(crate) fn format_accept_typed(
    input: TextFormatState,
    value: TextValue,
    original: ArrayElement,
    family: i32,
    quote_all: i32,
) -> TextFormatState {
    let mut facts = format_unknown_bounds();
    if input.phase == 2 && input.conversion == 73 && quote_all == -1 {
        let raw = value.clone();
        facts = format_candidate_bounds(&input, raw, quote_all);
    };
    if facts.status == CheckOutcome::Unknown
        && (value == TextValue::Unknown || value == TextValue::NonNull)
    {
        facts = format_choice_bounds(&input, original, family, quote_all);
    };
    format_accept_with_bounds(input, value, quote_all, facts)
}
