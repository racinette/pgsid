#[derive(Clone)]
pub struct TextConcatState {
    pub status: CheckOutcome,
    pub output: String,
    pub separator: String,
    pub separator_known: bool,
    pub length: i64,
    pub printed: bool,
    pub ready: bool,
    pub pending_separator: bool,
}

const TEXT_CONCAT_LIMIT_ERROR: u32 = 8584704;
const TEXT_CONCAT_ALLOCATION_ERROR: u32 = 56966976;

pub fn concat_argument_guard(previous: BoolValue, nullness: BoolValue) -> BoolValue {
    if let BoolValue::Error(_) = previous {
        return previous;
    };
    if let BoolValue::Error(_) = nullness {
        return nullness;
    };
    BoolValue::Value(true)
}

pub fn concat_begin(separator: TextValue, argument_guard: BoolValue) -> TextConcatState {
    let mut status = CheckOutcome::Unknown;
    let mut text = String::new();
    let mut known = false;
    if separator == TextValue::Null {
        status = CheckOutcome::Null;
    };
    if separator == TextValue::NonNull {
        status = CheckOutcome::True;
    };
    if let TextValue::Error(error) = separator {
        status = CheckOutcome::Error(error);
    };
    if let TextValue::Value(value) = separator {
        text = value;
        status = CheckOutcome::True;
        known = true;
    };
    if let BoolValue::Error(error) = argument_guard {
        status = CheckOutcome::Error(error);
    };
    let output = String::new();
    TextConcatState {
        status: status,
        output: output,
        separator: text,
        separator_known: known,
        length: 0i64,
        printed: false,
        ready: false,
        pending_separator: false,
    }
}

pub fn concat_variadic_begin(input: TextConcatState, nullness: BoolValue) -> TextConcatState {
    let mut status = input.status;
    if status == CheckOutcome::True {
        if nullness == BoolValue::Value(true) {
            status = CheckOutcome::Null;
        } else if nullness != BoolValue::Value(false) {
            status = CheckOutcome::Unknown;
        };
    };
    TextConcatState {
        status: status,
        output: input.output,
        separator: input.separator,
        separator_known: input.separator_known,
        length: input.length,
        printed: input.printed,
        ready: false,
        pending_separator: false,
    }
}

fn concat_append(input: TextConcatState, value: TextValue) -> TextConcatState {
    let mut status = input.status;
    let mut output = input.output;
    let mut length = input.length;
    if status == CheckOutcome::True {
        status = CheckOutcome::Unknown;
        if let TextValue::Error(error) = value {
            status = CheckOutcome::Error(error);
        };
        if let TextValue::Value(part) = value {
            let size = text_build_octets(part.as_str());
            length = length + size;
            if length >= 1073741823i64 {
                let error = make_sql_error(TEXT_CONCAT_LIMIT_ERROR);
                status = CheckOutcome::Error(error);
            } else {
                output.push_str(part.as_str());
                status = CheckOutcome::True;
            };
        };
    };
    TextConcatState {
        status: status,
        output: output,
        separator: input.separator,
        separator_known: input.separator_known,
        length: length,
        printed: input.printed,
        ready: input.ready,
        pending_separator: input.pending_separator,
    }
}

pub fn concat_before_argument(
    input: TextConcatState,
    nullness: BoolValue,
    separator_first: bool,
) -> TextConcatState {
    let mut status = input.status;
    let mut ready = false;
    let mut printed = input.printed;
    if status == CheckOutcome::True && nullness != BoolValue::Value(true) {
        if nullness != BoolValue::Value(false) {
            status = CheckOutcome::Unknown;
        } else {
            ready = true;
            printed = true;
            if separator_first && input.printed && input.separator_known == false {
                status = CheckOutcome::Unknown;
                ready = false;
            };
        };
    };
    let append_separator = ready && input.printed && separator_first;
    let pending = ready && input.printed && separator_first == false;
    let mut result = TextConcatState {
        status: status,
        output: input.output,
        separator: input.separator,
        separator_known: input.separator_known,
        length: input.length,
        printed: printed,
        ready: ready,
        pending_separator: pending,
    };
    if append_separator {
        let separator = result.separator.clone();
        let part = TextValue::Value(separator);
        result = concat_append(result, part);
    };
    result
}

pub(crate) fn concat_should_render(input: &TextConcatState) -> bool {
    input.status == CheckOutcome::True && input.ready
}

pub fn concat_after_argument(input: TextConcatState, rendered: TextValue) -> TextConcatState {
    let mut state = input;
    if state.pending_separator {
        if let TextValue::Error(_) = rendered {
            return concat_append(state, rendered);
        };
        if rendered == TextValue::Unknown || rendered == TextValue::Null {
            return concat_append(state, rendered);
        };
        if state.length >= 1073741808i64 {
            let error = make_sql_error(TEXT_CONCAT_LIMIT_ERROR);
            let failed = TextValue::Error(error);
            return concat_append(state, failed);
        };
        let mut separator = TextValue::NonNull;
        if state.separator_known {
            let text = state.separator.clone();
            separator = TextValue::Value(text);
        };
        state = concat_append(state, separator);
    };
    concat_append(state, rendered)
}

pub(crate) fn concat_array_element_nullness(
    input: &ArrayOutputPayload,
    element: ArrayElement,
) -> BoolValue {
    let nullness = array_element_bitmap(element);
    if nullness == BoolValue::Unknown && input.null_bitmap == BoolValue::Value(false) {
        return BoolValue::Value(false);
    };
    nullness
}

fn concat_finish(input: TextConcatState) -> TextValue {
    if input.status == CheckOutcome::True {
        if input.length > 1073741819i64 {
            let error = make_sql_error(TEXT_CONCAT_ALLOCATION_ERROR);
            return TextValue::Error(error);
        };
        return TextValue::Value(input.output);
    };
    if input.status == CheckOutcome::Null {
        return TextValue::Null;
    };
    let status = input.status;
    if let CheckOutcome::Error(error) = status {
        return TextValue::Error(error);
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__concat__ca4i(input: TextConcatState) -> TextValue {
    concat_finish(input)
}

pub fn sql__pg_catalog__concat_ws__dc5y(input: TextConcatState) -> TextValue {
    concat_finish(input)
}
