const JSONB_SCALAR_CAST_ERROR: u32 = 3452619;

pub fn sql__pg_catalog__numeric__unkz(input: JsonbValue) -> NumericValue {
    if let JsonbValue::Error(error) = input {
        return NumericValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return NumericValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        let root = value.nodes[value.root];
        if root.kind == 0 {
            return NumericValue::Null;
        };
        if root.kind == 3 {
            return jsonb_relation_number(&value, root);
        };
        return NumericValue::Error(make_sql_error(JSONB_SCALAR_CAST_ERROR));
    };
    NumericValue::Unknown
}

pub fn sql__pg_catalog__bool__k8bw(input: JsonbValue) -> BoolValue {
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return BoolValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        let root = value.nodes[value.root];
        if root.kind == 0 {
            return BoolValue::Null;
        };
        if root.kind == 1 || root.kind == 2 {
            return BoolValue::Value(root.kind == 2);
        };
        return BoolValue::Error(make_sql_error(JSONB_SCALAR_CAST_ERROR));
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int2__0vdl(input: JsonbValue) -> Int2Value {
    sql__pg_catalog__int2__zpjn(sql__pg_catalog__numeric__unkz(input))
}

pub fn sql__pg_catalog__int4__cjcd(input: JsonbValue) -> Int4Value {
    sql__pg_catalog__int4__z4rh(sql__pg_catalog__numeric__unkz(input))
}

pub fn sql__pg_catalog__int8__8pbn(input: JsonbValue) -> Int8Value {
    sql__pg_catalog__int8__xy54(sql__pg_catalog__numeric__unkz(input))
}

pub fn sql__pg_catalog__float4__jqx8(input: JsonbValue) -> Float4Value {
    sql__pg_catalog__float4__90ur(sql__pg_catalog__numeric__unkz(input))
}

pub fn sql__pg_catalog__float8__ncq4(input: JsonbValue) -> Float8Value {
    sql__pg_catalog__float8__bkfn(sql__pg_catalog__numeric__unkz(input))
}
