const DATETIME_TEMPLATE_CONTEXT: u32 = 1;

fn datetime_template_separator(character: char) -> bool {
    let code = character as i32;
    code > 32
        && code < 127
        && jsonpath_temporal_letter(character) == false
        && numeric_wire_decimal_digit(character) < 0
}

#[derive(Clone, Copy)]
struct DatetimeTemplateToken {
    kind: i32,
    width: usize,
    digit: bool,
    fill: bool,
    ordinal: bool,
    translated: bool,
    character: char,
    separator: bool,
}

#[derive(Clone)]
struct DatetimeTemplateProgram {
    tokens: Vec<DatetimeTemplateToken>,
}

fn datetime_template_compile(input: &str) -> DatetimeTemplateProgram {
    let source = JsonpathTemporalSource {
        characters: input.chars().collect(),
    };
    let mut tokens: Vec<DatetimeTemplateToken> = Vec::new();
    let mut position: usize = 0;
    while position < source.characters.len() {
        let fill = jsonpath_template_matches(&source, position, "FM")
            || jsonpath_template_matches(&source, position, "fm");
        let translated = jsonpath_template_matches(&source, position, "TM")
            || jsonpath_template_matches(&source, position, "tm");
        if fill || translated {
            position += 2;
        };
        let mut key = JSONPATH_TEMPLATE_NAMES.len();
        let mut index: usize = 0;
        while index < JSONPATH_TEMPLATE_NAMES.len() && key == JSONPATH_TEMPLATE_NAMES.len() {
            let name = JSONPATH_TEMPLATE_NAMES[index];
            if jsonpath_template_matches(&source, position, name) {
                key = index;
            };
            index += 1;
        }
        if key < JSONPATH_TEMPLATE_NAMES.len() {
            let name = JSONPATH_TEMPLATE_NAMES[key];
            let characters: Vec<char> = name.chars().collect();
            let kind = JSONPATH_TEMPLATE_KINDS[key];
            let mut width = characters.len();
            if kind == 7 || kind == 19 || kind == 20 || kind == 21 || kind == 22 {
                width = 2;
            };
            if kind == 41 {
                width = 2;
            };
            if kind == 38 {
                width = 3;
            };
            if kind == 39 {
                width = 1;
            };
            if kind == 10 {
                width = 3;
            };
            if kind == 11 {
                width = 6;
            };
            if kind >= 12 && kind <= 17 {
                width = usize::try_from(kind - 11).unwrap_or(0);
            };
            position += characters.len();
            let ordinal = jsonpath_template_matches(&source, position, "TH")
                || jsonpath_template_matches(&source, position, "th");
            if ordinal || jsonpath_template_matches(&source, position, "SP") {
                position += 2;
            };
            tokens.push(DatetimeTemplateToken {
                kind: kind,
                width: width,
                digit: JSONPATH_TEMPLATE_DIGITS[key] > 0,
                fill: fill,
                ordinal: ordinal,
                translated: translated,
                character: ' ',
                separator: false,
            });
        } else if position < source.characters.len() {
            let character = source.characters[position];
            if character == '"' {
                position += 1;
                let mut quoted = true;
                while position < source.characters.len() && quoted {
                    let literal = source.characters[position];
                    position += 1;
                    if literal == '"' {
                        quoted = false;
                    } else {
                        let mut stored = literal;
                        if literal == '\\' && position < source.characters.len() {
                            stored = source.characters[position];
                            position += 1;
                        };
                        tokens.push(DatetimeTemplateToken {
                            kind: 0,
                            width: 0,
                            digit: numeric_wire_decimal_digit(stored) >= 0,
                            fill: false,
                            ordinal: false,
                            translated: false,
                            character: stored,
                            separator: false,
                        });
                    };
                }
            } else {
                let mut stored = character;
                if character == '\\'
                    && position + 1 < source.characters.len()
                    && source.characters[position + 1] == '"'
                {
                    stored = '"';
                    position += 1;
                };
                tokens.push(DatetimeTemplateToken {
                    kind: 0,
                    width: 0,
                    digit: numeric_wire_decimal_digit(stored) >= 0,
                    fill: false,
                    ordinal: false,
                    translated: false,
                    character: stored,
                    separator: datetime_template_separator(stored) || numeric_space(stored),
                });
                position += 1;
            };
        };
    }
    DatetimeTemplateProgram { tokens: tokens }
}

