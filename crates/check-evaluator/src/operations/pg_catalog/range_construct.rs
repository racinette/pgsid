const RANGE_CONSTRUCTOR_DATA_ERROR: u32 = 3452544;
const RANGE_CONSTRUCTOR_FLAGS_ERROR: u32 = 6819553;
const RANGE_CONSTRUCTOR_INTEGER_OVERFLOW: u32 = 3452547;
const RANGE_CONSTRUCTOR_DATE_OVERFLOW: u32 = 3452552;
const RANGE_ARRAY_COMPARISON_UNDEFINED: u32 = 6822435;

fn range_profiled_array_compare(lower: ArrayElement, upper: ArrayElement, profile: &RangeBoundContext, index: usize, other: &RangeBoundContext, other_index: usize) -> Int4Value {
    let pair = array_comparison_pair(lower.clone(), upper.clone(), false);
    if array_pair_requires_scalar(pair) == false { return pair; };
    if index >= profile.nodes.len() || other_index >= other.nodes.len() { return Int4Value::Unknown; };
    let node = profile.nodes[index].clone();
    let peer = other.nodes[other_index].clone();
    if node.kind != peer.kind || node.comparison != peer.comparison || node.missing_comparison != peer.missing_comparison { return Int4Value::Unknown; };
    if node.missing_comparison { return Int4Value::Error(make_sql_error(RANGE_ARRAY_COMPARISON_UNDEFINED)); };
    if node.kind != 41 {
        if node.kind == 6 && (node.enum_labels != peer.enum_labels || node.enum_count != peer.enum_count) { return Int4Value::Unknown; };
        return range_builtin_compare(lower, upper, node.comparison);
    };
    if node.comparison != 41 || node.child >= profile.nodes.len() || peer.child >= other.nodes.len() || node.element_type != peer.element_type { return Int4Value::Unknown; };
    if profile.nodes[node.child].missing_comparison != other.nodes[peer.child].missing_comparison { return Int4Value::Unknown; };
    let left = array_element_to_array(lower);
    let right = array_element_to_array(upper);
    let plan = prepare_array_comparison(left, right, false, profile.nodes[node.child].missing_comparison == false);
    let mut result = array_comparison_initial(&plan);
    let mut position = make_int4_value(0);
    while array_comparison_continues(&plan, position, result) {
        let a = array_comparison_element_at(&plan, position, false);
        let b = array_comparison_element_at(&plan, position, true);
        result = range_profiled_array_compare(a, b, profile, node.child, other, peer.child);
        position = array_text_next_index(position);
    }
    finish_array_comparison(&plan, result)
}

fn range_typed_compare(lower: ArrayElement, upper: ArrayElement, comparison: i32, profile: &RangeBoundContext, other: &RangeBoundContext) -> Int4Value {
    if let ArrayElement::Null = lower { return make_int4_value(-1); };
    if let ArrayElement::Null = upper { return make_int4_value(-1); };
    if comparison == 41 {
        return range_profiled_array_compare(lower, upper, profile, 0, other, 0);
    };
    range_builtin_compare(lower, upper, comparison)
}

