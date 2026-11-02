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
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = left {
        return NumericValue::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_28_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_28_4 < 1 { condition_flavor_28_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_28_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_28_4 < 1 { condition_flavor_28_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_28_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return numeric_unresolved(condition_flavor_28_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(first) = left {
        if let NumericValue::Value(second) = right {
            let a = numeric_work_from_value(first.as_str());
            let b = numeric_work_from_value(second.as_str());
            if a.valid == false || b.valid == false {
                return numeric_unresolved(unresolved_flavor);
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
                let mut condition_flavor_66_16: i32 = unresolved_flavor; if let NumericValue::Unknown = remainder { if condition_flavor_66_16 < 1 { condition_flavor_66_16 = 1; }; }; if let NumericValue::Unimplemented = remainder { condition_flavor_66_16 = 2; }; if remainder == NumericValue::Unknown || remainder == NumericValue::Unimplemented {
                    return numeric_unresolved(condition_flavor_66_16);
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
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__gcd__bke6(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_common(left, right, false)
}

pub fn sql__pg_catalog__lcm__pjls(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_common(left, right, true)
}
