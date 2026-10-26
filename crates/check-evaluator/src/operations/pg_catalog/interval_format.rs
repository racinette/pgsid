const INTERVAL_FORMAT_ROMAN: &[&str] = &[
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];

fn temporal_format_integer(value: i64, width: usize) -> String {
    let mut magnitude = value;
    let mut output = String::new();
    if value < 0i64 {
        magnitude = 0i64 - magnitude;
        output.push('-');
    };
    let digits = text_signed_number(magnitude);
    let digits_characters: Vec<char> = digits.chars().collect();
    let mut length = digits_characters.len();
    if value < 0i64 {
        length += 1;
    };
    while length < width {
        output.push('0');
        length += 1;
    }
    output.push_str(digits.as_str());
    output
}

fn temporal_format_ordinal(input: &str, lower: bool) -> String {
    let characters: Vec<char> = input.chars().collect();
    let mut suffix = "TH".to_owned();
    let length = characters.len();
    if length > 0 && (length < 2 || characters[length - 2] != '1') {
        if characters[length - 1] == '1' {
            suffix = "ST".to_owned();
        };
        if characters[length - 1] == '2' {
            suffix = "ND".to_owned();
        };
        if characters[length - 1] == '3' {
            suffix = "RD".to_owned();
        };
    };
    let mut output = input.to_owned();
    let letters: Vec<char> = suffix.chars().collect();
    let mut index: usize = 0;
    while index < letters.len() {
        let mut letter = letters[index];
        if lower {
            letter = letter.to_ascii_lowercase();
        };
        output.push(letter);
        index += 1;
    }
    output
}

fn temporal_format_word(value: i64) -> i64 {
    let mut result = value % 4294967296i64;
    if result < 0i64 {
        result = result + 4294967296i64;
    };
    if result >= 2147483648i64 {
        result = result - 4294967296i64;
    };
    result
}

fn temporal_format_julian(year: i32, month: i32, day: i32) -> i64 {
    temporal_format_word(temporal_julian_from_calendar(year, month, day))
}

fn temporal_format_week_start(year: i32) -> i64 {
    let fourth = temporal_format_julian(year, 1, 4);
    let mut weekday = fourth % 7i64;
    if weekday < 0i64 {
        weekday = weekday + 7i64;
    };
    temporal_format_word(fourth - weekday)
}

fn interval_format_iso(span: IntervalPayload, kind: i32) -> i64 {
    let year = span.months / 12;
    let day = temporal_format_julian(year, span.months % 12, span.days);
    let mut iso_year = year;
    let mut start = temporal_format_week_start(year);
    if day < start {
        iso_year = year - 1;
        start = temporal_format_week_start(iso_year);
    };
    let mut week = temporal_format_word(day - start) / 7i64 + 1i64;
    if week >= 52i64 {
        let mut next_year = iso_year + 1;
        if kind == 40 {
            next_year = year + 1;
        };
        let next = temporal_format_week_start(next_year);
        if day >= next {
            week = temporal_format_word(day - next) / 7i64 + 1i64;
            iso_year = iso_year + 1;
            start = next;
        };
    };
    if kind == 40 {
        return week;
    };
    if kind == 38 {
        return temporal_format_word(day - start + 1i64);
    };
    iso_year as i64
}

