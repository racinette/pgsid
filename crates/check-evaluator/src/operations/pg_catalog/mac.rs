const MAC_CONVERSION_OUT_OF_RANGE: u32 = 3452547;

fn macaddr_compare(left: MacaddrValue, right: MacaddrValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    if let MacaddrValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let MacaddrValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == MacaddrValue::Unknown || right == MacaddrValue::Unknown {
        return int4_unresolved(unresolved_flavor);
    }
    if left == MacaddrValue::Null || right == MacaddrValue::Null {
        return Int4Value::Null;
    }
    if let MacaddrValue::Value(a) = left {
        if let MacaddrValue::Value(b) = right {
            return Int4Value::Value(mac_address_compare(a, b));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_eq__uthl(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_ne__etmb(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order != 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_lt__8vk5(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_le__6qq0(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_gt__4kss(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_ge__iuvk(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_cmp__jv7y(left: MacaddrValue, right: MacaddrValue) -> Int4Value {
    macaddr_compare(left, right)
}
fn macaddr8_compare(left: Macaddr8Value, right: Macaddr8Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    if let Macaddr8Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Macaddr8Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Macaddr8Value::Unknown || right == Macaddr8Value::Unknown {
        return int4_unresolved(unresolved_flavor);
    }
    if left == Macaddr8Value::Null || right == Macaddr8Value::Null {
        return Int4Value::Null;
    }
    if let Macaddr8Value::Value(a) = left {
        if let Macaddr8Value::Value(b) = right {
            return Int4Value::Value(mac_address_compare(a, b));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_eq__wy3p(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr8_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_ne__j20a(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr8_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order != 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_lt__5tsr(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr8_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_le__dmol(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr8_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_gt__o95h(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr8_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_ge__054u(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    let result = macaddr8_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_cmp__id7f(left: Macaddr8Value, right: Macaddr8Value) -> Int4Value {
    macaddr8_compare(left, right)
}

pub fn sql__pg_catalog__macaddr_not__4gjk(input: MacaddrValue) -> MacaddrValue {
    if let MacaddrValue::Value(a) = input {
        return MacaddrValue::Value(MacAddress {
            word0: 65535 - a.word0,
            word1: 65535 - a.word1,
            word2: 65535 - a.word2,
            word3: 0,
        });
    }
    input
}

pub fn sql__pg_catalog__trunc__bgg8(input: MacaddrValue) -> MacaddrValue {
    if let MacaddrValue::Value(a) = input {
        return MacaddrValue::Value(MacAddress {
            word0: a.word0,
            word1: a.word1 / 256 * 256,
            word2: 0,
            word3: 0,
        });
    }
    input
}

fn macaddr_bitwise(left: MacaddrValue, right: MacaddrValue, union: bool) -> MacaddrValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let MacaddrValue::Unknown = right { unresolved_flavor = 1; };
    if let MacaddrValue::Error(error) = left {
        return MacaddrValue::Error(error);
    }
    if let MacaddrValue::Error(error) = right {
        return MacaddrValue::Error(error);
    }
    if left == MacaddrValue::Unknown || right == MacaddrValue::Unknown {
        return macaddr_unresolved(unresolved_flavor);
    }
    if left == MacaddrValue::Null || right == MacaddrValue::Null {
        return MacaddrValue::Null;
    }
    if let MacaddrValue::Value(a) = left {
        if let MacaddrValue::Value(b) = right {
            let mut word0 = address_and_word(a.word0, b.word0);
            if union {
                word0 = a.word0 + b.word0 - word0;
            }
            let mut word1 = address_and_word(a.word1, b.word1);
            if union {
                word1 = a.word1 + b.word1 - word1;
            }
            let mut word2 = address_and_word(a.word2, b.word2);
            if union {
                word2 = a.word2 + b.word2 - word2;
            }
            let mut word3 = address_and_word(a.word3, b.word3);
            if union {
                word3 = a.word3 + b.word3 - word3;
            }
            return MacaddrValue::Value(MacAddress {
                word0,
                word1,
                word2,
                word3,
            });
        }
    }
    macaddr_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_and__ky45(left: MacaddrValue, right: MacaddrValue) -> MacaddrValue {
    macaddr_bitwise(left, right, false)
}

pub fn sql__pg_catalog__macaddr_or__wqx0(left: MacaddrValue, right: MacaddrValue) -> MacaddrValue {
    macaddr_bitwise(left, right, true)
}

pub fn sql__pg_catalog__macaddr8_not__ufi9(input: Macaddr8Value) -> Macaddr8Value {
    if let Macaddr8Value::Value(a) = input {
        return Macaddr8Value::Value(MacAddress {
            word0: 65535 - a.word0,
            word1: 65535 - a.word1,
            word2: 65535 - a.word2,
            word3: 65535 - a.word3,
        });
    }
    input
}

pub fn sql__pg_catalog__trunc__y4rb(input: Macaddr8Value) -> Macaddr8Value {
    if let Macaddr8Value::Value(a) = input {
        return Macaddr8Value::Value(MacAddress {
            word0: a.word0,
            word1: a.word1 / 256 * 256,
            word2: 0,
            word3: 0,
        });
    }
    input
}

fn macaddr8_bitwise(left: Macaddr8Value, right: Macaddr8Value, union: bool) -> Macaddr8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Macaddr8Value::Unknown = right { unresolved_flavor = 1; };
    if let Macaddr8Value::Error(error) = left {
        return Macaddr8Value::Error(error);
    }
    if let Macaddr8Value::Error(error) = right {
        return Macaddr8Value::Error(error);
    }
    if left == Macaddr8Value::Unknown || right == Macaddr8Value::Unknown {
        return macaddr8_unresolved(unresolved_flavor);
    }
    if left == Macaddr8Value::Null || right == Macaddr8Value::Null {
        return Macaddr8Value::Null;
    }
    if let Macaddr8Value::Value(a) = left {
        if let Macaddr8Value::Value(b) = right {
            let mut word0 = address_and_word(a.word0, b.word0);
            if union {
                word0 = a.word0 + b.word0 - word0;
            }
            let mut word1 = address_and_word(a.word1, b.word1);
            if union {
                word1 = a.word1 + b.word1 - word1;
            }
            let mut word2 = address_and_word(a.word2, b.word2);
            if union {
                word2 = a.word2 + b.word2 - word2;
            }
            let mut word3 = address_and_word(a.word3, b.word3);
            if union {
                word3 = a.word3 + b.word3 - word3;
            }
            return Macaddr8Value::Value(MacAddress {
                word0,
                word1,
                word2,
                word3,
            });
        }
    }
    macaddr8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_and__ceah(
    left: Macaddr8Value,
    right: Macaddr8Value,
) -> Macaddr8Value {
    macaddr8_bitwise(left, right, false)
}

pub fn sql__pg_catalog__macaddr8_or__6kdp(
    left: Macaddr8Value,
    right: Macaddr8Value,
) -> Macaddr8Value {
    macaddr8_bitwise(left, right, true)
}

pub fn sql__pg_catalog__macaddr8_set7bit__2kgh(input: Macaddr8Value) -> Macaddr8Value {
    if let Macaddr8Value::Value(a) = input {
        let intersection = address_and_word(a.word0, 512);
        return Macaddr8Value::Value(MacAddress {
            word0: a.word0 + 512 - intersection,
            word1: a.word1,
            word2: a.word2,
            word3: a.word3,
        });
    }
    input
}

pub fn sql__pg_catalog__macaddr8__ta7j(input: MacaddrValue) -> Macaddr8Value {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = input { unresolved_flavor = 1; };
    if let MacaddrValue::Error(error) = input {
        return Macaddr8Value::Error(error);
    }
    if input == MacaddrValue::Unknown {
        return macaddr8_unresolved(unresolved_flavor);
    }
    if input == MacaddrValue::Null {
        return Macaddr8Value::Null;
    }
    if let MacaddrValue::Value(a) = input {
        let inserted_high: i32 = 254;
        return Macaddr8Value::Value(MacAddress {
            word0: a.word0,
            word1: a.word1 / 256 * 256 + 255,
            word2: inserted_high * 256 + a.word1 % 256,
            word3: a.word2,
        });
    }
    macaddr8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr__xnt6(input: Macaddr8Value) -> MacaddrValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = input { unresolved_flavor = 1; };
    if let Macaddr8Value::Error(error) = input {
        return MacaddrValue::Error(error);
    }
    if input == Macaddr8Value::Unknown {
        return macaddr_unresolved(unresolved_flavor);
    }
    if input == Macaddr8Value::Null {
        return MacaddrValue::Null;
    }
    if let Macaddr8Value::Value(a) = input {
        if a.word1 % 256 != 255 || a.word2 / 256 != 254 {
            return MacaddrValue::Error(make_sql_error(MAC_CONVERSION_OUT_OF_RANGE));
        }
        return MacaddrValue::Value(MacAddress {
            word0: a.word0,
            word1: a.word1 / 256 * 256 + a.word2 % 256,
            word2: a.word3,
            word3: 0,
        });
    }
    macaddr_unresolved(unresolved_flavor)
}
