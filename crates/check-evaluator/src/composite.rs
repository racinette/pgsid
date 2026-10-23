#[derive(Clone)]
pub struct CompositePayload {
    pub type_name: String,
    pub fields: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum CompositeValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(CompositePayload),
}

pub fn composite_unknown() -> CompositeValue { CompositeValue::Unknown }
pub fn composite_null() -> CompositeValue { CompositeValue::Null }

pub fn composite_from_case_guard(input: CheckOutcome) -> CompositeValue {
    if let CheckOutcome::Error(error) = input { return CompositeValue::Error(error); };
    CompositeValue::Unknown
}

pub fn make_composite_value(input: CompositePayload) -> CompositeValue {
    let identity: Vec<char> = input.type_name.chars().collect();
    if identity.len() == 0 || input.fields.len() > 2147483647 { return CompositeValue::Unknown; };
    let mut index: usize = 0;
    while index < identity.len() {
        if identity[index] == '\0' { return CompositeValue::Unknown; };
        index += 1;
    }
    let mut fields = input.fields;
    index = 0;
    while index < fields.len() {
        let source = fields[index].clone();
        let checked = array_coerced_owned_element(source.clone());
        if let ArrayElement::Error(error) = checked { return CompositeValue::Error(error); };
        if let ArrayElement::Unknown = checked {
            let family = array_element_family(source);
            if family >= 41 && family <= 44 { return CompositeValue::Unknown; };
        };
        fields[index] = checked;
        index += 1;
    }
    CompositeValue::Value(CompositePayload { type_name: input.type_name, fields: fields })
}

pub fn composite_from_coerced_value(input: CompositeValue) -> CompositeValue {
    if let CompositeValue::Value(value) = input { return make_composite_value(value); };
    input
}

pub fn make_composite_fields(type_name: &str) -> CompositeValue {
    let fields: Vec<ArrayElement> = Vec::new();
    make_composite_value(CompositePayload { type_name: type_name.to_owned(), fields: fields })
}

pub fn append_composite_field(input: CompositeValue, field: ArrayElement) -> CompositeValue {
    if let CompositeValue::Value(value) = input {
        let mut fields = value.fields;
        fields.push(field);
        return make_composite_value(CompositePayload { type_name: value.type_name, fields: fields });
    };
    input
}

pub fn prepare_composite_row_coercion(input: CompositeValue, type_name: &str) -> CompositeValue {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Value(_) = checked { return make_composite_fields(type_name); };
    checked
}

pub fn composite_field_count(input: CompositeValue) -> Int4Value {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return Int4Value::Error(error); };
    if let CompositeValue::Null = checked { return Int4Value::Null; };
    if let CompositeValue::Value(value) = checked { return make_int4_value(value.fields.len() as i32); };
    Int4Value::Unknown
}

pub fn composite_field_at(input: CompositeValue, index: Int4Value) -> ArrayElement {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return ArrayElement::Error(error); };
    if let Int4Value::Error(error) = index { return ArrayElement::Error(error); };
    if let CompositeValue::Null = checked { return ArrayElement::Null; };
    if let CompositeValue::Value(value) = checked {
        if let Int4Value::Value(offset) = index {
            let position = usize::try_from(offset).unwrap_or(value.fields.len());
            if offset >= 0 && position < value.fields.len() { return value.fields[position].clone(); };
        };
    };
    ArrayElement::Unknown
}

pub fn composite_datum_is_null(input: CompositeValue) -> BoolValue {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return BoolValue::Error(error); };
    if let CompositeValue::Unknown = checked { return BoolValue::Unknown; };
    if let CompositeValue::Null = checked { return make_bool_value(true); };
    make_bool_value(false)
}

