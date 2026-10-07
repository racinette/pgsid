const DIGEST_MD5_K: &[i64] = &[
    3614090360i64,
    3905402710i64,
    606105819i64,
    3250441966i64,
    4118548399i64,
    1200080426i64,
    2821735955i64,
    4249261313i64,
    1770035416i64,
    2336552879i64,
    4294925233i64,
    2304563134i64,
    1804603682i64,
    4254626195i64,
    2792965006i64,
    1236535329i64,
    4129170786i64,
    3225465664i64,
    643717713i64,
    3921069994i64,
    3593408605i64,
    38016083i64,
    3634488961i64,
    3889429448i64,
    568446438i64,
    3275163606i64,
    4107603335i64,
    1163531501i64,
    2850285829i64,
    4243563512i64,
    1735328473i64,
    2368359562i64,
    4294588738i64,
    2272392833i64,
    1839030562i64,
    4259657740i64,
    2763975236i64,
    1272893353i64,
    4139469664i64,
    3200236656i64,
    681279174i64,
    3936430074i64,
    3572445317i64,
    76029189i64,
    3654602809i64,
    3873151461i64,
    530742520i64,
    3299628645i64,
    4096336452i64,
    1126891415i64,
    2878612391i64,
    4237533241i64,
    1700485571i64,
    2399980690i64,
    4293915773i64,
    2240044497i64,
    1873313359i64,
    4264355552i64,
    2734768916i64,
    1309151649i64,
    4149444226i64,
    3174756917i64,
    718787259i64,
    3951481745i64,
];
const DIGEST_MD5_SHIFTS: &[i32] = &[
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
    21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

fn digest_md5_select(round: usize, b: i64, c: i64, d: i64) -> i64 {
    if round < 16 {
        let chosen = digest_and(b, c);
        let unchosen = digest_and(4294967295i64 - b, d);
        return hash_xor(chosen, unchosen);
    }
    if round < 32 {
        let chosen = digest_and(b, d);
        let unchosen = digest_and(c, 4294967295i64 - d);
        return hash_xor(chosen, unchosen);
    }
    if round < 48 {
        return digest_xor3(b, c, d);
    }
    let opposite = 4294967295i64 - d;
    let exclusive = hash_xor(b, opposite);
    let common = digest_and(b, opposite);
    hash_xor(c, exclusive + common)
}

fn digest_md5_hex(input: &str) -> String {
    let mut state_a: i64 = 1732584193i64;
    let mut state_b: i64 = 4023233417i64;
    let mut state_c: i64 = 2562383102i64;
    let mut state_d: i64 = 271733878i64;
    let bytes = digest_padding(input, false, true);
    let mut offset: usize = 0;
    while offset < bytes.len() {
        let mut words: Vec<HashByte> = Vec::new();
        let mut index: usize = 0;
        while index < 16 {
            let mut word: i64 = 0i64;
            let mut place: i64 = 1i64;
            let mut octet: usize = 0;
            while octet < 4 {
                word = word + bytes[offset].value * place;
                place = place * 256i64;
                offset += 1;
                octet += 1;
            }
            words.push(HashByte { value: word });
            index += 1;
        }
        let mut a = state_a;
        let mut b = state_b;
        let mut c = state_c;
        let mut d = state_d;
        let mut round: usize = 0;
        let mut round_number: i32 = 0;
        while round < 64 {
            let selected = digest_md5_select(round, b, c, d);
            let mut needed = round_number;
            if round >= 48 {
                needed = round_number * 7 % 16;
            } else if round >= 32 {
                needed = (round_number * 3 + 5) % 16;
            } else if round >= 16 {
                needed = (round_number * 5 + 1) % 16;
            }
            let mut position: usize = 0;
            while needed > 0 {
                position += 1;
                needed = needed - 1;
            }
            let sum = digest_wrap(a + selected + DIGEST_MD5_K[round] + words[position].value);
            let rotated = digest_right(sum, 32 - DIGEST_MD5_SHIFTS[round], true);
            let next = digest_wrap(b + rotated);
            a = d;
            d = c;
            c = b;
            b = next;
            round += 1;
            round_number = round_number + 1;
        }
        state_a = digest_wrap(state_a + a);
        state_b = digest_wrap(state_b + b);
        state_c = digest_wrap(state_c + c);
        state_d = digest_wrap(state_d + d);
    }
    let mut output = String::new();
    let mut index: usize = 0;
    while index < 4 {
        let mut word = state_a;
        if index == 1 {
            word = state_b;
        } else if index == 2 {
            word = state_c;
        } else if index == 3 {
            word = state_d;
        }
        let mut octet: usize = 0;
        while octet < 4 {
            let byte = word % 256i64;
            output = bytea_append_byte(output, byte as i32);
            word = word / 256i64;
            octet += 1;
        }
        index += 1;
    }
    output
}

pub fn sql__pg_catalog__md5__vpfl(input: ByteaValue) -> TextValue {
    if let ByteaValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == ByteaValue::Unknown {
        return TextValue::Unknown;
    }
    if input == ByteaValue::Null {
        return TextValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        let result = digest_md5_hex(value.as_str());
        return TextValue::Value(result);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__md5__kt50(input: TextValue) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.as_str().chars().collect();
        let mut encoded = String::new();
        let mut index: usize = 0;
        while index < chars.len() {
            encoded = bytea_utf8_character(encoded, chars[index]);
            index += 1;
        }
        let result = digest_md5_hex(encoded.as_str());
        return TextValue::Value(result);
    }
    TextValue::Unknown
}
