#[derive(Clone)]
pub struct JsonPopulateState {
    pub input: JsonbInput,
    pub base: CompositeValue,
    pub output: CompositeValue,
    pub status: CheckOutcome,
    pub hard: CheckOutcome,
    pub position: i32,
    pub count: i32,
    pub active: bool,
    pub convert: bool,
    pub current: JsonbInput,
    pub utf8: bool,
}

#[derive(Clone)]
pub enum JsonPopulatePlan {
    Value(JsonPopulateState),
}

pub(crate) fn make_json_populate_plan(input: JsonPopulateState) -> JsonPopulatePlan {
    JsonPopulatePlan::Value(input)
}

pub(crate) fn prepare_json_populate(
    base: CompositeValue,
    input: JsonbInput,
    type_name: &str,
    count: i32,
    utf8: bool,
) -> JsonPopulateState {
    let expected = usize::try_from(count).unwrap_or(0);
    let mut status = CheckOutcome::True;
    let mut hard = CheckOutcome::True;
    let mut active = true;
    let mut output = make_composite_fields(type_name);
    if let CompositeValue::Error(error) = base {
        status = CheckOutcome::Error(error);
    };
    if status == CheckOutcome::True {
        if let JsonbInput::Error(error) = input {
            status = CheckOutcome::Error(error);
        };
    };
    if let CheckOutcome::Error(_) = status {
        hard = status;
    };
    if status == CheckOutcome::True {
        if let CompositeValue::Unknown = base {
            status = CheckOutcome::Unknown;
        };
        if let JsonbInput::Unknown = input {
            status = CheckOutcome::Unknown;
        };
    };
    if status == CheckOutcome::True {
        if let JsonbInput::Null = input {
            output = base.clone();
            active = false;
        };
        if active {
            status = CheckOutcome::Unknown;
            let raw_source = input.clone();
            if let JsonbInput::Json(value) = raw_source {
                status = json_read_object_ready(JsonValue::Value(value), utf8);
            };
            let binary_source = input.clone();
            if let JsonbInput::Jsonb(value) = binary_source {
                status = CheckOutcome::True;
                if value.nodes[value.root].kind != 6 {
                    status = CheckOutcome::Error(make_sql_error(JSON_POPULATE_OBJECT_ERROR));
                };
            };
        };
    };
    if status == CheckOutcome::True && active {
        let source = base.clone();
        if let CompositeValue::Value(value) = source {
            if value.type_name.as_str() != type_name || value.fields.len() != expected || count < 0
            {
                status = CheckOutcome::Unknown;
            };
        };
    };
    JsonPopulateState {
        input: input,
        base: base,
        output: output,
        status: status,
        hard: hard,
        position: 0,
        count: count,
        active: active,
        convert: false,
        current: JsonbInput::Unknown,
        utf8: utf8,
    }
}

pub(crate) fn json_populate_select(input: JsonPopulateState, name: &str) -> JsonPopulateState {
    if input.status != CheckOutcome::True || input.active == false {
        return input;
    };
    let mut current = JsonbInput::Unknown;
    let mut status = input.status;
    let key = make_text_value(name);
    let raw_source = input.input.clone();
    if let JsonbInput::Json(value) = raw_source {
        let selected =
            json_read_field_context(JsonValue::Value(value), key.clone(), false, input.utf8);
        if let TextValue::Null = selected {
            current = JsonbInput::Null;
        };
        if let TextValue::Error(error) = selected {
            status = CheckOutcome::Error(error);
        };
        if let TextValue::Value(text) = selected {
            let value = make_json_value(text.as_str());
            current = jsonb_input_from_json(value);
        };
    };
    let binary_source = input.input.clone();
    if let JsonbInput::Jsonb(value) = binary_source {
        let selected = sql__pg_catalog__jsonb_object_field__4uf3(JsonbValue::Value(value), key);
        current = jsonb_input_from_jsonb(selected);
    };
    let mut found = true;
    if let JsonbInput::Null = current {
        found = false;
    };
    let mut convert = true;
    let mut output = input.output;
    let mut position = input.position;
    if found == false {
        let base = input.base.clone();
        if let CompositeValue::Value(_) = base {
            let index = make_int4_value(position);
            let field = composite_field_at(input.base.clone(), index);
            output = append_composite_field(output, field);
            position = position + 1;
            convert = false;
        };
    };
    JsonPopulateState {
        input: input.input,
        base: input.base,
        output: output,
        status: status,
        hard: input.hard,
        position: position,
        count: input.count,
        active: input.active,
        convert: convert,
        current: current,
        utf8: input.utf8,
    }
}

pub(crate) fn json_populate_should_convert(input: &JsonPopulateState) -> bool {
    input.status == CheckOutcome::True && input.active && input.convert
}

pub(crate) fn json_populate_current(input: &JsonPopulateState) -> JsonbInput {
    input.current.clone()
}

pub(crate) fn json_populate_base_current(input: &JsonPopulateState) -> CompositeValue {
    let index = make_int4_value(input.position);
    let field = composite_field_at(input.base.clone(), index);
    array_element_to_composite(field)
}

