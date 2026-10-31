pub fn sql__pg_catalog__ceil__8geh(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return numeric_unresolved(unresolved_flavor); }
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
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return numeric_unresolved(unresolved_flavor); }
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
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return numeric_unresolved(unresolved_flavor); }
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
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return numeric_unresolved(unresolved_flavor); }
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
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
if input == NumericValue::Unknown || scale == Int4Value::Unknown { return numeric_unresolved(unresolved_flavor); }
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
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return numeric_unresolved(unresolved_flavor); }
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
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
if input == NumericValue::Unknown || scale == Int4Value::Unknown { return numeric_unresolved(unresolved_flavor); }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 0); }
}
numeric_unresolved(unresolved_flavor)
}
