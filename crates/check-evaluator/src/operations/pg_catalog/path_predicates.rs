fn path_bounds(path: PathPayload) -> BoxValue {
    if path.points.len() == 0 {
        return BoxValue::Unknown;
    };
    let first = path.points[0];
    let mut high_x = first.x;
    let mut high_y = first.y;
    let mut low_x = first.x;
    let mut low_y = first.y;
    let mut index: usize = 1;
    while index < path.points.len() {
        let point = path.points[index];
        if sql__pg_catalog__float8gt__m76q(make_float8_bits(point.x), make_float8_bits(high_x))
            == BoolValue::Value(true)
        {
            high_x = point.x;
        };
        if sql__pg_catalog__float8gt__m76q(make_float8_bits(point.y), make_float8_bits(high_y))
            == BoolValue::Value(true)
        {
            high_y = point.y;
        };
        if sql__pg_catalog__float8lt__vp07(make_float8_bits(point.x), make_float8_bits(low_x))
            == BoolValue::Value(true)
        {
            low_x = point.x;
        };
        if sql__pg_catalog__float8lt__vp07(make_float8_bits(point.y), make_float8_bits(low_y))
            == BoolValue::Value(true)
        {
            low_y = point.y;
        };
        index += 1;
    }
    BoxValue::Value(BoxPayload {
        high_x,
        high_y,
        low_x,
        low_y,
        wire_known: false,
    })
}
pub fn sql__pg_catalog__path_inter__6pqp(left: PathValue, right: PathValue) -> BoolValue {
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
            let overlap =
                sql__pg_catalog__box_overlap__ke99(path_bounds(a.clone()), path_bounds(b.clone()));
            if overlap != BoolValue::Value(true) {
                return overlap;
            };
            let mut i: usize = 0;
            if a.closed == false {
                i = 1;
            };
            while i < a.points.len() {
                let mut before_i = a.points.len() - 1;
                if i > 0 {
                    before_i = i - 1;
                };
                let mut j: usize = 0;
                if b.closed == false {
                    j = 1;
                };
                while j < b.points.len() {
                    let mut before_j = b.points.len() - 1;
                    if j > 0 {
                        before_j = j - 1;
                    };
                    let first = path_segment(a.points[before_i], a.points[i]);
                    let second = path_segment(b.points[before_j], b.points[j]);
                    let result = sql__pg_catalog__lseg_intersect__ovab(first, second);
                    if result != BoolValue::Value(false) {
                        return result;
                    };
                    j += 1;
                }
                i += 1;
            }
            return make_bool_value(false);
        };
    };
    BoolValue::Unknown
}
fn path_axis_crossing(x: f64, y: f64, previous_x: f64, previous_y: f64) -> Int4Value {
    if geometric_coordinate_equal(y, 0.0f64) {
        if geometric_coordinate_equal(x, 0.0f64) {
            return make_int4_value(2147483647);
        };
        if box_coordinate_relation(x, 0.0f64, 2) {
            if geometric_coordinate_equal(previous_y, 0.0f64) {
                if box_coordinate_relation(previous_x, 0.0f64, 2) {
                    return make_int4_value(0);
                };
                return make_int4_value(2147483647);
            };
            if box_coordinate_relation(previous_y, 0.0f64, 0) {
                return make_int4_value(1);
            };
            return make_int4_value(-1);
        };
        if geometric_coordinate_equal(previous_y, 0.0f64) {
            if box_coordinate_relation(previous_x, 0.0f64, 0) {
                return make_int4_value(0);
            };
            return make_int4_value(2147483647);
        };
        return make_int4_value(0);
    };
    let mut direction: i32 = -1;
    if box_coordinate_relation(y, 0.0f64, 2) {
        direction = 1;
    };
    if geometric_coordinate_equal(previous_y, 0.0f64) {
        if box_coordinate_relation(previous_x, 0.0f64, 0) {
            return make_int4_value(0);
        };
        return make_int4_value(direction);
    };
    if (direction < 0 && box_coordinate_relation(previous_y, 0.0f64, 0))
        || (direction > 0 && box_coordinate_relation(previous_y, 0.0f64, 2))
    {
        return make_int4_value(0);
    };
    if box_coordinate_relation(x, 0.0f64, 3) && box_coordinate_relation(previous_x, 0.0f64, 2) {
        return make_int4_value(2 * direction);
    };
    if box_coordinate_relation(x, 0.0f64, 0) && box_coordinate_relation(previous_x, 0.0f64, 1) {
        return make_int4_value(0);
    };
    let first = sql__pg_catalog__float8mul__d3nd(
        sql__pg_catalog__float8mi__r1nu(make_float8_value(x), make_float8_value(previous_x)),
        make_float8_value(y),
    );
    if let Float8Value::Error(error) = first {
        return Int4Value::Error(error);
    };
    let second = sql__pg_catalog__float8mul__d3nd(
        sql__pg_catalog__float8mi__r1nu(make_float8_value(y), make_float8_value(previous_y)),
        make_float8_value(x),
    );
    let difference = sql__pg_catalog__float8mi__r1nu(first, second);
    if let Float8Value::Error(error) = difference {
        return Int4Value::Error(error);
    };
    let known_difference = float8_semantic(difference);
    if let Float8Value::Value(bits) = known_difference {
        let z = float8_number(bits);
        if geometric_coordinate_equal(z, 0.0f64) {
            return make_int4_value(2147483647);
        };
        if (direction < 0 && box_coordinate_relation(z, 0.0f64, 0))
            || (direction > 0 && box_coordinate_relation(z, 0.0f64, 2))
        {
            return make_int4_value(0);
        };
        return make_int4_value(2 * direction);
    };
    Int4Value::Unknown
}
fn closed_path_contains(point: PointPayload, path: PathPayload) -> BoolValue {
    let first = sql__pg_catalog__point_sub__o53k(
        PointValue::Value(path.points[0]),
        PointValue::Value(point),
    );
    if let PointValue::Error(error) = first {
        return BoolValue::Error(error);
    };
    if let PointValue::Value(start) = first {
        let mut previous = start;
        let mut total: i32 = 0;
        let mut index: usize = 1;
        while index <= path.points.len() {
            let mut next = PointValue::Value(start);
            if index < path.points.len() {
                next = sql__pg_catalog__point_sub__o53k(
                    PointValue::Value(path.points[index]),
                    PointValue::Value(point),
                );
            };
            if let PointValue::Error(error) = next {
                return BoolValue::Error(error);
            };
            let mut advanced = false;
            if let PointValue::Value(current) = next {
                let cross = path_axis_crossing(
                    float8_number(current.x),
                    float8_number(current.y),
                    float8_number(previous.x),
                    float8_number(previous.y),
                );
                if let Int4Value::Error(error) = cross {
                    return BoolValue::Error(error);
                };
                let mut crossing_known = false;
                if let Int4Value::Value(count) = cross {
                    if count == 2147483647 {
                        return make_bool_value(true);
                    };
                    total = total + count;
                    crossing_known = true;
                };
                if crossing_known == false {
                    return BoolValue::Unknown;
                };
                previous = current;
                advanced = true;
            };
            if advanced == false {
                return BoolValue::Unknown;
            };
            index += 1;
        }
        return make_bool_value(total != 0);
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__on_ppath__8fo6(point: PointValue, input: PathValue) -> BoolValue {
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    if let PathValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if point == PointValue::Unknown {
        return BoolValue::Unknown;
    };
    if let PathValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if point == PointValue::Null {
        return BoolValue::Null;
    };
    if let PathValue::Null = input {
        return BoolValue::Null;
    };
    if let PathValue::Value(path) = input {
        if path.points.len() == 0 {
            return BoolValue::Unknown;
        };
        if let PointValue::Value(position) = point {
            if path.closed {
                return closed_path_contains(position, path);
            };
            let mut previous =
                sql__pg_catalog__point_distance__2haq(point, PointValue::Value(path.points[0]));
            if let Float8Value::Error(error) = previous {
                return BoolValue::Error(error);
            };
            let mut index: usize = 1;
            while index < path.points.len() {
                let next = sql__pg_catalog__point_distance__2haq(
                    point,
                    PointValue::Value(path.points[index]),
                );
                let sum = sql__pg_catalog__float8pl__g3ou(previous, next);
                if let Float8Value::Error(error) = sum {
                    return BoolValue::Error(error);
                };
                let edge = sql__pg_catalog__point_distance__2haq(
                    PointValue::Value(path.points[index - 1]),
                    PointValue::Value(path.points[index]),
                );
                if let Float8Value::Error(error) = edge {
                    return BoolValue::Error(error);
                };
                let mut compared = false;
                let known_sum = float8_semantic(sum);
                if let Float8Value::Value(a) = known_sum {
                    let known_edge = float8_semantic(edge);
                    if let Float8Value::Value(b) = known_edge {
                        if geometric_coordinate_equal(float8_number(a), float8_number(b)) {
                            return make_bool_value(true);
                        };
                        compared = true;
                    };
                };
                if compared == false {
                    return BoolValue::Unknown;
                };
                previous = next;
                index += 1;
            }
            return make_bool_value(false);
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__path_contain_pt__ltus(input: PathValue, point: PointValue) -> BoolValue {
    if let PathValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    sql__pg_catalog__on_ppath__8fo6(point, input)
}
