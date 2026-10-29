/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// Transcribed from musl's erf and erfc, which keep fdlibm's rational approximations and use the
// Arm-derived exp in the tails; PostgreSQL calls them through derf and derfc.

const ERF_ERX: f64 = 8.45062911510467529297e-01f64;

fn musl_erf_small(z: f64) -> f64 {
    let r = 1.28379167095512558561e-01f64
        + z * (-3.25042107247001499370e-01f64
            + z * (-2.84817495755985104766e-02f64
                + z * (-5.77027029648944159157e-03f64 + z * -2.37630166566501626084e-05f64)));
    let s = 1.0f64
        + z * (3.97917223959155352819e-01f64
            + z * (6.50222499887672944485e-02f64
                + z * (5.08130628187576562776e-03f64
                    + z * (1.32494738004321644526e-04f64 + z * -3.96022827877536812320e-06f64))));
    r / s
}

fn musl_erfc1(x: f64) -> f64 {
    let s = x.abs() - 1.0f64;
    let p = -2.36211856075265944077e-03f64
        + s * (4.14856118683748331666e-01f64
            + s * (-3.72207876035701323847e-01f64
                + s * (3.18346619901161753674e-01f64
                    + s * (-1.10894694282396677476e-01f64
                        + s * (3.54783043256182359371e-02f64
                            + s * -2.16637559486879084300e-03f64)))));
    let q = 1.0f64
        + s * (1.06420880400844228286e-01f64
            + s * (5.40397917702171048937e-01f64
                + s * (7.18286544141962662868e-02f64
                    + s * (1.26171219808761642112e-01f64
                        + s * (1.36370839120290507362e-02f64
                            + s * 1.19844998467991074170e-02f64)))));
    1.0f64 - ERF_ERX - p / q
}

fn musl_erfc2(high: i64, input: f64) -> f64 {
    if high < 1072955392i64 {
        return musl_erfc1(input);
    };
    let x = input.abs();
    let s = 1.0f64 / (x * x);
    let mut r = 0.0f64;
    let mut big_s = 0.0f64;
    if high < 1074191213i64 {
        r = -9.86494403484714822705e-03f64
            + s * (-6.93858572707181764372e-01f64
                + s * (-1.05586262253232909814e+01f64
                    + s * (-6.23753324503260060396e+01f64
                        + s * (-1.62396669462573470355e+02f64
                            + s * (-1.84605092906711035994e+02f64
                                + s * (-8.12874355063065934246e+01f64
                                    + s * -9.81432934416914548592e+00f64))))));
        big_s = 1.0f64
            + s * (1.96512716674392571292e+01f64
                + s * (1.37657754143519042600e+02f64
                    + s * (4.34565877475229228821e+02f64
                        + s * (6.45387271733267880336e+02f64
                            + s * (4.29008140027567833386e+02f64
                                + s * (1.08635005541779435134e+02f64
                                    + s * (6.57024977031928170135e+00f64
                                        + s * -6.04244152148580987438e-02f64)))))));
    } else {
        r = -9.86494292470009928597e-03f64
            + s * (-7.99283237680523006574e-01f64
                + s * (-1.77579549177547519889e+01f64
                    + s * (-1.60636384855821916062e+02f64
                        + s * (-6.37566443368389627722e+02f64
                            + s * (-1.02509513161107724954e+03f64
                                + s * -4.83519191608651397019e+02f64)))));
        big_s = 1.0f64
            + s * (3.03380607434824582924e+01f64
                + s * (3.25792512996573918826e+02f64
                    + s * (1.53672958608443695994e+03f64
                        + s * (3.19985821950859553908e+03f64
                            + s * (2.55305040643316442583e+03f64
                                + s * (4.74528541206955367215e+02f64
                                    + s * -2.24409524465858183362e+01f64))))));
    };
    let z = float8_clear_low_word(x);
    musl_exp(-z * z - 0.5625f64) * musl_exp((z - x) * (z + x) + r / big_s) / x
}