struct DatetimeTemplateParsed {
    day: i64,
    clock: i64,
    precision: i32,
    west: i32,
    numeric_zone: bool,
    abbreviation: TimezoneLookup,
    error: u32,
    unknown: bool,
}

fn datetime_template_failure(error: u32) -> DatetimeTemplateParsed {
    DatetimeTemplateParsed {
        day: 0i64,
        clock: 0i64,
        precision: 0,
        west: 0,
        numeric_zone: false,
        abbreviation: timezone_lookup_class(TextValue::Null, 0, 0, ""),
        error: error,
        unknown: false,
    }
}
fn datetime_template_unknown() -> DatetimeTemplateParsed {
    DatetimeTemplateParsed {
        day: 0i64,
        clock: 0i64,
        precision: 0,
        west: 0,
        numeric_zone: false,
        abbreviation: timezone_lookup_class(TextValue::Null, 0, 0, ""),
        error: 0,
        unknown: true,
    }
}

fn datetime_template_number(
    source: &JsonpathTemporalSource,
    begin: usize,
    width: usize,
    variable: bool,
    utf8: bool,
) -> JsonpathTemplateRead {
    let mut start = begin;
    while start < source.characters.len() && numeric_space(source.characters[start]) {
        start += 1;
    }
    let mut limit = source.characters.len();
    let mut error: u32 = 0;
    if variable == false {
        let mut cursor = start;
        let mut bytes: usize = 0;
        let mut non_ascii = false;
        while cursor < source.characters.len() && bytes < width {
            let code = source.characters[cursor] as i32;
            let mut size: usize = 1;
            if code >= 128 {
                size = 2;
                non_ascii = true;
            };
            if code >= 2048 {
                size = 3;
            };
            if code >= 65536 {
                size = 4;
            };
            bytes += size;
            cursor += 1;
        }
        if bytes < width {
            error = JSONPATH_TEMPLATE_FORMAT;
        } else if non_ascii
            && utf8 == false
            && source.characters.len() - start < width
            && start > begin
            && numeric_wire_decimal_digit(source.characters[start]) < 0
        {
            error = DATETIME_TEMPLATE_CONTEXT;
        };
        limit = start + width;
        if limit > source.characters.len() {
            limit = source.characters.len();
        };
    };
    let mut position = start;
    let mut negative = false;
    if position < limit
        && (source.characters[position] == '+' || source.characters[position] == '-')
    {
        negative = source.characters[position] == '-';
        position += 1;
    };
    let digits = position;
    let mut value: i64 = 0i64;
    let mut overflow = false;
    while position < limit && numeric_wire_decimal_digit(source.characters[position]) >= 0 {
        let digit = numeric_wire_decimal_digit(source.characters[position]) as i64;
        if value > (2147483648i64 - digit) / 10i64 {
            overflow = true;
        };
        if overflow == false {
            value = value * 10i64 + digit;
        };
        position += 1;
    }
    if position == digits {
        position = start;
        if variable || position == begin {
            error = JSONPATH_TEMPLATE_FORMAT;
        };
    } else if variable == false && position - start != width {
        error = JSONPATH_TEMPLATE_FORMAT;
    };
    if overflow || (negative == false && value > 2147483647i64) {
        error = JSONPATH_TEMPLATE_RANGE;
    };
    if negative {
        value = 0i64 - value;
    };
    JsonpathTemplateRead {
        value: value as i32,
        end: position,
        width: position - begin,
        error: error,
    }
}

