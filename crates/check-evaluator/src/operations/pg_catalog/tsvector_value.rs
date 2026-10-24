const TSVECTOR_INVALID_PARAMETER: u32 = 3452619;

pub fn sql__pg_catalog__length__grcw(input: TsvectorValue) -> Int4Value {
    if let TsvectorValue::Error(error) = input { return Int4Value::Error(error); };
    if let TsvectorValue::Null = input { return Int4Value::Null; };
    if let TsvectorValue::Value(value) = input { return make_int4_value(value.lexemes.len() as i32); };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__strip__3rdv(input: TsvectorValue) -> TsvectorValue {
    if let TsvectorValue::Value(value) = input {
        let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
        let mut i: usize = 0;
        while i < value.lexemes.len() {
            let positions: Vec<TsvectorPosition> = Vec::new();
            lexemes.push(TsvectorLexeme {text:value.lexemes[i].text.clone(),positions:positions});
            i += 1;
        }
        let output = TsvectorPayload {lexemes:lexemes,native_bytes:-1};
        let bytes = tsvector_canonical_bytes(&output);
        return TsvectorValue::Value(TsvectorPayload {lexemes:output.lexemes,native_bytes:bytes});
    };
    input
}

pub fn sql__pg_catalog__setweight__hza4(input: TsvectorValue, weight: InternalCharValue) -> TsvectorValue {
    if let TsvectorValue::Error(error) = input { return TsvectorValue::Error(error); };
    if let InternalCharValue::Error(error) = weight { return TsvectorValue::Error(error); };
    if let TsvectorValue::Unknown = input { return TsvectorValue::Unknown; };
    if weight == InternalCharValue::Unknown { return TsvectorValue::Unknown; };
    if let TsvectorValue::Null = input { return TsvectorValue::Null; };
    if weight == InternalCharValue::Null { return TsvectorValue::Null; };
    if let InternalCharValue::Value(code) = weight {
        let mut selected: i32 = -1;
        if code == 65 || code == 97 { selected = 3; };
        if code == 66 || code == 98 { selected = 2; };
        if code == 67 || code == 99 { selected = 1; };
        if code == 68 || code == 100 { selected = 0; };
        if selected < 0 { return TsvectorValue::Error(make_sql_error(TSVECTOR_INVALID_PARAMETER)); };
        if let TsvectorValue::Value(value) = input {
            let mut lexemes: Vec<TsvectorLexeme> = Vec::new();
            let mut i: usize = 0;
            while i < value.lexemes.len() {
                let mut positions: Vec<TsvectorPosition> = Vec::new();
                let mut p: usize = 0;
                while p < value.lexemes[i].positions.len() {
                    positions.push(TsvectorPosition {position:value.lexemes[i].positions[p].position,weight:selected});
                    p += 1;
                }
                lexemes.push(TsvectorLexeme {text:value.lexemes[i].text.clone(),positions:positions});
                i += 1;
            }
            return TsvectorValue::Value(TsvectorPayload {lexemes:lexemes,native_bytes:value.native_bytes});
        };
    };
    TsvectorValue::Unknown
}

pub fn sql__pg_catalog__tsvector_to_array__rv21(input: TsvectorValue) -> ArrayValue {
    if let TsvectorValue::Error(error) = input { return ArrayValue::Error(error); };
    if let TsvectorValue::Null = input { return ArrayValue::Null; };
    if let TsvectorValue::Value(value) = input {
        let mut builder = make_array_arguments("pg_catalog.text",8);
        if value.lexemes.len() > 0 { builder = append_array_dimension(builder,1,value.lexemes.len() as i32); };
        let mut i: usize = 0;
        while i < value.lexemes.len() {
            builder = append_array_argument(builder,ArrayElement::Text(value.lexemes[i].text.clone()));
            i += 1;
        }
        return finish_array_arguments(builder);
    };
    ArrayValue::Unknown
}

fn tsvector_compare(left: TsvectorValue, right: TsvectorValue, exact: bool) -> Int4Value {
    if let TsvectorValue::Error(error) = left { return Int4Value::Error(error); };
    if let TsvectorValue::Error(error) = right { return Int4Value::Error(error); };
    if let TsvectorValue::Unknown = left { return Int4Value::Unknown; };
    if let TsvectorValue::Unknown = right { return Int4Value::Unknown; };
    if let TsvectorValue::Null = left { return Int4Value::Null; };
    if let TsvectorValue::Null = right { return Int4Value::Null; };
    if let TsvectorValue::Value(a) = left {
        if let TsvectorValue::Value(b) = right {
            if a.native_bytes < 0 || b.native_bytes < 0 { return Int4Value::Unknown; };
            if a.native_bytes < b.native_bytes { return make_int4_value(-1); };
            if a.native_bytes > b.native_bytes { return make_int4_value(1); };
            if a.lexemes.len() < b.lexemes.len() { return make_int4_value(-1); };
            if a.lexemes.len() > b.lexemes.len() { return make_int4_value(1); };
            let mut i: usize = 0;
            while i < a.lexemes.len() {
                let ac = a.lexemes[i].positions.len();
                let bc = b.lexemes[i].positions.len();
                if ac > 0 && bc == 0 { return make_int4_value(-1); };
                if ac == 0 && bc > 0 { return make_int4_value(1); };
                let order = tsvector_lexeme_order(a.lexemes[i].text.as_str(),b.lexemes[i].text.as_str());
                if order != 0 {
                    let a_prefix = text_has_prefix(a.lexemes[i].text.as_str(),b.lexemes[i].text.as_str());
                    let b_prefix = text_has_prefix(b.lexemes[i].text.as_str(),a.lexemes[i].text.as_str());
                    if exact && a_prefix == false && b_prefix == false { return Int4Value::Unknown; };
                    return make_int4_value(order);
                };
                if ac > bc { return make_int4_value(-1); };
                if ac < bc { return make_int4_value(1); };
                let mut p: usize = 0;
                while p < ac {
                    let ap = a.lexemes[i].positions[p];
                    let bp = b.lexemes[i].positions[p];
                    if ap.position > bp.position { return make_int4_value(-1); };
                    if ap.position < bp.position { return make_int4_value(1); };
                    if ap.weight > bp.weight { return make_int4_value(-1); };
                    if ap.weight < bp.weight { return make_int4_value(1); };
                    p += 1;
                }
                i += 1;
            }
            return make_int4_value(0);
        };
    };
    Int4Value::Unknown
}

pub fn tsvector_order(left: TsvectorValue, right: TsvectorValue) -> Int4Value {
    tsvector_compare(left,right,false)
}

pub fn sql__pg_catalog__tsvector_cmp__xinv(left: TsvectorValue, right: TsvectorValue) -> Int4Value {
    tsvector_compare(left,right,true)
}
fn tsvector_relation(left: TsvectorValue, right: TsvectorValue, mode: i32) -> BoolValue {
    let order = tsvector_compare(left,right,false);
    if let Int4Value::Error(error) = order { return BoolValue::Error(error); };
    if let Int4Value::Null = order { return BoolValue::Null; };
    if let Int4Value::Value(value) = order {
        if mode == 0 { return make_bool_value(value == 0); };
        if mode == 1 { return make_bool_value(value != 0); };
        if mode == 2 { return make_bool_value(value < 0); };
        if mode == 3 { return make_bool_value(value <= 0); };
        if mode == 4 { return make_bool_value(value > 0); };
        return make_bool_value(value >= 0);
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__tsvector_eq__aqk8(a: TsvectorValue,b: TsvectorValue)->BoolValue {tsvector_relation(a,b,0)}
pub fn sql__pg_catalog__tsvector_ne__v0j3(a: TsvectorValue,b: TsvectorValue)->BoolValue {tsvector_relation(a,b,1)}
pub fn sql__pg_catalog__tsvector_lt__6duo(a: TsvectorValue,b: TsvectorValue)->BoolValue {tsvector_relation(a,b,2)}
pub fn sql__pg_catalog__tsvector_le__7xey(a: TsvectorValue,b: TsvectorValue)->BoolValue {tsvector_relation(a,b,3)}
pub fn sql__pg_catalog__tsvector_gt__dorq(a: TsvectorValue,b: TsvectorValue)->BoolValue {tsvector_relation(a,b,4)}
pub fn sql__pg_catalog__tsvector_ge__sjck(a: TsvectorValue,b: TsvectorValue)->BoolValue {tsvector_relation(a,b,5)}
