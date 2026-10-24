const ACLITEM_INVALID_PARAMETER: u32 = 3452619;

const ACLITEM_INVALID_TEXT: u32 = 3484946;
const ACLITEM_NAME_TOO_LONG: u32 = 6819626;

#[derive(Clone)]
struct AclitemIdentifier {
    value: String,
    next: usize,
    state: i32,
}

fn aclitem_read_identifier(input: &str, start: usize, limit: i32, utf8: bool) -> AclitemIdentifier {
    let characters: Vec<char> = input.chars().collect();
    let mut position = start;
    let mut output = String::new();
    let mut bytes: i32 = 0;
    let mut quoted = false;
    while position < characters.len() && numeric_space(characters[position]) { position += 1; }
    let mut reading = true;
    while position < characters.len() && reading {
        let mut character = characters[position];
        let code = character as i32;
        if quoted == false && character != '"' && character != '_' && code < 128
            && (code < 48 || code > 57) && (code < 65 || code > 90) && (code < 97 || code > 122) {
            reading = false;
        } else {
            let mut emit = true;
            if character == '"' {
                if quoted == false { quoted = true; emit = false; }
                else if position + 1 < characters.len() && characters[position + 1] == '"' {
                    position += 1;
                } else { quoted = false; emit = false; };
            };
            if emit {
                character = characters[position];
                let point = character as i32;
                let mut width: i32 = 1;
                if point >= 128 {
                    if utf8 == false { return AclitemIdentifier {value: output,next: position,state: -1}; };
                    if point >= 65536 { width = 4; }
                    else if point >= 2048 { width = 3; }
                    else { width = 2; };
                };
                if limit < 0 { return AclitemIdentifier {value: output,next: position,state: -1}; };
                if bytes > limit - width { return AclitemIdentifier {value: output,next: position,state: -2}; };
                bytes = bytes + width;
                output.push(character);
            };
            position += 1;
        };
    }
    while position < characters.len() && numeric_space(characters[position]) { position += 1; }
    AclitemIdentifier {value: output,next: position,state: 1}
}

fn aclitem_mode_character(character: char) -> bool {
    character == 'a' || character == 'r' || character == 'w' || character == 'd'
        || character == 'D' || character == 'x' || character == 't' || character == 'X'
        || character == 'U' || character == 'C' || character == 'T' || character == 'c'
        || character == 's' || character == 'A' || character == 'm' || character == '*'
}

pub fn aclitem_from_text_context(input: TextValue, limit: i32, utf8: bool) -> AclitemValue {
    if let TextValue::Error(error) = input { return AclitemValue::Error(error); };
    if let TextValue::Null = input { return AclitemValue::Null; };
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut identifier = aclitem_read_identifier(text.as_str(),0,limit,utf8);
        if identifier.state == -1 { return AclitemValue::Unknown; };
        if identifier.state == -2 { return AclitemValue::Error(make_sql_error(ACLITEM_NAME_TOO_LONG)); };
        let mut position = identifier.next;
        if position >= characters.len() || characters[position] != '=' {
            if identifier.value.as_str() != "group" && identifier.value.as_str() != "user" {
                return AclitemValue::Error(make_sql_error(ACLITEM_INVALID_TEXT));
            };
            identifier = aclitem_read_identifier(text.as_str(),position,limit,utf8);
            if identifier.state == -1 { return AclitemValue::Unknown; };
            if identifier.state == -2 { return AclitemValue::Error(make_sql_error(ACLITEM_NAME_TOO_LONG)); };
            if identifier.value.as_str() == "" { return AclitemValue::Error(make_sql_error(ACLITEM_INVALID_TEXT)); };
            position = identifier.next;
        };
        if position >= characters.len() || characters[position] != '=' {
            return AclitemValue::Error(make_sql_error(ACLITEM_INVALID_TEXT));
        };
        position += 1;
        let mut scanning = true;
        while position < characters.len() && scanning {
            let character = characters[position];
            let code = character as i32;
            if (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || character == '*' {
                if aclitem_mode_character(character) == false { return AclitemValue::Error(make_sql_error(ACLITEM_INVALID_TEXT)); };
                position += 1;
            } else {
                if code >= 128 && utf8 == false { return AclitemValue::Unknown; };
                scanning = false;
            };
        }
        if identifier.value.as_str() != "" { return AclitemValue::Unknown; };
        if position < characters.len() && characters[position] == '/' {
            let grantor = aclitem_read_identifier(text.as_str(),position + 1,limit,utf8);
            if grantor.state == -1 { return AclitemValue::Unknown; };
            if grantor.state == -2 { return AclitemValue::Error(make_sql_error(ACLITEM_NAME_TOO_LONG)); };
            if grantor.value.as_str() == "" { return AclitemValue::Error(make_sql_error(ACLITEM_INVALID_TEXT)); };
            return AclitemValue::Unknown;
        };
        while position < characters.len() && numeric_space(characters[position]) { position += 1; }
        if position < characters.len() { return AclitemValue::Error(make_sql_error(ACLITEM_INVALID_TEXT)); };
    };
    AclitemValue::Unknown
}

