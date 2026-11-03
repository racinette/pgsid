const CONTAINER_BINARY_MISSING_SEND_ERROR: u32 = 6822435;

pub(crate) fn array_binary_initial(input: &ArrayOutputPayload, support: i32) -> ByteaValue {
    let unresolved_flavor: i32 = 0;
    if input.state == -2 {
        return ByteaValue::Error(input.error);
    };
    if input.state == 0 {
        return ByteaValue::Null;
    };
    if input.state == 1 {
        if support == 0 {
            return ByteaValue::Error(make_sql_error(CONTAINER_BINARY_MISSING_SEND_ERROR));
        };
        if support < 0 {
            return bytea_unresolved(unresolved_flavor);
        };
        let mut result = ByteaValue::Unspecified(12);
        let mut index: usize = 0;
        while index < input.dimensions.len() {
            result = sql__pg_catalog__byteacat__zitv(result, ByteaValue::Unspecified(8));
            index += 1;
        }
        return result;
    };
    bytea_unresolved(array_output_flavor(input.state, unresolved_flavor))
}

pub(crate) fn container_binary_missing(input: ArrayElement, absent: bool, catalog: bool) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayElement::Unknown = input { unresolved_flavor = 1; };
    if let ArrayElement::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayElement::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return ByteaValue::Null;
    };
    let mut condition_flavor_39_4: i32 = unresolved_flavor; if let ArrayElement::Unknown = input { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let ArrayElement::Unknown = input {
        return bytea_unresolved(condition_flavor_39_4);
    }; let mut condition_flavor_41_7: i32 = unresolved_flavor; if let ArrayElement::Unimplemented = input { condition_flavor_41_7 = 2; }; if let ArrayElement::Unimplemented = input {
        return bytea_unresolved(condition_flavor_41_7);
    };
    if absent {
        return ByteaValue::Error(make_sql_error(CONTAINER_BINARY_MISSING_SEND_ERROR));
    };
    // An element type or enum definition left uncaptured is held in the deployment's catalog.
    if catalog {
        return bytea_unresolved(resolution_context(unresolved_flavor));
    };
    bytea_unresolved(unresolved_flavor)
}

pub(crate) fn container_binary_continues(input: ByteaValue) -> bool {
    if let ByteaValue::Error(_) = input {
        return false;
    };
    input != ByteaValue::Null && (input != ByteaValue::Unknown && input != ByteaValue::Unimplemented)
}

pub(crate) fn array_binary_has_element(
    input: &ArrayOutputPayload,
    index: Int4Value,
    output: ByteaValue,
) -> bool {
    array_output_has_element(input, index) && container_binary_continues(output)
}

pub(crate) fn container_binary_cell(input: ArrayElement, output: ByteaValue) -> ByteaValue {
    if let ArrayElement::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return ByteaValue::Null;
    };
    output
}

pub(crate) fn container_binary_append(
    input: ByteaValue,
    output: ByteaValue,
    prefix: i32,
) -> ByteaValue {
    let framed = sql__pg_catalog__byteacat__zitv(input, ByteaValue::Unspecified(prefix));
    if output == ByteaValue::Null {
        return framed;
    };
    sql__pg_catalog__byteacat__zitv(framed, output)
}

pub fn sql__pg_catalog__array_send__g245(input: ArrayValue, output: ByteaValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unknown = output { unresolved_flavor = 1; };
    if let ByteaValue::Unspecified(_width) = output { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ByteaValue::Unimplemented = output { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return ByteaValue::Null;
    };
    if let ArrayValue::Value(_) = input {
        return output;
    };
    bytea_unresolved(unresolved_flavor)
}
