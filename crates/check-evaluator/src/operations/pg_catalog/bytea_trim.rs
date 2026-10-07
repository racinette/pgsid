fn bytea_trim(
    input: ByteaValue,
    pattern: ByteaValue,
    trim_left: bool,
    trim_right: bool,
) -> ByteaValue {
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if let ByteaValue::Error(error) = pattern {
        return ByteaValue::Error(error);
    }
    if input == ByteaValue::Unknown || pattern == ByteaValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == ByteaValue::Null || pattern == ByteaValue::Null {
        return ByteaValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let ByteaValue::Value(set) = pattern {
            let chars: Vec<char> = value.chars().collect();
            let pattern_chars: Vec<char> = set.chars().collect();
            let mut first: usize = 0;
            let mut last = chars.len();
            while trim_left && first < last {
                let mut index: usize = 0;
                let mut matches = false;
                while index < pattern_chars.len() && matches == false {
                    if chars[first] == pattern_chars[index]
                        && chars[first + 1] == pattern_chars[index + 1]
                    {
                        matches = true;
                    }
                    index = index + 2;
                }
                if matches == false {
                    break;
                }
                first = first + 2;
            }
            while trim_right && first < last {
                let mut index: usize = 0;
                let mut matches = false;
                while index < pattern_chars.len() && matches == false {
                    if chars[last - 2] == pattern_chars[index]
                        && chars[last - 1] == pattern_chars[index + 1]
                    {
                        matches = true;
                    }
                    index = index + 2;
                }
                if matches == false {
                    break;
                }
                last = last - 2;
            }
            let mut output = String::new();
            let mut index = first;
            while index < last {
                output.push(chars[index]);
                index += 1;
            }
            return ByteaValue::Value(output);
        }
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__btrim__riux(input: ByteaValue, pattern: ByteaValue) -> ByteaValue {
    bytea_trim(input, pattern, true, true)
}

pub fn sql__pg_catalog__ltrim__p5mp(input: ByteaValue, pattern: ByteaValue) -> ByteaValue {
    bytea_trim(input, pattern, true, false)
}

pub fn sql__pg_catalog__rtrim__33rv(input: ByteaValue, pattern: ByteaValue) -> ByteaValue {
    bytea_trim(input, pattern, false, true)
}
