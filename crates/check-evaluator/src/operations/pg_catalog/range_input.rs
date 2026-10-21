const RANGE_INPUT_SYNTAX: u32 = 3484946;

fn range_input_space(ch: char) -> bool {
    ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\x0b' || ch == '\x0c'
}

fn range_input_bound(input: TextValue, kind: i32, cidr: bool, name: bool, alias_mode: i32) -> ArrayElement {
    if kind == 8 {
        if name { return array_element_from_text(name_from_text(input)); };
        return array_element_from_text(input);
    };
    if kind == 1 || kind == 2 || kind == 3 {
        return array_integer_text_element(input, kind);
    };
    if kind == 10 {
        return array_element_from_numeric(scalar_numeric_from_text(input));
    };
    if kind == 7 {
        return array_element_from_date(date_from_text(input));
    };
    if kind == 4 {
        return array_element_from_timestamp(timestamp_from_text(input));
    };
    if kind == 5 {
        return array_element_from_timestamptz(timestamptz_from_text(input));
    };
    if kind == 9 {
        return array_element_from_bool(scalar_boolean_from_text(input));
    };
    if kind == 13 {
        if cidr {
            return array_element_from_network(cidr_from_text(input));
        };
        return array_element_from_network(network_from_text(input));
    };
    if kind == 14 {
        return array_element_from_bit(bit_from_text(input));
    };
    if kind == 15 {
        return array_element_from_bytea(bytea_from_text(input));
    };
    if kind == 16 {
        return array_element_from_macaddr(macaddr_from_text(input));
    };
    if kind == 17 {
        return array_element_from_macaddr8(macaddr8_from_text(input));
    };
    if kind == 18 {
        return array_element_from_uuid(uuid_from_text(input));
    };
    if kind == 19 {
        return array_element_from_float4(float4_from_text(input));
    };
    if kind == 20 {
        return array_element_from_float8(float8_from_text(input));
    };
    if kind == 21 {
        return array_element_from_time(time_from_text(input));
    };
    if kind == 22 {
        return array_element_from_timetz(timetz_from_text(input));
    };
    if kind == 23 {
        return array_element_from_interval(interval_from_text(input));
    };
    if kind == 31 {
        return array_element_from_money(money_from_text(input));
    };
    if kind == 32 {
        return array_element_from_internal_char(internal_char_from_text(input));
    };
    if kind == 33 {
        if alias_mode > 0 {
            let dash = alias_mode != 2 && alias_mode != 4;
            let mut grammar: i32 = 0;
            if alias_mode == 3 || alias_mode == 4 { grammar = 1; };
            if alias_mode == 5 { grammar = 2; };
            return array_element_from_oid(oid_alias_from_text(input, dash, grammar));
        };
        return array_element_from_oid(oid_from_text(input));
    };
    if kind == 37 {
        return array_element_from_xid8(xid8_from_text(input));
    };
    if kind == 38 {
        return array_element_from_pg_lsn(pg_lsn_from_text(input));
    };
    if kind == 39 {
        return array_element_from_tid(tid_from_text(input));
    };
    ArrayElement::Unknown
}

fn range_text_value(
    empty: bool,
    lower: TextValue,
    upper: TextValue,
    flags: String,
) -> RangeTextPlan {
    let mut lower_present = false;
    let mut upper_present = false;
    let mut lower_value = String::new();
    let mut upper_value = String::new();
    if let TextValue::Value(value) = lower {
        lower_present = true;
        lower_value = value;
    };
    if let TextValue::Value(value) = upper {
        upper_present = true;
        upper_value = value;
    };
    RangeTextPlan::Value(RangeTextPayload {
        empty,
        lower_present,
        upper_present,
        lower: lower_value,
        upper: upper_value,
        flags,
    })
}

