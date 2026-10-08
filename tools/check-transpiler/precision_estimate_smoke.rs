const BORROWED_WORD: &str = "anchor";
const NEGATIVE_ZERO: f64 = -0.0f64;
const LN_TEN: f64 = 2.302585092994046f64;

pub fn logarithm_scale_hint(digits: i32, decimal_weight: i32, display_scale: i32) -> i32 {
    let coefficient = digits as f64;
    let exponent = decimal_weight as f64;
    let logarithm = coefficient.ln() + exponent * LN_TEN;
    let weight = logarithm.abs().log10() as i32;
    let mut scale: i32 = 16 - weight;
    if scale < display_scale {
        scale = display_scale;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    scale
}

pub fn ieee_estimate_primitives() -> bool {
    let nan = 0.0f64 / 0.0f64;
    let positive = 1.0f64 / 0.0f64;
    let negative = -positive;
    let minus_zero = -0.0f64;
    let tiny = 5e-324f64;
    let denormal = tiny + tiny;
    let a = 1.0000000000000002f64;
    let b = 0.9999999999999998f64;
    let rounded = a * b;
    let difference = rounded - 1.0f64;
    let huge = (9007199254740992.0f64 + 1.0f64) - 9007199254740992.0f64;
    let zero_log = 0.0f64.ln();
    let negative_log = (-1.0f64).ln();
    let zero_cast = nan as i32;
    let positive_cast = positive as i32;
    let negative_cast = negative as i32;
    let truncated = -12.9f64 as i32;
    let min: i32 = -2147483647 - 1;
    let min_float = min as f64;
    nan != nan
        && positive > 0.0f64
        && negative < 0.0f64
        && 1.0f64 / minus_zero < 0.0f64
        && 1.0f64 / NEGATIVE_ZERO < 0.0f64
        && denormal == 1e-323f64
        && difference == 0.0f64
        && huge == 0.0f64
        && zero_log == negative
        && negative_log != negative_log
        && zero_cast == 0
        && positive_cast == 2147483647
        && negative_cast == min
        && truncated == -12
        && min_float == -2147483648.0f64
        && negative.abs() == positive
}

#[derive(Clone)]
struct ImmutableWork {
    digits: String,
    count: i32,
}

pub fn immutable_work_rebinding() -> bool {
    let input = ImmutableWork {
        digits: "before".to_owned(),
        count: 0,
    };
    let mut work = input.clone();
    let original = work.clone();
    while work.count < 3 {
        let count = work.count + 1;
        work = ImmutableWork {
            digits: "after".to_owned(),
            count: count,
        };
    }
    input.digits == "before".to_owned()
        && input.count == 0
        && original.digits == "before".to_owned()
        && original.count == 0
        && work.digits == "after".to_owned()
        && work.count == 3
}

pub fn borrowed_estimate_input(value: &str) -> bool {
    value == BORROWED_WORD
}
