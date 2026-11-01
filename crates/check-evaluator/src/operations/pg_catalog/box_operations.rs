fn box_coordinate_relation(a: f64, b: f64, mode: i32) -> bool {
    if mode == 0 {
        return a + 0.000001f64 < b;
    };
    if mode == 1 {
        return a <= b + 0.000001f64;
    };
    if mode == 2 {
        return a > b + 0.000001f64;
    };
    a + 0.000001f64 >= b
}
fn box_spatial_relation(left: BoxValue, right: BoxValue, mode: i32) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = left { unresolved_flavor = 1; };
    if let BoxValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let BoxValue::Unknown = right { unresolved_flavor = 1; };
    if let BoxValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let BoxValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoxValue::Unimplemented = right { unresolved_flavor = 2; };
    let status = box_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    if let BoxValue::Value(a) = left {
        if let BoxValue::Value(b) = right {
            let ahx = float8_number(a.high_x);
            let ahy = float8_number(a.high_y);
            let alx = float8_number(a.low_x);
            let aly = float8_number(a.low_y);
            let bhx = float8_number(b.high_x);
            let bhy = float8_number(b.high_y);
            let blx = float8_number(b.low_x);
            let bly = float8_number(b.low_y);
            if mode == 0 {
                return make_bool_value(
                    box_coordinate_relation(alx, bhx, 1)
                        && box_coordinate_relation(blx, ahx, 1)
                        && box_coordinate_relation(aly, bhy, 1)
                        && box_coordinate_relation(bly, ahy, 1),
                );
            };
            if mode == 1 {
                return make_bool_value(box_coordinate_relation(ahx, blx, 0));
            };
            if mode == 2 {
                return make_bool_value(box_coordinate_relation(alx, bhx, 2));
            };
            if mode == 3 {
                return make_bool_value(box_coordinate_relation(ahx, bhx, 1));
            };
            if mode == 4 {
                return make_bool_value(box_coordinate_relation(alx, blx, 3));
            };
            if mode == 5 {
                return make_bool_value(box_coordinate_relation(ahy, bly, 0));
            };
            if mode == 6 {
                return make_bool_value(box_coordinate_relation(aly, bhy, 2));
            };
            if mode == 7 {
                return make_bool_value(box_coordinate_relation(ahy, bhy, 1));
            };
            if mode == 8 {
                return make_bool_value(box_coordinate_relation(aly, bly, 3));
            };
            if mode == 9 {
                return make_bool_value(
                    box_coordinate_relation(ahx, bhx, 3)
                        && box_coordinate_relation(alx, blx, 1)
                        && box_coordinate_relation(ahy, bhy, 3)
                        && box_coordinate_relation(aly, bly, 1),
                );
            };
            if mode == 10 {
                return make_bool_value(box_coordinate_relation(ahy, bly, 1));
            };
            return make_bool_value(box_coordinate_relation(aly, bhy, 3));
        };
    };
    let mut local_flavor_79_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if local_flavor_79_4 < 1 { local_flavor_79_4 = 1; }; }; if let BoolValue::Unimplemented = status { local_flavor_79_4 = 2; }; bool_unresolved(local_flavor_79_4)
}
fn box_from_scalars(
    high_x: Float8Value,
    high_y: Float8Value,
    low_x: Float8Value,
    low_y: Float8Value,
) -> BoxValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = high_x { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = high_x { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = high_y { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = high_y { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = low_x { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = low_x { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = low_y { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = low_y { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unimplemented = high_x { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = high_y { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = low_x { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = low_y { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = high_x {
        return BoxValue::Error(error);
    };
    if let Float8Value::Error(error) = high_y {
        return BoxValue::Error(error);
    };
    if let Float8Value::Error(error) = low_x {
        return BoxValue::Error(error);
    };
    if let Float8Value::Error(error) = low_y {
        return BoxValue::Error(error);
    };
    let mut condition_flavor_108_4: i32 = unresolved_flavor; if let Float8Value::Unknown = high_x { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let Float8Value::Unimplemented = high_x { condition_flavor_108_4 = 2; }; if let Float8Value::Unknown = high_y { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let Float8Value::Unimplemented = high_y { condition_flavor_108_4 = 2; }; if let Float8Value::Unknown = low_x { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let Float8Value::Unimplemented = low_x { condition_flavor_108_4 = 2; }; if let Float8Value::Unknown = low_y { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let Float8Value::Unimplemented = low_y { condition_flavor_108_4 = 2; }; if (high_x == Float8Value::Unknown || high_x == Float8Value::Unimplemented)
        || (high_y == Float8Value::Unknown || high_y == Float8Value::Unimplemented)
        || (low_x == Float8Value::Unknown || low_x == Float8Value::Unimplemented)
        || (low_y == Float8Value::Unknown || low_y == Float8Value::Unimplemented)
    {
        return box_unresolved(condition_flavor_108_4);
    };
    if high_x == Float8Value::Null
        || high_y == Float8Value::Null
        || low_x == Float8Value::Null
        || low_y == Float8Value::Null
    {
        return BoxValue::Null;
    };
    let hx = float8_semantic(high_x);
    let hy = float8_semantic(high_y);
    let lx = float8_semantic(low_x);
    let ly = float8_semantic(low_y);
    if let Float8Value::Value(a) = hx {
        if let Float8Value::Value(b) = hy {
            if let Float8Value::Value(c) = lx {
                if let Float8Value::Value(d) = ly {
                    return BoxValue::Value(BoxPayload {
                        high_x: a,
                        high_y: b,
                        low_x: c,
                        low_y: d,
                        wire_known: high_x != Float8Value::UnspecifiedNan
                            && high_y != Float8Value::UnspecifiedNan
                            && low_x != Float8Value::UnspecifiedNan
                            && low_y != Float8Value::UnspecifiedNan,
                    });
                };
            };
        };
    };
    let mut local_flavor_144_4: i32 = unresolved_flavor; if let Float8Value::Unknown = ly { if local_flavor_144_4 < 1 { local_flavor_144_4 = 1; }; }; if let Float8Value::Unimplemented = ly { local_flavor_144_4 = 2; }; if let Float8Value::Unknown = lx { if local_flavor_144_4 < 1 { local_flavor_144_4 = 1; }; }; if let Float8Value::Unimplemented = lx { local_flavor_144_4 = 2; }; if let Float8Value::Unknown = hy { if local_flavor_144_4 < 1 { local_flavor_144_4 = 1; }; }; if let Float8Value::Unimplemented = hy { local_flavor_144_4 = 2; }; if let Float8Value::Unknown = hx { if local_flavor_144_4 < 1 { local_flavor_144_4 = 1; }; }; if let Float8Value::Unimplemented = hx { local_flavor_144_4 = 2; }; box_unresolved(local_flavor_144_4)
}
fn box_merge(left: BoxValue, right: BoxValue, intersection: bool) -> BoxValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = left { unresolved_flavor = 1; };
    if let BoxValue::NonNull = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let BoxValue::Unknown = right { unresolved_flavor = 1; };
    if let BoxValue::NonNull = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let BoxValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoxValue::Unimplemented = right { unresolved_flavor = 2; };
    let status = box_pair_status(left, right);
    if let BoolValue::Error(error) = status {
        return BoxValue::Error(error);
    };
    let mut condition_flavor_156_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if condition_flavor_156_4 < 1 { condition_flavor_156_4 = 1; }; }; if let BoolValue::Unimplemented = status { condition_flavor_156_4 = 2; }; if (status == BoolValue::Unknown || status == BoolValue::Unimplemented) {
        return box_unresolved(condition_flavor_156_4);
    };
    if status == BoolValue::Null {
        return BoxValue::Null;
    };
    if intersection && box_spatial_relation(left, right, 0) == BoolValue::Value(false) {
        return BoxValue::Null;
    };
    if let BoxValue::Value(a) = left {
        if let BoxValue::Value(b) = right {
            if intersection {
                return box_from_scalars(
                    sql__pg_catalog__float8smaller__sp3n(box_scalar(a, 0), box_scalar(b, 0)),
                    sql__pg_catalog__float8smaller__sp3n(box_scalar(a, 1), box_scalar(b, 1)),
                    sql__pg_catalog__float8larger__b58s(box_scalar(a, 2), box_scalar(b, 2)),
                    sql__pg_catalog__float8larger__b58s(box_scalar(a, 3), box_scalar(b, 3)),
                );
            };
            return box_from_scalars(
                sql__pg_catalog__float8larger__b58s(box_scalar(a, 0), box_scalar(b, 0)),
                sql__pg_catalog__float8larger__b58s(box_scalar(a, 1), box_scalar(b, 1)),
                sql__pg_catalog__float8smaller__sp3n(box_scalar(a, 2), box_scalar(b, 2)),
                sql__pg_catalog__float8smaller__sp3n(box_scalar(a, 3), box_scalar(b, 3)),
            );
        };
    };
    box_unresolved(unresolved_flavor)
}
fn box_point_status(input: BoxValue, point: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let BoxValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_197_4: i32 = unresolved_flavor; if let BoxValue::Unknown = input { if condition_flavor_197_4 < 1 { condition_flavor_197_4 = 1; }; }; if let BoxValue::Unimplemented = input { condition_flavor_197_4 = 2; }; if let PointValue::Unknown = point { if condition_flavor_197_4 < 1 { condition_flavor_197_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_197_4 = 2; }; if (input == BoxValue::Unknown || input == BoxValue::Unimplemented) || (point == PointValue::Unknown || point == PointValue::Unimplemented) {
        return bool_unresolved(condition_flavor_197_4);
    };
    if input == BoxValue::Null || point == PointValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn box_segment_status(input: BoxValue, segment: LsegValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let LsegValue::Unknown = segment { unresolved_flavor = 1; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let LsegValue::Unimplemented = segment { unresolved_flavor = 2; };
    if let BoxValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_217_4: i32 = unresolved_flavor; if let BoxValue::Unknown = input { if condition_flavor_217_4 < 1 { condition_flavor_217_4 = 1; }; }; if let BoxValue::Unimplemented = input { condition_flavor_217_4 = 2; }; if let LsegValue::Unknown = segment { if condition_flavor_217_4 < 1 { condition_flavor_217_4 = 1; }; }; if let LsegValue::Unimplemented = segment { condition_flavor_217_4 = 2; }; if (input == BoxValue::Unknown || input == BoxValue::Unimplemented) || (segment == LsegValue::Unknown || segment == LsegValue::Unimplemented) {
        return bool_unresolved(condition_flavor_217_4);
    };
    if input == BoxValue::Null || segment == LsegValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn box_arithmetic(input: BoxValue, point: PointValue, mode: i32) -> BoxValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    let status = box_point_status(input, point);
    if let BoolValue::Error(error) = status {
        return BoxValue::Error(error);
    };
    let mut condition_flavor_235_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if condition_flavor_235_4 < 1 { condition_flavor_235_4 = 1; }; }; if let BoolValue::Unimplemented = status { condition_flavor_235_4 = 2; }; if (status == BoolValue::Unknown || status == BoolValue::Unimplemented) {
        return box_unresolved(condition_flavor_235_4);
    };
    if status == BoolValue::Null {
        return BoxValue::Null;
    };
    let mut high = box_endpoint(input, false);
    let mut low = box_endpoint(input, true);
    if mode == 0 {
        high = sql__pg_catalog__point_add__gn1v(high, point);
        low = sql__pg_catalog__point_add__gn1v(low, point);
    };
    if mode == 1 {
        high = sql__pg_catalog__point_sub__o53k(high, point);
        low = sql__pg_catalog__point_sub__o53k(low, point);
    };
    if mode == 2 {
        high = sql__pg_catalog__point_mul__9izx(high, point);
        low = sql__pg_catalog__point_mul__9izx(low, point);
    };
    if mode == 3 {
        high = sql__pg_catalog__point_div__btbo(high, point);
        low = sql__pg_catalog__point_div__btbo(low, point);
    };
    if mode >= 2 {
        return box_from_points(high, low, false);
    };
    if let PointValue::Error(error) = high {
        return BoxValue::Error(error);
    };
    if let PointValue::Error(error) = low {
        return BoxValue::Error(error);
    };
    let mut condition_flavor_268_4: i32 = unresolved_flavor; if let PointValue::Unknown = high { if condition_flavor_268_4 < 1 { condition_flavor_268_4 = 1; }; }; if let PointValue::Unimplemented = high { condition_flavor_268_4 = 2; }; if let PointValue::Unknown = low { if condition_flavor_268_4 < 1 { condition_flavor_268_4 = 1; }; }; if let PointValue::Unimplemented = low { condition_flavor_268_4 = 2; }; if (high == PointValue::Unknown || high == PointValue::Unimplemented) || (low == PointValue::Unknown || low == PointValue::Unimplemented) {
        return box_unresolved(condition_flavor_268_4);
    };
    if let PointValue::Value(a) = high {
        if let PointValue::Value(b) = low {
            return BoxValue::Value(BoxPayload {
                high_x: a.x,
                high_y: a.y,
                low_x: b.x,
                low_y: b.y,
                wire_known: a.wire_known && b.wire_known,
            });
        };
    };
    box_unresolved(unresolved_flavor)
}
fn box_contains_point(input: BoxValue, point: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    let status = box_point_status(input, point);
    if status != BoolValue::Value(true) {
        return status;
    };
    if let BoxValue::Value(a) = input {
        if let PointValue::Value(p) = point {
            let x = float8_number(p.x);
            let y = float8_number(p.y);
            return make_bool_value(
                float8_number(a.high_x) >= x
                    && float8_number(a.low_x) <= x
                    && float8_number(a.high_y) >= y
                    && float8_number(a.low_y) <= y,
            );
        };
    };
    let mut local_flavor_306_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if local_flavor_306_4 < 1 { local_flavor_306_4 = 1; }; }; if let BoolValue::Unimplemented = status { local_flavor_306_4 = 2; }; bool_unresolved(local_flavor_306_4)
}
fn box_contains_segment(input: BoxValue, segment: LsegValue) -> BoolValue {
    let status = box_segment_status(input, segment);
    if status != BoolValue::Value(true) {
        return status;
    };
    let first = box_contains_point(input, lseg_endpoint(segment, false));
    if first != BoolValue::Value(true) {
        return first;
    };
    box_contains_point(input, lseg_endpoint(segment, true))
}
fn box_corner(input: BoxValue, high_x: bool, high_y: bool) -> PointValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoxValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == BoxValue::Null {
        return PointValue::Null;
    };
    if let BoxValue::Value(value) = input {
        let mut x = box_scalar(value, 2);
        let mut y = box_scalar(value, 3);
        if high_x {
            x = box_scalar(value, 0);
        };
        if high_y {
            y = box_scalar(value, 1);
        };
        return sql__pg_catalog__point__db27(x, y);
    };
    point_unresolved(unresolved_flavor)
}
fn box_boundary_segment(input: BoxValue, index: i32) -> LsegValue {
    let mut first = box_endpoint(input, true);
    let mut second = box_corner(input, false, true);
    if index == 1 {
        first = box_endpoint(input, false);
    };
    if index >= 2 {
        second = box_corner(input, true, false);
    };
    if index == 3 {
        first = box_endpoint(input, false);
    };
    sql__pg_catalog__lseg__l9bc(first, second)
}
fn box_segment_bounds(segment: LsegValue) -> BoxValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = segment { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = segment { unresolved_flavor = 2; };
    let first = lseg_endpoint(segment, false);
    let second = lseg_endpoint(segment, true);
    if let PointValue::Value(a) = first {
        if let PointValue::Value(b) = second {
            let ax = line_origin_coordinate(a, false);
            let ay = line_origin_coordinate(a, true);
            let bx = line_origin_coordinate(b, false);
            let by = line_origin_coordinate(b, true);
            return box_from_scalars(
                sql__pg_catalog__float8larger__b58s(ax, bx),
                sql__pg_catalog__float8larger__b58s(ay, by),
                sql__pg_catalog__float8smaller__sp3n(ax, bx),
                sql__pg_catalog__float8smaller__sp3n(ay, by),
            );
        };
    };
    let mut local_flavor_376_4: i32 = unresolved_flavor; if let PointValue::Unknown = second { if local_flavor_376_4 < 1 { local_flavor_376_4 = 1; }; }; if let PointValue::Unimplemented = second { local_flavor_376_4 = 2; }; if let PointValue::Unknown = first { if local_flavor_376_4 < 1 { local_flavor_376_4 = 1; }; }; if let PointValue::Unimplemented = first { local_flavor_376_4 = 2; }; box_unresolved(local_flavor_376_4)
}
#[derive(Clone, Copy)]
struct BoxSegmentIntersection {
    intersects: BoolValue,
    point: PointValue,
}
fn box_cross_segment(
    input: BoxValue,
    segment: LsegValue,
    with_point: bool,
) -> BoxSegmentIntersection {
    let status = box_segment_status(input, segment);
    if status != BoolValue::Value(true) {
        return BoxSegmentIntersection {
            intersects: status,
            point: segment_point_from_status(status),
        };
    };
    let overlap = box_spatial_relation(box_segment_bounds(segment), input, 0);
    if overlap != BoolValue::Value(true) {
        return BoxSegmentIntersection {
            intersects: overlap,
            point: PointValue::Null,
        };
    };
    let mut nearest = PointValue::Null;
    if with_point {
        let projection = segment_project_point(segment, box_midpoint(input));
        let distance = projection.distance;
        if let Float8Value::Error(error) = distance {
            return BoxSegmentIntersection {
                intersects: BoolValue::Error(error),
                point: PointValue::Error(error),
            };
        };
        if (distance == Float8Value::Unknown || distance == Float8Value::Unimplemented) {
            let mut tested_flavor: i32 = 1;
            if distance == Float8Value::Unimplemented {
                tested_flavor = 2;
            };
            return BoxSegmentIntersection {
                intersects: bool_unresolved(tested_flavor),
                point: point_unresolved(tested_flavor),
            };
        };
        nearest = projection.point;
    };
    if box_contains_point(input, lseg_endpoint(segment, false)) == BoolValue::Value(true)
        || box_contains_point(input, lseg_endpoint(segment, true)) == BoolValue::Value(true)
    {
        return BoxSegmentIntersection {
            intersects: make_bool_value(true),
            point: nearest,
        };
    };
    let mut index: i32 = 0;
    while index < 4 {
        let result = segment_intersection(box_boundary_segment(input, index), segment);
        if let PointValue::Error(error) = result {
            return BoxSegmentIntersection {
                intersects: BoolValue::Error(error),
                point: PointValue::Error(error),
            };
        };
        if (result == PointValue::Unknown || result == PointValue::Unimplemented) {
            let mut tested_flavor: i32 = 1;
            if result == PointValue::Unimplemented {
                tested_flavor = 2;
            };
            return BoxSegmentIntersection {
                intersects: bool_unresolved(tested_flavor),
                point: result,
            };
        };
        if result != PointValue::Null {
            return BoxSegmentIntersection {
                intersects: make_bool_value(true),
                point: nearest,
            };
        };
        index = index + 1;
    }
    BoxSegmentIntersection {
        intersects: make_bool_value(false),
        point: nearest,
    }
}
fn box_nearest_point(input: BoxValue, point: PointValue) -> SegmentClosest {
    let status = box_point_status(input, point);
    if status != BoolValue::Value(true) {
        return segment_closest_from_status(status);
    };
    if box_contains_point(input, point) == BoolValue::Value(true) {
        return SegmentClosest {
            point: point,
            distance: make_float8_bits(0i64),
        };
    };
    let mut closest = segment_project_point(box_boundary_segment(input, 0), point);
    let mut index: i32 = 1;
    while index < 4 {
        let distance = closest.distance;
        if let Float8Value::Error(error) = distance {
            return segment_closest_error(Float8Value::Error(error));
        };
        let candidate = segment_project_point(box_boundary_segment(input, index), point);
        closest = segment_choose_closer(closest, candidate);
        index = index + 1;
    }
    closest
}
fn box_nearest_segment(input: BoxValue, segment: LsegValue, with_point: bool) -> SegmentClosest {
    let status = box_segment_status(input, segment);
    if status != BoolValue::Value(true) {
        return segment_closest_from_status(status);
    };
    let crossing = box_cross_segment(input, segment, with_point);
    let intersects = crossing.intersects;
    if intersects == BoolValue::Value(true) {
        return SegmentClosest {
            point: crossing.point,
            distance: make_float8_bits(0i64),
        };
    };
    if intersects != BoolValue::Value(false) {
        return segment_closest_from_status(intersects);
    };
    let mut closest = segment_nearest_pair(box_boundary_segment(input, 0), segment);
    let mut index: i32 = 1;
    while index < 4 {
        let distance = closest.distance;
        if let Float8Value::Error(error) = distance {
            return segment_closest_error(Float8Value::Error(error));
        };
        let candidate = segment_nearest_pair(box_boundary_segment(input, index), segment);
        closest = segment_choose_closer(closest, candidate);
        index = index + 1;
    }
    closest
}
fn box_cross_line(input: BoxValue, line: LineValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let LineValue::Unknown = line { unresolved_flavor = 1; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = line { unresolved_flavor = 2; };
    if let BoxValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = line {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_521_4: i32 = unresolved_flavor; if let BoxValue::Unknown = input { if condition_flavor_521_4 < 1 { condition_flavor_521_4 = 1; }; }; if let BoxValue::Unimplemented = input { condition_flavor_521_4 = 2; }; if let LineValue::Unknown = line { if condition_flavor_521_4 < 1 { condition_flavor_521_4 = 1; }; }; if let LineValue::Unimplemented = line { condition_flavor_521_4 = 2; }; if (input == BoxValue::Unknown || input == BoxValue::Unimplemented) || (line == LineValue::Unknown || line == LineValue::Unimplemented) {
        return bool_unresolved(condition_flavor_521_4);
    };
    if input == BoxValue::Null || line == LineValue::Null {
        return BoolValue::Null;
    };
    let mut index: i32 = 0;
    while index < 4 {
        let mut edge = index;
        if index == 2 {
            edge = 3;
        };
        if index == 3 {
            edge = 2;
        };
        let result = segment_line_intersection(box_boundary_segment(input, edge), line);
        if let PointValue::Error(error) = result {
            return BoolValue::Error(error);
        };
        let mut condition_flavor_540_8: i32 = unresolved_flavor; if let PointValue::Unknown = result { if condition_flavor_540_8 < 1 { condition_flavor_540_8 = 1; }; }; if let PointValue::Unimplemented = result { condition_flavor_540_8 = 2; }; if (result == PointValue::Unknown || result == PointValue::Unimplemented) {
            return bool_unresolved(condition_flavor_540_8);
        };
        if result != PointValue::Null {
            return make_bool_value(true);
        };
        index = index + 1;
    }
    make_bool_value(false)
}
pub fn sql__pg_catalog__box_overlap__ke99(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 0)
}
pub fn sql__pg_catalog__box_left__pkjo(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 1)
}
pub fn sql__pg_catalog__box_right__51o4(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 2)
}
pub fn sql__pg_catalog__box_overleft__cbam(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 3)
}
pub fn sql__pg_catalog__box_overright__bi52(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 4)
}
pub fn sql__pg_catalog__box_below__jzrh(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 5)
}
pub fn sql__pg_catalog__box_above__co7p(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 6)
}
pub fn sql__pg_catalog__box_overbelow__253r(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 7)
}
pub fn sql__pg_catalog__box_overabove__picd(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 8)
}
pub fn sql__pg_catalog__box_contain__umn5(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 9)
}
pub fn sql__pg_catalog__box_below_eq__bszx(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 10)
}
pub fn sql__pg_catalog__box_above_eq__lb7p(left: BoxValue, right: BoxValue) -> BoolValue {
    box_spatial_relation(left, right, 11)
}
pub fn sql__pg_catalog__box_contained__1foj(left: BoxValue, right: BoxValue) -> BoolValue {
    if let BoxValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    box_spatial_relation(right, left, 9)
}
pub fn sql__pg_catalog__box_intersect__pguz(left: BoxValue, right: BoxValue) -> BoxValue {
    box_merge(left, right, true)
}
pub fn sql__pg_catalog__bound_box__pdui(left: BoxValue, right: BoxValue) -> BoxValue {
    box_merge(left, right, false)
}
pub fn sql__pg_catalog__box_contain_pt__cl1s(input: BoxValue, point: PointValue) -> BoolValue {
    box_contains_point(input, point)
}
pub fn sql__pg_catalog__on_pb__onpy(point: PointValue, input: BoxValue) -> BoolValue {
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    box_contains_point(input, point)
}
pub fn sql__pg_catalog__on_sb__ikrp(segment: LsegValue, input: BoxValue) -> BoolValue {
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    box_contains_segment(input, segment)
}
pub fn sql__pg_catalog__inter_sb__00p9(segment: LsegValue, input: BoxValue) -> BoolValue {
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    let result = box_cross_segment(input, segment, false);
    result.intersects
}
pub fn sql__pg_catalog__inter_lb__8epe(line: LineValue, input: BoxValue) -> BoolValue {
    if let LineValue::Error(error) = line {
        return BoolValue::Error(error);
    };
    box_cross_line(input, line)
}
pub fn sql__pg_catalog__dist_bp__8z9j(input: BoxValue, point: PointValue) -> Float8Value {
    let result = box_nearest_point(input, point);
    result.distance
}
pub fn sql__pg_catalog__dist_pb__gozn(point: PointValue, input: BoxValue) -> Float8Value {
    if let PointValue::Error(error) = point {
        return Float8Value::Error(error);
    };
    let result = box_nearest_point(input, point);
    result.distance
}
pub fn sql__pg_catalog__dist_bs__0xdc(input: BoxValue, segment: LsegValue) -> Float8Value {
    let result = box_nearest_segment(input, segment, false);
    result.distance
}
pub fn sql__pg_catalog__dist_sb__rivn(segment: LsegValue, input: BoxValue) -> Float8Value {
    if let LsegValue::Error(error) = segment {
        return Float8Value::Error(error);
    };
    let result = box_nearest_segment(input, segment, false);
    result.distance
}
pub fn sql__pg_catalog__close_pb__0i2v(point: PointValue, input: BoxValue) -> PointValue {
    if let PointValue::Error(error) = point {
        return PointValue::Error(error);
    };
    segment_closest_point(box_nearest_point(input, point))
}
pub fn sql__pg_catalog__close_sb__cisb(segment: LsegValue, input: BoxValue) -> PointValue {
    if let LsegValue::Error(error) = segment {
        return PointValue::Error(error);
    };
    segment_closest_point(box_nearest_segment(input, segment, true))
}
pub fn sql__pg_catalog__center__nbhw(input: BoxValue) -> PointValue {
    box_midpoint(input)
}
pub fn sql__pg_catalog__box_add__bz3t(input: BoxValue, point: PointValue) -> BoxValue {
    box_arithmetic(input, point, 0)
}
pub fn sql__pg_catalog__box_sub__h1ef(input: BoxValue, point: PointValue) -> BoxValue {
    box_arithmetic(input, point, 1)
}
pub fn sql__pg_catalog__box_mul__uc1y(input: BoxValue, point: PointValue) -> BoxValue {
    box_arithmetic(input, point, 2)
}
pub fn sql__pg_catalog__box_div__ehko(input: BoxValue, point: PointValue) -> BoxValue {
    box_arithmetic(input, point, 3)
}
