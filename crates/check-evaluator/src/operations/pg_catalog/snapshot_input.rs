#[derive(Clone)]
struct SnapshotInput {
    chars: Vec<char>,
}
#[derive(Clone, Copy)]
struct SnapshotNumber {
    valid: bool,
    end: usize,
    bits: i64,
}
fn snapshot_read_number(source: &SnapshotInput, start: usize) -> SnapshotNumber {
    let mut index = start;
    while index < source.chars.len() && oid_input_space(source.chars[index]) {
        index += 1;
    }
    let mut negative = false;
    if index < source.chars.len() && (source.chars[index] == '+' || source.chars[index] == '-') {
        negative = source.chars[index] == '-';
        index += 1;
    };
    let first = index;
    let mut high = 0i64;
    let mut low = 0i64;
    let mut overflow = false;
    while index < source.chars.len() {
        let digit = oid_input_digit(source.chars[index]);
        if digit < 0i64 || digit > 9i64 {
            break;
        };
        if overflow == false {
            let next = low * 10i64 + digit;
            low = next % 4294967296i64;
            high = high * 10i64 + next / 4294967296i64;
            if high > 4294967295i64 {
                overflow = true;
            };
        };
        index += 1;
    }
    if index == first {
        return SnapshotNumber {
            valid: false,
            end: start,
            bits: 0i64,
        };
    };
    if overflow {
        return SnapshotNumber {
            valid: true,
            end: index,
            bits: -1i64,
        };
    };
    let mut bits = integer_bits_value(IntegerBits {
        high: high,
        low: low,
    });
    if negative && bits != -9223372036854775808i64 {
        bits = 0i64 - bits;
    };
    SnapshotNumber {
        valid: true,
        end: index,
        bits: bits,
    }
}
fn snapshot_parse(value: &str) -> SnapshotValue {
    let source = SnapshotInput {
        chars: value.chars().collect(),
    };
    let xmin = snapshot_read_number(&source, 0);
    if xmin.valid == false || xmin.end >= source.chars.len() || source.chars[xmin.end] != ':' {
        return SnapshotValue::Error(make_sql_error(OID_INPUT_INVALID));
    };
    let xmax = snapshot_read_number(&source, xmin.end + 1);
    if xmax.valid == false
        || xmax.end >= source.chars.len()
        || source.chars[xmax.end] != ':'
        || xmin.bits % 4294967296i64 == 0i64
        || xmax.bits % 4294967296i64 == 0i64
        || snapshot_xid_order(xmin.bits, xmax.bits) > 0
    {
        return SnapshotValue::Error(make_sql_error(OID_INPUT_INVALID));
    };
    let mut index = xmax.end + 1;
    let mut previous = 0i64;
    let mut xip: Vec<SnapshotXid> = Vec::new();
    while index < source.chars.len() {
        let parsed = snapshot_read_number(&source, index);
        if parsed.valid == false
            || snapshot_xid_order(parsed.bits, xmin.bits) < 0
            || snapshot_xid_order(parsed.bits, xmax.bits) >= 0
            || snapshot_xid_order(parsed.bits, previous) < 0
        {
            return SnapshotValue::Error(make_sql_error(OID_INPUT_INVALID));
        };
        if parsed.bits != previous {
            if snapshot_count_fits(xip.len() + 1) == false {
                return SnapshotValue::Error(make_sql_error(SNAPSHOT_SIZE_ERROR));
            };
            xip.push(SnapshotXid { bits: parsed.bits });
        };
        previous = parsed.bits;
        index = parsed.end;
        if index < source.chars.len() {
            if source.chars[index] != ',' {
                return SnapshotValue::Error(make_sql_error(OID_INPUT_INVALID));
            };
            index += 1;
        };
    }
    make_snapshot_value(SnapshotPayload {
        xmin: xmin.bits,
        xmax: xmax.bits,
        xip: xip,
    })
}
pub fn snapshot_from_text(input: TextValue) -> SnapshotValue {
    if let TextValue::Error(error) = input {
        return SnapshotValue::Error(error);
    };
    if let TextValue::Null = input {
        return SnapshotValue::Null;
    };
    if let TextValue::Value(value) = input {
        return snapshot_parse(value.as_str());
    };
    SnapshotValue::Unknown
}
