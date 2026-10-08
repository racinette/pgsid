const TEMPORAL_EXTRACT_KEYS: &[&str] = &[
    "+infinity",
    "-infinity",
    "allballs",
    "dow",
    "doy",
    "epoch",
    "infinity",
    "isodow",
    "isoyear",
    "j",
    "jd",
    "julian",
    "mm",
    "now",
    "today",
    "tomorrow",
    "yesterday",
];
const TEMPORAL_EXTRACT_CODES: &[i32] = &[
    -1, -1, -1, 16, 18, 19, -1, 17, 15, 14, 14, 14, 4, -1, -1, -1, -1,
];

fn temporal_extract_code(value: &str) -> i32 {
    let unit = temporal_unit_code(value);
    if unit != 0 {
        return unit;
    };
    let characters: Vec<char> = value.chars().collect();
    let mut key = String::new();
    let mut index: usize = 0;
    while index < characters.len() && index < 10 {
        key.push(characters[index].to_ascii_lowercase());
        index += 1;
    }
    let mut entry: usize = 0;
    while entry < TEMPORAL_EXTRACT_KEYS.len() {
        if key.as_str() == TEMPORAL_EXTRACT_KEYS[entry] {
            return TEMPORAL_EXTRACT_CODES[entry];
        };
        entry += 1;
    }
    0
}

fn temporal_julian_from_calendar(year: i32, month: i32, day: i32) -> i64 {
    let mut y = year as i64;
    let mut m = month as i64;
    if month > 2 {
        m = m + 1i64;
        y = y + 4800i64;
    } else {
        m = m + 13i64;
        y = y + 4799i64;
    };
    let century = y / 100i64;
    let d = day as i64;
    y * 365i64 - 32167i64 + y / 4i64 - century + century / 4i64 + 7834i64 * m / 256i64 + d
}

fn temporal_extract_date(value: i32, code: i32) -> NumericValue {
    if code == 0 || code == -2 {
        return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    };
    if code == -1 || code < 6 {
        return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
    };
    if value == -2147483647 - 1 || value == 2147483647 {
        if code == 6
            || code == 7
            || code == 8
            || code == 9
            || code == 16
            || code == 17
            || code == 18
        {
            return NumericValue::Null;
        };
        if value < 0 {
            return NumericValue::Value("-Infinity".to_owned());
        };
        return NumericValue::Value("Infinity".to_owned());
    };
    let date = value as i64;
    if code == 19 {
        return NumericValue::Value(text_signed_number((date + 10957i64) * 86400i64));
    };
    let julian = date + 2451545i64;
    if code == 14 {
        return NumericValue::Value(text_signed_number(julian));
    };
    let calendar = temporal_calendar_from_julian(julian);
    let mut result: i64 = 0i64;
    if code == 6 {
        result = calendar.day as i64;
    };
    if code == 8 {
        result = calendar.month as i64;
    };
    if code == 9 {
        result = ((calendar.month - 1) / 3 + 1) as i64;
    };
    if code == 10 {
        result = calendar.year as i64;
        if result <= 0i64 {
            result = result - 1i64;
        };
    };
    if code == 11 {
        if calendar.year >= 0 {
            result = (calendar.year / 10) as i64;
        } else {
            result = (0 - ((8 - (calendar.year - 1)) / 10)) as i64;
        };
    };
    if code == 12 {
        if calendar.year > 0 {
            result = ((calendar.year + 99) / 100) as i64;
        } else {
            result = (0 - ((99 - (calendar.year - 1)) / 100)) as i64;
        };
    };
    if code == 13 {
        if calendar.year > 0 {
            result = ((calendar.year + 999) / 1000) as i64;
        } else {
            result = (0 - ((999 - (calendar.year - 1)) / 1000)) as i64;
        };
    };
    if code == 7 || code == 15 {
        let thursday = julian + 3i64 - julian % 7i64;
        let iso = temporal_calendar_from_julian(thursday);
        if code == 7 {
            result = (thursday - temporal_julian_from_calendar(iso.year, 1, 1)) / 7i64 + 1i64;
        } else {
            result = iso.year as i64;
            if result <= 0i64 {
                result = result - 1i64;
            };
        };
    };
    if code == 16 || code == 17 {
        result = (julian + 1i64) % 7i64;
        if code == 17 && result == 0i64 {
            result = 7i64;
        };
    };
    if code == 18 {
        result = julian - temporal_julian_from_calendar(calendar.year, 1, 1) + 1i64;
    };
    NumericValue::Value(text_signed_number(result))
}

pub fn sql__pg_catalog__extract__qjml(units: TextValue, input: DateValue) -> NumericValue {
    if let TextValue::Error(error) = units {
        return NumericValue::Error(error);
    };
    if let DateValue::Error(error) = input {
        return NumericValue::Error(error);
    };
    if units == TextValue::Unknown || input == DateValue::Unknown {
        return NumericValue::Unknown;
    };
    if units == TextValue::Null || input == DateValue::Null {
        return NumericValue::Null;
    };
    if let TextValue::Value(unit) = units {
        if let DateValue::Value(value) = input {
            return temporal_extract_date(value, temporal_extract_code(unit.as_str()));
        };
    };
    NumericValue::Unknown
}