fn musl_erf(x: f64) -> f64 {
    let negative = (x.to_bits() as i64) < 0i64;
    let high = circle_math_high_word(x) as i64;
    if high >= 2146435072i64 {
        let mut sign = 1.0f64;
        if negative {
            sign = -1.0f64;
        };
        return sign + 1.0f64 / x;
    };
    if high < 1072365568i64 {
        if high < 1043333120i64 {
            return 0.125f64 * (8.0f64 * x + 1.02703333676410069053e+00f64 * x);
        };
        return x + x * musl_erf_small(x * x);
    };
    let mut y = 1.0f64 - 2.2250738585072014e-308f64;
    if high < 1075314688i64 {
        y = 1.0f64 - musl_erfc2(high, x);
    };
    if negative {
        return -y;
    };
    y
}

fn musl_erfc(x: f64) -> f64 {
    let negative = (x.to_bits() as i64) < 0i64;
    let high = circle_math_high_word(x) as i64;
    if high >= 2146435072i64 {
        let mut twice_sign = 0.0f64;
        if negative {
            twice_sign = 2.0f64;
        };
        return twice_sign + 1.0f64 / x;
    };
    if high < 1072365568i64 {
        if high < 1013972992i64 {
            return 1.0f64 - x;
        };
        let y = musl_erf_small(x * x);
        if negative || high < 1070596096i64 {
            return 1.0f64 - (x + x * y);
        };
        return 0.5f64 - (x - 0.5f64 + x * y);
    };
    if high < 1077673984i64 {
        if negative {
            return 2.0f64 - musl_erfc2(high, x);
        };
        return musl_erfc2(high, x);
    };
    if negative {
        return 2.0f64 - 2.2250738585072014e-308f64;
    };
    2.2250738585072014e-308f64 * 2.2250738585072014e-308f64
}

fn float8_error_function(input: Float8Value, musl: bool, complement: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if musl == false {
            return Float8Value::Unknown;
        };
        if complement {
            return make_float8_value(musl_erfc(number));
        };
        return make_float8_value(musl_erf(number));
    };
    input
}

pub fn sql__pg_catalog__erf__nlw2(input: Float8Value, musl: bool) -> Float8Value {
    float8_error_function(input, musl, false)
}

pub fn sql__pg_catalog__erfc__oibn(input: Float8Value, musl: bool) -> Float8Value {
    float8_error_function(input, musl, true)
}

// Generated from musl's tgamma.c; the dialect's static tables hold integers, so these are bits.
const GAMMA_NUMERATOR: &[i64] = &[
    4761969815764182174i64,
    4765930390633663575i64,
    4764985644051772954i64,
    4760499098151822874i64,
    4753126926655529448i64,
    4743825433057030975i64,
    4732626853539962666i64,
    4719201174427651224i64,
    4703431370238653516i64,
    4685632857438652395i64,
    4665596911923288068i64,
    4641621736398011218i64,
    4612826843881809669i64,
];
const GAMMA_DENOMINATOR: &[i64] = &[
    0i64,
    4720626352061939712i64,
    4727861969648877568i64,
    4729339976074919936i64,
    4726836159391465472i64,
    4721442252235210752i64,
    4713423218923274240i64,
    4702918524023078912i64,
    4689884092848668672i64,
    4674709475175694336i64,
    4656181054980227072i64,
    4634344754052595712i64,
    4607182418800017408i64,
];
const GAMMA_FACTORIALS: &[i64] = &[
    4607182418800017408i64,
    4607182418800017408i64,
    4611686018427387904i64,
    4618441417868443648i64,
    4627448617123184640i64,
    4638144666238189568i64,
    4649544402794971136i64,
    4662263553305083904i64,
    4675774352187195392i64,
    4689977843394805760i64,
    4705047200009289728i64,
    4720626352061939712i64,
    4736815922046566400i64,
    4753323511810883584i64,
    4770521722250067968i64,
    4788179038478794752i64,
    4806193436988276736i64,
    4824542600135966720i64,
    4843268373501640704i64,
    4862483217080946688i64,
    4882150158176967168i64,
    4901649482228549152i64,
    4922002638466838636i64,
];