fn interval_format_field(span: IntervalPayload, kind: i32, fill: bool, lower: bool) -> String {
    let year = (span.months / 12) as i64;
    let month = (span.months % 12) as i64;
    let hour = span.time / 3600000000i64;
    let minute = (span.time / 60000000i64) % 60i64;
    let second = (span.time / 1000000i64) % 60i64;
    let fraction = span.time % 1000000i64;
    let mut value: i64 = 0i64;
    let mut width: usize = 0;
    if kind >= 1 && kind <= 4 {
        value = year;
        if kind == 2 {
            value = year % 1000i64;
        };
        if kind == 3 {
            value = year % 100i64;
        };
        if kind == 4 {
            value = year % 10i64;
        };
        width = usize::try_from(5 - kind).unwrap_or(0);
        if year < 0i64 && kind != 4 {
            width += 1;
        };
    };
    if kind == 5 {
        value = month;
        width = 2;
        if month < 0i64 {
            width = 3;
        };
    };
    if kind == 6 {
        value = span.days as i64;
        width = 2;
    };
    if kind == 7 {
        value = hour;
        width = 2;
        if hour < 0i64 {
            width = 3;
        };
    };
    if kind == 41 {
        value = hour % 12i64;
        if value == 0i64 {
            value = 12i64;
        };
        width = 2;
        if hour < 0i64 {
            width = 3;
        };
    };
    if kind == 8 || kind == 9 {
        value = minute;
        if kind == 9 {
            value = second;
        };
        width = 2;
        if value < 0i64 {
            width = 3;
        };
    };
    if kind == 10 || kind == 11 || (kind >= 12 && kind <= 17) {
        let mut precision = kind - 11;
        if kind == 10 {
            precision = 3;
        };
        if kind == 11 {
            precision = 6;
        };
        let mut divisor: i64 = 1i64;
        let mut precision_index = precision;
        while precision_index < 6 {
            divisor = divisor * 10i64;
            precision_index = precision_index + 1;
        }
        return temporal_format_integer(
            fraction / divisor,
            usize::try_from(precision).unwrap_or(0),
        );
    };
    if kind == 18 {
        value = span.time / 1000000i64;
    };
    if kind == 24 || kind == 26 {
        value = temporal_format_word((span.months as i64) * 30i64 + (span.days as i64));
        width = 3;
        if kind == 26 {
            value = temporal_format_word(value - 1i64) / 7i64 + 1i64;
            width = 2;
        };
    };
    if kind == 27 {
        value = temporal_format_word((span.days as i64) - 1i64) / 7i64 + 1i64;
    };
    if kind == 29 {
        if month == 0i64 {
            return String::new();
        };
        value = (month - 1i64) / 3i64 + 1i64;
    };
    if kind == 30 {
        value = year / 100i64;
        width = 2;
        if value < 0i64 {
            width = 3;
        };
    };
    if kind == 33 {
        let mut output = text_signed_number(year / 1000i64);
        output.push(',');
        output.push_str(temporal_format_integer(year % 1000i64, 3).as_str());
        return output;
    };
    if kind == 40 || (kind >= 34 && kind <= 38) {
        value = interval_format_iso(span, kind);
        if kind == 40 {
            width = 2;
        } else if kind == 38 {
            width = 3;
        } else {
            if kind == 35 {
                value = value % 1000i64;
            };
            if kind == 36 {
                value = value % 100i64;
            };
            if kind == 37 {
                value = value % 10i64;
            };
            width = usize::try_from(38 - kind).unwrap_or(0);
            if year < 0i64 && kind != 37 {
                width += 1;
            };
        };
    };
    if kind == 28 {
        value = temporal_format_julian(span.months / 12, span.months % 12, span.days);
    };
    if kind == 42 || kind == 43 {
        let mut output = "AM".to_owned();
        if kind == 43 {
            output = "A.M.".to_owned();
        };
        if hour % 24i64 >= 12i64 {
            output = "PM".to_owned();
            if kind == 43 {
                output = "P.M.".to_owned();
            };
        };
        let mut result = String::new();
        let characters: Vec<char> = output.chars().collect();
        let mut index: usize = 0;
        while index < characters.len() {
            let mut character = characters[index];
            if lower {
                character = character.to_ascii_lowercase();
            };
            result.push(character);
            index += 1;
        }
        return result;
    };
    if kind == 48 {
        if month == 0i64 && year == 0i64 {
            return String::new();
        };
        let mut selected = month;
        if month == 0i64 {
            selected = 12i64;
            if year < 0i64 {
                selected = 1i64;
            };
        } else if month < 0i64 {
            selected = 13i64 + month;
        };
        let characters: Vec<char> = INTERVAL_FORMAT_ROMAN
            [usize::try_from((selected as i32) - 1).unwrap_or(0)]
        .chars()
        .collect();
        let mut output = String::new();
        let mut index: usize = 0;
        while index < characters.len() {
            let mut character = characters[index];
            if lower {
                character = character.to_ascii_lowercase();
            };
            output.push(character);
            index += 1;
        }
        while fill == false && index < 4 {
            output.push(' ');
            index += 1;
        }
        return output;
    };
    if fill {
        width = 0;
    };
    temporal_format_integer(value, width)
}

