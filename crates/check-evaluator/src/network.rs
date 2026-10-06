#[derive(Clone, Copy)]
pub struct NetworkWord {
    pub value: i32,
}

fn network_digit(ch: char) -> i32 {
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

pub fn network_address_word(address: NetworkAddress, index: usize) -> i32 {
    if index == 0 {
        return address.word0;
    }
    if index == 1 {
        return address.word1;
    }
    if index == 2 {
        return address.word2;
    }
    if index == 3 {
        return address.word3;
    }
    if index == 4 {
        return address.word4;
    }
    if index == 5 {
        return address.word5;
    }
    if index == 6 {
        return address.word6;
    }
    address.word7
}

pub fn network_prefix_compare(left: NetworkAddress, right: NetworkAddress, bits: i32) -> i32 {
    let mut index: usize = 0;
    let mut remaining = bits;
    while remaining > 0 {
        let mut word_count = remaining;
        if word_count > 16 {
            word_count = 16;
        }
        let mut divisor: i32 = 1;
        let mut padding = 16 - word_count;
        while padding > 0 {
            divisor = divisor * 2;
            padding = padding - 1;
        }
        let a = network_address_word(left, index) / divisor;
        let b = network_address_word(right, index) / divisor;
        if a < b {
            return -1;
        }
        if a > b {
            return 1;
        }
        remaining = remaining - word_count;
        index += 1;
    }
    0
}

fn network_parse(value: &str, cidr: bool) -> NetworkValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() == 0 || chars.len() > 256 {
        return NetworkValue::Unknown;
    }
    let mut end = chars.len();
    let mut family: usize = 4;
    let mut scan: usize = 0;
    while scan < chars.len() {
        if chars[scan] == ':' {
            family = 6;
        }
        if chars[scan] == '/' {
            if end != chars.len() {
                return NetworkValue::Unknown;
            }
            end = scan;
        }
        scan += 1;
    }
    let mut prefix: i32 = 32;
    if family == 6 {
        prefix = 128;
    }
    if end != chars.len() {
        let mut index = end + 1;
        if index == chars.len() {
            return NetworkValue::Unknown;
        }
        if family == 6 && chars[index] == '0' && index + 1 < chars.len() {
            return NetworkValue::Unknown;
        }
        prefix = 0;
        while index < chars.len() {
            let digit = network_digit(chars[index]);
            if digit > 9 {
                return NetworkValue::Unknown;
            }
            prefix = prefix * 10 + digit;
            if prefix > 128 || (family == 4 && prefix > 32) {
                return NetworkValue::Unknown;
            }
            index += 1;
        }
    }
    let mut words: Vec<NetworkWord> = Vec::new();
    let mut index: usize = 0;
    if family == 4 {
        let mut octets: Vec<NetworkWord> = Vec::new();
        let mut octet_count: i32 = 0;
        if cidr && end > 2 && chars[0] == '0' && (chars[1] == 'x' || chars[1] == 'X') {
            index = 2;
            while index < end {
                let high = network_digit(chars[index]);
                if high > 15 || octets.len() == 4 {
                    return NetworkValue::Unknown;
                }
                index += 1;
                let mut low: i32 = 0;
                if index < end {
                    low = network_digit(chars[index]);
                    if low > 15 {
                        return NetworkValue::Unknown;
                    }
                    index += 1;
                }
                octets.push(NetworkWord {
                    value: high * 16 + low,
                });
                octet_count = octet_count + 1;
            }
        } else {
            while index < end {
                let begin = index;
                let mut octet: i32 = 0;
                while index < end && chars[index] != '.' {
                    let digit = network_digit(chars[index]);
                    if digit > 9 {
                        return NetworkValue::Unknown;
                    }
                    octet = octet * 10 + digit;
                    if octet > 255 {
                        return NetworkValue::Unknown;
                    }
                    index += 1;
                }
                if begin == index || octets.len() == 4 {
                    return NetworkValue::Unknown;
                }
                octets.push(NetworkWord { value: octet });
                octet_count = octet_count + 1;
                if index < end {
                    index += 1;
                    if index == end {
                        return NetworkValue::Unknown;
                    }
                }
            }
        }
        if octets.len() == 0 {
            return NetworkValue::Unknown;
        }
        if end == chars.len() {
            if cidr {
                prefix = 8;
                if octets[0].value >= 240 {
                    prefix = 32;
                } else if octets[0].value >= 224 {
                    prefix = 8;
                } else if octets[0].value >= 192 {
                    prefix = 24;
                } else if octets[0].value >= 128 {
                    prefix = 16;
                }
                if prefix < octet_count * 8 {
                    prefix = octet_count * 8;
                }
                if prefix == 8 && octets[0].value == 224 {
                    prefix = 4;
                }
            } else if octets.len() != 4 {
                return NetworkValue::Unknown;
            };
        } else if cidr == false && prefix / 8 > octet_count {
            return NetworkValue::Unknown;
        }
        while octets.len() < 4 {
            octets.push(NetworkWord { value: 0 });
        }
        words.push(NetworkWord {
            value: octets[0].value * 256 + octets[1].value,
        });
        words.push(NetworkWord {
            value: octets[2].value * 256 + octets[3].value,
        });
    } else {
        let mut compression: usize = 9;
        if end > 0 && chars[0] == ':' {
            if end < 2 || chars[1] != ':' {
                return NetworkValue::Unknown;
            }
            compression = 0;
            index = 2;
        }
        while index < end {
            let begin = index;
            let mut stop = index;
            let mut dotted = false;
            while stop < end && chars[stop] != ':' {
                if chars[stop] == '.' {
                    dotted = true;
                }
                stop += 1;
            }
            if dotted {
                if stop != end || words.len() > 6 {
                    return NetworkValue::Unknown;
                }
                let mut octets: Vec<NetworkWord> = Vec::new();
                while index < end {
                    let start = index;
                    let mut octet: i32 = 0;
                    while index < end && chars[index] != '.' {
                        let digit = network_digit(chars[index]);
                        if digit > 9 || (index > start && chars[start] == '0') {
                            return NetworkValue::Unknown;
                        }
                        octet = octet * 10 + digit;
                        if octet > 255 {
                            return NetworkValue::Unknown;
                        }
                        index += 1;
                    }
                    if index == start || octets.len() == 4 {
                        return NetworkValue::Unknown;
                    }
                    octets.push(NetworkWord { value: octet });
                    if index < end {
                        index += 1;
                        if index == end {
                            return NetworkValue::Unknown;
                        }
                    }
                }
                if octets.len() != 4 {
                    return NetworkValue::Unknown;
                }
                words.push(NetworkWord {
                    value: octets[0].value * 256 + octets[1].value,
                });
                words.push(NetworkWord {
                    value: octets[2].value * 256 + octets[3].value,
                });
            } else {
                if stop == begin || stop - begin > 4 || words.len() == 8 {
                    return NetworkValue::Unknown;
                }
                let mut word: i32 = 0;
                while index < stop {
                    let digit = network_digit(chars[index]);
                    if digit > 15 {
                        return NetworkValue::Unknown;
                    }
                    word = word * 16 + digit;
                    index += 1;
                }
                words.push(NetworkWord { value: word });
                if index < end {
                    index += 1;
                    if index < end && chars[index] == ':' {
                        if compression != 9 {
                            return NetworkValue::Unknown;
                        }
                        compression = words.len();
                        index += 1;
                    } else if index == end {
                        return NetworkValue::Unknown;
                    };
                }
            };
        }
        if compression != 9 {
            let word_count = words.len();
            if word_count >= 8 {
                return NetworkValue::Unknown;
            }
            while words.len() < 8 {
                words.push(NetworkWord { value: 0 });
            }
            let mut source = word_count;
            let mut dest: usize = 8;
            while source > compression {
                source = source - 1;
                dest = dest - 1;
                words[dest] = words[source];
                words[source] = NetworkWord { value: 0 };
            }
        }
        if words.len() != 8 {
            return NetworkValue::Unknown;
        }
    }
    while words.len() < 8 {
        words.push(NetworkWord { value: 0 });
    }
    let address = NetworkAddress {
        family: family,
        prefix: prefix,
        word0: words[0].value,
        word1: words[1].value,
        word2: words[2].value,
        word3: words[3].value,
        word4: words[4].value,
        word5: words[5].value,
        word6: words[6].value,
        word7: words[7].value,
    };
    if cidr {
        let mut remaining = prefix;
        let mut word_index: usize = 0;
        let mut word_count: usize = 8;
        if family == 4 {
            word_count = 2;
        }
        while word_index < word_count {
            let mut bits = remaining;
            if bits > 16 {
                bits = 16;
            }
            remaining = remaining - bits;
            let mut divisor: i32 = 1;
            let mut padding = 16 - bits;
            while padding > 0 {
                divisor = divisor * 2;
                padding = padding - 1;
            }
            if network_address_word(address, word_index) % divisor != 0 {
                return NetworkValue::Unknown;
            }
            word_index += 1;
        }
    }
    NetworkValue::Value(address)
}
