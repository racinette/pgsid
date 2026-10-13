fn value_order_finish(result: Int4Value, strategy: i32) -> BoolValue {
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        if strategy == 0 {
            return BoolValue::Value(order == 0);
        }
        if strategy == 1 {
            return BoolValue::Value(order != 0);
        }
        if strategy == 2 {
            return BoolValue::Value(order < 0);
        }
        if strategy == 3 {
            return BoolValue::Value(order <= 0);
        }
        if strategy == 4 {
            return BoolValue::Value(order > 0);
        }
        if strategy == 5 {
            return BoolValue::Value(order >= 0);
        }
    };
    BoolValue::Unknown
}

