fn network_ipv4_text(address: NetworkAddress, start: usize, octets: i32) -> String {
    let mut output = String::new();
    let mut index = start;
    let mut high = true;
    let mut remaining = octets;
    while remaining > 0 {
        if remaining != octets {
            output.push('.');
        }
        let byte = network_address_byte(address, index, high);
        let number = text_number(byte, 10);
        output.push_str(number.as_str());
        if high {
            high = false;
        } else {
            high = true;
            index += 1;
        };
        remaining = remaining - 1;
    }
    output
}

fn network_host_text(address: NetworkAddress) -> String {
    if address.family == 4 {
        return network_ipv4_text(address, 0, 4);
    }
    let mut best_start: usize = 0;
    let mut best_length: usize = 0;
    let mut current_start: usize = 0;
    let mut current_length: usize = 0;
    let mut index: usize = 0;
    while index < 8 {
        if network_address_word(address, index) == 0 {
            if current_length == 0 {
                current_start = index;
            }
            current_length += 1;
        } else {
            if current_length > best_length {
                best_start = current_start;
                best_length = current_length;
            }
            current_length = 0;
        };
        index += 1;
    }
    if current_length > best_length {
        best_start = current_start;
        best_length = current_length;
    }
    if best_length < 2 {
        best_length = 0;
    }
    let mut output = String::new();
    let mut position: usize = 0;
    while position < 8 {
        if best_length != 0 && position >= best_start && position < best_start + best_length {
            if position == best_start {
                output.push(':');
            }
        } else {
            if position != 0 {
                output.push(':');
            }
            if position == 6
                && best_start == 0
                && (best_length == 6
                    || (best_length == 7 && address.word7 != 1)
                    || (best_length == 5 && address.word5 == 65535))
            {
                let dotted = network_ipv4_text(address, 6, 4);
                output.push_str(dotted.as_str());
                break;
            }
            let word = network_address_word(address, position);
            let number = text_number(word, 16);
            output.push_str(number.as_str());
        };
        position += 1;
    }
    if best_length != 0 && best_start + best_length == 8 {
        output.push(':');
    }
    output
}

fn network_cidr_text(address: NetworkAddress) -> String {
    let mut output = String::new();
    if address.family == 4 {
        if address.prefix == 0 {
            output.push('0');
        } else {
            let octets = (address.prefix + 7) / 8;
            output = network_ipv4_text(address, 0, octets);
        };
    } else if address.prefix == 0 {
        output.push_str("::");
    } else {
        let mut words = (address.prefix + 15) / 16;
        if words == 1 {
            words = 2;
        }
        let mut zero_start: usize = 0;
        let mut zero_length: usize = 0;
        let mut current_start: usize = 0;
        let mut current_length: usize = 0;
        let mut index: usize = 0;
        let mut remaining = words;
        while remaining > 0 {
            if network_address_word(address, index) == 0 {
                if current_length == 0 {
                    current_start = index;
                }
                current_length += 1;
            } else if current_length != 0 && zero_length < current_length {
                zero_start = current_start;
                zero_length = current_length;
                current_length = 0;
            };
            index += 1;
            remaining = remaining - 1;
        }
        if current_length != 0 && zero_length < current_length {
            zero_start = current_start;
            zero_length = current_length;
        }
        let ipv4 = zero_length != index
            && zero_start == 0
            && (zero_length == 6
                || (zero_length == 5 && address.word5 == 65535)
                || (zero_length == 7 && address.word7 / 256 != 0 && address.word7 % 256 != 1));
        let mut position: usize = 0;
        let mut printed = false;
        while position < index {
            if zero_length != 0 && position >= zero_start && position < zero_start + zero_length {
                if position == zero_start {
                    output.push(':');
                    printed = true;
                }
                if position == index - 1 {
                    output.push(':');
                }
            } else if ipv4 && position > 5 {
                if position == 6 {
                    output.push(':');
                } else {
                    output.push('.');
                };
                let high = network_address_byte(address, position, true);
                let number = text_number(high, 10);
                output.push_str(number.as_str());
                if position != 7 || address.prefix > 120 {
                    output.push('.');
                    let low = network_address_byte(address, position, false);
                    let low_number = text_number(low, 10);
                    output.push_str(low_number.as_str());
                }
                printed = true;
            } else {
                if printed {
                    output.push(':');
                }
                let word = network_address_word(address, position);
                let number = text_number(word, 16);
                output.push_str(number.as_str());
                printed = true;
            };
            position += 1;
        }
    };
    output.push('/');
    let prefix = text_number(address.prefix, 10);
    output.push_str(prefix.as_str());
    output
}

fn network_output(input: NetworkValue, mode: i32) -> TextValue {
    if let NetworkValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return TextValue::Unknown;
    }
    if input == NetworkValue::Null {
        return TextValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        if mode == 3 {
            return TextValue::Value(network_cidr_text(address));
        }
        let mut output = network_host_text(address);
        if mode == 1 || (mode == 2 && address.prefix != network_max_bits(address)) {
            output.push('/');
            let prefix = text_number(address.prefix, 10);
            output.push_str(prefix.as_str());
        }
        return TextValue::Value(output);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__host__h4jb(input: NetworkValue) -> TextValue {
    network_output(input, 0)
}
pub fn sql__pg_catalog__text__99pc(input: NetworkValue) -> TextValue {
    network_output(input, 1)
}
pub fn sql__pg_catalog__abbrev__xdee(input: NetworkValue) -> TextValue {
    network_output(input, 2)
}
pub fn sql__pg_catalog__abbrev__5tby(input: NetworkValue) -> TextValue {
    network_output(input, 3)
}

fn network_send(input: NetworkValue, cidr: bool) -> ByteaValue {
    if let NetworkValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == NetworkValue::Null {
        return ByteaValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let mut family: i32 = 2;
        let mut size: i32 = 4;
        let mut cidr_flag: i32 = 0;
        if address.family == 6 {
            family = 3;
            size = 16;
        }
        if cidr {
            cidr_flag = 1;
        }
        let mut output = String::new();
        output = bytea_append_byte(output, family);
        output = bytea_append_byte(output, address.prefix);
        output = bytea_append_byte(output, cidr_flag);
        output = bytea_append_byte(output, size);
        let mut index: usize = 0;
        let mut high = true;
        let mut remaining = size;
        while remaining > 0 {
            let byte = network_address_byte(address, index, high);
            output = bytea_append_byte(output, byte);
            if high {
                high = false;
            } else {
                high = true;
                index += 1;
            };
            remaining = remaining - 1;
        }
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__inet_send__z9ng(input: NetworkValue) -> ByteaValue {
    network_send(input, false)
}
pub fn sql__pg_catalog__cidr_send__s007(input: NetworkValue) -> ByteaValue {
    network_send(input, true)
}
