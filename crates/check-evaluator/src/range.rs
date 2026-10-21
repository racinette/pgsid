#[derive(Clone, Copy)]
pub struct RangeSupport {
    pub comparison: i32,
    pub canonical: i32,
}

pub fn make_range_support(comparison: i32, canonical: i32) -> RangeSupport {
    RangeSupport {
        comparison,
        canonical,
    }
}

#[derive(Clone)]
pub struct RangeTextPayload {
    pub empty: bool,
    pub lower_present: bool,
    pub upper_present: bool,
    pub lower: String,
    pub upper: String,
    pub flags: String,
}

#[derive(Clone)]
pub enum RangeTextPlan {
    Unknown,
    Null,
    Error(SqlError),
    Value(RangeTextPayload),
}

pub fn range_unknown_support() -> RangeSupport {
    RangeSupport {
        comparison: 0,
        canonical: 0,
    }
}

pub fn range_builtin_support(type_name: &str, element_type: &str, kind: i32) -> RangeSupport {
    if type_name == "pg_catalog.int4range" && element_type == "pg_catalog.int4" && kind == 2 {
        return RangeSupport {
            comparison: 2,
            canonical: 2,
        };
    };
    if type_name == "pg_catalog.int8range" && element_type == "pg_catalog.int8" && kind == 3 {
        return RangeSupport {
            comparison: 3,
            canonical: 3,
        };
    };
    if type_name == "pg_catalog.daterange" && element_type == "pg_catalog.date" && kind == 7 {
        return RangeSupport {
            comparison: 7,
            canonical: 7,
        };
    };
    if type_name == "pg_catalog.numrange" && element_type == "pg_catalog.\"numeric\"" && kind == 10
    {
        return RangeSupport {
            comparison: 10,
            canonical: 1,
        };
    };
    if type_name == "pg_catalog.tsrange" && element_type == "pg_catalog.\"timestamp\"" && kind == 4
    {
        return RangeSupport {
            comparison: 4,
            canonical: 1,
        };
    };
    if type_name == "pg_catalog.tstzrange" && element_type == "pg_catalog.timestamptz" && kind == 5
    {
        return RangeSupport {
            comparison: 5,
            canonical: 1,
        };
    };
    range_unknown_support()
}

pub fn range_support_equal(left: RangeSupport, right: RangeSupport) -> bool {
    left.comparison == right.comparison && left.canonical == right.canonical
}

pub fn range_support_valid(input: RangeSupport, kind: i32) -> bool {
    let comparison = input.comparison == 0
        || (kind == 12 && input.comparison == 120)
        || (kind == 13 && range_support_is_cidr(input))
        || (kind == 33 && range_oid_alias_mode(input, "") > 0)
        || (kind == 8 && (input.comparison == 108 || input.comparison == 200 || input.comparison == 208))
        || (input.comparison == kind
            && (kind == 2
                || kind == 3
                || kind == 4
                || kind == 5
                || kind == 6
                || kind == 7
                || kind == 8
                || kind == 10
                || kind == 1
                || kind == 9
                || kind == 12
                || kind == 13
                || kind == 14
                || kind == 15
                || kind == 16
                || kind == 17
                || kind == 18
                || kind == 19
                || kind == 20
                || kind == 21
                || kind == 22
                || kind == 23
                || kind == 31
                || kind == 32
                || kind == 33
                || kind == 37
                || kind == 38
                || kind == 39
                || kind == 41));
    let canonical = input.canonical == 0
        || input.canonical == 1
        || (input.canonical == kind && (kind == 2 || kind == 3 || kind == 7));
    comparison && canonical
}

pub fn range_support_is_cidr(input: RangeSupport) -> bool {
    input.comparison == 100 || input.comparison == 113
}

pub fn range_support_jsonb_utf8(input: RangeSupport) -> bool {
    input.comparison == 12 || input.comparison == 120
}

