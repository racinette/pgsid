#[derive(Clone)]
pub(crate) struct TsqueryStoragePlan { entries: Vec<TsqueryPayload>, valid: bool }

pub fn make_tsquery_storage_plan() -> TsqueryStoragePlan {
    let entries: Vec<TsqueryPayload> = Vec::new();
    TsqueryStoragePlan {entries:entries,valid:true}
}

pub fn append_tsquery_storage(input: TsqueryStoragePlan, value: TsqueryValue) -> TsqueryStoragePlan {
    let mut entries = input.entries;
    if let TsqueryValue::Value(payload) = value {
        entries.push(payload);
        return TsqueryStoragePlan {entries:entries,valid:input.valid};
    };
    TsqueryStoragePlan {entries:entries,valid:false}
}

pub fn tsquery_from_captured_text(input: TextValue, plan: &TsqueryStoragePlan, index: Int4Value) -> TsqueryValue {
    if let TextValue::Error(error) = input { return TsqueryValue::Error(error); };
    if let TextValue::Null = input { return TsqueryValue::Null; };
    if let TextValue::Value(text) = input {
        if let Int4Value::Value(offset) = index {
            let position = usize::try_from(offset).unwrap_or(plan.entries.len());
            if plan.valid && offset >= 0 && position < plan.entries.len() {
                let captured = make_tsquery_value(plan.entries[position].clone());
                let rendered = tsquery_to_text(captured.clone());
                if let TextValue::Value(expected) = rendered {
                    if expected == text { return captured; };
                };
            };
        };
    };
    TsqueryValue::Unknown
}

pub fn advance_tsquery_storage(nullness: BoolValue, index: Int4Value) -> Int4Value {
    if let BoolValue::Error(error) = nullness { return Int4Value::Error(error); };
    if nullness == BoolValue::Value(true) { return index; };
    if nullness == BoolValue::Value(false) {
        if let Int4Value::Value(value) = index {
            if value < 2147483647 { return make_int4_value(value+1); };
        };
    };
    Int4Value::Unknown
}

pub fn finish_tsquery_storage(input: ArrayElement, plan: &TsqueryStoragePlan, index: Int4Value) -> ArrayElement {
    if let ArrayElement::Error(error) = input { return ArrayElement::Error(error); };
    if let Int4Value::Value(count) = index {
        if plan.valid && count >= 0 && usize::try_from(count).unwrap_or(0) == plan.entries.len() { return input; };
    };
    ArrayElement::Unknown
}
