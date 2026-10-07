#[derive(Clone, Copy, PartialEq, Eq)]
pub struct HashByte {
    pub value: i64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct HashState {
    a: i64,
    b: i64,
    c: i64,
}

fn hash_wrap(value: i64) -> i64 {
    let mut result: i64 = value % 4294967296i64;
    if result < 0i64 {
        result = result + 4294967296i64;
    }
    result
}

pub fn hash_xor(left: i64, right: i64) -> i64 {
    let mut a = left;
    let mut b = right;
    let mut place: i64 = 1i64;
    let mut result: i64 = 0i64;
    while place < 4294967296i64 {
        if a % 2i64 != b % 2i64 {
            result = result + place;
        }
        a = a / 2i64;
        b = b / 2i64;
        place = place * 2i64;
    }
    result
}

fn hash_rotate(value: i64, bits: i32) -> i64 {
    let mut multiplier: i64 = 1i64;
    let mut divisor: i64 = 4294967296i64;
    let mut remaining = bits;
    while remaining > 0 {
        multiplier = multiplier * 2i64;
        divisor = divisor / 2i64;
        remaining = remaining - 1;
    }
    value * multiplier % 4294967296i64 + value / divisor
}

fn hash_mix(state: HashState) -> HashState {
    let mut a = state.a;
    let mut b = state.b;
    let mut c = state.c;
    a = hash_wrap(a - c);
    let rotated_0 = hash_rotate(c, 4);
    a = hash_xor(a, rotated_0);
    c = hash_wrap(c + b);
    b = hash_wrap(b - a);
    let rotated_1 = hash_rotate(a, 6);
    b = hash_xor(b, rotated_1);
    a = hash_wrap(a + c);
    c = hash_wrap(c - b);
    let rotated_2 = hash_rotate(b, 8);
    c = hash_xor(c, rotated_2);
    b = hash_wrap(b + a);
    a = hash_wrap(a - c);
    let rotated_3 = hash_rotate(c, 16);
    a = hash_xor(a, rotated_3);
    c = hash_wrap(c + b);
    b = hash_wrap(b - a);
    let rotated_4 = hash_rotate(a, 19);
    b = hash_xor(b, rotated_4);
    a = hash_wrap(a + c);
    c = hash_wrap(c - b);
    let rotated_5 = hash_rotate(b, 4);
    c = hash_xor(c, rotated_5);
    b = hash_wrap(b + a);
    HashState { a: a, b: b, c: c }
}

fn hash_final(state: HashState) -> HashState {
    let mut a = state.a;
    let mut b = state.b;
    let mut c = state.c;
    c = hash_xor(c, b);
    let rotated_0 = hash_rotate(b, 14);
    c = hash_wrap(c - rotated_0);
    a = hash_xor(a, c);
    let rotated_1 = hash_rotate(c, 11);
    a = hash_wrap(a - rotated_1);
    b = hash_xor(b, a);
    let rotated_2 = hash_rotate(a, 25);
    b = hash_wrap(b - rotated_2);
    c = hash_xor(c, b);
    let rotated_3 = hash_rotate(b, 16);
    c = hash_wrap(c - rotated_3);
    a = hash_xor(a, c);
    let rotated_4 = hash_rotate(c, 4);
    a = hash_wrap(a - rotated_4);
    b = hash_xor(b, a);
    let rotated_5 = hash_rotate(a, 14);
    b = hash_wrap(b - rotated_5);
    c = hash_xor(c, b);
    let rotated_6 = hash_rotate(b, 24);
    c = hash_wrap(c - rotated_6);
    HashState { a: a, b: b, c: c }
}

fn hash_bytes_state(bytes: Vec<HashByte>, seed: i64) -> HashState {
    let mut length: i64 = 0i64;
    let mut scan: usize = 0;
    while scan < bytes.len() {
        length = length + 1i64;
        scan += 1;
    }
    let initial: i64 = 2654435769i64 + length + 3923095i64;
    let mut state_a = initial;
    let mut state_b = initial;
    let mut state_c = initial;
    if seed != 0i64 {
        let low = hash_wrap(seed);
        let mut high: i64 = (seed - low) / 4294967296i64;
        if high < 0i64 {
            high = high + 4294967296i64;
        }
        let a = hash_wrap(state_a + high);
        let b = hash_wrap(state_b + low);
        let mixed = hash_mix(HashState {
            a: a,
            b: b,
            c: state_c,
        });
        state_a = mixed.a;
        state_b = mixed.b;
        state_c = mixed.c;
    }
    let mut index: usize = 0;
    let mut remaining = length;
    while remaining >= 12i64 {
        let mut a = state_a;
        let mut b = state_b;
        let mut c = state_c;
        let mut position: usize = 0;
        let mut place: i64 = 1i64;
        while position < 12 {
            let value = bytes[index].value * place;
            if position < 4 {
                a = hash_wrap(a + value);
            } else if position < 8 {
                b = hash_wrap(b + value);
            } else {
                c = hash_wrap(c + value);
            };
            position += 1;
            index += 1;
            place = place * 256i64;
            if position == 4 || position == 8 {
                place = 1i64;
            }
        }
        let mixed = hash_mix(HashState { a: a, b: b, c: c });
        state_a = mixed.a;
        state_b = mixed.b;
        state_c = mixed.c;
        remaining = remaining - 12i64;
    }
    let mut a = state_a;
    let mut b = state_b;
    let mut c = state_c;
    let mut position: usize = 0;
    let mut place: i64 = 1i64;
    while index < bytes.len() {
        let value = bytes[index].value * place;
        if position < 4 {
            a = hash_wrap(a + value);
        } else if position < 8 {
            b = hash_wrap(b + value);
        } else {
            c = hash_wrap(c + value);
        };
        position += 1;
        index += 1;
        place = place * 256i64;
        if position == 4 {
            place = 1i64;
        }
        if position == 8 {
            place = 256i64;
        }
    }
    hash_final(HashState { a: a, b: b, c: c })
}

pub fn hash_bytes32(bytes: Vec<HashByte>) -> i32 {
    let state = hash_bytes_state(bytes, 0i64);
    state.c as i32
}

pub fn hash_bytes64(bytes: Vec<HashByte>, seed: i64) -> i64 {
    let state = hash_bytes_state(bytes, seed);
    let mut high = state.b;
    if high >= 2147483648i64 {
        high = high - 4294967296i64;
    }
    high * 4294967296i64 + state.c
}