struct DatetimeTemplatePrefix {
    lookup: TimezoneLookup,
    end: usize,
}
fn datetime_template_prefix_state(lookup: TimezoneLookup, end: usize) -> DatetimeTemplatePrefix {
    DatetimeTemplatePrefix {
        lookup: lookup,
        end: end,
    }
}
fn datetime_template_find_prefix(
    source: &JsonpathTemporalSource,
    begin: usize,
    session: &str,
    default_profile: bool,
    utf8: bool,
) -> DatetimeTemplatePrefix {
    let mut length: usize = 0;
    while begin + length < source.characters.len()
        && length < 10
        && jsonpath_temporal_letter(source.characters[begin + length])
    {
        length += 1;
    }
    if length == 0 {
        if begin < source.characters.len()
            && source.characters[begin] as i32 >= 128
            && utf8 == false
        {
            return datetime_template_prefix_state(
                timezone_lookup_class(TextValue::Unknown, 0, 0, ""),
                begin,
            );
        };
        return datetime_template_prefix_state(
            timezone_lookup_class(TextValue::Null, 0, 0, ""),
            begin,
        );
    };
    let zone = find_zone_name(session, false);
    let profile = session_timezone_profile(session, 0i64, false);
    if profile.valid == false {
        return datetime_template_prefix_state(
            timezone_lookup_class(TextValue::Unknown, 0, 0, ""),
            begin,
        );
    };
    let mut count: usize = 2;
    if zone < ZONE_NAMES.len() {
        count = ZONE_TYPE_ENDS[zone] - ZONE_TYPE_STARTS[zone];
    };
    while length > 0 {
        let mut key = String::new();
        let mut index: usize = 0;
        while index < length {
            key.push(source.characters[begin + index].to_ascii_lowercase());
            index += 1;
        }
        let mut found = false;
        let mut dynamic = false;
        let mut seconds: i32 = 0;
        let mut daylight: i32 = 0;
        index = 0;
        while index < count {
            let candidate = timezone_lookup_candidate(session, zone, index);
            if candidate.valid && timezone_lookup_ascii(candidate.label.as_str(), false) == key {
                if found && (seconds != candidate.seconds || daylight != candidate.daylight) {
                    dynamic = true;
                };
                if found == false {
                    found = true;
                    seconds = candidate.seconds;
                    daylight = candidate.daylight;
                };
            };
            index += 1;
        }
        if found {
            if dynamic {
                return datetime_template_prefix_state(
                    timezone_lookup_class(TextValue::Value(session.to_owned()), 2, 0, key.as_str()),
                    begin + length,
                );
            };
            return datetime_template_prefix_state(
                timezone_lookup_class(timezone_lookup_fixed(seconds), 1, seconds, key.as_str()),
                begin + length,
            );
        };
        if default_profile == false {
            return datetime_template_prefix_state(
                timezone_lookup_class(TextValue::Unknown, 0, 0, ""),
                begin,
            );
        };
        index = 0;
        while index < ZONE_DEFAULT_ABBREVIATION_NAMES.len() {
            if key.as_str() == ZONE_DEFAULT_ABBREVIATION_NAMES[index] {
                if ZONE_DEFAULT_ABBREVIATION_ZONES[index] != "" {
                    return datetime_template_prefix_state(
                        timezone_lookup_class(
                            TextValue::Value(ZONE_DEFAULT_ABBREVIATION_ZONES[index].to_owned()),
                            2,
                            0,
                            key.as_str(),
                        ),
                        begin + length,
                    );
                };
                let fixed = ZONE_DEFAULT_ABBREVIATION_SECONDS[index];
                return datetime_template_prefix_state(
                    timezone_lookup_class(timezone_lookup_fixed(fixed), 1, fixed, key.as_str()),
                    begin + length,
                );
            };
            index += 1;
        }
        length = length - 1;
    }
    datetime_template_prefix_state(timezone_lookup_class(TextValue::Null, 0, 0, ""), begin)
}