pub fn range_oid_alias_mode(input: RangeSupport, element_type: &str) -> i32 {
    if input.comparison >= 331 && input.comparison <= 335 { return input.comparison - 330; };
    if input.comparison >= 301 && input.comparison <= 305 { return input.comparison - 300; };
    if element_type == "pg_catalog.regoper" { return 2; };
    if element_type == "pg_catalog.regoperator" { return 4; };
    if element_type == "pg_catalog.regprocedure" { return 3; };
    if element_type == "pg_catalog.regtype" { return 5; };
    if element_type == "pg_catalog.regclass" || element_type == "pg_catalog.regcollation"
        || element_type == "pg_catalog.regconfig" || element_type == "pg_catalog.regdictionary"
        || element_type == "pg_catalog.regnamespace" || element_type == "pg_catalog.regproc"
        || element_type == "pg_catalog.regrole" { return 1; };
    0
}

#[derive(Clone)]
pub struct RangeBoundProfile {
    pub type_name: String,
    pub kind: i32,
    pub comparison: i32,
    pub missing_comparison: bool,
    pub element_type: String,
    pub child: usize,
    pub enum_labels: String,
    pub enum_count: i32,
}

#[derive(Clone)]
pub struct RangeBoundContext {
    pub nodes: Vec<RangeBoundProfile>,
}

pub fn empty_range_bound_context() -> RangeBoundContext {
    let nodes: Vec<RangeBoundProfile> = Vec::new();
    RangeBoundContext {nodes}
}

#[derive(Clone)]
pub struct RangePayload {
    pub type_name: String,
    pub element_type: String,
    pub element_kind: i32,
    pub enum_labels: String,
    pub enum_count: i32,
    pub bound_profile: RangeBoundContext,
    pub support: RangeSupport,
    pub empty: bool,
    pub lower_inclusive: bool,
    pub upper_inclusive: bool,
    pub bounds: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum RangeValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(RangePayload),
}

pub fn range_unknown() -> RangeValue {
    RangeValue::Unknown
}

pub fn range_null() -> RangeValue {
    RangeValue::Null
}

fn range_payload_with_support(input: RangePayload, support: RangeSupport) -> RangePayload {
    RangePayload {
        type_name: input.type_name,
        element_type: input.element_type,
        element_kind: input.element_kind,
        enum_labels: input.enum_labels,
        enum_count: input.enum_count,
        bound_profile: input.bound_profile,
        support,
        empty: input.empty,
        lower_inclusive: input.lower_inclusive,
        upper_inclusive: input.upper_inclusive,
        bounds: input.bounds,
    }
}

fn range_payload_with_definition(input: RangePayload, labels: &str, count: i32) -> RangePayload {
    RangePayload {
        type_name: input.type_name,
        element_type: input.element_type,
        element_kind: input.element_kind,
        enum_labels: labels.to_owned(),
        enum_count: count,
        bound_profile: input.bound_profile,
        support: input.support,
        empty: input.empty,
        lower_inclusive: input.lower_inclusive,
        upper_inclusive: input.upper_inclusive,
        bounds: input.bounds,
    }
}

pub fn range_enum_definition_valid(labels: &str, count: i32) -> bool {
    if count < 0 { return count == -1 && labels == ""; };
    if count == 0 { return labels == ""; };
    let characters: Vec<char> = labels.chars().collect();
    let mut seen: i32 = 0;
    let mut start: usize = 0;
    let mut position: usize = 0;
    while position <= characters.len() {
        if position == characters.len() || characters[position] == '\0' {
            let mut earlier: usize = 0;
            while earlier < start {
                let mut end = earlier;
                while end < characters.len() && characters[end] != '\0' { end += 1; }
                if end - earlier == position - start {
                    let mut offset: usize = 0;
                    let mut equal = true;
                    while offset < position - start {
                        if characters[earlier + offset] != characters[start + offset] { equal = false; };
                        offset += 1;
                    }
                    if equal { return false; };
                };
                earlier = end + 1;
            }
            if seen >= count { return false; };
            seen = seen + 1;
            start = position + 1;
        };
        position += 1;
    }
    seen == count
}

pub fn range_enum_bound_valid(input: ArrayElement, count: i32) -> bool {
    if let ArrayElement::Enum(payload) = input {
        return count >= 0 && payload.ordinal >= 0 && payload.ordinal < count
            && payload.label_oid >= 0i64 && payload.label_oid <= 4294967295i64;
    };
    true
}

