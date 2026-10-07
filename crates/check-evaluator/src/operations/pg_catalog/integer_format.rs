fn integer_base_text(input: Int8Value, full_width: bool, radix: i64) -> TextValue {
    if let Int8Value::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == Int8Value::Unknown {
        return TextValue::Unknown;
    }
    if input == Int8Value::Null {
        return TextValue::Null;
    }
    if let Int8Value::Value(value) = input {
        let bits = integer_bits_from_value(value);
        let mut high = bits.high;
        let mut low = bits.low;
        if full_width == false {
            high = 0i64;
        }
        let alphabet: Vec<char> = "0123456789abcdef".chars().collect();
        let mut digits: Vec<char> = Vec::new();
        if high == 0i64 && low == 0i64 {
            return TextValue::Value("0".to_owned());
        }
        while high != 0i64 || low != 0i64 {
            let mut number = low % radix;
            let mut index: usize = 0;
            while number > 0i64 {
                index += 1;
                number = number - 1i64;
            }
            digits.push(alphabet[index]);
            let carry = high % radix;
            low = (carry * 4294967296i64 + low) / radix;
            high = high / radix;
        }
        let mut output = String::new();
        let mut remaining = digits.len();
        while remaining > 0 {
            remaining = remaining - 1;
            output.push(digits[remaining]);
        }
        return TextValue::Value(output);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__to_bin__w0oh(input: Int8Value) -> TextValue {
    let widened = input;
    integer_base_text(widened, true, 2i64)
}

pub fn sql__pg_catalog__to_bin__yzqy(input: Int4Value) -> TextValue {
    let widened = sql__pg_catalog__int8__mzac(input);
    integer_base_text(widened, false, 2i64)
}

pub fn sql__pg_catalog__to_oct__1exr(input: Int8Value) -> TextValue {
    let widened = input;
    integer_base_text(widened, true, 8i64)
}

pub fn sql__pg_catalog__to_oct__7a24(input: Int4Value) -> TextValue {
    let widened = sql__pg_catalog__int8__mzac(input);
    integer_base_text(widened, false, 8i64)
}

pub fn sql__pg_catalog__to_hex__kz7h(input: Int8Value) -> TextValue {
    let widened = input;
    integer_base_text(widened, true, 16i64)
}

pub fn sql__pg_catalog__to_hex__p0fx(input: Int4Value) -> TextValue {
    let widened = sql__pg_catalog__int8__mzac(input);
    integer_base_text(widened, false, 16i64)
}
