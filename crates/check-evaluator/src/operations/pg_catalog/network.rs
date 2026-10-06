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
            let prefix_order = a.prefix - b.prefix;
            if prefix_order != 0 {
                return Int4Value::Value(prefix_order);
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

fn network_max_bits(address: NetworkAddress) -> i32 {
    if address.family == 4 {
        return 32;
    }
    128
}

fn network_host_divisor(bits: i32) -> i32 {
    let mut remaining: i32 = 16 - bits;
    let mut divisor: i32 = 1;
    while remaining > 0 {
        divisor = divisor * 2;
        remaining = remaining - 1;
    }
    divisor
}

fn network_apply_prefix(address: NetworkAddress, prefix: i32, fill_host: bool) -> NetworkAddress {
    let mut words: Vec<NetworkWord> = Vec::new();
    let mut remaining = prefix;
    let mut index: usize = 0;
    while index < 8 {
        let mut bits = remaining;
        if bits > 16 {
            bits = 16;
        }
        remaining = remaining - bits;
        let divisor = network_host_divisor(bits);
        let source = network_address_word(address, index);
        let mut word = source / divisor * divisor;
        if fill_host {
            word = word + divisor - 1;
        }
        if address.family == 4 && index >= 2 {
            word = 0;
        }
        words.push(NetworkWord { value: word });
        index += 1;
    }
    network_result_address(address.family, prefix, words)
}

fn network_mask(address: NetworkAddress, host: bool) -> NetworkAddress {
    let mut words: Vec<NetworkWord> = Vec::new();
    let mut remaining = address.prefix;
    let mut index: usize = 0;
    while index < 8 {
        let mut bits = remaining;
        if bits > 16 {
            bits = 16;
        }
        remaining = remaining - bits;
        let divisor = network_host_divisor(bits);
        let mut word = 65536 - divisor;
        if host {
            word = divisor - 1;
        }
        if address.family == 4 && index >= 2 {
            word = 0;
        }
        words.push(NetworkWord { value: word });
        index += 1;
    }
    let width = network_max_bits(address);
    network_result_address(address.family, width, words)
}

fn network_set_masklen(left: NetworkValue, right: Int4Value, clear_host: bool) -> NetworkValue {
    if let NetworkValue::Error(error) = left {
        return NetworkValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return NetworkValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == Int4Value::Unknown {
        return NetworkValue::Unknown;
    }
    if left == NetworkValue::Null || right == Int4Value::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = left {
        if let Int4Value::Value(requested) = right {
            let width = network_max_bits(address);
            let mut prefix = requested;
            if prefix == -1 {
                prefix = width;
            }
            if prefix < 0 || prefix > width {
                return NetworkValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
            }
            if clear_host {
                let result = network_apply_prefix(address, prefix, false);
                return NetworkValue::Value(result);
            }
            let mut words: Vec<NetworkWord> = Vec::new();
            let mut index: usize = 0;
            while index < 8 {
                let word = network_address_word(address, index);
                words.push(NetworkWord { value: word });
                index += 1;
            }
            let result = network_result_address(address.family, prefix, words);
            return NetworkValue::Value(result);
        }
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__family__2lcf(input: NetworkValue) -> Int4Value {
    if let NetworkValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == NetworkValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == NetworkValue::Null {
        return Int4Value::Null;
    }
    if let NetworkValue::Value(address) = input {
        if address.family == 4 {
            return Int4Value::Value(4);
        }
        return Int4Value::Value(6);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__masklen__kk20(input: NetworkValue) -> Int4Value {
    if let NetworkValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == NetworkValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == NetworkValue::Null {
        return Int4Value::Null;
    }
    if let NetworkValue::Value(address) = input {
        return Int4Value::Value(address.prefix);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__network__o215(input: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = input {
        return NetworkValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if input == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let result = network_apply_prefix(address, address.prefix, false);
        return NetworkValue::Value(result);
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__cidr__6idb(input: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = input {
        return NetworkValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if input == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let result = network_apply_prefix(address, address.prefix, false);
        return NetworkValue::Value(result);
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__broadcast__ilgu(input: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = input {
        return NetworkValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if input == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let result = network_apply_prefix(address, address.prefix, true);
        return NetworkValue::Value(result);
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__netmask__bt5i(input: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = input {
        return NetworkValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if input == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let result = network_mask(address, false);
        return NetworkValue::Value(result);
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__hostmask__vz12(input: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = input {
        return NetworkValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if input == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let result = network_mask(address, true);
        return NetworkValue::Value(result);
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__set_masklen__a6b0(left: NetworkValue, right: Int4Value) -> NetworkValue {
    network_set_masklen(left, right, false)
}

pub fn sql__pg_catalog__set_masklen__00t7(left: NetworkValue, right: Int4Value) -> NetworkValue {
    network_set_masklen(left, right, true)
}

pub fn sql__pg_catalog__inet_same_family__ogv6(
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
            return BoolValue::Value(a.family == b.family);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__inet_merge__iflm(left: NetworkValue, right: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = left {
        return NetworkValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return NetworkValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family {
                return NetworkValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
            }
            let mut limit = a.prefix;
            if b.prefix < limit {
                limit = b.prefix;
            }
            let mut common: i32 = 0;
            while common < limit {
                let next = common + 1;
                let order = network_prefix_compare(a, b, next);
                if order != 0 {
                    break;
                }
                common = next;
            }
            let result = network_apply_prefix(a, common, false);
            return NetworkValue::Value(result);
        }
    }
    NetworkValue::Unknown
}

fn network_bitwise(left: NetworkValue, right: NetworkValue, union: bool) -> NetworkValue {
    if let NetworkValue::Error(error) = left {
        return NetworkValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return NetworkValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family {
                return NetworkValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
            }
            let mut prefix = a.prefix;
            if b.prefix > prefix {
                prefix = b.prefix;
            }
            let mut words: Vec<NetworkWord> = Vec::new();
            let mut index: usize = 0;
            while index < 8 {
                let first = network_address_word(a, index);
                let second = network_address_word(b, index);
                let intersection = address_and_word(first, second);
                let mut word = intersection;
                if union {
                    word = first + second - intersection;
                }
                words.push(NetworkWord { value: word });
                index += 1;
            }
            let result = network_result_address(a.family, prefix, words);
            return NetworkValue::Value(result);
        }
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__inetand__qxb6(left: NetworkValue, right: NetworkValue) -> NetworkValue {
    network_bitwise(left, right, false)
}

pub fn sql__pg_catalog__inetor__kw39(left: NetworkValue, right: NetworkValue) -> NetworkValue {
    network_bitwise(left, right, true)
}

pub fn sql__pg_catalog__inetnot__8bow(input: NetworkValue) -> NetworkValue {
    if let NetworkValue::Error(error) = input {
        return NetworkValue::Error(error);
    }
    if input == NetworkValue::Unknown {
        return NetworkValue::Unknown;
    }
    if input == NetworkValue::Null {
        return NetworkValue::Null;
    }
    if let NetworkValue::Value(address) = input {
        let mut words: Vec<NetworkWord> = Vec::new();
        let mut index: usize = 0;
        while index < 8 {
            let source = network_address_word(address, index);
            let mut word = 65535 - source;
            if address.family == 4 && index >= 2 {
                word = 0;
            }
            words.push(NetworkWord { value: word });
            index += 1;
        }
        let result = network_result_address(address.family, address.prefix, words);
        return NetworkValue::Value(result);
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__network_cmp__7dun(left: NetworkValue, right: NetworkValue) -> Int4Value {
    network_compare(left, right)
}

fn network_select(left: NetworkValue, right: NetworkValue, larger: bool) -> NetworkValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return NetworkValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return NetworkValue::Unknown;
    }
    if result == Int4Value::Null {
        return NetworkValue::Null;
    }
    if let Int4Value::Value(order) = result {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        }
        return right;
    }
    NetworkValue::Unknown
}

pub fn sql__pg_catalog__network_larger__wb5u(
    left: NetworkValue,
    right: NetworkValue,
) -> NetworkValue {
    network_select(left, right, true)
}

pub fn sql__pg_catalog__network_smaller__nmw8(
    left: NetworkValue,
    right: NetworkValue,
) -> NetworkValue {
    network_select(left, right, false)
}

fn network_hash_bytes(address: NetworkAddress) -> Vec<HashByte> {
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut family: i64 = 2i64;
    let mut word_count: usize = 2;
    if address.family == 6 {
        family = 3i64;
        word_count = 8;
    }
    bytes.push(HashByte { value: family });
    let prefix = address.prefix as i64;
    bytes.push(HashByte { value: prefix });
    let mut index: usize = 0;
    while index < word_count {
        let word = network_address_word(address, index);
        let high = word / 256;
        let low = word % 256;
        let high_byte = high as i64;
        let low_byte = low as i64;
        bytes.push(HashByte { value: high_byte });
        bytes.push(HashByte { value: low_byte });
        index += 1;
    }
    bytes
}

pub fn sql__pg_catalog__hashinet__fhly(input: NetworkValue) -> Int4Value {
    if let NetworkValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == NetworkValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == NetworkValue::Null {
        return Int4Value::Null;
    }
    if let NetworkValue::Value(address) = input {
        let bytes = network_hash_bytes(address);
        let hash = hash_bytes32(bytes);
        return Int4Value::Value(hash);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashinetextended__n7xh(left: NetworkValue, right: Int8Value) -> Int8Value {
    if let NetworkValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == NetworkValue::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == NetworkValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let NetworkValue::Value(address) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = network_hash_bytes(address);
            let hash = hash_bytes64(bytes, seed);
            return Int8Value::Value(hash);
        }
    }
    Int8Value::Unknown
}
