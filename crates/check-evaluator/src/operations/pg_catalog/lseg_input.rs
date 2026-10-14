pub fn lseg_from_text(input: TextValue) -> LsegValue {
    if let TextValue::Error(error) = input {
        return LsegValue::Error(error);
    };
    if input == TextValue::Null {
        return LsegValue::Null;
    };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        if chars.len() > 4096 {
            return LsegValue::Unknown;
        };
        let source = GeometryInputText { chars };
        let index = geometry_input_space(&source, 0);
        let pair = geometry_read_pair(&source, index);
        return sql__pg_catalog__lseg__l9bc(pair.first, pair.second);
    };
    LsegValue::Unknown
}