fn composite_row_null_test(input: CompositeValue, negated: bool) -> BoolValue {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return BoolValue::Error(error); };
    if let CompositeValue::Null = checked { return make_bool_value(negated == false); };
    if let CompositeValue::Value(value) = checked {
        let mut unknown = false;
        let mut index: usize = 0;
        while index < value.fields.len() {
            let field = value.fields[index].clone();
            let mut known = true;
            if let ArrayElement::Unknown = field {
                unknown = true;
                known = false;
            };
            if known {
                let mut is_null = false;
                if let ArrayElement::Null = field { is_null = true; };
                if is_null == negated { return make_bool_value(false); };
            };
            index += 1;
        }
        if unknown { return BoolValue::Unknown; };
        return make_bool_value(true);
    };
    BoolValue::Unknown
}

pub fn composite_row_is_null(input: CompositeValue) -> BoolValue { composite_row_null_test(input, false) }

pub fn composite_is_null(input:CompositeValue)->BoolValue { composite_datum_is_null(input) }
pub fn composite_row_is_not_null(input: CompositeValue) -> BoolValue { composite_row_null_test(input, true) }

pub fn array_element_from_composite(input: CompositeValue) -> ArrayElement {
    if let CompositeValue::Error(error) = input { return ArrayElement::Error(error); };
    if let CompositeValue::Null = input { return ArrayElement::Null; };
    if let CompositeValue::Value(value) = input { return ArrayElement::Composite(value); };
    ArrayElement::Unknown
}

pub fn array_element_to_composite(input: ArrayElement) -> CompositeValue {
    if let ArrayElement::Error(error) = input { return CompositeValue::Error(error); };
    if let ArrayElement::Null = input { return CompositeValue::Null; };
    if let ArrayElement::Composite(value) = input { return CompositeValue::Value(value); };
    CompositeValue::Unknown
}

#[derive(Clone)]
pub struct CompositeTypeNode {
    pub type_name: String,
    pub kind: i32,
    pub element_type: String,
    pub child: usize,
    pub fields: Vec<usize>,
    pub bound_profile: RangeBoundContext,
}

#[derive(Clone)]
pub struct CompositeTypeContext { pub nodes: Vec<CompositeTypeNode> }

#[derive(Clone)]
pub enum CompositeTypePlan { Value(CompositeTypeContext) }

pub fn empty_composite_type_plan() -> CompositeTypePlan {
    let nodes: Vec<CompositeTypeNode> = Vec::new();
    CompositeTypePlan::Value(CompositeTypeContext { nodes: nodes })
}

pub fn append_composite_type_node(input: CompositeTypePlan, type_name: &str, kind: i32,
    element_type: &str, child: i32, bound_profile: RangeBoundContext) -> CompositeTypePlan {
    if let CompositeTypePlan::Value(value) = input {
        let mut nodes = value.nodes;
        let fields: Vec<usize> = Vec::new();
        nodes.push(CompositeTypeNode { type_name:type_name.to_owned(),kind:kind,element_type:element_type.to_owned(),
            child:usize::try_from(child).unwrap_or(2147483647),fields:fields,bound_profile:bound_profile });
        return CompositeTypePlan::Value(CompositeTypeContext { nodes:nodes });
    };
    input
}

pub fn append_composite_type_field(input: CompositeTypePlan, index: i32, child: i32) -> CompositeTypePlan {
    if let CompositeTypePlan::Value(value) = input {
        let mut nodes = value.nodes;
        let position = usize::try_from(index).unwrap_or(nodes.len());
        if position < nodes.len() {
            let node = nodes[position].clone();
            let mut fields = node.fields;
            fields.push(usize::try_from(child).unwrap_or(2147483647));
            nodes[position] = CompositeTypeNode {type_name:node.type_name,kind:node.kind,element_type:node.element_type,
                child:node.child,fields:fields,bound_profile:node.bound_profile};
        };
        return CompositeTypePlan::Value(CompositeTypeContext { nodes:nodes });
    };
    input
}

