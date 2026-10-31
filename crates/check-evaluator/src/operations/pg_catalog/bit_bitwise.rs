const BIT_STRING_LENGTH_MISMATCH: u32 = 3452622;
const BIT_MAX_LENGTH: i32 = 2147483640;
const BIT_COMBINE_AND: i32 = 0;
const BIT_COMBINE_OR: i32 = 1;
const BIT_COMBINE_XOR: i32 = 2;

fn bit_combine(left: BitValue, right: BitValue, operation: i32) -> BitValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = left { unresolved_flavor = 1; };
    if let BitValue::Unknown = right { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BitValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BitValue::Error(error) = left {
        return BitValue::Error(error);
    }
    if let BitValue::Error(error) = right {
        return BitValue::Error(error);
    }
    let mut condition_flavor_19_4: i32 = unresolved_flavor; if let BitValue::Unknown = left { if condition_flavor_19_4 < 1 { condition_flavor_19_4 = 1; }; }; if let BitValue::Unimplemented = left { condition_flavor_19_4 = 2; }; if let BitValue::Unknown = right { if condition_flavor_19_4 < 1 { condition_flavor_19_4 = 1; }; }; if let BitValue::Unimplemented = right { condition_flavor_19_4 = 2; }; if (left == BitValue::Unknown || left == BitValue::Unimplemented) || (right == BitValue::Unknown || right == BitValue::Unimplemented) {
        return bit_unresolved(condition_flavor_19_4);
    }
    if left == BitValue::Null || right == BitValue::Null {
        return BitValue::Null;
    }
    if let BitValue::Value(a) = left {
        if let BitValue::Value(b) = right {
            let first: Vec<char> = a.chars().collect();
            let second: Vec<char> = b.chars().collect();
            if first.len() != second.len() {
                return BitValue::Error(make_sql_error(BIT_STRING_LENGTH_MISMATCH));
            }
            let mut output = String::new();
            let mut index: usize = 0;
            while index < first.len() {
                let left_set = first[index] == '1';
                let right_set = second[index] == '1';
                let mut set = left_set && right_set;
                if operation == BIT_COMBINE_OR {
                    set = left_set || right_set;
                }
                if operation == BIT_COMBINE_XOR {
                    set = left_set != right_set;
                }
                if set {
                    output.push('1');
                } else {
                    output.push('0');
                }
                index += 1;
            }
            return BitValue::Value(output);
        }
    }
    bit_unresolved(unresolved_flavor)
}

fn bit_shift(input: BitValue, distance: Int4Value, leftwards: bool) -> BitValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = distance { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = distance { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = distance {
        return BitValue::Error(error);
    }
    let mut condition_flavor_69_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_69_4 < 1 { condition_flavor_69_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_69_4 = 2; }; if let Int4Value::Unknown = distance { if condition_flavor_69_4 < 1 { condition_flavor_69_4 = 1; }; }; if let Int4Value::Unimplemented = distance { condition_flavor_69_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) || (distance == Int4Value::Unknown || distance == Int4Value::Unimplemented) {
        return bit_unresolved(condition_flavor_69_4);
    }
    if input == BitValue::Null || distance == Int4Value::Null {
        return BitValue::Null;
    }
    if let BitValue::Value(value) = input {
        if let Int4Value::Value(amount) = distance {
            let chars: Vec<char> = value.chars().collect();
            let mut magnitude: i32 = amount;
            let mut towards_left = leftwards;
            if magnitude < 0 {
                towards_left = leftwards == false;
                if magnitude < 0 - BIT_MAX_LENGTH {
                    magnitude = 0 - BIT_MAX_LENGTH;
                }
                magnitude = 0 - magnitude;
            }
            let mut offset: usize = 0;
            let mut counted: i32 = 0;
            while offset < chars.len() && counted < magnitude {
                offset += 1;
                counted = counted + 1;
            }
            let mut output = String::new();
            let mut index: usize = 0;
            while index < chars.len() {
                let mut ch = '0';
                if towards_left {
                    if offset < chars.len() - index {
                        ch = chars[index + offset];
                    }
                } else {
                    if index >= offset {
                        ch = chars[index - offset];
                    }
                }
                output.push(ch);
                index += 1;
            }
            return BitValue::Value(output);
        }
    }
    bit_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bitand__mal6(left: BitValue, right: BitValue) -> BitValue {
    bit_combine(left, right, BIT_COMBINE_AND)
}

pub fn sql__pg_catalog__bitor__es93(left: BitValue, right: BitValue) -> BitValue {
    bit_combine(left, right, BIT_COMBINE_OR)
}

pub fn sql__pg_catalog__bitxor__al74(left: BitValue, right: BitValue) -> BitValue {
    bit_combine(left, right, BIT_COMBINE_XOR)
}

pub fn sql__pg_catalog__bitnot__xgta(input: BitValue) -> BitValue {
    if let BitValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut output = String::new();
        let mut index: usize = 0;
        while index < chars.len() {
            if chars[index] == '1' {
                output.push('0');
            } else {
                output.push('1');
            }
            index += 1;
        }
        return BitValue::Value(output);
    }
    input
}

pub fn sql__pg_catalog__bitshiftleft__qf9d(input: BitValue, distance: Int4Value) -> BitValue {
    bit_shift(input, distance, true)
}

pub fn sql__pg_catalog__bitshiftright__hgyn(input: BitValue, distance: Int4Value) -> BitValue {
    bit_shift(input, distance, false)
}
