fn calendar_output_year(year: i32) -> String {
    let mut display = year;
    if display <= 0 { display = 1-display; };
    let mut output = String::new();
    if display < 1000 { output.push('0'); };
    if display < 100 { output.push('0'); };
    if display < 10 { output.push('0'); };
    output.push_str(text_number(display,10).as_str());
    output
}

fn calendar_output_date(calendar: TemporalCalendarFields, style: i32) -> String {
    if style == 1 { return jsonb_calendar_text(calendar); };
    let mut delimiter = '/';
    if style == 4 || style == 5 { delimiter = '-'; };
    if style == 6 { delimiter = '.'; };
    let mut first = calendar.month; let mut second = calendar.day;
    if style == 3 || style == 5 || style == 6 { first = calendar.day; second = calendar.month; };
    let mut output = clock_output_pair(first);
    output.push(delimiter); output.push_str(clock_output_pair(second).as_str());
    output.push(delimiter); output.push_str(calendar_output_year(calendar.year).as_str());
    output
}

fn calendar_output_label(index: i32, spelling: &str) -> String {
    let labels: Vec<char> = spelling.chars().collect();
    let start = usize::try_from(index*3).unwrap_or(0);
    let mut result = String::new();
    result.push(labels[start]); result.push(labels[start+1]); result.push(labels[start+2]);
    result
}

pub fn date_output_context(input: DateValue, style: i32) -> TextValue {
    if let DateValue::Error(error) = input { return TextValue::Error(error); };
    if input == DateValue::Null { return TextValue::Null; };
    if let DateValue::Value(day) = input {
        if day == (-2147483647-1) { return make_text_value("-infinity"); };
        if day == 2147483647 { return make_text_value("infinity"); };
        if style < 1 || style > 6 { return TextValue::NonNull; };
        let calendar = temporal_calendar_from_julian(day as i64+2451545i64);
        let mut output = calendar_output_date(calendar,style);
        if calendar.year <= 0 { output.push_str(" BC"); };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}

pub fn timestamp_output_context(input: TimestampValue, style: i32) -> TextValue {
    if let TimestampValue::Error(error) = input { return TextValue::Error(error); };
    if input == TimestampValue::Null { return TextValue::Null; };
    if let TimestampValue::Value(value) = input {
        if value == -9223372036854775808i64 { return make_text_value("-infinity"); };
        if value == 9223372036854775807i64 { return make_text_value("infinity"); };
        if style < 1 || style > 6 { return TextValue::NonNull; };
        let mut day = value/86400000000i64; let mut clock = value%86400000000i64;
        if clock < 0i64 { day = day-1i64; clock = clock+86400000000i64; };
        let julian = day+2451545i64;
        let calendar = temporal_calendar_from_julian(julian);
        let mut output = String::new();
        if style == 4 || style == 5 {
            let weekday = ((julian+1i64)%7i64) as i32;
            output.push_str(calendar_output_label(weekday,"SunMonTueWedThuFriSat").as_str()); output.push(' ');
            if style == 5 {
                output.push_str(clock_output_pair(calendar.day).as_str()); output.push(' ');
                output.push_str(calendar_output_label(calendar.month-1,"JanFebMarAprMayJunJulAugSepOctNovDec").as_str());
            } else {
                output.push_str(calendar_output_label(calendar.month-1,"JanFebMarAprMayJunJulAugSepOctNovDec").as_str()); output.push(' ');
                output.push_str(clock_output_pair(calendar.day).as_str());
            };
            output.push(' '); output.push_str(clock_output_time(clock).as_str()); output.push(' ');
            output.push_str(calendar_output_year(calendar.year).as_str());
        } else {
            output = calendar_output_date(calendar,style); output.push(' ');
            output.push_str(clock_output_time(clock).as_str());
        };
        if calendar.year <= 0 { output.push_str(" BC"); };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
