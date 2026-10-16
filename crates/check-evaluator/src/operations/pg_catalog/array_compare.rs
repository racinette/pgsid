fn array_comparison_boolean(input: Int4Value, strategy: i32) -> BoolValue {
    if let Int4Value::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let Int4Value::Unknown = input {
        return BoolValue::Unknown;
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
    BoolValue::Unknown
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
