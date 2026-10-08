fn numeric_common_work(work: NumericWork, scale: i32) -> NumericWork {
    let mut sign = work.sign;
    if sign < 0 {
        sign = 1;
    }
    NumericWork {
        valid: work.valid,
        special: work.special,
        sign: sign,
        weight: work.weight,
        scale: scale,
        digits: work.digits,
    }
}

fn numeric_common(left: NumericValue, right: NumericValue, multiple: bool) -> NumericValue {
    if let NumericValue::Error(error) = left {
        return NumericValue::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return NumericValue::Error(error);
    }
    if left == NumericValue::Unknown || right == NumericValue::Unknown {
        return NumericValue::Unknown;
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(first) = left {
        if let NumericValue::Value(second) = right {
            let a = numeric_work_from_value(first.as_str());
            let b = numeric_work_from_value(second.as_str());
            if a.valid == false || b.valid == false {
                return NumericValue::Unknown;
            }
            if a.special != 1 || b.special != 1 {
                return NumericValue::Value("NaN".to_owned());
            }
            let mut scale = a.scale;
            if scale < b.scale {
                scale = b.scale;
            }
            if multiple && (a.sign == 0 || b.sign == 0) {
                return NumericValue::Value(numeric_work_text(numeric_common_work(
                    numeric_work_from_value("0"),
                    scale,
                )));
            }
            let mut dividend = numeric_work_text(numeric_common_work(a.clone(), scale));
            let mut divisor = numeric_work_text(numeric_common_work(b.clone(), scale));
            let mut active = b.sign != 0;
            while active {
                let remainder = numeric_division(
                    make_numeric_value(dividend.as_str()),
                    make_numeric_value(divisor.as_str()),
                    2,
                );
                if let NumericValue::Error(error) = remainder {
                    return NumericValue::Error(error);
                }
                if remainder == NumericValue::Unknown {
                    return NumericValue::Unknown;
                }
                dividend = divisor.clone();
                if let NumericValue::Value(value) = remainder {
                    let layout = numeric_parts(value.as_str());
                    active = layout.sign != 0;
                    divisor = value;
                }
            }
            if multiple {
                let quotient =
                    numeric_division_work(a, numeric_work_from_value(dividend.as_str()), 0, false);
                let product = numeric_work_multiply(quotient, b);
                if let NumericValue::Value(value) = product {
                    return NumericValue::Value(numeric_work_text(numeric_common_work(
                        numeric_work_from_value(value.as_str()),
                        scale,
                    )));
                }
                return product;
            }
            return NumericValue::Value(numeric_work_text(numeric_common_work(
                numeric_work_from_value(dividend.as_str()),
                scale,
            )));
        }
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__gcd__bke6(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_common(left, right, false)
}

pub fn sql__pg_catalog__lcm__pjls(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_common(left, right, true)
}
