/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// Transcribed from musl's expm1, log1p, __expo2 and hyperbolic functions, which PostgreSQL calls
// through dsinh, dcosh, dtanh, dasinh, dacosh and datanh. musl sets no errno, so overflowing
// sinh and cosh return infinity rather than an error, as in PGlite.

const HYPERBOLIC_LN2_HI: f64 = 6.93147180369123816490e-01f64;
const HYPERBOLIC_LN2_LO: f64 = 1.90821492927058770002e-10f64;

fn musl_expm1(input: f64) -> f64 {
    let mut x = input;
    let high = circle_math_high_word(x) as i64;
    let negative = (x.to_bits() as i64) < 0i64;
    if high >= 1078159482i64 {
        if x != x {
            return x;
        };
        if negative {
            return -1.0f64;
        };
        if x > 7.09782712893383973096e+02f64 {
            return x * 8.98846567431158e+307f64;
        };
    };
    let mut k: i32 = 0;
    let mut c = 0.0f64;
    if high > 1071001154i64 {
        let mut hi = 0.0f64;
        let mut lo = 0.0f64;
        if high < 1072734898i64 {
            if negative == false {
                hi = x - HYPERBOLIC_LN2_HI;
                lo = HYPERBOLIC_LN2_LO;
                k = 1;
            } else {
                hi = x + HYPERBOLIC_LN2_HI;
                lo = -HYPERBOLIC_LN2_LO;
                k = -1;
            };
        } else {
            let mut bias = 0.5f64;
            if negative {
                bias = -0.5f64;
            };
            k = (1.44269504088896338700e+00f64 * x + bias) as i32;
            let t = k as f64;
            hi = x - t * HYPERBOLIC_LN2_HI;
            lo = t * HYPERBOLIC_LN2_LO;
        };
        x = hi - lo;
        c = (hi - x) - lo;
    } else {
        if high < 1016070144i64 {
            return x;
        };
    };
    let hfx = 0.5f64 * x;
    let hxs = x * hfx;
    let r1 = 1.0f64
        + hxs
            * (-3.33333333333331316428e-02f64
                + hxs
                    * (1.58730158725481460165e-03f64
                        + hxs
                            * (-7.93650757867487942473e-05f64
                                + hxs
                                    * (4.00821782732936239552e-06f64
                                        + hxs * -2.01099218183624371326e-07f64))));
    let t = 3.0f64 - r1 * hfx;
    let mut e = hxs * ((r1 - t) / (6.0f64 - x * t));
    if k == 0 {
        return x - (x * e - hxs);
    };
    e = x * (e - c) - c;
    e = e - hxs;
    if k == -1 {
        return 0.5f64 * (x - e) - 0.5f64;
    };
    if k == 1 {
        if x < -0.25f64 {
            return -2.0f64 * (e - (x + 0.5f64));
        };
        return 1.0f64 + 2.0f64 * (x - e);
    };
    let k_wide = k as i64;
    let twopk = f64::from_bits(((1023i64 + k_wide) * 4503599627370496i64) as u64);
    if k < 0 || k > 56 {
        let mut y = x - e + 1.0f64;
        if k == 1024 {
            y = y * 2.0f64 * 8.98846567431158e+307f64;
        } else {
            y = y * twopk;
        };
        return y - 1.0f64;
    };
    let inverse = f64::from_bits(((1023i64 - k_wide) * 4503599627370496i64) as u64);
    if k < 20 {
        return (x - e + (1.0f64 - inverse)) * twopk;
    };
    (x - (e + inverse) + 1.0f64) * twopk
}

