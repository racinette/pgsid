const VECTOR_DATATYPE_MISMATCH: u32 = 6822148;


fn catalog_vector_status(value: &ArrayPayload, oid: bool) -> BoolValue {
    let mut identity = "pg_catalog.int2".to_owned();
    let mut kind: i32 = 1;
    if oid { identity = "pg_catalog.oid".to_owned(); kind = 33; };
    if value.element_type != identity || value.element_kind != kind { return BoolValue::Unknown; };
    if value.dimensions.len() != 1 || value.null_bitmap == BoolValue::Value(true) {
        return BoolValue::Error(make_sql_error(VECTOR_DATATYPE_MISMATCH));
    };
    if value.null_bitmap != BoolValue::Value(false) { return BoolValue::Unknown; };
    make_bool_value(true)
}

fn catalog_vector_units(input: ArrayElement, oid: bool) -> Int8Value {
    if let ArrayElement::Error(error) = input { return Int8Value::Error(error); };
    if let ArrayElement::Null = input { return Int8Value::Null; };
    if oid { return oid_units(array_element_to_oid(input)); };
    if let ArrayElement::Int2(value) = input { return make_int8_value(value as i64); };
    Int8Value::Unknown
}

pub fn catalog_vector_to_text(input: ArrayValue, oid: bool) -> TextValue {
    if let ArrayValue::Error(error) = input { return TextValue::Error(error); };
    if let ArrayValue::Null = input { return TextValue::Null; };
    if let ArrayValue::Value(value) = input {
        let status = catalog_vector_status(&value, oid);
        if let BoolValue::Error(error) = status { return TextValue::Error(error); };
        if status != BoolValue::Value(true) { return TextValue::Unknown; };
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
            if appended == false { return TextValue::Unknown; };
            index += 1;
        }
        return make_text_value(output.as_str());
    };
    TextValue::Unknown
}

pub fn catalog_vector_from_text(input: TextValue, oid: bool) -> ArrayValue {
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
                    if position + 2 == chars.len() { return ArrayValue::Unknown; };
                    let next = chars[position + 2];
                    if oid_input_space(next) || next == '+' || next == '-' { return ArrayValue::Unknown; };
                };
                if position + 2 < chars.len() {
                    let next = chars[position + 1];
                    let digit = oid_input_digit(chars[position + 2]);
                    if (next == 'x' || next == 'X') && digit >= 0i64 && digit < 16i64 {
                        radix = 16i64; position += 2;
                    };
                    if (next == 'b' || next == 'B') && (digit == 0i64 || digit == 1i64) {
                        return ArrayValue::Unknown;
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
                if value == OidValue::Unknown { return ArrayValue::Unknown; };
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
    ArrayValue::Unknown
}

pub fn sql__pg_catalog__btoidvectorcmp__6oyf(left: ArrayValue, right: ArrayValue) -> Int4Value {
    if let ArrayValue::Error(error) = left { return Int4Value::Error(error); };
    if let ArrayValue::Error(error) = right { return Int4Value::Error(error); };
    if let ArrayValue::Unknown = left { return Int4Value::Unknown; };
    if let ArrayValue::Unknown = right { return Int4Value::Unknown; };
    if let ArrayValue::Null = left { return Int4Value::Null; };
    if let ArrayValue::Null = right { return Int4Value::Null; };
    if let ArrayValue::Value(a) = left {
        if let ArrayValue::Value(b) = right {
            let first = catalog_vector_status(&a, true);
            if let BoolValue::Error(error) = first { return Int4Value::Error(error); };
            if first != BoolValue::Value(true) { return Int4Value::Unknown; };
            let second = catalog_vector_status(&b, true);
            if let BoolValue::Error(error) = second { return Int4Value::Error(error); };
            if second != BoolValue::Value(true) { return Int4Value::Unknown; };
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
    Int4Value::Unknown
}
pub fn sql__pg_catalog__oidvectoreq__bpvf(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 3) }
pub fn sql__pg_catalog__oidvectorne__5v7o(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 6) }
pub fn sql__pg_catalog__oidvectorlt__6p1s(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 1) }
pub fn sql__pg_catalog__oidvectorle__3fct(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 2) }
pub fn sql__pg_catalog__oidvectorgt__kevo(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 5) }
pub fn sql__pg_catalog__oidvectorge__bgvu(left: ArrayValue, right: ArrayValue) -> BoolValue { array_comparison_boolean(sql__pg_catalog__btoidvectorcmp__6oyf(left, right), 4) }

