pub fn sql__pg_catalog__text__vuvi(input: BoolValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == BoolValue::Unknown {
        return text_unresolved(unresolved_flavor);
    }
    if input == BoolValue::Null {
        return TextValue::Null;
    }
    if let BoolValue::Value(value) = input {
        if value {
            return make_text_value("true");
        }
        return make_text_value("false");
    }
    text_unresolved(unresolved_flavor)
}
