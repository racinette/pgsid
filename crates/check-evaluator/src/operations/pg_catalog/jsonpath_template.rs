const JSONPATH_TEMPLATE_FORMAT: u32 = 3452551;
const JSONPATH_TEMPLATE_RANGE: u32 = 3452552;
const JSONPATH_TEMPLATE_ZONE: u32 = 3452553;

#[derive(Clone, Copy)]
struct JsonpathTemplateToken {
    kind: i32,
    width: usize,
    digit: bool,
    fill: bool,
    ordinal: bool,
    translated: bool,
    character: char,
}

#[derive(Clone)]
struct JsonpathTemplateProgram {
    tokens: Vec<JsonpathTemplateToken>,
    error: u32,
    dated: bool,
    timed: bool,
    zoned: bool,
}

const JSONPATH_TEMPLATE_NAMES: &[&str] = &[
    "A.D.", "A.M.", "AD", "AM", "B.C.", "BC", "CC", "DAY", "DDD", "DD", "DY", "Day", "Dy", "D",
    "FF1", "FF2", "FF3", "FF4", "FF5", "FF6", "FX", "HH24", "HH12", "HH", "IDDD", "ID", "IW",
    "IYYY", "IYY", "IY", "I", "J", "MI", "MM", "MONTH", "MON", "MS", "Month", "Mon", "OF", "P.M.",
    "PM", "Q", "RM", "SSSSS", "SSSS", "SS", "TZH", "TZM", "TZ", "US", "WW", "W", "Y,YYY", "YYYY",
    "YYY", "YY", "Y", "a.d.", "a.m.", "ad", "am", "b.c.", "bc", "cc", "day", "ddd", "dd", "dy",
    "d", "ff1", "ff2", "ff3", "ff4", "ff5", "ff6", "fx", "hh24", "hh12", "hh", "iddd", "id", "iw",
    "iyyy", "iyy", "iy", "i", "j", "mi", "mm", "month", "mon", "ms", "of", "p.m.", "pm", "q", "rm",
    "sssss", "ssss", "ss", "tzh", "tzm", "tz", "us", "ww", "w", "y,yyy", "yyyy", "yyy", "yy", "y",
];
const JSONPATH_TEMPLATE_KINDS: &[i32] = &[
    32, 43, 31, 42, 32, 31, 30, 46, 24, 6, 47, 46, 47, 25, 12, 13, 14, 15, 16, 17, 23, 7, 41, 41,
    38, 39, 40, 34, 35, 36, 37, 28, 8, 5, 44, 45, 10, 44, 45, 21, 43, 42, 29, 48, 18, 18, 9, 19,
    20, 22, 11, 26, 27, 33, 1, 2, 3, 4, 32, 43, 31, 42, 32, 31, 30, 46, 24, 6, 47, 25, 12, 13, 14,
    15, 16, 17, 23, 7, 41, 41, 38, 39, 40, 34, 35, 36, 37, 28, 8, 5, 44, 45, 10, 21, 43, 42, 29,
    48, 18, 18, 9, 19, 20, 22, 11, 26, 27, 33, 1, 2, 3, 4,
];
const JSONPATH_TEMPLATE_DIGITS: &[i32] = &[
    0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
    1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1,
];

fn jsonpath_template_matches(source: &JsonpathTemporalSource, position: usize, name: &str) -> bool {
    let characters: Vec<char> = name.chars().collect();
    if position + characters.len() > source.characters.len() {
        return false;
    };
    let mut index: usize = 0;
    while index < characters.len() {
        if source.characters[position + index] != characters[index] {
            return false;
        };
        index += 1;
    }
    true
}

