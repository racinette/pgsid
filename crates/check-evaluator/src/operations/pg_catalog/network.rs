const SQLSTATE_INVALID_PARAMETER_VALUE: u32 = 3452619;

fn network_compare(left: NetworkValue, right: NetworkValue) -> Int4Value {
    if let NetworkValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return Int4Value::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family < b.family {
                return Int4Value::Value(-1);
            }
            if a.family > b.family {
                return Int4Value::Value(1);
            }
            let mut bits = a.prefix;
            if b.prefix < bits {
                bits = b.prefix;
            }
            let order = network_prefix_compare(a, b, bits);
            if order != 0 {
                return Int4Value::Value(order);
            }
            if a.prefix < b.prefix {
                return Int4Value::Value(-1);
            }
            if a.prefix > b.prefix {
                return Int4Value::Value(1);
            }
            let mut width: i32 = 32;
            if a.family == 6 {
                width = 128;
            }
            let full_order = network_prefix_compare(a, b, width);
            return Int4Value::Value(full_order);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__network_eq__i7hn(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
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
        return BoolValue::Value(order == 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_ne__vmql(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
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
        return BoolValue::Value(order != 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_lt__0kbr(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
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

pub fn sql__pg_catalog__network_le__n61s(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
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

pub fn sql__pg_catalog__network_gt__i6x7(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
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

pub fn sql__pg_catalog__network_ge__q7pc(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
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

fn network_contains(left: NetworkValue, right: NetworkValue, strict: bool) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return BoolValue::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family || a.prefix < b.prefix {
                return BoolValue::Value(false);
            }
            if strict && a.prefix == b.prefix {
                return BoolValue::Value(false);
            }
            let order = network_prefix_compare(a, b, b.prefix);
            return BoolValue::Value(order == 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_sub__y7j2(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(left, right, true)
}

pub fn sql__pg_catalog__network_subeq__9psu(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(left, right, false)
}

pub fn sql__pg_catalog__network_sup__1zu4(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(right, left, true)
}

pub fn sql__pg_catalog__network_supeq__utj6(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(right, left, false)
}

pub fn sql__pg_catalog__network_overlap__zbdv(
    left: NetworkValue,
    right: NetworkValue,
) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return BoolValue::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family {
                return BoolValue::Value(false);
            }
            let mut bits = a.prefix;
            if b.prefix < bits {
                bits = b.prefix;
            }
            let order = network_prefix_compare(a, b, bits);
            return BoolValue::Value(order == 0);
        }
    }
    BoolValue::Unknown
}

fn network_result_address(family: usize, prefix: i32, words: Vec<NetworkWord>) -> NetworkAddress {
    NetworkAddress {
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
    }
}

fn network_add_offset(address: NetworkAddress, offset: i64) -> NetworkValue {
    let mut words: Vec<NetworkWord> = Vec::new();
    while words.len() < 8 {
        words.push(NetworkWord { value: 0 });
    }
    let mut index: usize = 8;
    if address.family == 4 {
        index = 2;
    }
    let mut remaining: i64 = offset;
    let mut carry: i32 = 0;
    while index > 0 {
        index = index - 1;
        let mut digit: i64 = remaining % 65536i64;
        remaining = remaining / 65536i64;
        if digit < 0i64 {
            digit = digit + 65536i64;
            remaining = remaining - 1i64;
        }
        let narrow_digit = digit as i32;
        let sum = network_address_word(address, index) + narrow_digit + carry;
        words[index] = NetworkWord { value: sum % 65536 };
        carry = sum / 65536;
    }
    if (remaining != 0i64 || carry != 0) && (remaining != -1i64 || carry != 1) {
        return NetworkValue::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
    }
    let result = network_result_address(address.family, address.prefix, words);
    NetworkValue::Value(result)
}

pub fn sql__pg_catalog__inetpl__eu7x(left: NetworkValue, right: Int8Value) -> NetworkValue {
    if let NetworkValue::Error(error) = left {
        return NetworkValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return NetworkValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == Int8Value::Unknown {
        return NetworkValue::Unknown;
    }
    if left == NetworkValue::Null || right == Int8Value::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = left {
        if let Int8Value::Value(offset) = right {
            return network_add_offset(address, offset);
        }
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__int8pl_inet__3uh7(left: Int8Value, right: NetworkValue) -> NetworkValue {
    if let Int8Value::Error(error) = left {
        return NetworkValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return NetworkValue::Error(error);
    }
    if left == Int8Value::Unknown || right == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if left == Int8Value::Null || right == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = right {
        if let Int8Value::Value(offset) = left {
            return network_add_offset(address, offset);
        }
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__inetmi_int8__z4fj(left: NetworkValue, right: Int8Value) -> NetworkValue {
    if let NetworkValue::Error(error) = left {
        return NetworkValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return NetworkValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == Int8Value::Unknown {
        return NetworkValue::Unknown;
    }
    if left == NetworkValue::Null || right == Int8Value::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = left {
        if let Int8Value::Value(offset) = right {
            // PostgreSQL negates the bigint in two's complement, retaining its minimum.
            if offset == -9223372036854775808i64 {
                return network_add_offset(address, offset);
            }
            let negated: i64 = 0i64 - offset;
            return network_add_offset(address, negated);
        }
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__inetmi__jocm(left: NetworkValue, right: NetworkValue) -> Int8Value {
    if let NetworkValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return Int8Value::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return Int8Value::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family {
                return Int8Value::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
            }
            let mut word_count: usize = 8;
            if a.family == 4 {
                word_count = 2;
            }
            let mut words: Vec<NetworkWord> = Vec::new();
            while words.len() < word_count {
                words.push(NetworkWord { value: 0 });
            }
            let mut index = word_count;
            let mut borrow: i32 = 0;
            while index > 0 {
                index = index - 1;
                let mut difference =
                    network_address_word(a, index) - network_address_word(b, index) + borrow;
                borrow = 0;
                if difference < 0 {
                    difference = difference + 65536;
                    borrow = -1;
                }
                words[index] = NetworkWord { value: difference };
            }
            if a.family == 4 {
                let high = words[0].value as i64;
                let low = words[1].value as i64;
                let mut result: i64 = high * 65536i64 + low;
                if borrow < 0 {
                    result = result - 4294967296i64;
                }
                return Int8Value::Value(result);
            }
            let mut expected: i32 = 0;
            let mut high = words[4].value;
            if high >= 32768 {
                expected = 65535;
                high = high - 65536;
            }
            let mut upper_index: usize = 0;
            while upper_index < 4 {
                if words[upper_index].value != expected {
                    return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
                }
                upper_index += 1;
            }
            let mut result = high as i64;
            let mut lower_index: usize = 5;
            while lower_index < 8 {
                let word = words[lower_index].value as i64;
                result = result * 65536i64 + word;
                lower_index += 1;
            }
            return Int8Value::Value(result);
        }
    }
    Int8Value::Unknown
}
