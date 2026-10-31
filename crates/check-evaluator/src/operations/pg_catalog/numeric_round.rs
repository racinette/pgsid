pub fn sql__pg_catalog__ceil__8geh(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_6_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_6_0 < 1 { condition_flavor_6_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_6_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_6_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
return numeric_work_round(work, 0, 2);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__ceiling__pr5v(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_21_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_21_0 < 1 { condition_flavor_21_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_21_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_21_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
return numeric_work_round(work, 0, 2);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__floor__x7mh(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_36_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_36_0 < 1 { condition_flavor_36_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_36_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_36_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
return numeric_work_round(work, 0, 3);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__round__mmpo(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_51_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_51_0 < 1 { condition_flavor_51_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_51_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_51_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
return numeric_work_round(work, 0, 1);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__round__otcq(input: NumericValue, scale: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = scale { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = scale { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
let mut condition_flavor_69_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_69_0 < 1 { condition_flavor_69_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_69_0 = 2; }; if let Int4Value::Unknown = scale { if condition_flavor_69_0 < 1 { condition_flavor_69_0 = 1; }; }; if let Int4Value::Unimplemented = scale { condition_flavor_69_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) || (scale == Int4Value::Unknown || scale == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_69_0); }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 1); }
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trunc__dghz(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_84_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_84_0 < 1 { condition_flavor_84_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_84_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_84_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
return numeric_work_round(work, 0, 0);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trunc__hay3(input: NumericValue, scale: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = scale { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = scale { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
let mut condition_flavor_102_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_102_0 < 1 { condition_flavor_102_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_102_0 = 2; }; if let Int4Value::Unknown = scale { if condition_flavor_102_0 < 1 { condition_flavor_102_0 = 1; }; }; if let Int4Value::Unimplemented = scale { condition_flavor_102_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) || (scale == Int4Value::Unknown || scale == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_102_0); }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 0); }
}
numeric_unresolved(unresolved_flavor)
}