pub fn range_with_enum_definition(input: RangeValue, labels: &str, count: i32) -> RangeValue {
    if let RangeValue::Value(value) = input {
        return make_coerced_range_value(range_payload_with_definition(value, labels, count));
    };
    input
}

pub fn range_bound_profile_valid(profile: &RangeBoundContext) -> bool {
    let mut index: usize = 0;
    while index < profile.nodes.len() {
        let node = profile.nodes[index].clone();
        if node.type_name.as_str() == "" || node.kind < 1 || node.kind > 41 { return false; };
        if node.kind == 41 {
            if node.element_type.as_str() == "" || node.child <= index || node.child >= profile.nodes.len()
                || (node.comparison != 0 && node.comparison != 41) {
                return false;
            };
        } else {
            if node.child != 0 || node.element_type.as_str() != "" { return false; };
            if node.missing_comparison {
                if node.comparison != 0 { return false; };
            } else if range_support_valid(make_range_support(node.comparison, 1), node.kind) == false {
                return false;
            };
        };
        if node.missing_comparison && node.comparison != 0 { return false; };
        if node.kind == 6 {
            if range_enum_definition_valid(node.enum_labels.as_str(), node.enum_count) == false { return false; };
        } else if node.enum_labels.as_str() != "" || node.enum_count != -1 {
            return false;
        };
        index += 1;
    }
    true
}

pub fn range_bound_profiles_equal(left: &RangeBoundContext, right: &RangeBoundContext) -> bool {
    if left.nodes.len() != right.nodes.len() { return false; };
    let mut index: usize = 0;
    while index < left.nodes.len() {
        let a = left.nodes[index].clone();
        let b = right.nodes[index].clone();
        if a.type_name != b.type_name || a.kind != b.kind || a.comparison != b.comparison || a.missing_comparison != b.missing_comparison
            || a.element_type != b.element_type || a.child != b.child || a.enum_labels != b.enum_labels || a.enum_count != b.enum_count {
            return false;
        };
        index += 1;
    }
    true
}

fn range_payload_with_bound_profile(input: RangePayload, profile: RangeBoundContext) -> RangePayload {
    RangePayload {
        type_name: input.type_name,
        element_type: input.element_type,
        element_kind: input.element_kind,
        enum_labels: input.enum_labels,
        enum_count: input.enum_count,
        bound_profile: profile,
        support: input.support,
        empty: input.empty,
        lower_inclusive: input.lower_inclusive,
        upper_inclusive: input.upper_inclusive,
        bounds: input.bounds,
    }
}

pub fn range_with_bound_profile(input: RangeValue, profile: RangeBoundContext) -> RangeValue {
    if let RangeValue::Value(payload) = input {
        return make_coerced_range_value(range_payload_with_bound_profile(payload, profile));
    };
    input
}

fn range_profiled_bound_valid(input: ArrayElement, profile: &RangeBoundContext, index: usize) -> bool {
    if let ArrayElement::Null = input { return true; };
    if let ArrayElement::Unknown = input { return true; };
    if let ArrayElement::Error(_) = input { return true; };
    if index >= profile.nodes.len() { return false; };
    let node = profile.nodes[index].clone();
    if array_element_family(input.clone()) != node.kind { return false; };
    if node.kind == 41 {
        if let ArrayElement::Array(payload) = input {
            if payload.element_type != node.element_type || payload.element_kind != profile.nodes[node.child].kind { return false; };
            let mut cell: usize = 0;
            while cell < payload.elements.len() {
                if range_profiled_bound_valid(payload.elements[cell].clone(), profile, node.child) == false { return false; };
                cell += 1;
            }
            return true;
        };
        return false;
    };
    range_bound_value_valid(input.clone(), node.type_name.as_str() == "pg_catalog.cidr")
        && range_enum_bound_valid(input.clone(), node.enum_count)
}

pub fn range_prepare_profiled_bound(input: ArrayElement, profile: &RangeBoundContext) -> ArrayElement {
    if range_bound_profile_valid(profile) == false { return ArrayElement::Unknown; };
    if let ArrayElement::Array(payload) = input {
        let normalized = make_array_value(payload);
        if let ArrayValue::Value(payload) = normalized {
            let cell = ArrayElement::Array(payload);
            if range_profiled_bound_valid(cell.clone(), profile, 0) == false { return ArrayElement::Unknown; };
            return cell;
        };
        return array_element_from_array(normalized);
    };
    input
}

