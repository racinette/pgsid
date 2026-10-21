const RANGE_CONSTRUCTOR_DATA_ERROR: u32 = 3452544;
const RANGE_CONSTRUCTOR_FLAGS_ERROR: u32 = 6819553;
const RANGE_CONSTRUCTOR_INTEGER_OVERFLOW: u32 = 3452547;
const RANGE_CONSTRUCTOR_DATE_OVERFLOW: u32 = 3452552;

fn range_builtin_compare(lower: ArrayElement, upper: ArrayElement, kind: i32) -> Int4Value {
    if let ArrayElement::Null = lower {
        return make_int4_value(-1);
    };
    if let ArrayElement::Null = upper {
        return make_int4_value(-1);
    };
    if kind == 7 {
        let left = array_element_to_date(lower);
        let right = array_element_to_date(upper);
        return sql__pg_catalog__date_cmp__u18z(left, right);
    };
    if kind == 2 {
        let left = array_element_to_int4(lower);
        let right = array_element_to_int4(upper);
        return sql__pg_catalog__btint4cmp__e3r7(left, right);
    };
    if kind == 3 {
        let left = array_element_to_int8(lower);
        let right = array_element_to_int8(upper);
        return sql__pg_catalog__btint8cmp__tevi(left, right);
    };
    if kind == 10 {
        let left = array_element_to_numeric(lower);
        let right = array_element_to_numeric(upper);
        return sql__pg_catalog__numeric_cmp__6h4s(left, right);
    };
    if kind == 4 {
        let left = array_element_to_timestamp(lower);
        let right = array_element_to_timestamp(upper);
        return sql__pg_catalog__timestamp_cmp__lpkm(left, right);
    };
    if kind == 5 {
        let left = array_element_to_timestamptz(lower);
        let right = array_element_to_timestamptz(upper);
        return sql__pg_catalog__timestamptz_cmp__ca0r(left, right);
    };
    if kind == 8 {
        let left = array_element_to_text(lower);
        let right = array_element_to_text(upper);
        return sql__pg_catalog__bttextcmp__puxw(left, right);
    };
    Int4Value::Unknown
}

fn range_profile_serialize(
    type_name: &str,
    element_type: &str,
    kind: i32,
    lower: ArrayElement,
    upper: ArrayElement,
    lower_inclusive: bool,
    upper_inclusive: bool,
    support: RangeSupport,
) -> RangeValue {
    let comparison = range_builtin_compare(lower.clone(), upper.clone(), support.comparison);
    if let Int4Value::Error(error) = comparison {
        return RangeValue::Error(error);
    };
    if let Int4Value::Value(order) = comparison {
        if order > 0 {
            return RangeValue::Error(make_sql_error(RANGE_CONSTRUCTOR_DATA_ERROR));
        };
        if order == 0 && (lower_inclusive == false || upper_inclusive == false) {
            return range_from_profiled_bounds(
                type_name,
                element_type,
                kind,
                true,
                false,
                false,
                ArrayElement::Null,
                ArrayElement::Null,
                support,
            );
        };
        let mut lo_inc = lower_inclusive;
        let mut hi_inc = upper_inclusive;
        if let ArrayElement::Null = lower {
            lo_inc = false;
        };
        if let ArrayElement::Null = upper {
            hi_inc = false;
        };
        return range_from_profiled_bounds(
            type_name,
            element_type,
            kind,
            false,
            lo_inc,
            hi_inc,
            lower,
            upper,
            support,
        );
    };
    RangeValue::Unknown
}

