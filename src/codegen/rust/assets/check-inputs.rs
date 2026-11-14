// How generated CHECK inputs reach the evaluator: each public value becomes the evaluator's value of
// its type as the server would read the parameter, and each result a public one. Pruned with the
// evaluator to what the generated code calls.

/// A value the evaluator reads: unknown and NULL as given, a value through `read`.
pub fn read<T, V>(value: &super::super::CheckValue<T>, unknown: V, null: V, read: impl FnOnce(&T) -> V) -> V {
    match value {
        super::super::CheckValue::Unknown => unknown,
        super::super::CheckValue::Null => null,
        super::super::CheckValue::Value(value) => read(value),
    }
}

/// Whether a value is NULL, unknown where the value is.
pub fn nullness<T>(value: &super::super::CheckValue<T>) -> BoolValue {
    match value {
        super::super::CheckValue::Unknown => BoolValue::Unknown,
        super::super::CheckValue::Null => make_bool_value(true),
        super::super::CheckValue::Value(_) => make_bool_value(false),
    }
}

/// How a given value's reading fails every check that reads it: with the error the server's input
/// raises, or undecided. An unknown value fails nothing before a check reaches it.
pub fn supplied<T>(
    value: &super::super::CheckValue<T>,
    fault: Option<Option<SqlError>>,
) -> Option<Option<SqlError>> {
    match value {
        super::super::CheckValue::Unknown => None,
        _ => fault,
    }
}

fn state_code(error: SqlError) -> String {
    let mut code = String::new();
    let mut state = error.state;
    for _ in 0..5 {
        code.insert(0, std::char::from_digit(state % 36, 36).unwrap().to_ascii_uppercase());
        state /= 36;
    }
    code
}

fn failure(error: SqlError) -> super::super::CheckResult {
    super::super::CheckResult::Error { state: state_code(error), message: sql_error_message(error).message.to_owned() }
}

const UNDECIDED: &str = "A required input is unavailable, or its value or an evaluated expression is not supported.";

fn outcome(value: CheckOutcome, reason: &str) -> super::super::CheckResult {
    match value {
        CheckOutcome::True => super::super::CheckResult::True,
        CheckOutcome::False => super::super::CheckResult::False,
        CheckOutcome::Null => super::super::CheckResult::Null,
        CheckOutcome::Error(error) => failure(error),
        CheckOutcome::Unknown | CheckOutcome::Unimplemented => {
            super::super::CheckResult::Undecided { reason: reason.to_owned() }
        }
    }
}

fn read_fault(faults: &[Option<Option<SqlError>>]) -> Option<super::super::CheckResult> {
    faults.iter().flatten().next().map(|fault| match fault {
        Some(error) => failure(*error),
        None => super::super::CheckResult::Undecided { reason: UNDECIDED.to_owned() },
    })
}

/// A check's result: the first input whose reading fails it, else its evaluation.
pub fn decide(faults: &[Option<Option<SqlError>>], evaluate: impl FnOnce() -> CheckOutcome) -> super::super::CheckResult {
    read_fault(faults).unwrap_or_else(|| outcome(evaluate(), UNDECIDED))
}

/// A check's result where its evaluation says why it is undecided.
pub fn decide_diagnosed(
    faults: &[Option<Option<SqlError>>],
    evaluate: impl FnOnce() -> CheckEvaluationResult,
) -> super::super::CheckResult {
    read_fault(faults).unwrap_or_else(|| {
        let result = evaluate();
        let reason = match check_requirement_message(result.reason) {
            TextValue::Value(reason) => reason,
            _ => UNDECIDED.to_owned(),
        };
        outcome(result.outcome, &reason)
    })
}

pub fn evaluation(
    owner: &'static str,
    constraint: &'static str,
    result: super::super::CheckResult,
) -> super::super::CheckEvaluation {
    super::super::CheckEvaluation { owner, constraint, result }
}

/// Text holding a NUL byte reaches the server as sent, where the encoding decides what it reads.
pub fn text(value: &str) -> TextValue {
    if value.contains('\0') { TextValue::Unknown } else { make_text_value(value) }
}
pub fn name_text(value: &str) -> TextValue {
    if value.contains('\0') { TextValue::Unknown } else { make_name_text_value(value) }
}
pub fn refcursor_text(value: &str) -> TextValue {
    if value.contains('\0') { TextValue::Unknown } else { make_refcursor_text_value(value) }
}

pub fn int2(value: &i16) -> Int2Value {
    make_int2_value(i32::from(*value))
}
pub fn int4(value: &i32) -> Int4Value {
    make_int4_value(*value)
}
pub fn int8(value: &i64) -> Int8Value {
    make_int8_value(*value)
}
pub fn boolean(value: &bool) -> BoolValue {
    make_bool_value(*value)
}
/// Floats keep their exact bits.
pub fn float4(value: &f32) -> Float4Value {
    make_float4_bits(value.to_bits() as i32)
}
pub fn float8(value: &f64) -> Float8Value {
    make_float8_bits(value.to_bits() as i64)
}

