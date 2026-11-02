fn array_comparison_boolean(input: Int4Value, strategy: i32) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let Int4Value::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let Int4Value::Unimplemented = input { condition_flavor_8_4 = 2; }; if input == Int4Value::Unknown || input == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_8_4);
    };
    if let Int4Value::Null = input {
        return BoolValue::Null;
    };
    if let Int4Value::Value(value) = input {
        if strategy == 1 {
            return BoolValue::Value(value < 0);
        };
        if strategy == 2 {
            return BoolValue::Value(value <= 0);
        };
        if strategy == 3 {
            return BoolValue::Value(value == 0);
        };
        if strategy == 4 {
            return BoolValue::Value(value >= 0);
        };
        if strategy == 5 {
            return BoolValue::Value(value > 0);
        };
        return BoolValue::Value(value != 0);
    };
    bool_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__array_eq__3awo(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 3)
}
pub fn sql__pg_catalog__array_ne__4nzg(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 6)
}
pub fn sql__pg_catalog__array_lt__tefm(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 1)
}
pub fn sql__pg_catalog__array_le__oyzm(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 2)
}
pub fn sql__pg_catalog__array_gt__3l95(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 5)
}
pub fn sql__pg_catalog__array_ge__2z0c(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 4)
}
pub fn sql__pg_catalog__btarraycmp__bmnb(input: Int4Value) -> Int4Value {
    input
}

pub fn sql__pg_catalog__width_bucket__ecky(input: Int4Value) -> Int4Value {
    input
}

pub fn sql__pg_catalog__arraycontains__ipqq(input: BoolValue) -> BoolValue {
    input
}
pub fn sql__pg_catalog__arraycontained__uyb2(input: BoolValue) -> BoolValue {
    input
}
pub fn sql__pg_catalog__arrayoverlap__lwrw(input: BoolValue) -> BoolValue {
    input
}

fn array_select_extreme(
    left: ArrayValue,
    right: ArrayValue,
    ordering: Int4Value,
    larger: bool,
) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = left { unresolved_flavor = 1; };
    if let ArrayValue::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unknown = ordering { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = left { unresolved_flavor = 2; };
    if let ArrayValue::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = ordering { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = left {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Error(error) = right {
        return ArrayValue::Error(error);
    };
    if let Int4Value::Error(error) = ordering {
        return ArrayValue::Error(error);
    };
    if let Int4Value::Null = ordering {
        return ArrayValue::Null;
    };
    if let Int4Value::Value(order) = ordering {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        };
        return right;
    };
    array_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__array_larger__9l3m(
    left: ArrayValue,
    right: ArrayValue,
    ordering: Int4Value,
) -> ArrayValue {
    array_select_extreme(left, right, ordering, true)
}

pub fn sql__pg_catalog__array_smaller__xp88(
    left: ArrayValue,
    right: ArrayValue,
    ordering: Int4Value,
) -> ArrayValue {
    array_select_extreme(left, right, ordering, false)
}
