pub fn sql__pg_catalog__isempty__86tf(input: RangeValue) -> BoolValue {
    range_empty_state(input)
}

pub fn sql__pg_catalog__lower__ny7i(input: RangeValue) -> ArrayElement {
    range_bound(input, false)
}

pub fn sql__pg_catalog__upper__4y0a(input: RangeValue) -> ArrayElement {
    range_bound(input, true)
}

pub fn sql__pg_catalog__lower_inc__9bur(input: RangeValue) -> BoolValue {
    range_bound_flag(input, false, false)
}

pub fn sql__pg_catalog__upper_inc__vwy8(input: RangeValue) -> BoolValue {
    range_bound_flag(input, true, false)
}

pub fn sql__pg_catalog__lower_inf__wo5x(input: RangeValue) -> BoolValue {
    range_bound_flag(input, false, true)
}

pub fn sql__pg_catalog__upper_inf__51cc(input: RangeValue) -> BoolValue {
    range_bound_flag(input, true, true)
}
