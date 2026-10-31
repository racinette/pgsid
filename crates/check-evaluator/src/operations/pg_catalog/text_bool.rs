pub fn sql__pg_catalog__text__vuvi(input: BoolValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let BoolValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let BoolValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if (input == BoolValue::Unknown || input == BoolValue::Unimplemented) {
        return text_unresolved(condition_flavor_8_4);
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
