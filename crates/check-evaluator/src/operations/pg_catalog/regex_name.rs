// Name subjects match as their text; the C collation that name columns carry selects the same
// semantics as the text implementations, and other collations defer when bound.

pub fn sql__pg_catalog__nameregexeq__rgkf(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), false)
}

pub fn sql__pg_catalog__nameregexne__h0k0(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), true)
}

pub fn sql__pg_catalog__nameicregexeq__3jtf(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value("i"), false)
}

pub fn sql__pg_catalog__nameicregexne__k2gb(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value("i"), true)
}