/// A numeric holds numeric output, which numeric input reads back unchanged.
pub fn numeric(value: &super::super::Numeric) -> NumericValue {
    make_numeric_value(&value.to_string())
}

/// Bytes as the hexadecimal digits the evaluator reads.
pub fn bytea(value: &[u8]) -> ByteaValue {
    make_bytea_value(&value.iter().map(|byte| format!("{byte:02x}")).collect::<String>())
}

pub fn uuid(value: &super::super::Uuid) -> UuidValue {
    make_uuid_value(&value.to_string())
}

// Days from 2000-01-01, which the server counts dates from, and the range it accepts.
const DATE_OUT_OF_RANGE: u32 = 3452552;

pub fn date(value: &super::super::Date) -> DateValue {
    match value {
        super::super::Date::Infinity => make_stored_date_value(i32::MAX),
        super::super::Date::NegInfinity => make_stored_date_value(i32::MIN),
        super::super::Date::Finite(day) => {
            let days = (*day - chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap()).num_days();
            if days < -2451545 || days > 2145031948 {
                DateValue::Error(make_sql_error(DATE_OUT_OF_RANGE))
            } else {
                make_stored_date_value(days as i32)
            }
        }
    }
}

// Microseconds from 2000-01-01 00:00, or none where the server's input refuses the instant: from
// 4714-11-24 00:00 BC up to, not including, 294277-01-01.
fn instant(value: chrono::NaiveDateTime) -> Option<i64> {
    let epoch = chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap().and_hms_opt(0, 0, 0).unwrap();
    let micros = (value - epoch).num_microseconds()?;
    (micros >= -211813488000000000 && micros < 9223371331200000000).then_some(micros)
}

pub fn timestamp(value: &super::super::Timestamp) -> TimestampValue {
    match value {
        super::super::Timestamp::Infinity => make_stored_timestamp_value(i64::MAX),
        super::super::Timestamp::NegInfinity => make_stored_timestamp_value(i64::MIN),
        super::super::Timestamp::Finite(time) => instant(*time)
            .map_or(TimestampValue::Error(make_sql_error(DATE_OUT_OF_RANGE)), make_stored_timestamp_value),
    }
}

pub fn timestamptz(value: &super::super::Timestamptz) -> TimestamptzValue {
    match value {
        super::super::Timestamptz::Infinity => make_stored_timestamptz_value(i64::MAX),
        super::super::Timestamptz::NegInfinity => make_stored_timestamptz_value(i64::MIN),
        super::super::Timestamptz::Finite(time) => instant(time.naive_utc())
            .map_or(TimestamptzValue::Error(make_sql_error(DATE_OUT_OF_RANGE)), make_stored_timestamptz_value),
    }
}

/// The server keeps an infinite interval as every field at its extreme.
pub fn interval(value: &super::super::Interval) -> IntervalValue {
    match value {
        super::super::Interval::Infinity => make_interval_value(i32::MAX, i32::MAX, i64::MAX),
        super::super::Interval::NegInfinity => make_interval_value(i32::MIN, i32::MIN, i64::MIN),
        super::super::Interval::Finite { months, days, microseconds } => make_interval_value(*months, *days, *microseconds),
    }
}

pub fn time(value: &super::super::Time) -> TimeValue {
    make_time_value(value.microseconds())
}

/// The server keeps a time zone as seconds west of UTC, the negated offset.
pub fn timetz(value: &super::super::Timetz) -> TimetzValue {
    make_timetz_value(value.time().microseconds(), -value.offset_seconds())
}

fn bits(value: f64) -> i64 {
    value.to_bits() as i64
}
// float8_lt: NaN sorts above every number and equals itself.
fn float8_lt(left: f64, right: f64) -> bool {
    !left.is_nan() && (right.is_nan() || left < right)
}

pub fn point(value: &super::super::Point) -> PointValue {
    make_point_bits(bits(value.x), bits(value.y))
}

const INVALID_TEXT_REPRESENTATION: u32 = 3484946;

/// line_in refuses coefficients A and B both within 1e-6 of zero.
pub fn line(value: &super::super::Line) -> LineValue {
    if value.a.abs() <= 1e-6 && value.b.abs() <= 1e-6 {
        return LineValue::Error(make_sql_error(INVALID_TEXT_REPRESENTATION));
    }
    make_line_bits(bits(value.a), bits(value.b), bits(value.c))
}

pub fn lseg(value: &super::super::Lseg) -> LsegValue {
    make_lseg_bits(bits(value.start.x), bits(value.start.y), bits(value.end.x), bits(value.end.y))
}

