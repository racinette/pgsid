const INTERVAL_INPUT_SYNTAX: u32 = 3452551;
const INTERVAL_INPUT_RANGE: u32 = 3452585;
const INTERVAL_INPUT_FINAL_RANGE: u32 = 3452552;

#[derive(Clone, Copy)]
struct IntervalInputToken {
    start: usize,
    end: usize,
}
struct IntervalInputText {
    chars: Vec<char>,
}
fn interval_token_text(input: &IntervalInputText, token: IntervalInputToken) -> String {
    let mut index = token.start;
    let mut text = String::new();
    while index < token.end {
        text.push(input.chars[index].to_ascii_lowercase());
        index += 1;
    };
    text
}

#[derive(Clone, Copy)]
struct IntervalInputAcc {
    years: i32,
    months: i32,
    days: i32,
    time: i64,
    mask: i32,
    error: u32,
}
fn interval_input_fail(input: IntervalInputAcc, error: u32) -> IntervalInputAcc {
    return IntervalInputAcc {
        years: input.years,
        months: input.months,
        days: input.days,
        time: input.time,
        mask: input.mask,
        error: error,
    };
}
fn interval_input_unit(text: &str) -> i32 {
    let letters: Vec<char> = text.chars().collect();
    let mut prefix = String::new();
    let mut index: usize = 0;
    while index < letters.len() && index < 10 {
        prefix.push(letters[index]);
        index += 1;
    };
    if prefix == "microsecon"
        || text == "usec"
        || text == "usecond"
        || text == "useconds"
        || text == "usecs"
    {
        return 0;
    };
    if prefix == "millisecon" || text == "mseconds" {
        return 1;
    };
    if text == "yr" || text == "yrs" {
        return 8;
    };
    if text == "microsecond" || text == "microseconds" || text == "us" {
        return 0;
    };
    if text == "millisecond"
        || text == "milliseconds"
        || text == "ms"
        || text == "msec"
        || text == "msecs"
    {
        return 1;
    };
    if text == "second" || text == "seconds" || text == "sec" || text == "secs" || text == "s" {
        return 2;
    };
    if text == "minute" || text == "minutes" || text == "min" || text == "mins" || text == "m" {
        return 3;
    };
    if text == "hour" || text == "hours" || text == "hr" || text == "hrs" || text == "h" {
        return 4;
    };
    if text == "day" || text == "days" || text == "d" {
        return 5;
    };
    if text == "week" || text == "weeks" || text == "w" {
        return 6;
    };
    if text == "month" || text == "months" || text == "mon" || text == "mons" {
        return 7;
    };
    if text == "year" || text == "years" || text == "y" {
        return 8;
    };
    if text == "decade" || text == "decades" || text == "dec" || text == "decs" {
        return 9;
    };
    if text == "century" || text == "centuries" || text == "cent" || text == "c" {
        return 10;
    };
    if text == "millennium" || text == "millennia" || text == "mil" || text == "mils" {
        return 11;
    };
    -1
}
fn interval_input_whole(text: &str) -> Int8Value {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    let mut negative = false;
    if index < chars.len() && (chars[index] == '-' || chars[index] == '+') {
        negative = chars[index] == '-';
        index += 1;
    };
    let start = index;
    let mut whole = 0i64;
    while index < chars.len() && date_text_digit(chars[index]) >= 0 {
        let digit = date_text_digit(chars[index]);
        if whole < -922337203685477580i64 || (whole == -922337203685477580i64 && digit > 8) {
            return Int8Value::Error(make_sql_error(INTERVAL_INPUT_RANGE));
        };
        whole = whole * 10i64 - (digit as i64);
        index += 1;
    };
    let integer_digits = index - start;
    if integer_digits == 0 && start > 0 {
        return Int8Value::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
    };
    let mut fraction_digits: usize = 0;
    if index < chars.len() && chars[index] == '.' {
        index += 1;
        let fraction_start = index;
        while index < chars.len() && date_text_digit(chars[index]) >= 0 {
            index += 1;
        };
        fraction_digits = index - fraction_start;
    };
    if index != chars.len() || integer_digits + fraction_digits == 0 {
        return Int8Value::Unknown;
    };
    if negative {
        return Int8Value::Value(whole);
    };
    if whole == -9223372036854775808i64 {
        return Int8Value::Error(make_sql_error(INTERVAL_INPUT_RANGE));
    };
    Int8Value::Value(0i64 - whole)
}
fn interval_input_fraction(text: &str) -> f64 {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    while index < chars.len() && chars[index] != '.' {
        index += 1;
    };
    let mut fraction = "0".to_owned();
    while index < chars.len() {
        fraction.push(chars[index]);
        index += 1;
    };
    let parsed = fraction.as_str().parse::<f64>().unwrap_or(0.0f64);
    if chars.len() > 0 && chars[0] == '-' {
        return 0.0f64 - parsed;
    };
    parsed
}
fn interval_input_fraction_micros(fraction: f64, scale: f64) -> i64 {
    let scaled = fraction * scale;
    let high = (scaled / 1000000.0f64) as i32;
    let rest = scaled - (high as f64) * 1000000.0f64;
    let mut low = rest as i32;
    let extra = rest - (low as f64);
    if extra > 0.5f64 {
        low = low + 1;
    };
    if extra < -0.5f64 {
        low = low - 1;
    };
    (high as i64) * 1000000i64 + (low as i64)
}
fn interval_input_year_fraction(fraction: f64, scale: f64) -> i32 {
    let scaled = fraction * scale * 12.0f64;
    let mut whole = scaled as i32;
    let remainder = scaled - (whole as f64);
    if remainder > 0.5f64 || (remainder == 0.5f64 && whole % 2 != 0) {
        whole = whole + 1;
    };
    if remainder < -0.5f64 || (remainder == -0.5f64 && whole % 2 != 0) {
        whole = whole - 1;
    };
    whole
}
fn interval_input_add(
    input: IntervalInputAcc,
    whole: i64,
    fraction: f64,
    unit: i32,
) -> IntervalInputAcc {
    if input.error != 0 {
        return input;
    };
    let mut bit: i32 = 1;
    let mut index: i32 = 0;
    while index < unit {
        bit = bit * 2;
        index = index + 1;
    };
    let mut mask = bit;
    if unit == 2 && fraction != 0.0f64 {
        mask = 7;
    };
    let mut check = mask;
    let mut stored = input.mask;
    while check > 0 {
        if check % 2 != 0 && stored % 2 != 0 {
            return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
        };
        check = check / 2;
        stored = stored / 2;
    };
    let mut years = input.years as i64;
    let mut months = input.months as i64;
    let mut days = input.days as i64;
    let mut micros = input.time;
    let mut fractional_micros = 0i64;
    if unit <= 4 {
        let mut scale = 1i64;
        let mut float_scale = 1.0f64;
        if unit == 1 {
            scale = 1000i64;
            float_scale = 1000.0f64;
        };
        if unit == 2 {
            scale = 1000000i64;
            float_scale = 1000000.0f64;
        };
        if unit == 3 {
            scale = 60000000i64;
            float_scale = 60000000.0f64;
        };
        if unit == 4 {
            scale = 3600000000i64;
            float_scale = 3600000000.0f64;
        };
        if whole > 9223372036854775807i64 / scale || whole < (-9223372036854775808i64) / scale {
            return interval_input_fail(input, INTERVAL_INPUT_RANGE);
        };
        let product = whole * scale;
        if (product > 0i64 && micros > 9223372036854775807i64 - product)
            || (product < 0i64 && micros < (-9223372036854775808i64) - product)
        {
            return interval_input_fail(input, INTERVAL_INPUT_RANGE);
        };
        micros = micros + product;
        fractional_micros = interval_input_fraction_micros(fraction, float_scale);
    } else if unit == 5 || unit == 6 || unit == 7 {
        let mut scale = 1i64;
        if unit == 6 {
            scale = 7i64;
        };
        if whole > 2147483647i64 / scale || whole < (-2147483648i64) / scale {
            return interval_input_fail(input, INTERVAL_INPUT_RANGE);
        };
        if unit == 7 {
            months = months + whole;
            let scaled = fraction * 30.0f64;
            let extra_days = scaled as i32;
            days = days + (extra_days as i64);
            fractional_micros =
                interval_input_fraction_micros(scaled - (extra_days as f64), 86400000000.0f64);
        } else {
            days = days + whole * scale;
            let mut scaled = fraction;
            if unit == 6 {
                scaled = fraction * 7.0f64;
            };
            let extra_days = scaled as i32;
            days = days + (extra_days as i64);
            fractional_micros =
                interval_input_fraction_micros(scaled - (extra_days as f64), 86400000000.0f64);
        };
    } else {
        let mut scale = 1i64;
        let mut float_scale = 1.0f64;
        if unit == 9 {
            scale = 10i64;
            float_scale = 10.0f64;
        };
        if unit == 10 {
            scale = 100i64;
            float_scale = 100.0f64;
        };
        if unit == 11 {
            scale = 1000i64;
            float_scale = 1000.0f64;
        };
        if whole > 2147483647i64 / scale || whole < (-2147483648i64) / scale {
            return interval_input_fail(input, INTERVAL_INPUT_RANGE);
        };
        years = years + whole * scale;
        months = months + (interval_input_year_fraction(fraction, float_scale) as i64);
    };
    if (fractional_micros > 0i64 && micros > 9223372036854775807i64 - fractional_micros)
        || (fractional_micros < 0i64 && micros < (-9223372036854775808i64) - fractional_micros)
    {
        return interval_input_fail(input, INTERVAL_INPUT_RANGE);
    };
    micros = micros + fractional_micros;
    if years < (-2147483648i64)
        || years > 2147483647i64
        || months < (-2147483648i64)
        || months > 2147483647i64
        || days < (-2147483648i64)
        || days > 2147483647i64
    {
        return interval_input_fail(input, INTERVAL_INPUT_RANGE);
    };
    return IntervalInputAcc {
        years: years as i32,
        months: months as i32,
        days: days as i32,
        time: micros,
        mask: input.mask + mask,
        error: 0,
    };
}
fn interval_units_from_text(input: TextValue, field_mask: i32) -> IntervalValue {
    if let TextValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if input == TextValue::Null {
        return IntervalValue::Null;
    };
    if let TextValue::Value(text) = input {
        let normalized = interval_input_normalized(text.as_str());
        let buffer = IntervalInputText {
            chars: normalized.chars().collect(),
        };
        if buffer.chars.len() > 255 {
            return IntervalValue::Unknown;
        };
        let mut tokens: Vec<IntervalInputToken> = Vec::new();
        let mut token_start: usize = 0;
        let mut index: usize = 0;
        while index < buffer.chars.len() {
            if date_text_space(buffer.chars[index]) {
                if token_start < index {
                    tokens.push(IntervalInputToken {
                        start: token_start,
                        end: index,
                    });
                };
                token_start = index + 1;
            };
            index += 1;
        };
        if token_start < index {
            tokens.push(IntervalInputToken {
                start: token_start,
                end: index,
            });
        };
        if tokens.len() == 0 {
            return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
        };
        let first_token = interval_token_text(&buffer, tokens[0]);
        if tokens.len() == 1 {
            if first_token == "infinity" || first_token == "+infinity" {
                return make_interval_value(2147483647, 2147483647, 9223372036854775807i64);
            };
            if first_token == "-infinity" {
                return make_interval_value(
                    -2147483647 - 1,
                    -2147483647 - 1,
                    -9223372036854775808i64,
                );
            };
        };
        let mut acc = IntervalInputAcc {
            years: 0,
            months: 0,
            days: 0,
            time: 0i64,
            mask: 0,
            error: 0,
        };
        let mut end = tokens.len();
        let mut ago = false;
        let last_token = interval_token_text(&buffer, tokens[end - 1]);
        if last_token == "ago" {
            ago = true;
            end = end - 1;
        };
        let mut start: usize = 0;
        if first_token == "@" {
            start = 1;
        };
        let mut unit: i32 = -1;
        let mut pending = false;
        let mut implicit_unit: i32 = 2;
        if field_mask == 4 {
            implicit_unit = 8;
        };
        if field_mask == 2 || field_mask == 6 {
            implicit_unit = 7;
        };
        if field_mask == 8 {
            implicit_unit = 5;
        };
        if field_mask == 1024 || field_mask == 1032 {
            implicit_unit = 4;
        };
        if field_mask == 2048 || field_mask == 3072 || field_mask == 3080 {
            implicit_unit = 3;
        };
        let mut numbers: i32 = 0;
        let mut additional_sign = false;
        while end > start {
            end = end - 1;
            let token = interval_token_text(&buffer, tokens[end]);
            let token_chars: Vec<char> = token.chars().collect();
            let mut colon = false;
            let mut position: usize = 0;
            while position < token_chars.len() {
                if token_chars[position] == ':' {
                    colon = true;
                };
                position += 1;
            };
            let found = interval_input_unit(token.as_str());
            if colon {
                if pending {
                    return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
                };
                acc = interval_input_clock(acc, token.as_str(), field_mask);
                if acc.error != 0 {
                    return IntervalValue::Error(make_sql_error(acc.error));
                };
                numbers = numbers + 1;
                if end > start
                    && token_chars.len() > 0
                    && (token_chars[0] == '-' || token_chars[0] == '+')
                {
                    additional_sign = true;
                };
                implicit_unit = 5;
            } else if found >= 0 {
                if pending {
                    return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
                };
                unit = found;
                pending = true;
            } else {
                if token_chars.len() > 0 && interval_input_alpha(token_chars[0]) {
                    return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
                };
                let mut whole = interval_input_whole(token.as_str());
                let mut year_month = false;
                if whole == Int8Value::Unknown {
                    whole = interval_input_year_month(token.as_str());
                    year_month = true;
                };
                if year_month {
                    unit = 7;
                };
                if let Int8Value::Error(error) = whole {
                    return IntervalValue::Error(error);
                };
                if whole == Int8Value::Unknown {
                    return IntervalValue::Unknown;
                };
                if let Int8Value::Value(number) = whole {
                    let fraction = interval_input_fraction(token.as_str());
                    if unit < 0 {
                        unit = implicit_unit;
                    };
                    acc = interval_input_add(acc, number, fraction, unit);
                    if acc.error != 0 {
                        return IntervalValue::Error(make_sql_error(acc.error));
                    };
                    implicit_unit = unit;
                    if unit == 4 {
                        implicit_unit = 5;
                    };
                    unit = -1;
                    pending = false;
                    numbers = numbers + 1;
                    let number_chars: Vec<char> = token.chars().collect();
                    if end > start
                        && number_chars.len() > 0
                        && (number_chars[0] == '-' || number_chars[0] == '+')
                    {
                        additional_sign = true;
                    };
                };
            };
        };
        if pending || numbers == 0 {
            return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
        };
        let first_number = interval_token_text(&buffer, tokens[start]);
        let first: Vec<char> = first_number.chars().collect();
        if numbers > 1 && first.len() > 0 && first[0] == '-' && additional_sign == false {
            return IntervalValue::Unknown;
        };
        let months = (acc.years as i64) * 12i64 + (acc.months as i64);
        if months < (-2147483648i64) || months > 2147483647i64 {
            return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_FINAL_RANGE));
        };
        if ago {
            if months == (-2147483648i64)
                || acc.days == (-2147483647 - 1)
                || acc.time == (-9223372036854775808i64)
            {
                return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_RANGE));
            };
            return make_interval_value((0i64 - months) as i32, 0 - acc.days, 0i64 - acc.time);
        };
        return make_interval_value(months as i32, acc.days, acc.time);
    };
    IntervalValue::Unknown
}

