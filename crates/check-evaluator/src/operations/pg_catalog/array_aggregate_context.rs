const ARRAY_AGGREGATE_CONTEXT_ERROR: u32 = 56966976;

pub fn sql__pg_catalog__int4_avg_combine__gmvg(left: ArrayValue, right: ArrayValue) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = left { unresolved_flavor = 1; };
    if let ArrayValue::Unknown = right { unresolved_flavor = 1; };
    if let ArrayValue::Error(error) = left {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Error(error) = right {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = left {
        return ArrayValue::Null;
    };
    if let ArrayValue::Null = right {
        return ArrayValue::Null;
    };
    if let ArrayValue::Value(_) = left {
        if let ArrayValue::Value(_) = right {
            return ArrayValue::Error(make_sql_error(ARRAY_AGGREGATE_CONTEXT_ERROR));
        };
    };
    array_unresolved(unresolved_flavor)
}
