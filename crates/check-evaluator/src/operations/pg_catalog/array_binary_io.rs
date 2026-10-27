const CONTAINER_BINARY_MISSING_SEND_ERROR: u32 = 6822435;

pub(crate) fn array_binary_initial(input: &ArrayOutputPayload, support: i32) -> ByteaValue {
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
            return ByteaValue::Unknown;
        };
        let mut result = ByteaValue::Unspecified(12);
        let mut index: usize = 0;
        while index < input.dimensions.len() {
            result = sql__pg_catalog__byteacat__zitv(result, ByteaValue::Unspecified(8));
            index += 1;
        }
        return result;
    };
    ByteaValue::Unknown
}

pub(crate) fn container_binary_missing(input: ArrayElement, absent: bool) -> ByteaValue {
    if let ArrayElement::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return ByteaValue::Null;
    };
    if let ArrayElement::Unknown = input {
        return ByteaValue::Unknown;
    };
    if absent {
        return ByteaValue::Error(make_sql_error(CONTAINER_BINARY_MISSING_SEND_ERROR));
    };
    ByteaValue::Unknown
}

pub(crate) fn container_binary_continues(input: ByteaValue) -> bool {
    if let ByteaValue::Error(_) = input {
        return false;
    };
    input != ByteaValue::Null && input != ByteaValue::Unknown
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
    if let ArrayValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return ByteaValue::Null;
    };
    if let ArrayValue::Value(_) = input {
        return output;
    };
    ByteaValue::Unknown
}
