pub fn sql__pg_catalog__abs__m5ih(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
let mut condition_flavor_6_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_6_0 < 1 { condition_flavor_6_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_6_0 = 2; }; if numeric_unknown_input_1 || numeric_unimplemented_input_2 { return numeric_unresolved(condition_flavor_6_0); }
let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
if numeric_null_input_3 { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
return NumericValue::Value(numeric_var_absolute(value));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__min_scale__b8o1(input: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return Int4Value::Error(error); }
let mut numeric_unknown_input_4 = false; if let NumericValue::Unknown = input { numeric_unknown_input_4 = true; }; let mut numeric_unimplemented_input_5 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_5 = true; };
let mut condition_flavor_26_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_26_0 < 1 { condition_flavor_26_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_26_0 = 2; }; if numeric_unknown_input_4 || numeric_unimplemented_input_5 { return int4_unresolved(condition_flavor_26_0); }
let mut numeric_null_input_6 = false; if let NumericValue::Null = input { numeric_null_input_6 = true; };
if numeric_null_input_6 { return Int4Value::Null; }
if let NumericValue::Value(value) = input {
if numeric_var_kind(&value) != 1 { return Int4Value::Null; }
return Int4Value::Value(numeric_var_min_scale(&value));
}
int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_abs__6g5e(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_7 = false; if let NumericValue::Unknown = input { numeric_unknown_input_7 = true; }; let mut numeric_unimplemented_input_8 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_8 = true; };
let mut condition_flavor_42_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_42_0 < 1 { condition_flavor_42_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_42_0 = 2; }; if numeric_unknown_input_7 || numeric_unimplemented_input_8 { return numeric_unresolved(condition_flavor_42_0); }
let mut numeric_null_input_9 = false; if let NumericValue::Null = input { numeric_null_input_9 = true; };
if numeric_null_input_9 { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
return NumericValue::Value(numeric_var_absolute(value));
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
let mut condition_flavor_70_0: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_70_0 < 1 { condition_flavor_70_0 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_70_0 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented { return numeric_unresolved(condition_flavor_70_0); }
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
let mut condition_flavor_84_0: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_84_0 < 1 { condition_flavor_84_0 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_84_0 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented { return numeric_unresolved(condition_flavor_84_0); }
if result == Int4Value::Null { return NumericValue::Null; }
if let Int4Value::Value(order) = result { if order < 0 { return input; } return right; }
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_uminus__wcmy(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_10 = false; if let NumericValue::Unknown = input { numeric_unknown_input_10 = true; }; let mut numeric_unimplemented_input_11 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_11 = true; };
let mut condition_flavor_95_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_95_0 < 1 { condition_flavor_95_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_95_0 = 2; }; if numeric_unknown_input_10 || numeric_unimplemented_input_11 { return numeric_unresolved(condition_flavor_95_0); }
let mut numeric_null_input_12 = false; if let NumericValue::Null = input { numeric_null_input_12 = true; };
if numeric_null_input_12 { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
return NumericValue::Value(numeric_var_negated(value));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_uplus__2a0z(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_13 = false; if let NumericValue::Unknown = input { numeric_unknown_input_13 = true; }; let mut numeric_unimplemented_input_14 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_14 = true; };
let mut condition_flavor_115_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_115_0 < 1 { condition_flavor_115_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_115_0 = 2; }; if numeric_unknown_input_13 || numeric_unimplemented_input_14 { return numeric_unresolved(condition_flavor_115_0); }
let mut numeric_null_input_15 = false; if let NumericValue::Null = input { numeric_null_input_15 = true; };
if numeric_null_input_15 { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
return NumericValue::Value(value);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__scale__svql(input: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return Int4Value::Error(error); }
let mut numeric_unknown_input_16 = false; if let NumericValue::Unknown = input { numeric_unknown_input_16 = true; }; let mut numeric_unimplemented_input_17 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_17 = true; };
let mut condition_flavor_133_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_133_0 < 1 { condition_flavor_133_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_133_0 = 2; }; if numeric_unknown_input_16 || numeric_unimplemented_input_17 { return int4_unresolved(condition_flavor_133_0); }
let mut numeric_null_input_18 = false; if let NumericValue::Null = input { numeric_null_input_18 = true; };
if numeric_null_input_18 { return Int4Value::Null; }
if let NumericValue::Value(value) = input {
if numeric_var_kind(&value) != 1 { return Int4Value::Null; }
return Int4Value::Value(value.dscale);
}
int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__sign__2rsu(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_19 = false; if let NumericValue::Unknown = input { numeric_unknown_input_19 = true; }; let mut numeric_unimplemented_input_20 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_20 = true; };
let mut condition_flavor_149_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_149_0 < 1 { condition_flavor_149_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_149_0 = 2; }; if numeric_unknown_input_19 || numeric_unimplemented_input_20 { return numeric_unresolved(condition_flavor_149_0); }
let mut numeric_null_input_21 = false; if let NumericValue::Null = input { numeric_null_input_21 = true; };
if numeric_null_input_21 { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let kind = numeric_var_kind(&value);
if kind == 3 { return make_numeric_value("NaN"); }
if kind == 0 || numeric_var_signum(&value) < 0 { return make_numeric_value("-1"); }
if kind == 2 || numeric_var_signum(&value) > 0 { return make_numeric_value("1"); }
return make_numeric_value("0");
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trim_scale__3rbp(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_22 = false; if let NumericValue::Unknown = input { numeric_unknown_input_22 = true; }; let mut numeric_unimplemented_input_23 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_23 = true; };
let mut condition_flavor_167_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_167_0 < 1 { condition_flavor_167_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_167_0 = 2; }; if numeric_unknown_input_22 || numeric_unimplemented_input_23 { return numeric_unresolved(condition_flavor_167_0); }
let mut numeric_null_input_24 = false; if let NumericValue::Null = input { numeric_null_input_24 = true; };
if numeric_null_input_24 { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
if numeric_var_kind(&value) != 1 { return NumericValue::Value(value); }
let min_scale = numeric_var_min_scale(&value);
return NumericValue::Value(numeric_var_rescaled(value, min_scale));
}
numeric_unresolved(unresolved_flavor)
}