fn composite_type_context_valid(context: &CompositeTypeContext) -> bool {
    let mut index: usize = 0;
    while index < context.nodes.len() {
        let node = context.nodes[index].clone();
        if node.type_name.as_str() == "" || node.kind < 0 || node.kind > 45 {return false;};
        if node.kind == 41 && (node.element_type.as_str() == "" || node.child >= context.nodes.len()) {return false;};
        if node.kind > 0 && node.kind < 41 || node.kind == 42 || node.kind == 43 || node.kind == 45 {
            let profile = node.bound_profile;
            if profile.nodes.len() == 0 || range_bound_profile_valid(&profile) == false {return false;};
            if profile.nodes[0].kind != node.kind {return false;};
        };
        let mut field: usize = 0;
        while field < node.fields.len() {
            if node.kind != 44 || node.fields[field] >= context.nodes.len() {return false;};
            field += 1;
        }
        index += 1;
    }
    context.nodes.len() > 0
}

fn composite_prepare_cell(input: ArrayElement, context: &CompositeTypeContext, index: usize) -> ArrayElement {
    if let ArrayElement::Null = input {return input;};
    if let ArrayElement::Unknown = input {return input;};
    if let ArrayElement::Error(_) = input {return input;};
    if index >= context.nodes.len() {return ArrayElement::Unknown;};
    let node = context.nodes[index].clone();
    if array_element_family(input.clone()) != node.kind {return ArrayElement::Unknown;};
    if let ArrayElement::Composite(payload) = input {
        if node.kind != 44 || payload.type_name != node.type_name || payload.fields.len() != node.fields.len() {return ArrayElement::Unknown;};
        let mut fields: Vec<ArrayElement> = Vec::new();
        let mut position: usize = 0;
        while position < payload.fields.len() {
            let original = payload.fields[position].clone();
            let checked = composite_prepare_cell(original.clone(),context,node.fields[position]);
            if let ArrayElement::Error(error) = checked {return ArrayElement::Error(error);};
            if let ArrayElement::Unknown = checked {
                let mut partial = false;
                if let ArrayElement::Unknown = original {partial=true;};
                if partial == false {return ArrayElement::Unknown;};
            };
            fields.push(checked);
            position += 1;
        }
        return array_element_from_composite(make_composite_value(CompositePayload {type_name:payload.type_name,fields:fields}));
    };
    if let ArrayElement::Array(payload) = input {
        if node.kind != 41 || payload.element_type != node.element_type || payload.element_kind != context.nodes[node.child].kind {return ArrayElement::Unknown;};
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut position: usize = 0;
        while position < payload.elements.len() {
            let original = payload.elements[position].clone();
            let checked = composite_prepare_cell(original.clone(),context,node.child);
            if let ArrayElement::Unknown = checked {
                let mut partial = false;
                if let ArrayElement::Unknown = original {partial=true;};
                if partial == false {return ArrayElement::Unknown;};
            };
            elements.push(checked);
            position += 1;
        }
        return array_element_from_array(make_array_value(ArrayPayload {null_bitmap:payload.null_bitmap,element_type:payload.element_type,
            element_kind:payload.element_kind,dimensions:payload.dimensions,elements:elements}));
    };
    let profile = node.bound_profile;
    range_prepare_profiled_bound(input,&profile)
}

