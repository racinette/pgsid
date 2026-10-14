fn money_word(index: i32) -> String {
    if index == 0 {
        return "zero".to_owned();
    };
    if index == 1 {
        return "one".to_owned();
    };
    if index == 2 {
        return "two".to_owned();
    };
    if index == 3 {
        return "three".to_owned();
    };
    if index == 4 {
        return "four".to_owned();
    };
    if index == 5 {
        return "five".to_owned();
    };
    if index == 6 {
        return "six".to_owned();
    };
    if index == 7 {
        return "seven".to_owned();
    };
    if index == 8 {
        return "eight".to_owned();
    };
    if index == 9 {
        return "nine".to_owned();
    };
    if index == 10 {
        return "ten".to_owned();
    };
    if index == 11 {
        return "eleven".to_owned();
    };
    if index == 12 {
        return "twelve".to_owned();
    };
    if index == 13 {
        return "thirteen".to_owned();
    };
    if index == 14 {
        return "fourteen".to_owned();
    };
    if index == 15 {
        return "fifteen".to_owned();
    };
    if index == 16 {
        return "sixteen".to_owned();
    };
    if index == 17 {
        return "seventeen".to_owned();
    };
    if index == 18 {
        return "eighteen".to_owned();
    };
    if index == 19 {
        return "nineteen".to_owned();
    };
    if index == 20 {
        return "twenty".to_owned();
    };
    if index == 21 {
        return "thirty".to_owned();
    };
    if index == 22 {
        return "forty".to_owned();
    };
    if index == 23 {
        return "fifty".to_owned();
    };
    if index == 24 {
        return "sixty".to_owned();
    };
    if index == 25 {
        return "seventy".to_owned();
    };
    if index == 26 {
        return "eighty".to_owned();
    };
    if index == 27 {
        return "ninety".to_owned();
    };
    "".to_owned()
}
fn money_hundred_words(value: i32) -> String {
    let mut result = String::new();
    let mut rest = value;
    if value >= 100 {
        let hundreds = money_word(value / 100);
        result.push_str(hundreds.as_str());
        result.push_str(" hundred");
        rest = value % 100;
        if rest == 0 {
            return result;
        };
        if rest < 20 {
            result.push_str(" and ");
        } else {
            result.push_str(" ");
        };
    };
    if rest <= 20 {
        let word = money_word(rest);
        result.push_str(word.as_str());
        return result;
    };
    let tens = money_word(18 + rest / 10);
    result.push_str(tens.as_str());
    let ones = rest % 10;
    if ones > 0 {
        result.push_str(" ");
        let word = money_word(ones);
        result.push_str(word.as_str());
    };
    result
}
fn money_words(input: MoneyValue) -> TextValue {
    if let MoneyValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == MoneyValue::Null {
        return TextValue::Null;
    };
    if let MoneyValue::Value(value) = input {
        let mut dollars = value / 100i64;
        let mut cents = value % 100i64;
        let mut text = String::new();
        if value < 0i64 {
            text.push_str("minus ");
            dollars = 0i64 - dollars;
            cents = 0i64 - cents;
        };
        let mut factor = 1000000000000000i64;
        let mut index: i32 = 5;
        while index >= 0 {
            let part = (dollars / factor) % 1000i64;
            if part != 0i64 {
                let word = money_hundred_words(part as i32);
                text.push_str(word.as_str());
                if index == 5 {
                    text.push_str(" quadrillion ");
                };
                if index == 4 {
                    text.push_str(" trillion ");
                };
                if index == 3 {
                    text.push_str(" billion ");
                };
                if index == 2 {
                    text.push_str(" million ");
                };
                if index == 1 {
                    text.push_str(" thousand ");
                };
            };
            factor = factor / 1000i64;
            index = index - 1;
        }
        if dollars == 0i64 {
            text.push_str("zero");
        };
        if dollars == 1i64 {
            text.push_str(" dollar and ");
        } else {
            text.push_str(" dollars and ");
        };
        let cent_words = money_hundred_words(cents as i32);
        text.push_str(cent_words.as_str());
        if cents == 1i64 {
            text.push_str(" cent");
        } else {
            text.push_str(" cents");
        };
        let chars: Vec<char> = text.chars().collect();
        let mut output = String::new();
        let mut at: usize = 0;
        while at < chars.len() {
            let mut ch = chars[at];
            let code = ch as i32;
            if at == 0 && code >= 97 && code <= 122 {
                let upper = code - 32;
                ch = char::from_u32(upper as u32).unwrap_or(ch);
            };
            output.push(ch);
            at += 1;
        }
        return make_text_value(output.as_str());
    };
    TextValue::Unknown
}
pub fn sql__pg_catalog__cash_words__atzl(input: MoneyValue) -> TextValue {
    money_words(input)
}
