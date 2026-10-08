const UNICODE_INVALID_FORM: u32 = 3452619;

pub fn sql__pg_catalog__normalize__fhd2(input: TextValue, normal_form: TextValue) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = normal_form {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || normal_form == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || normal_form == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(value) = input {
        if let TextValue::Value(form_name) = normal_form {
            let form = unicode_normalization_form(form_name.as_str());
            if form == 0 {
                return TextValue::Error(make_sql_error(UNICODE_INVALID_FORM));
            }
            return unicode_normalize_text(value, form);
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__is_normalized__pxj9(input: TextValue, normal_form: TextValue) -> BoolValue {
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = normal_form {
        return BoolValue::Error(error);
    }
    if input == TextValue::Unknown || normal_form == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if input == TextValue::Null || normal_form == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(value) = input {
        if let TextValue::Value(form_name) = normal_form {
            let form = unicode_normalization_form(form_name.as_str());
            if form == 0 {
                return BoolValue::Error(make_sql_error(UNICODE_INVALID_FORM));
            }
            return unicode_normalized_text(value, form);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__unicode_assigned__46hx(input: TextValue) -> BoolValue {
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if input == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if input == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(value) = input {
        return BoolValue::Value(unicode_text_assigned(value));
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__unicode_version__qw3z() -> TextValue {
    unicode_data_version()
}

pub fn sql__pg_catalog__icu_unicode_version__xpkm() -> TextValue {
    unicode_icu_data_version()
}
