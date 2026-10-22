fn polygon_path_bounds(bounds: BoxValue, path: &PathPayload) -> BoxValue {
    // Ambiguous zero or NaN bits do not change the extrema's numeric comparisons.
    if bounds == BoxValue::NonNull || bounds == BoxValue::Unknown {
        return path_bounds(path);
    };
    bounds
}

fn polygon_direction(left: PolygonValue, right: PolygonValue, mode: i32) -> BoolValue {
    if let PolygonValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let PolygonValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let PolygonValue::Unknown = left { return BoolValue::Unknown; };
    if let PolygonValue::Unknown = right { return BoolValue::Unknown; };
    if let PolygonValue::Null = left { return BoolValue::Null; };
    if let PolygonValue::Null = right { return BoolValue::Null; };
    if let PolygonValue::Value(a) = left {
        if let PolygonValue::Value(b) = right {
            let a_bounds = a.bounds;
            let b_bounds = b.bounds;
            let a_path = PathPayload { closed: true, points: a.points };
            let b_path = PathPayload { closed: true, points: b.points };
            let first = polygon_path_bounds(a_bounds, &a_path);
            let second = polygon_path_bounds(b_bounds, &b_path);
            let status = box_pair_status(first, second);
            if status != BoolValue::Value(true) { return status; };
            if let BoxValue::Value(x) = first {
                if let BoxValue::Value(y) = second {
                    if mode == 0 { return make_bool_value(float8_number(x.high_x) < float8_number(y.low_x)); };
                    if mode == 1 { return make_bool_value(float8_number(x.high_x) <= float8_number(y.high_x)); };
                    if mode == 2 { return make_bool_value(float8_number(x.low_x) > float8_number(y.high_x)); };
                    if mode == 3 { return make_bool_value(float8_number(x.low_x) >= float8_number(y.low_x)); };
                    if mode == 4 { return make_bool_value(float8_number(x.high_y) < float8_number(y.low_y)); };
                    if mode == 5 { return make_bool_value(float8_number(x.high_y) <= float8_number(y.high_y)); };
                    if mode == 6 { return make_bool_value(float8_number(x.low_y) > float8_number(y.high_y)); };
                    return make_bool_value(float8_number(x.low_y) >= float8_number(y.low_y));
                };
            };
        };
    };
    BoolValue::Unknown
}

fn polygon_paths_overlap(
    a: &PathPayload,
    b: &PathPayload,
    a_bounds: BoxValue,
    b_bounds: BoxValue,
) -> BoolValue {
    if a.points.len() == 0 || b.points.len() == 0 { return BoolValue::Unknown; };
    let bounds = sql__pg_catalog__box_overlap__ke99(
        polygon_path_bounds(a_bounds, a), polygon_path_bounds(b_bounds, b),
    );
    if bounds != BoolValue::Value(true) { return bounds; };
    let mut before_i = a.points.len() - 1;
    let mut i: usize = 0;
    while i < a.points.len() {
        let first = path_segment(a.points[before_i], a.points[i]);
        let mut before_j = b.points.len() - 1;
        let mut j: usize = 0;
        while j < b.points.len() {
            let second = path_segment(b.points[before_j], b.points[j]);
            let crossing = sql__pg_catalog__lseg_intersect__ovab(first, second);
            if crossing != BoolValue::Value(false) { return crossing; };
            before_j = j;
            j += 1;
        }
        before_i = i;
        i += 1;
    }
    let inside = closed_path_contains(a.points[0], b);
    if inside != BoolValue::Value(false) { return inside; };
    closed_path_contains(b.points[0], a)
}

fn polygon_touched_segment(
    a: PointPayload,
    b: PointPayload,
    edge_start: PointPayload,
    edge_end: PointPayload,
    polygon: &PathPayload,
    start: usize,
) -> BoolValue {
    let segment = path_segment(a, b);
    if point_same_value(a, edge_start) {
        let contains = segment_contains_point(segment, PointValue::Value(edge_end));
        if contains == BoolValue::Value(true) {
            return polygon_segment_inside(b, edge_end, polygon, start);
        };
        if contains != BoolValue::Value(false) { return contains; };
        return make_bool_value(true);
    };
    if point_same_value(a, edge_end) {
        let contains = segment_contains_point(segment, PointValue::Value(edge_start));
        if contains == BoolValue::Value(true) {
            return polygon_segment_inside(b, edge_start, polygon, start);
        };
        if contains != BoolValue::Value(false) { return contains; };
        return make_bool_value(true);
    };
    let first = segment_contains_point(segment, PointValue::Value(edge_start));
    if first == BoolValue::Value(true) {
        return polygon_segment_inside(b, edge_start, polygon, start);
    };
    if first != BoolValue::Value(false) { return first; };
    let second = segment_contains_point(segment, PointValue::Value(edge_end));
    if second == BoolValue::Value(true) {
        return polygon_segment_inside(b, edge_end, polygon, start);
    };
    if second != BoolValue::Value(false) { return second; };
    make_bool_value(true)
}