fn jsonpath_template_compile(input: &str) -> JsonpathTemplateProgram {
    let source = JsonpathTemporalSource {
        characters: input.chars().collect(),
    };
    let mut tokens: Vec<JsonpathTemplateToken> = Vec::new();
    let mut position: usize = 0;
    let mut error: u32 = 0;
    let mut dated = false;
    let mut timed = false;
    let mut zoned = false;
    while position < source.characters.len() && error == 0 {
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
            tokens.push(JsonpathTemplateToken {
                kind: kind,
                width: width,
                digit: JSONPATH_TEMPLATE_DIGITS[key] > 0,
                fill: fill,
                ordinal: ordinal,
                translated: translated,
                character: ' ',
            });
            if (kind >= 1 && kind <= 6) || (kind >= 24 && kind <= 39) || (kind >= 44 && kind <= 48)
            {
                dated = true;
            };
            if (kind >= 7 && kind <= 18) || (kind >= 41 && kind <= 43) {
                timed = true;
            };
            if kind >= 19 && kind <= 22 {
                zoned = true;
            };
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
                        tokens.push(JsonpathTemplateToken {
                            kind: 0,
                            width: 0,
                            digit: numeric_wire_decimal_digit(stored) >= 0,
                            fill: false,
                            ordinal: false,
                            translated: false,
                            character: stored,
                        });
                    };
                }
            } else {
                if character != '-'
                    && character != '.'
                    && character != '/'
                    && character != ','
                    && character != '\''
                    && character != ':'
                    && character != ';'
                    && character != ' '
                {
                    error = JSONPATH_TEMPLATE_FORMAT;
                };
                tokens.push(JsonpathTemplateToken {
                    kind: 0,
                    width: 0,
                    digit: false,
                    fill: false,
                    ordinal: false,
                    translated: false,
                    character: character,
                });
                position += 1;
            };
        };
    }
    JsonpathTemplateProgram {
        tokens: tokens,
        error: error,
        dated: dated,
        timed: timed,
        zoned: zoned,
    }
}

#[derive(Clone, Copy)]
struct JsonpathTemplateField {
    value: i32,
}

#[derive(Clone, Copy)]
struct JsonpathTemplateRead {
    value: i32,
    end: usize,
    width: usize,
    error: u32,
}

