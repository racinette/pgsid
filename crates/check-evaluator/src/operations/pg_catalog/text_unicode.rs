const UNICODE_INVALID_FORM: u32 = 3452619;

pub fn sql__pg_catalog__normalize__fhd2(input: TextValue, normal_form: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = normal_form { unresolved_flavor = 1; };
    if let TextValue::NonNull = normal_form { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = normal_form { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = normal_form {
        return TextValue::Error(error);
    }
    let mut condition_flavor_15_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_15_4 < 1 { condition_flavor_15_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_15_4 = 2; }; if let TextValue::Unknown = normal_form { if condition_flavor_15_4 < 1 { condition_flavor_15_4 = 1; }; }; if let TextValue::Unimplemented = normal_form { condition_flavor_15_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) || ((normal_form == TextValue::Unknown || normal_form == TextValue::Unimplemented) || normal_form == TextValue::NonNull) {
        return text_unresolved(condition_flavor_15_4);
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
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__is_normalized__pxj9(input: TextValue, normal_form: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = normal_form { unresolved_flavor = 1; };
    if let TextValue::NonNull = normal_form { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = normal_form { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = normal_form {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_45_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_45_4 = 2; }; if let TextValue::Unknown = normal_form { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TextValue::Unimplemented = normal_form { condition_flavor_45_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) || ((normal_form == TextValue::Unknown || normal_form == TextValue::Unimplemented) || normal_form == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_45_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__unicode_assigned__46hx(input: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_70_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_70_4 < 1 { condition_flavor_70_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_70_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_70_4);
    }
    if input == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(value) = input {
        return BoolValue::Value(unicode_text_assigned(value));
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__unicode_version__qw3z() -> TextValue {
    unicode_data_version()
}

pub fn sql__pg_catalog__icu_unicode_version__xpkm() -> TextValue {
    unicode_icu_data_version()
}
