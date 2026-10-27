const METADATA_NONCOLLATABLE_TYPE: u32 = 6822148;

pub fn sql__pg_catalog__format_type__bj8v(identity: OidValue, modifier: Int4Value) -> TextValue {
    if let OidValue::Error(error) = identity {
        return TextValue::Error(error);
    };
    if let Int4Value::Error(error) = modifier {
        return TextValue::Error(error);
    };
    if identity == OidValue::Null {
        return TextValue::Null;
    };
    if let OidValue::Value(value) = identity {
        if value == 0i64 {
            return make_text_value("-");
        };
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__pg_collation_for__808q(
    argument: BoolValue,
    collation: BoolValue,
) -> TextValue {
    if let BoolValue::Error(error) = argument {
        return TextValue::Error(error);
    };
    if collation == BoolValue::Value(false) {
        return TextValue::Error(make_sql_error(METADATA_NONCOLLATABLE_TYPE));
    };
    if collation == BoolValue::Value(true) {
        return TextValue::NonNull;
    };
    TextValue::Unknown
}