/// box_in orders the corners, so either order is the same box.
pub fn pg_box(value: &super::super::PgBox) -> BoxValue {
    let (mut high, mut low) = (value.high, value.low);
    if float8_lt(high.x, low.x) {
        std::mem::swap(&mut high.x, &mut low.x);
    }
    if float8_lt(high.y, low.y) {
        std::mem::swap(&mut high.y, &mut low.y);
    }
    make_box_bits(bits(high.x), bits(high.y), bits(low.x), bits(low.y))
}

fn points(points: &[super::super::Point]) -> Vec<PointPayload> {
    points.iter().map(|point| PointPayload { x: bits(point.x), y: bits(point.y), wire_known: true }).collect()
}

/// path_in and poly_in refuse a shape without points.
pub fn path(value: &super::super::Path) -> PathValue {
    if value.points.is_empty() {
        return PathValue::Error(make_sql_error(INVALID_TEXT_REPRESENTATION));
    }
    make_path_value(PathPayload { closed: value.closed, points: points(&value.points) })
}

/// poly_in keeps the bounding box of the points in order.
pub fn polygon(value: &super::super::Polygon) -> PolygonValue {
    let Some(first) = value.points.first() else {
        return PolygonValue::Error(make_sql_error(INVALID_TEXT_REPRESENTATION));
    };
    let (mut low, mut high) = (*first, *first);
    for point in &value.points[1..] {
        if float8_lt(point.x, low.x) {
            low.x = point.x;
        }
        if float8_lt(high.x, point.x) {
            high.x = point.x;
        }
        if float8_lt(point.y, low.y) {
            low.y = point.y;
        }
        if float8_lt(high.y, point.y) {
            high.y = point.y;
        }
    }
    let bounds = make_box_bits(bits(high.x), bits(high.y), bits(low.x), bits(low.y));
    make_polygon_value(PolygonPayload { points: points(&value.points), bounds })
}

/// circle_in refuses a negative radius.
pub fn circle(value: &super::super::Circle) -> CircleValue {
    if value.radius < 0.0 {
        return CircleValue::Error(make_sql_error(INVALID_TEXT_REPRESENTATION));
    }
    make_circle_bits(bits(value.center.x), bits(value.center.y), bits(value.radius))
}

pub fn xid(value: &super::super::Xid) -> XidValue {
    make_xid_value(i64::from(value.0))
}
pub fn cid(value: &super::super::Cid) -> CidValue {
    make_cid_value(i64::from(value.0))
}
/// The evaluator keeps the unsigned identifier's bits as a signed integer.
pub fn xid8(value: &super::super::Xid8) -> Xid8Value {
    make_xid8_bits(value.0 as i64)
}
pub fn pg_lsn(value: &super::super::PgLsn) -> PgLsnValue {
    make_pg_lsn_bits(value.0 as i64)
}
pub fn tid(value: &super::super::Tid) -> TidValue {
    make_tid_parts(i64::from(value.block), i32::from(value.offset))
}
pub fn oid(value: &u32) -> OidValue {
    make_oid_value(i64::from(*value))
}
pub fn oid_alias(value: &super::super::OidAlias) -> OidValue {
    make_oid_value(i64::from(value.0))
}
/// A money amount is the count of the currency's smallest unit the server stores.
pub fn money(value: &super::super::Money) -> MoneyValue {
    make_money_value(value.0)
}
pub fn internal_char(value: &super::super::Char) -> InternalCharValue {
    make_internal_char_value(i32::from(value.0))
}
pub fn enumeration(ordinal: i32) -> EnumValue {
    make_enum_value(ordinal)
}

/// The server reads a container's parts in order: the first part its input refuses fails the whole
/// value, and an undecided part leaves it undecided, since that part may be the one refused.
pub struct Parts {
    fault: Option<Option<SqlError>>,
}
pub fn parts() -> Parts {
    Parts { fault: None }
}
fn fail(parts: &mut Parts, fault: Option<SqlError>) {
    if parts.fault.is_none() {
        parts.fault = Some(fault);
    }
}
pub fn part(parts: &mut Parts, element: ArrayElement) -> ArrayElement {
    match &element {
        ArrayElement::Error(error) => fail(parts, Some(*error)),
        ArrayElement::Unknown | ArrayElement::Unimplemented => fail(parts, None),
        _ => {}
    }
    element
}
/// A container's failure, if a part failed it.
pub fn parts_fault(parts: &Parts) -> Option<Option<SqlError>> {
    parts.fault
}

/// A part that may be NULL, through its converter where it is not.
pub fn cell<T>(value: Option<&T>, convert: impl FnOnce(&T) -> ArrayElement) -> ArrayElement {
    value.map_or(ArrayElement::Null, convert)
}

