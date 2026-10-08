pub fn sql__pg_catalog__abs__m5ih(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
if sign < 0 { sign = 1; }
if special == 0 { special = 2; }
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__min_scale__b8o1(input: NumericValue) -> Int4Value {
if let NumericValue::Error(error) = input { return Int4Value::Error(error); }
if input == NumericValue::Unknown { return Int4Value::Unknown; }
if input == NumericValue::Null { return Int4Value::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return Int4Value::Unknown; }
if work.special != 1 { return Int4Value::Null; }
return Int4Value::Value(numeric_work_min_scale(work));
}
Int4Value::Unknown
}

pub fn sql__pg_catalog__numeric_abs__6g5e(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
if sign < 0 { sign = 1; }
if special == 0 { special = 2; }
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric_cmp__6h4s(input: NumericValue, right: NumericValue) -> Int4Value {
let result = numeric_compare(input.clone(), right.clone());
return result;
}

pub fn sql__pg_catalog__numeric_larger__4j2h(input: NumericValue, right: NumericValue) -> NumericValue {
let result = numeric_compare(input.clone(), right.clone());
if let Int4Value::Error(error) = result { return NumericValue::Error(error); }
if result == Int4Value::Unknown { return NumericValue::Unknown; }
if result == Int4Value::Null { return NumericValue::Null; }
if let Int4Value::Value(order) = result { if order > 0 { return input; } return right; }
NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric_smaller__b9i1(input: NumericValue, right: NumericValue) -> NumericValue {
let result = numeric_compare(input.clone(), right.clone());
if let Int4Value::Error(error) = result { return NumericValue::Error(error); }
if result == Int4Value::Unknown { return NumericValue::Unknown; }
if result == Int4Value::Null { return NumericValue::Null; }
if let Int4Value::Value(order) = result { if order < 0 { return input; } return right; }
NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric_uminus__wcmy(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
sign = 0 - sign;
if special == 0 { special = 2; } else if special == 2 { special = 0; };
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric_uplus__2a0z(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
let special = work.special;
let sign = work.sign;
let output_scale = work.scale;
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__scale__svql(input: NumericValue) -> Int4Value {
if let NumericValue::Error(error) = input { return Int4Value::Error(error); }
if input == NumericValue::Unknown { return Int4Value::Unknown; }
if input == NumericValue::Null { return Int4Value::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return Int4Value::Unknown; }
if work.special != 1 { return Int4Value::Null; }
return Int4Value::Value(work.scale);
}
Int4Value::Unknown
}

pub fn sql__pg_catalog__sign__2rsu(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
if work.special == 3 { return NumericValue::Value("NaN".to_owned()); }
if work.special == 0 || work.sign < 0 { return NumericValue::Value("-1".to_owned()); }
if work.special == 2 || work.sign > 0 { return NumericValue::Value("1".to_owned()); }
return NumericValue::Value("0".to_owned());
}
NumericValue::Unknown
}

pub fn sql__pg_catalog__trim_scale__3rbp(input: NumericValue) -> NumericValue {
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if input == NumericValue::Unknown { return NumericValue::Unknown; }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return NumericValue::Unknown; }
let special = work.special;
let sign = work.sign;
let output_scale = numeric_work_min_scale(work.clone());
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
NumericValue::Unknown
}
