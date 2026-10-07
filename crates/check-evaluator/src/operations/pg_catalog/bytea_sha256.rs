const DIGEST_SHA256_K: &[i64] = &[
    1116352408i64,
    1899447441i64,
    3049323471i64,
    3921009573i64,
    961987163i64,
    1508970993i64,
    2453635748i64,
    2870763221i64,
    3624381080i64,
    310598401i64,
    607225278i64,
    1426881987i64,
    1925078388i64,
    2162078206i64,
    2614888103i64,
    3248222580i64,
    3835390401i64,
    4022224774i64,
    264347078i64,
    604807628i64,
    770255983i64,
    1249150122i64,
    1555081692i64,
    1996064986i64,
    2554220882i64,
    2821834349i64,
    2952996808i64,
    3210313671i64,
    3336571891i64,
    3584528711i64,
    113926993i64,
    338241895i64,
    666307205i64,
    773529912i64,
    1294757372i64,
    1396182291i64,
    1695183700i64,
    1986661051i64,
    2177026350i64,
    2456956037i64,
    2730485921i64,
    2820302411i64,
    3259730800i64,
    3345764771i64,
    3516065817i64,
    3600352804i64,
    4094571909i64,
    275423344i64,
    430227734i64,
    506948616i64,
    659060556i64,
    883997877i64,
    958139571i64,
    1322822218i64,
    1537002063i64,
    1747873779i64,
    1955562222i64,
    2024104815i64,
    2227730452i64,
    2361852424i64,
    2428436474i64,
    2756734187i64,
    3204031479i64,
    3329325298i64,
];
const DIGEST_SHA224_INITIAL: &[i64] = &[
    3238371032i64,
    914150663i64,
    812702999i64,
    4144912697i64,
    4290775857i64,
    1750603025i64,
    1694076839i64,
    3204075428i64,
];
const DIGEST_SHA256_INITIAL: &[i64] = &[
    1779033703i64,
    3144134277i64,
    1013904242i64,
    2773480762i64,
    1359893119i64,
    2600822924i64,
    528734635i64,
    1541459225i64,
];

fn digest_wrap(value: i64) -> i64 {
    value % 4294967296i64
}

fn digest_and(left: i64, right: i64) -> i64 {
    let unequal = hash_xor(left, right);
    (left + right - unequal) / 2i64
}

fn digest_right(value: i64, bits: i32, rotate: bool) -> i64 {
    let mut divisor: i64 = 1i64;
    let mut remaining = bits;
    while remaining > 0 {
        divisor = divisor * 2i64;
        remaining = remaining - 1;
    }
    let mut result = value / divisor;
    if rotate {
        result = result + value % divisor * (4294967296i64 / divisor);
    }
    result
}

fn digest_xor3(a: i64, b: i64, c: i64) -> i64 {
    let pair = hash_xor(a, b);
    hash_xor(pair, c)
}

fn digest_sigma(value: i64, first: i32, second: i32, last: i32, rotate_last: bool) -> i64 {
    let a = digest_right(value, first, true);
    let b = digest_right(value, second, true);
    let c = digest_right(value, last, rotate_last);
    digest_xor3(a, b, c)
}

fn digest_padding(input: &str, wide: bool, little: bool) -> Vec<HashByte> {
    let chars: Vec<char> = input.chars().collect();
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut bits: i64 = 0i64;
    let mut index: usize = 0;
    let mut position: i32 = 0;
    let mut width: i32 = 64;
    let mut limit: i32 = 56;
    if wide {
        width = 128;
        limit = 112;
    }
    while index < chars.len() {
        let high = hex_digit(chars[index]);
        let low = hex_digit(chars[index + 1]);
        let byte = high * 16 + low;
        bytes.push(HashByte { value: byte as i64 });
        bits = bits + 8i64;
        index = index + 2;
        position = position + 1;
        if position == width {
            position = 0;
        }
    }
    bytes.push(HashByte { value: 128i64 });
    position = position + 1;
    if position == width {
        position = 0;
    }
    while position != limit {
        bytes.push(HashByte { value: 0i64 });
        position = position + 1;
        if position == width {
            position = 0;
        }
    }
    if wide {
        let mut zeros: usize = 0;
        while zeros < 8 {
            bytes.push(HashByte { value: 0i64 });
            zeros += 1;
        }
    }
    let mut count: usize = 0;
    let mut divisor: i64 = 72057594037927936i64;
    while count < 8 {
        if little {
            bytes.push(HashByte {
                value: bits % 256i64,
            });
            bits = bits / 256i64;
        } else {
            bytes.push(HashByte {
                value: bits / divisor % 256i64,
            });
            divisor = divisor / 256i64;
        }
        count += 1;
    }
    bytes
}