pub fn aclitem_from_text(input: TextValue) -> AclitemValue {
    aclitem_from_text_context(input,-1,false)
}

pub fn aclitem_to_text(input: AclitemValue) -> TextValue {
    if let AclitemValue::Error(error) = input { return TextValue::Error(error); };
    if input == AclitemValue::Null { return TextValue::Null; };
    if let AclitemValue::Value(_) = input { return TextValue::NonNull; };
    TextValue::Unknown
}

fn aclitem_privilege(name: &str) -> i64 {
    if name == "INSERT" { return 1i64; };
    if name == "SELECT" { return 2i64; };
    if name == "UPDATE" { return 4i64; };
    if name == "DELETE" { return 8i64; };
    if name == "TRUNCATE" { return 16i64; };
    if name == "REFERENCES" { return 32i64; };
    if name == "TRIGGER" { return 64i64; };
    if name == "EXECUTE" { return 128i64; };
    if name == "USAGE" { return 256i64; };
    if name == "CREATE" { return 512i64; };
    if name == "TEMP" || name == "TEMPORARY" { return 1024i64; };
    if name == "CONNECT" { return 2048i64; };
    if name == "SET" { return 4096i64; };
    if name == "ALTER SYSTEM" { return 8192i64; };
    if name == "MAINTAIN" { return 16384i64; };
    -1i64
}

