/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

#[derive(Clone, Copy)]
struct CircleAngleReduction {
    head: i64,
    tail: i64,
    quadrant: i32,
}

fn circle_math_high_word(value: f64) -> i32 {
    let mut bits = value.to_bits() as i64;
    if bits < 0i64 {
        bits = bits - -9223372036854775808i64;
    };
    (bits / 4294967296i64) as i32
}

fn circle_sine_kernel(x: f64, y: f64, tail: bool) -> f64 {
    let z = x * x;
    let w = z * z;
    let r = 8.33333333332248946124e-03f64
        + z * (-1.98412698298579493134e-04f64 + z * 2.75573137070700676789e-06f64)
        + z * w * (-2.50507602534068634195e-08f64 + z * 1.58969099521155010221e-10f64);
    let v = z * x;
    if tail == false {
        return x + v * (-1.66666666666666324348e-01f64 + z * r);
    };
    x - ((z * (0.5f64 * y - v * r) - y) - v * -1.66666666666666324348e-01f64)
}

fn circle_cosine_kernel(x: f64, y: f64) -> f64 {
    let z = x * x;
    let mut w = z * z;
    let r = z * (4.16666666666666019037e-02f64
        + z * (-1.38888888888741095749e-03f64 + z * 2.48015872894767294178e-05f64))
        + w * w * (-2.75573143513906633035e-07f64
            + z * (2.08757232129817482790e-09f64 + z * -1.13596475577881948265e-11f64));
    let half = 0.5f64 * z;
    w = 1.0f64 - half;
    w + (((1.0f64 - w) - half) + (z * r - x * y))
}

fn circle_reduce_angle(x: f64) -> CircleAngleReduction {
    let high = circle_math_high_word(x);
    let mut quadrant: i32 = 0;
    if high <= 1074752122 {
        if high % 1048576 != 598523 {
            quadrant = 1;
            if high > 1073928572 {
                quadrant = 2;
            };
        };
    } else {
        if high <= 1075183036 {
            if high != 1074977148 {
                quadrant = 3;
            };
        } else {
            if high != 1075388923 {
                quadrant = 4;
            };
        };
    };
    if quadrant != 0 {
        let count = quadrant as f64;
        let first = x - count * 1.57079632673412561417f64;
        let head = first - count * 6.07710050650619224932e-11f64;
        let tail = (first - head) - count * 6.07710050650619224932e-11f64;
        return CircleAngleReduction {
            head: head.to_bits() as i64,
            tail: tail.to_bits() as i64,
            quadrant,
        };
    };
    let mut count = (x * 6.36619772367581382433e-01f64 + 6755399441055744.0f64)
        - 6755399441055744.0f64;
    quadrant = count as i32;
    let mut first = x - count * 1.57079632673412561417f64;
    let mut correction = count * 6.07710050650619224932e-11f64;
    if first - correction < -0.7853981633974483f64 {
        quadrant = quadrant - 1;
        count = count - 1.0f64;
        first = x - count * 1.57079632673412561417f64;
        correction = count * 6.07710050650619224932e-11f64;
    } else {
        if first - correction > 0.7853981633974483f64 {
            quadrant = quadrant + 1;
            count = count + 1.0f64;
            first = x - count * 1.57079632673412561417f64;
            correction = count * 6.07710050650619224932e-11f64;
        };
    };
    let mut head = first - correction;
    let exponent = high / 1048576;
    if exponent - circle_math_high_word(head) / 1048576 > 16 {
        let previous = first;
        correction = count * 6.07710050630396597660e-11f64;
        first = previous - correction;
        correction = count * 2.02226624879595063154e-21f64 - ((previous - first) - correction);
        head = first - correction;
        if exponent - circle_math_high_word(head) / 1048576 > 49 {
            let previous = first;
            correction = count * 2.02226624871116645580e-21f64;
            first = previous - correction;
            correction = count * 8.47842766036889956997e-32f64 - ((previous - first) - correction);
            head = first - correction;
        };
    };
    let tail = (first - head) - correction;
    CircleAngleReduction {
        head: head.to_bits() as i64,
        tail: tail.to_bits() as i64,
        quadrant,
    }
}

fn circle_trigonometry(angle: f64, cosine: bool) -> f64 {
    let high = circle_math_high_word(angle);
    if high <= 1072243195 {
        if cosine {
            if high < 1044381696 {
                return 1.0f64;
            };
            return circle_cosine_kernel(angle, 0.0f64);
        };
        if high < 1045430272 {
            return angle;
        };
        return circle_sine_kernel(angle, 0.0f64, false);
    };
    let reduced = circle_reduce_angle(angle);
    let head = f64::from_bits(reduced.head as u64);
    let tail = f64::from_bits(reduced.tail as u64);
    let mut quadrant = reduced.quadrant % 4;
    if cosine {
        quadrant = (quadrant + 1) % 4;
    };
    if quadrant == 0 {
        return circle_sine_kernel(head, tail, true);
    };
    if quadrant == 1 {
        return circle_cosine_kernel(head, tail);
    };
    if quadrant == 2 {
        return -circle_sine_kernel(head, tail, true);
    };
    -circle_cosine_kernel(head, tail)
}
