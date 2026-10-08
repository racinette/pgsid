pub fn sql__pg_catalog__ceil__8geh(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
return numeric_work_round(work, 0, 2);
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__ceiling__pr5v(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
return numeric_work_round(work, 0, 2);
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__floor__x7mh(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
return numeric_work_round(work, 0, 3);
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__round__mmpo(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
return numeric_work_round(work, 0, 1);
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__round__otcq(input: NumericValue, scale: Int4Value) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
if input == NumericValue::Unknown || scale == Int4Value::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 1); }
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__trunc__dghz(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
return numeric_work_round(work, 0, 0);
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__trunc__hay3(input: NumericValue, scale: Int4Value) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
if input == NumericValue::Unknown || scale == Int4Value::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 0); }
}
NumericValue::Unknown
}