/// An array of nested vectors, read as array input reads it: sub-arrays must match, and an array
/// without elements has no dimensions.
pub fn array<T, N: super::super::dims::Nested<Option<T>>>(
    value: &N,
    element_type: &str,
    kind: i32,
    convert: impl Fn(Option<&T>) -> ArrayElement,
) -> ArrayValue {
    let mut parts = parts();
    let mut lengths = Vec::new();
    if value.lengths(&mut lengths, 0).is_err() {
        fail(&mut parts, Some(make_sql_error(INVALID_TEXT_REPRESENTATION)));
    }
    let mut cells = Vec::new();
    value.values(&mut cells);
    let mut arguments = make_array_arguments(element_type, kind);
    if !cells.is_empty() {
        for length in &lengths {
            arguments = append_array_dimension(arguments, 1, *length as i32);
        }
    }
    for item in cells {
        arguments = append_array_argument(arguments, part(&mut parts, convert(item.as_ref())));
    }
    match parts_fault(&parts) {
        Some(Some(error)) => ArrayValue::Error(error),
        Some(None) => ArrayValue::Unknown,
        None => finish_array_arguments(arguments),
    }
}

/// A range's bounds go through the subtype's input, then the evaluator's range constructor orders
/// and canonicalizes them as range input does.
pub fn range<T>(
    value: &super::super::Range<T>,
    bound: impl Fn(Option<&T>) -> ArrayElement,
    empty: impl FnOnce() -> RangeValue,
    construct: impl FnOnce(ArrayElement, ArrayElement, TextValue) -> RangeValue,
) -> RangeValue {
    let (lower, upper) = match value {
        super::super::Range::Empty => return empty(),
        super::super::Range::Bounds { lower, upper } => (lower, upper),
    };
    let mut parts = parts();
    let mut read = |end: &std::ops::Bound<T>| match end {
        std::ops::Bound::Unbounded => ArrayElement::Null,
        std::ops::Bound::Included(value) | std::ops::Bound::Excluded(value) => part(&mut parts, bound(Some(value))),
    };
    let (lower_element, upper_element) = (read(lower), read(upper));
    match parts_fault(&parts) {
        Some(Some(error)) => return RangeValue::Error(error),
        Some(None) => return RangeValue::Unknown,
        None => {}
    }
    let flags = format!(
        "{}{}",
        if matches!(lower, std::ops::Bound::Included(_)) { "[" } else { "(" },
        if matches!(upper, std::ops::Bound::Included(_)) { "]" } else { ")" },
    );
    construct(lower_element, upper_element, make_text_value(&flags))
}

/// The evaluator's multirange constructor sorts, drops empty ranges and merges as multirange input
/// does.
pub fn multirange<T>(
    value: &super::super::Multirange<T>,
    range_type: &str,
    span: impl Fn(&super::super::Range<T>) -> RangeValue,
    construct: impl FnOnce(ArrayValue) -> MultirangeValue,
) -> MultirangeValue {
    let mut members = make_array_arguments(range_type, 42);
    let mut parts = parts();
    for item in value.0.iter() {
        members = append_array_argument(members, part(&mut parts, array_element_from_range(span(item))));
    }
    match parts_fault(&parts) {
        Some(Some(error)) => MultirangeValue::Error(error),
        Some(None) => MultirangeValue::Unknown,
        None => construct(finish_array_constructor(members)),
    }
}

const NOT_NULL_VIOLATION: u32 = 3505682;
const CHECK_VIOLATION: u32 = 3505720;

/// A part of a domain type, read through the domain's input: the base type's input, then the
/// domain's NOT NULL and CHECK constraints, in `order`, base domains first.
pub fn domain_cell(
    base: ArrayElement,
    null: bool,
    not_null: bool,
    evaluations: Vec<super::super::CheckEvaluation>,
    order: &[usize],
) -> ArrayElement {
    if matches!(base, ArrayElement::Error(_) | ArrayElement::Unknown | ArrayElement::Unimplemented) {
        return base;
    }
    if null && not_null {
        return ArrayElement::Error(make_sql_error(NOT_NULL_VIOLATION));
    }
    for index in order {
        match &evaluations[*index].result {
            super::super::CheckResult::True | super::super::CheckResult::Null => {}
            super::super::CheckResult::False => return ArrayElement::Error(make_sql_error(CHECK_VIOLATION)),
            super::super::CheckResult::Error { state, .. } => {
                return match u32::from_str_radix(state, 36) {
                    Ok(state) => ArrayElement::Error(make_sql_error(state)),
                    Err(_) => ArrayElement::Unknown,
                }
            }
            super::super::CheckResult::Undecided { .. } => return ArrayElement::Unknown,
        }
    }
    base
}
