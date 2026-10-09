fn xml_well_formed_value(input: TextValue, document: bool) -> BoolValue {
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if let TextValue::Value(value) = input {
        return BoolValue::Value(xml_well_formed(value.as_str(), document));
    }
    if input == TextValue::Null {
        return BoolValue::Null;
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__xml_is_well_formed_content__94vi(input: TextValue) -> BoolValue {
    xml_well_formed_value(input, false)
}

pub fn sql__pg_catalog__xml_is_well_formed_document__0whq(input: TextValue) -> BoolValue {
    xml_well_formed_value(input, true)
}
