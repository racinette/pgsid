#[derive(Clone, Copy)]
pub struct ArrayDimension {
    pub lower: i32,
    pub length: i32,
}

#[derive(Clone)]
pub struct ArrayPayload {
    pub null_bitmap: BoolValue,
    pub element_type: String,
    pub element_kind: i32,
    pub dimensions: Vec<ArrayDimension>,
    pub elements: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum ArrayValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(ArrayPayload),
}

#[derive(Clone)]
pub enum ArrayArguments {
    Unknown,
    Error(SqlError),
    Value(ArrayPayload),
}

#[derive(Clone)]
pub struct ArrayOutputPayload {
    pub null_bitmap: BoolValue,
    pub state: i32,
    pub error: SqlError,
    pub dimensions: Vec<ArrayDimension>,
    pub elements: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum ArrayOutputPlan {
    Value(ArrayOutputPayload),
}

pub(crate) fn array_value_validity(input: BoolValue, unknown_valid: bool) -> CheckOutcome {
    if let BoolValue::Error(error) = input {
        return CheckOutcome::Error(error);
    };
    if input == BoolValue::Unknown && unknown_valid == false {
        return CheckOutcome::Unknown;
    };
    CheckOutcome::True
}

pub(crate) fn array_validity_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
    if left == CheckOutcome::Unknown {
        return left;
    };
    if let CheckOutcome::Error(_) = left {
        return left;
    };
    right
}

pub(crate) fn array_validity_unknown(input: CheckOutcome) -> bool {
    input == CheckOutcome::Unknown
}

pub(crate) fn array_validity_possible(input: CheckOutcome) -> CheckOutcome {
    if input == CheckOutcome::Unknown {
        return CheckOutcome::Unknown;
    };
    if let CheckOutcome::Error(_) = input {
        return CheckOutcome::Unknown;
    };
    CheckOutcome::True
}

pub(crate) fn array_constructor_from_validity(
    input: ArrayValue,
    validity: CheckOutcome,
) -> ArrayValue {
    if let CheckOutcome::Error(error) = validity {
        return ArrayValue::Error(error);
    };
    if validity == CheckOutcome::Unknown {
        return ArrayValue::Unknown;
    };
    input
}

pub(crate) fn array_cast_validity(
    input: ArrayElement,
    source: &str,
    target: &str,
    always_valid: bool,
) -> CheckOutcome {
    if let ArrayElement::Error(error) = input {
        return CheckOutcome::Error(error);
    };
    if let ArrayElement::Null = input {
        return CheckOutcome::True;
    };
    if always_valid {
        return CheckOutcome::True;
    };
    let mut temporal = false;
    let mut lower_only = false;
    let mut timestamp: i64 = 0i64;
    if source == "pg_catalog.date" && target == "pg_catalog.timestamptz" {
        if let ArrayElement::Date(value) = input {
            if value == -2147483647 - 1 || value == 2147483647 {
                return CheckOutcome::True;
            };
            if value >= 106751983 {
                return CheckOutcome::Error(make_sql_error(TIMESTAMP_FIELD_OVERFLOW));
            };
            timestamp = (value as i64) * 86400000000i64;
            temporal = true;
        };
    };
    if source == "pg_catalog.\"timestamp\"" && target == "pg_catalog.timestamptz" {
        if let ArrayElement::Timestamp(value) = input {
            timestamp = value;
            temporal = true;
        };
    };
    if source == "pg_catalog.timestamptz"
        && (target == "pg_catalog.\"timestamp\"" || target == "pg_catalog.date")
    {
        if let ArrayElement::Timestamptz(value) = input {
            timestamp = value;
            temporal = true;
            lower_only = target == "pg_catalog.date";
        };
    };
    if temporal {
        if timestamp == -9223372036854775808i64 || timestamp == 9223372036854775807i64 {
            return CheckOutcome::True;
        };
        // A signed 32-bit offset covers every timezone-table offset in seconds.
        if timestamp >= -211813488000000000i64 + 2147483648000000i64
            && (lower_only || timestamp < 9223371331200000000i64 - 2147483648000000i64)
        {
            return CheckOutcome::True;
        };
    };
    CheckOutcome::Unknown
}

pub(crate) fn append_array_cast_conversion(
    input: ArrayOutputPayload,
    element: ArrayElement,
    validity: CheckOutcome,
) -> ArrayOutputPayload {
    if let ArrayElement::Unknown = element {
        if let CheckOutcome::Error(error) = validity {
            return append_array_conversion(input, ArrayElement::Error(error), true);
        };
        return append_array_conversion(input, element, validity == CheckOutcome::True);
    };
    append_array_conversion(input, element, true)
}

pub(crate) fn make_array_conversion() -> ArrayOutputPayload {
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    ArrayOutputPayload {
        null_bitmap: BoolValue::Value(false),
        state: 1,
        error: make_sql_error(0),
        dimensions: dimensions,
        elements: elements,
    }
}

pub(crate) fn append_array_conversion(
    input: ArrayOutputPayload,
    element: ArrayElement,
    unknown_valid: bool,
) -> ArrayOutputPayload {
    let mut state = input.state;
    let mut error = input.error;
    if state == 1 {
        if let ArrayElement::Error(value) = element {
            state = -2;
            error = value;
        };
    };
    if state == 1 && unknown_valid == false {
        if let ArrayElement::Unknown = element {
            state = -1;
        };
    };
    let mut elements = input.elements;
    let mut null_bitmap = input.null_bitmap;
    if state == 1 {
        null_bitmap = array_bitmap_union(null_bitmap, array_element_bitmap(element.clone()));
        elements.push(element);
    };
    ArrayOutputPayload {
        null_bitmap: null_bitmap,
        state: state,
        error: error,
        dimensions: input.dimensions,
        elements: elements,
    }
}

pub(crate) fn array_conversion_arguments(
    input: ArrayOutputPayload,
    element_type: &str,
    element_kind: i32,
) -> ArrayArguments {
    if input.state == -2 {
        return ArrayArguments::Error(input.error);
    };
    if input.state != 1 {
        return ArrayArguments::Unknown;
    };
    ArrayArguments::Value(ArrayPayload {
        null_bitmap: input.null_bitmap,
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        dimensions: input.dimensions,
        elements: input.elements,
    })
}

pub fn prepare_array_output(input: ArrayValue) -> ArrayOutputPayload {
    if let ArrayValue::Value(value) = input {
        return ArrayOutputPayload {
            null_bitmap: value.null_bitmap,
            state: 1,
            error: make_sql_error(0),
            dimensions: value.dimensions,
            elements: value.elements,
        };
    };
    let mut state = -1;
    let mut error = make_sql_error(0);
    if let ArrayValue::Null = input {
        state = 0;
    };
    if let ArrayValue::Error(value) = input {
        state = -2;
        error = value;
    };
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    ArrayOutputPayload {
        null_bitmap: BoolValue::Unknown,
        state: state,
        error: error,
        dimensions: dimensions,
        elements: elements,
    }
}

pub(crate) fn array_output_has_element(input: &ArrayOutputPayload, index: Int4Value) -> bool {
    if let Int4Value::Value(offset) = index {
        let position = usize::try_from(offset).unwrap_or(input.elements.len());
        return input.state == 1 && offset >= 0 && position < input.elements.len();
    };
    false
}

pub(crate) fn array_output_element_at(
    input: &ArrayOutputPayload,
    index: Int4Value,
) -> ArrayElement {
    if let Int4Value::Value(offset) = index {
        let position = usize::try_from(offset).unwrap_or(input.elements.len());
        if offset >= 0 && position < input.elements.len() {
            return input.elements[position].clone();
        };
    };
    ArrayElement::Unknown
}

pub fn array_unknown() -> ArrayValue {
    ArrayValue::Unknown
}

pub fn array_null() -> ArrayValue {
    ArrayValue::Null
}

