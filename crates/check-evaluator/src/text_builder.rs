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
