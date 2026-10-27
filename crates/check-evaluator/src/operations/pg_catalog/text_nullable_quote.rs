pub fn sql__pg_catalog__quote_nullable__xaua(input: TextValue) -> TextValue {
    if input == TextValue::Null {
        return TextValue::Value("NULL".to_owned());
    };
    sql__pg_catalog__quote_literal__d0rq(input)
}

pub fn sql__pg_catalog__quote_nullable__x3ga(input: TextValue) -> TextValue {
    sql__pg_catalog__quote_nullable__xaua(input)
}