pub(crate) fn json_populate_nested_hard(input: &JsonPopulateState) -> CheckOutcome {
    input.hard
}

pub(crate) fn json_populate_domain_ready(input: &JsonPopulateState) -> bool {
    input.active && input.status == CheckOutcome::True && input.position == input.count
}

pub(crate) fn json_populate_domain_value(input: &JsonPopulateState) -> CompositeValue {
    input.output.clone()
}

pub(crate) fn json_populate_accept_domain(
    input: JsonPopulateState,
    output: CompositeValue,
    hard: CheckOutcome,
) -> JsonPopulateState {
    if json_populate_domain_ready(&input) == false {
        return input;
    };
    let mut status = input.status;
    if let CompositeValue::Error(error) = output {
        status = CheckOutcome::Error(error);
    };
    if let CompositeValue::Unknown = output {
        status = CheckOutcome::Unknown;
    };
    JsonPopulateState {
        input: input.input,
        base: input.base,
        output: output,
        status: status,
        hard: json_populate_hard_error(input.hard, hard),
        position: input.position,
        count: input.count,
        active: input.active,
        convert: input.convert,
        current: input.current,
        utf8: input.utf8,
    }
}

pub(crate) fn json_populate_accept(
    input: JsonPopulateState,
    field: ArrayElement,
    hard: CheckOutcome,
) -> JsonPopulateState {
    if json_populate_should_convert(&input) == false {
        return input;
    };
    let mut status = input.status;
    let mut output = input.output;
    let mut position = input.position;
    if let ArrayElement::Error(error) = field {
        status = CheckOutcome::Error(error);
    };
    if status == CheckOutcome::True {
        if let ArrayElement::Unknown = field {
            status = CheckOutcome::Unknown;
        };
    };
    if status == CheckOutcome::True {
        output = append_composite_field(output, field);
        position = position + 1;
    };
    JsonPopulateState {
        input: input.input,
        base: input.base,
        output: output,
        status: status,
        hard: json_populate_hard_error(input.hard, hard),
        position: position,
        count: input.count,
        active: input.active,
        convert: false,
        current: input.current,
        utf8: input.utf8,
    }
}

pub(crate) fn finish_json_populate(input: JsonPopulateState) -> CompositeValue {
    let hard = input.hard;
    if let CheckOutcome::Error(error) = hard {
        return CompositeValue::Error(error);
    };
    let status = input.status;
    if let CheckOutcome::Error(error) = status {
        return CompositeValue::Error(error);
    };
    if input.status != CheckOutcome::True {
        return CompositeValue::Unknown;
    };
    if input.active && input.position != input.count {
        return CompositeValue::Unknown;
    };
    input.output
}

pub(crate) fn json_populate_guard(
    input: JsonPopulateState,
    flag: BoolValue,
    safe: bool,
) -> JsonPopulateState {
    let initial = input.hard;
    if let CheckOutcome::Error(_) = initial {
        return input;
    };
    let mut status = input.status;
    let mut hard = input.hard;
    if let BoolValue::Error(error) = flag {
        status = CheckOutcome::Error(error);
        hard = status;
    };
    if safe == false && flag == BoolValue::Unknown {
        status = CheckOutcome::Unknown;
    };
    JsonPopulateState {
        input: input.input,
        base: input.base,
        output: input.output,
        status: status,
        hard: hard,
        position: input.position,
        count: input.count,
        active: input.active,
        convert: input.convert,
        current: input.current,
        utf8: input.utf8,
    }
}

pub fn sql__pg_catalog__json_populate_record__qo9b(input: JsonPopulatePlan) -> CompositeValue {
    if let JsonPopulatePlan::Value(value) = input {
        return finish_json_populate(value);
    };
    CompositeValue::Unknown
}

pub fn sql__pg_catalog__jsonb_populate_record__f6m5(input: JsonPopulatePlan) -> CompositeValue {
    if let JsonPopulatePlan::Value(value) = input {
        return finish_json_populate(value);
    };
    CompositeValue::Unknown
}

fn finish_json_populate_valid(input: JsonPopulateState) -> BoolValue {
    let hard = input.hard;
    if let CheckOutcome::Error(error) = hard {
        return BoolValue::Error(error);
    };
    let status = input.status;
    if let CheckOutcome::Error(_) = status {
        return make_bool_value(false);
    };
    if input.status != CheckOutcome::True {
        return BoolValue::Unknown;
    };
    if input.active && input.position != input.count {
        return BoolValue::Unknown;
    };
    if input.active == false {
        let output = input.output;
        if let CompositeValue::Null = output {
            return BoolValue::Null;
        };
    };
    make_bool_value(true)
}

pub fn sql__pg_catalog__jsonb_populate_record_valid__rd7k(input: JsonPopulatePlan) -> BoolValue {
    if let JsonPopulatePlan::Value(value) = input {
        return finish_json_populate_valid(value);
    };
    BoolValue::Unknown
}
