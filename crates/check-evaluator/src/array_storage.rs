pub fn array_bitmap_union(left: BoolValue, right: BoolValue) -> BoolValue {
    if left == BoolValue::Value(true) || right == BoolValue::Value(true) {
        return BoolValue::Value(true);
    };
    if left == BoolValue::Value(false) && right == BoolValue::Value(false) {
        return BoolValue::Value(false);
    };
    BoolValue::Unknown
}

pub fn array_element_bitmap(input: ArrayElement) -> BoolValue {
    if let ArrayElement::Unknown = input {
        return BoolValue::Unknown;
    };
    if let ArrayElement::Null = input {
        return BoolValue::Value(true);
    };
    if let ArrayElement::Error(error) = input {
        return BoolValue::Error(error);
    };
    BoolValue::Value(false)
}

pub fn array_elements_bitmap(input: &ArrayPayload) -> BoolValue {
    let mut result = BoolValue::Value(false);
    let mut index: usize = 0;
    while index < input.elements.len() {
        result = array_bitmap_union(result, array_element_bitmap(input.elements[index].clone()));
        index += 1;
    }
    result
}

pub fn array_reconstruction_bitmap(input: &ArrayPayload) -> BoolValue {
    if input.null_bitmap == BoolValue::Value(false) {
        return input.null_bitmap;
    };
    array_elements_bitmap(input)
}

pub fn array_bitmap_choice(left: BoolValue, right: BoolValue) -> BoolValue {
    if left == right {
        return left;
    };
    BoolValue::Unknown
}

pub fn array_null_bitmap(input: ArrayValue) -> BoolValue {
    if let ArrayValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return BoolValue::Null;
    };
    if let ArrayValue::Value(value) = input {
        return value.null_bitmap;
    };
    BoolValue::Unknown
}

#[derive(Clone, Copy)]
pub(crate) struct TsvectorStorageEntry { pub native_bytes: i32, pub lexeme_count: i32 }

#[derive(Clone)]
pub(crate) struct TsvectorStoragePlan { pub entries: Vec<TsvectorStorageEntry>, pub valid: bool }

pub fn make_tsvector_storage_plan() -> TsvectorStoragePlan {
    let entries: Vec<TsvectorStorageEntry> = Vec::new();
    TsvectorStoragePlan {entries:entries,valid:true}
}

pub fn append_tsvector_storage(input: TsvectorStoragePlan, bytes: i32, count: i32) -> TsvectorStoragePlan {
    let mut entries = input.entries;
    let valid = input.valid && count >= 0 && count <= 1048575 && bytes >= 8 + count * 4 && bytes <= 1073741823;
    entries.push(TsvectorStorageEntry {native_bytes:bytes,lexeme_count:count});
    TsvectorStoragePlan {entries:entries,valid:valid}
}

pub fn apply_tsvector_storage(input: TsvectorValue, plan: &TsvectorStoragePlan, index: Int4Value) -> TsvectorValue {
    if let TsvectorValue::Null = input { return input; };
    if let TsvectorValue::Error(error) = input { return TsvectorValue::Error(error); };
    if let TsvectorValue::Value(value) = input {
        if let Int4Value::Value(offset) = index {
            let position = usize::try_from(offset).unwrap_or(plan.entries.len());
            if plan.valid && offset >= 0 && position < plan.entries.len() {
                let entry = plan.entries[position];
                if value.lexemes.len() == usize::try_from(entry.lexeme_count).unwrap_or(0) {
                    return make_tsvector_value(TsvectorPayload {lexemes:value.lexemes,native_bytes:entry.native_bytes});
                };
            };
        };
        return TsvectorValue::Value(TsvectorPayload {lexemes:value.lexemes,native_bytes:-1});
    };
    input
}

pub fn advance_tsvector_storage(nullness: BoolValue, index: Int4Value) -> Int4Value {
    if let BoolValue::Error(error) = nullness { return Int4Value::Error(error); };
    if nullness == BoolValue::Value(true) { return index; };
    if nullness == BoolValue::Value(false) {
        if let Int4Value::Value(value) = index {
            if value < 2147483647 { return make_int4_value(value + 1); };
        };
    };
    Int4Value::Unknown
}

pub fn finish_tsvector_storage(input: ArrayElement, plan: &TsvectorStoragePlan, index: Int4Value) -> ArrayElement {
    if let ArrayElement::Error(error) = input { return ArrayElement::Error(error); };
    if let Int4Value::Value(count) = index {
        if plan.valid && count >= 0 && usize::try_from(count).unwrap_or(0) == plan.entries.len() { return input; };
    };
    clear_tsvector_storage(input)
}