pub fn sql__pg_catalog__to_char__0fwv(input: IntervalValue, template: TextValue) -> TextValue {
    if let IntervalValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == IntervalValue::Unknown || template == TextValue::Unknown {
        return TextValue::Unknown;
    };
    if input == IntervalValue::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if let IntervalValue::Value(span) = input {
        if interval_special(span) != 0 {
            return TextValue::Null;
        };
        if let TextValue::Value(format) = template {
            if format.as_str() == "" {
                return TextValue::Null;
            };
            let source = JsonpathTemporalSource {
                characters: format.chars().collect(),
            };
            let mut output = String::new();
            let mut position: usize = 0;
            while position < source.characters.len() {
                let fill = jsonpath_template_matches(&source, position, "FM")
                    || jsonpath_template_matches(&source, position, "fm");
                if fill
                    || jsonpath_template_matches(&source, position, "TM")
                    || jsonpath_template_matches(&source, position, "tm")
                {
                    position += 2;
                };
                let mut key = JSONPATH_TEMPLATE_NAMES.len();
                let mut index: usize = 0;
                while index < JSONPATH_TEMPLATE_NAMES.len() && key == JSONPATH_TEMPLATE_NAMES.len()
                {
                    if jsonpath_template_matches(&source, position, JSONPATH_TEMPLATE_NAMES[index])
                    {
                        key = index;
                    };
                    index += 1;
                }
                if key < JSONPATH_TEMPLATE_NAMES.len() {
                    let name = JSONPATH_TEMPLATE_NAMES[key];
                    let letters: Vec<char> = name.chars().collect();
                    let lower = letters[0] == letters[0].to_ascii_lowercase();
                    let kind = JSONPATH_TEMPLATE_KINDS[key];
                    position += letters.len();
                    let ordinal_upper = jsonpath_template_matches(&source, position, "TH");
                    let ordinal_lower = jsonpath_template_matches(&source, position, "th");
                    if ordinal_upper
                        || ordinal_lower
                        || jsonpath_template_matches(&source, position, "SP")
                    {
                        position += 2;
                    };
                    if (kind >= 19 && kind <= 22)
                        || kind == 25
                        || kind == 39
                        || kind == 31
                        || kind == 32
                        || (kind >= 44 && kind <= 47)
                    {
                        return TextValue::Error(make_sql_error(JSONPATH_TEMPLATE_FORMAT));
                    };
                    if kind != 23 {
                        let mut field = interval_format_field(span, kind, fill, lower);
                        if (ordinal_upper || ordinal_lower)
                            && kind != 42
                            && kind != 43
                            && kind != 48
                            && (kind != 29 || span.months % 12 != 0)
                        {
                            field = temporal_format_ordinal(field.as_str(), ordinal_lower);
                        };
                        output.push_str(field.as_str());
                    };
                } else if position < source.characters.len() {
                    let mut character = source.characters[position];
                    position += 1;
                    if character == '"' {
                        let mut quoted = true;
                        while position < source.characters.len() && quoted {
                            let mut literal = source.characters[position];
                            position += 1;
                            if literal == '"' {
                                quoted = false;
                            } else {
                                if literal == '\\' && position < source.characters.len() {
                                    literal = source.characters[position];
                                    position += 1;
                                };
                                output.push(literal);
                            };
                        }
                    } else {
                        if character == '\\'
                            && position < source.characters.len()
                            && source.characters[position] == '"'
                        {
                            character = '"';
                            position += 1;
                        };
                        output.push(character);
                    };
                };
            }
            return TextValue::Value(output);
        };
    };
    TextValue::Unknown
}
