fn jsonpath_abbreviation_resolve(
    local: JsonpathTemporalValue,
    lookup: TimezoneLookup,
    template: bool,
) -> JsonpathTemporalValue {
    let mut seconds = Int4Value::Unknown;
    if lookup.kind == 1 {
        seconds = make_int4_value(lookup.seconds);
    };
    if lookup.kind == 2 {
        let profile = lookup.profile;
        if let TextValue::Value(name) = profile {
            if local.kind == 3 {
                seconds = timezone_forced_fixed_offset(name.as_str(), lookup.spelling.as_str());
            } else {
                seconds = timezone_forced_offset(
                    name.as_str(),
                    lookup.spelling.as_str(),
                    local.value,
                    true,
                );
            };
        };
    };
    if let Int4Value::Value(east) = seconds {
        let west = 0 - east;
        if local.kind == 3 {
            return jsonpath_temporal_state(3, local.value, west, 0, false, false);
        };
        let shifted = sql__pg_catalog__int8pl__1v1h(
            Int8Value::Value(local.value),
            Int8Value::Value((west as i64) * 1000000i64),
        );
        if let Int8Value::Value(value) = shifted {
            let checked = make_timestamp_value(value);
            if let TimestampValue::Value(number) = checked {
                return jsonpath_temporal_state(5, number, west, 0, false, false);
            };
        };
        if template {
            return jsonpath_template_error(JSONPATH_TEMPLATE_RANGE, false);
        };
        return jsonpath_temporal_invalid();
    };
    jsonpath_temporal_state(local.kind, local.value, 0, 0, true, false)
}

fn jsonpath_temporal_decode_context(
    input: TextValue,
    session: &str,
    defaults: bool,
    utf8: bool,
) -> JsonpathTemporalValue {
    let parsed = jsonpath_temporal_decode(input.clone());
    if parsed.unknown == false || (parsed.kind != 3 && parsed.kind != 5) {
        return parsed;
    };
    if let TextValue::Value(text) = input {
        let source = JsonpathTemporalSource {
            characters: text.chars().collect(),
        };
        let mut end = source.characters.len();
        while end > 0 && numeric_space(source.characters[end - 1]) {
            end = end - 1;
        }
        let mut start = end;
        while start > 0 && jsonpath_temporal_letter(source.characters[start - 1]) {
            start = start - 1;
        }
        let prefix = datetime_template_find_prefix(&source, start, session, defaults, utf8);
        if prefix.lookup.profile == TextValue::Unknown {
            return parsed;
        };
        if prefix.end != end || prefix.lookup.kind == 0 {
            return jsonpath_temporal_invalid();
        };
        let mut plain = String::new();
        let mut index: usize = 0;
        while index < start {
            plain.push(source.characters[index]);
            index += 1;
        }
        let local = jsonpath_temporal_decode(make_text_value(plain.as_str()));
        let zoned = jsonpath_temporal_state(
            parsed.kind,
            local.value,
            0,
            local.error,
            local.unknown,
            local.hard,
        );
        return jsonpath_abbreviation_resolve(zoned, prefix.lookup, false);
    };
    parsed
}

fn jsonpath_template_parse_context(
    input: TextValue,
    template: TextValue,
    session: &str,
    defaults: bool,
    utf8: bool,
    locale_c: bool,
    collation_c: bool,
) -> JsonpathTemporalValue {
    let original = input.clone();
    if let TextValue::Value(text) = original {
        let requested = template.clone();
        if let TextValue::Value(format) = requested {
            let program = jsonpath_template_compile(format.as_str());
            let mut needs_abbreviation = false;
            let mut token: usize = 0;
            while token < program.tokens.len() {
                if program.tokens[token].kind == 22 {
                    needs_abbreviation = true;
                };
                token += 1;
            }
            if needs_abbreviation == false {
                let prefixes: Vec<usize> = Vec::new();
                return jsonpath_template_parse_prefixes(
                    input,
                    template,
                    prefixes,
                    locale_c,
                    collation_c,
                );
            };
        };
        let source = JsonpathTemporalSource {
            characters: text.chars().collect(),
        };
        let mut prefixes: Vec<usize> = Vec::new();
        let mut index: usize = 0;
        while index < source.characters.len() {
            let mut end: usize = 0;
            if jsonpath_temporal_letter(source.characters[index]) {
                let prefix = datetime_template_find_prefix(&source, index, session, defaults, utf8);
                if prefix.lookup.profile == TextValue::Unknown {
                    end = source.characters.len() + 1;
                } else if prefix.lookup.kind != 0 {
                    end = prefix.end;
                };
            };
            prefixes.push(end);
            index += 1;
        }
        let parsed =
            jsonpath_template_parse_prefixes(input, template, prefixes, locale_c, collation_c);
        if parsed.abbreviation_token > 0 {
            let selected = datetime_template_find_prefix(
                &source,
                parsed.abbreviation_token - 1,
                session,
                defaults,
                utf8,
            );
            return jsonpath_abbreviation_resolve(parsed, selected.lookup, true);
        };
        return parsed;
    };
    jsonpath_template_parse(input, template)
}