fn interval_clock_error_state(error: SqlError, fallback: u32) -> u32 {
    if fallback == INTERVAL_INPUT_SYNTAX {
        return fallback;
    };
    error.state
}
fn interval_input_clock(input: IntervalInputAcc, text: &str, field_mask: i32) -> IntervalInputAcc {
    let buffer = IntervalInputText {
        chars: text.chars().collect(),
    };
    let mut start: usize = 0;
    let mut negative = false;
    let mut range_error = INTERVAL_INPUT_RANGE;
    if buffer.chars.len() > 0 && (buffer.chars[0] == '-' || buffer.chars[0] == '+') {
        negative = buffer.chars[0] == '-';
        start = 1;
        range_error = INTERVAL_INPUT_SYNTAX;
    };
    let mut fields: Vec<IntervalInputToken> = Vec::new();
    let mut index = start;
    while index < buffer.chars.len() {
        if buffer.chars[index] == ':' {
            fields.push(IntervalInputToken {
                start: start,
                end: index,
            });
            start = index + 1;
        };
        index += 1;
    };
    fields.push(IntervalInputToken {
        start: start,
        end: index,
    });
    if fields.len() < 2 || fields.len() > 3 {
        return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
    };
    let first_text = interval_token_text(&buffer, fields[0]);
    let second_text = interval_token_text(&buffer, fields[1]);
    let first_number = interval_input_whole(first_text.as_str());
    let second_number = interval_input_whole(second_text.as_str());
    if let Int8Value::Error(error) = first_number {
        return interval_input_fail(input, interval_clock_error_state(error, range_error));
    };
    if let Int8Value::Error(error) = second_number {
        return interval_input_fail(input, interval_clock_error_state(error, range_error));
    };
    if first_number == Int8Value::Unknown || second_number == Int8Value::Unknown {
        return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
    };
    let mut hours = 0i64;
    let mut minutes = 0i64;
    let mut seconds = 0i64;
    if let Int8Value::Value(number) = first_number {
        hours = number;
    };
    if let Int8Value::Value(number) = second_number {
        minutes = number;
    };
    let first_chars: Vec<char> = first_text.chars().collect();
    index = 0;
    while index < first_chars.len() {
        if date_text_digit(first_chars[index]) < 0 {
            return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
        };
        index += 1;
    };
    let second_chars: Vec<char> = second_text.chars().collect();
    let mut fraction_text = "0".to_owned();
    let mut second_point = false;
    index = 0;
    while index < second_chars.len() {
        if second_chars[index] == '.' {
            second_point = true;
        };
        if fields.len() == 3 && date_text_digit(second_chars[index]) < 0 {
            return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
        };
        index += 1;
    };
    if fields.len() == 3 {
        fraction_text = interval_token_text(&buffer, fields[2]);
        let last_number = interval_input_whole(fraction_text.as_str());
        if let Int8Value::Error(error) = last_number {
            return interval_input_fail(input, interval_clock_error_state(error, range_error));
        };
        if last_number == Int8Value::Unknown {
            return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
        };
        if let Int8Value::Value(number) = last_number {
            seconds = number;
        };
    } else {
        if second_point || field_mask == 6144 {
            seconds = minutes;
            minutes = hours;
            hours = 0i64;
            fraction_text = second_text;
        };
    };
    if hours < 0i64
        || minutes < 0i64
        || minutes > 59i64
        || seconds < 0i64
        || seconds > 60i64
        || hours > 9223372036854775807i64 / 3600000000i64
    {
        return interval_input_fail(input, range_error);
    };
    let fraction = interval_input_fraction(fraction_text.as_str()) * 1000000.0f64;
    let mut rounded = fraction as i32;
    let extra = fraction - (rounded as f64);
    if extra > 0.5f64 || (extra == 0.5f64 && rounded % 2 != 0) {
        rounded = rounded + 1;
    };
    let mut micros = rounded as i64;
    let hours_microseconds = hours * 3600000000i64;
    if micros > 9223372036854775807i64 - hours_microseconds {
        return interval_input_fail(input, range_error);
    };
    micros = micros + hours_microseconds;
    let minutes_microseconds = minutes * 60000000i64;
    if micros > 9223372036854775807i64 - minutes_microseconds {
        return interval_input_fail(input, range_error);
    };
    micros = micros + minutes_microseconds;
    let seconds_microseconds = seconds * 1000000i64;
    if micros > 9223372036854775807i64 - seconds_microseconds {
        return interval_input_fail(input, range_error);
    };
    micros = micros + seconds_microseconds;
    if negative {
        micros = 0i64 - micros;
    };
    let mut bit: i32 = 1;
    while bit <= 16 {
        if (input.mask / bit) % 2 != 0 {
            return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
        };
        bit = bit * 2;
    };
    return IntervalInputAcc {
        years: input.years,
        months: input.months,
        days: input.days,
        time: micros,
        mask: input.mask + 31,
        error: 0,
    };
}