fn range_builtin_compare(lower: ArrayElement, upper: ArrayElement, kind: i32) -> Int4Value {
    if let ArrayElement::Null = lower {
        return make_int4_value(-1);
    };
    if let ArrayElement::Null = upper {
        return make_int4_value(-1);
    };
    if kind == 6 {
        let left = array_element_to_enum(lower);
        let right = array_element_to_enum(upper);
        return sql__pg_catalog__enum_cmp__hjt6(left, right);
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
    if kind == 108 {
        let left = array_element_to_text(lower);
        let right = array_element_to_text(upper);
        return sql__pg_catalog__bpcharcmp__b8vl(left, right);
    };
    if kind == 208 {
        let left = array_element_to_text(lower);
        let right = array_element_to_text(upper);
        return sql__pg_catalog__btnamecmp__9x5j(left, right);
    };
    if kind == 8 {
        let left = array_element_to_text(lower);
        let right = array_element_to_text(upper);
        return sql__pg_catalog__bttextcmp__puxw(left, right);
    };
    if kind == 1 {
        let left = array_element_to_int2(lower);
        let right = array_element_to_int2(upper);
        return sql__pg_catalog__btint2cmp__2zqn(left, right);
    };
    if kind == 9 {
        let left = array_element_to_bool(lower);
        let right = array_element_to_bool(upper);
        return sql__pg_catalog__btboolcmp__i7aj(left, right);
    };
    if kind == 12 {
        let left = array_element_to_jsonb(lower);
        let right = array_element_to_jsonb(upper);
        return sql__pg_catalog__jsonb_cmp__n2cx(left, right);
    };
    if kind == 13 || kind == 113 {
        let left = array_element_to_network(lower);
        let right = array_element_to_network(upper);
        return sql__pg_catalog__network_cmp__7dun(left, right);
    };
    if kind == 14 {
        let left = array_element_to_bit(lower);
        let right = array_element_to_bit(upper);
        return sql__pg_catalog__bitcmp__2r1v(left, right);
    };
    if kind == 15 {
        let left = array_element_to_bytea(lower);
        let right = array_element_to_bytea(upper);
        return sql__pg_catalog__byteacmp__2x4q(left, right);
    };
    if kind == 16 {
        let left = array_element_to_macaddr(lower);
        let right = array_element_to_macaddr(upper);
        return sql__pg_catalog__macaddr_cmp__jv7y(left, right);
    };
    if kind == 17 {
        let left = array_element_to_macaddr8(lower);
        let right = array_element_to_macaddr8(upper);
        return sql__pg_catalog__macaddr8_cmp__id7f(left, right);
    };
    if kind == 18 {
        let left = array_element_to_uuid(lower);
        let right = array_element_to_uuid(upper);
        return sql__pg_catalog__uuid_cmp__6t9k(left, right);
    };
    if kind == 19 {
        let left = array_element_to_float4(lower);
        let right = array_element_to_float4(upper);
        return sql__pg_catalog__btfloat4cmp__yfof(left, right);
    };
    if kind == 20 {
        let left = array_element_to_float8(lower);
        let right = array_element_to_float8(upper);
        return sql__pg_catalog__btfloat8cmp__adn1(left, right);
    };
    if kind == 21 {
        let left = array_element_to_time(lower);
        let right = array_element_to_time(upper);
        return sql__pg_catalog__time_cmp__rxkq(left, right);
    };
    if kind == 22 {
        let left = array_element_to_timetz(lower);
        let right = array_element_to_timetz(upper);
        return sql__pg_catalog__timetz_cmp__wy50(left, right);
    };
    if kind == 23 {
        let left = array_element_to_interval(lower);
        let right = array_element_to_interval(upper);
        return sql__pg_catalog__interval_cmp__swxt(left, right);
    };
    if kind == 31 {
        let left = array_element_to_money(lower);
        let right = array_element_to_money(upper);
        return sql__pg_catalog__cash_cmp__uvwe(left, right);
    };
    if kind == 32 {
        let left = array_element_to_internal_char(lower);
        let right = array_element_to_internal_char(upper);
        return sql__pg_catalog__btcharcmp__gfia(left, right);
    };
    if kind == 33 || (kind >= 331 && kind <= 335) {
        let left = array_element_to_oid(lower);
        let right = array_element_to_oid(upper);
        return sql__pg_catalog__btoidcmp__48b8(left, right);
    };
    if kind == 37 {
        let left = array_element_to_xid8(lower);
        let right = array_element_to_xid8(upper);
        return sql__pg_catalog__xid8cmp__d6ry(left, right);
    };
    if kind == 38 {
        let left = array_element_to_pg_lsn(lower);
        let right = array_element_to_pg_lsn(upper);
        return sql__pg_catalog__pg_lsn_cmp__46uk(left, right);
    };
    if kind == 39 {
        let left = array_element_to_tid(lower);
        let right = array_element_to_tid(upper);
        return sql__pg_catalog__bttidcmp__ak5t(left, right);
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
    enum_labels: &str,
    enum_count: i32,
    bound_profile: RangeBoundContext,
) -> RangeValue {
    let comparison = range_typed_compare(lower.clone(), upper.clone(), support.comparison, &bound_profile, &bound_profile);
    if let Int4Value::Error(error) = comparison {
        return RangeValue::Error(error);
    };
    if let Int4Value::Value(order) = comparison {
        if order > 0 {
            return RangeValue::Error(make_sql_error(RANGE_CONSTRUCTOR_DATA_ERROR));
        };
        if order == 0 && (lower_inclusive == false || upper_inclusive == false) {
            return range_from_typed_bounds(
                type_name,
                element_type,
                kind,
                true,
                false,
                false,
                ArrayElement::Null,
                ArrayElement::Null,
                support,
                enum_labels,
                enum_count,
                bound_profile,
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
        return range_from_typed_bounds(
            type_name,
            element_type,
            kind,
            false,
            lo_inc,
            hi_inc,
            lower,
            upper,
            support,
            enum_labels,
            enum_count,
            bound_profile,
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
            value.enum_labels.as_str(),
            value.enum_count,
            value.bound_profile.clone(),
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
    range_construct_defined(type_name, element_type, kind, lower, upper, flags, support, "", -1)
}

pub fn range_construct_defined(
    type_name: &str,
    element_type: &str,
    kind: i32,
    lower: ArrayElement,
    upper: ArrayElement,
    flags: TextValue,
    support: RangeSupport,
    enum_labels: &str,
    enum_count: i32,
) -> RangeValue {
    let profile = empty_range_bound_context();
    range_construct_typed(type_name, element_type, kind, lower, upper, flags, support, enum_labels, enum_count, profile)
}

pub fn range_construct_typed(
    type_name: &str,
    element_type: &str,
    kind: i32,
    lower: ArrayElement,
    upper: ArrayElement,
    flags: TextValue,
    support: RangeSupport,
    enum_labels: &str,
    enum_count: i32,
    bound_profile: RangeBoundContext,
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
        if kind == 6 && (range_enum_definition_valid(enum_labels, enum_count) == false
            || range_enum_bound_valid(lower.clone(), enum_count) == false
            || range_enum_bound_valid(upper.clone(), enum_count) == false) {
            return RangeValue::Unknown;
        };
        if range_bound_profile_valid(&bound_profile) == false { return RangeValue::Unknown; };
        let mut lower = lower;
        let mut upper = upper;
        if kind == 41 {
            lower = range_prepare_profiled_bound(lower, &bound_profile);
            if let ArrayElement::Error(error) = lower { return RangeValue::Error(error); };
            if let ArrayElement::Unknown = lower { return RangeValue::Unknown; };
            upper = range_prepare_profiled_bound(upper, &bound_profile);
            if let ArrayElement::Error(error) = upper { return RangeValue::Error(error); };
            if let ArrayElement::Unknown = upper { return RangeValue::Unknown; };
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
            enum_labels,
            enum_count,
            bound_profile,
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