fn clear_tsvector_storage(input: ArrayElement) -> ArrayElement {
    if let ArrayElement::Tsvector(value) = input {
        return ArrayElement::Tsvector(TsvectorPayload {lexemes:value.lexemes,native_bytes:-1});
    };
    if let ArrayElement::Array(value) = input {
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut i: usize = 0;
        while i < value.elements.len() {
            elements.push(clear_tsvector_storage(value.elements[i].clone()));
            i += 1;
        }
        return ArrayElement::Array(ArrayPayload {element_type:value.element_type,element_kind:value.element_kind,
            dimensions:value.dimensions,null_bitmap:value.null_bitmap,elements:elements});
    };
    if let ArrayElement::Composite(value) = input {
        let mut fields: Vec<ArrayElement> = Vec::new();
        let mut i: usize = 0;
        while i < value.fields.len() {
            fields.push(clear_tsvector_storage(value.fields[i].clone()));
            i += 1;
        }
        return ArrayElement::Composite(CompositePayload {type_name:value.type_name,fields:fields});
    };
    if let ArrayElement::Range(value) = input {
        let mut bounds: Vec<ArrayElement> = Vec::new();
        let mut i: usize = 0;
        while i < value.bounds.len() {
            bounds.push(clear_tsvector_storage(value.bounds[i].clone()));
            i += 1;
        }
        return ArrayElement::Range(range_payload_with_bounds(value,bounds));
    };
    if let ArrayElement::Multirange(value) = input {
        let mut ranges: Vec<RangeValue> = Vec::new();
        let mut i: usize = 0;
        while i < value.ranges.len() {
            let member = array_element_from_range(value.ranges[i].clone());
            let restored = clear_tsvector_storage(member);
            ranges.push(array_element_to_range(restored));
            i += 1;
        }
        return ArrayElement::Multirange(multirange_payload_with_ranges(value,ranges));
    };
    input
}

#[derive(Clone)]
struct ArrayStorageEntry {
    path: String,
    dimensions: i32,
    elements: i32,
    null_bitmap: bool,
}

#[derive(Clone)]
pub(crate) struct ArrayStoragePlan {
    entries: Vec<ArrayStorageEntry>,
    valid: bool,
}

pub fn make_array_storage_plan() -> ArrayStoragePlan {
    let entries: Vec<ArrayStorageEntry> = Vec::new();
    ArrayStoragePlan {entries:entries,valid:true}
}

pub fn append_array_storage(input: ArrayStoragePlan, path: &str, dimensions: i32, elements: i32, bitmap: bool) -> ArrayStoragePlan {
    let mut entries = input.entries;
    let valid = input.valid && dimensions >= 0 && dimensions <= 6 && elements >= 0;
    entries.push(ArrayStorageEntry {path:path.to_owned(),dimensions:dimensions,elements:elements,null_bitmap:bitmap});
    ArrayStoragePlan {entries:entries,valid:valid}
}

fn array_storage_child_path(path: &str, index: usize) -> String {
    let mut child = path.to_owned();
    child.push('/');
    let number = index as i32;
    let wide = number as i64;
    let text = text_signed_number(wide);
    child.push_str(text.as_str());
    child
}

fn array_storage_missing_bitmap(input: &ArrayPayload) -> BoolValue {
    let elements = array_elements_bitmap(input);
    if elements == BoolValue::Value(true) { return elements; };
    BoolValue::Unknown
}

pub fn forget_array_storage(input: ArrayElement) -> ArrayElement {
    if let ArrayElement::Array(value) = input {
        let bitmap = array_storage_missing_bitmap(&value);
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut i: usize = 0;
        while i < value.elements.len() {
            elements.push(forget_array_storage(value.elements[i].clone()));
            i += 1;
        }
        return ArrayElement::Array(ArrayPayload {element_type:value.element_type,element_kind:value.element_kind,
            dimensions:value.dimensions,elements:elements,null_bitmap:bitmap});
    };
    if let ArrayElement::Composite(value) = input {
        let mut fields: Vec<ArrayElement> = Vec::new();
        let mut i: usize = 0;
        while i < value.fields.len() {
            fields.push(forget_array_storage(value.fields[i].clone()));
            i += 1;
        }
        return ArrayElement::Composite(CompositePayload {type_name:value.type_name,fields:fields});
    };
    if let ArrayElement::Range(value) = input {
        let mut bounds: Vec<ArrayElement> = Vec::new();
        let mut i: usize = 0;
        while i < value.bounds.len() {
            bounds.push(forget_array_storage(value.bounds[i].clone()));
            i += 1;
        }
        return ArrayElement::Range(range_payload_with_bounds(value,bounds));
    };
    if let ArrayElement::Multirange(value) = input {
        let mut ranges: Vec<RangeValue> = Vec::new();
        let mut i: usize = 0;
        while i < value.ranges.len() {
            let member = array_element_from_range(value.ranges[i].clone());
            let restored = forget_array_storage(member);
            ranges.push(array_element_to_range(restored));
            i += 1;
        }
        return ArrayElement::Multirange(multirange_payload_with_ranges(value,ranges));
    };
    input
}