fn range_bound_word_valid(value: i32) -> bool {
    value >= 0 && value <= 65535
}

fn range_bound_value_valid(input: ArrayElement, cidr: bool) -> bool {
    if let ArrayElement::Int2(value) = input {
        return make_int2_value(value) != Int2Value::Unknown;
    };
    if let ArrayElement::Bit(value) = input {
        return make_bit_value(value.as_str()) != BitValue::Unknown;
    };
    if let ArrayElement::Bytea(value) = input {
        let parsed = make_bytea_value(value.as_str());
        if let ByteaValue::Value(canonical) = parsed {
            return canonical == value;
        };
        return false;
    };
    if let ArrayElement::Time(value) = input {
        return make_time_value(value) != TimeValue::Unknown;
    };
    if let ArrayElement::Timetz(value) = input {
        return make_timetz_value(value.time, value.zone) != TimetzValue::Unknown;
    };
    if let ArrayElement::InternalChar(value) = input {
        return make_internal_char_value(value) != InternalCharValue::Unknown;
    };
    if let ArrayElement::Oid(value) = input {
        return make_oid_value(value) != OidValue::Unknown;
    };
    if let ArrayElement::Tid(value) = input {
        return make_tid_value(value) != TidValue::Unknown;
    };
    if let ArrayElement::Network(value) = input {
        if value.family != 4 && value.family != 6 {
            return false;
        };
        if value.prefix < 0 || value.prefix > 128 {
            return false;
        };
        if value.family == 4 {
            if value.prefix > 32 || value.word2 != 0 || value.word3 != 0
                || value.word4 != 0 || value.word5 != 0 || value.word6 != 0 || value.word7 != 0 {
                return false;
            };
        };
        return (cidr == false || network_cidr_host_bits_zero(value))
            && range_bound_word_valid(value.word0) && range_bound_word_valid(value.word1)
            && range_bound_word_valid(value.word2) && range_bound_word_valid(value.word3)
            && range_bound_word_valid(value.word4) && range_bound_word_valid(value.word5)
            && range_bound_word_valid(value.word6) && range_bound_word_valid(value.word7);
    };
    if let ArrayElement::Macaddr(value) = input {
        return value.word3 == 0 && range_bound_word_valid(value.word0)
            && range_bound_word_valid(value.word1) && range_bound_word_valid(value.word2);
    };
    if let ArrayElement::Macaddr8(value) = input {
        return range_bound_word_valid(value.word0) && range_bound_word_valid(value.word1)
            && range_bound_word_valid(value.word2) && range_bound_word_valid(value.word3);
    };
    if let ArrayElement::Uuid(value) = input {
        return range_bound_word_valid(value.word0) && range_bound_word_valid(value.word1)
            && range_bound_word_valid(value.word2) && range_bound_word_valid(value.word3)
            && range_bound_word_valid(value.word4) && range_bound_word_valid(value.word5)
            && range_bound_word_valid(value.word6) && range_bound_word_valid(value.word7);
    };
    true
}