pub fn prepare_range_text(input: TextValue) -> RangeTextPlan {
    if let TextValue::Error(error) = input {
        return RangeTextPlan::Error(error);
    };
    if let TextValue::Null = input {
        return RangeTextPlan::Null;
    };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < chars.len() && range_input_space(chars[position]) {
            position += 1;
        }
        let mut end = chars.len();
        while end > position && range_input_space(chars[end - 1]) {
            end = end - 1;
        }
        if end - position == 5 {
            if (chars[position] == 'e' || chars[position] == 'E')
                && (chars[position + 1] == 'm' || chars[position + 1] == 'M')
                && (chars[position + 2] == 'p' || chars[position + 2] == 'P')
                && (chars[position + 3] == 't' || chars[position + 3] == 'T')
                && (chars[position + 4] == 'y' || chars[position + 4] == 'Y')
            {
                return range_text_value(true, TextValue::Null, TextValue::Null, String::new());
            };
        };
        if position >= end {
            return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        let opening = chars[position];
        if opening != '[' && opening != '(' {
            return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        position += 1;
        let mut lower_text = TextValue::Null;
        let mut upper_text = TextValue::Null;
        let mut bound: usize = 0;
        while bound < 2 {
            if position >= end {
                return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
            };
            let first = chars[position];
            let mut value = TextValue::Null;
            if first != ',' && first != ')' && first != ']' {
                let mut content = String::new();
                let mut quoted = false;
                let mut scanning = true;
                while scanning {
                    if position >= end {
                        return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                    };
                    let ch = chars[position];
                    if quoted == false && (ch == ',' || ch == ')' || ch == ']') {
                        scanning = false;
                    } else {
                        position += 1;
                        if ch == '\\' {
                            if position >= end {
                                return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                            };
                            content.push(chars[position]);
                            position += 1;
                        } else if ch == '"' {
                            if quoted && position < end && chars[position] == '"' {
                                content.push('"');
                                position += 1;
                            } else {
                                quoted = quoted == false;
                            };
                        } else {
                            content.push(ch);
                        };
                    };
                }
                value = TextValue::Value(content);
            };
            if bound == 0 {
                lower_text = value;
                if chars[position] != ',' {
                    return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                };
                position += 1;
            } else {
                upper_text = value;
            };
            bound += 1;
        }
        let closing = chars[position];
        if (closing != ')' && closing != ']') || position + 1 != end {
            return RangeTextPlan::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        let mut flags = String::new();
        flags.push(opening);
        flags.push(closing);
        return range_text_value(false, lower_text, upper_text, flags);
    };
    RangeTextPlan::Unknown
}

pub fn range_text_state(plan: RangeTextPlan) -> BoolValue {
    if let RangeTextPlan::Error(error) = plan {
        return BoolValue::Error(error);
    };
    if let RangeTextPlan::Null = plan {
        return BoolValue::Null;
    };
    if let RangeTextPlan::Value(payload) = plan {
        return BoolValue::Value(payload.empty);
    };
    BoolValue::Unknown
}

pub fn range_text_needs_bounds(plan: RangeTextPlan) -> bool {
    range_text_state(plan.clone()) == BoolValue::Value(false)
}

pub fn range_text_bound(plan: RangeTextPlan, upper: bool) -> TextValue {
    if let RangeTextPlan::Value(payload) = plan {
        if upper {
            if payload.upper_present {
                return TextValue::Value(payload.upper.clone());
            };
        } else {
            if payload.lower_present {
                return TextValue::Value(payload.lower.clone());
            };
        };
    };
    TextValue::Null
}

pub fn range_text_flags(plan: RangeTextPlan) -> TextValue {
    if let RangeTextPlan::Value(payload) = plan {
        if payload.empty == false {
            return TextValue::Value(payload.flags.clone());
        };
    };
    TextValue::Null
}

pub fn range_text_bound_present(plan: RangeTextPlan, upper: bool) -> bool {
    if range_text_needs_bounds(plan.clone()) {
        let value = range_text_bound(plan, upper);
        if let TextValue::Value(_) = value {
            return true;
        };
    };
    false
}

pub fn range_text_bound_continues(input: ArrayElement) -> bool {
    if let ArrayElement::Error(_) = input {
        return false;
    };
    if let ArrayElement::Unknown = input {
        return false;
    };
    true
}

pub fn range_stored_text_bound(input: ArrayElement) -> ArrayElement {
    if let ArrayElement::Error(_) = input {
        return ArrayElement::Unknown;
    };
    input
}

pub fn range_stored_text_initial(
    plan: RangeTextPlan,
    type_name: &str,
    element_type: &str,
    kind: i32,
    support: RangeSupport,
) -> RangeValue {
    let initial = range_text_initial(plan, type_name, element_type, kind, support);
    if let RangeValue::Error(_) = initial {
        return RangeValue::Unknown;
    };
    initial
}

pub fn finish_range_stored_text(
    plan: RangeTextPlan,
    type_name: &str,
    element_type: &str,
    kind: i32,
    support: RangeSupport,
    lower: ArrayElement,
    upper: ArrayElement,
) -> RangeValue {
    if range_text_needs_bounds(plan.clone()) == false {
        return range_stored_text_initial(plan, type_name, element_type, kind, support);
    };
    let flags = range_text_flags(plan);
    if let TextValue::Value(text) = flags {
        return range_from_profiled_bounds(
            type_name,
            element_type,
            kind,
            false,
            text.as_str() == "[]" || text.as_str() == "[)",
            text.as_str() == "[]" || text.as_str() == "(]",
            range_stored_text_bound(lower),
            range_stored_text_bound(upper),
            support,
        );
    };
    RangeValue::Unknown
}

pub fn range_text_initial(
    plan: RangeTextPlan,
    type_name: &str,
    element_type: &str,
    kind: i32,
    support: RangeSupport,
) -> RangeValue {
    let state = range_text_state(plan.clone());
    if let BoolValue::Error(error) = state {
        return RangeValue::Error(error);
    };
    if let BoolValue::Null = state {
        return RangeValue::Null;
    };
    if state == BoolValue::Value(true) {
        return range_from_profiled_bounds(
            type_name,
            element_type,
            kind,
            true,
            false,
            false,
            ArrayElement::Null,
            ArrayElement::Null,
            support,
        );
    };
    RangeValue::Unknown
}

pub fn finish_range_text(
    plan: RangeTextPlan,
    type_name: &str,
    element_type: &str,
    kind: i32,
    support: RangeSupport,
    lower: ArrayElement,
    upper: ArrayElement,
) -> RangeValue {
    if range_text_needs_bounds(plan.clone()) == false {
        return range_text_initial(plan.clone(), type_name, element_type, kind, support);
    };
    let flags = range_text_flags(plan.clone());
    range_construct_with_support(type_name, element_type, kind, lower, upper, flags, support)
}

pub fn range_from_text_with_support(
    input: TextValue,
    type_name: &str,
    element_type: &str,
    kind: i32,
    support: RangeSupport,
) -> RangeValue {
    let plan = prepare_range_text(input);
    if range_text_needs_bounds(plan.clone()) == false {
        return range_text_initial(plan.clone(), type_name, element_type, kind, support);
    };
    let lower_text = range_text_bound(plan.clone(), false);
    let cidr = range_support_is_cidr(support) || element_type == "pg_catalog.cidr";
    let name = support.comparison == 200 || support.comparison == 208 || element_type == "pg_catalog.name";
    let alias_mode = range_oid_alias_mode(support, element_type);
    let lower = range_input_bound(lower_text, kind, cidr, name, alias_mode);
    if let ArrayElement::Error(error) = lower {
        return RangeValue::Error(error);
    };
    if let ArrayElement::Unknown = lower {
        return RangeValue::Unknown;
    };
    let upper_text = range_text_bound(plan.clone(), true);
    let upper = range_input_bound(upper_text, kind, cidr, name, alias_mode);
    if let ArrayElement::Error(error) = upper {
        return RangeValue::Error(error);
    };
    if let ArrayElement::Unknown = upper {
        return RangeValue::Unknown;
    };
    finish_range_text(plan, type_name, element_type, kind, support, lower, upper)
}

pub fn range_from_text(
    input: TextValue,
    type_name: &str,
    element_type: &str,
    kind: i32,
) -> RangeValue {
    let support = range_builtin_support(type_name, element_type, kind);
    range_from_text_with_support(input, type_name, element_type, kind, support)
}
