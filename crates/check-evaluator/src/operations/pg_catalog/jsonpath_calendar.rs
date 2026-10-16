fn jsonpath_template_date_mode(kind: i32) -> i32 {
    if (kind >= 1 && kind <= 6)
        || kind == 24
        || kind == 25
        || kind == 26
        || kind == 27
        || kind == 33
    {
        return 1;
    };
    if kind >= 34 && kind <= 40 {
        return 2;
    };
    0
}

fn jsonpath_template_calendar_fits(value: i64) -> bool {
    value >= -2147483648i64 && value <= 2147483647i64
}

fn jsonpath_template_week_start(year: i32, week: i32) -> i32 {
    let shifted = ((year as i64) + 4799i64) as i32;
    let y = shifted as i64;
    let century = y / 100i64;
    let fourth = (y * 365i64 - 32167i64 + y / 4i64 - century
        + century / 4i64
        + 7834i64 * 14i64 / 256i64
        + 4i64) as i32;
    let mut weekday = fourth % 7;
    if weekday < 0 {
        weekday = weekday + 7;
    };
    (((week as i64) - 1i64) * 7i64 + (fourth as i64) - (weekday as i64)) as i32
}

fn jsonpath_template_julian_calendar(value: i32) -> TemporalCalendarFields {
    let mut julian = ((value as i64) + 32044i64) % 4294967296i64;
    if julian < 0i64 {
        julian = julian + 4294967296i64;
    };
    let mut quad = julian / 146097i64;
    let extra = (julian - quad * 146097i64) * 4i64 + 3i64;
    julian = (julian + 60i64 + quad * 3i64 + extra / 146097i64) % 4294967296i64;
    quad = julian / 1461i64;
    julian = julian - quad * 1461i64;
    let mut year = julian * 4i64 / 1461i64;
    if year != 0i64 {
        julian = (julian + 305i64) % 365i64 + 123i64;
    } else {
        julian = (julian + 306i64) % 366i64 + 123i64;
    };
    year = year + quad * 4i64;
    quad = julian * 2141i64 / 65536i64;
    TemporalCalendarFields {
        year: (year - 4800i64) as i32,
        month: ((quad + 10i64) % 12i64 + 1i64) as i32,
        day: (julian - 7834i64 * quad / 256i64) as i32,
    }
}

fn jsonpath_template_month_days(year: i32, month: i32) -> i32 {
    if month == 2 {
        if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
            return 29;
        };
        return 28;
    };
    if month == 4 || month == 6 || month == 9 || month == 11 {
        return 30;
    };
    31
}