fn digest_sha256_hex(input: &str, short: bool) -> String {
    let mut state: Vec<HashByte> = Vec::new();
    let mut initial: usize = 0;
    while initial < 8 {
        let mut value = DIGEST_SHA256_INITIAL[initial];
        if short {
            value = DIGEST_SHA224_INITIAL[initial];
        }
        state.push(HashByte { value: value });
        initial += 1;
    }
    let bytes = digest_padding(input, false, false);
    let mut offset: usize = 0;
    while offset < bytes.len() {
        let mut words: Vec<HashByte> = Vec::new();
        let mut index: usize = 0;
        while index < 16 {
            let mut word: i64 = 0i64;
            let mut octet: usize = 0;
            while octet < 4 {
                word = word * 256i64 + bytes[offset].value;
                offset += 1;
                octet += 1;
            }
            words.push(HashByte { value: word });
            index += 1;
        }
        while index < 64 {
            let a = digest_sigma(words[index - 15].value, 7, 18, 3, false);
            let b = digest_sigma(words[index - 2].value, 17, 19, 10, false);
            let sum = words[index - 16].value + a + words[index - 7].value + b;
            let word = digest_wrap(sum);
            words.push(HashByte { value: word });
            index += 1;
        }
        let mut a = state[0].value;
        let mut b = state[1].value;
        let mut c = state[2].value;
        let mut d = state[3].value;
        let mut e = state[4].value;
        let mut f = state[5].value;
        let mut g = state[6].value;
        let mut h = state[7].value;
        let mut round: usize = 0;
        while round < 64 {
            let sigma_e = digest_sigma(e, 6, 11, 25, true);
            let chosen = digest_and(e, f);
            let unchosen = digest_and(4294967295i64 - e, g);
            let choice = hash_xor(chosen, unchosen);
            let t1 =
                digest_wrap(h + sigma_e + choice + DIGEST_SHA256_K[round] + words[round].value);
            let sigma_a = digest_sigma(a, 2, 13, 22, true);
            let ab = digest_and(a, b);
            let ac = digest_and(a, c);
            let bc = digest_and(b, c);
            let majority = digest_xor3(ab, ac, bc);
            let t2 = digest_wrap(sigma_a + majority);
            h = g;
            g = f;
            f = e;
            e = digest_wrap(d + t1);
            d = c;
            c = b;
            b = a;
            a = digest_wrap(t1 + t2);
            round += 1;
        }
        state[0] = HashByte {
            value: digest_wrap(state[0].value + a),
        };
        state[1] = HashByte {
            value: digest_wrap(state[1].value + b),
        };
        state[2] = HashByte {
            value: digest_wrap(state[2].value + c),
        };
        state[3] = HashByte {
            value: digest_wrap(state[3].value + d),
        };
        state[4] = HashByte {
            value: digest_wrap(state[4].value + e),
        };
        state[5] = HashByte {
            value: digest_wrap(state[5].value + f),
        };
        state[6] = HashByte {
            value: digest_wrap(state[6].value + g),
        };
        state[7] = HashByte {
            value: digest_wrap(state[7].value + h),
        };
    }
    let mut output = String::new();
    let mut index: usize = 0;
    let mut count: usize = 8;
    if short {
        count = 7;
    }
    while index < count {
        let mut divisor: i64 = 16777216i64;
        let mut octet: usize = 0;
        while octet < 4 {
            let value = state[index].value / divisor % 256i64;
            output = bytea_append_byte(output, value as i32);
            divisor = divisor / 256i64;
            octet += 1;
        }
        index += 1;
    }
    output
}

fn digest_sha256(input: ByteaValue, short: bool) -> ByteaValue {
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == ByteaValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == ByteaValue::Null {
        return ByteaValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        let result = digest_sha256_hex(value.as_str(), short);
        return ByteaValue::Value(result);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__sha224__s7oo(input: ByteaValue) -> ByteaValue {
    digest_sha256(input, true)
}

pub fn sql__pg_catalog__sha256__19zu(input: ByteaValue) -> ByteaValue {
    digest_sha256(input, false)
}