fn aclitem_privileges(input: TextValue) -> Int8Value {
    if let TextValue::Error(error) = input { return Int8Value::Error(error); };
    if let TextValue::Null = input { return Int8Value::Null; };
    if let TextValue::Value(value) = input {
        let uppercase = text_case_value(TextValue::Value(value), 1);
        if let TextValue::Value(text) = uppercase {
            let chars: Vec<char> = text.chars().collect();
            let mut position: usize = 0;
            let mut rights: i64 = 0i64;
            let mut remaining = true;
            while remaining {
                let mut end = position;
                while end < chars.len() && chars[end] != ',' { end += 1; }
                let mut limit = end;
                while position < limit && numeric_space(chars[position]) { position += 1; }
                while limit > position && numeric_space(chars[limit - 1]) { limit = limit - 1; }
                let mut name = String::new();
                while position < limit { name.push(chars[position]); position += 1; }
                let bit = aclitem_privilege(name.as_str());
                if bit < 0i64 { return Int8Value::Error(make_sql_error(ACLITEM_INVALID_PARAMETER)); };
                rights = integer_bits_combine(rights, bit, 1);
                remaining = end < chars.len();
                position = end + 1;
            }
            return Int8Value::Value(rights);
        };
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__makeaclitem__ab9i(grantee: OidValue, grantor: OidValue, privileges: TextValue, grantable: BoolValue) -> AclitemValue {
    if let OidValue::Error(error) = grantee { return AclitemValue::Error(error); };
    if let OidValue::Error(error) = grantor { return AclitemValue::Error(error); };
    if let TextValue::Error(error) = privileges { return AclitemValue::Error(error); };
    if let BoolValue::Error(error) = grantable { return AclitemValue::Error(error); };
    if grantee == OidValue::Unknown || grantor == OidValue::Unknown || privileges == TextValue::Unknown || grantable == BoolValue::Unknown { return AclitemValue::Unknown; };
    if grantee == OidValue::Null || grantor == OidValue::Null || privileges == TextValue::Null || grantable == BoolValue::Null { return AclitemValue::Null; };
    let parsed = aclitem_privileges(privileges);
    if let Int8Value::Error(error) = parsed { return AclitemValue::Error(error); };
    if let OidValue::Value(a) = grantee {
        if let OidValue::Value(b) = grantor {
            if let BoolValue::Value(option) = grantable {
                if let Int8Value::Value(bits) = parsed {
                    let mut options: i64 = 0i64;
                    if option { options = bits; };
                    return make_aclitem_value(a, b, bits, options);
                };
            };
        };
    };
    AclitemValue::Unknown
}

pub fn sql__pg_catalog__aclitemeq__cphl(left: AclitemValue, right: AclitemValue) -> BoolValue {
    if let AclitemValue::Error(error) = left { return BoolValue::Error(error); };
    if let AclitemValue::Error(error) = right { return BoolValue::Error(error); };
    if left == AclitemValue::Unknown || right == AclitemValue::Unknown { return BoolValue::Unknown; };
    if left == AclitemValue::Null || right == AclitemValue::Null { return BoolValue::Null; };
    make_bool_value(left == right)
}

fn aclitem_hash_sum(input: AclitemValue) -> Int8Value {
    if let AclitemValue::Error(error) = input { return Int8Value::Error(error); };
    if input == AclitemValue::Null { return Int8Value::Null; };
    if let AclitemValue::Value(value) = input {
        return Int8Value::Value((value.privileges + value.grantee + value.grantor) % 4294967296i64);
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__hash_aclitem__4zd0(input: AclitemValue) -> Int4Value {
    let sum = aclitem_hash_sum(input);
    if let Int8Value::Error(error) = sum { return Int4Value::Error(error); };
    if sum == Int8Value::Null { return Int4Value::Null; };
    if let Int8Value::Value(value) = sum { return Int4Value::Value(value as i32); };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hash_aclitem_extended__c0ek(input: AclitemValue, seed: Int8Value) -> Int8Value {
    if let AclitemValue::Error(error) = input { return Int8Value::Error(error); };
    if let Int8Value::Error(error) = seed { return Int8Value::Error(error); };
    if input == AclitemValue::Unknown || seed == Int8Value::Unknown { return Int8Value::Unknown; };
    if input == AclitemValue::Null || seed == Int8Value::Null { return Int8Value::Null; };
    let sum = aclitem_hash_sum(input);
    if seed == Int8Value::Value(0i64) { return sum; };
    if let Int8Value::Value(value) = sum {
        return sql__pg_catalog__hashoidextended__v555(make_oid_value(value), seed);
    };
    sum
}

const ACLITEM_NULL_VALUE_NOT_ALLOWED: u32 = 3452548;
const ACLITEM_FEATURE_NOT_SUPPORTED: u32 = 466560;

pub fn sql__pg_catalog__aclcontains__90xb(input: ArrayValue, item: AclitemValue) -> BoolValue {
    if let ArrayValue::Error(error) = input { return BoolValue::Error(error); };
    if let AclitemValue::Error(error) = item { return BoolValue::Error(error); };
    if let ArrayValue::Unknown = input { return BoolValue::Unknown; };
    if item == AclitemValue::Unknown { return BoolValue::Unknown; };
    if let ArrayValue::Null = input { return BoolValue::Null; };
    if item == AclitemValue::Null { return BoolValue::Null; };
    if let ArrayValue::Value(array) = input {
        if array.element_kind != 46 || array.dimensions.len() != 1 {
            return BoolValue::Error(make_sql_error(ACLITEM_INVALID_PARAMETER));
        };
        if array.null_bitmap == BoolValue::Value(true) {
            return BoolValue::Error(make_sql_error(ACLITEM_NULL_VALUE_NOT_ALLOWED));
        };
        if array.null_bitmap != BoolValue::Value(false) { return BoolValue::Unknown; };
        if let AclitemValue::Value(requested) = item {
            let mut position: usize = 0;
            let mut unknown = false;
            while position < array.elements.len() {
                let entry = array_element_to_aclitem(array.elements[position].clone());
                if let AclitemValue::Value(value) = entry {
                    if value.grantee == requested.grantee && value.grantor == requested.grantor
                        && integer_bits_combine(value.privileges,requested.privileges,0) == requested.privileges
                        && integer_bits_combine(value.grant_options,requested.grant_options,0) == requested.grant_options {
                        return make_bool_value(true);
                    };
                };
                if entry == AclitemValue::Unknown { unknown = true; };
                position += 1;
            }
            if unknown { return BoolValue::Unknown; };
            return make_bool_value(false);
        };
    };
    BoolValue::Unknown
}

fn aclitem_obsolete_update(input: ArrayValue, item: AclitemValue) -> ArrayValue {
    if let ArrayValue::Error(error) = input { return ArrayValue::Error(error); };
    if let AclitemValue::Error(error) = item { return ArrayValue::Error(error); };
    if let ArrayValue::Unknown = input { return ArrayValue::Unknown; };
    if item == AclitemValue::Unknown { return ArrayValue::Unknown; };
    if let ArrayValue::Null = input { return ArrayValue::Null; };
    if item == AclitemValue::Null { return ArrayValue::Null; };
    ArrayValue::Error(make_sql_error(ACLITEM_FEATURE_NOT_SUPPORTED))
}

pub fn sql__pg_catalog__aclinsert__6jtk(input: ArrayValue, item: AclitemValue) -> ArrayValue {
    aclitem_obsolete_update(input,item)
}
pub fn sql__pg_catalog__aclremove__yg4b(input: ArrayValue, item: AclitemValue) -> ArrayValue {
    aclitem_obsolete_update(input,item)
}

const ACLITEM_INTERNAL_ERROR: u32 = 56966976;

pub fn sql__pg_catalog__acldefault__yt1r(object_type: InternalCharValue, owner: OidValue) -> ArrayValue {
    if let InternalCharValue::Error(error) = object_type { return ArrayValue::Error(error); };
    if let OidValue::Error(error) = owner { return ArrayValue::Error(error); };
    if object_type == InternalCharValue::Unknown || owner == OidValue::Unknown { return ArrayValue::Unknown; };
    if object_type == InternalCharValue::Null || owner == OidValue::Null { return ArrayValue::Null; };
    if let InternalCharValue::Value(code) = object_type {
        if let OidValue::Value(owner_id) = owner {
            let mut world_rights: i64 = 0i64;
            let mut owner_rights: i64 = -1i64;
            if code == 99 { owner_rights = 0i64; };
            if code == 114 { owner_rights = 16511i64; };
            if code == 115 { owner_rights = 262i64; };
            if code == 100 { world_rights = 3072i64; owner_rights = 3584i64; };
            if code == 102 { world_rights = 128i64; owner_rights = 128i64; };
            if code == 108 || code == 84 { world_rights = 256i64; owner_rights = 256i64; };
            if code == 76 { owner_rights = 6i64; };
            if code == 110 { owner_rights = 768i64; };
            if code == 112 { owner_rights = 12288i64; };
            if code == 116 { owner_rights = 512i64; };
            if code == 70 || code == 83 { owner_rights = 256i64; };
            if owner_rights < 0i64 { return ArrayValue::Error(make_sql_error(ACLITEM_INTERNAL_ERROR)); };
            let mut elements: Vec<ArrayElement> = Vec::new();
            if world_rights != 0i64 {
                elements.push(array_element_from_aclitem(make_aclitem_value(0i64,owner_id,world_rights,0i64)));
            };
            if owner_rights != 0i64 {
                elements.push(array_element_from_aclitem(make_aclitem_value(owner_id,owner_id,owner_rights,0i64)));
            };
            let count = elements.len() as i32;
            let mut dimensions: Vec<ArrayDimension> = Vec::new();
            dimensions.push(ArrayDimension { lower: 1, length: count });
            return make_array_value(ArrayPayload {
                element_type: "pg_catalog.aclitem".to_owned(), element_kind: 46,
                dimensions: dimensions, elements: elements, null_bitmap: BoolValue::Value(false),
            });
        };
    };
    ArrayValue::Unknown
}
