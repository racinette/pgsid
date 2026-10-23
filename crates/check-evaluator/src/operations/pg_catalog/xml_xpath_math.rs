fn xpath_number_truncate(value: f64) -> f64 {
    let absolute = value.abs();
    if absolute >= 4503599627370496.0f64 || value != value { return value; };
    let mut result = 0.0f64;
    if absolute >= 1.0f64 {
        let bits = absolute.to_bits() as i64;
        let exponent = (bits/4503599627370496i64)%2048i64-1023i64;
        let mut places = 52i64-exponent; let mut divisor = 1i64;
        while places > 0i64 { divisor = divisor*2i64; places = places-1i64; }
        let truncated = bits-bits%divisor; result = f64::from_bits(truncated as u64);
    };
    let signed = value.to_bits() as i64;
    if signed < 0i64 { return -result; };
    result
}

fn xpath_number_floor(value: f64) -> f64 {
    let truncated = xpath_number_truncate(value);
    if value < truncated { return truncated-1.0f64; };
    truncated
}

fn xpath_number_ceiling(value: f64) -> f64 {
    let truncated = xpath_number_truncate(value);
    if value > truncated { return truncated+1.0f64; };
    truncated
}

fn xpath_number_round(value: f64) -> f64 {
    if value >= -0.5f64 && value < 0.5f64 { return value*0.0f64; };
    let floor = xpath_number_floor(value);
    if value-floor >= 0.5f64 { return floor+1.0f64; };
    floor
}

fn xpath_number_remainder(left: f64, right: f64) -> f64 {
    let infinity = 1.0f64/0.0f64;
    if left != left || right != right || left.abs() == infinity || right == 0.0f64 { return 0.0f64/0.0f64; };
    if right.abs() == infinity || left == 0.0f64 { return left; };
    let mut value = left.abs(); let base = right.abs(); let mut divisor = base;
    while divisor*2.0f64 <= value { divisor = divisor*2.0f64; }
    while divisor >= base {
        if value >= divisor { value = value-divisor; };
        if divisor == base { if left < 0.0f64 { return -value; }; return value; };
        divisor = divisor/2.0f64;
    }
    if left < 0.0f64 { return -value; };
    value
}

pub(crate) fn xpath_binary_arithmetic(left: XPathValue, right: XPathValue, operation: i32, tree: &XmlTree, graph: &XPathGraph, powers: &XPathPowers) -> XPathValue {
    let first = xpath_value_to_number(left,tree,graph,powers); let second = xpath_value_to_number(right,tree,graph,powers);
    if first.state < 0 { return first; }; if second.state < 0 { return second; };
    if first.state != 0 { return first; }; if second.state != 0 { return second; };
    let a = f64::from_bits(first.number as u64); let b = f64::from_bits(second.number as u64);
    if operation == 9 { return xpath_value_number(a+b); };
    if operation == 10 { return xpath_value_number(a-b); };
    if operation == 11 { return xpath_value_number(a*b); };
    if operation == 12 { return xpath_value_number(a/b); };
    xpath_value_number(xpath_number_remainder(a,b))
}
