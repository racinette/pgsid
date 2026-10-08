pub fn sql__pg_catalog__text__vuvi(input: BoolValue) -> TextValue {
    if let BoolValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == BoolValue::Unknown {
        return TextValue::Unknown;
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
    TextValue::Unknown
}
