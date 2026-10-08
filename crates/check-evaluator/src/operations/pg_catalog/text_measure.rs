pub fn sql__pg_catalog__bit_length__bpcw(value: TextValue) -> Int4Value {
    text_measure_value(value, false, 2)
}

pub fn sql__pg_catalog__char_length__zjgv(value: TextValue) -> Int4Value {
    text_measure_value(value, true, 0)
}

pub fn sql__pg_catalog__char_length__o1qu(value: TextValue) -> Int4Value {
    text_measure_value(value, false, 0)
}

pub fn sql__pg_catalog__character_length__mqtx(value: TextValue) -> Int4Value {
    text_measure_value(value, true, 0)
}

pub fn sql__pg_catalog__character_length__b3q2(value: TextValue) -> Int4Value {
    text_measure_value(value, false, 0)
}

pub fn sql__pg_catalog__length__uhru(value: TextValue) -> Int4Value {
    text_measure_value(value, true, 0)
}

pub fn sql__pg_catalog__octet_length__12ga(value: TextValue) -> Int4Value {
    text_measure_value(value, false, 1)
}

pub fn sql__pg_catalog__octet_length__9hmr(value: TextValue) -> Int4Value {
    text_measure_value(value, false, 1)
}

pub fn sql__pg_catalog__textlen__2bvv(value: TextValue) -> Int4Value {
    text_measure_value(value, false, 0)
}
