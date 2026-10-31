pub fn sql__pg_catalog__abs__m5ih(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_6_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_6_0 < 1 { condition_flavor_6_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_6_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_6_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
if sign < 0 { sign = 1; }
if special == 0 { special = 2; }
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__min_scale__b8o1(input: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return Int4Value::Error(error); }
let mut condition_flavor_26_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_26_0 < 1 { condition_flavor_26_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_26_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return int4_unresolved(condition_flavor_26_0); }
if input == NumericValue::Null { return Int4Value::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return int4_unresolved(unresolved_flavor); }
if work.special != 1 { return Int4Value::Null; }
return Int4Value::Value(numeric_work_min_scale(work));
}
int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_abs__6g5e(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_42_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_42_0 < 1 { condition_flavor_42_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_42_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_42_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
if sign < 0 { sign = 1; }
if special == 0 { special = 2; }
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_cmp__6h4s(input: NumericValue, right: NumericValue) -> Int4Value {
let result = numeric_compare(input.clone(), right.clone());
return result;
}

pub fn sql__pg_catalog__numeric_larger__4j2h(input: NumericValue, right: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
let result = numeric_compare(input.clone(), right.clone());
if let Int4Value::Error(error) = result { return NumericValue::Error(error); }
let mut condition_flavor_70_0: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_70_0 < 1 { condition_flavor_70_0 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_70_0 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_70_0); }
if result == Int4Value::Null { return NumericValue::Null; }
if let Int4Value::Value(order) = result { if order > 0 { return input; } return right; }
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_smaller__b9i1(input: NumericValue, right: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
let result = numeric_compare(input.clone(), right.clone());
if let Int4Value::Error(error) = result { return NumericValue::Error(error); }
let mut condition_flavor_84_0: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_84_0 < 1 { condition_flavor_84_0 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_84_0 = 2; }; if (result == Int4Value::Unknown || result == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_84_0); }
if result == Int4Value::Null { return NumericValue::Null; }
if let Int4Value::Value(order) = result { if order < 0 { return input; } return right; }
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_uminus__wcmy(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_95_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_95_0 < 1 { condition_flavor_95_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_95_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_95_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
sign = 0 - sign;
if special == 0 { special = 2; } else if special == 2 { special = 0; };
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_uplus__2a0z(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_115_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_115_0 < 1 { condition_flavor_115_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_115_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_115_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let special = work.special;
let sign = work.sign;
let output_scale = work.scale;
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__scale__svql(input: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return Int4Value::Error(error); }
let mut condition_flavor_133_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_133_0 < 1 { condition_flavor_133_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_133_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return int4_unresolved(condition_flavor_133_0); }
if input == NumericValue::Null { return Int4Value::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return int4_unresolved(unresolved_flavor); }
if work.special != 1 { return Int4Value::Null; }
return Int4Value::Value(work.scale);
}
int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__sign__2rsu(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_149_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_149_0 < 1 { condition_flavor_149_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_149_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_149_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if work.special == 3 { return NumericValue::Value("NaN".to_owned()); }
if work.special == 0 || work.sign < 0 { return NumericValue::Value("-1".to_owned()); }
if work.special == 2 || work.sign > 0 { return NumericValue::Value("1".to_owned()); }
return NumericValue::Value("0".to_owned());
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trim_scale__3rbp(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_167_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_167_0 < 1 { condition_flavor_167_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_167_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) { return numeric_unresolved(condition_flavor_167_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let special = work.special;
let sign = work.sign;
let output_scale = numeric_work_min_scale(work.clone());
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}