fn musl_log1p(input: f64) -> f64 {
    let x = input;
    let bits = x.to_bits() as i64;
    let negative = bits < 0i64;
    let unsigned_high = circle_math_high_word(x) as i64 + if_negative_high(negative);
    let mut k: i64 = 1i64;
    let mut c = 0.0f64;
    let mut f = 0.0f64;
    if unsigned_high < 1071284858i64 || negative {
        if unsigned_high >= 3220176896i64 {
            if x == -1.0f64 {
                return x / 0.0f64;
            };
            return (x - x) / 0.0f64;
        };
        if circle_math_high_word(x) < 1017118720 {
            return x;
        };
        if unsigned_high <= 3218259652i64 {
            k = 0i64;
            c = 0.0f64;
            f = x;
        };
    } else {
        if unsigned_high >= 2146435072i64 {
            return x;
        };
    };
    if k != 0i64 {
        let u = 1.0f64 + x;
        let u_bits = u.to_bits() as i64;
        let mut hu = u_bits / 4294967296i64;
        hu = hu + 1072693248i64 - 1072079006i64;
        k = hu / 1048576i64 - 1023i64;
        if k < 54i64 {
            if k >= 2i64 {
                c = 1.0f64 - (u - x);
            } else {
                c = x - (u - 1.0f64);
            };
            c = c / u;
        } else {
            c = 0.0f64;
        };
        hu = hu % 1048576i64 + 1072079006i64;
        let low = u_bits % 4294967296i64;
        f = f64::from_bits((hu * 4294967296i64 + low) as u64) - 1.0f64;
    };
    let hfsq = 0.5f64 * f * f;
    let s = f / (2.0f64 + f);
    let z = s * s;
    let w = z * z;
    let t1 = w
        * (3.999999999940941908e-01f64
            + w * (2.222219843214978396e-01f64 + w * 1.531383769920937332e-01f64));
    let t2 = z
        * (6.666666666666735130e-01f64
            + w * (2.857142874366239149e-01f64
                + w * (1.818357216161805012e-01f64 + w * 1.479819860511658591e-01f64)));
    let r = t2 + t1;
    let dk = (k as i32) as f64;
    s * (hfsq + r) + (dk * HYPERBOLIC_LN2_LO + c) - hfsq + f + dk * HYPERBOLIC_LN2_HI
}

// The high word with its sign bit, as the unsigned comparisons in log1p read it.
fn if_negative_high(negative: bool) -> i64 {
    if negative {
        return 2147483648i64;
    };
    0i64
}

fn musl_expo2(x: f64, sign: f64) -> f64 {
    let scale = f64::from_bits((2044i64 * 4503599627370496i64) as u64);
    musl_exp(x - 1416.0996898839683f64) * (sign * scale) * scale
}

fn musl_sinh(x: f64) -> f64 {
    let mut h = 0.5f64;
    if (x.to_bits() as i64) < 0i64 {
        h = -h;
    };
    let absx = x.abs();
    let w = circle_math_high_word(absx) as i64;
    if w < 1082535490i64 {
        let t = musl_expm1(absx);
        if w < 1072693248i64 {
            if w < 1072693248i64 - 27262976i64 {
                return x;
            };
            return h * (2.0f64 * t - t * t / (t + 1.0f64));
        };
        return h * (t + t / (t + 1.0f64));
    };
    musl_expo2(absx, 2.0f64 * h)
}

fn musl_cosh(input: f64) -> f64 {
    let x = input.abs();
    let w = circle_math_high_word(x) as i64;
    if w < 1072049730i64 {
        if w < 1072693248i64 - 27262976i64 {
            return 1.0f64;
        };
        let t = musl_expm1(x);
        return 1.0f64 + t * t / (2.0f64 * (1.0f64 + t));
    };
    if w < 1082535490i64 {
        let t = musl_exp(x);
        return 0.5f64 * (t + 1.0f64 / t);
    };
    musl_expo2(x, 1.0f64)
}

fn musl_tanh(input: f64) -> f64 {
    let negative = (input.to_bits() as i64) < 0i64;
    let x = input.abs();
    let w = circle_math_high_word(x) as i64;
    let mut t = 0.0f64;
    if w > 1071748074i64 {
        if w > 1077149696i64 {
            t = 1.0f64 - 0.0f64 / x;
        } else {
            t = musl_expm1(2.0f64 * x);
            t = 1.0f64 - 2.0f64 / (t + 2.0f64);
        };
    } else {
        if w > 1070618798i64 {
            t = musl_expm1(2.0f64 * x);
            t = t / (t + 2.0f64);
        } else {
            if w >= 1048576i64 {
                t = musl_expm1(-2.0f64 * x);
                t = -t / (t + 2.0f64);
            } else {
                t = x;
            };
        };
    };
    if negative {
        return -t;
    };
    t
}