const GAMMA_PI: f64 = 3.141592653589793238462643383279502884f64;
const GAMMA_HALF_OFFSET: f64 = 5.524680040776729583740234375f64;

// sin(pi * x) through the fdlibm kernels after an exact reduction modulo two.
fn musl_sinpi(input: f64) -> f64 {
    let mut x = input * 0.5f64;
    x = 2.0f64 * (x - float8_floor_value(x));
    let mut n = (4.0f64 * x) as i32;
    n = (n + 1) / 2;
    x = x - (n as f64) * 0.5f64;
    x = x * GAMMA_PI;
    if n == 1 {
        return circle_cosine_kernel(x, 0.0f64);
    };
    if n == 2 {
        return circle_sine_kernel(-x, 0.0f64, false);
    };
    if n == 3 {
        return -circle_cosine_kernel(x, 0.0f64);
    };
    circle_sine_kernel(x, 0.0f64, false)
}

fn musl_gamma_series(x: f64) -> f64 {
    let mut num = 0.0f64;
    let mut den = 0.0f64;
    if x < 8.0f64 {
        let mut i: usize = 13;
        while i > 0 {
            i = i - 1;
            num = num * x + f64::from_bits(GAMMA_NUMERATOR[i] as u64);
            den = den * x + f64::from_bits(GAMMA_DENOMINATOR[i] as u64);
        }
    } else {
        let mut i: usize = 0;
        while i < 13 {
            num = num / x + f64::from_bits(GAMMA_NUMERATOR[i] as u64);
            den = den / x + f64::from_bits(GAMMA_DENOMINATOR[i] as u64);
            i += 1;
        }
    };
    num / den
}

fn musl_tgamma(input: f64) -> f64 {
    let x = input;
    let high = circle_math_high_word(x) as i64;
    let negative = (x.to_bits() as i64) < 0i64;
    if high >= 2146435072i64 {
        return x + 1.0f64 / 0.0f64;
    };
    if high < 1016070144i64 {
        return 1.0f64 / x;
    };
    if x == float8_floor_value(x) {
        if negative {
            return 0.0f64 / 0.0f64;
        };
        if x <= 23.0f64 {
            let mut index: usize = 0;
            let mut remaining = x - 1.0f64;
            while remaining > 0.0f64 {
                index += 1;
                remaining = remaining - 1.0f64;
            }
            return f64::from_bits(GAMMA_FACTORIALS[index] as u64);
        };
    };
    if high >= 1080492032i64 {
        if negative {
            if float8_floor_value(x) * 0.5f64 == float8_floor_value(x * 0.5f64) {
                return 0.0f64;
            };
            return -0.0f64;
        };
        return x * 8.98846567431158e+307f64;
    };
    let absx = x.abs();
    let mut y = absx + GAMMA_HALF_OFFSET;
    let mut dy = 0.0f64;
    if absx > GAMMA_HALF_OFFSET {
        dy = y - absx;
        dy = dy - GAMMA_HALF_OFFSET;
    } else {
        dy = y - GAMMA_HALF_OFFSET;
        dy = dy - absx;
    };
    let mut z = absx - 0.5f64;
    let mut r = musl_gamma_series(absx) * musl_exp(-y);
    if x < 0.0f64 {
        r = -GAMMA_PI / (musl_sinpi(absx) * absx * r);
        dy = -dy;
        z = -z;
    };
    r = r + dy * (GAMMA_HALF_OFFSET + 0.5f64) * r / y;
    z = musl_pow(y, 0.5f64 * z);
    y = r * z * z;
    y
}

// dgamma: NaN passes through, positive infinity is itself, and negative infinity or a result
// that is infinite, NaN or zero is out of range.
pub fn sql__pg_catalog__gamma__t3sa(input: Float8Value, musl: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if number == 1.0f64 / 0.0f64 {
            return input;
        };
        if number == -1.0f64 / 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if musl == false {
            return Float8Value::Unknown;
        };
        let result = musl_tgamma(number);
        if result != result || result.abs() == 1.0f64 / 0.0f64 || result == 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        return make_float8_value(result);
    };
    input
}

