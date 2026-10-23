#[derive(Clone)]
struct XPathPowers { bits: Vec<XPathPower> }

#[derive(Clone, Copy)]
struct XPathPower { bits: i64 }

#[derive(Clone, Copy)]
struct XPathNumberParts { valid: bool, negative: bool, integer: i64, fraction: i64, places: i32, exponent: i32 }

fn xpath_powers_empty() -> XPathPowers {
    let bits: Vec<XPathPower> = Vec::new(); XPathPowers { bits }
}

pub(crate) fn xpath_powers_push(input: XPathPowers, value: i64) -> XPathPowers {
    let mut bits = input.bits; bits.push(XPathPower { bits: value }); XPathPowers { bits }
}

fn xpath_power_ten(profile: &XPathPowers, exponent: i32) -> Float8Value {
    if exponent >= 0 && exponent <= 22 {
        let mut value = 1.0f64; let mut position: i32 = 0;
        while position < exponent { value = value*10.0f64; position = position+1; }
        return make_float8_value(value);
    };
    if exponent > 308 { return make_float8_value(1.0f64/0.0f64); };
    if exponent < -323 { return make_float8_value(0.0f64); };
    if profile.bits.len() != 632 { return Float8Value::Unknown; };
    let position = usize::try_from(exponent+323).unwrap_or(0);
    make_float8_bits(profile.bits[position].bits)
}

fn xpath_number_parts(input: &str) -> XPathNumberParts {
    let invalid = XPathNumberParts { valid: false, negative: false, integer: 0i64, fraction: 0i64, places: 0, exponent: 0 };
    let source = XmlSource { characters: input.chars().collect() };
    let mut position = xml_skip_space(&source,0);
    let mut negative = false;
    if xml_at(&source,position,"-") { negative = true; position += 1; };
    let mut integer = 0.0f64; let mut fraction = 0.0f64; let mut places: i32 = 0;
    let mut found = false;
    while position < source.characters.len() && xml_query_uri_digit(source.characters[position]) {
        let digit = numeric_wire_decimal_digit(source.characters[position]) as f64;
        let product = integer*10.0f64; integer = product+digit;
        found = true; position += 1;
    }
    if xml_at(&source,position,".") {
        position += 1;
        if position < source.characters.len() && xml_query_uri_digit(source.characters[position]) { found = true; };
        while xml_at(&source,position,"0") { places = places+1; position += 1; }
        let limit = places+20;
        while position < source.characters.len() && xml_query_uri_digit(source.characters[position]) && places < limit {
            let digit = numeric_wire_decimal_digit(source.characters[position]) as f64;
            let product = fraction*10.0f64; fraction = product+digit;
            places = places+1; position += 1;
        }
        while position < source.characters.len() && xml_query_uri_digit(source.characters[position]) { position += 1; }
    };
    if found == false { return invalid; };
    let mut exponent: i32 = 0;
    if xml_at(&source,position,"e") || xml_at(&source,position,"E") {
        position += 1; let mut sign: i32 = 1;
        if xml_at(&source,position,"-") { sign = -1; position += 1; }
        else if xml_at(&source,position,"+") { position += 1; };
        while position < source.characters.len() && xml_query_uri_digit(source.characters[position]) {
            if exponent < 1000000 { exponent = exponent*10+numeric_wire_decimal_digit(source.characters[position]); };
            position += 1;
        }
        exponent = exponent*sign;
    };
    position = xml_skip_space(&source,position);
    if position != source.characters.len() { return invalid; };
    XPathNumberParts { valid: true, negative, integer: integer.to_bits() as i64, fraction: fraction.to_bits() as i64, places, exponent }
}

fn xpath_number_text(input: &str, powers: &XPathPowers) -> XPathValue {
    let parts = xpath_number_parts(input);
    if parts.valid == false { return xpath_value_number(0.0f64/0.0f64); };
    let mut integer = f64::from_bits(parts.integer as u64);
    let fraction = f64::from_bits(parts.fraction as u64);
    let infinity = 1.0f64/0.0f64;
    if fraction != 0.0f64 && integer != infinity {
        let divisor = xpath_power_ten(powers,parts.places);
        let mut known = false;
        if let Float8Value::Value(bits) = divisor {
            let power = f64::from_bits(bits as u64);
            let quotient = fraction/power; integer = integer+quotient;
            known = true;
        };
        if known == false { return xpath_value_empty(XPATH_KIND_NUMBER,1); };
    };
    if parts.negative { integer = -integer; };
    let factor = xpath_power_ten(powers,parts.exponent);
    if let Float8Value::Value(bits) = factor {
        let power = f64::from_bits(bits as u64);
        return xpath_value_number(integer*power);
    };
    if integer == 0.0f64 || integer.abs() == infinity { return xpath_value_number(integer); };
    xpath_value_empty(XPATH_KIND_NUMBER,1)
}