#[derive(Clone)]
struct ArrayStorageResult {
    value: ArrayElement,
    matched: usize,
    valid: bool,
}

fn apply_array_storage_at(input: ArrayElement, plan: &ArrayStoragePlan, path: &str) -> ArrayStorageResult {
    if let ArrayElement::Array(value) = input {
        let mut matched: usize = 0;
        let mut bitmap = array_storage_missing_bitmap(&value);
        let mut valid = true;
        let mut i: usize = 0;
        while i < plan.entries.len() {
            let entry = plan.entries[i].clone();
            if entry.path.as_str() == path {
                matched += 1;
                if usize::try_from(entry.dimensions).unwrap_or(2147483647) != value.dimensions.len()
                    || usize::try_from(entry.elements).unwrap_or(2147483647) != value.elements.len()
                    || (entry.null_bitmap == false && bitmap == BoolValue::Value(true)) {
                    valid = false;
                };
                bitmap = BoolValue::Value(entry.null_bitmap);
            };
            i += 1;
        }
        if matched != 1 { valid = false; };
        let mut elements: Vec<ArrayElement> = Vec::new();
        i = 0;
        while i < value.elements.len() {
            let child_path = array_storage_child_path(path,i);
            let child = apply_array_storage_at(value.elements[i].clone(),plan,child_path.as_str());
            matched += child.matched;
            valid = valid && child.valid;
            elements.push(child.value);
            i += 1;
        }
        let restored = ArrayElement::Array(ArrayPayload {element_type:value.element_type,element_kind:value.element_kind,
            dimensions:value.dimensions,elements:elements,null_bitmap:bitmap});
        return ArrayStorageResult {value:restored,matched:matched,valid:valid};
    };
    if let ArrayElement::Composite(value) = input {
        let mut fields: Vec<ArrayElement> = Vec::new();
        let mut matched: usize = 0;
        let mut valid = true;
        let mut i: usize = 0;
        while i < value.fields.len() {
            let child_path = array_storage_child_path(path,i);
            let child = apply_array_storage_at(value.fields[i].clone(),plan,child_path.as_str());
            matched += child.matched;
            valid = valid && child.valid;
            fields.push(child.value);
            i += 1;
        }
        let restored = ArrayElement::Composite(CompositePayload {type_name:value.type_name,fields:fields});
        return ArrayStorageResult {value:restored,matched:matched,valid:valid};
    };
    if let ArrayElement::Range(value) = input {
        let mut bounds: Vec<ArrayElement> = Vec::new();
        let mut matched: usize = 0;
        let mut valid = true;
        let mut i: usize = 0;
        while i < value.bounds.len() {
            let child_path = array_storage_child_path(path,i);
            let child = apply_array_storage_at(value.bounds[i].clone(),plan,child_path.as_str());
            matched += child.matched;
            valid = valid && child.valid;
            bounds.push(child.value);
            i += 1;
        }
        let restored = ArrayElement::Range(range_payload_with_bounds(value,bounds));
        return ArrayStorageResult {value:restored,matched:matched,valid:valid};
    };
    if let ArrayElement::Multirange(value) = input {
        let mut ranges: Vec<RangeValue> = Vec::new();
        let mut matched: usize = 0;
        let mut valid = true;
        let mut i: usize = 0;
        while i < value.ranges.len() {
            let child_path = array_storage_child_path(path,i);
            let member = array_element_from_range(value.ranges[i].clone());
            let child = apply_array_storage_at(member,plan,child_path.as_str());
            matched += child.matched;
            valid = valid && child.valid;
            ranges.push(array_element_to_range(child.value));
            i += 1;
        }
        let restored = ArrayElement::Multirange(multirange_payload_with_ranges(value,ranges));
        return ArrayStorageResult {value:restored,matched:matched,valid:valid};
    };
    ArrayStorageResult {value:input,matched:0,valid:true}
}

pub fn apply_array_storage(input: ArrayElement, plan: &ArrayStoragePlan) -> ArrayElement {
    let result = apply_array_storage_at(input,plan,"");
    if plan.valid && result.valid && result.matched == plan.entries.len() { return result.value; };
    forget_array_storage(result.value)
}