fn polygon_segment_inside(a: PointPayload, b: PointPayload, polygon: &PathPayload, start: usize) -> BoolValue {
    let segment = path_segment(a, b);
    let mut previous = polygon.points.len() - 1;
    if start > 0 { previous = start - 1; };
    let mut result = make_bool_value(true);
    let mut intersection = false;
    let mut index = start;
    while index < polygon.points.len() && result == BoolValue::Value(true) {
        let edge_start = polygon.points[previous];
        let edge_end = polygon.points[index];
        let edge = path_segment(edge_start, edge_end);
        let first = segment_contains_point(edge, PointValue::Value(a));
        if first != BoolValue::Value(false) && first != BoolValue::Value(true) { return first; };
        let second = segment_contains_point(edge, PointValue::Value(b));
        if second != BoolValue::Value(false) && second != BoolValue::Value(true) { return second; };
        if first == BoolValue::Value(true) {
            if second == BoolValue::Value(true) { return make_bool_value(true); };
            result = polygon_touched_segment(a, b, edge_start, edge_end, polygon, index + 1);
        } else if second == BoolValue::Value(true) {
            result = polygon_touched_segment(b, a, edge_start, edge_end, polygon, index + 1);
        } else {
            let point = segment_intersection(segment, edge);
            if let PointValue::Error(error) = point { return BoolValue::Error(error); };
            if point == PointValue::Unknown { return BoolValue::Unknown; };
            if let PointValue::Value(crossing) = point {
                intersection = true;
                result = polygon_segment_inside(a, crossing, polygon, index + 1);
                if result == BoolValue::Value(true) {
                    result = polygon_segment_inside(b, crossing, polygon, index + 1);
                };
            };
        };
        previous = index;
        index += 1;
    }
    if result != BoolValue::Value(true) { return result; };
    if intersection == false {
        let center = lseg_midpoint(segment);
        if let PointValue::Error(error) = center { return BoolValue::Error(error); };
        if let PointValue::Value(point) = center { return closed_path_contains(point, polygon); };
        return BoolValue::Unknown;
    };
    result
}

fn polygon_relation(left: PolygonValue, right: PolygonValue, contains: bool) -> BoolValue {
    if let PolygonValue::Error(error) = left { return BoolValue::Error(error); };
    if let PolygonValue::Error(error) = right { return BoolValue::Error(error); };
    if let PolygonValue::Unknown = left { return BoolValue::Unknown; };
    if let PolygonValue::Unknown = right { return BoolValue::Unknown; };
    if let PolygonValue::Null = left { return BoolValue::Null; };
    if let PolygonValue::Null = right { return BoolValue::Null; };
    if let PolygonValue::Value(a) = left {
        if let PolygonValue::Value(b) = right {
            let a_bounds = a.bounds;
            let b_bounds = b.bounds;
            let a_path = PathPayload { closed: true, points: a.points };
            let b_path = PathPayload { closed: true, points: b.points };
            if contains == false { return polygon_paths_overlap(&a_path, &b_path, a_bounds, b_bounds); };
            let status = sql__pg_catalog__box_contain__umn5(
                polygon_path_bounds(a_bounds, &a_path), polygon_path_bounds(b_bounds, &b_path),
            );
            if status != BoolValue::Value(true) { return status; };
            if a_path.points.len() == 0 || b_path.points.len() == 0 { return BoolValue::Unknown; };
            let mut previous = b_path.points.len() - 1;
            let mut index: usize = 0;
            while index < b_path.points.len() {
                let inside = polygon_segment_inside(b_path.points[previous], b_path.points[index], &a_path, 0);
                if inside != BoolValue::Value(true) { return inside; };
                previous = index;
                index += 1;
            }
            return make_bool_value(true);
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__poly_left__edyv(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 0) }
pub fn sql__pg_catalog__poly_overleft__2595(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 1) }
pub fn sql__pg_catalog__poly_right__rfp3(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 2) }
pub fn sql__pg_catalog__poly_overright__4ll9(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 3) }
pub fn sql__pg_catalog__poly_below__vrta(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 4) }
pub fn sql__pg_catalog__poly_overbelow__egnd(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 5) }
pub fn sql__pg_catalog__poly_above__9pai(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 6) }
pub fn sql__pg_catalog__poly_overabove__fw3c(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_direction(left, right, 7) }
pub fn sql__pg_catalog__poly_overlap__saet(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_relation(left, right, false) }
pub fn sql__pg_catalog__poly_contain__eas0(left: PolygonValue, right: PolygonValue) -> BoolValue { polygon_relation(left, right, true) }
pub fn sql__pg_catalog__poly_contained__kcqs(left: PolygonValue, right: PolygonValue) -> BoolValue {
    if let PolygonValue::Error(error) = left { return BoolValue::Error(error); };
    polygon_relation(right, left, true)
}
pub fn sql__pg_catalog__spg_poly_quad_compress__xme5(input: PolygonValue) -> BoxValue { sql__pg_catalog__box__j3b7(input) }
