const VECTOR_DATATYPE_MISMATCH: u32 = 6822148;


fn catalog_vector_status(value: &ArrayPayload, oid: bool) -> BoolValue {
    let unresolved_flavor: i32 = 0;
    let mut identity = "pg_catalog.int2".to_owned();
    let mut kind: i32 = 1;
    if oid { identity = "pg_catalog.oid".to_owned(); kind = 33; };
    if value.element_type != identity || value.element_kind != kind { return bool_unresolved(unresolved_flavor); };
    if value.dimensions.len() != 1 || value.null_bitmap == BoolValue::Value(true) {
        return BoolValue::Error(make_sql_error(VECTOR_DATATYPE_MISMATCH));
    };
    if value.null_bitmap != BoolValue::Value(false) { return bool_unresolved(unresolved_flavor); };
    make_bool_value(true)
}

fn catalog_vector_units(input: ArrayElement, oid: bool) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayElement::Unknown = input { unresolved_flavor = 1; };
    if let ArrayElement::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayElement::Error(error) = input { return Int8Value::Error(error); };
    if let ArrayElement::Null = input { return Int8Value::Null; };
    if oid { return oid_units(array_element_to_oid(input)); };
    if let ArrayElement::Int2(value) = input { return make_int8_value(value as i64); };
    int8_unresolved(unresolved_flavor)
}

pub fn catalog_vector_to_text(input: ArrayValue, oid: bool) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = input { return TextValue::Error(error); };
    if let ArrayValue::Null = input { return TextValue::Null; };
    if let ArrayValue::Value(value) = input {
        let status = catalog_vector_status(&value, oid);
        if let BoolValue::Error(error) = status { return TextValue::Error(error); };
        if status != BoolValue::Value(true) { return text_unresolved(unresolved_flavor); };
        let mut output = String::new();
        let mut index: usize = 0;
        while index < value.elements.len() {
            let text = int8_to_text(catalog_vector_units(value.elements[index].clone(), oid));
            if let TextValue::Error(error) = text { return TextValue::Error(error); };
            let mut appended = false;
            if let TextValue::Value(part) = text {
                if index > 0 { output.push(' '); };
                output.push_str(part.as_str());
                appended = true;
            };
            if appended == false { let mut local_flavor_49_35: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if local_flavor_49_35 < 1 { local_flavor_49_35 = 1; }; }; if let BoolValue::Unimplemented = status { local_flavor_49_35 = 2; }; return text_unresolved(local_flavor_49_35); };
            index += 1;
        }
        return make_text_value(output.as_str());
    };
    text_unresolved(unresolved_flavor)
}

