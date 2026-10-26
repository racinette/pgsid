fn interval_output_absolute(value: i64) -> i64 {
    if value < 0i64 { return 0i64-value; };
    value
}

fn interval_output_seconds(seconds: i64, fraction: i64, padded: bool) -> String {
    let mut output = text_signed_number(seconds);
    if padded && seconds < 10i64 { output = "0".to_owned(); output.push_str(text_signed_number(seconds).as_str()); };
    if fraction != 0i64 {
        output.push('.'); let mut remaining = fraction; let mut divisor = 100000i64;
        while remaining > 0i64 {
            output.push_str(text_signed_number(remaining/divisor).as_str());
            remaining = remaining%divisor; divisor = divisor/10i64;
        }
    };
    output
}

fn interval_output_clock(hour: i64, minute: i64, second: i64, fraction: i64, padded: bool) -> String {
    let mut output = text_signed_number(hour);
    if padded && hour < 10i64 { output = "0".to_owned(); output.push_str(text_signed_number(hour).as_str()); };
    output.push(':'); output.push_str(clock_output_pair(minute as i32).as_str()); output.push(':');
    output.push_str(interval_output_seconds(second,fraction,true).as_str());
    output
}

fn interval_output_unit(output: String, value: i64, unit: &str, plus: bool) -> String {
    let mut result = output;
    if value == 0i64 { return result; };
    if result.as_str() != "" { result.push(' '); };
    if plus && value > 0i64 { result.push('+'); };
    result.push_str(text_signed_number(value).as_str()); result.push(' '); result.push_str(unit);
    if value != 1i64 { result.push('s'); };
    result
}

fn interval_output_iso_field(output: String, value: i64, unit: char) -> String {
    let mut result = output;
    if value != 0i64 { result.push_str(text_signed_number(value).as_str()); result.push(unit); };
    result
}

pub fn interval_output_context(input: IntervalValue, style: i32) -> TextValue {
    if let IntervalValue::Error(error) = input { return TextValue::Error(error); };
    if input == IntervalValue::Null { return TextValue::Null; };
    if let IntervalValue::Value(value) = input {
        let special = interval_special(value);
        if special < 0 { return make_text_value("-infinity"); };
        if special > 0 { return make_text_value("infinity"); };
        if style < 1 || style > 4 { return TextValue::NonNull; };
        let year = (value.months/12) as i64; let month = (value.months%12) as i64;
        let day = value.days as i64;
        let hour = value.time/3600000000i64; let minute = value.time/60000000i64%60i64;
        let second = value.time/1000000i64%60i64; let fraction = value.time%1000000i64;
        let negative_time = value.time < 0i64;
        let seconds = interval_output_seconds(interval_output_absolute(second),interval_output_absolute(fraction),false);
        let clock = interval_output_clock(interval_output_absolute(hour),interval_output_absolute(minute),interval_output_absolute(second),interval_output_absolute(fraction),style == 1);
        let zero = value.months == 0 && day == 0i64 && value.time == 0i64;
        if style == 4 {
            if zero { return make_text_value("PT0S"); };
            let mut output = "P".to_owned();
            output = interval_output_iso_field(output,year,'Y'); output = interval_output_iso_field(output,month,'M'); output = interval_output_iso_field(output,day,'D');
            if value.time != 0i64 { output.push('T'); };
            output = interval_output_iso_field(output,hour,'H'); output = interval_output_iso_field(output,minute,'M');
            if second != 0i64 || fraction != 0i64 {
                if negative_time { output.push('-'); };
                output.push_str(seconds.as_str()); output.push('S');
            };
            return TextValue::Value(output);
        };
        if style == 3 {
            if zero { return make_text_value("0"); };
            let negative = value.months < 0 || day < 0i64 || negative_time;
            let positive = value.months > 0 || day > 0i64 || value.time > 0i64;
            let mixed = (negative && positive) || (value.months != 0 && (day != 0i64 || value.time != 0i64));
            let mut output = String::new();
            if mixed || negative { output.push('-'); if value.months >= 0 && mixed { output = "+".to_owned(); }; };
            if mixed || value.months != 0 {
                output.push_str(text_signed_number(interval_output_absolute(year)).as_str()); output.push('-'); output.push_str(text_signed_number(interval_output_absolute(month)).as_str());
                if mixed { output.push(' '); };
            };
            if mixed || (value.months == 0 && day != 0i64) {
                if mixed { if day < 0i64 { output.push('-'); } else { output.push('+'); }; };
                output.push_str(text_signed_number(interval_output_absolute(day)).as_str()); output.push(' ');
            };
            if mixed || value.months == 0 {
                if mixed { if negative_time { output.push('-'); } else { output.push('+'); }; };
                output.push_str(clock.as_str());
            };
            return TextValue::Value(output);
        };
        if style == 1 {
            let mut output = String::new(); let mut before = false;
            output = interval_output_unit(output,year,"year",before); if year != 0i64 { before = year < 0i64; };
            output = interval_output_unit(output,month,"mon",before); if month != 0i64 { before = month < 0i64; };
            output = interval_output_unit(output,day,"day",before); if day != 0i64 { before = day < 0i64; };
            if output.as_str() == "" || value.time != 0i64 {
                if output.as_str() != "" { output.push(' '); };
                if negative_time { output.push('-'); } else if before { output.push('+'); };
                output.push_str(clock.as_str());
            };
            return TextValue::Value(output);
        };
        let mut first = year;
        if first == 0i64 { first = month; }; if first == 0i64 { first = day; };
        if first == 0i64 { first = hour; }; if first == 0i64 { first = minute; };
        if first == 0i64 { first = second; }; if first == 0i64 { first = fraction; };
        let before = first < 0i64; let mut sign = 1i64; if before { sign = -1i64; };
        let mut output = "@".to_owned();
        output = interval_output_unit(output,year*sign,"year",false);
        output = interval_output_unit(output,month*sign,"mon",false);
        output = interval_output_unit(output,day*sign,"day",false);
        output = interval_output_unit(output,hour*sign,"hour",false);
        output = interval_output_unit(output,minute*sign,"min",false);
        if second != 0i64 || fraction != 0i64 {
            output.push(' '); if negative_time != before { output.push('-'); };
            output.push_str(seconds.as_str()); output.push_str(" sec");
            if interval_output_absolute(second) != 1i64 || fraction != 0i64 { output.push('s'); };
        };
        if zero { output.push_str(" 0"); };
        if before { output.push_str(" ago"); };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
