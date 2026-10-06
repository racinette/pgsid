struct MacText {
    chars: Vec<char>,
}

#[derive(Clone, Copy)]
struct MacByte {
    value: i32,
}

#[derive(Clone, Copy)]
struct MacParsed {
    valid: bool,
    address: MacAddress,
}

#[derive(Clone, Copy)]
struct MacScanned {
    valid: bool,
    value: i32,
    end: usize,
}

fn mac_invalid() -> MacParsed {
    MacParsed {
        valid: false,
        address: MacAddress {
            word0: 0,
            word1: 0,
            word2: 0,
            word3: 0,
        },
    }
}

fn mac_space(ch: char) -> bool {
    ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\u{000b}' || ch == '\u{000c}'
}

fn mac_scan_hex(text: &MacText, start: usize, width: usize) -> MacScanned {
    let mut index = start;
    while index < text.chars.len() && mac_space(text.chars[index]) {
        index += 1;
    }
    let begin = index;
    let mut negative = false;
    if index < text.chars.len() && (text.chars[index] == '+' || text.chars[index] == '-') {
        negative = text.chars[index] == '-';
        index += 1;
    }
    let mut digits = false;
    if index + 1 < text.chars.len()
        && (width == 0 || index + 1 - begin < width)
        && text.chars[index] == '0'
        && text.chars[index + 1].to_ascii_lowercase() == 'x'
    {
        index += 2;
    }
    let mut value: i32 = 0;
    while index < text.chars.len() && (width == 0 || index - begin < width) {
        let digit = hex_digit(text.chars[index]);
        if digit == 16 {
            break;
        }
        digits = true;
        if value <= 255 {
            value = value * 16 + digit;
        }
        index += 1;
    }
    MacScanned {
        valid: digits && value <= 255 && (negative == false || value == 0),
        value,
        end: index,
    }
}

fn macaddr_format(text: &MacText, format: usize) -> MacParsed {
    let mut index: usize = 0;
    let mut byte_index: usize = 0;
    let mut bytes: Vec<MacByte> = Vec::new();
    let mut width: usize = 2;
    if format < 2 {
        width = 0;
    }
    while byte_index < 6 {
        let scanned = mac_scan_hex(text, index, width);
        if scanned.valid == false {
            return mac_invalid();
        }
        bytes.push(MacByte {
            value: scanned.value,
        });
        index = scanned.end;
        byte_index += 1;
        let mut separator = '\0';
        if byte_index < 6 {
            if format == 0 {
                separator = ':';
            } else if format == 1 {
                separator = '-';
            } else if format == 2 && byte_index == 3 {
                separator = ':';
            } else if format == 3 && byte_index == 3 {
                separator = '-';
            } else if format == 4 && (byte_index == 2 || byte_index == 4) {
                separator = '.';
            } else if format == 5 && (byte_index == 2 || byte_index == 4) {
                separator = '-';
            };
        }
        if separator != '\0' {
            if index >= text.chars.len() || text.chars[index] != separator {
                return mac_invalid();
            }
            index += 1;
        };
    }
    while index < text.chars.len() && mac_space(text.chars[index]) {
        index += 1;
    }
    if index != text.chars.len() {
        return mac_invalid();
    }
    MacParsed {
        valid: true,
        address: MacAddress {
            word0: bytes[0].value * 256 + bytes[1].value,
            word1: bytes[2].value * 256 + bytes[3].value,
            word2: bytes[4].value * 256 + bytes[5].value,
            word3: 0,
        },
    }
}

fn macaddr_parse(text: &MacText) -> MacParsed {
    let mut format: usize = 0;
    while format < 7 {
        let parsed = macaddr_format(text, format);
        if parsed.valid {
            return parsed;
        }
        format += 1;
    }
    mac_invalid()
}

fn macaddr8_parse(text: &MacText) -> MacParsed {
    let mut index: usize = 0;
    let mut separator = '\0';
    let mut bytes: Vec<MacByte> = Vec::new();
    while index < text.chars.len() && mac_space(text.chars[index]) {
        index += 1;
    }
    while index + 1 < text.chars.len() {
        if bytes.len() == 8 {
            return mac_invalid();
        }
        let high = hex_digit(text.chars[index]);
        let low = hex_digit(text.chars[index + 1]);
        if high == 16 || low == 16 {
            return mac_invalid();
        }
        bytes.push(MacByte {
            value: high * 16 + low,
        });
        index += 2;
        if index < text.chars.len()
            && (text.chars[index] == ':' || text.chars[index] == '-' || text.chars[index] == '.')
        {
            if separator != '\0' && separator != text.chars[index] {
                return mac_invalid();
            }
            separator = text.chars[index];
            index += 1;
        }
        if (bytes.len() == 6 || bytes.len() == 8)
            && index < text.chars.len()
            && mac_space(text.chars[index])
        {
            while index < text.chars.len() && mac_space(text.chars[index]) {
                index += 1;
            }
            if index != text.chars.len() {
                return mac_invalid();
            }
        };
    }
    if index < text.chars.len() {
        let final_code = text.chars[index] as u32;
        if final_code > 127 || final_code == 0 {
            return mac_invalid();
        }
    }
    if bytes.len() == 6 {
        let inserted_high: i32 = 254;
        return MacParsed {
            valid: true,
            address: MacAddress {
                word0: bytes[0].value * 256 + bytes[1].value,
                word1: bytes[2].value * 256 + 255,
                word2: inserted_high * 256 + bytes[3].value,
                word3: bytes[4].value * 256 + bytes[5].value,
            },
        };
    }
    if bytes.len() != 8 {
        return mac_invalid();
    }
    MacParsed {
        valid: true,
        address: MacAddress {
            word0: bytes[0].value * 256 + bytes[1].value,
            word1: bytes[2].value * 256 + bytes[3].value,
            word2: bytes[4].value * 256 + bytes[5].value,
            word3: bytes[6].value * 256 + bytes[7].value,
        },
    }
}

pub fn mac_address_compare(left: MacAddress, right: MacAddress) -> i32 {
    if left.word0 < right.word0 {
        return -1;
    }
    if left.word0 > right.word0 {
        return 1;
    }
    if left.word1 < right.word1 {
        return -1;
    }
    if left.word1 > right.word1 {
        return 1;
    }
    if left.word2 < right.word2 {
        return -1;
    }
    if left.word2 > right.word2 {
        return 1;
    }
    if left.word3 < right.word3 {
        return -1;
    }
    if left.word3 > right.word3 {
        return 1;
    }
    0
}
