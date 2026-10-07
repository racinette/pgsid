const DIGEST_SHA512_K_HIGH: &[i64] = &[
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
    3391569614i64,
    3515267271i64,
    3940187606i64,
    4118630271i64,
    116418474i64,
    174292421i64,
    289380356i64,
    460393269i64,
    685471733i64,
    852142971i64,
    1017036298i64,
    1126000580i64,
    1288033470i64,
    1501505948i64,
    1607167915i64,
    1816402316i64,
];
const DIGEST_SHA512_K_LOW: &[i64] = &[
    3609767458i64,
    602891725i64,
    3964484399i64,
    2173295548i64,
    4081628472i64,
    3053834265i64,
    2937671579i64,
    3664609560i64,
    2734883394i64,
    1164996542i64,
    1323610764i64,
    3590304994i64,
    4068182383i64,
    991336113i64,
    633803317i64,
    3479774868i64,
    2666613458i64,
    944711139i64,
    2341262773i64,
    2007800933i64,
    1495990901i64,
    1856431235i64,
    3175218132i64,
    2198950837i64,
    3999719339i64,
    766784016i64,
    2566594879i64,
    3203337956i64,
    1034457026i64,
    2466948901i64,
    3758326383i64,
    168717936i64,
    1188179964i64,
    1546045734i64,
    1522805485i64,
    2643833823i64,
    2343527390i64,
    1014477480i64,
    1206759142i64,
    344077627i64,
    1290863460i64,
    3158454273i64,
    3505952657i64,
    106217008i64,
    3606008344i64,
    1432725776i64,
    1467031594i64,
    851169720i64,
    3100823752i64,
    1363258195i64,
    3750685593i64,
    3785050280i64,
    3318307427i64,
    3812723403i64,
    2003034995i64,
    3602036899i64,
    1575990012i64,
    1125592928i64,
    2716904306i64,
    442776044i64,
    593698344i64,
    3733110249i64,
    2999351573i64,
    3815920427i64,
    3928383900i64,
    566280711i64,
    3454069534i64,
    4000239992i64,
    1914138554i64,
    2731055270i64,
    3203993006i64,
    320620315i64,
    587496836i64,
    1086792851i64,
    365543100i64,
    2618297676i64,
    3409855158i64,
    4234509866i64,
    987167468i64,
    1246189591i64,
];
const DIGEST_SHA384_INITIAL_HIGH: &[i64] = &[
    3418070365i64,
    1654270250i64,
    2438529370i64,
    355462360i64,
    1731405415i64,
    2394180231i64,
    3675008525i64,
    1203062813i64,
];
const DIGEST_SHA384_INITIAL_LOW: &[i64] = &[
    3238371032i64,
    914150663i64,
    812702999i64,
    4144912697i64,
    4290775857i64,
    1750603025i64,
    1694076839i64,
    3204075428i64,
];
const DIGEST_SHA512_INITIAL_HIGH: &[i64] = &[
    1779033703i64,
    3144134277i64,
    1013904242i64,
    2773480762i64,
    1359893119i64,
    2600822924i64,
    528734635i64,
    1541459225i64,
];
const DIGEST_SHA512_INITIAL_LOW: &[i64] = &[
    4089235720i64,
    2227873595i64,
    4271175723i64,
    1595750129i64,
    2917565137i64,
    725511199i64,
    4215389547i64,
    327033209i64,
];

#[derive(Clone, Copy, PartialEq, Eq)]
struct DigestWord {
    high: i64,
    low: i64,
}

fn digest_wide_add(left: DigestWord, right: DigestWord) -> DigestWord {
    let sum = left.low + right.low;
    let low = digest_wrap(sum);
    let high = digest_wrap(left.high + right.high + sum / 4294967296i64);
    DigestWord {
        high: high,
        low: low,
    }
}

fn digest_wide_and(left: DigestWord, right: DigestWord) -> DigestWord {
    let high = digest_and(left.high, right.high);
    let low = digest_and(left.low, right.low);
    DigestWord {
        high: high,
        low: low,
    }
}

fn digest_wide_xor(left: DigestWord, right: DigestWord) -> DigestWord {
    let high = hash_xor(left.high, right.high);
    let low = hash_xor(left.low, right.low);
    DigestWord {
        high: high,
        low: low,
    }
}

fn digest_wide_not(value: DigestWord) -> DigestWord {
    DigestWord {
        high: 4294967295i64 - value.high,
        low: 4294967295i64 - value.low,
    }
}

fn digest_wide_right(value: DigestWord, bits: i32, rotate: bool) -> DigestWord {
    let mut remaining = bits;
    let mut high = value.high;
    let mut low = value.low;
    if remaining >= 32 {
        low = value.high;
        high = 0i64;
        if rotate {
            high = value.low;
        }
        remaining = remaining - 32;
    }
    if remaining == 0 {
        return DigestWord {
            high: high,
            low: low,
        };
    }
    let mut divisor: i64 = 1i64;
    while remaining > 0 {
        divisor = divisor * 2i64;
        remaining = remaining - 1;
    }
    let multiplier = 4294967296i64 / divisor;
    let shifted_low = low / divisor + high % divisor * multiplier;
    let mut shifted_high = high / divisor;
    if rotate {
        shifted_high = shifted_high + low % divisor * multiplier;
    }
    DigestWord {
        high: shifted_high,
        low: shifted_low,
    }
}