pub(crate) fn composite_prepare_scalar_cell(checked: ArrayElement) -> ArrayElement {
    if let ArrayElement::Enum(payload) = checked {
        return array_element_from_enum(make_enum_value(payload.ordinal));
    };
    if let ArrayElement::Date(value) = checked {
        return array_element_from_date(make_date_value(value));
    };
    if let ArrayElement::Timestamp(value) = checked {
        return array_element_from_timestamp(make_timestamp_value(value));
    };
    if let ArrayElement::Timestamptz(value) = checked {
        return array_element_from_timestamptz(make_timestamptz_value(value));
    };
    if let ArrayElement::Xid(value) = checked {
        return array_element_from_xid(make_xid_value(value));
    };
    if let ArrayElement::Cid(value) = checked {
        return array_element_from_cid(make_cid_value(value));
    };
    if let ArrayElement::Interval(payload) = checked {
        return array_element_from_interval(make_interval_value(
            payload.months,
            payload.days,
            payload.time,
        ));
    };
    if let ArrayElement::Text(text) = checked {
        let characters: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < characters.len() {
            if characters[position] == '\0' {
                return ArrayElement::Unknown;
            };
            position += 1;
        }
        return ArrayElement::Text(text);
    };
    if let ArrayElement::ByteaUnspecified(length) = checked {
        if length < 0 {
            return ArrayElement::Unknown;
        };
    };
    if let ArrayElement::Numeric(text) = checked {
        return array_element_from_numeric(make_numeric_value(text.as_str()));
    };
    if let ArrayElement::Json(payload) = checked {
        let value = make_json_value(payload.source.as_str());
        if let JsonValue::Value(actual) = value {
            if actual.kind == payload.kind && actual.depth == payload.depth {
                return ArrayElement::Json(actual);
            };
        };
        return ArrayElement::Unknown;
    };
    if let ArrayElement::Jsonb(payload) = checked {
        return array_element_from_jsonb(jsonb_from_coerced_value(JsonbValue::Value(payload)));
    };
    if let ArrayElement::Xml(value) = checked { return array_element_from_xml(make_xml_value(value.as_str())); };
    if let ArrayElement::XmlRenderedText(value) = checked { return array_element_from_xml(xml_from_rendered_text(TextValue::Value(value))); };
    if let ArrayElement::Jsonpath(payload) = checked {
        return array_element_from_jsonpath(jsonpath_from_coerced_value(JsonpathValue::Value(
            payload,
        )));
    };
    if let ArrayElement::JsonpathStoredText(text) = checked {
        return array_element_from_jsonpath(jsonpath_from_coerced_value(
            JsonpathValue::StoredText(text),
        ));
    };
    if let ArrayElement::Snapshot(payload) = checked {
        return array_element_from_snapshot(make_snapshot_value(payload));
    };
    if let ArrayElement::Path(payload) = checked {
        return array_element_from_path(make_path_value(payload));
    };
    if let ArrayElement::Polygon(payload) = checked {
        return array_element_from_polygon(make_polygon_value(payload));
    };
    checked
}

pub fn composite_from_coerced_plan(input: CompositeValue, plan: CompositeTypePlan) -> CompositeValue {
    if let CompositeValue::Value(payload) = input {
        if let CompositeTypePlan::Value(context) = plan {
            if composite_type_context_valid(&context) == false {return CompositeValue::Unknown;};
            if context.nodes[0].kind != 44 {return CompositeValue::Unknown;};
            return array_element_to_composite(composite_prepare_cell(ArrayElement::Composite(payload),&context,0));
        };
        return CompositeValue::Unknown;
    };
    input
}

pub fn array_from_coerced_composite_plan(
    input: ArrayValue,
    element_type: &str,
    plan: CompositeTypePlan,
) -> ArrayValue {
    if let ArrayValue::Value(payload) = input {
        if let CompositeTypePlan::Value(context) = plan {
            if composite_type_context_valid(&context) == false {
                return ArrayValue::Unknown;
            };
            if (context.nodes[0].kind != 41 && context.nodes[0].kind != 44)
                || payload.element_kind != context.nodes[0].kind
                || payload.element_type.as_str() != element_type
            {
                return ArrayValue::Unknown;
            };
            let mut elements: Vec<ArrayElement> = Vec::new();
            let mut position: usize = 0;
            while position < payload.elements.len() {
                let original = payload.elements[position].clone();
                let checked = composite_prepare_cell(original.clone(), &context, 0);
                if let ArrayElement::Unknown = checked {
                    let mut partial = false;
                    if let ArrayElement::Unknown = original {
                        partial = true;
                    };
                    if partial == false {
                        return ArrayValue::Unknown;
                    };
                };
                elements.push(checked);
                position += 1;
            }
            return make_array_value(ArrayPayload {
                null_bitmap: payload.null_bitmap,
                element_type: payload.element_type,
                element_kind: payload.element_kind,
                dimensions: payload.dimensions,
                elements: elements,
            });
        };
        return ArrayValue::Unknown;
    };
    input
}
