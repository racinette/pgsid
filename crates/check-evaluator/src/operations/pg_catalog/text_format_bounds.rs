#[derive(Clone, Copy)]
pub struct TextFormatBounds {
    pub status: CheckOutcome,
    pub minimum: i64,
    pub maximum: i64,
    pub width: Int4Value,
}

#[derive(Clone)]
pub struct TextFormatOutput {
    pub buffer: TextConcatState,
    pub status: CheckOutcome,
    pub minimum: i64,
    pub maximum: i64,
    pub known: bool,
}

fn format_unknown_bounds() -> TextFormatBounds {
    TextFormatBounds {
        status: CheckOutcome::Unknown,
        minimum: 0i64,
        maximum: 0i64,
        width: Int4Value::Unknown,
    }
}

fn format_exact_bounds(size: i64) -> TextFormatBounds {
    TextFormatBounds {
        status: CheckOutcome::True,
        minimum: size,
        maximum: size,
        width: Int4Value::Unknown,
    }
}

fn format_error_bounds(error: SqlError) -> TextFormatBounds {
    TextFormatBounds {
        status: CheckOutcome::Error(error),
        minimum: 0i64,
        maximum: 0i64,
        width: Int4Value::Error(error),
    }
}

fn format_merge_bounds(left: TextFormatBounds, right: TextFormatBounds) -> TextFormatBounds {
    if left.status == CheckOutcome::Null {
        return right;
    };
    if left.status == CheckOutcome::True && right.status == CheckOutcome::True {
        let mut minimum = left.minimum;
        let mut maximum = left.maximum;
        if right.minimum < minimum {
            minimum = right.minimum;
        };
        if right.maximum > maximum {
            maximum = right.maximum;
        };
        let mut width = left.width;
        if width != right.width {
            width = Int4Value::Unknown;
        };
        return TextFormatBounds {
            status: CheckOutcome::True,
            minimum: minimum,
            maximum: maximum,
            width: width,
        };
    };
    if left.status == right.status {
        return left;
    };
    format_unknown_bounds()
}

fn format_prepared_bounds(value: TextValue, width: i32) -> TextFormatBounds {
    if let TextValue::Error(error) = value {
        return format_error_bounds(error);
    };
    if let TextValue::Value(_) = value {
        if width == -2147483647 - 1 {
            let error = make_sql_error(TEXT_FORMAT_RANGE_ERROR);
            return format_error_bounds(error);
        };
    };
    if let TextValue::Value(text) = value {
        let bytes = text_build_octets(text.as_str());
        if bytes >= 1073741823i64 {
            let error = make_sql_error(TEXT_CONCAT_LIMIT_ERROR);
            return format_error_bounds(error);
        };
        let mut size = bytes;
        if width != 0 {
            let characters: Vec<char> = text.chars().collect();
            let mut absolute = width;
            if absolute < 0 {
                absolute = 0 - absolute;
            };
            let requested = absolute as i64;
            let length = characters.len() as i32;
            let count = length as i64;
            if requested > count {
                size = size + requested - count;
            };
        };
        if size >= 1073741823i64 {
            let error = make_sql_error(TEXT_CONCAT_LIMIT_ERROR);
            return format_error_bounds(error);
        };
        return format_exact_bounds(size);
    };
    format_unknown_bounds()
}

fn format_quoted_value(value: TextValue, conversion: i32, quote_all: i32) -> TextValue {
    if value == TextValue::Null {
        if conversion == 115 {
            return make_text_value("");
        };
        if conversion == 76 {
            return make_text_value("NULL");
        };
        let error = make_sql_error(TEXT_FORMAT_NULL_ERROR);
        return TextValue::Error(error);
    };
    if conversion == 73 {
        return quote_ident_output_context(value, quote_all, false);
    };
    if conversion == 76 {
        return quote_literal_output(value, false);
    };
    value
}

fn format_candidate_bounds(
    input: &TextFormatState,
    value: TextValue,
    quote_all: i32,
) -> TextFormatBounds {
    if input.phase == 1 {
        let parsed = scalar_integer_from_text(value, 32);
        if let Int8Value::Error(error) = parsed {
            return format_error_bounds(error);
        };
        if let Int8Value::Value(number) = parsed {
            let width = number as i32;
            return TextFormatBounds {
                status: CheckOutcome::True,
                minimum: 0i64,
                maximum: 0i64,
                width: Int4Value::Value(width),
            };
        };
        return format_unknown_bounds();
    };
    if input.conversion == 73 && quote_all == -1 {
        let raw = value.clone();
        let first = format_quoted_value(raw, input.conversion, 0);
        let left = format_prepared_bounds(first, input.width);
        let second = format_quoted_value(value, input.conversion, 1);
        let right = format_prepared_bounds(second, input.width);
        return format_merge_bounds(left, right);
    };
    let prepared = format_quoted_value(value, input.conversion, quote_all);
    format_prepared_bounds(prepared, input.width)
}

fn format_begin_output(guard: BoolValue) -> TextFormatOutput {
    let separator = make_text_value("");
    let buffer = concat_begin(separator, guard);
    TextFormatOutput {
        status: buffer.status,
        buffer: buffer,
        minimum: 0i64,
        maximum: 0i64,
        known: true,
    }
}

fn format_append_output(
    input: TextFormatOutput,
    value: TextValue,
    facts: TextFormatBounds,
    width: i32,
    left: bool,
) -> TextFormatOutput {
    if input.status != CheckOutcome::True {
        return input;
    };
    let mut status = facts.status;
    let mut minimum = input.minimum;
    let mut maximum = input.maximum;
    let mut known = input.known;
    let mut buffer = input.buffer;
    if status == CheckOutcome::True {
        minimum = minimum + facts.minimum;
        maximum = maximum + facts.maximum;
        if minimum >= 1073741823i64 {
            let error = make_sql_error(TEXT_CONCAT_LIMIT_ERROR);
            status = CheckOutcome::Error(error);
        } else if maximum >= 1073741823i64 {
            status = CheckOutcome::Unknown;
        } else {
            let mut concrete = false;
            if let TextValue::Value(_) = value {
                concrete = true;
            };
            if known && concrete {
                buffer = format_pad_output(buffer, value, width, left);
                status = buffer.status;
            } else {
                known = false;
            };
        };
    };
    TextFormatOutput {
        status: status,
        buffer: buffer,
        minimum: minimum,
        maximum: maximum,
        known: known,
    }
}

fn format_finish_output(input: TextFormatOutput) -> TextValue {
    if input.status == CheckOutcome::True {
        if input.minimum > 1073741819i64 {
            let error = make_sql_error(TEXT_CONCAT_ALLOCATION_ERROR);
            return TextValue::Error(error);
        };
        if input.maximum > 1073741819i64 {
            return TextValue::Unknown;
        };
        if input.known {
            return concat_finish(input.buffer);
        };
        if input.maximum == 0i64 {
            return make_text_value("");
        };
        return TextValue::NonNull;
    };
    let status = input.status;
    if let CheckOutcome::Error(error) = status {
        return TextValue::Error(error);
    };
    TextValue::Unknown
}