pub fn array_is_null(input: ArrayValue) -> BoolValue {
    if let ArrayValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let ArrayValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn array_from_case_guard(input: CheckOutcome) -> ArrayValue {
    if let CheckOutcome::Error(error) = input {
        return ArrayValue::Error(error);
    };
    ArrayValue::Unknown
}

fn array_coerced_owned_element(element: ArrayElement) -> ArrayElement {
    if let ArrayElement::Composite(payload) = element {
        return array_element_from_composite(make_composite_value(payload));
    };
    if let ArrayElement::Array(nested) = element {
        return array_element_from_array(make_array_value(nested));
    };
    if let ArrayElement::Range(payload) = element {
        return array_element_from_range(make_coerced_range_value(payload));
    };
    if let ArrayElement::Multirange(payload) = element {
        return array_element_from_multirange(make_coerced_multirange_value(payload));
    };
    element
}

pub fn make_array_value(input: ArrayPayload) -> ArrayValue {
    let mut elements = input.elements;
    let mut position: usize = 0;
    while position < elements.len() {
        let checked = array_coerced_owned_element(elements[position].clone());
        if let ArrayElement::Error(error) = checked {
            return ArrayValue::Error(error);
        };
        if let ArrayElement::Unknown = checked {
            if array_element_family(elements[position].clone()) >= 41 {
                return ArrayValue::Unknown;
            };
        };
        elements[position] = checked;
        position += 1;
    }
    let identity: Vec<char> = input.element_type.chars().collect();
    if identity.len() == 0 || input.element_kind < 1 || input.element_kind > 44 {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < identity.len() {
        if identity[position] == '\0' {
            return ArrayValue::Unknown;
        };
        position += 1;
    }
    if input.dimensions.len() > 6 {
        return ArrayValue::Unknown;
    };
    let mut count: i64 = 0i64;
    if input.dimensions.len() > 0 {
        count = 1i64;
    };
    position = 0;
    while position < input.dimensions.len() {
        let dimension = input.dimensions[position];
        if dimension.length < 0 {
            return ArrayValue::Unknown;
        };
        let length = dimension.length as i64;
        let end = (dimension.lower as i64) + length;
        if end > 2147483648i64 || (length > 0i64 && count > 2147483647i64 / length) {
            return ArrayValue::Unknown;
        };
        if length == 0i64 && dimension.lower == -2147483647 - 1 {
            return ArrayValue::Unknown;
        };
        count = count * length;
        position += 1;
    }
    if count != (elements.len() as i32) as i64 {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < elements.len() {
        let kind = array_element_family(elements[position].clone());
        if kind != 0 && kind != input.element_kind {
            return ArrayValue::Unknown;
        };
        position += 1;
    }
    let mut null_bitmap = input.null_bitmap;
    if null_bitmap == BoolValue::Null {
        return ArrayValue::Unknown;
    };
    if let BoolValue::Error(_) = null_bitmap {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < elements.len() {
        let element = elements[position].clone();
        if let ArrayElement::Null = element {
            if null_bitmap == BoolValue::Value(false) {
                return ArrayValue::Unknown;
            };
            null_bitmap = BoolValue::Value(true);
        };
        position += 1;
    }
    ArrayValue::Value(ArrayPayload {
        element_type: input.element_type,
        element_kind: input.element_kind,
        dimensions: input.dimensions,
        elements: elements,
        null_bitmap: null_bitmap,
    })
}

pub fn array_from_coerced_value(
    input: ArrayValue,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if let ArrayValue::Value(value) = input {
        if value.element_type != element_type || value.element_kind != element_kind {
            return ArrayValue::Unknown;
        };
        return make_array_value(value);
    };
    input
}

pub fn catalog_vector_from_coerced(input: ArrayValue, oid: bool) -> ArrayValue {
    if let ArrayValue::Value(value) = input {
        let mut identity = "pg_catalog.int2".to_owned();
        let mut kind: i32 = 1;
        if oid { identity = "pg_catalog.oid".to_owned(); kind = 33; };
        if value.element_type != identity || value.element_kind != kind { return ArrayValue::Unknown; };
        return make_array_value(value);
    };
    input
}

fn array_tree_type_at(types: &str, level: usize) -> String {
    let characters: Vec<char> = types.chars().collect();
    let mut current: usize = 0;
    let mut position: usize = 0;
    let mut result = String::new();
    while position < characters.len() {
        let character = characters[position];
        if character == '\0' {
            if current == level {
                return result;
            };
            current += 1;
        } else if current == level {
            result.push(character);
        };
        position += 1;
    }
    result
}

fn array_tree_identity_valid(input: &ArrayPayload, types: &str, kinds: &str, level: usize) -> bool {
    let families: Vec<char> = kinds.chars().collect();
    if level >= families.len() {
        return false;
    };
    let family = families[level] as i32;
    let expected_type = array_tree_type_at(types, level);
    if input.element_type != expected_type || input.element_kind != family {
        return false;
    };
    if family != 41 {
        return level + 1 == families.len();
    };
    if level + 1 >= families.len() {
        return false;
    };
    let mut index: usize = 0;
    while index < input.elements.len() {
        let element = input.elements[index].clone();
        if let ArrayElement::Array(nested) = element {
            if array_tree_identity_valid(&nested, types, kinds, level + 1) == false {
                return false;
            };
        };
        index += 1;
    }
    true
}

pub fn array_from_coerced_tree(input: ArrayValue, types: &str, kinds: &str) -> ArrayValue {
    if let ArrayValue::Value(value) = input {
        if array_tree_identity_valid(&value, types, kinds, 0) == false {
            return ArrayValue::Unknown;
        };
        return make_array_value(value);
    };
    input
}

fn array_range_element_identity(
    input: &ArrayPayload,
    position: usize,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
) -> bool {
    let element = input.elements[position].clone();
    if let ArrayElement::Array(nested) = element {
        return array_range_identity_valid(&nested, type_name, element_type, element_kind);
    };
    if let ArrayElement::Range(payload) = element {
        return payload.type_name.as_str() == type_name
            && payload.element_type.as_str() == element_type
            && payload.element_kind == element_kind;
    };
    true
}

fn array_range_identity_valid(
    input: &ArrayPayload,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
) -> bool {
    let mut position: usize = 0;
    while position < input.elements.len() {
        if array_range_element_identity(input, position, type_name, element_type, element_kind)
            == false
        {
            return false;
        };
        position += 1;
    }
    true
}

pub fn array_from_coerced_range_tree(
    input: ArrayValue,
    types: &str,
    kinds: &str,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if let ArrayValue::Value(payload) = input {
        if array_tree_identity_valid(&payload, types, kinds, 0) == false
            || array_range_identity_valid(&payload, type_name, element_type, element_kind) == false
        {
            return ArrayValue::Unknown;
        };
        return make_array_value(payload);
    };
    input
}

fn array_multirange_element_identity(
    input: &ArrayPayload,
    position: usize,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> bool {
    let element = input.elements[position].clone();
    if let ArrayElement::Array(nested) = element {
        return array_multirange_identity_valid(
            &nested,
            type_name,
            range_type,
            element_type,
            element_kind,
        );
    };
    if let ArrayElement::Multirange(payload) = element {
        if payload.type_name.as_str() != type_name
            || payload.range_type.as_str() != range_type
            || payload.element_type.as_str() != element_type
            || payload.element_kind != element_kind
        {
            return false;
        };
        let mut member: usize = 0;
        while member < payload.ranges.len() {
            let span = payload.ranges[member].clone();
            if let RangeValue::Value(value) = span {
                if value.type_name.as_str() != range_type
                    || value.element_type.as_str() != element_type
                    || value.element_kind != element_kind
                {
                    return false;
                };
            };
            member += 1;
        }
    };
    true
}

fn array_multirange_identity_valid(
    input: &ArrayPayload,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> bool {
    let mut position: usize = 0;
    while position < input.elements.len() {
        if array_multirange_element_identity(
            input,
            position,
            type_name,
            range_type,
            element_type,
            element_kind,
        ) == false
        {
            return false;
        };
        position += 1;
    }
    true
}

pub fn array_from_coerced_multirange_tree(
    input: ArrayValue,
    types: &str,
    kinds: &str,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if let ArrayValue::Value(payload) = input {
        if array_tree_identity_valid(&payload, types, kinds, 0) == false
            || array_multirange_identity_valid(
                &payload,
                type_name,
                range_type,
                element_type,
                element_kind,
            ) == false
        {
            return ArrayValue::Unknown;
        };
        return make_array_value(payload);
    };
    input
}

fn array_element_with_typed_range_profile(
    input: ArrayElement,
    multirange_type: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
    labels: &str,
    count: i32,
    bound_profile: &RangeBoundContext,
) -> ArrayElement {
    if let ArrayElement::Array(nested) = input {
        let converted = array_with_typed_range_profile(
            ArrayValue::Value(nested),
            multirange_type,
            range_type,
            element_type,
            element_kind,
            comparison,
            canonical,
            labels,
            count,
            bound_profile,
        );
        return array_element_from_array(converted);
    };
    if let ArrayElement::Range(span) = input {
        if bound_profile.nodes.len()>0 {
            return array_element_from_range(range_from_coerced_typed_profile(RangeValue::Value(span),
                range_type,element_type,element_kind,comparison,canonical,range_bound_context_snapshot(bound_profile)));
        };
        if count >= 0 {
            return array_element_from_range(range_from_coerced_defined_profile(RangeValue::Value(span), range_type, element_type, element_kind, comparison, canonical, labels, count));
        };
        let converted = range_from_coerced_profile(
            RangeValue::Value(span),
            range_type,
            element_type,
            element_kind,
            comparison,
            canonical,
        );
        return array_element_from_range(converted);
    };
    if let ArrayElement::Multirange(spans) = input {
        if bound_profile.nodes.len()>0 {
            return array_element_from_multirange(multirange_from_coerced_typed_profile(MultirangeValue::Value(spans),
                multirange_type,range_type,element_type,element_kind,comparison,canonical,range_bound_context_snapshot(bound_profile)));
        };
        if count >= 0 {
            return array_element_from_multirange(multirange_from_coerced_defined_profile(MultirangeValue::Value(spans), multirange_type, range_type, element_type, element_kind, comparison, canonical, labels, count));
        };
        let converted = multirange_from_coerced_profile(
            MultirangeValue::Value(spans),
            multirange_type,
            range_type,
            element_type,
            element_kind,
            comparison,
            canonical,
        );
        return array_element_from_multirange(converted);
    };
    input
}

fn array_with_typed_range_profile(
    input: ArrayValue,
    multirange_type: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
    labels: &str,
    count: i32,
    bound_profile: &RangeBoundContext,
) -> ArrayValue {
    if let ArrayValue::Value(payload) = input {
        let mut elements = payload.elements;
        let mut position: usize = 0;
        while position < elements.len() {
            let element = elements[position].clone();
            let mut convert = true;
            if let ArrayElement::Unknown = element {
                convert = false;
            };
            if convert {
                let converted = array_element_with_typed_range_profile(
                    element,
                    multirange_type,
                    range_type,
                    element_type,
                    element_kind,
                    comparison,
                    canonical,
                    labels,
                    count,
            bound_profile,
                );
                if let ArrayElement::Error(error) = converted {
                    return ArrayValue::Error(error);
                };
                if let ArrayElement::Unknown = converted {
                    return ArrayValue::Unknown;
                };
                elements[position] = converted;
            };
            position += 1;
        }
        return make_array_value(ArrayPayload {
            null_bitmap: payload.null_bitmap,
            element_type: payload.element_type,
            element_kind: payload.element_kind,
            dimensions: payload.dimensions,
            elements,
        });
    };
    input
}

fn array_with_range_profile(input: ArrayValue, multirange_type: &str, range_type: &str,
    element_type: &str, element_kind: i32, comparison: i32, canonical: i32,
    labels: &str, count: i32) -> ArrayValue {
    let profile=empty_range_bound_context();
    array_with_typed_range_profile(input,multirange_type,range_type,element_type,element_kind,
        comparison,canonical,labels,count,&profile)
}

pub fn array_from_coerced_range_profile_tree(
    input: ArrayValue,
    types: &str,
    kinds: &str,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
) -> ArrayValue {
    array_from_coerced_range_defined_profile_tree(input, types, kinds, type_name, element_type, element_kind, comparison, canonical, "", -1)
}

pub fn array_from_coerced_range_defined_profile_tree(
    input: ArrayValue,
    types: &str,
    kinds: &str,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
    labels: &str,
    count: i32,
) -> ArrayValue {
    if let ArrayValue::Value(payload) = input {
        if array_tree_identity_valid(&payload, types, kinds, 0) == false
            || array_range_identity_valid(&payload, type_name, element_type, element_kind) == false
        {
            return ArrayValue::Unknown;
        };
        return array_with_range_profile(
            ArrayValue::Value(payload),
            "",
            type_name,
            element_type,
            element_kind,
            comparison,
            canonical,
            labels,
            count,
        );
    };
    input
}

pub fn array_from_coerced_multirange_profile_tree(
    input: ArrayValue,
    types: &str,
    kinds: &str,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
) -> ArrayValue {
    array_from_coerced_multirange_defined_profile_tree(input, types, kinds, type_name, range_type, element_type, element_kind, comparison, canonical, "", -1)
}

pub fn array_from_coerced_multirange_defined_profile_tree(
    input: ArrayValue,
    types: &str,
    kinds: &str,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
    labels: &str,
    count: i32,
) -> ArrayValue {
    if let ArrayValue::Value(payload) = input {
        if array_tree_identity_valid(&payload, types, kinds, 0) == false
            || array_multirange_identity_valid(
                &payload,
                type_name,
                range_type,
                element_type,
                element_kind,
            ) == false
        {
            return ArrayValue::Unknown;
        };
        return array_with_range_profile(
            ArrayValue::Value(payload),
            type_name,
            range_type,
            element_type,
            element_kind,
            comparison,
            canonical,
            labels,
            count,
        );
    };
    input
}

pub fn array_from_coerced_range_typed_profile_tree(input: ArrayValue, types: &str,
    kinds: &str, type_name: &str, element_type: &str, element_kind: i32,
    comparison: i32, canonical: i32, bound_profile: RangeBoundContext) -> ArrayValue {
    if let ArrayValue::Value(payload)=input {
        if array_tree_identity_valid(&payload,types,kinds,0)==false
            || array_range_identity_valid(&payload,type_name,element_type,element_kind)==false {
            return ArrayValue::Unknown;
        };
        return array_with_typed_range_profile(ArrayValue::Value(payload),"",type_name,element_type,
            element_kind,comparison,canonical,"",-1,&bound_profile);
    };
    input
}

pub fn array_from_coerced_multirange_typed_profile_tree(input: ArrayValue, types: &str,
    kinds: &str, type_name: &str, range_type: &str, element_type: &str, element_kind: i32,
    comparison: i32, canonical: i32, bound_profile: RangeBoundContext) -> ArrayValue {
    if let ArrayValue::Value(payload)=input {
        if array_tree_identity_valid(&payload,types,kinds,0)==false
            || array_multirange_identity_valid(&payload,type_name,range_type,element_type,element_kind)==false {
            return ArrayValue::Unknown;
        };
        return array_with_typed_range_profile(ArrayValue::Value(payload),type_name,range_type,element_type,
            element_kind,comparison,canonical,"",-1,&bound_profile);
    };
    input
}

pub fn make_array_arguments(element_type: &str, element_kind: i32) -> ArrayArguments {
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    ArrayArguments::Value(ArrayPayload {
        null_bitmap: BoolValue::Value(false),
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        dimensions: dimensions,
        elements: elements,
    })
}

pub fn append_array_dimension(input: ArrayArguments, lower: i32, length: i32) -> ArrayArguments {
    if let ArrayArguments::Value(value) = input {
        let mut dimensions = value.dimensions;
        dimensions.push(ArrayDimension {
            lower: lower,
            length: length,
        });
        return ArrayArguments::Value(ArrayPayload {
            null_bitmap: value.null_bitmap,
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: value.elements,
        });
    };
    input
}

pub fn append_array_argument(input: ArrayArguments, element: ArrayElement) -> ArrayArguments {
    if let ArrayArguments::Error(_) = input {
        return input;
    };
    if let ArrayElement::Error(error) = element {
        return ArrayArguments::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        let null_bitmap =
            array_bitmap_union(value.null_bitmap, array_element_bitmap(element.clone()));
        let mut elements = value.elements;
        elements.push(element);
        return ArrayArguments::Value(ArrayPayload {
            null_bitmap: null_bitmap,
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: value.dimensions,
            elements: elements,
        });
    };
    input
}

pub fn finish_array_arguments(input: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        return make_array_value(value);
    };
    ArrayValue::Unknown
}

pub fn array_flat_element(input: ArrayValue, offset: Int4Value) -> ArrayElement {
    if let ArrayValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Int4Value::Error(error) = offset {
        return ArrayElement::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayElement::Null;
    };
    if let Int4Value::Null = offset {
        return ArrayElement::Null;
    };
    if let ArrayValue::Value(value) = input {
        if let Int4Value::Value(index) = offset {
            if index < 0 {
                return ArrayElement::Null;
            };
            let position = usize::try_from(index).unwrap_or(0);
            if position >= value.elements.len() {
                return ArrayElement::Null;
            };
            return value.elements[position].clone();
        };
    };
    ArrayElement::Unknown
}

pub fn finish_array_constructor(input: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        if value.elements.len() > 0 {
            dimensions.push(ArrayDimension {
                lower: 1,
                length: value.elements.len() as i32,
            });
        };
        return make_array_value(ArrayPayload {
            null_bitmap: value.null_bitmap,
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: value.elements,
        });
    };
    ArrayValue::Unknown
}

#[derive(Clone)]
pub struct ArrayChildrenPayload {
    pub element_type: String,
    pub element_kind: i32,
    pub arrays: Vec<ArrayValue>,
}

#[derive(Clone)]
pub enum ArrayChildrenArguments {
    Unknown,
    Error(SqlError),
    Value(ArrayChildrenPayload),
}

pub fn make_array_children(element_type: &str, element_kind: i32) -> ArrayChildrenArguments {
    let arrays: Vec<ArrayValue> = Vec::new();
    ArrayChildrenArguments::Value(ArrayChildrenPayload {
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        arrays: arrays,
    })
}

pub fn append_array_child(
    input: ArrayChildrenArguments,
    child: ArrayValue,
) -> ArrayChildrenArguments {
    if let ArrayChildrenArguments::Error(_) = input {
        return input;
    };
    if let ArrayValue::Error(error) = child {
        return ArrayChildrenArguments::Error(error);
    };
    if let ArrayChildrenArguments::Value(value) = input {
        let mut arrays = value.arrays;
        arrays.push(child);
        return ArrayChildrenArguments::Value(ArrayChildrenPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            arrays: arrays,
        });
    };
    input
}

pub fn finish_array_children(input: ArrayChildrenArguments) -> ArrayValue {
    if let ArrayChildrenArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayChildrenArguments::Value(value) = input {
        let mut position: usize = 0;
        while position < value.arrays.len() {
            let child = value.arrays[position].clone();
            if let ArrayValue::Unknown = child {
                return ArrayValue::Unknown;
            };
            position += 1;
        }
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut empty = false;
        let mut null_bitmap = BoolValue::Value(false);
        position = 0;
        while position < value.arrays.len() {
            let child = value.arrays[position].clone();
            if let ArrayValue::Null = child {
                empty = true;
            };
            if let ArrayValue::Value(array) = child {
                if array.element_type != value.element_type
                    || array.element_kind != value.element_kind
                {
                    return ArrayValue::Error(make_sql_error(ARRAY_CONSTRUCTOR_TYPE_MISMATCH));
                };
                if array.dimensions.len() == 0 {
                    empty = true;
                } else {
                    null_bitmap = array_bitmap_union(null_bitmap, array.null_bitmap);
                    if dimensions.len() == 0 {
                        if array.dimensions.len() >= 6 {
                            return ArrayValue::Error(make_sql_error(SQL_ERROR_PROGRAM_LIMIT));
                        };
                        dimensions.push(ArrayDimension {
                            lower: 1,
                            length: value.arrays.len() as i32,
                        });
                        let mut index: usize = 0;
                        while index < array.dimensions.len() {
                            dimensions.push(array.dimensions[index]);
                            index += 1;
                        }
                    } else {
                        if dimensions.len() != array.dimensions.len() + 1 {
                            return ArrayValue::Error(make_sql_error(SQL_ERROR_ARRAY_SUBSCRIPT));
                        };
                        let mut index: usize = 0;
                        while index < array.dimensions.len() {
                            let expected = dimensions[index + 1];
                            let actual = array.dimensions[index];
                            if expected.lower != actual.lower || expected.length != actual.length {
                                return ArrayValue::Error(make_sql_error(
                                    SQL_ERROR_ARRAY_SUBSCRIPT,
                                ));
                            };
                            index += 1;
                        }
                    };
                    if (elements.len() as i32) as i64 + (array.elements.len() as i32) as i64
                        > 2147483647i64
                    {
                        return ArrayValue::Error(make_sql_error(SQL_ERROR_PROGRAM_LIMIT));
                    };
                    let mut index: usize = 0;
                    while index < array.elements.len() {
                        elements.push(array.elements[index].clone());
                        index += 1;
                    }
                };
            };
            position += 1;
        }
        if empty && dimensions.len() > 0 {
            return ArrayValue::Error(make_sql_error(SQL_ERROR_ARRAY_SUBSCRIPT));
        };
        let mut axis: usize = 0;
        while axis < dimensions.len() {
            let dimension = dimensions[axis];
            if (dimension.lower as i64) + (dimension.length as i64) > 2147483647i64 {
                return ArrayValue::Error(make_sql_error(SQL_ERROR_PROGRAM_LIMIT));
            };
            axis += 1;
        }
        return make_array_value(ArrayPayload {
            null_bitmap: null_bitmap,
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: elements,
        });
    };
    ArrayValue::Unknown
}

const ARRAY_CONSTRUCTOR_TYPE_MISMATCH: u32 = 6822148;

#[derive(Clone)]
struct ArrayTextSource {
    characters: Vec<char>,
}

#[derive(Clone)]
pub struct ArrayTextPayload {
    pub state: i32,
    pub dimensions: Vec<ArrayDimension>,
    pub events: Vec<ArrayTextEvent>,
}

#[derive(Clone)]
pub enum ArrayTextPlan {
    Unknown,
    Null,
    Value(ArrayTextPayload),
}

#[derive(Clone)]
pub enum ArrayTextEvent {
    Text(String),
    Null,
    Unknown,
    Error(SqlError),
}

#[derive(Clone)]
struct ArrayTextToken {
    next: usize,
    kind: i32,
    text: String,
}

#[derive(Clone, Copy)]
struct ArrayTextBound {
    next: usize,
    value: i64,
    found: bool,
    overflow: bool,
}

const ARRAY_TEXT_INVALID: u32 = 3484946;

fn array_text_space(ch: char) -> bool {
    ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\x0b' || ch == '\x0c'
}

fn array_text_digit(ch: char) -> bool {
    let code = ch as i32;
    code >= 48 && code <= 57
}

fn array_text_skip_space(source: &ArrayTextSource, start: usize) -> usize {
    let mut position = start;
    while position < source.characters.len() && array_text_space(source.characters[position]) {
        position += 1;
    }
    position
}

fn array_text_read_bound(source: &ArrayTextSource, start: usize) -> ArrayTextBound {
    let mut position = start;
    let mut negative = false;
    if position < source.characters.len()
        && (source.characters[position] == '-' || source.characters[position] == '+')
    {
        negative = source.characters[position] == '-';
        position += 1;
    };
    let digits = position;
    let mut value: i64 = 0i64;
    let mut overflow = false;
    while position < source.characters.len() && array_text_digit(source.characters[position]) {
        if value > 2147483648i64 {
            overflow = true;
        } else {
            value = value * 10i64 + ((source.characters[position] as i32 - 48) as i64);
        };
        position += 1;
    }
    if negative {
        value = 0i64 - value;
    };
    if value < -2147483648i64 || value > 2147483647i64 {
        overflow = true;
    };
    if position == digits {
        return ArrayTextBound {
            next: start,
            value: 0i64,
            found: false,
            overflow: false,
        };
    };
    ArrayTextBound {
        next: position,
        value: value,
        found: true,
        overflow: overflow,
    }
}

fn array_text_read_token(
    source: &ArrayTextSource,
    start: usize,
    delimiter: char,
) -> ArrayTextToken {
    let mut position = array_text_skip_space(source, start);
    if position >= source.characters.len() {
        return ArrayTextToken {
            next: position,
            kind: 0,
            text: String::new(),
        };
    };
    let first = source.characters[position];
    if first == '{' {
        return ArrayTextToken {
            next: position + 1,
            kind: 1,
            text: String::new(),
        };
    };
    if first == '}' {
        return ArrayTextToken {
            next: position + 1,
            kind: 2,
            text: String::new(),
        };
    };
    if first == delimiter {
        return ArrayTextToken {
            next: position + 1,
            kind: 3,
            text: String::new(),
        };
    };
    let quoted = first == '"';
    if quoted {
        position += 1;
    };
    let mut characters: Vec<char> = Vec::new();
    let mut retained: usize = 0;
    let mut escaped = false;
    let mut finished = false;
    while position < source.characters.len() && finished == false {
        let ch = source.characters[position];
        if ch == '\\' {
            position += 1;
            if position >= source.characters.len() {
                return ArrayTextToken {
                    next: position,
                    kind: 0,
                    text: String::new(),
                };
            };
            characters.push(source.characters[position]);
            retained = characters.len();
            escaped = true;
            position += 1;
        } else if quoted && ch == '"' {
            position = array_text_skip_space(source, position + 1);
            if position >= source.characters.len() {
                return ArrayTextToken {
                    next: position,
                    kind: 0,
                    text: String::new(),
                };
            };
            let following = source.characters[position];
            if following != delimiter && following != '}' && following != '{' {
                return ArrayTextToken {
                    next: position,
                    kind: 0,
                    text: String::new(),
                };
            };
            retained = characters.len();
            finished = true;
        } else if quoted == false && (ch == delimiter || ch == '}') {
            finished = true;
        } else if quoted == false && (ch == '"' || ch == '{') {
            return ArrayTextToken {
                next: position,
                kind: 0,
                text: String::new(),
            };
        } else {
            characters.push(ch);
            if array_text_space(ch) == false {
                retained = characters.len();
            };
            position += 1;
        };
    }
    if finished == false {
        return ArrayTextToken {
            next: position,
            kind: 0,
            text: String::new(),
        };
    };
    let mut text = String::new();
    let mut index: usize = 0;
    while index < retained {
        text.push(characters[index]);
        index += 1;
    }
    let mut null_token = false;
    if quoted == false && escaped == false && retained == 4 {
        null_token = (characters[0] == 'N' || characters[0] == 'n')
            && (characters[1] == 'U' || characters[1] == 'u')
            && (characters[2] == 'L' || characters[2] == 'l')
            && (characters[3] == 'L' || characters[3] == 'l');
    };
    if null_token {
        return ArrayTextToken {
            next: position,
            kind: 5,
            text: text,
        };
    };
    ArrayTextToken {
        next: position,
        kind: 4,
        text: text,
    }
}

fn array_text_result(
    dimensions: Vec<ArrayDimension>,
    input: Vec<ArrayTextEvent>,
    error: u32,
) -> ArrayTextPlan {
    let mut events = input;
    if error != 0 {
        events.push(ArrayTextEvent::Error(make_sql_error(error)));
    };
    ArrayTextPlan::Value(ArrayTextPayload {
        state: 1,
        dimensions: dimensions,
        events: events,
    })
}

pub fn parse_array_text(input: TextValue, delimiter: char, nulls: i32) -> ArrayTextPlan {
    if let TextValue::Unknown = input {
        return ArrayTextPlan::Unknown;
    };
    if let TextValue::Null = input {
        return ArrayTextPlan::Null;
    };
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    let mut events: Vec<ArrayTextEvent> = Vec::new();
    if let TextValue::Error(error) = input {
        events.push(ArrayTextEvent::Error(error));
        return array_text_result(dimensions, events, 0);
    };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let source = ArrayTextSource {
            characters: characters,
        };
        let mut index: usize = 0;
        let mut levels: Vec<ArrayDimension> = Vec::new();
        while index < 6 {
            dimensions.push(ArrayDimension {
                lower: 1,
                length: -1,
            });
            levels.push(ArrayDimension {
                lower: 1,
                length: 0,
            });
            index += 1;
        }
        let mut position = array_text_skip_space(&source, 0);
        let mut rank: usize = 0;
        while position < source.characters.len() && source.characters[position] == '[' {
            if rank >= 6 {
                return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
            };
            let first = array_text_read_bound(&source, position + 1);
            if first.overflow {
                return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
            };
            if first.found == false {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            position = first.next;
            let mut lower: i64 = 1i64;
            let mut upper = first.value;
            if position < source.characters.len() && source.characters[position] == ':' {
                lower = first.value;
                let last = array_text_read_bound(&source, position + 1);
                if last.overflow {
                    return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
                };
                if last.found == false {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                upper = last.value;
                position = last.next;
            };
            if position >= source.characters.len() || source.characters[position] != ']' {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            if upper < lower {
                return array_text_result(dimensions, events, SQL_ERROR_ARRAY_SUBSCRIPT);
            };
            let length = upper - lower + 1i64;
            if upper == 2147483647i64 || length > 2147483647i64 {
                return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
            };
            dimensions[rank] = ArrayDimension {
                lower: lower as i32,
                length: length as i32,
            };
            rank += 1;
            position = array_text_skip_space(&source, position + 1);
        }
        let mut frozen = rank > 0;
        if frozen {
            if position >= source.characters.len() || source.characters[position] != '=' {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            position = array_text_skip_space(&source, position + 1);
        };
        if position >= source.characters.len() || source.characters[position] != '{' {
            return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
        };
        let mut nesting: usize = 0;
        let mut count: usize = 0;
        let mut expect_delimiter = false;
        let mut completed = false;
        while completed == false {
            let token = array_text_read_token(&source, position, delimiter);
            position = token.next;
            let kind = token.kind;
            if kind == 0 {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            if kind == 1 {
                if expect_delimiter {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                if nesting >= 6 {
                    return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
                };
                levels[nesting] = ArrayDimension {
                    lower: 1,
                    length: 0,
                };
                nesting += 1;
                if nesting > rank {
                    if frozen {
                        return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                    };
                    rank = nesting;
                };
            };
            if kind == 2 {
                let level = levels[nesting - 1];
                if level.length > 0 && expect_delimiter == false {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                nesting = nesting - 1;
                if nesting > 0 {
                    let outer = levels[nesting - 1];
                    levels[nesting - 1] = ArrayDimension {
                        lower: 1,
                        length: outer.length + 1,
                    };
                };
                let dimension = dimensions[nesting];
                if dimension.length < 0 {
                    dimensions[nesting] = ArrayDimension {
                        lower: dimension.lower,
                        length: level.length,
                    };
                } else if dimension.length != level.length {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                expect_delimiter = true;
                completed = nesting == 0;
            };
            if kind == 3 {
                if expect_delimiter == false {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                expect_delimiter = false;
            };
            let mut element = false;
            if kind == 4 {
                let text = token.text.clone();
                if expect_delimiter {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                events.push(ArrayTextEvent::Text(text));
                element = true;
            };
            if kind == 5 {
                let text = token.text;
                if expect_delimiter {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                if nulls == 1 {
                    events.push(ArrayTextEvent::Null);
                } else if nulls == 0 {
                    events.push(ArrayTextEvent::Text(text));
                } else {
                    events.push(ArrayTextEvent::Unknown);
                    return array_text_result(dimensions, events, 0);
                };
                element = true;
            };
            if element {
                count += 1;
                frozen = true;
                if nesting != rank {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                let level = levels[nesting - 1];
                levels[nesting - 1] = ArrayDimension {
                    lower: 1,
                    length: level.length + 1,
                };
                expect_delimiter = true;
            };
        }
        position = array_text_skip_space(&source, position);
        if position != source.characters.len() {
            return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
        };
        let mut result_dimensions: Vec<ArrayDimension> = Vec::new();
        if count > 0 {
            index = 0;
            while index < rank {
                result_dimensions.push(dimensions[index]);
                index += 1;
            }
        };
        return array_text_result(result_dimensions, events, 0);
    };
    ArrayTextPlan::Unknown
}

pub(crate) fn array_text_event_count(input: &ArrayTextPayload) -> Int4Value {
    Int4Value::Value(input.events.len() as i32)
}

pub(crate) fn array_text_event_at(input: &ArrayTextPayload, index: Int4Value) -> TextValue {
    if let Int4Value::Error(error) = index {
        return TextValue::Error(error);
    };
    if let Int4Value::Value(position) = index {
        if position < 0 {
            return TextValue::Unknown;
        };
        let offset = usize::try_from(position).unwrap_or(0);
        if offset >= input.events.len() {
            return TextValue::Unknown;
        };
        let event = input.events[offset].clone();
        if let ArrayTextEvent::Text(text) = event {
            return TextValue::Value(text);
        };
        if let ArrayTextEvent::Null = event {
            return TextValue::Null;
        };
        if let ArrayTextEvent::Error(error) = event {
            return TextValue::Error(error);
        };
    };
    TextValue::Unknown
}

pub fn finish_array_text(plan: ArrayTextPlan, converted: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = converted {
        return ArrayValue::Error(error);
    };
    if let ArrayTextPlan::Null = plan {
        return ArrayValue::Null;
    };
    if let ArrayTextPlan::Value(payload) = plan {
        let mut index: usize = 0;
        while index < payload.events.len() {
            let event = payload.events[index].clone();
            if let ArrayTextEvent::Error(error) = event {
                return ArrayValue::Error(error);
            };
            index += 1;
        }
        if let ArrayArguments::Value(value) = converted {
            index = 0;
            while index < value.elements.len() {
                let element = value.elements[index].clone();
                if let ArrayElement::Unknown = element {
                    if value.element_type != "pg_catalog.name" {
                        return ArrayValue::Unknown;
                    };
                };
                index += 1;
            }
            return make_array_value(ArrayPayload {
                null_bitmap: value.null_bitmap,
                element_type: value.element_type,
                element_kind: value.element_kind,
                dimensions: payload.dimensions,
                elements: value.elements,
            });
        };
    };
    ArrayValue::Unknown
}

pub fn prepare_array_text(input: TextValue, box_delimiter: bool, nulls: i32) -> ArrayTextPayload {
    let mut delimiter = ',';
    if box_delimiter {
        delimiter = ';';
    };
    let plan = parse_array_text(input, delimiter, nulls);
    if let ArrayTextPlan::Value(payload) = plan {
        return payload;
    };
    let mut state: i32 = -1;
    if let ArrayTextPlan::Null = plan {
        state = 0;
    };
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let events: Vec<ArrayTextEvent> = Vec::new();
    ArrayTextPayload {
        state: state,
        dimensions: dimensions,
        events: events,
    }
}

pub(crate) fn array_text_has_event(input: &ArrayTextPayload, index: Int4Value) -> bool {
    if input.state != 1 {
        return false;
    };
    if let Int4Value::Value(position) = index {
        return position >= 0 && ((position as i64) < ((input.events.len() as i32) as i64));
    };
    false
}

pub fn array_text_event_needs_input(input: &ArrayTextPayload, index: Int4Value) -> bool {
    if let Int4Value::Value(position) = index {
        if position >= 0 && (position as i64) < ((input.events.len() as i32) as i64) {
            let event = input.events[usize::try_from(position).unwrap_or(0)].clone();
            if let ArrayTextEvent::Error(_) = event {
                return false;
            };
            return true;
        };
    };
    false
}

pub fn array_text_next_index(input: Int4Value) -> Int4Value {
    if let Int4Value::Value(value) = input {
        if value < 2147483647 {
            return Int4Value::Value(value + 1);
        };
    };
    Int4Value::Unknown
}

pub fn finish_prepared_array_text(
    input: ArrayTextPayload,
    converted: ArrayArguments,
) -> ArrayValue {
    if input.state == 0 {
        return ArrayValue::Null;
    };
    if input.state != 1 {
        return ArrayValue::Unknown;
    };
    finish_array_text(ArrayTextPlan::Value(input), converted)
}

#[derive(Clone, Copy)]
pub struct ArraySubscriptBound {
    pub provided: bool,
    pub state: i32,
    pub value: i32,
}

#[derive(Clone)]
pub struct ArraySubscriptPayload {
    pub upper: Vec<ArraySubscriptBound>,
    pub lower: Vec<ArraySubscriptBound>,
}

#[derive(Clone)]
pub enum ArraySubscripts {
    Error(SqlError),
    Value(ArraySubscriptPayload),
}

pub fn make_array_subscripts() -> ArraySubscripts {
    let upper: Vec<ArraySubscriptBound> = Vec::new();
    let lower: Vec<ArraySubscriptBound> = Vec::new();
    ArraySubscripts::Value(ArraySubscriptPayload {
        upper: upper,
        lower: lower,
    })
}

pub fn append_array_subscript(
    input: ArraySubscripts,
    index: Int4Value,
    is_lower: bool,
    provided: bool,
) -> ArraySubscripts {
    if let ArraySubscripts::Error(_) = input {
        return input;
    };
    if let Int4Value::Error(error) = index {
        return ArraySubscripts::Error(error);
    };
    if let ArraySubscripts::Value(payload) = input {
        let mut state = -1;
        let mut value: i32 = 0;
        if let Int4Value::Null = index {
            state = 0;
        };
        if let Int4Value::Value(number) = index {
            state = 1;
            value = number;
        };
        let bound = ArraySubscriptBound {
            provided: provided,
            state: state,
            value: value,
        };
        let mut upper = payload.upper;
        let mut lower = payload.lower;
        if is_lower {
            lower.push(bound);
        } else {
            upper.push(bound);
        };
        return ArraySubscripts::Value(ArraySubscriptPayload {
            upper: upper,
            lower: lower,
        });
    };
    input
}

pub fn array_subscript_continues(input: ArrayValue) -> bool {
    if let ArrayValue::Value(_) = input {
        return true;
    };
    false
}

pub fn array_subscript_initial(input: ArrayValue) -> ArrayElement {
    if let ArrayValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayElement::Null;
    };
    ArrayElement::Unknown
}

fn array_subscript_state(input: &ArraySubscriptPayload) -> i32 {
    let mut state: i32 = 1;
    let mut position: usize = 0;
    while position < input.upper.len() + input.lower.len() {
        let mut bound = ArraySubscriptBound {
            provided: false,
            state: 1,
            value: 0,
        };
        if position < input.upper.len() {
            bound = input.upper[position];
        } else {
            bound = input.lower[position - input.upper.len()];
        };
        if bound.provided {
            if bound.state == -1 {
                state = -1;
            };
            if bound.state == 0 && state != -1 {
                state = 0;
            };
        };
        position += 1;
    }
    state
}

pub fn array_fetch_subscript(input: ArrayValue, indices: ArraySubscripts) -> ArrayElement {
    if let ArrayValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayElement::Null;
    };
    if let ArrayValue::Unknown = input {
        return ArrayElement::Unknown;
    };
    if let ArraySubscripts::Error(error) = indices {
        return ArrayElement::Error(error);
    };
    if let ArraySubscripts::Value(bounds) = indices {
        let state = array_subscript_state(&bounds);
        if state == -1 {
            return ArrayElement::Unknown;
        };
        if state == 0 {
            return ArrayElement::Null;
        };
        if let ArrayValue::Value(payload) = input {
            if bounds.upper.len() != payload.dimensions.len()
                || bounds.upper.len() == 0
                || bounds.lower.len() != 0
            {
                return ArrayElement::Null;
            };
            let mut offset: i64 = 0i64;
            let mut depth: usize = 0;
            while depth < payload.dimensions.len() {
                let dimension = payload.dimensions[depth];
                let index = bounds.upper[depth];
                if index.provided == false {
                    return ArrayElement::Unknown;
                };
                if (dimension.lower as i64) + (dimension.length as i64) > 2147483647i64 {
                    return ArrayElement::Null;
                };
                let relative = (index.value as i64) - (dimension.lower as i64);
                if relative < 0i64 || relative >= dimension.length as i64 {
                    return ArrayElement::Null;
                };
                offset = offset * (dimension.length as i64) + relative;
                depth += 1;
            }
            let position = usize::try_from(offset as i32).unwrap_or(payload.elements.len());
            if position < payload.elements.len() {
                return payload.elements[position].clone();
            };
        };
    };
    ArrayElement::Unknown
}

#[derive(Clone, Copy)]
struct ArraySliceAxis {
    start: i32,
    length: i32,
    position: i32,
}

fn array_empty_like(input: &ArrayPayload) -> ArrayValue {
    let identity = input.element_type.as_str();
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    make_array_value(ArrayPayload {
        null_bitmap: BoolValue::Value(false),
        element_type: identity.to_owned(),
        element_kind: input.element_kind,
        dimensions: dimensions,
        elements: elements,
    })
}

pub fn array_slice_subscript(input: ArrayValue, indices: ArraySubscripts) -> ArrayValue {
    if let ArrayValue::Error(_) = input {
        return input;
    };
    if let ArrayValue::Null = input {
        return input;
    };
    if let ArrayValue::Unknown = input {
        return input;
    };
    if let ArraySubscripts::Error(error) = indices {
        return ArrayValue::Error(error);
    };
    if let ArraySubscripts::Value(bounds) = indices {
        let state = array_subscript_state(&bounds);
        if state == -1 {
            return ArrayValue::Unknown;
        };
        if state == 0 {
            return ArrayValue::Null;
        };
        if let ArrayValue::Value(payload) = input {
            if bounds.upper.len() != bounds.lower.len() || bounds.upper.len() == 0 {
                return ArrayValue::Unknown;
            };
            if bounds.upper.len() > payload.dimensions.len() || payload.dimensions.len() == 0 {
                return array_empty_like(&payload);
            };
            let mut axes: Vec<ArraySliceAxis> = Vec::new();
            let mut dimensions: Vec<ArrayDimension> = Vec::new();
            let mut depth: usize = 0;
            let mut count: i32 = 1;
            while depth < payload.dimensions.len() {
                let dimension = payload.dimensions[depth];
                let mut low = dimension.lower as i64;
                let mut high = low + (dimension.length as i64) - 1i64;
                if depth < bounds.upper.len() {
                    let first = bounds.lower[depth];
                    let last = bounds.upper[depth];
                    if first.provided && (first.value as i64) > low {
                        low = first.value as i64;
                    };
                    if last.provided
                        && (dimension.lower as i64) + (dimension.length as i64) <= 2147483647i64
                        && (last.value as i64) < high
                    {
                        high = last.value as i64;
                    };
                };
                if low > high {
                    return array_empty_like(&payload);
                };
                let length = (high - low + 1i64) as i32;
                let start = (low - (dimension.lower as i64)) as i32;
                axes.push(ArraySliceAxis {
                    start: start,
                    length: length,
                    position: 0,
                });
                dimensions.push(ArrayDimension {
                    lower: 1,
                    length: length,
                });
                count = count * length;
                depth += 1;
            }
            let mut elements: Vec<ArrayElement> = Vec::new();
            let mut position: i32 = 0;
            while position < count {
                let mut offset: i64 = 0i64;
                depth = 0;
                while depth < axes.len() {
                    let axis = axes[depth];
                    offset = offset * (payload.dimensions[depth].length as i64)
                        + ((axis.start + axis.position) as i64);
                    depth += 1;
                }
                let index = usize::try_from(offset as i32).unwrap_or(payload.elements.len());
                if index >= payload.elements.len() {
                    return ArrayValue::Unknown;
                };
                elements.push(payload.elements[index].clone());
                position = position + 1;
                depth = axes.len();
                while depth > 0 {
                    depth = depth - 1;
                    let axis = axes[depth];
                    let next = axis.position + 1;
                    if next < axis.length {
                        axes[depth] = ArraySliceAxis {
                            start: axis.start,
                            length: axis.length,
                            position: next,
                        };
                        break;
                    };
                    axes[depth] = ArraySliceAxis {
                        start: axis.start,
                        length: axis.length,
                        position: 0,
                    };
                }
            }
            return make_array_value(ArrayPayload {
                null_bitmap: payload.null_bitmap,
                element_type: payload.element_type,
                element_kind: payload.element_kind,
                dimensions: dimensions,
                elements: elements,
            });
        };
    };
    ArrayValue::Unknown
}

const ARRAY_COMPARISON_UNDEFINED: u32 = 6822435;
const ARRAY_COMPARISON_TYPE_MISMATCH: u32 = 6822148;

#[derive(Clone)]
pub struct ArrayComparisonPayload {
    pub left: Vec<ArrayElement>,
    pub right: Vec<ArrayElement>,
    pub limit: usize,
    pub state: i32,
    pub error: SqlError,
    pub tail: i32,
    pub value: i32,
}

#[derive(Clone)]
pub enum ArrayComparisonPlan {
    Value(ArrayComparisonPayload),
}

fn array_comparison_state(state: i32, error: SqlError, value: i32) -> ArrayComparisonPayload {
    let left: Vec<ArrayElement> = Vec::new();
    let right: Vec<ArrayElement> = Vec::new();
    ArrayComparisonPayload {
        left: left,
        right: right,
        limit: 0,
        state: state,
        error: error,
        tail: 0,
        value: value,
    }
}

fn array_shape_order(left: &ArrayPayload, right: &ArrayPayload) -> i32 {
    if left.elements.len() < right.elements.len() {
        return -1;
    };
    if left.elements.len() > right.elements.len() {
        return 1;
    };
    if left.dimensions.len() < right.dimensions.len() {
        return -1;
    };
    if left.dimensions.len() > right.dimensions.len() {
        return 1;
    };
    let mut position: usize = 0;
    while position < left.dimensions.len() {
        if left.dimensions[position].length < right.dimensions[position].length {
            return -1;
        };
        if left.dimensions[position].length > right.dimensions[position].length {
            return 1;
        };
        position += 1;
    }
    position = 0;
    while position < left.dimensions.len() {
        if left.dimensions[position].lower < right.dimensions[position].lower {
            return -1;
        };
        if left.dimensions[position].lower > right.dimensions[position].lower {
            return 1;
        };
        position += 1;
    }
    0
}

pub fn prepare_array_comparison(
    left: ArrayValue,
    right: ArrayValue,
    equality: bool,
    available: bool,
) -> ArrayComparisonPayload {
    if let ArrayValue::Error(error) = left {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Error(error) = right {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Unknown = left {
        return array_comparison_state(-1, make_sql_error(0), 0);
    };
    if let ArrayValue::Unknown = right {
        return array_comparison_state(-1, make_sql_error(0), 0);
    };
    if let ArrayValue::Null = left {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Null = right {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Value(a) = left {
        if let ArrayValue::Value(b) = right {
            if a.element_type != b.element_type || a.element_kind != b.element_kind {
                return array_comparison_state(
                    -2,
                    make_sql_error(ARRAY_COMPARISON_TYPE_MISMATCH),
                    0,
                );
            };
            let tail = array_shape_order(&a, &b);
            if equality && tail != 0 {
                return array_comparison_state(2, make_sql_error(0), 1);
            };
            if available == false {
                return array_comparison_state(-2, make_sql_error(ARRAY_COMPARISON_UNDEFINED), 0);
            };
            let mut limit = a.elements.len();
            if b.elements.len() < limit {
                limit = b.elements.len();
            };
            return ArrayComparisonPayload {
                left: a.elements,
                right: b.elements,
                limit: limit,
                state: 1,
                error: make_sql_error(0),
                tail: tail,
                value: 0,
            };
        };
    };
    array_comparison_state(-1, make_sql_error(0), 0)
}

pub(crate) fn array_comparison_initial(input: &ArrayComparisonPayload) -> Int4Value {
    if input.state == -2 {
        return Int4Value::Error(input.error);
    };
    if input.state == -1 {
        return Int4Value::Unknown;
    };
    if input.state == 0 {
        return Int4Value::Null;
    };
    Int4Value::Value(input.value)
}

pub(crate) fn array_comparison_continues(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    result: Int4Value,
) -> bool {
    if let Int4Value::Value(comparison) = result {
        if let Int4Value::Value(offset) = index {
            return input.state == 1
                && comparison == 0
                && offset >= 0
                && (offset as i64) < ((input.limit as i32) as i64);
        };
    };
    false
}

pub(crate) fn array_comparison_element_at(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    right: bool,
) -> ArrayElement {
    if let Int4Value::Value(offset) = index {
        let position = usize::try_from(offset).unwrap_or(input.limit);
        if offset >= 0 && position < input.limit {
            if right {
                return input.right[position].clone();
            };
            return input.left[position].clone();
        };
    };
    ArrayElement::Unknown
}

pub fn array_comparison_pair(left: ArrayElement, right: ArrayElement, equality: bool) -> Int4Value {
    if let ArrayElement::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let ArrayElement::Error(error) = right {
        return Int4Value::Error(error);
    };
    if let ArrayElement::Unknown = left {
        return Int4Value::Unknown;
    };
    if let ArrayElement::Unknown = right {
        return Int4Value::Unknown;
    };
    let mut left_null = false;
    let mut right_null = false;
    if let ArrayElement::Null = left {
        left_null = true;
    };
    if let ArrayElement::Null = right {
        right_null = true;
    };
    if left_null && right_null {
        return Int4Value::Value(0);
    };
    if left_null {
        return Int4Value::Value(1);
    };
    if right_null {
        if equality {
            return Int4Value::Value(1);
        };
        return Int4Value::Value(-1);
    };
    Int4Value::Null
}

pub fn array_pair_requires_scalar(input: Int4Value) -> bool {
    if let Int4Value::Null = input {
        return true;
    };
    false
}

pub fn array_equality_step(input: BoolValue) -> Int4Value {
    if let BoolValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let BoolValue::Unknown = input {
        return Int4Value::Unknown;
    };
    if let BoolValue::Value(value) = input {
        if value {
            return Int4Value::Value(0);
        };
    };
    Int4Value::Value(1)
}

pub fn array_order_step(input: Int4Value) -> Int4Value {
    if let Int4Value::Value(value) = input {
        if value < 0 {
            return Int4Value::Value(-1);
        };
        if value > 0 {
            return Int4Value::Value(1);
        };
        return Int4Value::Value(0);
    };
    if let Int4Value::Null = input {
        return Int4Value::Unknown;
    };
    input
}

pub fn array_order_from_equality(input: BoolValue) -> Int4Value {
    if let BoolValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let BoolValue::Value(value) = input {
        if value {
            return Int4Value::Value(0);
        };
    };
    Int4Value::Unknown
}

pub(crate) fn finish_array_comparison(
    input: &ArrayComparisonPayload,
    result: Int4Value,
) -> Int4Value {
    if input.state == 1 {
        if let Int4Value::Value(value) = result {
            if value == 0 {
                return Int4Value::Value(input.tail);
            };
        };
    };
    result
}

pub fn prepare_array_membership(
    left: ArrayValue,
    right: ArrayValue,
    reverse: bool,
    available: bool,
) -> ArrayComparisonPayload {
    let payload = prepare_array_comparison(left, right, false, available);
    if payload.state == 1 && reverse {
        return ArrayComparisonPayload {
            left: payload.right,
            right: payload.left,
            limit: payload.limit,
            state: payload.state,
            error: payload.error,
            tail: payload.tail,
            value: payload.value,
        };
    };
    payload
}

pub fn array_membership_initial(input: &ArrayComparisonPayload, all: bool) -> BoolValue {
    if input.state == -2 {
        return BoolValue::Error(input.error);
    };
    if input.state == -1 {
        return BoolValue::Unknown;
    };
    if input.state == 0 {
        return BoolValue::Null;
    };
    BoolValue::Value(all)
}

pub fn array_membership_continues(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    result: BoolValue,
    all: bool,
) -> bool {
    if input.state != 1 {
        return false;
    };
    let outcome = check_from_bool(result);
    if all && and_stops(outcome) {
        return false;
    };
    if all == false && or_stops(outcome) {
        return false;
    };
    if let Int4Value::Value(offset) = index {
        return offset >= 0 && (offset as i64) < ((input.left.len() as i32) as i64);
    };
    false
}

pub fn array_membership_element_at(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    right: bool,
) -> ArrayElement {
    if let Int4Value::Value(offset) = index {
        if right {
            let position = usize::try_from(offset).unwrap_or(input.right.len());
            if offset >= 0 && position < input.right.len() {
                return input.right[position].clone();
            };
        } else {
            let position = usize::try_from(offset).unwrap_or(input.left.len());
            if offset >= 0 && position < input.left.len() {
                return input.left[position].clone();
            };
        };
    };
    ArrayElement::Unknown
}

pub fn array_membership_match_initial(
    input: &ArrayComparisonPayload,
    index: Int4Value,
) -> BoolValue {
    let source = array_membership_element_at(input, index, false);
    if let ArrayElement::Error(error) = source {
        return BoolValue::Error(error);
    };
    BoolValue::Value(false)
}

pub fn array_membership_scan_continues(
    input: &ArrayComparisonPayload,
    source_index: Int4Value,
    index: Int4Value,
    matched: BoolValue,
) -> bool {
    if or_stops(check_from_bool(matched)) {
        return false;
    };
    let source = array_membership_element_at(input, source_index, false);
    if let ArrayElement::Null = source {
        return false;
    };
    if let Int4Value::Value(offset) = index {
        return offset >= 0 && (offset as i64) < ((input.right.len() as i32) as i64);
    };
    false
}

pub fn array_membership_pair(left: ArrayElement, right: ArrayElement) -> Int4Value {
    if let ArrayElement::Null = left {
        return Int4Value::Value(1);
    };
    if let ArrayElement::Null = right {
        return Int4Value::Value(1);
    };
    array_comparison_pair(left, right, true)
}

pub fn array_membership_match_step(matched: BoolValue, comparison: Int4Value) -> BoolValue {
    let mut value = BoolValue::Unknown;
    if let Int4Value::Value(result) = comparison {
        value = BoolValue::Value(result == 0);
    };
    if let Int4Value::Error(error) = comparison {
        value = BoolValue::Error(error);
    };
    bool_from_check(or_finish(check_from_bool(matched), check_from_bool(value)))
}

pub fn array_membership_finish_step(result: BoolValue, matched: BoolValue, all: bool) -> BoolValue {
    if all {
        return bool_from_check(and_finish(
            check_from_bool(result),
            check_from_bool(matched),
        ));
    };
    bool_from_check(or_finish(check_from_bool(result), check_from_bool(matched)))
}

pub fn array_coercion_deferred(input: ArrayElement) -> ArrayElement {
    if let ArrayElement::Null = input {
        return ArrayElement::Null;
    };
    if let ArrayElement::Error(error) = input {
        return ArrayElement::Error(error);
    };
    ArrayElement::Unknown
}

pub fn finish_array_coercion(
    input: ArrayOutputPayload,
    converted: ArrayArguments,
    binary: bool,
) -> ArrayValue {
    if input.state == -2 {
        return ArrayValue::Error(input.error);
    };
    if input.state == -1 {
        return ArrayValue::Unknown;
    };
    if input.state == 0 {
        return ArrayValue::Null;
    };
    if let ArrayArguments::Error(error) = converted {
        return ArrayValue::Error(error);
    };
    if let ArrayArguments::Value(value) = converted {
        if value.elements.len() != input.elements.len() {
            return ArrayValue::Unknown;
        };
        let mut null_bitmap = value.null_bitmap;
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        if binary || value.elements.len() > 0 {
            let mut position: usize = 0;
            while position < input.dimensions.len() {
                dimensions.push(input.dimensions[position]);
                position += 1;
            }
        };
        if binary {
            null_bitmap = input.null_bitmap;
        };
        return make_array_value(ArrayPayload {
            null_bitmap: null_bitmap,
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: value.elements,
        });
    };
    ArrayValue::Unknown
}

const ARRAY_SEARCH_MULTIDIMENSIONAL: u32 = 466560;
const ARRAY_SEARCH_NULL_START: u32 = 3452548;

const ARRAY_BUCKET_MULTIDIMENSIONAL: u32 = 3452630;
const ARRAY_BUCKET_NULL_ELEMENT: u32 = 3452548;

pub(crate) fn prepare_array_bucket(
    needle: ArrayElement,
    input: ArrayValue,
    available: bool,
) -> ArrayComparisonPayload {
    if let ArrayElement::Error(error) = needle {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Error(error) = input {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayElement::Unknown = needle {
        return array_comparison_state(-1, make_sql_error(0), 0);
    };
    if let ArrayValue::Unknown = input {
        return array_comparison_state(-1, make_sql_error(0), 0);
    };
    if let ArrayElement::Null = needle {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Null = input {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Value(array) = input {
        if array.dimensions.len() > 1 {
            return array_comparison_state(-2, make_sql_error(ARRAY_BUCKET_MULTIDIMENSIONAL), 0);
        };
        let mut known_null = false;
        let mut unknown_null = false;
        let mut position: usize = 0;
        while position < array.elements.len() {
            let cell = array.elements[position].clone();
            if let ArrayElement::Error(error) = cell {
                return array_comparison_state(-2, error, 0);
            };
            if let ArrayElement::Null = cell {
                known_null = true;
            };
            if let ArrayElement::Unknown = cell {
                unknown_null = true;
            };
            position += 1;
        }
        if known_null {
            return array_comparison_state(-2, make_sql_error(ARRAY_BUCKET_NULL_ELEMENT), 0);
        };
        if unknown_null {
            return array_comparison_state(-1, make_sql_error(0), 0);
        };
        if available == false {
            return array_comparison_state(-2, make_sql_error(ARRAY_COMPARISON_UNDEFINED), 0);
        };
        let mut needles: Vec<ArrayElement> = Vec::new();
        needles.push(needle);
        return ArrayComparisonPayload {
            limit: array.elements.len(),
            left: array.elements,
            right: needles,
            state: 1,
            error: make_sql_error(0),
            tail: 0,
            value: 0,
        };
    };
    array_comparison_state(-1, make_sql_error(0), 0)
}

pub(crate) fn array_bucket_limit(input: &ArrayComparisonPayload) -> Int4Value {
    if input.state == 1 {
        return Int4Value::Value(input.limit as i32);
    };
    array_comparison_initial(input)
}

pub(crate) fn array_bucket_operand(input: &ArrayComparisonPayload) -> ArrayElement {
    if input.state == 1 && input.right.len() == 1 {
        return input.right[0].clone();
    };
    ArrayElement::Unknown
}

pub(crate) fn array_bucket_continues(low: Int4Value, high: Int4Value) -> bool {
    if let Int4Value::Value(left) = low {
        if let Int4Value::Value(right) = high {
            return left >= 0 && left < right;
        };
    };
    false
}

pub(crate) fn array_bucket_midpoint(low: Int4Value, high: Int4Value) -> Int4Value {
    if let Int4Value::Value(left) = low {
        if let Int4Value::Value(right) = high {
            if left >= 0 && left <= right {
                return Int4Value::Value(left + (right - left) / 2);
            };
        };
    };
    Int4Value::Unknown
}

pub(crate) fn array_bucket_lower(
    low: Int4Value,
    high: Int4Value,
    compared: Int4Value,
) -> Int4Value {
    if let Int4Value::Error(error) = compared {
        return Int4Value::Error(error);
    };
    if let Int4Value::Value(order) = compared {
        if order < 0 {
            return low;
        };
        let position = array_bucket_midpoint(low, high);
        if let Int4Value::Value(midpoint) = position {
            if midpoint < 2147483647 {
                return Int4Value::Value(midpoint + 1);
            };
        };
    };
    Int4Value::Unknown
}

pub(crate) fn array_bucket_upper(
    low: Int4Value,
    high: Int4Value,
    compared: Int4Value,
) -> Int4Value {
    if let Int4Value::Error(error) = compared {
        return Int4Value::Error(error);
    };
    if let Int4Value::Value(order) = compared {
        if order >= 0 {
            return high;
        };
        return array_bucket_midpoint(low, high);
    };
    Int4Value::Unknown
}

pub fn prepare_array_search(
    input: ArrayValue,
    needle: ArrayElement,
    start: Int4Value,
    provided: bool,
    available: bool,
) -> ArrayComparisonPayload {
    if let ArrayValue::Error(error) = input {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayElement::Error(error) = needle {
        return array_comparison_state(-2, error, 0);
    };
    if let Int4Value::Error(error) = start {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Null = input {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Value(array) = input {
        if array.dimensions.len() > 1 {
            return array_comparison_state(-2, make_sql_error(ARRAY_SEARCH_MULTIDIMENSIONAL), 0);
        };
        if array.dimensions.len() == 0 {
            return array_comparison_state(2, make_sql_error(0), 0);
        };
        let mut needle_null = false;
        let mut needle_unknown = false;
        if let ArrayElement::Null = needle {
            needle_null = true;
        };
        if let ArrayElement::Unknown = needle {
            needle_unknown = true;
        };
        let mut known_null = false;
        let mut unknown_null = false;
        let mut position: usize = 0;
        while position < array.elements.len() {
            let element = array.elements[position].clone();
            if let ArrayElement::Null = element {
                known_null = true;
            };
            if let ArrayElement::Unknown = element {
                unknown_null = true;
            };
            position += 1;
        }
        if needle_null && known_null == false && unknown_null == false {
            return array_comparison_state(2, make_sql_error(0), 0);
        };
        if provided {
            if start == Int4Value::Unknown {
                return array_comparison_state(-1, make_sql_error(0), 0);
            };
            if start == Int4Value::Null {
                if known_null == false && (needle_unknown || (needle_null && unknown_null)) {
                    return array_comparison_state(-1, make_sql_error(0), 0);
                };
                return array_comparison_state(-2, make_sql_error(ARRAY_SEARCH_NULL_START), 0);
            };
        };
        if available == false {
            if known_null == false && (needle_unknown || (needle_null && unknown_null)) {
                return array_comparison_state(-1, make_sql_error(0), 0);
            };
            return array_comparison_state(-2, make_sql_error(ARRAY_COMPARISON_UNDEFINED), 0);
        };
        let lower = array.dimensions[0].lower;
        let mut offset: i64 = 0i64;
        if provided {
            if let Int4Value::Value(value) = start {
                offset = (value as i64) - (lower as i64);
                if offset < 0i64 {
                    offset = 0i64;
                };
                if offset > (array.elements.len() as i32) as i64 {
                    offset = (array.elements.len() as i32) as i64;
                };
            };
        };
        let mut needles: Vec<ArrayElement> = Vec::new();
        needles.push(needle);
        return ArrayComparisonPayload {
            limit: array.elements.len(),
            left: array.elements,
            right: needles,
            state: 1,
            error: make_sql_error(0),
            tail: lower,
            value: offset as i32,
        };
    };
    array_comparison_state(-1, make_sql_error(0), 0)
}

pub fn array_search_initial(input: &ArrayComparisonPayload) -> Int4Value {
    if input.state == -2 {
        return Int4Value::Error(input.error);
    };
    if input.state == -1 {
        return Int4Value::Unknown;
    };
    Int4Value::Null
}

pub fn array_search_start(input: &ArrayComparisonPayload) -> Int4Value {
    Int4Value::Value(input.value)
}

pub fn array_search_continues(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    result: Int4Value,
    all: bool,
) -> bool {
    if input.state != 1 {
        return false;
    };
    if let Int4Value::Error(_) = result {
        return false;
    };
    if result == Int4Value::Unknown {
        return false;
    };
    if all == false {
        if let Int4Value::Value(_) = result {
            return false;
        };
    };
    if let Int4Value::Value(offset) = index {
        return offset >= 0 && (offset as i64) < ((input.limit as i32) as i64);
    };
    false
}

pub fn array_search_needle(input: &ArrayComparisonPayload) -> ArrayElement {
    if input.state == 1 && input.right.len() == 1 {
        return input.right[0].clone();
    };
    ArrayElement::Unknown
}

pub fn array_search_result_step(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    compared: Int4Value,
) -> Int4Value {
    if let Int4Value::Error(error) = compared {
        return Int4Value::Error(error);
    };
    if compared == Int4Value::Unknown {
        return Int4Value::Unknown;
    };
    if let Int4Value::Value(value) = compared {
        if value != 0 {
            return Int4Value::Null;
        };
        if let Int4Value::Value(offset) = index {
            let position: i64 = (input.tail as i64) + (offset as i64);
            return Int4Value::Value(position as i32);
        };
    };
    Int4Value::Unknown
}

pub fn array_search_append(input: ArrayArguments, result: Int4Value) -> ArrayArguments {
    if let Int4Value::Value(value) = result {
        return append_array_argument(input, array_element_from_int4(make_int4_value(value)));
    };
    input
}

pub fn finish_array_search_positions(
    input: &ArrayComparisonPayload,
    values: ArrayArguments,
    result: Int4Value,
) -> ArrayValue {
    if input.state == 0 {
        return ArrayValue::Null;
    };
    if let Int4Value::Error(error) = result {
        return ArrayValue::Error(error);
    };
    if result == Int4Value::Unknown {
        return ArrayValue::Unknown;
    };
    finish_array_constructor(values)
}

pub fn prepare_array_rewrite(
    input: ArrayValue,
    needle: ArrayElement,
    replacement: ArrayElement,
    remove: bool,
    available: bool,
) -> ArrayComparisonPayload {
    if let ArrayValue::Error(error) = input {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayElement::Error(error) = needle {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayElement::Error(error) = replacement {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Null = input {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Value(array) = input {
        if array.elements.len() == 0 {
            return array_comparison_state(2, make_sql_error(0), 0);
        };
        if remove && array.dimensions.len() > 1 {
            return array_comparison_state(-2, make_sql_error(ARRAY_SEARCH_MULTIDIMENSIONAL), 0);
        };
        if available == false {
            return array_comparison_state(-2, make_sql_error(ARRAY_COMPARISON_UNDEFINED), 0);
        };
        let mut queries: Vec<ArrayElement> = Vec::new();
        queries.push(needle);
        queries.push(replacement);
        return ArrayComparisonPayload {
            limit: array.elements.len(),
            left: array.elements,
            right: queries,
            state: 1,
            error: make_sql_error(0),
            tail: 0,
            value: 0,
        };
    };
    array_comparison_state(-1, make_sql_error(0), 0)
}

pub fn array_rewrite_needle(input: &ArrayComparisonPayload) -> ArrayElement {
    if input.state == 1 && input.right.len() == 2 {
        return input.right[0].clone();
    };
    ArrayElement::Unknown
}

pub fn array_rewrite_continues(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    result: Int4Value,
) -> bool {
    if input.state != 1 {
        return false;
    };
    if let Int4Value::Error(_) = result {
        return false;
    };
    if let Int4Value::Value(offset) = index {
        return offset >= 0 && (offset as i64) < ((input.limit as i32) as i64);
    };
    false
}

pub fn array_rewrite_step(
    input: ArrayArguments,
    plan: &ArrayComparisonPayload,
    index: Int4Value,
    compared: Int4Value,
    remove: bool,
) -> ArrayArguments {
    if let ArrayArguments::Error(_) = input {
        return input;
    };
    if let Int4Value::Error(error) = compared {
        return ArrayArguments::Error(error);
    };
    let source = array_membership_element_at(plan, index, false);
    if compared == Int4Value::Unknown {
        if remove {
            return ArrayArguments::Unknown;
        };
        if let ArrayElement::Null = source {
            let replacement = plan.right[1].clone();
            if let ArrayElement::Null = replacement {
                return append_array_argument(input, ArrayElement::Null);
            };
        };
        return append_array_argument(input, ArrayElement::Unknown);
    };
    if let Int4Value::Value(value) = compared {
        if value == 0 {
            if remove {
                return input;
            };
            return append_array_argument(input, plan.right[1].clone());
        };
        return append_array_argument(input, source);
    };
    ArrayArguments::Unknown
}

pub fn array_rewrite_changed(
    input: &ArrayComparisonPayload,
    compared: Int4Value,
    remove: bool,
) -> BoolValue {
    if remove == false && input.right.len() == 2 {
        let needle = input.right[0].clone();
        let replacement = input.right[1].clone();
        if let ArrayElement::Null = needle {
            if let ArrayElement::Null = replacement {
                return BoolValue::Value(false);
            };
        };
    };
    if let Int4Value::Value(value) = compared {
        return BoolValue::Value(value == 0);
    };
    BoolValue::Unknown
}

pub fn finish_array_rewrite(
    original: ArrayValue,
    plan: &ArrayComparisonPayload,
    values: ArrayArguments,
    remove: bool,
    changed: BoolValue,
) -> ArrayValue {
    if plan.state == -2 {
        return ArrayValue::Error(plan.error);
    };
    if plan.state == -1 {
        return ArrayValue::Unknown;
    };
    if plan.state == 0 {
        return ArrayValue::Null;
    };
    if plan.state == 2 {
        return original;
    };
    if let ArrayArguments::Error(error) = values {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Value(source) = original {
        if let ArrayArguments::Value(output) = values {
            if source.element_type != output.element_type
                || source.element_kind != output.element_kind
            {
                return ArrayValue::Error(make_sql_error(ARRAY_COMPARISON_TYPE_MISMATCH));
            };
            let mut dimensions: Vec<ArrayDimension> = Vec::new();
            if remove {
                if output.elements.len() > 0 {
                    dimensions.push(ArrayDimension {
                        lower: source.dimensions[0].lower,
                        length: output.elements.len() as i32,
                    });
                };
            } else {
                let mut position: usize = 0;
                while position < source.dimensions.len() {
                    dimensions.push(source.dimensions[position]);
                    position += 1;
                }
            };
            let mut null_bitmap = output.null_bitmap;
            if changed == BoolValue::Value(false) {
                null_bitmap = source.null_bitmap;
            } else if changed != BoolValue::Value(true) {
                null_bitmap = array_bitmap_choice(null_bitmap, source.null_bitmap);
            };
            return make_array_value(ArrayPayload {
                null_bitmap: null_bitmap,
                element_type: output.element_type,
                element_kind: output.element_kind,
                dimensions: dimensions,
                elements: output.elements,
            });
        };
    };
    ArrayValue::Unknown
}

#[derive(Clone)]
pub struct ArraySortPayload {
    pub null_bitmap: BoolValue,
    pub element_type: String,
    pub element_kind: i32,
    pub dimensions: Vec<ArrayDimension>,
    pub elements: Vec<ArrayElement>,
    pub order: Vec<usize>,
    pub buffer: Vec<usize>,
    pub ties: Vec<usize>,
    pub rows: i32,
    pub width: i32,
    pub run: i32,
    pub segment: i32,
    pub left: i32,
    pub right: i32,
    pub output: i32,
    pub phase: i32,
    pub tie: i32,
    pub state: i32,
    pub error: SqlError,
    pub descending: bool,
    pub nulls_first: bool,
}

#[derive(Clone)]
pub enum ArraySortPlan {
    Value(ArraySortPayload),
}

pub fn prepare_array_hash(
    input: ArrayValue,
    seed: Int8Value,
    available: bool,
) -> ArrayComparisonPayload {
    if let ArrayValue::Error(error) = input {
        return array_comparison_state(-2, error, 1);
    };
    if let Int8Value::Error(error) = seed {
        return array_comparison_state(-2, error, 1);
    };
    if let ArrayValue::Unknown = input {
        return array_comparison_state(-1, make_sql_error(0), 1);
    };
    if seed == Int8Value::Unknown {
        return array_comparison_state(-1, make_sql_error(0), 1);
    };
    if let ArrayValue::Null = input {
        return array_comparison_state(0, make_sql_error(0), 1);
    };
    if seed == Int8Value::Null {
        return array_comparison_state(0, make_sql_error(0), 1);
    };
    if available == false {
        return array_comparison_state(-2, make_sql_error(ARRAY_COMPARISON_UNDEFINED), 1);
    };
    if let ArrayValue::Value(value) = input {
        let limit = value.elements.len();
        let right: Vec<ArrayElement> = Vec::new();
        return ArrayComparisonPayload {
            left: value.elements,
            right: right,
            limit: limit,
            state: 1,
            error: make_sql_error(0),
            tail: 0,
            value: 1,
        };
    };
    array_comparison_state(-1, make_sql_error(0), 1)
}

pub(crate) fn array_hash_initial64(input: &ArrayComparisonPayload) -> Int8Value {
    let initial = array_comparison_initial(input);
    if let Int4Value::Error(error) = initial {
        return Int8Value::Error(error);
    };
    if initial == Int4Value::Unknown {
        return Int8Value::Unknown;
    };
    if initial == Int4Value::Null {
        return Int8Value::Null;
    };
    Int8Value::Value(1i64)
}

pub(crate) fn array_hash_continues32(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    first: Int4Value,
    second: Int4Value,
) -> bool {
    if let Int4Value::Value(_) = first {
        if let Int4Value::Value(_) = second {
            if let Int4Value::Value(offset) = index {
                return input.state == 1
                    && offset >= 0
                    && (offset as i64) < ((input.limit as i32) as i64);
            };
        };
    };
    false
}

pub(crate) fn array_hash_continues64(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    first: Int8Value,
    second: Int8Value,
) -> bool {
    if let Int8Value::Value(_) = first {
        if let Int8Value::Value(_) = second {
            if let Int4Value::Value(offset) = index {
                return input.state == 1
                    && offset >= 0
                    && (offset as i64) < ((input.limit as i32) as i64);
            };
        };
    };
    false
}