fn datetime_template_parse(
    input: &str,
    template: &str,
    session: &str,
    locale_c: bool,
    collation_c: bool,
    utf8: bool,
    default_profile: bool,
) -> DatetimeTemplateParsed {
    let program = datetime_template_compile(template);
    let source = JsonpathTemporalSource {
        characters: input.chars().collect(),
    };
    let mut fields: Vec<JsonpathTemplateField> = Vec::new();
    let mut index: usize = 0;
    while index < 35 {
        fields.push(JsonpathTemplateField { value: 0 });
        index += 1;
    }
    let mut position: usize = 0;
    let mut zone_sign: i32 = 0;
    let mut precision: i32 = 0;
    let mut fixed = false;
    let mut extra_skip: i32 = 0;
    let mut abbreviation_profile = TextValue::Null;
    let mut abbreviation_kind: i32 = 0;
    let mut abbreviation_seconds: i32 = 0;
    let mut abbreviation_spelling = String::new();
    let mut year_size: i32 = 0;
    let mut date_mode: i32 = 0;
    let mut twelve_hour = false;
    index = 0;
    while index < program.tokens.len() && position < source.characters.len() {
        let token = program.tokens[index];
        if fixed == false && token.kind != 23 && (token.kind != 0 || index == 0) {
            while position < source.characters.len() && numeric_space(source.characters[position]) {
                position += 1;
                extra_skip = extra_skip + 1;
            }
        };
        if token.kind == 0 {
            if token.separator {
                if fixed {
                    if position < source.characters.len() {
                        position += 1;
                    };
                } else {
                    extra_skip = extra_skip - 1;
                    if position < source.characters.len()
                        && (numeric_space(source.characters[position])
                            || datetime_template_separator(source.characters[position]))
                    {
                        position += 1;
                        extra_skip = extra_skip + 1;
                    };
                };
            } else if fixed || extra_skip <= 0 {
                if position < source.characters.len() {
                    position += 1;
                };
            } else {
                extra_skip = extra_skip - 1;
            };
        } else {
            if token.kind == 23 {
                fixed = true;
            } else {
                let mode = jsonpath_template_date_mode(token.kind);
                if mode != 0 {
                    if date_mode != 0 && date_mode != mode {
                        return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
                    };
                    date_mode = mode;
                };
                if token.translated
                    && token.kind >= 44
                    && token.kind <= 47
                    && (locale_c == false || collation_c == false)
                {
                    return datetime_template_unknown();
                };
                let mut variable = token.fill || token.ordinal || index + 1 == program.tokens.len();
                if index + 1 < program.tokens.len() && program.tokens[index + 1].digit == false {
                    variable = true;
                };
                let mut named = false;
                if token.kind == 22 {
                    let prefix = datetime_template_find_prefix(
                        &source,
                        position,
                        session,
                        default_profile,
                        utf8,
                    );
                    let lookup = prefix.lookup;
                    let profile = lookup.profile.clone();
                    if profile == TextValue::Unknown {
                        return datetime_template_unknown();
                    };
                    if lookup.kind > 0 {
                        abbreviation_profile = lookup.profile;
                        abbreviation_kind = lookup.kind;
                        abbreviation_seconds = lookup.seconds;
                        abbreviation_spelling = lookup.spelling;
                        zone_sign = 0;
                        position = prefix.end;
                        named = true;
                    };
                    if named == false
                        && position < source.characters.len()
                        && jsonpath_temporal_letter(source.characters[position])
                    {
                        return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
                    };
                };
                if named == false {
                    if token.kind == 19 || token.kind == 21 || token.kind == 22 {
                        zone_sign = 1;
                        if position < source.characters.len() {
                            let character = source.characters[position];
                            if character == '+' || character == '-' || character == ' ' {
                                if character == '-' {
                                    zone_sign = -1;
                                };
                                position += 1;
                            } else if extra_skip > 0
                                && position > 0
                                && source.characters[position - 1] == '-'
                            {
                                zone_sign = -1;
                            };
                        };
                    };
                    if token.kind == 20 && zone_sign == 0 {
                        zone_sign = 1;
                    };
                    let mut read =
                        datetime_template_number(&source, position, token.width, variable, utf8);
                    if token.kind == 31 || token.kind == 32 {
                        let mut ad = "AD".to_owned();
                        let mut bc = "BC".to_owned();
                        let mut length: usize = 2;
                        if token.kind == 32 {
                            ad = "A.D.".to_owned();
                            bc = "B.C.".to_owned();
                            length = 4;
                        };
                        if jsonpath_template_ascii_matches(&source, position, ad.as_str()) {
                            read = JsonpathTemplateRead {
                                value: 0,
                                end: position + length,
                                width: length,
                                error: 0,
                            };
                        } else if jsonpath_template_ascii_matches(&source, position, bc.as_str()) {
                            read = JsonpathTemplateRead {
                                value: 1,
                                end: position + length,
                                width: length,
                                error: 0,
                            };
                        } else {
                            return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
                        };
                    };
                    if token.kind >= 42 && token.kind <= 48 {
                        read = jsonpath_template_named_read(&source, position, token.kind);
                    };
                    if token.kind == 33 {
                        read = datetime_template_number(&source, position, 1, true, utf8);
                        if read.error == 0 || read.error == JSONPATH_TEMPLATE_RANGE {
                            if read.end == source.characters.len()
                                || source.characters[read.end] != ','
                            {
                                return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
                            };
                            let part = jsonpath_template_year_group(&source, read.end + 1);
                            if part.error > 0 {
                                return datetime_template_failure(part.error);
                            };
                            if read.error == JSONPATH_TEMPLATE_RANGE {
                                return datetime_template_unknown();
                            };
                            let product = (read.value as i64) * 1000i64;
                            let combined = product + part.value as i64;
                            if jsonpath_template_calendar_fits(product) == false
                                || jsonpath_template_calendar_fits(combined) == false
                            {
                                return datetime_template_failure(JSONPATH_TEMPLATE_RANGE);
                            };
                            read = JsonpathTemplateRead {
                                value: combined as i32,
                                end: part.end,
                                width: part.end - position,
                                error: 0,
                            };
                        };
                    };
                    if read.error == DATETIME_TEMPLATE_CONTEXT {
                        return datetime_template_unknown();
                    };
                    if read.error > 0 {
                        return datetime_template_failure(read.error);
                    };
                    position = read.end;
                    let mut field = token.kind;
                    if field >= 1 && field <= 4 {
                        year_size = 5 - field;
                        field = 1;
                    };
                    if field == 33 {
                        year_size = 4;
                        field = 1;
                    };
                    if field >= 34 && field <= 37 {
                        year_size = 38 - field;
                        field = 1;
                    };
                    if field == 32 {
                        field = 31;
                    };
                    if field == 38 {
                        field = 24;
                    };
                    if field == 39 {
                        field = 25;
                    };
                    if field == 40 {
                        field = 26;
                    };
                    if field >= 12 && field <= 17 {
                        precision = field - 11;
                        field = 11;
                    };
                    if field == 21 || field == 22 {
                        field = 19;
                    };
                    if field == 41 {
                        twelve_hour = true;
                        field = 7;
                    };
                    if field == 42 || field == 43 {
                        twelve_hour = true;
                        field = 34;
                    };
                    if field == 44 || field == 45 || field == 48 {
                        field = 5;
                    };
                    if field == 46 || field == 47 {
                        field = 25;
                    };
                    let slot = usize::try_from(field).unwrap_or(0);
                    if field != 29 && fields[slot].value != 0 && fields[slot].value != read.value {
                        return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
                    };
                    let mut value = read.value;
                    if ((token.kind >= 2 && token.kind <= 4)
                        || (token.kind >= 35 && token.kind <= 37))
                        && read.width < 4
                    {
                        if value < 70 {
                            value = value + 2000;
                        } else if value < 100 {
                            value = value + 1900;
                        } else if value < 520 {
                            value = value + 2000;
                        } else if value < 1000 {
                            value = value + 1000;
                        };
                    };
                    if field == 10 {
                        if read.width == 1 {
                            value = value * 100;
                        };
                        if read.width == 2 {
                            value = value * 10;
                        };
                    };
                    if field == 11 {
                        let mut consumed = read.width;
                        while consumed < 6 {
                            value = value * 10;
                            consumed += 1;
                        }
                    };
                    if token.kind == 46 || token.kind == 47 {
                        value = value + 1;
                    };
                    if token.kind == 39 {
                        value = ((value as i64) + 1i64) as i32;
                        if value > 7 {
                            value = 1;
                        };
                    };
                    if field != 29 {
                        fields[slot] = JsonpathTemplateField { value: value };
                    };
                    if (token.kind == 21 || token.kind == 22)
                        && position < source.characters.len()
                        && source.characters[position] == ':'
                    {
                        let minutes =
                            datetime_template_number(&source, position + 1, 2, variable, utf8);
                        if minutes.error == DATETIME_TEMPLATE_CONTEXT {
                            return datetime_template_unknown();
                        };
                        if minutes.error > 0 {
                            return datetime_template_failure(minutes.error);
                        };
                        if fields[20].value != 0 && fields[20].value != minutes.value {
                            return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
                        };
                        fields[20] = JsonpathTemplateField {
                            value: minutes.value,
                        };
                        position = minutes.end;
                    };
                    if token.ordinal && jsonpath_template_ordinal_field(token.kind) {
                        let mut skipped: usize = 0;
                        while skipped < 2 && position < source.characters.len() {
                            position += 1;
                            skipped += 1;
                        }
                    };
                };
            };
            if fixed == false {
                extra_skip = 0;
                while position < source.characters.len()
                    && numeric_space(source.characters[position])
                {
                    position += 1;
                    extra_skip = extra_skip + 1;
                }
            };
        };
        index += 1;
    }
    let mut hours = fields[18].value / 3600;
    let mut minutes = (fields[18].value % 3600) / 60;
    let mut seconds = fields[18].value % 60;
    if fields[7].value != 0 {
        hours = fields[7].value;
    };
    if fields[8].value != 0 {
        minutes = fields[8].value;
    };
    if fields[9].value != 0 {
        seconds = fields[9].value;
    };
    if twelve_hour {
        if hours < 1 || hours > 12 {
            return datetime_template_failure(JSONPATH_TEMPLATE_FORMAT);
        };
        if fields[34].value != 0 && hours < 12 {
            hours = hours + 12;
        };
        if fields[34].value == 0 && hours == 12 {
            hours = 0;
        };
    };
    let day = jsonpath_template_calendar(
        fields[1].value,
        year_size,
        fields[30].value,
        fields[31].value,
        fields[28].value,
        fields[26].value,
        fields[25].value,
        fields[27].value,
        fields[5].value,
        fields[6].value,
        fields[24].value,
        date_mode,
        false,
    );
    if let Int8Value::Error(error) = day {
        return datetime_template_failure(error.state);
    };
    let ms = (fields[10].value as i64) * 1000i64;
    if jsonpath_template_calendar_fits(ms) == false {
        return datetime_template_failure(JSONPATH_TEMPLATE_RANGE);
    };
    let fraction = ((ms + (fields[11].value as i64)) as i32) as i64;
    if hours < 0
        || hours > 23
        || minutes < 0
        || minutes > 59
        || seconds < 0
        || seconds > 59
        || fraction < 0i64
        || fraction >= 1000000i64
    {
        return datetime_template_failure(JSONPATH_TEMPLATE_RANGE);
    };
    if zone_sign != 0
        && (fields[19].value < 0
            || fields[19].value > 15
            || fields[20].value < 0
            || fields[20].value > 59)
    {
        return datetime_template_failure(JSONPATH_TEMPLATE_ZONE);
    };
    if let Int8Value::Value(value) = day {
        return DatetimeTemplateParsed {
            day: value,
            clock: (hours as i64) * 3600000000i64
                + (minutes as i64) * 60000000i64
                + (seconds as i64) * 1000000i64
                + fraction,
            precision: precision,
            west: (0 - zone_sign) * (fields[19].value * 3600 + fields[20].value * 60),
            numeric_zone: zone_sign != 0,
            abbreviation: timezone_lookup_class(
                abbreviation_profile,
                abbreviation_kind,
                abbreviation_seconds,
                abbreviation_spelling.as_str(),
            ),
            error: 0,
            unknown: false,
        };
    };
    datetime_template_unknown()
}

