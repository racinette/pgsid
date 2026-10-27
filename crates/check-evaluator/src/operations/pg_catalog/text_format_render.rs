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

pub(crate) fn format_accept(
    input: TextFormatState,
    value: TextValue,
    quote_all: i32,
) -> TextFormatState {
    let mut status = input.status;
    let mut phase = input.phase;
    let mut request = input.request;
    let mut next_argument = input.next_argument;
    let mut width = input.width;
    let mut output = input.output;
    if phase == 1 {
        let parsed = scalar_integer_from_text(value, 32);
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
        let mut rendered = value;
        if rendered == TextValue::Null {
            if input.conversion == 115 {
                rendered = make_text_value("");
            } else if input.conversion == 76 {
                rendered = make_text_value("NULL");
            } else {
                let error = make_sql_error(TEXT_FORMAT_NULL_ERROR);
                rendered = TextValue::Error(error);
            };
        } else if input.conversion == 73 {
            rendered = quote_ident_output_context(rendered, quote_all, false);
        } else if input.conversion == 76 {
            rendered = quote_literal_output(rendered, false);
        };
        output = format_pad_output(output, rendered, width, input.left);
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
