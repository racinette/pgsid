fn bytea_compare(left: ByteaValue, right: ByteaValue) -> Int4Value {
    if let ByteaValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(a) = left {
        if let ByteaValue::Value(b) = right {
            let first: Vec<char> = a.chars().collect();
            let second: Vec<char> = b.chars().collect();
            let mut index: usize = 0;
            while index < first.len() && index < second.len() {
                let high_a = hex_digit(first[index]);
                let low_a = hex_digit(first[index + 1]);
                let high_b = hex_digit(second[index]);
                let low_b = hex_digit(second[index + 1]);
                let a_byte = high_a * 16 + low_a;
                let b_byte = high_b * 16 + low_b;
                if a_byte != b_byte {
                    return Int4Value::Value(a_byte - b_byte);
                }
                index = index + 2;
            }
            if first.len() < second.len() {
                return Int4Value::Value(-1);
            }
            if first.len() > second.len() {
                return Int4Value::Value(1);
            }
            return Int4Value::Value(0);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__byteacmp__2x4q(left: ByteaValue, right: ByteaValue) -> Int4Value {
    bytea_compare(left, right)
}

pub fn sql__pg_catalog__bytealt__be6e(left: ByteaValue, right: ByteaValue) -> BoolValue {
    let result = bytea_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__byteale__vi7d(left: ByteaValue, right: ByteaValue) -> BoolValue {
    let result = bytea_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__byteagt__221r(left: ByteaValue, right: ByteaValue) -> BoolValue {
    let result = bytea_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__byteage__paor(left: ByteaValue, right: ByteaValue) -> BoolValue {
    let result = bytea_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bytea_larger__iqg1(left: ByteaValue, right: ByteaValue) -> ByteaValue {
    let result = bytea_compare(left.clone(), right.clone());
    if let Int4Value::Error(error) = result {
        return ByteaValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return ByteaValue::Unknown;
    }
    if result == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let Int4Value::Value(order) = result {
        if order > 0 {
            return left;
        }
        return right;
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__bytea_smaller__iook(left: ByteaValue, right: ByteaValue) -> ByteaValue {
    let result = bytea_compare(left.clone(), right.clone());
    if let Int4Value::Error(error) = result {
        return ByteaValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return ByteaValue::Unknown;
    }
    if result == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let Int4Value::Value(order) = result {
        if order < 0 {
            return left;
        }
        return right;
    }
    ByteaValue::Unknown
}

fn bytea_length(input: ByteaValue) -> Int4Value {
    if let ByteaValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == ByteaValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == ByteaValue::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        let mut length: i32 = 0;
        while index < chars.len() {
            index = index + 2;
            length = length + 1;
        }
        return Int4Value::Value(length);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__length__j2mn(input: ByteaValue) -> Int4Value {
    bytea_length(input)
}

pub fn sql__pg_catalog__octet_length__eml7(input: ByteaValue) -> Int4Value {
    bytea_length(input)
}

pub fn sql__pg_catalog__bit_length__gryu(input: ByteaValue) -> Int4Value {
    let length = bytea_length(input);
    if let Int4Value::Value(value) = length {
        return sql__pg_catalog__int4mul__284v(Int4Value::Value(value), Int4Value::Value(8));
    }
    length
}

pub fn sql__pg_catalog__bit_count__u0pl(input: ByteaValue) -> Int8Value {
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == ByteaValue::Unknown {
        return Int8Value::Unknown;
    }
    if input == ByteaValue::Null {
        return Int8Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        let mut count: i64 = 0i64;
        while index < chars.len() {
            let mut digit = hex_digit(chars[index]);
            while digit > 0 {
                if digit % 2 == 1 {
                    count = count + 1i64;
                }
                digit = digit / 2;
            }
            index = index + 1;
        }
        return Int8Value::Value(count);
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__reverse__w0od(input: ByteaValue) -> ByteaValue {
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == ByteaValue::Unknown || input == ByteaValue::Null {
        return input;
    }
    if let ByteaValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index = chars.len();
        let mut output = String::new();
        while index > 0 {
            index = index - 2;
            output.push(chars[index]);
            output.push(chars[index + 1]);
        }
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__byteasend__3q2t(input: ByteaValue) -> ByteaValue {
    input
}
