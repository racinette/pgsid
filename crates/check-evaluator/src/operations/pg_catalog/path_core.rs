fn path_cardinality_relation(left: PathValue, right: PathValue, mode: i32) -> BoolValue {
    if let PathValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let PathValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let PathValue::Unknown = left {
        return BoolValue::Unknown;
    };
    if let PathValue::Unknown = right {
        return BoolValue::Unknown;
    };
    if let PathValue::Null = left {
        return BoolValue::Null;
    };
    if let PathValue::Null = right {
        return BoolValue::Null;
    };
    if let PathValue::Value(a) = left {
        if let PathValue::Value(b) = right {
            let x = a.points.len();
            let y = b.points.len();
            if mode == 0 {
                return make_bool_value(x == y);
            };
            if mode == 1 {
                return make_bool_value(x < y);
            };
            if mode == 2 {
                return make_bool_value(x > y);
            };
            if mode == 3 {
                return make_bool_value(x <= y);
            };
            return make_bool_value(x >= y);
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__path_n_eq__5m92(left: PathValue, right: PathValue) -> BoolValue {
    path_cardinality_relation(left, right, 0)
}
pub fn sql__pg_catalog__path_n_lt__7sim(left: PathValue, right: PathValue) -> BoolValue {
    path_cardinality_relation(left, right, 1)
}
pub fn sql__pg_catalog__path_n_gt__rggu(left: PathValue, right: PathValue) -> BoolValue {
    path_cardinality_relation(left, right, 2)
}
pub fn sql__pg_catalog__path_n_le__60qb(left: PathValue, right: PathValue) -> BoolValue {
    path_cardinality_relation(left, right, 3)
}
pub fn sql__pg_catalog__path_n_ge__tah4(left: PathValue, right: PathValue) -> BoolValue {
    path_cardinality_relation(left, right, 4)
}
pub fn sql__pg_catalog__isclosed__j43z(input: PathValue) -> BoolValue {
    if let PathValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let PathValue::Null = input {
        return BoolValue::Null;
    };
    if let PathValue::Value(path) = input {
        return make_bool_value(path.closed);
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__isopen__kqm6(input: PathValue) -> BoolValue {
    sql__pg_catalog__boolne__zlce(
        sql__pg_catalog__isclosed__j43z(input),
        make_bool_value(true),
    )
}
pub fn sql__pg_catalog__npoints__0pt7(input: PathValue) -> Int4Value {
    if let PathValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let PathValue::Null = input {
        return Int4Value::Null;
    };
    if let PathValue::Value(path) = input {
        return make_int4_value(path.points.len() as i32);
    };
    Int4Value::Unknown
}
pub fn sql__pg_catalog__path_npoints__pyxd(input: PathValue) -> Int4Value {
    sql__pg_catalog__npoints__0pt7(input)
}
fn path_set_closed(input: PathValue, closed: bool) -> PathValue {
    if let PathValue::Value(path) = input {
        return PathValue::Value(PathPayload {
            closed: closed,
            points: path.points,
        });
    };
    input
}
pub fn sql__pg_catalog__popen__wy9h(input: PathValue) -> PathValue {
    path_set_closed(input, false)
}
pub fn sql__pg_catalog__pclose__17wh(input: PathValue) -> PathValue {
    path_set_closed(input, true)
}
pub fn sql__pg_catalog__path_send__tszn(input: PathValue) -> ByteaValue {
    if let PathValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let PathValue::Null = input {
        return ByteaValue::Null;
    };
    if let PathValue::Value(path) = input {
        let maximum = usize::try_from((BYTEA_MAX_LENGTH - 5) / 16).unwrap_or(0);
        if path.points.len() > maximum {
            return ByteaValue::Error(make_sql_error(BYTEA_ALLOCATION_ERROR));
        };
        let mut output = String::new();
        if path.closed {
            output.push_str("01");
        } else {
            output.push_str("00");
        };
        let count = binary_send_bits(make_int8_value(path.points.len() as i32 as i64), 4);
        if let ByteaValue::Value(bytes) = count {
            output.push_str(bytes.as_str());
        };
        let mut index: usize = 0;
        while index < path.points.len() {
            let point = PointValue::Value(path.points[index]);
            let encoded = sql__pg_catalog__point_send__kuoa(point);
            if let ByteaValue::Error(error) = encoded {
                return ByteaValue::Error(error);
            };
            if let ByteaValue::Unspecified(_) = encoded {
                let length: i32 = 5 + (path.points.len() as i32) * 16;
                return ByteaValue::Unspecified(length);
            };
            if encoded == ByteaValue::Unknown || encoded == ByteaValue::Null {
                return ByteaValue::Unknown;
            };
            if let ByteaValue::Value(bytes) = encoded {
                output.push_str(bytes.as_str());
            };
            index += 1;
        }
        return ByteaValue::Value(output);
    };
    ByteaValue::Unknown
}
pub fn sql__pg_catalog__path_length__fjk7(input: PathValue) -> Float8Value {
    if let PathValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if let PathValue::Null = input {
        return Float8Value::Null;
    };
    if let PathValue::Value(path) = input {
        let mut result = make_float8_value(0.0f64);
        let mut index: usize = 0;
        if path.closed == false {
            index = 1;
        };
        while index < path.points.len() {
            let mut previous = path.points.len() - 1;
            if index > 0 {
                previous = index - 1;
            };
            let distance = sql__pg_catalog__point_distance__2haq(
                PointValue::Value(path.points[previous]),
                PointValue::Value(path.points[index]),
            );
            result = sql__pg_catalog__float8pl__g3ou(result, distance);
            if let Float8Value::Error(error) = result {
                return Float8Value::Error(error);
            };
            index += 1;
        }
        return box_computed_scalar(result);
    };
    Float8Value::Unknown
}
pub fn sql__pg_catalog__length__jatg(input: PathValue) -> Float8Value {
    sql__pg_catalog__path_length__fjk7(input)
}
pub fn sql__pg_catalog__area__ph6t(input: PathValue) -> Float8Value {
    if let PathValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if let PathValue::Null = input {
        return Float8Value::Null;
    };
    if let PathValue::Value(path) = input {
        if path.closed == false {
            return Float8Value::Null;
        };
        let mut result = make_float8_value(0.0f64);
        let mut index: usize = 0;
        while index < path.points.len() {
            let mut next = index + 1;
            if next == path.points.len() {
                next = 0;
            };
            let first = sql__pg_catalog__float8mul__d3nd(
                line_origin_coordinate(path.points[index], false),
                line_origin_coordinate(path.points[next], true),
            );
            result = sql__pg_catalog__float8pl__g3ou(result, first);
            if let Float8Value::Error(error) = result {
                return Float8Value::Error(error);
            };
            let second = sql__pg_catalog__float8mul__d3nd(
                line_origin_coordinate(path.points[index], true),
                line_origin_coordinate(path.points[next], false),
            );
            result = sql__pg_catalog__float8mi__r1nu(result, second);
            if let Float8Value::Error(error) = result {
                return Float8Value::Error(error);
            };
            index += 1;
        }
        let absolute = sql__pg_catalog__float8abs__fq86(result);
        return box_computed_scalar(sql__pg_catalog__float8div__kumj(
            absolute,
            make_float8_value(2.0f64),
        ));
    };
    Float8Value::Unknown
}