fn jsonpath_template_calendar(
    input_year: i32,
    year_size: i32,
    century: i32,
    bc: i32,
    julian: i32,
    week: i32,
    weekday: i32,
    week_of_month: i32,
    input_month: i32,
    input_day: i32,
    day_of_year: i32,
    mode: i32,
    bounded: bool,
) -> Int8Value {
    let mut year: i32 = 0;
    let mut month: i32 = 1;
    let mut day: i32 = 1;
    let mut year_set = input_year != 0 || century != 0;
    let mut month_set = false;
    let mut day_set = false;
    let mut cent = century;
    if bc != 0 {
        cent = (0i64 - (cent as i64)) as i32;
    };
    if input_year != 0 {
        if century != 0 && year_size <= 2 {
            let low = input_year % 100;
            if low != 0 {
                let mut step = (cent as i64) - 1i64;
                if cent < 0 {
                    step = (cent as i64) + 1i64;
                };
                let product = step * 100i64;
                if jsonpath_template_calendar_fits(product) == false {
                    return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
                };
                let mut combined = product + (low as i64);
                if cent < 0 {
                    combined = product - (low as i64);
                };
                if jsonpath_template_calendar_fits(combined) == false {
                    return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
                };
                if cent < 0 {
                    combined = combined + 1i64;
                };
                if jsonpath_template_calendar_fits(combined) == false {
                    return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
                };
                year = combined as i32;
            } else {
                let mut combined = (cent as i64) * 100i64;
                if cent < 0 {
                    combined = combined + 1i64;
                };
                year = combined as i32;
            };
        } else {
            year = input_year;
            if bc != 0 {
                year = (0i64 - (year as i64)) as i32;
            };
            if year < 0 {
                year = year + 1;
            };
        };
    } else if century != 0 {
        let mut product = ((cent as i64) - 1i64) * 100i64;
        if cent < 0 {
            product = (cent as i64) * 100i64;
        };
        if jsonpath_template_calendar_fits(product) == false
            || jsonpath_template_calendar_fits(product + 1i64) == false
        {
            return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
        };
        year = (product + 1i64) as i32;
    };
    if julian != 0 {
        let calendar = jsonpath_template_julian_calendar(julian);
        year = calendar.year;
        month = calendar.month;
        day = calendar.day;
        year_set = true;
        month_set = true;
        day_set = true;
    };
    let mut ordinal = day_of_year;
    if week != 0 {
        if mode == 2 {
            let base = jsonpath_template_week_start(year, week);
            let mut value = base as i64;
            if weekday > 1 {
                value = value + (weekday as i64) - 2i64;
            } else if weekday != 0 {
                value = value + 6i64;
            };
            let calendar = jsonpath_template_julian_calendar(value as i32);
            year = calendar.year;
            month = calendar.month;
            day = calendar.day;
            year_set = true;
            month_set = true;
            day_set = true;
        } else {
            let step = (week as i64) - 1i64;
            let product = step * 7i64;
            let value = product + 1i64;
            if jsonpath_template_calendar_fits(step) == false
                || jsonpath_template_calendar_fits(product) == false
                || jsonpath_template_calendar_fits(value) == false
            {
                return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
            };
            ordinal = value as i32;
        };
    };
    let mut explicit_day = input_day;
    if week_of_month != 0 {
        let step = (week_of_month as i64) - 1i64;
        let product = step * 7i64;
        let value = product + 1i64;
        if jsonpath_template_calendar_fits(step) == false
            || jsonpath_template_calendar_fits(product) == false
            || jsonpath_template_calendar_fits(value) == false
        {
            return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
        };
        explicit_day = value as i32;
    };
    if explicit_day != 0 {
        day = explicit_day;
        day_set = true;
    };
    if input_month != 0 {
        month = input_month;
        month_set = true;
    };
    if ordinal != 0 && (month <= 1 || day <= 1) {
        if year == 0 && bc == 0 {
            return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_FORMAT));
        };
        if mode == 2 {
            let base = jsonpath_template_week_start(year, 1);
            let value = (base as i64) - 1i64 + (ordinal as i64);
            let calendar = jsonpath_template_julian_calendar(value as i32);
            year = calendar.year;
            month = calendar.month;
            day = calendar.day;
            year_set = true;
            month_set = true;
            day_set = true;
        } else {
            let mut selected: i32 = 1;
            let mut previous: i32 = 0;
            let mut total = jsonpath_template_month_days(year, 1);
            while selected <= 12 && ordinal > total {
                previous = total;
                selected = selected + 1;
                if selected <= 12 {
                    total = total + jsonpath_template_month_days(year, selected);
                };
            }
            if month <= 1 {
                month = selected;
            };
            if day <= 1 {
                day = ordinal - previous;
            };
            month_set = true;
            day_set = true;
        };
    };
    if (month_set && (month < 1 || month > 12)) || (day_set && (day < 1 || day > 31)) {
        return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    if year_set && month_set && day_set && day > jsonpath_template_month_days(year, month) {
        return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    if bounded && (year < -4713 || year > 5874897) {
        return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    let value = temporal_julian_from_calendar(year, month, day) - 2451545i64;
    if bounded && (value < -2451545i64 || value >= 2145031949i64) {
        return Int8Value::Error(make_sql_error(JSONPATH_TEMPLATE_RANGE));
    };
    Int8Value::Value(value)
}

fn jsonpath_template_ascii_matches(
    source: &JsonpathTemporalSource,
    position: usize,
    name: &str,
) -> bool {
    let characters: Vec<char> = name.chars().collect();
    if position + characters.len() > source.characters.len() {
        return false;
    };
    let mut index: usize = 0;
    while index < characters.len() {
        if source.characters[position + index].to_ascii_lowercase()
            != characters[index].to_ascii_lowercase()
        {
            return false;
        };
        index += 1;
    }
    true
}

fn jsonpath_template_year_group(
    source: &JsonpathTemporalSource,
    begin: usize,
) -> JsonpathTemplateRead {
    let mut position = begin;
    while position < source.characters.len() && numeric_space(source.characters[position]) {
        position += 1;
    }
    let mut limit = position + 3;
    if limit > source.characters.len() {
        limit = source.characters.len();
    };
    let mut negative = false;
    if position < limit
        && (source.characters[position] == '+' || source.characters[position] == '-')
    {
        negative = source.characters[position] == '-';
        position += 1;
    };
    let start = position;
    let mut value: i32 = 0;
    while position < limit && numeric_wire_decimal_digit(source.characters[position]) >= 0 {
        value = value * 10 + numeric_wire_decimal_digit(source.characters[position]);
        position += 1;
    }
    let mut error: u32 = 0;
    if start == position {
        error = JSONPATH_TEMPLATE_FORMAT;
    };
    if negative {
        value = 0 - value;
    };
    JsonpathTemplateRead {
        value: value,
        end: position,
        width: position - begin,
        error: error,
    }
}