pub fn make_coerced_range_value(input: RangePayload) -> RangeValue {
    let mut value = input;
    if value.element_kind != 6 {
        value = range_payload_with_definition(value, "", -1);
    };
    if range_enum_definition_valid(value.enum_labels.as_str(), value.enum_count) == false {
        return RangeValue::Unknown;
    };
    if value.element_kind != 41 {
        let empty_profile = empty_range_bound_context();
        value = range_payload_with_bound_profile(value, empty_profile);
    };
    let bound_profile = value.bound_profile.clone();
    if range_bound_profile_valid(&bound_profile) == false { return RangeValue::Unknown; };
    if value.bound_profile.nodes.len() > 0 && value.bound_profile.nodes[0].kind != value.element_kind { return RangeValue::Unknown; };
    let mut support = value.support;
    if value.type_name.as_str() == "" || value.element_type.as_str() == "" || value.element_kind < 1
    {
        return RangeValue::Unknown;
    };
    if range_support_equal(support, range_unknown_support()) {
        support = range_builtin_support(
            value.type_name.as_str(),
            value.element_type.as_str(),
            value.element_kind,
        );
    };
    if range_support_valid(support, value.element_kind) == false {
        return RangeValue::Unknown;
    };
    let expected = range_builtin_support(
        value.type_name.as_str(),
        value.element_type.as_str(),
        value.element_kind,
    );
    if range_support_equal(expected, range_unknown_support()) == false
        && range_support_equal(support, expected) == false
    {
        return RangeValue::Unknown;
    };
    if value.empty {
        if value.bounds.len() != 0 || value.lower_inclusive || value.upper_inclusive {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(range_payload_with_support(value, support));
    };
    if value.bounds.len() != 2 {
        return RangeValue::Unknown;
    };
    let mut index: usize = 0;
    while index < value.bounds.len() {
        let bound = value.bounds[index].clone();
        if let ArrayElement::Error(error) = bound {
            return RangeValue::Error(error);
        };
        let kind = array_element_family(bound.clone());
        if kind != 0 && kind != value.element_kind {
            return RangeValue::Unknown;
        };
        if range_bound_value_valid(bound.clone(), range_support_is_cidr(support) || value.element_type.as_str() == "pg_catalog.cidr") == false {
            return RangeValue::Unknown;
        };
        if range_enum_bound_valid(bound.clone(), value.enum_count) == false {
            return RangeValue::Unknown;
        };
        if let ArrayElement::Null = bound {
            if (index == 0 && value.lower_inclusive) || (index == 1 && value.upper_inclusive) {
                return RangeValue::Unknown;
            };
        };
        let array_bound = bound.clone();
        if let ArrayElement::Array(payload) = array_bound {
            let normalized = make_array_value(payload);
            if let ArrayValue::Error(error) = normalized { return RangeValue::Error(error); };
            let mut known = false;
            if let ArrayValue::Value(payload) = normalized {
                let cell = ArrayElement::Array(payload);
                if range_profiled_bound_valid(cell.clone(), &bound_profile, 0) == false { return RangeValue::Unknown; };
                value.bounds[index] = cell;
                known = true;
            };
            if known == false { return RangeValue::Unknown; };
        };
        if let ArrayElement::Jsonb(payload) = bound {
            let normalized = jsonb_from_coerced_value(JsonbValue::Value(payload));
            let mut known = false;
            if let JsonbValue::Value(payload) = normalized {
                value.bounds[index] = ArrayElement::Jsonb(payload);
                known = true;
            };
            if known == false {
                return RangeValue::Unknown;
            };
        };
        index += 1;
    }
    RangeValue::Value(range_payload_with_support(value, support))
}

pub fn range_from_coerced_bounds(
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    empty: bool,
    lower_inclusive: bool,
    upper_inclusive: bool,
    lower: ArrayElement,
    upper: ArrayElement,
) -> RangeValue {
    let support = range_builtin_support(type_name, element_type, element_kind);
    range_from_profiled_bounds(
        type_name,
        element_type,
        element_kind,
        empty,
        lower_inclusive,
        upper_inclusive,
        lower,
        upper,
        support,
    )
}

pub fn range_from_profiled_bounds(
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    empty: bool,
    lower_inclusive: bool,
    upper_inclusive: bool,
    lower: ArrayElement,
    upper: ArrayElement,
    support: RangeSupport,
) -> RangeValue {
    range_from_defined_bounds(type_name, element_type, element_kind, empty, lower_inclusive, upper_inclusive, lower, upper, support, "", -1)
}

pub fn range_from_defined_bounds(
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    empty: bool,
    lower_inclusive: bool,
    upper_inclusive: bool,
    lower: ArrayElement,
    upper: ArrayElement,
    support: RangeSupport,
    enum_labels: &str,
    enum_count: i32,
) -> RangeValue {
    let profile = empty_range_bound_context();
    range_from_typed_bounds(type_name, element_type, element_kind, empty, lower_inclusive, upper_inclusive, lower, upper, support, enum_labels, enum_count, profile)
}

pub fn range_from_typed_bounds(
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    empty: bool,
    lower_inclusive: bool,
    upper_inclusive: bool,
    lower: ArrayElement,
    upper: ArrayElement,
    support: RangeSupport,
    enum_labels: &str,
    enum_count: i32,
    bound_profile: RangeBoundContext,
) -> RangeValue {
    let mut bounds: Vec<ArrayElement> = Vec::new();
    if empty == false {
        bounds.push(lower);
        bounds.push(upper);
    };
    make_coerced_range_value(RangePayload {
        type_name: type_name.to_owned(),
        element_type: element_type.to_owned(),
        element_kind,
        enum_labels: enum_labels.to_owned(),
        enum_count,
        bound_profile,
        support,
        empty,
        lower_inclusive,
        upper_inclusive,
        bounds,
    })
}

pub fn range_require_type(
    input: RangeValue,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
) -> RangeValue {
    if let RangeValue::Value(value) = input {
        if value.type_name.as_str() != type_name
            || value.element_type.as_str() != element_type
            || value.element_kind != element_kind
        {
            return RangeValue::Unknown;
        };
        let expected = range_builtin_support(type_name, element_type, element_kind);
        if range_support_equal(expected, range_unknown_support()) == false
            && range_support_equal(value.support, expected) == false
        {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(value);
    };
    input
}

pub fn range_from_coerced_profile(
    input: RangeValue,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
) -> RangeValue {
    if let RangeValue::Value(payload) = input {
        if payload.type_name.as_str() != type_name
            || payload.element_type.as_str() != element_type
            || payload.element_kind != element_kind
        {
            return RangeValue::Unknown;
        };
        let support = RangeSupport {
            comparison,
            canonical,
        };
        return make_coerced_range_value(range_payload_with_support(payload, support));
    };
    input
}

pub fn range_from_coerced_defined_profile(
    input: RangeValue,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
    labels: &str,
    count: i32,
) -> RangeValue {
    if let RangeValue::Value(payload) = input {
        if payload.type_name.as_str() != type_name || payload.element_type.as_str() != element_type
            || payload.element_kind != element_kind {
            return RangeValue::Unknown;
        };
        let defined = range_payload_with_definition(payload, labels, count);
        return make_coerced_range_value(range_payload_with_support(defined, make_range_support(comparison, canonical)));
    };
    input
}

pub fn range_require_support(input: RangeValue, expected: RangeSupport) -> RangeValue {
    if let RangeValue::Value(value) = input {
        if range_support_equal(value.support, expected) == false {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(value);
    };
    input
}

pub fn range_is_null(input: RangeValue) -> BoolValue {
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let RangeValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn range_from_case_guard(input: CheckOutcome) -> RangeValue {
    if let CheckOutcome::Error(error) = input {
        return RangeValue::Error(error);
    };
    RangeValue::Unknown
}

pub fn range_empty_state(input: RangeValue) -> BoolValue {
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Null = input {
        return BoolValue::Null;
    };
    if let RangeValue::Value(value) = input {
        return BoolValue::Value(value.empty);
    };
    BoolValue::Unknown
}

pub fn range_bound(input: RangeValue, upper: bool) -> ArrayElement {
    if let RangeValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let RangeValue::Null = input {
        return ArrayElement::Null;
    };
    if let RangeValue::Value(value) = input {
        if value.empty {
            return ArrayElement::Null;
        };
        let mut index: usize = 0;
        if upper {
            index = 1;
        };
        return value.bounds[index].clone();
    };
    ArrayElement::Unknown
}

pub fn range_bound_flag(input: RangeValue, upper: bool, infinite: bool) -> BoolValue {
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Null = input {
        return BoolValue::Null;
    };
    if let RangeValue::Value(value) = input {
        if value.empty {
            return BoolValue::Value(false);
        };
        if infinite {
            let mut index: usize = 0;
            if upper {
                index = 1;
            };
            let bound = value.bounds[index].clone();
            if let ArrayElement::Null = bound {
                return BoolValue::Value(true);
            };
            return BoolValue::Value(false);
        };
        if upper {
            return BoolValue::Value(value.upper_inclusive);
        };
        return BoolValue::Value(value.lower_inclusive);
    };
    BoolValue::Unknown
}