fn datetime_template_value(
    input: TextValue,
    template: TextValue,
    session: &str,
    locale_c: bool,
    collation_c: bool,
    utf8: bool,
    default_profile: bool,
) -> DatetimeTemplateParsed {
    if let TextValue::Value(text) = input {
        if text.as_str() == "" && template == TextValue::NonNull {
            return datetime_template_parse(
                "",
                "",
                session,
                locale_c,
                collation_c,
                utf8,
                default_profile,
            );
        };
        if let TextValue::Value(format) = template {
            return datetime_template_parse(
                text.as_str(),
                format.as_str(),
                session,
                locale_c,
                collation_c,
                utf8,
                default_profile,
            );
        };
        return datetime_template_unknown();
    };
    if input == TextValue::NonNull {
        if let TextValue::Value(format) = template {
            let program = datetime_template_compile(format.as_str());
            let mut index: usize = 0;
            while index < program.tokens.len() {
                if program.tokens[index].kind != 0 && program.tokens[index].kind != 23 {
                    return datetime_template_unknown();
                };
                index += 1;
            }
            return datetime_template_parse(
                "",
                format.as_str(),
                session,
                locale_c,
                collation_c,
                utf8,
                default_profile,
            );
        };
    };
    datetime_template_unknown()
}

pub fn sql__pg_catalog__to_date__643t(
    input: TextValue,
    template: TextValue,
    session: &str,
    locale_c: bool,
    collation_c: bool,
    utf8: bool,
    default_profile: bool,
) -> DateValue {
    if let TextValue::Error(error) = input {
        return DateValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return DateValue::Error(error);
    };
    if input == TextValue::Unknown || template == TextValue::Unknown {
        return DateValue::Unknown;
    };
    if input == TextValue::Null || template == TextValue::Null {
        return DateValue::Null;
    };
    let parsed = datetime_template_value(
        input,
        template,
        session,
        locale_c,
        collation_c,
        utf8,
        default_profile,
    );
    if parsed.error > 0 {
        return DateValue::Error(make_sql_error(parsed.error));
    };
    if parsed.unknown {
        return DateValue::Unknown;
    };
    if parsed.day < -2451545i64 || parsed.day >= 2145031949i64 {
        return DateValue::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    make_date_value(parsed.day as i32)
}

fn datetime_template_instant(parsed: &DatetimeTemplateParsed, session: &str) -> TimestamptzValue {
    if parsed.error > 0 {
        return TimestamptzValue::Error(make_sql_error(parsed.error));
    };
    if parsed.unknown {
        return TimestamptzValue::Unknown;
    };
    if parsed.day < -2451568i64 || parsed.day > 106751991i64 {
        return TimestamptzValue::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    let base = parsed.day * 86400000000i64;
    if base > 9223372036854775807i64 - parsed.clock {
        return TimestamptzValue::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    let local = base + parsed.clock;
    let mut west = Int4Value::Unknown;
    if parsed.numeric_zone {
        west = Int4Value::Value(parsed.west);
    } else if parsed.abbreviation.kind == 1 {
        west = Int4Value::Value(0 - parsed.abbreviation.seconds);
    } else {
        let mut name = session.to_owned();
        let profile = parsed.abbreviation.profile.clone();
        if let TextValue::Value(zone) = profile {
            name = zone;
        };
        let mut east = Int4Value::Unknown;
        if parsed.abbreviation.kind == 2 {
            east = timezone_forced_offset(
                name.as_str(),
                parsed.abbreviation.spelling.as_str(),
                local,
                true,
            );
        };
        if parsed.abbreviation.kind == 0 || find_zone_name(name.as_str(), false) == ZONE_NAMES.len()
        {
            let resolved = session_timezone_profile(name.as_str(), local, true);
            if resolved.valid {
                east = Int4Value::Value(resolved.seconds);
            };
        };
        if let Int4Value::Value(seconds) = east {
            west = Int4Value::Value(0 - seconds);
        };
    };
    if let Int4Value::Value(seconds) = west {
        let adjustment = (seconds as i64) * 1000000i64;
        if (adjustment > 0i64 && local > 9223372036854775807i64 - adjustment)
            || (adjustment < 0i64 && local < -9223372036854775808i64 - adjustment)
        {
            return TimestamptzValue::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
        };
        let result = make_timestamptz_value(local + adjustment);
        if let TimestamptzValue::Error(error) = result {
            return TimestamptzValue::Error(error);
        };
        if let TimestamptzValue::Value(value) = result {
            if parsed.precision == 0 {
                return TimestamptzValue::Value(value);
            };
            let rounded = temporal_adjust_precision(value, parsed.precision);
            if let Int8Value::Error(error) = rounded {
                return TimestamptzValue::Error(error);
            };
            if let Int8Value::Value(value) = rounded {
                return TimestamptzValue::Value(value);
            };
        };
    };
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__to_timestamp__xn0m(
    input: TextValue,
    template: TextValue,
    session: &str,
    locale_c: bool,
    collation_c: bool,
    utf8: bool,
    default_profile: bool,
) -> TimestamptzValue {
    if let TextValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TimestamptzValue::Error(error);
    };
    if input == TextValue::Unknown || template == TextValue::Unknown {
        return TimestamptzValue::Unknown;
    };
    if input == TextValue::Null || template == TextValue::Null {
        return TimestamptzValue::Null;
    };
    let parsed = datetime_template_value(
        input,
        template,
        session,
        locale_c,
        collation_c,
        utf8,
        default_profile,
    );
    datetime_template_instant(&parsed, session)
}