fn jsonpath_template_read_integer(
    source: &JsonpathTemporalSource,
    begin: usize,
    width: usize,
    variable: bool,
) -> JsonpathTemplateRead {
    let mut start = begin;
    while start < source.characters.len() && numeric_space(source.characters[start]) {
        start += 1;
    }
    let mut limit = source.characters.len();
    let mut error: u32 = 0;
    if variable == false {
        if start + width > limit {
            error = JSONPATH_TEMPLATE_FORMAT;
        } else {
            limit = start + width;
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
    } else if variable == false && position != limit {
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

fn jsonpath_template_error(error: u32, hard: bool) -> JsonpathTemporalValue {
    jsonpath_temporal_state(0, 0i64, 0, error, false, hard)
}

fn jsonpath_template_parse(input: TextValue, template: TextValue) -> JsonpathTemporalValue {
    let prefixes: Vec<usize> = Vec::new();
    jsonpath_template_parse_prefixes(input, template, prefixes)
}

fn jsonpath_template_parse_prefixes(
    input: TextValue,
    template: TextValue,
    prefixes: Vec<usize>,
) -> JsonpathTemporalValue {
    if let TextValue::Error(error) = input {
        return jsonpath_template_error(error.state, false);
    };
    if let TextValue::Error(error) = template {
        return jsonpath_template_error(error.state, false);
    };
    if let TextValue::Null = input {
        return jsonpath_temporal_state(-1, 0i64, 0, 0, false, false);
    };
    if let TextValue::Null = template {
        return jsonpath_temporal_state(-1, 0i64, 0, 0, false, false);
    };
    if let TextValue::Value(text) = input {
        if let TextValue::Value(format) = template {
            let program = jsonpath_template_compile(format.as_str());
            if program.error > 0 {
                return jsonpath_template_error(program.error, true);
            };
            let source = JsonpathTemporalSource {
                characters: text.chars().collect(),
            };
            let mut fields: Vec<JsonpathTemplateField> = Vec::new();
            let mut index: usize = 0;
            while index < 35 {
                fields.push(JsonpathTemplateField { value: 0 });
                index += 1;
            }
            let mut position: usize = 0;
            let mut zone_sign: i32 = -1;
            let mut abbreviation_token: usize = 0;
            let mut numeric_zone = false;
            let mut precision: i32 = -1;
            let mut year_size: i32 = 0;
            let mut date_mode: i32 = 0;
            let mut twelve_hour = false;
            index = 0;
            while index < program.tokens.len() {
                let token = program.tokens[index];
                if position == source.characters.len() {
                    return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                };
                if token.kind == 0 {
                    if source.characters[position] != token.character {
                        return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                    };
                    position += 1;
                } else if token.kind != 23 {
                    let mode = jsonpath_template_date_mode(token.kind);
                    if mode != 0 {
                        if date_mode != 0 && date_mode != mode {
                            return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                        };
                        date_mode = mode;
                    };
                    if token.translated && token.kind >= 44 && token.kind <= 47 {
                        return jsonpath_temporal_state(0, 0i64, 0, 0, true, false);
                    };
                    let mut variable =
                        token.fill || token.ordinal || index + 1 == program.tokens.len();
                    if index + 1 < program.tokens.len() && program.tokens[index + 1].digit == false
                    {
                        variable = true;
                    };
                    if token.kind == 22 && jsonpath_temporal_letter(source.characters[position]) {
                        if prefixes.len() == 0 || prefixes[position] > source.characters.len() {
                            return jsonpath_temporal_state(0, 0i64, 0, 0, true, false);
                        };
                        if prefixes[position] == 0 {
                            return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                        };
                        abbreviation_token = position + 1;
                        numeric_zone = false;
                        zone_sign = -1;
                        fields[19] = JsonpathTemplateField { value: 0 };
                        fields[20] = JsonpathTemplateField { value: 0 };
                        position = prefixes[position];
                    } else {
                        if token.kind == 19
                            || token.kind == 20
                            || token.kind == 21
                            || token.kind == 22
                        {
                            numeric_zone = true;
                        };
                        if token.kind == 19 || token.kind == 21 || token.kind == 22 {
                            zone_sign = -1;
                            let character = source.characters[position];
                            if character == '+' || character == '-' || character == ' ' {
                                if character == '-' {
                                    zone_sign = 1;
                                };
                                position += 1;
                            };
                        };
                        let mut read = jsonpath_template_read_integer(
                            &source,
                            position,
                            token.width,
                            variable,
                        );
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
                            } else if jsonpath_template_ascii_matches(
                                &source,
                                position,
                                bc.as_str(),
                            ) {
                                read = JsonpathTemplateRead {
                                    value: 1,
                                    end: position + length,
                                    width: length,
                                    error: 0,
                                };
                            } else {
                                return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                            };
                        };
                        if token.kind >= 42 && token.kind <= 48 {
                            read = jsonpath_template_named_read(&source, position, token.kind);
                        };
                        if token.kind == 33 {
                            read = jsonpath_template_read_integer(&source, position, 1, true);
                            if read.error == JSONPATH_TEMPLATE_RANGE {
                                return jsonpath_temporal_state(0, 0i64, 0, 0, true, false);
                            };
                            if read.error == 0 {
                                if read.end == source.characters.len()
                                    || source.characters[read.end] != ','
                                {
                                    return jsonpath_template_error(
                                        JSONPATH_TEMPLATE_FORMAT,
                                        false,
                                    );
                                };
                                let part = jsonpath_template_year_group(&source, read.end + 1);
                                if part.error > 0 {
                                    return jsonpath_template_error(part.error, false);
                                };
                                let product = (read.value as i64) * 1000i64;
                                let combined = product + part.value as i64;
                                if jsonpath_template_calendar_fits(product) == false
                                    || jsonpath_template_calendar_fits(combined) == false
                                {
                                    return jsonpath_template_error(JSONPATH_TEMPLATE_RANGE, false);
                                };
                                read = JsonpathTemplateRead {
                                    value: combined as i32,
                                    end: part.end,
                                    width: part.end - position,
                                    error: 0,
                                };
                            };
                        };
                        if read.error > 0 {
                            return jsonpath_template_error(read.error, false);
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
                        if field != 29
                            && fields[slot].value != 0
                            && fields[slot].value != read.value
                        {
                            return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
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
                                jsonpath_template_read_integer(&source, position + 1, 2, variable);
                            if minutes.error > 0 {
                                return jsonpath_template_error(minutes.error, false);
                            };
                            if fields[20].value != 0 && fields[20].value != minutes.value {
                                return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
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
                index += 1;
            }
            while position < source.characters.len() && numeric_space(source.characters[position]) {
                position += 1;
            }
            if position != source.characters.len() {
                return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
            };
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
                    return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                };
                if fields[34].value != 0 && hours < 12 {
                    hours = hours + 12;
                };
                if fields[34].value == 0 && hours == 12 {
                    hours = 0;
                };
            };
            let calendar = jsonpath_template_calendar(
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
                program.dated,
            );
            if let Int8Value::Error(error) = calendar {
                return jsonpath_template_error(error.state, false);
            };
            let mut date = DateValue::Unknown;
            if let Int8Value::Value(value) = calendar {
                if program.dated {
                    date = make_date_value(value as i32);
                };
            };
            let fraction = (fields[10].value as i64) * 1000i64 + fields[11].value as i64;
            if hours < 0
                || hours > 23
                || minutes < 0
                || minutes > 59
                || seconds < 0
                || seconds > 59
                || fraction < 0i64
                || fraction > 999999i64
            {
                return jsonpath_template_error(JSONPATH_TEMPLATE_RANGE, false);
            };
            if fields[19].value < 0
                || fields[19].value > 15
                || fields[20].value < 0
                || fields[20].value > 59
            {
                return jsonpath_template_error(JSONPATH_TEMPLATE_ZONE, false);
            };
            let zone = zone_sign * (fields[19].value * 3600 + fields[20].value * 60);
            let clock = (hours as i64) * 3600000000i64
                + (minutes as i64) * 60000000i64
                + (seconds as i64) * 1000000i64
                + fraction;
            if program.dated == false && program.timed == false {
                return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
            };
            if program.dated && program.timed == false {
                if program.zoned {
                    return jsonpath_template_error(JSONPATH_TEMPLATE_FORMAT, false);
                };
                if let DateValue::Value(value) = date {
                    return jsonpath_temporal_state(1, value as i64, 0, 0, false, false);
                };
            };
            if program.dated == false {
                let scaled =
                    clock_scale_value(TimeValue::Value(clock), Int4Value::Value(precision));
                let mut result = clock;
                if precision >= 0 {
                    if let TimeValue::Value(value) = scaled {
                        result = value;
                    };
                };
                let mut kind: i32 = 2;
                if program.zoned {
                    kind = 3;
                };
                return jsonpath_template_zone_result(
                    kind,
                    result,
                    zone,
                    abbreviation_token,
                    numeric_zone,
                );
            };
            if let DateValue::Value(day) = date {
                let combined = jsonpath_temporal_timestamp(day, clock, zone);
                if let Int8Value::Value(value) = combined {
                    let mut result = value;
                    let mut kind: i32 = 4;
                    if program.zoned {
                        kind = 5;
                    };
                    if precision >= 0 {
                        let scaled = temporal_adjust_precision(result, precision);
                        if let Int8Value::Error(_) = scaled {
                            return jsonpath_template_error(JSONPATH_TEMPLATE_RANGE, false);
                        };
                        if let Int8Value::Value(value) = scaled {
                            result = value;
                        };
                    };
                    return jsonpath_template_zone_result(
                        kind,
                        result,
                        zone,
                        abbreviation_token,
                        numeric_zone,
                    );
                };
            };
            return jsonpath_template_error(JSONPATH_TEMPLATE_RANGE, false);
        };
    };
    jsonpath_temporal_state(0, 0i64, 0, 0, true, false)
}

fn jsonpath_template_zone_result(
    kind: i32,
    value: i64,
    zone: i32,
    abbreviation_token: usize,
    numeric_zone: bool,
) -> JsonpathTemporalValue {
    let result = jsonpath_temporal_state(kind, value, zone, 0, false, false);
    if abbreviation_token > 0 && numeric_zone == false {
        return JsonpathTemporalValue {
            kind: kind,
            value: value,
            zone: 0,
            error: 0,
            unknown: true,
            hard: false,
            abbreviation_token: abbreviation_token,
        };
    };
    result
}