fn digest_wide_sigma(
    value: DigestWord,
    first: i32,
    second: i32,
    last: i32,
    rotate_last: bool,
) -> DigestWord {
    let a = digest_wide_right(value, first, true);
    let b = digest_wide_right(value, second, true);
    let c = digest_wide_right(value, last, rotate_last);
    let pair = digest_wide_xor(a, b);
    digest_wide_xor(pair, c)
}

fn digest_sha512_hex(input: &str, short: bool) -> String {
    let mut state: Vec<DigestWord> = Vec::new();
    let mut initial: usize = 0;
    while initial < 8 {
        let mut high = DIGEST_SHA512_INITIAL_HIGH[initial];
        let mut low = DIGEST_SHA512_INITIAL_LOW[initial];
        if short {
            high = DIGEST_SHA384_INITIAL_HIGH[initial];
            low = DIGEST_SHA384_INITIAL_LOW[initial];
        }
        state.push(DigestWord {
            high: high,
            low: low,
        });
        initial += 1;
    }
    let bytes = digest_padding(input, true, false);
    let mut offset: usize = 0;
    while offset < bytes.len() {
        let mut words: Vec<DigestWord> = Vec::new();
        let mut index: usize = 0;
        while index < 16 {
            let mut high: i64 = 0i64;
            let mut low: i64 = 0i64;
            let mut octet: usize = 0;
            while octet < 4 {
                high = high * 256i64 + bytes[offset].value;
                offset += 1;
                octet += 1;
            }
            octet = 0;
            while octet < 4 {
                low = low * 256i64 + bytes[offset].value;
                offset += 1;
                octet += 1;
            }
            words.push(DigestWord {
                high: high,
                low: low,
            });
            index += 1;
        }
        while index < 80 {
            let a = digest_wide_sigma(words[index - 15], 1, 8, 7, false);
            let b = digest_wide_sigma(words[index - 2], 19, 61, 6, false);
            let first = digest_wide_add(words[index - 16], a);
            let second = digest_wide_add(words[index - 7], b);
            let word = digest_wide_add(first, second);
            words.push(word);
            index += 1;
        }
        let mut working: Vec<DigestWord> = Vec::new();
        let mut copied: usize = 0;
        while copied < 8 {
            working.push(state[copied]);
            copied += 1;
        }
        let mut round: usize = 0;
        while round < 80 {
            let a = working[0];
            let b = working[1];
            let c = working[2];
            let d = working[3];
            let e = working[4];
            let f = working[5];
            let g = working[6];
            let h = working[7];
            let sigma_e = digest_wide_sigma(e, 14, 18, 41, true);
            let chosen = digest_wide_and(e, f);
            let opposite = digest_wide_not(e);
            let unchosen = digest_wide_and(opposite, g);
            let choice = digest_wide_xor(chosen, unchosen);
            let constant = DigestWord {
                high: DIGEST_SHA512_K_HIGH[round],
                low: DIGEST_SHA512_K_LOW[round],
            };
            let first = digest_wide_add(h, sigma_e);
            let second = digest_wide_add(choice, constant);
            let combined = digest_wide_add(first, second);
            let t1 = digest_wide_add(combined, words[round]);
            let sigma_a = digest_wide_sigma(a, 28, 34, 39, true);
            let ab = digest_wide_and(a, b);
            let ac = digest_wide_and(a, c);
            let bc = digest_wide_and(b, c);
            let pair = digest_wide_xor(ab, ac);
            let majority = digest_wide_xor(pair, bc);
            let t2 = digest_wide_add(sigma_a, majority);
            working[7] = g;
            working[6] = f;
            working[5] = e;
            working[4] = digest_wide_add(d, t1);
            working[3] = c;
            working[2] = b;
            working[1] = a;
            working[0] = digest_wide_add(t1, t2);
            round += 1;
        }
        let mut merged: usize = 0;
        while merged < 8 {
            state[merged] = digest_wide_add(state[merged], working[merged]);
            merged += 1;
        }
    }
    let mut output = String::new();
    let mut index: usize = 0;
    let mut count: usize = 8;
    if short {
        count = 6;
    }
    while index < count {
        let mut half: usize = 0;
        while half < 2 {
            let mut value = state[index].high;
            if half == 1 {
                value = state[index].low;
            }
            let mut divisor: i64 = 16777216i64;
            let mut octet: usize = 0;
            while octet < 4 {
                let byte = value / divisor % 256i64;
                output = bytea_append_byte(output, byte as i32);
                divisor = divisor / 256i64;
                octet += 1;
            }
            half += 1;
        }
        index += 1;
    }
    output
}

fn digest_sha512(input: ByteaValue, short: bool) -> ByteaValue {
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
        let result = digest_sha512_hex(value.as_str(), short);
        return ByteaValue::Value(result);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__sha384__41g6(input: ByteaValue) -> ByteaValue {
    digest_sha512(input, true)
}

pub fn sql__pg_catalog__sha512__si49(input: ByteaValue) -> ByteaValue {
    digest_sha512(input, false)
}
