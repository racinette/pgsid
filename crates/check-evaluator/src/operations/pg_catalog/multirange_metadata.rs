pub fn sql__pg_catalog__isempty__t80p(input: MultirangeValue) -> BoolValue {
    multirange_empty_state(input)
}

pub fn sql__pg_catalog__lower__eyri(input: MultirangeValue) -> ArrayElement {
    multirange_bound(input, false)
}

pub fn sql__pg_catalog__upper__8wv4(input: MultirangeValue) -> ArrayElement {
    multirange_bound(input, true)
}

pub fn sql__pg_catalog__lower_inc__0qlg(input: MultirangeValue) -> BoolValue {
    multirange_bound_flag(input, false, false)
}

pub fn sql__pg_catalog__upper_inc__aqou(input: MultirangeValue) -> BoolValue {
    multirange_bound_flag(input, true, false)
}

pub fn sql__pg_catalog__lower_inf__8sw0(input: MultirangeValue) -> BoolValue {
    multirange_bound_flag(input, false, true)
}

pub fn sql__pg_catalog__upper_inf__2edg(input: MultirangeValue) -> BoolValue {
    multirange_bound_flag(input, true, true)
}
