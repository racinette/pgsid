pub fn sql__pg_catalog__btrim__2rb3(value: TextValue) -> TextValue {
    text_trim_value(value, make_text_value(" "), true, true)
}

pub fn sql__pg_catalog__btrim__fwtx(value: TextValue, set: TextValue) -> TextValue {
    text_trim_value(value, set, true, true)
}

pub fn sql__pg_catalog__ltrim__nnx9(value: TextValue) -> TextValue {
    text_trim_value(value, make_text_value(" "), true, false)
}

pub fn sql__pg_catalog__ltrim__q5x0(value: TextValue, set: TextValue) -> TextValue {
    text_trim_value(value, set, true, false)
}

pub fn sql__pg_catalog__rtrim__t07s(value: TextValue) -> TextValue {
    text_trim_value(value, make_text_value(" "), false, true)
}

pub fn sql__pg_catalog__rtrim__g9ee(value: TextValue, set: TextValue) -> TextValue {
    text_trim_value(value, set, false, true)
}
