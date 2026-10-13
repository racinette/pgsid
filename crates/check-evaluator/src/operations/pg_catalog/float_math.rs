const FLOAT_SQRT_ARGUMENT: u32 = 3452595;

pub fn sql__pg_catalog__dsqrt__5pmk(input: Float8Value) -> Float8Value {
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number < 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_SQRT_ARGUMENT));
        };
        let result = number.sqrt();
        let infinity = 1.0f64 / 0.0f64;
        if result.abs() == infinity && number.abs() != infinity {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if result == 0.0f64 && number != 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        return make_float8_value(result);
    };
    input
}

pub fn sql__pg_catalog__sqrt__l707(input: Float8Value) -> Float8Value {
    sql__pg_catalog__dsqrt__5pmk(input)
}