fn range_builtin_canonical(input: RangeValue) -> RangeValue {
    if let RangeValue::Value(value) = input {
        if value.empty {
            return RangeValue::Value(value);
        };
        if value.support.canonical == 0 {
            return RangeValue::Unknown;
        };
        if value.support.canonical == 1 {
            return RangeValue::Value(value);
        };
        let mut lower = value.bounds[0].clone();
        let mut upper = value.bounds[1].clone();
        let mut lo_inc = value.lower_inclusive;
        let mut hi_inc = value.upper_inclusive;
        if value.support.canonical == 2 {
            if let ArrayElement::Int4(bound) = lower {
                if lo_inc == false {
                    if bound == 2147483647 {
                        return RangeValue::Error(make_sql_error(
                            RANGE_CONSTRUCTOR_INTEGER_OVERFLOW,
                        ));
                    };
                    lower = ArrayElement::Int4(bound + 1);
                    lo_inc = true;
                };
            };
            if let ArrayElement::Int4(bound) = upper {
                if hi_inc {
                    if bound == 2147483647 {
                        return RangeValue::Error(make_sql_error(
                            RANGE_CONSTRUCTOR_INTEGER_OVERFLOW,
                        ));
                    };
                    upper = ArrayElement::Int4(bound + 1);
                    hi_inc = false;
                };
            };
        };
        if value.support.canonical == 3 {
            if let ArrayElement::Int8(bound) = lower {
                if lo_inc == false {
                    if bound == 9223372036854775807i64 {
                        return RangeValue::Error(make_sql_error(
                            RANGE_CONSTRUCTOR_INTEGER_OVERFLOW,
                        ));
                    };
                    lower = ArrayElement::Int8(bound + 1i64);
                    lo_inc = true;
                };
            };
            if let ArrayElement::Int8(bound) = upper {
                if hi_inc {
                    if bound == 9223372036854775807i64 {
                        return RangeValue::Error(make_sql_error(
                            RANGE_CONSTRUCTOR_INTEGER_OVERFLOW,
                        ));
                    };
                    upper = ArrayElement::Int8(bound + 1i64);
                    hi_inc = false;
                };
            };
        };
        if value.support.canonical == 7 {
            if let ArrayElement::Date(bound) = lower {
                if bound != -2147483647 - 1 && bound != 2147483647 && lo_inc == false {
                    if bound >= 2145031948 {
                        return RangeValue::Error(make_sql_error(RANGE_CONSTRUCTOR_DATE_OVERFLOW));
                    };
                    lower = ArrayElement::Date(bound + 1);
                    lo_inc = true;
                };
            };
            if let ArrayElement::Date(bound) = upper {
                if bound != -2147483647 - 1 && bound != 2147483647 && hi_inc {
                    if bound >= 2145031948 {
                        return RangeValue::Error(make_sql_error(RANGE_CONSTRUCTOR_DATE_OVERFLOW));
                    };
                    upper = ArrayElement::Date(bound + 1);
                    hi_inc = false;
                };
            };
        };
        return range_profile_serialize(
            value.type_name.as_str(),
            value.element_type.as_str(),
            value.element_kind,
            lower,
            upper,
            lo_inc,
            hi_inc,
            value.support,
        );
    };
    input
}

fn range_builtin_construct(
    type_name: &str,
    element_type: &str,
    kind: i32,
    lower: ArrayElement,
    upper: ArrayElement,
    flags: TextValue,
) -> RangeValue {
    let support = range_builtin_support(type_name, element_type, kind);
    range_construct_with_support(type_name, element_type, kind, lower, upper, flags, support)
}

pub fn range_construct_with_support(
    type_name: &str,
    element_type: &str,
    kind: i32,
    lower: ArrayElement,
    upper: ArrayElement,
    flags: TextValue,
    support: RangeSupport,
) -> RangeValue {
    if let ArrayElement::Error(error) = lower {
        return RangeValue::Error(error);
    };
    if let ArrayElement::Error(error) = upper {
        return RangeValue::Error(error);
    };
    if let TextValue::Error(error) = flags {
        return RangeValue::Error(error);
    };
    if range_support_valid(support, kind) == false {
        return RangeValue::Unknown;
    };
    if let TextValue::Null = flags {
        return RangeValue::Error(make_sql_error(RANGE_CONSTRUCTOR_DATA_ERROR));
    };
    if let TextValue::Value(text) = flags {
        let valid = text.as_str() == "[]"
            || text.as_str() == "[)"
            || text.as_str() == "(]"
            || text.as_str() == "()";
        if valid == false {
            return RangeValue::Error(make_sql_error(RANGE_CONSTRUCTOR_FLAGS_ERROR));
        };
        if let ArrayElement::Unknown = lower {
            return RangeValue::Unknown;
        };
        if let ArrayElement::Unknown = upper {
            return RangeValue::Unknown;
        };
        let lo_inc = text.as_str() == "[]" || text.as_str() == "[)";
        let hi_inc = text.as_str() == "[]" || text.as_str() == "(]";
        let initial = range_profile_serialize(
            type_name,
            element_type,
            kind,
            lower,
            upper,
            lo_inc,
            hi_inc,
            support,
        );
        return range_builtin_canonical(initial);
    };
    RangeValue::Unknown
}

pub fn sql__pg_catalog__daterange__xa2w(lower: DateValue, upper: DateValue) -> RangeValue {
    let lo = array_element_from_date(lower);
    let hi = array_element_from_date(upper);
    range_builtin_construct(
        "pg_catalog.daterange",
        "pg_catalog.date",
        7,
        lo,
        hi,
        make_text_value("[)"),
    )
}

pub fn sql__pg_catalog__daterange__z15e(
    lower: DateValue,
    upper: DateValue,
    flags: TextValue,
) -> RangeValue {
    let lo = array_element_from_date(lower);
    let hi = array_element_from_date(upper);
    range_builtin_construct("pg_catalog.daterange", "pg_catalog.date", 7, lo, hi, flags)
}

