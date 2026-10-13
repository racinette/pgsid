fn clock_output_pair(value: i32) -> String {
    let mut output = String::new();
    if value < 10 {
        output.push('0');
    };
    let number = text_number(value, 10);
    output.push_str(number.as_str());
    output
}
fn clock_output_time(time: i64) -> String {
    let hour = (time / 3600000000i64) as i32;
    let minute = ((time / 60000000i64) % 60i64) as i32;
    let second = ((time / 1000000i64) % 60i64) as i32;
    let mut fraction = (time % 1000000i64) as i32;
    let mut output = clock_output_pair(hour);
    output.push(':');
    let minutes = clock_output_pair(minute);
    output.push_str(minutes.as_str());
    output.push(':');
    let seconds = clock_output_pair(second);
    output.push_str(seconds.as_str());
    if fraction != 0 {
        output.push('.');
        let mut divisor: i32 = 100000;
        while fraction > 0 {
            let digit = text_number(fraction / divisor, 10);
            output.push_str(digit.as_str());
            fraction = fraction % divisor;
            divisor = divisor / 10;
        }
    };
    output
}
pub fn clock_time_to_text(input: TimeValue) -> TextValue {
    if let TimeValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == TimeValue::Null {
        return TextValue::Null;
    };
    if let TimeValue::Value(time) = input {
        return TextValue::Value(clock_output_time(time));
    };
    TextValue::Unknown
}
fn clock_output_offset_pair(value: i32) -> String {
    let mut number = value as i64;
    if number < 0i64 {
        number = number + 4294967296i64;
    };
    let mut output = String::new();
    if number < 10i64 {
        output.push('0');
    };
    let digits = text_signed_number(number);
    output.push_str(digits.as_str());
    output
}
pub fn clock_timetz_to_text(input: TimetzValue) -> TextValue {
    if let TimetzValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == TimetzValue::Null {
        return TextValue::Null;
    };
    if let TimetzValue::Value(time) = input {
        let mut output = clock_output_time(time.time);
        let mut offset = time.zone;
        if offset > 0 {
            output.push('-');
        } else {
            output.push('+');
            if offset != (-2147483647 - 1) {
                offset = 0 - offset;
            };
        };
        let hour = clock_output_offset_pair(offset / 3600);
        let minute = (offset / 60) % 60;
        let second = offset % 60;
        output.push_str(hour.as_str());
        if minute != 0 || second != 0 {
            output.push(':');
            let minutes = clock_output_offset_pair(minute);
            output.push_str(minutes.as_str());
            if second != 0 {
                output.push(':');
                let seconds = clock_output_offset_pair(second);
                output.push_str(seconds.as_str());
            };
        };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
