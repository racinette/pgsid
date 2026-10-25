fn range_output_quote(input: &str) -> String {
    let characters: Vec<char> = input.chars().collect();
    let mut quoted = characters.len() == 0;
    let mut position: usize = 0;
    while position < characters.len() {
        let ch = characters[position];
        if ch == '"'
            || ch == '\\'
            || ch == '('
            || ch == ')'
            || ch == '['
            || ch == ']'
            || ch == ','
            || range_input_space(ch)
        {
            quoted = true;
        };
        position += 1;
    }
    let mut output = String::new();
    if quoted {
        output.push('"');
    };
    position = 0;
    while position < characters.len() {
        let ch = characters[position];
        if ch == '"' || ch == '\\' {
            output.push(ch);
        };
        output.push(ch);
        position += 1;
    }
    if quoted {
        output.push('"');
    };
    output
}

pub fn range_format_text(input: RangeValue, lower: TextValue, upper: TextValue) -> TextValue {
    if let RangeValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let RangeValue::Null = input {
        return TextValue::Null;
    };
    if let RangeValue::Value(value) = input {
        if value.empty {
            return make_text_value("empty");
        };
        let mut output = String::new();
        if value.lower_inclusive {
            output.push('[');
        } else {
            output.push('(');
        };
        let lo = value.bounds[0].clone();
        let mut lower_present = true;
        if let ArrayElement::Null = lo {
            lower_present = false;
        };
        if lower_present {
            if let TextValue::Error(error) = lower {
                return TextValue::Error(error);
            };
            let mut lower_known = false;
            if let TextValue::Value(text) = lower {
                let quoted = range_output_quote(text.as_str());
                output.push_str(quoted.as_str());
                lower_known = true;
            };
            if lower_known == false {
                return TextValue::Unknown;
            };
        };
        output.push(',');
        let hi = value.bounds[1].clone();
        let mut upper_present = true;
        if let ArrayElement::Null = hi {
            upper_present = false;
        };
        if upper_present {
            if let TextValue::Error(error) = upper {
                return TextValue::Error(error);
            };
            let mut upper_known = false;
            if let TextValue::Value(text) = upper {
                let quoted = range_output_quote(text.as_str());
                output.push_str(quoted.as_str());
                upper_known = true;
            };
            if upper_known == false {
                return TextValue::Unknown;
            };
        };
        if value.upper_inclusive {
            output.push(']');
        } else {
            output.push(')');
        };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}

fn range_output_bound(input: ArrayElement, kind: i32, cidr: bool, alias_mode: i32, utf8: bool, enum_labels: &str, enum_count: i32) -> TextValue {
    if let ArrayElement::Error(error) = input {
        return TextValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TextValue::Null;
    };
    if kind == 6 {
        return enum_to_text(array_element_to_enum(input), enum_labels, enum_count);
    };
    if kind == 11 { return json_to_text(array_element_to_json(input)); };
    if kind == 34 { return xid_to_text(array_element_to_xid(input)); };
    if kind == 35 { return cid_to_text(array_element_to_cid(input)); };
    if kind == 36 { return snapshot_to_text(array_element_to_snapshot(input)); };
    if kind == 40 { return jsonpath_to_text(array_element_to_jsonpath(input)); };
    if kind == 12 {
        return jsonb_text_context(array_element_to_jsonb(input), utf8);
    };
    if kind == 2 {
        return int4_to_text(array_element_to_int4(input));
    };
    if kind == 3 {
        return int8_to_text(array_element_to_int8(input));
    };
    if kind == 10 {
        return array_numeric_output(array_element_to_numeric(input));
    };
    if kind == 8 {
        return array_element_to_text(input);
    };
    if kind == 1 {
        return int2_to_text(array_element_to_int2(input));
    };
    if kind == 9 {
        return array_boolean_output(array_element_to_bool(input));
    };
    if kind == 13 {
        return array_network_output(array_element_to_network(input), cidr);
    };
    if kind == 14 {
        return bit_to_text(array_element_to_bit(input));
    };
    if kind == 16 {
        return macaddr_to_text(array_element_to_macaddr(input));
    };
    if kind == 17 {
        return macaddr8_to_text(array_element_to_macaddr8(input));
    };
    if kind == 18 {
        return uuid_to_text(array_element_to_uuid(input));
    };
    if kind == 19 {
        return array_float4_output(array_element_to_float4(input));
    };
    if kind == 20 {
        return array_float8_output(array_element_to_float8(input));
    };
    if kind == 21 {
        return clock_time_to_text(array_element_to_time(input));
    };
    if kind == 22 {
        return clock_timetz_to_text(array_element_to_timetz(input));
    };
    if kind == 32 {
        return sql__pg_catalog__text__j1jh(array_element_to_internal_char(input));
    };
    if kind == 33 {
        if alias_mode > 0 {
            let dash = alias_mode != 2 && alias_mode != 4;
            return oid_alias_to_text(array_element_to_oid(input), dash);
        };
        return oid_to_text(array_element_to_oid(input));
    };
    if kind == 37 {
        return xid8_to_text(array_element_to_xid8(input));
    };
    if kind == 38 {
        return pg_lsn_to_text(array_element_to_pg_lsn(input));
    };
    if kind == 39 {
        return tid_to_text(array_element_to_tid(input));
    };
    if kind == 48 { return tsquery_to_text(array_element_to_tsquery(input)); };
    if kind == 47 {
        return tsvector_to_text(array_element_to_tsvector(input));
    };
    if kind == 7 {
        if let ArrayElement::Date(value) = input {
            if value == -2147483647 - 1 {
                return make_text_value("-infinity");
            };
            if value == 2147483647 {
                return make_text_value("infinity");
            };
        };
    };
    if kind == 4 {
        if let ArrayElement::Timestamp(value) = input {
            if value == -9223372036854775808i64 {
                return make_text_value("-infinity");
            };
            if value == 9223372036854775807i64 {
                return make_text_value("infinity");
            };
        };
    };
    if kind == 5 {
        if let ArrayElement::Timestamptz(value) = input {
            if value == -9223372036854775808i64 {
                return make_text_value("-infinity");
            };
            if value == 9223372036854775807i64 {
                return make_text_value("infinity");
            };
        };
    };
    TextValue::Unknown
}

fn range_profiled_bound_output(input: ArrayElement, profile: &RangeBoundContext, index: usize) -> TextValue {
    if index >= profile.nodes.len() { return TextValue::Unknown; };
    let node = profile.nodes[index].clone();
    if node.kind == 41 && (node.type_name.as_str() == "pg_catalog.int2vector"
        || node.type_name.as_str() == "pg_catalog.oidvector")
    {
        return catalog_vector_to_text(array_element_to_array(input),
            node.type_name.as_str() == "pg_catalog.oidvector");
    };
    if node.kind == 42 { return range_to_text(array_element_to_range(input)); };
    if node.kind == 43 { return multirange_to_text(array_element_to_multirange(input)); };
    if node.kind != 41 {
        let support = make_range_support(node.comparison, 1);
        return range_output_bound(input, node.kind, node.type_name.as_str() == "pg_catalog.cidr",
            range_oid_alias_mode(support, node.type_name.as_str()), range_support_jsonb_utf8(support),
            node.enum_labels.as_str(), node.enum_count);
    };
    let plan = prepare_array_output(array_element_to_array(input));
    let mut rendered = make_array_arguments("pg_catalog.text", 8);
    let mut position = make_int4_value(0);
    while array_output_has_element(&plan, position) {
        let cell = array_output_element_at(&plan, position);
        let text = range_profiled_bound_output(cell, profile, node.child);
        if let TextValue::Error(error) = text { return TextValue::Error(error); };
        if text == TextValue::Unknown || text == TextValue::NonNull { return TextValue::Unknown; };
        rendered = append_array_argument(rendered, array_element_from_text(text));
        position = array_text_next_index(position);
    }
    finish_array_output(plan, rendered, profile.nodes[node.child].kind == 27)
}

pub fn range_to_text(input: RangeValue) -> TextValue {
    if let RangeValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let RangeValue::Null = input {
        return TextValue::Null;
    };
    if let RangeValue::Value(value) = input {
        if value.empty {
            return make_text_value("empty");
        };
        let cidr = range_support_is_cidr(value.support) || value.element_type.as_str() == "pg_catalog.cidr";
        let alias_mode = range_oid_alias_mode(value.support, value.element_type.as_str());
        let utf8 = range_support_jsonb_utf8(value.support);
        let profile = value.bound_profile.clone();
        let mut lower = range_output_bound(value.bounds[0].clone(), value.element_kind, cidr, alias_mode, utf8, value.enum_labels.as_str(), value.enum_count);
        if value.element_kind >= 41 && value.element_kind <= 43 { lower = range_profiled_bound_output(value.bounds[0].clone(), &profile, 0); };
        if let TextValue::Error(error) = lower {
            return TextValue::Error(error);
        };
        if lower == TextValue::Unknown || lower == TextValue::NonNull {
            return TextValue::Unknown;
        };
        let mut upper = range_output_bound(value.bounds[1].clone(), value.element_kind, cidr, alias_mode, utf8, value.enum_labels.as_str(), value.enum_count);
        if value.element_kind >= 41 && value.element_kind <= 43 { upper = range_profiled_bound_output(value.bounds[1].clone(), &profile, 0); };
        if let TextValue::Error(error) = upper {
            return TextValue::Error(error);
        };
        if upper == TextValue::Unknown || upper == TextValue::NonNull {
            return TextValue::Unknown;
        };
        return range_format_text(RangeValue::Value(value), lower, upper);
    };
    TextValue::Unknown
}