pub fn sql__pg_catalog__daterange_canonical__wxsu(input: RangeValue) -> RangeValue {
    let checked = range_require_type(input, "pg_catalog.daterange", "pg_catalog.date", 7);
    range_builtin_canonical(checked)
}

pub fn sql__pg_catalog__int4range__h2la(lower: Int4Value, upper: Int4Value) -> RangeValue {
    let lo = array_element_from_int4(lower);
    let hi = array_element_from_int4(upper);
    range_builtin_construct(
        "pg_catalog.int4range",
        "pg_catalog.int4",
        2,
        lo,
        hi,
        make_text_value("[)"),
    )
}

pub fn sql__pg_catalog__int4range__dl1b(
    lower: Int4Value,
    upper: Int4Value,
    flags: TextValue,
) -> RangeValue {
    let lo = array_element_from_int4(lower);
    let hi = array_element_from_int4(upper);
    range_builtin_construct("pg_catalog.int4range", "pg_catalog.int4", 2, lo, hi, flags)
}

pub fn sql__pg_catalog__int4range_canonical__rxi1(input: RangeValue) -> RangeValue {
    let checked = range_require_type(input, "pg_catalog.int4range", "pg_catalog.int4", 2);
    range_builtin_canonical(checked)
}

pub fn sql__pg_catalog__int8range__p6bp(lower: Int8Value, upper: Int8Value) -> RangeValue {
    let lo = array_element_from_int8(lower);
    let hi = array_element_from_int8(upper);
    range_builtin_construct(
        "pg_catalog.int8range",
        "pg_catalog.int8",
        3,
        lo,
        hi,
        make_text_value("[)"),
    )
}

pub fn sql__pg_catalog__int8range__k46i(
    lower: Int8Value,
    upper: Int8Value,
    flags: TextValue,
) -> RangeValue {
    let lo = array_element_from_int8(lower);
    let hi = array_element_from_int8(upper);
    range_builtin_construct("pg_catalog.int8range", "pg_catalog.int8", 3, lo, hi, flags)
}

pub fn sql__pg_catalog__int8range_canonical__wenu(input: RangeValue) -> RangeValue {
    let checked = range_require_type(input, "pg_catalog.int8range", "pg_catalog.int8", 3);
    range_builtin_canonical(checked)
}

pub fn sql__pg_catalog__numrange__eag6(lower: NumericValue, upper: NumericValue) -> RangeValue {
    let lo = array_element_from_numeric(lower);
    let hi = array_element_from_numeric(upper);
    range_builtin_construct(
        "pg_catalog.numrange",
        "pg_catalog.\"numeric\"",
        10,
        lo,
        hi,
        make_text_value("[)"),
    )
}

pub fn sql__pg_catalog__numrange__8ziy(
    lower: NumericValue,
    upper: NumericValue,
    flags: TextValue,
) -> RangeValue {
    let lo = array_element_from_numeric(lower);
    let hi = array_element_from_numeric(upper);
    range_builtin_construct(
        "pg_catalog.numrange",
        "pg_catalog.\"numeric\"",
        10,
        lo,
        hi,
        flags,
    )
}

pub fn sql__pg_catalog__tsrange__u3gz(lower: TimestampValue, upper: TimestampValue) -> RangeValue {
    let lo = array_element_from_timestamp(lower);
    let hi = array_element_from_timestamp(upper);
    range_builtin_construct(
        "pg_catalog.tsrange",
        "pg_catalog.\"timestamp\"",
        4,
        lo,
        hi,
        make_text_value("[)"),
    )
}

pub fn sql__pg_catalog__tsrange__rglb(
    lower: TimestampValue,
    upper: TimestampValue,
    flags: TextValue,
) -> RangeValue {
    let lo = array_element_from_timestamp(lower);
    let hi = array_element_from_timestamp(upper);
    range_builtin_construct(
        "pg_catalog.tsrange",
        "pg_catalog.\"timestamp\"",
        4,
        lo,
        hi,
        flags,
    )
}

pub fn sql__pg_catalog__tstzrange__2y9m(
    lower: TimestamptzValue,
    upper: TimestamptzValue,
) -> RangeValue {
    let lo = array_element_from_timestamptz(lower);
    let hi = array_element_from_timestamptz(upper);
    range_builtin_construct(
        "pg_catalog.tstzrange",
        "pg_catalog.timestamptz",
        5,
        lo,
        hi,
        make_text_value("[)"),
    )
}

pub fn sql__pg_catalog__tstzrange__zuff(
    lower: TimestamptzValue,
    upper: TimestamptzValue,
    flags: TextValue,
) -> RangeValue {
    let lo = array_element_from_timestamptz(lower);
    let hi = array_element_from_timestamptz(upper);
    range_builtin_construct(
        "pg_catalog.tstzrange",
        "pg_catalog.timestamptz",
        5,
        lo,
        hi,
        flags,
    )
}
