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
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = current { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = current { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = candidate { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = candidate { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unimplemented = current { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = candidate { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = candidate {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_19_4: i32 = unresolved_flavor; if let Float8Value::Unknown = candidate { if condition_flavor_19_4 < 1 { condition_flavor_19_4 = 1; }; }; if let Float8Value::Unimplemented = candidate { condition_flavor_19_4 = 2; }; if candidate == Float8Value::Unknown || candidate == Float8Value::Unimplemented {
        return float8_unresolved(condition_flavor_19_4);
    };
    if first || sql__pg_catalog__float8lt__vp07(candidate, current) == BoolValue::Value(true) {
        return candidate;
    };
    current
}
pub fn sql__pg_catalog__dist_ppath__e16q(point: PointValue, input: PathValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let PathValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let PathValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Error(error) = point {
        return Float8Value::Error(error);
    };
    if let PathValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_39_4: i32 = unresolved_flavor; if let PointValue::Unknown = point { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_39_4 = 2; }; if point == PointValue::Unknown || point == PointValue::Unimplemented {
        return float8_unresolved(condition_flavor_39_4);
    };
    let mut condition_flavor_42_4: i32 = unresolved_flavor; if let PathValue::Unknown = input { if condition_flavor_42_4 < 1 { condition_flavor_42_4 = 1; }; }; if let PathValue::Unknown = input {
        return float8_unresolved(condition_flavor_42_4);
    }; let mut condition_flavor_44_7: i32 = unresolved_flavor; if let PathValue::Unimplemented = input { condition_flavor_44_7 = 2; }; if let PathValue::Unimplemented = input {
        return float8_unresolved(condition_flavor_44_7);
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
            let mut condition_flavor_71_12: i32 = unresolved_flavor; if let Float8Value::Unknown = result { if condition_flavor_71_12 < 1 { condition_flavor_71_12 = 1; }; }; if let Float8Value::Unimplemented = result { condition_flavor_71_12 = 2; }; if result == Float8Value::Unknown || result == Float8Value::Unimplemented {
                return float8_unresolved(condition_flavor_71_12);
            };
            have_min = true;
            index += 1;
        }
        return box_computed_scalar(result);
    };
    float8_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__dist_pathp__9d28(input: PathValue, point: PointValue) -> Float8Value {
    if let PathValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    sql__pg_catalog__dist_ppath__e16q(point, input)
}
pub fn sql__pg_catalog__path_distance__3309(left: PathValue, right: PathValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let PathValue::Unknown = left { unresolved_flavor = 1; };
    if let PathValue::Unknown = right { unresolved_flavor = 1; };
    if let PathValue::Unimplemented = left { unresolved_flavor = 2; };
    if let PathValue::Unimplemented = right { unresolved_flavor = 2; };
    if let PathValue::Error(error) = left {
        return Float8Value::Error(error);
    };
    if let PathValue::Error(error) = right {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_99_4: i32 = unresolved_flavor; if let PathValue::Unknown = left { if condition_flavor_99_4 < 1 { condition_flavor_99_4 = 1; }; }; if let PathValue::Unknown = left {
        return float8_unresolved(condition_flavor_99_4);
    }; let mut condition_flavor_101_7: i32 = unresolved_flavor; if let PathValue::Unimplemented = left { condition_flavor_101_7 = 2; }; if let PathValue::Unimplemented = left {
        return float8_unresolved(condition_flavor_101_7);
    };
    let mut condition_flavor_104_4: i32 = unresolved_flavor; if let PathValue::Unknown = right { if condition_flavor_104_4 < 1 { condition_flavor_104_4 = 1; }; }; if let PathValue::Unknown = right {
        return float8_unresolved(condition_flavor_104_4);
    }; let mut condition_flavor_106_7: i32 = unresolved_flavor; if let PathValue::Unimplemented = right { condition_flavor_106_7 = 2; }; if let PathValue::Unimplemented = right {
        return float8_unresolved(condition_flavor_106_7);
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
                    let mut condition_flavor_144_20: i32 = unresolved_flavor; if let Float8Value::Unknown = result { if condition_flavor_144_20 < 1 { condition_flavor_144_20 = 1; }; }; if let Float8Value::Unimplemented = result { condition_flavor_144_20 = 2; }; if result == Float8Value::Unknown || result == Float8Value::Unimplemented {
                        return float8_unresolved(condition_flavor_144_20);
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
    float8_unresolved(unresolved_flavor)
}