pub fn catalog_vector_from_text(input: TextValue, oid: bool) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input { return ArrayValue::Error(error); };
    if let TextValue::Null = input { return ArrayValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut position: usize = 0;
        while position < chars.len() {
            while position < chars.len() && oid_input_space(chars[position]) { position += 1; };
            if position == chars.len() { break; };
            let start = position;
            let mut negative = false;
            if chars[position] == '+' || chars[position] == '-' {
                negative = chars[position] == '-'; position += 1;
            };
            let mut radix = 10i64;
            if oid && position < chars.len() && chars[position] == '0' {
                radix = 8i64;
                if position + 1 < chars.len() && (chars[position + 1] == 'x' || chars[position + 1] == 'X') {
                    // The server's strtoul decides how bare hex and binary prefixes parse.
                    if position + 2 == chars.len() { return array_unresolved(resolution_context(unresolved_flavor)); };
                    let next = chars[position + 2];
                    if oid_input_space(next) || next == '+' || next == '-' { return array_unresolved(resolution_context(unresolved_flavor)); };
                };
                if position + 2 < chars.len() {
                    let next = chars[position + 1];
                    let digit = oid_input_digit(chars[position + 2]);
                    if (next == 'x' || next == 'X') && digit >= 0i64 && digit < 16i64 {
                        radix = 16i64; position += 2;
                    };
                    if (next == 'b' || next == 'B') && (digit == 0i64 || digit == 1i64) {
                        return array_unresolved(resolution_context(unresolved_flavor));
                    };
                };
            };
            let digits_start = position;
            let mut small = 0i64;
            while position < chars.len() {
                let digit = oid_input_digit(chars[position]);
                if digit < 0i64 || digit >= radix { break; };
                if oid == false && small <= 32768i64 { small = small * 10i64 + digit; };
                position += 1;
            }
            if position == digits_start { return ArrayValue::Error(make_sql_error(OID_INPUT_INVALID)); };
            if oid {
                let mut token = String::new();
                let mut cursor = start;
                while cursor < position { token.push(chars[cursor]); cursor += 1; };
                let value = oid_from_text(make_text_value(token.as_str()));
                if let OidValue::Error(error) = value { return ArrayValue::Error(error); };
                if let OidValue::Value(units) = value {
                    elements.push(ArrayElement::Oid(units));
                };
                let mut condition_flavor_112_16: i32 = unresolved_flavor; if let OidValue::Unknown = value { if condition_flavor_112_16 < 1 { condition_flavor_112_16 = 1; }; }; if let OidValue::Unimplemented = value { condition_flavor_112_16 = 2; }; if value == OidValue::Unknown || value == OidValue::Unimplemented { return array_unresolved(condition_flavor_112_16); };
            } else {
                if small > 32768i64 || (negative == false && small > 32767i64) {
                    return ArrayValue::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
                };
                if position < chars.len() && chars[position] != ' ' {
                    return ArrayValue::Error(make_sql_error(OID_INPUT_INVALID));
                };
                if negative { small = 0i64 - small; };
                elements.push(ArrayElement::Int2(small as i32));
            };
        }
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        dimensions.push(ArrayDimension { lower: 0, length: elements.len() as i32 });
        let mut identity = "pg_catalog.int2".to_owned();
        let mut kind: i32 = 1;
        if oid { identity = "pg_catalog.oid".to_owned(); kind = 33; };
        return ArrayValue::Value(ArrayPayload {
            null_bitmap: BoolValue::Value(false), element_type: identity, element_kind: kind,
            dimensions, elements,
        });
    };
    array_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__btoidvectorcmp__6oyf(left: ArrayValue, right: ArrayValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = left { unresolved_flavor = 1; };
    if let ArrayValue::Unknown = right { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = left { unresolved_flavor = 2; };
    if let ArrayValue::Unimplemented = right { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = left { return Int4Value::Error(error); };
    if let ArrayValue::Error(error) = right { return Int4Value::Error(error); };
    let mut condition_flavor_145_4: i32 = unresolved_flavor; if let ArrayValue::Unknown = left { if condition_flavor_145_4 < 1 { condition_flavor_145_4 = 1; }; }; if let ArrayValue::Unknown = left { return int4_unresolved(condition_flavor_145_4); }; let mut condition_flavor_145_86: i32 = unresolved_flavor; if let ArrayValue::Unimplemented = left { condition_flavor_145_86 = 2; }; if let ArrayValue::Unimplemented = left { return int4_unresolved(condition_flavor_145_86); };
    let mut condition_flavor_146_4: i32 = unresolved_flavor; if let ArrayValue::Unknown = right { if condition_flavor_146_4 < 1 { condition_flavor_146_4 = 1; }; }; if let ArrayValue::Unknown = right { return int4_unresolved(condition_flavor_146_4); }; let mut condition_flavor_146_87: i32 = unresolved_flavor; if let ArrayValue::Unimplemented = right { condition_flavor_146_87 = 2; }; if let ArrayValue::Unimplemented = right { return int4_unresolved(condition_flavor_146_87); };
    if let ArrayValue::Null = left { return Int4Value::Null; };
    if let ArrayValue::Null = right { return Int4Value::Null; };
    if let ArrayValue::Value(a) = left {
        if let ArrayValue::Value(b) = right {
            let first = catalog_vector_status(&a, true);
            if let BoolValue::Error(error) = first { return Int4Value::Error(error); };
            if first != BoolValue::Value(true) { return int4_unresolved(unresolved_flavor); };
            let second = catalog_vector_status(&b, true);
            if let BoolValue::Error(error) = second { return Int4Value::Error(error); };
            if second != BoolValue::Value(true) { let mut local_flavor_156_50: i32 = unresolved_flavor; if let BoolValue::Unknown = first { if local_flavor_156_50 < 1 { local_flavor_156_50 = 1; }; }; if let BoolValue::Unimplemented = first { local_flavor_156_50 = 2; }; return int4_unresolved(local_flavor_156_50); };
            if a.elements.len() != b.elements.len() {
                return make_int4_value((a.elements.len() as i32) - (b.elements.len() as i32));
            };
            let mut index: usize = 0;
            while index < a.elements.len() {
                let comparison = oid_compare(array_element_to_oid(a.elements[index].clone()), array_element_to_oid(b.elements[index].clone()));
                if comparison != Int4Value::Value(0) { return comparison; };
                index += 1;
            }
            return make_int4_value(0);
        };
    };
    int4_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__oidvectoreq__bpvf(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 3) }
pub fn sql__pg_catalog__oidvectorne__5v7o(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 6) }
pub fn sql__pg_catalog__oidvectorlt__6p1s(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 1) }
pub fn sql__pg_catalog__oidvectorle__3fct(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 2) }
pub fn sql__pg_catalog__oidvectorgt__kevo(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 5) }
pub fn sql__pg_catalog__oidvectorge__bgvu(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 4) }