fn interval_input_iso_number(input: IntervalInputAcc, text: &str, unit: i32) -> IntervalInputAcc {
    let value = text.parse::<f64>().unwrap_or(1.0e16f64);
    let infinity = 1.0f64 / 0.0f64;
    if value.abs() == infinity {
        return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
    };
    if value < -1.0e15f64 || value > 1.0e15f64 || value != value {
        return interval_input_fail(input, INTERVAL_INPUT_RANGE);
    };
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    let mut nonzero = false;
    while index < chars.len() && chars[index] != 'e' && chars[index] != 'E' {
        if date_text_digit(chars[index]) > 0 {
            nonzero = true;
        };
        index += 1;
    };
    if (value == 0.0f64 && nonzero) || (value != 0.0f64 && value.abs() < 2.2250738585072014e-308f64)
    {
        return interval_input_fail(input, INTERVAL_INPUT_SYNTAX);
    };
    let high = (value / 1000000000.0f64) as i32;
    let rest = value - (high as f64) * 1000000000.0f64;
    let low = rest as i32;
    let whole = (high as i64) * 1000000000i64 + (low as i64);
    let fraction = rest - (low as f64);
    let clean = IntervalInputAcc {
        years: input.years,
        months: input.months,
        days: input.days,
        time: input.time,
        mask: 0,
        error: input.error,
    };
    interval_input_add(clean, whole, fraction, unit)
}
fn interval_input_iso(text: &str) -> IntervalValue {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() < 2 || chars[0] != 'P' {
        return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
    };
    let mut acc = IntervalInputAcc {
        years: 0,
        months: 0,
        days: 0,
        time: 0i64,
        mask: 0,
        error: 0,
    };
    let mut datepart = true;
    let mut index: usize = 1;
    while index < chars.len() {
        if chars[index] == 'T' {
            datepart = false;
            index += 1;
        } else {
            let mut number = String::new();
            if chars[index] == '-' {
                number.push('-');
                index += 1;
            };
            let mut digits: usize = 0;
            while index < chars.len() && date_text_digit(chars[index]) >= 0 {
                number.push(chars[index]);
                index += 1;
                digits += 1;
            };
            if index < chars.len() && chars[index] == '.' {
                number.push('.');
                index += 1;
                while index < chars.len() && date_text_digit(chars[index]) >= 0 {
                    number.push(chars[index]);
                    index += 1;
                    digits += 1;
                };
            };
            if digits == 0 {
                return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
            };
            if index < chars.len() && (chars[index] == 'e' || chars[index] == 'E') {
                number.push(chars[index]);
                index += 1;
                if index < chars.len() && (chars[index] == '-' || chars[index] == '+') {
                    number.push(chars[index]);
                    index += 1;
                };
                let start = index;
                while index < chars.len() && date_text_digit(chars[index]) >= 0 {
                    number.push(chars[index]);
                    index += 1;
                };
                if index == start {
                    return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
                };
            };
            if index == chars.len() {
                return IntervalValue::Unknown;
            };
            let designator = chars[index];
            index += 1;
            let mut unit: i32 = -1;
            if datepart {
                if designator == 'Y' {
                    unit = 8;
                };
                if designator == 'M' {
                    unit = 7;
                };
                if designator == 'W' {
                    unit = 6;
                };
                if designator == 'D' {
                    unit = 5;
                };
            } else {
                if designator == 'H' {
                    unit = 4;
                };
                if designator == 'M' {
                    unit = 3;
                };
                if designator == 'S' {
                    unit = 2;
                };
            };
            if unit < 0 {
                if designator == '-'
                    || designator == ':'
                    || designator == 'T'
                    || designator == 'x'
                    || designator == 'X'
                {
                    return IntervalValue::Unknown;
                };
                return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
            };
            acc = interval_input_iso_number(acc, number.as_str(), unit);
            if acc.error != 0 {
                return IntervalValue::Error(make_sql_error(acc.error));
            };
        };
    };
    let months = (acc.years as i64) * 12i64 + (acc.months as i64);
    if months < (-2147483648i64) || months > 2147483647i64 {
        return IntervalValue::Error(make_sql_error(INTERVAL_INPUT_FINAL_RANGE));
    };
    make_interval_value(months as i32, acc.days, acc.time)
}
pub fn interval_from_text_fields(input: TextValue, fields: Int4Value) -> IntervalValue {
    if let TextValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if let Int4Value::Error(error) = fields {
        return IntervalValue::Error(error);
    };
    if input == TextValue::Unknown || fields == Int4Value::Unknown {
        return IntervalValue::Unknown;
    };
    if input == TextValue::Null || fields == Int4Value::Null {
        return IntervalValue::Null;
    };
    let mut field_mask: i32 = 32767;
    if let Int4Value::Value(value) = fields {
        field_mask = value;
    };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut start: usize = 0;
        while start < chars.len() && date_text_space(chars[start]) {
            start += 1;
        };
        if start < chars.len() && chars[start] == 'P' {
            if chars.len() > 255 {
                return IntervalValue::Unknown;
            };
            return interval_input_iso(text.as_str());
        };
        return interval_units_from_text(TextValue::Value(text), field_mask);
    };
    interval_units_from_text(input, field_mask)
}

