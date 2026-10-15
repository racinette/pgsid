const PATH_POINT_COUNT_LIMIT: usize = 134217726;
const PATH_TOO_MANY_POINTS: u32 = 8584704;

fn path_concat_fits(left: usize, right: usize) -> bool {
    left <= PATH_POINT_COUNT_LIMIT && right <= PATH_POINT_COUNT_LIMIT - left
}

fn path_point_transform(input: PathValue, vector: PointValue, mode: i32) -> PathValue {
    if let PathValue::Error(error) = input {
        return PathValue::Error(error);
    };
    if let PointValue::Error(error) = vector {
        return PathValue::Error(error);
    };
    if let PathValue::Unknown = input {
        return PathValue::Unknown;
    };
    if vector == PointValue::Unknown {
        return PathValue::Unknown;
    };
    if let PathValue::Null = input {
        return PathValue::Null;
    };
    if vector == PointValue::Null {
        return PathValue::Null;
    };
    if let PathValue::Value(path) = input {
        let mut points: Vec<PointPayload> = path.points;
        let mut index: usize = 0;
        while index < points.len() {
            let point = point_arithmetic(PointValue::Value(points[index]), vector, mode);
            if let PointValue::Error(error) = point {
                return PathValue::Error(error);
            };
            if point == PointValue::Unknown || point == PointValue::Null {
                return PathValue::Unknown;
            };
            if let PointValue::Value(payload) = point {
                points[index] = payload;
            };
            index += 1;
        }
        return PathValue::Value(PathPayload {
            closed: path.closed,
            points: points,
        });
    };
    PathValue::Unknown
}
pub fn sql__pg_catalog__path_add_pt__9pue(input: PathValue, vector: PointValue) -> PathValue {
    path_point_transform(input, vector, 0)
}
pub fn sql__pg_catalog__path_sub_pt__o445(input: PathValue, vector: PointValue) -> PathValue {
    path_point_transform(input, vector, 1)
}
pub fn sql__pg_catalog__path_mul_pt__dmwn(input: PathValue, vector: PointValue) -> PathValue {
    path_point_transform(input, vector, 2)
}
pub fn sql__pg_catalog__path_div_pt__rwx4(input: PathValue, vector: PointValue) -> PathValue {
    path_point_transform(input, vector, 3)
}
pub fn sql__pg_catalog__path_add__7wkx(left: PathValue, right: PathValue) -> PathValue {
    if let PathValue::Error(error) = left {
        return PathValue::Error(error);
    };
    if let PathValue::Error(error) = right {
        return PathValue::Error(error);
    };
    if let PathValue::Unknown = left {
        return PathValue::Unknown;
    };
    if let PathValue::Unknown = right {
        return PathValue::Unknown;
    };
    if let PathValue::Null = left {
        return PathValue::Null;
    };
    if let PathValue::Null = right {
        return PathValue::Null;
    };
    if let PathValue::Value(a) = left {
        if let PathValue::Value(b) = right {
            if a.closed || b.closed {
                return PathValue::Null;
            };
            if path_concat_fits(a.points.len(), b.points.len()) == false {
                return PathValue::Error(make_sql_error(PATH_TOO_MANY_POINTS));
            };
            let mut points: Vec<PointPayload> = a.points;
            let mut index: usize = 0;
            while index < b.points.len() {
                points.push(b.points[index]);
                index += 1;
            }
            return PathValue::Value(PathPayload {
                closed: false,
                points: points,
            });
        };
    };
    PathValue::Unknown
}
