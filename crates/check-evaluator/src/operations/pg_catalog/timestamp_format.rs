fn timestamp_format_ascii(input: &str, upper: bool) -> String {
    let mut mode: i32 = 0;
    if upper {
        mode = 1;
    };
    let value = text_case_value(TextValue::Value(input.to_owned()), mode);
    if let TextValue::Value(output) = value {
        return output;
    };
    String::new()
}

const TIMESTAMP_FORMAT_MONTHS: &[&str] = &[
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const TIMESTAMP_FORMAT_DAYS: &[&str] = &[
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

#[derive(Clone)]
struct TimestampFormatFields {
    calendar: TemporalCalendarFields,
    clock: i64,
    julian: i64,
    seconds: i32,
    label: String,
    known: bool,
    locale_c: bool,
    collation_c: bool,
}

fn timestamp_format_iso(calendar: TemporalCalendarFields, julian: i64, kind: i32) -> i64 {
    let mut year = calendar.year;
    let mut start = temporal_format_week_start(year);
    if julian < start {
        year = year - 1;
        start = temporal_format_week_start(year);
    };
    let next = temporal_format_week_start(year + 1);
    if julian >= next {
        year = year + 1;
        start = next;
    };
    if kind == 40 {
        return (julian - start) / 7i64 + 1i64;
    };
    if kind == 38 {
        return julian - start + 1i64;
    };
    let mut display = year as i64;
    if display <= 0i64 {
        display = 1i64 - display;
    };
    display
}

fn timestamp_format_field(
    fields: &TimestampFormatFields,
    kind: i32,
    spelling: &str,
    fill: bool,
    translated: bool,
) -> TextValue {
    if kind == 23 {
        return make_text_value("");
    };
    if fields.known == false && (kind < 10 || kind > 17) {
        return TextValue::Unknown;
    };
    let calendar = fields.calendar;
    let span = IntervalPayload {
        months: calendar.month,
        days: calendar.day,
        time: fields.clock,
    };
    let letters: Vec<char> = spelling.chars().collect();
    let lower = letters[0] == letters[0].to_ascii_lowercase();
    if kind == 5 || kind == 29 {
        let mut width: usize = 2;
        let mut value = calendar.month as i64;
        if kind == 29 {
            width = 0;
            value = (value - 1i64) / 3i64 + 1i64;
        };
        if fill {
            width = 0;
        };
        return TextValue::Value(temporal_format_integer(value, width));
    };
    if (kind >= 6 && kind <= 18)
        || kind == 27
        || kind == 41
        || kind == 42
        || kind == 43
        || kind == 48
    {
        return TextValue::Value(interval_format_field(span, kind, fill, lower));
    };
    if kind >= 19 && kind <= 22 {
        if kind == 22 {
            if text_build_octets(fields.label.as_str()) > 24i64 {
                return TextValue::Error(make_sql_error(CLOCK_RANGE));
            };
            if lower {
                return TextValue::Value(timestamp_format_ascii(fields.label.as_str(), false));
            };
            return TextValue::Value(fields.label.clone());
        };
        let mut seconds = fields.seconds as i64;
        let mut sign = '+';
        if seconds < 0i64 {
            seconds = 0i64 - seconds;
            sign = '-';
        };
        if kind == 20 {
            return TextValue::Value(temporal_format_integer((seconds / 60i64) % 60i64, 2));
        };
        let mut width: usize = 2;
        if kind == 21 && fill {
            width = 0;
        };
        let mut output = String::new();
        output.push(sign);
        output.push_str(temporal_format_integer(seconds / 3600i64, width).as_str());
        if kind == 21 && seconds % 3600i64 != 0i64 {
            output.push(':');
            output.push_str(temporal_format_integer((seconds / 60i64) % 60i64, 2).as_str());
        };
        return TextValue::Value(output);
    };
    if kind == 31 || kind == 32 {
        let mut output = "AD".to_owned();
        if kind == 32 {
            output = "A.D.".to_owned();
        };
        if calendar.year <= 0 {
            output = "BC".to_owned();
            if kind == 32 {
                output = "B.C.".to_owned();
            };
        };
        if lower {
            output = timestamp_format_ascii(output.as_str(), false);
        };
        return TextValue::Value(output);
    };
    if kind >= 44 && kind <= 47 {
        if translated && (fields.locale_c == false || fields.collation_c == false) {
            return TextValue::Unknown;
        };
        let mut name = String::new();
        if kind == 44 || kind == 45 {
            name = TIMESTAMP_FORMAT_MONTHS[usize::try_from(calendar.month - 1).unwrap_or(0)]
                .to_owned();
        } else {
            let weekday = ((fields.julian + 1i64) % 7i64 + 7i64) % 7i64;
            name = TIMESTAMP_FORMAT_DAYS[usize::try_from(weekday as i32).unwrap_or(0)].to_owned();
        };
        if kind == 45 || kind == 47 {
            let characters: Vec<char> = name.chars().collect();
            name = String::new();
            name.push(characters[0]);
            name.push(characters[1]);
            name.push(characters[2]);
        };
        if spelling == "MONTH" || spelling == "MON" || spelling == "DAY" || spelling == "DY" {
            name = timestamp_format_ascii(name.as_str(), true);
        } else if lower {
            name = timestamp_format_ascii(name.as_str(), false);
        };
        let characters: Vec<char> = name.chars().collect();
        let mut length = characters.len();
        while translated == false && fill == false && (kind == 44 || kind == 46) && length < 9 {
            name.push(' ');
            length += 1;
        }
        return TextValue::Value(name);
    };
    let mut value: i64 = 0i64;
    let mut width: usize = 0;
    if (kind >= 1 && kind <= 4) || kind == 33 || (kind >= 34 && kind <= 37) {
        value = calendar.year as i64;
        if value <= 0i64 {
            value = 1i64 - value;
        };
        let mut year_kind = kind;
        if kind >= 34 && kind <= 37 {
            value = timestamp_format_iso(calendar, fields.julian, kind);
            year_kind = kind - 33;
        };
        if kind == 33 {
            let mut output = text_signed_number(value / 1000i64);
            output.push(',');
            output.push_str(temporal_format_integer(value % 1000i64, 3).as_str());
            return TextValue::Value(output);
        };
        if year_kind == 2 {
            value = value % 1000i64;
        };
        if year_kind == 3 {
            value = value % 100i64;
        };
        if year_kind == 4 {
            value = value % 10i64;
        };
        width = usize::try_from(5 - year_kind).unwrap_or(0);
    };
    if kind == 24 || kind == 26 {
        value = fields.julian - temporal_julian_from_calendar(calendar.year, 1, 1) + 1i64;
        width = 3;
        if kind == 26 {
            value = (value - 1i64) / 7i64 + 1i64;
            width = 2;
        };
    };
    if kind == 25 || kind == 39 {
        value = (fields.julian + 1i64) % 7i64;
        if kind == 25 {
            value = value + 1i64;
        } else if value == 0i64 {
            value = 7i64;
        };
    };
    if kind == 28 {
        value = fields.julian;
    };
    if kind == 30 {
        value = (calendar.year / 100 - 1) as i64;
        if calendar.year > 0 {
            value = ((calendar.year - 1) / 100 + 1) as i64;
        };
        width = 2;
        if value < 0i64 {
            width = 3;
        };
    };
    if kind == 38 || kind == 40 {
        value = timestamp_format_iso(calendar, fields.julian, kind);
        width = 2;
        if kind == 38 {
            width = 3;
        };
    };
    if fill {
        width = 0;
    };
    TextValue::Value(temporal_format_integer(value, width))
}

fn timestamp_format_render(fields: &TimestampFormatFields, format: &str) -> TextValue {
    let source = JsonpathTemporalSource {
        characters: format.chars().collect(),
    };
    let mut output = String::new();
    let mut unknown = false;
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
            if jsonpath_template_matches(&source, position, JSONPATH_TEMPLATE_NAMES[index]) {
                key = index;
            };
            index += 1;
        }
        if key < JSONPATH_TEMPLATE_NAMES.len() {
            let name = JSONPATH_TEMPLATE_NAMES[key];
            let letters: Vec<char> = name.chars().collect();
            let kind = JSONPATH_TEMPLATE_KINDS[key];
            position += letters.len();
            let ordinal_upper = jsonpath_template_matches(&source, position, "TH");
            let ordinal_lower = jsonpath_template_matches(&source, position, "th");
            if ordinal_upper || ordinal_lower || jsonpath_template_matches(&source, position, "SP")
            {
                position += 2;
            };
            if fields.known && (kind == 46 || kind == 47) && (fields.julian + 1i64) % 7i64 < 0i64 {
                return TextValue::Unknown;
            };
            let field = timestamp_format_field(fields, kind, name, fill, translated);
            if let TextValue::Error(error) = field {
                return TextValue::Error(error);
            };
            let mut field_known = false;
            if let TextValue::Value(text) = field {
                field_known = true;
                let mut rendered = text;
                if (ordinal_upper || ordinal_lower)
                    && kind != 23
                    && kind != 31
                    && kind != 32
                    && kind != 42
                    && kind != 43
                    && (kind < 19 || kind > 22)
                    && kind < 44
                {
                    rendered = temporal_format_ordinal(rendered.as_str(), ordinal_lower);
                };
                output.push_str(rendered.as_str());
            };
            if field_known == false {
                unknown = true;
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

    if unknown {
        return TextValue::Unknown;
    };
    TextValue::Value(output)
}

fn timestamp_format_payload(
    value: i64,
    seconds: i32,
    label: String,
    known: bool,
    locale_c: bool,
    collation_c: bool,
) -> TimestampFormatFields {
    let local = value + (seconds as i64) * 1000000i64;
    let mut day = local / 86400000000i64;
    let mut clock = local % 86400000000i64;
    if clock < 0i64 {
        day = day - 1i64;
        clock = clock + 86400000000i64;
    };
    TimestampFormatFields {
        calendar: temporal_calendar_from_julian(day + 2451545i64),
        clock: clock,
        julian: day + 2451545i64,
        seconds: seconds,
        label: label,
        known: known,
        locale_c: locale_c,
        collation_c: collation_c,
    }
}

pub fn sql__pg_catalog__to_char__m86d(
    input: TimestampValue,
    template: TextValue,
    locale_c: bool,
    collation_c: bool,
) -> TextValue {
    if let TimestampValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == TimestampValue::Unknown || template == TextValue::Unknown {
        return TextValue::Unknown;
    };
    if input == TimestampValue::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if let TimestampValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
            return TextValue::Null;
        };
        if let TextValue::Value(format) = template {
            if format.as_str() == "" {
                return TextValue::Null;
            };
            if value < -211813488000000000i64 {
                return TextValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let fields =
                timestamp_format_payload(value, 0, String::new(), true, locale_c, collation_c);
            return timestamp_format_render(&fields, format.as_str());
        };
    };
    TextValue::Unknown
}
