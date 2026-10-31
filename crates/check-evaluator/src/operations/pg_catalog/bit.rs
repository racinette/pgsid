fn bit_compare_payload(left: &str, right: &str) -> i32 {
    let a: Vec<char> = left.chars().collect();
    let b: Vec<char> = right.chars().collect();
    let mut index: usize = 0;
    while index < a.len() && index < b.len() {
        let mut left_byte: i32 = 0;
        let mut right_byte: i32 = 0;
        let mut weight: i32 = 128;
        while weight > 0 {
            if index < a.len() {
                if a[index] == '1' {
                    left_byte = left_byte + weight;
                }
            }
            if index < b.len() {
                if b[index] == '1' {
                    right_byte = right_byte + weight;
                }
            }
            weight = weight / 2;
            index += 1;
        }
        if left_byte != right_byte {
            return left_byte - right_byte;
        }
    }
    if a.len() < b.len() {
        return -1;
    }
    if a.len() > b.len() {
        return 1;
    }
    0
}

fn bit_compare(left: BitValue, right: BitValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BitValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let BitValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_48_4: i32 = unresolved_flavor; if let BitValue::Unknown = left { if condition_flavor_48_4 < 1 { condition_flavor_48_4 = 1; }; }; if let BitValue::Unimplemented = left { condition_flavor_48_4 = 2; }; if let BitValue::Unknown = right { if condition_flavor_48_4 < 1 { condition_flavor_48_4 = 1; }; }; if let BitValue::Unimplemented = right { condition_flavor_48_4 = 2; }; if (left == BitValue::Unknown || left == BitValue::Unimplemented) || (right == BitValue::Unknown || right == BitValue::Unimplemented) {
        return int4_unresolved(condition_flavor_48_4);
    }
    if left == BitValue::Null || right == BitValue::Null {
        return Int4Value::Null;
    }
    if let BitValue::Value(a) = left {
        if let BitValue::Value(b) = right {
            let borrowed_a = a.as_str();
            let borrowed_b = b.as_str();
            let result = bit_compare_payload(borrowed_a, borrowed_b);
            return Int4Value::Value(result);
        }
    }
    int4_unresolved(unresolved_flavor)
}

fn bit_length(input: BitValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_72_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_72_4 < 1 { condition_flavor_72_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_72_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) {
        return int4_unresolved(condition_flavor_72_4);
    }
    if input == BitValue::Null {
        return Int4Value::Null;
    }
    if let BitValue::Value(value) = input {
        let borrowed = value.as_str();
        let result = bit_payload_length(borrowed);
        return Int4Value::Value(result);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bit_length__e2i8(input: BitValue) -> Int4Value {
    bit_length(input)
}

pub fn sql__pg_catalog__bitcmp__2r1v(left: BitValue, right: BitValue) -> Int4Value {
    bit_compare(left, right)
}

pub fn sql__pg_catalog__biteq__320u(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_104_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_104_4 < 1 { condition_flavor_104_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_104_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_104_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value == 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bitge__py56(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_126_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_126_4 < 1 { condition_flavor_126_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_126_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_126_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bitgt__2srl(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_148_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_148_4 < 1 { condition_flavor_148_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_148_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_148_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value > 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bitle__y0d7(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_170_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_170_4 < 1 { condition_flavor_170_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_170_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_170_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value <= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bitlt__6ybn(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_192_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_192_4 < 1 { condition_flavor_192_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_192_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_192_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value < 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bitne__xjg3(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_214_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_214_4 < 1 { condition_flavor_214_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_214_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_214_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value != 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__length__r5f9(input: BitValue) -> Int4Value {
    bit_length(input)
}

pub fn sql__pg_catalog__octet_length__acdm(input: BitValue) -> Int4Value {
    let length = bit_length(input);
    if let Int4Value::Value(value) = length {
        let mut result = value / 8;
        if value % 8 != 0 {
            result = result + 1;
        }
        return Int4Value::Value(result);
    }
    length
}

pub fn sql__pg_catalog__varbitcmp__vqwo(left: BitValue, right: BitValue) -> Int4Value {
    bit_compare(left, right)
}

pub fn sql__pg_catalog__varbiteq__d8r9(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_256_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_256_4 < 1 { condition_flavor_256_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_256_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_256_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value == 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__varbitge__3izz(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_278_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_278_4 < 1 { condition_flavor_278_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_278_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_278_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__varbitgt__31v4(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_300_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_300_4 < 1 { condition_flavor_300_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_300_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_300_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value > 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__varbitle__42o0(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_322_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_322_4 < 1 { condition_flavor_322_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_322_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_322_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value <= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__varbitlt__xsv2(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_344_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_344_4 < 1 { condition_flavor_344_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_344_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_344_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value < 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__varbitne__sbck(left: BitValue, right: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = bit_compare(left, right);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_366_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_366_4 < 1 { condition_flavor_366_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_366_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_366_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value != 0);
    }
    bool_unresolved(unresolved_flavor)
}
