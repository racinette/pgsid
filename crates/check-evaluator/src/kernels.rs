// Exact integer arithmetic on base-10000 digit vectors, most significant digit first. Each
// function computes a result with exactly one correct value, so every correct implementation
// returns the same digits: these bodies are the reference and run natively, while translated
// targets call their language runtime's own big-integer arithmetic instead.

// left * right, in left.len() + right.len() digits.
pub fn digits_product(left: Vec<usize>, right: Vec<usize>) -> Vec<usize> {
    let mut slots: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < left.len() + right.len() {
        slots.push(0);
        index += 1;
    }
    // A row adds one digit product of less than 10^8 to each column, so twenty rows stay
    // below the 32-bit maximum together with a normalised digit and its incoming carry.
    let mut rows: i32 = 0;
    let mut row = left.len();
    while row > 0 {
        row = row - 1;
        let factor = left[row] as i32;
        if factor != 0 {
            if rows == 20 {
                let mut carry: i32 = 0;
                let mut column = slots.len();
                while column > 0 {
                    column = column - 1;
                    let mut digit = (slots[column] as i32) + carry;
                    carry = digit / 10000;
                    digit = digit - carry * 10000;
                    slots[column] = usize::try_from(digit).unwrap_or(0);
                }
                rows = 0;
            }
            rows = rows + 1;
            let mut position: usize = 0;
            while position < right.len() {
                let at = row + position + 1;
                let sum = (slots[at] as i32) + factor * (right[position] as i32);
                slots[at] = usize::try_from(sum).unwrap_or(0);
                position += 1;
            }
        }
    }
    let mut carry: i32 = 0;
    let mut column = slots.len();
    while column > 0 {
        column = column - 1;
        let mut digit = (slots[column] as i32) + carry;
        carry = digit / 10000;
        digit = digit - carry * 10000;
        slots[column] = usize::try_from(digit).unwrap_or(0);
    }
    slots
}

// floor(dividend / divisor) in dividend.len() digits, by Knuth's algorithm D. A zero divisor
// has no quotient; callers never pass one.
pub fn digits_quotient(dividend: Vec<usize>, divisor: Vec<usize>) -> Vec<usize> {
    let count = dividend.len();
    let mut quotient: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < count {
        quotient.push(0);
        index += 1;
    }
    let mut first: usize = 0;
    while first < divisor.len() && divisor[first] == 0 {
        first += 1;
    }
    let length = divisor.len() - first;
    if length == 0 || length > count {
        return quotient;
    }
    if length == 1 {
        let single = divisor[first] as i32;
        let mut carry: i32 = 0;
        index = 0;
        while index < count {
            let value = carry * 10000 + (dividend[index] as i32);
            let digit = value / single;
            quotient[index] = usize::try_from(digit).unwrap_or(0);
            carry = value - digit * single;
            index += 1;
        }
        return quotient;
    }
    // A spare leading digit takes the carry from scaling, so that the first divisor digit is
    // at least half the base and each estimated quotient digit is at most one too large.
    let mut work: Vec<usize> = Vec::new();
    work.push(0);
    index = 0;
    while index < count {
        work.push(dividend[index]);
        index += 1;
    }
    let mut scaled: Vec<usize> = Vec::new();
    scaled.push(0);
    index = first;
    while index < divisor.len() {
        scaled.push(divisor[index]);
        index += 1;
    }
    if (scaled[1] as i32) < 5000 {
        let factor = 10000 / ((scaled[1] as i32) + 1);
        let mut carry: i32 = 0;
        let mut position = scaled.len();
        while position > 1 {
            position = position - 1;
            carry = carry + (scaled[position] as i32) * factor;
            scaled[position] = usize::try_from(carry % 10000).unwrap_or(0);
            carry = carry / 10000;
        }
        carry = 0;
        position = work.len();
        while position > 0 {
            position = position - 1;
            carry = carry + (work[position] as i32) * factor;
            work[position] = usize::try_from(carry % 10000).unwrap_or(0);
            carry = carry / 10000;
        }
    }
    let leading = scaled[1] as i32;
    let second = scaled[2] as i32;
    let steps = count - length + 1;
    let mut j: usize = 0;
    while j < steps {
        let pair = (work[j] as i32) * 10000 + (work[j + 1] as i32);
        let mut estimate: i32 = 0;
        if pair != 0 {
            if (work[j] as i32) == leading {
                estimate = 9999;
            } else {
                estimate = pair / leading;
            };
            while second * estimate > (pair - estimate * leading) * 10000 + (work[j + 2] as i32) {
                estimate = estimate - 1;
            }
            if estimate > 0 {
                let mut borrow: i32 = 0;
                let mut position = length + 1;
                while position > 0 {
                    position = position - 1;
                    let value =
                        (work[j + position] as i32) - borrow - (scaled[position] as i32) * estimate;
                    borrow = (9999 - value) / 10000;
                    work[j + position] = usize::try_from(value + borrow * 10000).unwrap_or(0);
                }
                if borrow != 0 {
                    estimate = estimate - 1;
                    let mut carry: i32 = 0;
                    position = length + 1;
                    while position > 0 {
                        position = position - 1;
                        carry = carry + (work[j + position] as i32) + (scaled[position] as i32);
                        if carry >= 10000 {
                            work[j + position] = usize::try_from(carry - 10000).unwrap_or(0);
                            carry = 1;
                        } else {
                            work[j + position] = usize::try_from(carry).unwrap_or(0);
                            carry = 0;
                        };
                    }
                }
            }
        }
        quotient[j + length - 1] = usize::try_from(estimate).unwrap_or(0);
        j += 1;
    }
    quotient
}

// count! without leading zero digits. Factors are taken in pairs whose product stays below
// 10^11, so a digit times the pair, with its carry, stays within 64 bits.
pub fn digits_factorial(count: i64) -> Vec<usize> {
    // Least significant digit first while the product grows.
    let mut slots: Vec<usize> = Vec::new();
    slots.push(1);
    let mut factor: i64 = 2i64;
    while factor <= count {
        let mut multiplier: i64 = factor;
        factor = factor + 1i64;
        if factor <= count && multiplier * factor < 100000000000i64 {
            multiplier = multiplier * factor;
            factor = factor + 1i64;
        }
        let mut carry: i64 = 0i64;
        let mut index: usize = 0;
        while index < slots.len() {
            let value: i64 = ((slots[index] as i32) as i64) * multiplier + carry;
            carry = value / 10000i64;
            slots[index] = usize::try_from((value - carry * 10000i64) as i32).unwrap_or(0);
            index += 1;
        }
        while carry > 0i64 {
            let next: i64 = carry / 10000i64;
            slots.push(usize::try_from((carry - next * 10000i64) as i32).unwrap_or(0));
            carry = next;
        }
    }
    let mut digits: Vec<usize> = Vec::new();
    let mut index = slots.len();
    while index > 0 {
        index = index - 1;
        digits.push(slots[index]);
    }
    digits
}
