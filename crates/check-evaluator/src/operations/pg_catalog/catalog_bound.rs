// Immutable catalog entries whose results the evaluator can answer only from deployment state.
// Each is strict, so a NULL argument answers NULL first.

// Whether the argument names the bpchar type is a fact of the deployment's catalog.
pub fn sql__pg_catalog__btequalimage__yluj(input: OidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input { return BoolValue::Error(error); };
    if input == OidValue::Null { return BoolValue::Null; };
    bool_unresolved(resolution_context(unresolved_flavor))
}

// The answer depends on the argument's type and the call's collation in the deployment's catalog.
pub fn sql__pg_catalog__btvarstrequalimage__cfwd(input: OidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input { return BoolValue::Error(error); };
    if input == OidValue::Null { return BoolValue::Null; };
    bool_unresolved(resolution_context(unresolved_flavor))
}

// A file name carries the server's current timeline and WAL segment size.
pub fn sql__pg_catalog__pg_walfile_name__ei2i(input: PgLsnValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let PgLsnValue::Unknown = input { unresolved_flavor = 1; };
    if let PgLsnValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PgLsnValue::Error(error) = input { return TextValue::Error(error); };
    if let PgLsnValue::Null = input { return TextValue::Null; };
    text_unresolved(resolution_context(unresolved_flavor))
}

// Phase names come from the index access method the catalog registers under that OID.
pub fn sql__pg_catalog__pg_indexam_progress_phasename__gf1h(method: OidValue, phase: Int8Value) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = method { unresolved_flavor = 1; };
    if let Int8Value::Unknown = phase { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = method { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = phase { unresolved_flavor = 2; };
    if let OidValue::Error(error) = method { return TextValue::Error(error); };
    if let Int8Value::Error(error) = phase { return TextValue::Error(error); };
    if method == OidValue::Null || phase == Int8Value::Null { return TextValue::Null; };
    text_unresolved(resolution_context(unresolved_flavor))
}

// The partition tree lives in the deployment's catalog.
pub fn sql__pg_catalog__pg_partition_root__sfoe(input: OidValue) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input { return OidValue::Error(error); };
    if input == OidValue::Null { return OidValue::Null; };
    oid_unresolved(resolution_context(unresolved_flavor))
}

// The OID names the catalog whose options are checked, which only the deployment can resolve.
pub fn sql__pg_catalog__postgresql_fdw_validator__g0wo(options: ArrayValue, catalog: OidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = options { unresolved_flavor = 1; };
    if let OidValue::Unknown = catalog { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = options { unresolved_flavor = 2; };
    if let OidValue::Unimplemented = catalog { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = options { return BoolValue::Error(error); };
    if let OidValue::Error(error) = catalog { return BoolValue::Error(error); };
    if let ArrayValue::Null = options { return BoolValue::Null; };
    if catalog == OidValue::Null { return BoolValue::Null; };
    bool_unresolved(resolution_context(unresolved_flavor))
}

// The name, clipped at a character boundary so the suffix fits the server's identifier limit,
// then an underscore and the OID in decimal.
pub fn sql__pg_catalog__nameconcatoid__mlo8(name: TextValue, oid: OidValue, limit: i32, utf8: bool) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = name { unresolved_flavor = 1; };
    if let TextValue::NonNull = name { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let OidValue::Unknown = oid { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = name { unresolved_flavor = 2; };
    if let OidValue::Unimplemented = oid { unresolved_flavor = 2; };
    if let TextValue::Error(error) = name { return TextValue::Error(error); };
    if let OidValue::Error(error) = oid { return TextValue::Error(error); };
    if name == TextValue::Null || oid == OidValue::Null { return TextValue::Null; };
    if let TextValue::Value(text) = name {
        if let OidValue::Value(number) = oid {
            let mut digits = String::new();
            let mut remaining = number;
            if remaining == 0i64 { digits.push('0'); };
            let mut reversed: Vec<char> = Vec::new();
            while remaining > 0i64 {
                let code = ((remaining % 10i64) as i32) + 48;
                reversed.push(char::from_u32(code as u32).unwrap_or('0'));
                remaining = remaining / 10i64;
            }
            let mut index = reversed.len();
            while index > 0 {
                index = index - 1;
                digits.push(reversed[index]);
            }
            let mut digit_count = reversed.len() as i32;
            if number == 0i64 { digit_count = 1; };
            if limit < 0 { return text_unresolved(resolution_context(unresolved_flavor)); };
            let mut budget = limit - digit_count - 1;
            if budget < 0 { budget = 0; };
            let clipped = name_from_text_context(TextValue::Value(text), budget, utf8);
            if let TextValue::Value(prefix) = clipped {
                let mut output = prefix;
                output.push('_');
                output.push_str(digits.as_str());
                return TextValue::Value(output);
            };
            if let TextValue::Error(error) = clipped { return TextValue::Error(error); };
            return text_unresolved(resolution_context(unresolved_flavor));
        };
    };
    text_unresolved(unresolved_flavor)
}
