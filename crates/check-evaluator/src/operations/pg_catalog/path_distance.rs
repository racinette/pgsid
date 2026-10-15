fn path_segment(first: PointPayload, second: PointPayload) -> LsegValue {
    LsegValue::Value(LsegPayload {
        x1: first.x,
        y1: first.y,
        x2: second.x,
        y2: second.y,
        wire_known: first.wire_known && second.wire_known,
    })
}
fn path_min_distance(current: Float8Value, candidate: Float8Value, first: bool) -> Float8Value {
    if let Float8Value::Error(error) = candidate {
        return Float8Value::Error(error);
    };
    if candidate == Float8Value::Unknown {
        return Float8Value::Unknown;
    };
    if first || sql__pg_catalog__float8lt__vp07(candidate, current) == BoolValue::Value(true) {
        return candidate;
    };
    current
}
pub fn sql__pg_catalog__dist_ppath__e16q(point: PointValue, input: PathValue) -> Float8Value {
    if let PointValue::Error(error) = point {
        return Float8Value::Error(error);
    };
    if let PathValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if point == PointValue::Unknown {
        return Float8Value::Unknown;
    };
    if let PathValue::Unknown = input {
        return Float8Value::Unknown;
    };
    if point == PointValue::Null {
        return Float8Value::Null;
    };
    if let PathValue::Null = input {
        return Float8Value::Null;
    };
    if let PathValue::Value(path) = input {
        let mut result = make_float8_value(0.0f64);
        let mut have_min = false;
        let mut index: usize = 0;
        if path.closed == false {
            index = 1;
        };
        while index < path.points.len() {
            let mut previous = path.points.len() - 1;
            if index > 0 {
                previous = index - 1;
            };
            let segment = path_segment(path.points[previous], path.points[index]);
            let distance = sql__pg_catalog__dist_sp__3dia(segment, point);
            result = path_min_distance(result, distance, have_min == false);
            if let Float8Value::Error(error) = result {
                return Float8Value::Error(error);
            };
            if result == Float8Value::Unknown {
                return Float8Value::Unknown;
            };
            have_min = true;
            index += 1;
        }
        return box_computed_scalar(result);
    };
    Float8Value::Unknown
}
pub fn sql__pg_catalog__dist_pathp__9d28(input: PathValue, point: PointValue) -> Float8Value {
    if let PathValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    sql__pg_catalog__dist_ppath__e16q(point, input)
}
pub fn sql__pg_catalog__path_distance__3309(left: PathValue, right: PathValue) -> Float8Value {
    if let PathValue::Error(error) = left {
        return Float8Value::Error(error);
    };
    if let PathValue::Error(error) = right {
        return Float8Value::Error(error);
    };
    if let PathValue::Unknown = left {
        return Float8Value::Unknown;
    };
    if let PathValue::Unknown = right {
        return Float8Value::Unknown;
    };
    if let PathValue::Null = left {
        return Float8Value::Null;
    };
    if let PathValue::Null = right {
        return Float8Value::Null;
    };
    if let PathValue::Value(a) = left {
        if let PathValue::Value(b) = right {
            let mut result = make_float8_value(0.0f64);
            let mut have_min = false;
            let mut first: usize = 0;
            if a.closed == false {
                first = 1;
            };
            while first < a.points.len() {
                let mut first_previous = a.points.len() - 1;
                if first > 0 {
                    first_previous = first - 1;
                };
                let mut second: usize = 0;
                if b.closed == false {
                    second = 1;
                };
                while second < b.points.len() {
                    let mut second_previous = b.points.len() - 1;
                    if second > 0 {
                        second_previous = second - 1;
                    };
                    let aa = path_segment(a.points[first_previous], a.points[first]);
                    let bb = path_segment(b.points[second_previous], b.points[second]);
                    let distance = sql__pg_catalog__lseg_distance__dgev(aa, bb);
                    result = path_min_distance(result, distance, have_min == false);
                    if let Float8Value::Error(error) = result {
                        return Float8Value::Error(error);
                    };
                    if result == Float8Value::Unknown {
                        return Float8Value::Unknown;
                    };
                    have_min = true;
                    second += 1;
                }
                first += 1;
            }
            if have_min == false {
                return Float8Value::Null;
            };
            return box_computed_scalar(result);
        };
    };
    Float8Value::Unknown
}