pub fn sql__pg_catalog__oidvectortypes__w22j(input: ArrayValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = input { return TextValue::Error(error); };
    if let ArrayValue::Null = input { return TextValue::Null; };
    if let ArrayValue::Value(value) = input {
        let status = catalog_vector_status(&value, true);
        if let BoolValue::Error(error) = status { return TextValue::Error(error); };
        if status != BoolValue::Value(true) { return text_unresolved(unresolved_flavor); };
        let mut output = String::new();
        let mut index: usize = 0;
        while index < value.elements.len() {
            let name = oid_alias_to_text(array_element_to_oid(value.elements[index].clone()), true);
            if let TextValue::Error(error) = name { return TextValue::Error(error); };
            // A type OID's name is a catalog fact; a known name is simply not rendered here yet.
            let mut name_flavor: i32 = 2;
            if let TextValue::Unknown = name { name_flavor = 1; };
            if name != make_text_value("-") { return text_unresolved(name_flavor); };
            if index > 0 { output.push_str(", "); };
            output.push('-');
            index += 1;
        }
        return make_text_value(output.as_str());
    };
    text_unresolved(unresolved_flavor)
}

#[derive(Clone)]
struct VectorHashBytes { bytes: Vec<HashByte>, state: CheckOutcome }
fn catalog_vector_hash_bytes(input: ArrayValue) -> VectorHashBytes {
    let mut bytes: Vec<HashByte> = Vec::new();
    if let ArrayValue::Error(error) = input { return VectorHashBytes { bytes, state: CheckOutcome::Error(error) }; };
    if let ArrayValue::Null = input { return VectorHashBytes { bytes, state: CheckOutcome::Null }; };
    if let ArrayValue::Value(value) = input {
        let status = catalog_vector_status(&value, true);
        if let BoolValue::Error(error) = status { return VectorHashBytes { bytes, state: CheckOutcome::Error(error) }; };
        if status != BoolValue::Value(true) {
            let mut vector_state = CheckOutcome::Unimplemented;
            if status == BoolValue::Unknown { vector_state = CheckOutcome::Unknown; };
            return VectorHashBytes { bytes, state: vector_state };
        };
        let mut index: usize = 0;
        while index < value.elements.len() {
            let cell = catalog_vector_units(value.elements[index].clone(), true);
            if let Int8Value::Error(error) = cell { return VectorHashBytes { bytes, state: CheckOutcome::Error(error) }; };
            if let Int8Value::Value(units) = cell {
                let mut word = units;
                let mut octet: i32 = 0;
                while octet < 4 {
                    bytes.push(HashByte { value: word % 256i64 }); word = word / 256i64; octet = octet + 1;
                }
            };
            if (cell == Int8Value::Unknown || cell == Int8Value::Unimplemented) || cell == Int8Value::Null {
                let mut tested_flavor: i32 = 2;
                if cell == Int8Value::Unknown {
                    tested_flavor = 1;
                };
                return VectorHashBytes { bytes, state: check_unresolved(tested_flavor) };
            };
            index += 1;
        }
        return VectorHashBytes { bytes, state: CheckOutcome::True };
    };
    VectorHashBytes { bytes, state: CheckOutcome::Unknown }
}
pub fn sql__pg_catalog__hashoidvector__hb8d(input: ArrayValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    let plan = catalog_vector_hash_bytes(input);
    let state = plan.state;
    if let CheckOutcome::Error(error) = state { return Int4Value::Error(error); };
    if plan.state == CheckOutcome::Null { return Int4Value::Null; };
    if plan.state == CheckOutcome::Unknown { return int4_unresolved(resolution_context(unresolved_flavor)); };
    if plan.state != CheckOutcome::True { return int4_unresolved(2); };
    // Complete OID words contribute the same hash words in either byte order.
    make_int4_value(hash_bytes32(plan.bytes))
}
pub fn sql__pg_catalog__hashoidvectorextended__hlbf(input: ArrayValue, seed: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unknown = seed { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = seed { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = input { return Int8Value::Error(error); };
    if let Int8Value::Error(error) = seed { return Int8Value::Error(error); };
    let mut condition_flavor_253_4: i32 = unresolved_flavor; if let ArrayValue::Unknown = input { if condition_flavor_253_4 < 1 { condition_flavor_253_4 = 1; }; }; if let ArrayValue::Unknown = input { return int8_unresolved(condition_flavor_253_4); }; let mut condition_flavor_253_87: i32 = unresolved_flavor; if let ArrayValue::Unimplemented = input { condition_flavor_253_87 = 2; }; if let ArrayValue::Unimplemented = input { return int8_unresolved(condition_flavor_253_87); };
    let mut condition_flavor_254_4: i32 = unresolved_flavor; if let Int8Value::Unknown = seed { if condition_flavor_254_4 < 1 { condition_flavor_254_4 = 1; }; }; if let Int8Value::Unimplemented = seed { condition_flavor_254_4 = 2; }; if seed == Int8Value::Unknown || seed == Int8Value::Unimplemented { return int8_unresolved(condition_flavor_254_4); };
    if let ArrayValue::Null = input { return Int8Value::Null; };
    if seed == Int8Value::Null { return Int8Value::Null; };
    let plan = catalog_vector_hash_bytes(input);
    let state = plan.state;
    if let CheckOutcome::Error(error) = state { return Int8Value::Error(error); };
    if plan.state == CheckOutcome::Unknown { return int8_unresolved(resolution_context(unresolved_flavor)); };
    if plan.state != CheckOutcome::True { return int8_unresolved(2); };
    if let Int8Value::Value(value) = seed { return make_int8_value(hash_bytes64(plan.bytes, value)); };
    int8_unresolved(unresolved_flavor)
}
fn catalog_vector_send(input: ArrayValue, oid: bool) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = input { return ByteaValue::Error(error); };
    if let ArrayValue::Null = input { return ByteaValue::Null; };
    if let ArrayValue::Value(value) = input {
        let mut kind: i32 = 1;
        let mut width = 2i64;
        if oid { kind = 33; width = 4i64; };
        if value.element_kind != kind { return bytea_unresolved(unresolved_flavor); };
        let mut length = 12i64 + (value.dimensions.len() as i32) as i64 * 8i64;
        let mut index: usize = 0;
        while index < value.elements.len() {
            let cell = value.elements[index].clone();
            if let ArrayElement::Error(error) = cell { return ByteaValue::Error(error); };
            let mut null_cell = false;
            if let ArrayElement::Null = cell { null_cell = true; };
            let mut condition_flavor_282_12: i32 = unresolved_flavor; if let ArrayElement::Unknown = cell { if condition_flavor_282_12 < 1 { condition_flavor_282_12 = 1; }; }; if let ArrayElement::Unknown = cell {
                if value.null_bitmap != BoolValue::Value(false) { return bytea_unresolved(condition_flavor_282_12); };
            }; let mut condition_flavor_284_15: i32 = unresolved_flavor; if let ArrayElement::Unimplemented = cell { condition_flavor_284_15 = 2; }; if let ArrayElement::Unimplemented = cell {
                if value.null_bitmap != BoolValue::Value(false) { return bytea_unresolved(condition_flavor_284_15); };
            };
            length = length + 4i64;
            if null_cell == false { length = length + width; };
            index += 1;
        }
        if length > 2147483647i64 { return bytea_unresolved(unresolved_flavor); };
        return ByteaValue::Unspecified(length as i32);
    };
    bytea_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__int2vectorsend__4kiy(input: ArrayValue) -> ByteaValue { catalog_vector_send(input, false) }
pub fn sql__pg_catalog__oidvectorsend__l5tl(input: ArrayValue) -> ByteaValue { catalog_vector_send(input, true) }