pub fn sql__pg_catalog__oidvectortypes__w22j(input: ArrayValue) -> TextValue {
    if let ArrayValue::Error(error) = input { return TextValue::Error(error); };
    if let ArrayValue::Null = input { return TextValue::Null; };
    if let ArrayValue::Value(value) = input {
        let status = catalog_vector_status(&value, true);
        if let BoolValue::Error(error) = status { return TextValue::Error(error); };
        if status != BoolValue::Value(true) { return TextValue::Unknown; };
        let mut output = String::new();
        let mut index: usize = 0;
        while index < value.elements.len() {
            let name = oid_alias_to_text(array_element_to_oid(value.elements[index].clone()), true);
            if let TextValue::Error(error) = name { return TextValue::Error(error); };
            if name != make_text_value("-") { return TextValue::Unknown; };
            if index > 0 { output.push_str(", "); };
            output.push('-');
            index += 1;
        }
        return make_text_value(output.as_str());
    };
    TextValue::Unknown
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
        if status != BoolValue::Value(true) { return VectorHashBytes { bytes, state: CheckOutcome::Unknown }; };
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
            if cell == Int8Value::Unknown || cell == Int8Value::Null {
                return VectorHashBytes { bytes, state: CheckOutcome::Unknown };
            };
            index += 1;
        }
        return VectorHashBytes { bytes, state: CheckOutcome::True };
    };
    VectorHashBytes { bytes, state: CheckOutcome::Unknown }
}
pub fn sql__pg_catalog__hashoidvector__hb8d(input: ArrayValue) -> Int4Value {
    let plan = catalog_vector_hash_bytes(input);
    let state = plan.state;
    if let CheckOutcome::Error(error) = state { return Int4Value::Error(error); };
    if plan.state == CheckOutcome::Null { return Int4Value::Null; };
    if plan.state != CheckOutcome::True { return Int4Value::Unknown; };
    // Complete OID words contribute the same hash words in either byte order.
    make_int4_value(hash_bytes32(plan.bytes))
}
pub fn sql__pg_catalog__hashoidvectorextended__hlbf(input: ArrayValue, seed: Int8Value) -> Int8Value {
    if let ArrayValue::Error(error) = input { return Int8Value::Error(error); };
    if let Int8Value::Error(error) = seed { return Int8Value::Error(error); };
    if let ArrayValue::Unknown = input { return Int8Value::Unknown; };
    if seed == Int8Value::Unknown { return Int8Value::Unknown; };
    if let ArrayValue::Null = input { return Int8Value::Null; };
    if seed == Int8Value::Null { return Int8Value::Null; };
    let plan = catalog_vector_hash_bytes(input);
    let state = plan.state;
    if let CheckOutcome::Error(error) = state { return Int8Value::Error(error); };
    if plan.state != CheckOutcome::True { return Int8Value::Unknown; };
    if let Int8Value::Value(value) = seed { return make_int8_value(hash_bytes64(plan.bytes, value)); };
    Int8Value::Unknown
}
fn catalog_vector_send(input: ArrayValue, oid: bool) -> ByteaValue {
    if let ArrayValue::Error(error) = input { return ByteaValue::Error(error); };
    if let ArrayValue::Null = input { return ByteaValue::Null; };
    if let ArrayValue::Value(value) = input {
        let mut kind: i32 = 1;
        let mut width = 2i64;
        if oid { kind = 33; width = 4i64; };
        if value.element_kind != kind { return ByteaValue::Unknown; };
        let mut length = 12i64 + (value.dimensions.len() as i32) as i64 * 8i64;
        let mut index: usize = 0;
        while index < value.elements.len() {
            let cell = value.elements[index].clone();
            if let ArrayElement::Error(error) = cell { return ByteaValue::Error(error); };
            let mut null_cell = false;
            if let ArrayElement::Null = cell { null_cell = true; };
            if let ArrayElement::Unknown = cell {
                if value.null_bitmap != BoolValue::Value(false) { return ByteaValue::Unknown; };
            };
            length = length + 4i64;
            if null_cell == false { length = length + width; };
            index += 1;
        }
        if length > 2147483647i64 { return ByteaValue::Unknown; };
        return ByteaValue::Unspecified(length as i32);
    };
    ByteaValue::Unknown
}
pub fn sql__pg_catalog__int2vectorsend__4kiy(input: ArrayValue) -> ByteaValue { catalog_vector_send(input, false) }
pub fn sql__pg_catalog__oidvectorsend__l5tl(input: ArrayValue) -> ByteaValue { catalog_vector_send(input, true) }