// Transcribed from musl's lgamma_r, which keeps fdlibm's intervals; dlgamma discards the sign it
// reports, so only the logarithm is kept.
fn musl_lgamma(input: f64) -> f64 {
    let negative = (input.to_bits() as i64) < 0i64;
    let high = circle_math_high_word(input) as i64;
    if high >= 2146435072i64 {
        return input * input;
    };
    // The shared log handles only positive arguments, so a zero pole is answered here.
    if input == 0.0f64 {
        return 1.0f64 / 0.0f64;
    };
    if high < 999292928i64 {
        return -musl_log(input.abs());
    };
    let mut x = input;
    let mut nadj = 0.0f64;
    if negative {
        x = -x;
        let mut t = musl_sinpi_lgamma(x);
        if t == 0.0f64 {
            return 1.0f64 / (x - x);
        };
        if t < 0.0f64 {
            t = -t;
        };
        nadj = musl_log(GAMMA_PI / (t * x));
    };
    let mut r = 0.0f64;
    if x == 1.0f64 || x == 2.0f64 {
        r = 0.0f64;
    } else {
        if high < 1073741824i64 {
            let mut y = 0.0f64;
            let mut i: i32 = 0;
            if high <= 1072483532i64 {
                r = -musl_log(x);
                if high >= 1072130372i64 {
                    y = 1.0f64 - x;
                    i = 0;
                } else {
                    if high >= 1070442081i64 {
                        y = x - (1.46163214496836224576e+00f64 - 1.0f64);
                        i = 1;
                    } else {
                        y = x;
                        i = 2;
                    };
                };
            } else {
                r = 0.0f64;
                if high >= 1073460419i64 {
                    y = 2.0f64 - x;
                    i = 0;
                } else {
                    if high >= 1072936132i64 {
                        y = x - 1.46163214496836224576e+00f64;
                        i = 1;
                    } else {
                        y = x - 1.0f64;
                        i = 2;
                    };
                };
            };
            if i == 0 {
                let z = y * y;
                let p1 = 7.72156649015328655494e-02f64
                    + z * (6.73523010531292681824e-02f64
                        + z * (7.38555086081402883957e-03f64
                            + z * (1.19270763183362067845e-03f64
                                + z * (2.20862790713908385557e-04f64
                                    + z * 2.52144565451257326939e-05f64))));
                let p2 = z
                    * (3.22467033424113591611e-01f64
                        + z * (2.05808084325167332806e-02f64
                            + z * (2.89051383673415629091e-03f64
                                + z * (5.10069792153511336608e-04f64
                                    + z * (1.08011567247583939954e-04f64
                                        + z * 4.48640949618915160150e-05f64)))));
                let p = y * p1 + p2;
                r = r + (p - 0.5f64 * y);
            };
            if i == 1 {
                let z = y * y;
                let w = z * y;
                let p1 = 4.83836122723810047042e-01f64
                    + w * (-3.27885410759859649565e-02f64
                        + w * (6.10053870246291332635e-03f64
                            + w * (-1.40346469989232843813e-03f64
                                + w * 3.15632070903625950361e-04f64)));
                let p2 = -1.47587722994593911752e-01f64
                    + w * (1.79706750811820387126e-02f64
                        + w * (-3.68452016781138256760e-03f64
                            + w * (8.81081882437654011382e-04f64
                                + w * -3.12754168375120860518e-04f64)));
                let p3 = 6.46249402391333854778e-02f64
                    + w * (-1.03142241298341437450e-02f64
                        + w * (2.25964780900612472250e-03f64
                            + w * (-5.38595305356740546715e-04f64
                                + w * 3.35529192635519073543e-04f64)));
                let p = z * p1 - (-3.63867699703950536541e-18f64 - w * (p2 + y * p3));
                r = r + (-1.21486290535849611461e-01f64 + p);
            };
            if i == 2 {
                let p1 = y
                    * (-7.72156649015328655494e-02f64
                        + y * (6.32827064025093366517e-01f64
                            + y * (1.45492250137234768737e+00f64
                                + y * (9.77717527963372745603e-01f64
                                    + y * (2.28963728064692451092e-01f64
                                        + y * 1.33810918536787660377e-02f64)))));
                let p2 = 1.0f64
                    + y * (2.45597793713041134822e+00f64
                        + y * (2.12848976379893395361e+00f64
                            + y * (7.69285150456672783825e-01f64
                                + y * (1.04222645593369134254e-01f64
                                    + y * 3.21709242282423911810e-03f64))));
                r = r + (-0.5f64 * y + p1 / p2);
            };
        } else {
            if high < 1075838976i64 {
                let i = x as i32;
                let y = x - (i as f64);
                let p = y
                    * (-7.72156649015328655494e-02f64
                        + y * (2.14982415960608852501e-01f64
                            + y * (3.25778796408930981787e-01f64
                                + y * (1.46350472652464452805e-01f64
                                    + y * (2.66422703033638609560e-02f64
                                        + y * (1.84028451407337715652e-03f64
                                            + y * 3.19475326584100867617e-05f64))))));
                let q = 1.0f64
                    + y * (1.39200533467621045958e+00f64
                        + y * (7.21935547567138069525e-01f64
                            + y * (1.71933865632803078993e-01f64
                                + y * (1.86459191715652901344e-02f64
                                    + y * (7.77942496381893596434e-04f64
                                        + y * 7.32668430744625636189e-06f64)))));
                r = 0.5f64 * y + p / q;
                let mut z = 1.0f64;
                if i >= 7 {
                    z = z * (y + 6.0f64);
                };
                if i >= 6 {
                    z = z * (y + 5.0f64);
                };
                if i >= 5 {
                    z = z * (y + 4.0f64);
                };
                if i >= 4 {
                    z = z * (y + 3.0f64);
                };
                if i >= 3 {
                    z = z * (y + 2.0f64);
                    r = r + musl_log(z);
                };
            } else {
                if high < 1133510656i64 {
                    let t = musl_log(x);
                    let z = 1.0f64 / x;
                    let y = z * z;
                    let w = 4.18938533204672725052e-01f64
                        + z * (8.33333333333329678849e-02f64
                            + y * (-2.77777777728775536470e-03f64
                                + y * (7.93650558643019558500e-04f64
                                    + y * (-5.95187557450339963135e-04f64
                                        + y * (8.36339918996282139126e-04f64
                                            + y * -1.63092934096575273989e-03f64)))));
                    r = (x - 0.5f64) * (t - 1.0f64) + w;
                } else {
                    r = x * (musl_log(x) - 1.0f64);
                };
            };
        };
    };
    if negative {
        r = nadj - r;
    };
    r
}

// lgamma's sin_pi reduces with x * 0.5 before flooring, which differs from tgamma's order.
fn musl_sinpi_lgamma(input: f64) -> f64 {
    let mut x = 2.0f64 * (input * 0.5f64 - float8_floor_value(input * 0.5f64));
    let mut n = (x * 4.0f64) as i32;
    n = (n + 1) / 2;
    x = x - (n as f64) * 0.5f64;
    x = x * GAMMA_PI;
    if n == 1 {
        return circle_cosine_kernel(x, 0.0f64);
    };
    if n == 2 {
        return circle_sine_kernel(-x, 0.0f64, false);
    };
    if n == 3 {
        return -circle_cosine_kernel(x, 0.0f64);
    };
    circle_sine_kernel(x, 0.0f64, false)
}

// dlgamma: an infinite result from a finite argument is out of range.
pub fn sql__pg_catalog__lgamma__rpzb(input: Float8Value, musl: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if number.abs() == 1.0f64 / 0.0f64 {
            return make_float8_value(1.0f64 / 0.0f64);
        };
        if musl == false {
            return Float8Value::Unknown;
        };
        let result = musl_lgamma(number);
        if result.abs() == 1.0f64 / 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        return make_float8_value(result);
    };
    input
}
