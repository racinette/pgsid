pub fn text_number(value: i32, base: i32) -> String {
    let digits: Vec<char> = "0123456789abcdef".chars().collect();
    let mut reversed: Vec<char> = Vec::new();
    let mut remaining = value;
    if remaining == 0 {
        reversed.push('0');
    }
    while remaining > 0 {
        let mut digit = remaining % base;
        let mut index: usize = 0;
        while digit > 0 {
            index += 1;
            digit = digit - 1;
        }
        reversed.push(digits[index]);
        remaining = remaining / base;
    }
    let mut output = String::new();
    let mut position = reversed.len();
    while position > 0 {
        position = position - 1;
        output.push(reversed[position]);
    }
    output
}

pub fn bytea_append_byte(value: String, byte: i32) -> String {
    let digits: Vec<char> = "0123456789abcdef".chars().collect();
    let mut high = byte / 16;
    let mut low = byte % 16;
    let mut high_index: usize = 0;
    let mut low_index: usize = 0;
    while high > 0 {
        high_index += 1;
        high = high - 1;
    }
    while low > 0 {
        low_index += 1;
        low = low - 1;
    }
    let mut output = value;
    output.push(digits[high_index]);
    output.push(digits[low_index]);
    output
}

pub fn hex_digit(ch: char) -> i32 {
    if ch == '0' {
        return 0;
    }
    if ch == '1' {
        return 1;
    }
    if ch == '2' {
        return 2;
    }
    if ch == '3' {
        return 3;
    }
    if ch == '4' {
        return 4;
    }
    if ch == '5' {
        return 5;
    }
    if ch == '6' {
        return 6;
    }
    if ch == '7' {
        return 7;
    }
    if ch == '8' {
        return 8;
    }
    if ch == '9' {
        return 9;
    }

    let lower = ch.to_ascii_lowercase();
    if lower == 'a' {
        return 10;
    }
    if lower == 'b' {
        return 11;
    }
    if lower == 'c' {
        return 12;
    }
    if lower == 'd' {
        return 13;
    }
    if lower == 'e' {
        return 14;
    }
    if lower == 'f' {
        return 15;
    }
    16
}
