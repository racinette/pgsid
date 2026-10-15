pub fn name_from_text_with_limit(input: TextValue, limit: Int4Value) -> TextValue {
    if let TextValue::Error(error) = input { return TextValue::Error(error); };
    if let Int4Value::Error(error) = limit { return TextValue::Error(error); };
    if input == TextValue::Null { return TextValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() == 0 { return TextValue::Value(text); };
        if let Int4Value::Value(maximum) = limit {
            if maximum < 0 { return TextValue::Unknown; };
            let mut output = String::new();
            let mut bytes: i32 = 0;
            let mut index: usize = 0;
            while index < chars.len() {
                let code = chars[index] as i32;
                let mut width: i32 = 1;
                if code >= 65536 { width = 4; }
                else if code >= 2048 { width = 3; }
                else if code >= 128 { width = 2; };
                if bytes > maximum - width { return TextValue::Value(output); };
                output.push(chars[index]);
                bytes = bytes + width;
                index += 1;
            };
            return TextValue::Value(output);
        };
    };
    TextValue::Unknown
}
pub fn name_from_text(input: TextValue) -> TextValue { name_from_text_with_limit(input, Int4Value::Unknown) }
fn name_relation(left: TextValue, right: TextValue, mode: i32) -> BoolValue {
    let order = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = order { return BoolValue::Error(error); };
    if order == Int4Value::Null { return BoolValue::Null; };
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
pub fn sql__pg_catalog__bpchar__8cer(input: TextValue) -> TextValue { input }
pub fn sql__pg_catalog__hashname__vua3(input: TextValue) -> Int4Value { text_hash_value(input, false) }
pub fn sql__pg_catalog__hashnameextended__p8gv(input: TextValue, seed: Int8Value) -> Int8Value { text_hash_extended(input, seed, false) }
pub fn sql__pg_catalog__name__iqr4(input: TextValue) -> TextValue { name_from_text(input) }
pub fn sql__pg_catalog__name__4szz(input: TextValue) -> TextValue { name_from_text(sql__pg_catalog__text__vc4r(input)) }
pub fn sql__pg_catalog__name__i5b4(input: TextValue) -> TextValue { name_from_text(input) }
pub fn sql__pg_catalog__nameeq__50k8(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 0) }
pub fn sql__pg_catalog__nameeqtext__dmg4(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 0) }
pub fn sql__pg_catalog__namege__6kwe(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 5) }
pub fn sql__pg_catalog__namegetext__fuvb(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 5) }
pub fn sql__pg_catalog__namegt__gk5q(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 4) }
pub fn sql__pg_catalog__namegttext__bgcx(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 4) }
pub fn sql__pg_catalog__namele__hmxv(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 3) }
pub fn sql__pg_catalog__nameletext__yryz(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 3) }
pub fn sql__pg_catalog__namelt__8o7k(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 2) }
pub fn sql__pg_catalog__namelttext__nifk(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 2) }
pub fn sql__pg_catalog__namene__w7jp(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 1) }
pub fn sql__pg_catalog__namenetext__csba(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 1) }
pub fn sql__pg_catalog__text__coz1(input: TextValue) -> TextValue { input }
pub fn sql__pg_catalog__texteqname__sl3r(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 0) }
pub fn sql__pg_catalog__textgename__cevq(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 5) }
pub fn sql__pg_catalog__textgtname__mv7w(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 4) }
pub fn sql__pg_catalog__textlename__lsnn(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 3) }
pub fn sql__pg_catalog__textltname__k4hb(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 2) }
pub fn sql__pg_catalog__textnename__gszv(left: TextValue, right: TextValue) -> BoolValue { name_relation(left, right, 1) }
pub fn sql__pg_catalog__varchar__er5y(input: TextValue) -> TextValue { input }
pub fn sql__pg_catalog__namesend__y7mk(input: TextValue) -> ByteaValue {
    text_wire_without_context(input)
}