fn interval_input_alpha(character: char) -> bool {
    let code = character.to_ascii_lowercase() as i32;
    code >= 97 && code <= 122
}
fn interval_input_normalized(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    let mut previous: char = ' ';
    let mut date_field = false;
    let mut word = false;
    let mut output = String::new();
    while index < chars.len() {
        let current = chars[index];
        if date_text_space(current) {
            date_field = false;
            word = false;
        };
        if date_field && (current == '.' || current == '+') {
            output.push(' ');
            date_field = false;
            word = false;
        };
        if current == '-' && date_text_digit(previous) >= 0 && word == false {
            date_field = true;
        };
        if (date_text_digit(previous) >= 0 && interval_input_alpha(current)) || previous == '@' {
            output.push(' ');
            date_field = false;
        };
        if interval_input_alpha(current) {
            word = true;
        };
        output.push(current);
        previous = current;
        index += 1;
    };
    output
}
fn interval_input_year_month(text: &str) -> Int8Value {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    let mut negative = false;
    if index < chars.len() && (chars[index] == '-' || chars[index] == '+') {
        negative = chars[index] == '-';
        index += 1;
    };
    let start = index;
    while index < chars.len() && date_text_digit(chars[index]) >= 0 {
        index += 1;
    };
    if index == start || index == chars.len() || chars[index] != '-' {
        return Int8Value::Unknown;
    };
    let separator = index;
    let mut first = String::new();
    index = 0;
    while index < separator {
        first.push(chars[index]);
        index += 1;
    };
    let mut second = String::new();
    index = separator + 1;
    while index < chars.len() {
        if chars[index] == '.' {
            return Int8Value::Error(make_sql_error(INTERVAL_INPUT_SYNTAX));
        };
        second.push(chars[index]);
        index += 1;
    };
    let years = interval_input_whole(first.as_str());
    let mut months = interval_input_whole(second.as_str());
    if separator + 1 == chars.len() {
        months = Int8Value::Value(0i64);
    };
    if let Int8Value::Error(error) = years {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = months {
        return Int8Value::Error(error);
    };
    if let Int8Value::Value(year) = years {
        if let Int8Value::Value(month) = months {
            if month < 0i64
                || month > 11i64
                || year > 9223372036854775807i64 / 12i64
                || year < (-9223372036854775808i64) / 12i64
            {
                return Int8Value::Error(make_sql_error(INTERVAL_INPUT_RANGE));
            };
            let product = year * 12i64;
            let mut value = 0i64;
            if negative {
                if product < (-9223372036854775808i64) + month {
                    return Int8Value::Error(make_sql_error(INTERVAL_INPUT_RANGE));
                };
                value = product - month;
            } else {
                if product > 9223372036854775807i64 - month {
                    return Int8Value::Error(make_sql_error(INTERVAL_INPUT_RANGE));
                };
                value = product + month;
            };
            return Int8Value::Value(value);
        };
    };
    Int8Value::Error(make_sql_error(INTERVAL_INPUT_SYNTAX))
}

pub fn interval_from_text(input: TextValue) -> IntervalValue {
    interval_from_text_fields(input, make_int4_value(32767))
}
