// Name operands match as their text; the C collation that name columns carry selects the same
// byte and ASCII case semantics as the text implementations, and other collations defer when bound.

pub fn sql__pg_catalog__namelike__8szr(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, false)
}
pub fn sql__pg_catalog__namenlike__hgo6(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, true)
}
pub fn sql__pg_catalog__nameiclike__qo7r(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, true, false)
}
pub fn sql__pg_catalog__nameicnlike__tmbm(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, true, true)
}
pub fn sql__pg_catalog__like__4uwr(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, false)
}
pub fn sql__pg_catalog__notlike__5dzp(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, true)
}