fn musl_asinh(input: f64) -> f64 {
    let negative = (input.to_bits() as i64) < 0i64;
    let mut x = input.abs();
    let e = (x.to_bits() as i64) / 4503599627370496i64;
    if e >= 1049i64 {
        x = musl_log(x) + 0.693147180559945309417232121458176568f64;
    } else {
        if e >= 1024i64 {
            x = musl_log(2.0f64 * x + 1.0f64 / ((x * x + 1.0f64).sqrt() + x));
        } else {
            if e >= 997i64 {
                x = musl_log1p(x + x * x / ((x * x + 1.0f64).sqrt() + 1.0f64));
            };
        };
    };
    if negative {
        return -x;
    };
    x
}

// Arguments are at least one; PostgreSQL rejects others first.
fn musl_acosh(x: f64) -> f64 {
    let e = (x.to_bits() as i64) / 4503599627370496i64;
    if e < 1024i64 {
        return musl_log1p(
            x - 1.0f64 + ((x - 1.0f64) * (x - 1.0f64) + 2.0f64 * (x - 1.0f64)).sqrt(),
        );
    };
    if e < 1049i64 {
        return musl_log(2.0f64 * x - 1.0f64 / (x + (x * x - 1.0f64).sqrt()));
    };
    musl_log(x) + 0.693147180559945309417232121458176568f64
}

// Arguments are strictly between -1 and 1; PostgreSQL handles the endpoints first.
fn musl_atanh(input: f64) -> f64 {
    let negative = (input.to_bits() as i64) < 0i64;
    let mut y = input.abs();
    let e = (y.to_bits() as i64) / 4503599627370496i64;
    if e < 1022i64 {
        if e >= 991i64 {
            y = 0.5f64 * musl_log1p(2.0f64 * y + 2.0f64 * y * y / (1.0f64 - y));
        };
    } else {
        y = 0.5f64 * musl_log1p(2.0f64 * (y / (1.0f64 - y)));
    };
    if negative {
        return -y;
    };
    y
}

fn float8_hyperbolic(input: Float8Value, musl: bool, operation: i32) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if operation == 4 && number < 1.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if operation == 5 {
            if number < -1.0f64 || number > 1.0f64 {
                return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
            };
            if number == -1.0f64 {
                return make_float8_value(-1.0f64 / 0.0f64);
            };
            if number == 1.0f64 {
                return make_float8_value(1.0f64 / 0.0f64);
            };
        };
        if musl == false {
            return Float8Value::Unknown;
        };
        let mut result = 0.0f64;
        if operation == 0 {
            result = musl_sinh(number);
        };
        if operation == 1 {
            result = musl_cosh(number);
        };
        if operation == 2 {
            result = musl_tanh(number);
        };
        if operation == 3 {
            result = musl_asinh(number);
        };
        if operation == 4 {
            result = musl_acosh(number);
        };
        if operation == 5 {
            result = musl_atanh(number);
        };
        return make_float8_value(result);
    };
    input
}

pub fn sql__pg_catalog__sinh__q8zj(input: Float8Value, musl: bool) -> Float8Value {
    float8_hyperbolic(input, musl, 0)
}

pub fn sql__pg_catalog__cosh__spqu(input: Float8Value, musl: bool) -> Float8Value {
    float8_hyperbolic(input, musl, 1)
}

pub fn sql__pg_catalog__tanh__r3xc(input: Float8Value, musl: bool) -> Float8Value {
    float8_hyperbolic(input, musl, 2)
}

pub fn sql__pg_catalog__asinh__7c19(input: Float8Value, musl: bool) -> Float8Value {
    float8_hyperbolic(input, musl, 3)
}

pub fn sql__pg_catalog__acosh__jeyr(input: Float8Value, musl: bool) -> Float8Value {
    float8_hyperbolic(input, musl, 4)
}

pub fn sql__pg_catalog__atanh__nwxx(input: Float8Value, musl: bool) -> Float8Value {
    float8_hyperbolic(input, musl, 5)
}
