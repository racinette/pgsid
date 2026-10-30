// Transcribed from PostgreSQL 18.6 formatting.c: the number template parser (parse_format with
// NUMDesc_prepare), NUM_processor's to_char path with NUM_numpart_to_char, int_to_roman and
// get_th. The dialect has no bitwise operators, so NUMDesc's flag word is a set of booleans.

const NUMBER_FORMAT_SYNTAX: u32 = 6819553;
const NUMBER_FORMAT_TEXT: u32 = 3484946;
const NUMBER_FORMAT_RANGE: u32 = 3452547;

const NUMBER_KEY_COMMA: i32 = 1;
const NUMBER_KEY_DEC: i32 = 2;
const NUMBER_KEY_ZERO: i32 = 3;
const NUMBER_KEY_NINE: i32 = 4;
const NUMBER_KEY_B: i32 = 5;
const NUMBER_KEY_D: i32 = 7;
const NUMBER_KEY_E: i32 = 8;
const NUMBER_KEY_FM: i32 = 9;
const NUMBER_KEY_G: i32 = 10;
const NUMBER_KEY_L: i32 = 11;
const NUMBER_KEY_MI: i32 = 12;
const NUMBER_KEY_PL: i32 = 13;
const NUMBER_KEY_PR: i32 = 14;
const NUMBER_KEY_RN: i32 = 15;
const NUMBER_KEY_LOWER_RN: i32 = 16;
const NUMBER_KEY_SG: i32 = 17;
const NUMBER_KEY_S: i32 = 19;
const NUMBER_KEY_TH: i32 = 20;
const NUMBER_KEY_LOWER_TH: i32 = 21;
const NUMBER_KEY_V: i32 = 22;

// NUM_keywords in table order; the first keyword matching at a position wins, so SG and SP
// precede S. C and SP are accepted and produce nothing.
const NUMBER_KEYWORD_NAMES: &[&str] = &[
    ",", ".", "0", "9", "B", "C", "D", "EEEE", "FM", "G", "L", "MI", "PL", "PR", "RN", "SG", "SP",
    "S", "TH", "V", "b", "c", "d", "eeee", "fm", "g", "l", "mi", "pl", "pr", "rn", "sg", "sp", "s",
    "th", "v",
];
const NUMBER_KEYWORD_IDS: &[i32] = &[
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 5, 6, 7, 8, 9, 10, 11,
    12, 13, 14, 16, 17, 18, 19, 21, 22,
];

// get_th's numTH and numth.
const NUMBER_SUFFIX_UPPER: &[&str] = &["ST", "ND", "RD", "TH"];
const NUMBER_SUFFIX_LOWER: &[&str] = &["st", "nd", "rd", "th"];

#[derive(Clone)]
struct NumberDigits {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct NumberFormatNode {
    action: bool,
    key: i32,
    position: usize,
}

#[derive(Clone)]
struct NumberFormat {
    error: u32,
    characters: Vec<char>,
    nodes: Vec<NumberFormatNode>,
    pre: i32,
    post: i32,
    multi: i32,
    decimal: bool,
    zero: bool,
    blank: bool,
    fillmode: bool,
    bracket: bool,
    minus: bool,
    plus: bool,
    lsign: i32,
    pre_lsign_num: i32,
    roman: bool,
    multiplied: bool,
    eeee: bool,
    zero_start: i32,
    zero_end: i32,
    numeric_locale: bool,
    monetary_locale: bool,
}

fn number_format_keyword(text: &NumberDigits, position: usize) -> usize {
    let mut index: usize = 0;
    while index < NUMBER_KEYWORD_NAMES.len() {
        let keyword = NUMBER_KEYWORD_NAMES[index];
        let name: Vec<char> = keyword.chars().collect();
        let mut offset: usize = 0;
        let mut matched = true;
        while matched && offset < name.len() {
            if position + offset >= text.characters.len()
                || text.characters[position + offset] != name[offset]
            {
                matched = false;
            };
            offset += 1;
        }
        if matched {
            return index + 1;
        };
        index += 1;
    }
    0
}

// parse_format with NUM_FLAG and NUMDesc_prepare; the first syntax error is kept and parsing
// stops, as ereport does.
fn number_format_parse(template: &str) -> NumberFormat {
    let characters: Vec<char> = template.chars().collect();
    let scan_characters: Vec<char> = template.chars().collect();
    let scanned = NumberDigits {
        characters: scan_characters,
    };
    let mut nodes: Vec<NumberFormatNode> = Vec::new();
    let mut error: u32 = 0;
    let mut pre: i32 = 0;
    let mut post: i32 = 0;
    let mut multi: i32 = 0;
    let mut decimal = false;
    let mut ldecimal = false;
    let mut zero = false;
    let mut blank = false;
    let mut fillmode = false;
    let mut bracket = false;
    let mut minus = false;
    let mut minus_post = false;
    let mut plus = false;
    let mut plus_post = false;
    let mut lsign_flag = false;
    let mut lsign: i32 = 0;
    let mut pre_lsign_num: i32 = 0;
    let mut roman = false;
    let mut multiplied = false;
    let mut eeee = false;
    let mut zero_start: i32 = 0;
    let mut zero_end: i32 = 0;
    let mut numeric_locale = false;
    let mut monetary_locale = false;
    let mut position: usize = 0;
    while position < characters.len() && error == 0 {
        let found = number_format_keyword(&scanned, position);
        if found > 0 {
            let key = NUMBER_KEYWORD_IDS[found - 1];
            let keyword = NUMBER_KEYWORD_NAMES[found - 1];
            let name: Vec<char> = keyword.chars().collect();
            nodes.push(NumberFormatNode {
                action: true,
                key: key,
                position: position,
            });
            position = position + name.len();
            if eeee && key != NUMBER_KEY_E {
                error = NUMBER_FORMAT_SYNTAX;
            } else if key == NUMBER_KEY_NINE {
                if bracket {
                    error = NUMBER_FORMAT_SYNTAX;
                } else if multiplied {
                    multi = multi + 1;
                } else if decimal {
                    post = post + 1;
                } else {
                    pre = pre + 1;
                };
            } else if key == NUMBER_KEY_ZERO {
                if bracket {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    if zero == false && decimal == false {
                        zero = true;
                        zero_start = pre + 1;
                    };
                    if decimal == false {
                        pre = pre + 1;
                    } else {
                        post = post + 1;
                    };
                    zero_end = pre + post;
                };
            } else if key == NUMBER_KEY_B {
                if pre == 0 && post == 0 && zero == false {
                    blank = true;
                };
            } else if key == NUMBER_KEY_D || key == NUMBER_KEY_DEC {
                if key == NUMBER_KEY_D {
                    ldecimal = true;
                    numeric_locale = true;
                };
                if decimal || multiplied {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    decimal = true;
                };
            } else if key == NUMBER_KEY_FM {
                fillmode = true;
            } else if key == NUMBER_KEY_S {
                if lsign_flag || plus || minus || bracket {
                    error = NUMBER_FORMAT_SYNTAX;
                } else if decimal == false {
                    lsign = 1;
                    pre_lsign_num = pre;
                    monetary_locale = true;
                    lsign_flag = true;
                } else if lsign == 0 {
                    lsign = 2;
                    monetary_locale = true;
                    lsign_flag = true;
                };
            } else if key == NUMBER_KEY_MI {
                if lsign_flag {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    minus = true;
                    if decimal {
                        minus_post = true;
                    };
                };
            } else if key == NUMBER_KEY_PL {
                if lsign_flag {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    plus = true;
                    if decimal {
                        plus_post = true;
                    };
                };
            } else if key == NUMBER_KEY_SG {
                if lsign_flag {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    minus = true;
                    plus = true;
                };
            } else if key == NUMBER_KEY_PR {
                if lsign_flag || plus || minus {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    bracket = true;
                };
            } else if key == NUMBER_KEY_RN || key == NUMBER_KEY_LOWER_RN {
                if roman {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    roman = true;
                };
            } else if key == NUMBER_KEY_L || key == NUMBER_KEY_G {
                if key == NUMBER_KEY_L {
                    monetary_locale = true;
                } else {
                    numeric_locale = true;
                };
            } else if key == NUMBER_KEY_V {
                if decimal {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    multiplied = true;
                };
            } else if key == NUMBER_KEY_E {
                if eeee
                    || blank
                    || fillmode
                    || lsign_flag
                    || bracket
                    || minus
                    || plus
                    || roman
                    || multiplied
                {
                    error = NUMBER_FORMAT_SYNTAX;
                } else {
                    eeee = true;
                };
            };
            if error == 0
                && roman
                && (decimal
                    || ldecimal
                    || zero
                    || blank
                    || bracket
                    || minus
                    || minus_post
                    || plus
                    || plus_post
                    || lsign_flag
                    || multiplied
                    || eeee)
            {
                error = NUMBER_FORMAT_SYNTAX;
            };
        } else if characters[position] == '"' {
            position += 1;
            let mut open = true;
            while open && position < characters.len() {
                if characters[position] == '"' {
                    position += 1;
                    open = false;
                } else {
                    if characters[position] == '\\' && position + 1 < characters.len() {
                        position += 1;
                    };
                    nodes.push(NumberFormatNode {
                        action: false,
                        key: 0,
                        position: position,
                    });
                    position += 1;
                };
            }
        } else {
            if characters[position] == '\\'
                && position + 1 < characters.len()
                && characters[position + 1] == '"'
            {
                position += 1;
            };
            nodes.push(NumberFormatNode {
                action: false,
                key: 0,
                position: position,
            });
            position += 1;
        };
    }
    NumberFormat {
        error: error,
        characters: characters,
        nodes: nodes,
        pre: pre,
        post: post,
        multi: multi,
        decimal: decimal,
        zero: zero,
        blank: blank,
        fillmode: fillmode,
        bracket: bracket,
        minus: minus,
        plus: plus,
        lsign: lsign,
        pre_lsign_num: pre_lsign_num,
        roman: roman,
        multiplied: multiplied,
        eeee: eeee,
        zero_start: zero_start,
        zero_end: zero_end,
        numeric_locale: numeric_locale,
        monetary_locale: monetary_locale,
    }
}

fn number_format_at(number: &NumberDigits, index: usize) -> char {
    if index < number.characters.len() {
        return number.characters[index];
    };
    '\0'
}

fn number_format_index(value: i32) -> usize {
    let mut index: usize = 0;
    let mut remaining = value;
    while remaining > 0 {
        index += 1;
        remaining = remaining - 1;
    }
    index
}

// int_to_roman: 1 through 3999, otherwise fifteen '#'. Each decimal place uses its one, five
// and ten letters, which is what PostgreSQL's rm1/rm10/rm100 tables and leading M's spell.
fn number_format_roman(value: i32) -> Vec<char> {
    let mut result: Vec<char> = Vec::new();
    if value > 3999 || value < 1 {
        let mut count: i32 = 0;
        while count < 15 {
            result.push('#');
            count = count + 1;
        }
        return result;
    };
    let mut place: i32 = 3;
    while place >= 0 {
        let mut divisor: i32 = 1;
        let mut step: i32 = 0;
        while step < place {
            divisor = divisor * 10;
            step = step + 1;
        }
        let digit = (value / divisor) % 10;
        let mut one = 'M';
        let mut five = 'M';
        let mut ten = 'M';
        if place == 2 {
            one = 'C';
            five = 'D';
        } else if place == 1 {
            one = 'X';
            five = 'L';
            ten = 'C';
        } else if place == 0 {
            one = 'I';
            five = 'V';
            ten = 'X';
        };
        if place == 2 {
            ten = 'M';
        };
        if place == 3 {
            let mut count: i32 = 0;
            while count < digit {
                result.push('M');
                count = count + 1;
            }
        } else if digit == 9 {
            result.push(one);
            result.push(ten);
        } else if digit == 4 {
            result.push(one);
            result.push(five);
        } else {
            let mut ones = digit;
            if digit >= 5 {
                result.push(five);
                ones = digit - 5;
            };
            let mut count: i32 = 0;
            while count < ones {
                result.push(one);
                count = count + 1;
            }
        };
        place = place - 1;
    }
    result
}

// fill_str with a decimal point after pre: the overflow marker for a too-narrow template.
fn number_format_overflow(pre: i32, post: i32) -> Vec<char> {
    let mut result: Vec<char> = Vec::new();
    let mut count: i32 = 0;
    while count < pre + post + 1 {
        if count == pre {
            result.push('.');
        } else {
            result.push('#');
        };
        count = count + 1;
    }
    result
}

// NUM_processor for to_char. Locale symbols are PostgreSQL's defaults, which are also what a C
// LC_NUMERIC and LC_MONETARY give; the callers defer templates that need any other locale.
fn number_format_process(
    format: &NumberFormat,
    pre: i32,
    post: i32,
    number: &NumberDigits,
    out_pre_spaces: i32,
    sign: char,
) -> TextValue {
    if format.eeee {
        let mut text = String::new();
        let mut index: usize = 0;
        while index < number.characters.len() {
            text.push(number.characters[index]);
            index += 1;
        }
        return TextValue::Value(text);
    };
    let mut zero_start = format.zero_start;
    if zero_start > 0 {
        zero_start = zero_start - 1;
    };
    let zero_end = format.zero_end;
    let mut bracket = format.bracket;
    let mut lsign = format.lsign;
    let mut sign_wrote = false;
    if format.plus || format.minus {
        sign_wrote = (format.plus && format.minus == false) == false;
    } else {
        if sign != '-' && format.fillmode {
            bracket = false;
        };
        sign_wrote = sign == '+' && format.fillmode && format.lsign == 0;
        if lsign == 1 && pre == format.pre_lsign_num {
            lsign = 2;
        };
    };
    let mut num_count = post + pre - 1;
    let mut has_last = false;
    let mut last_relevant: i32 = 0;
    if format.fillmode && format.decimal {
        let mut index: usize = 0;
        let mut found = false;
        while index < number.characters.len() {
            if found == false && number.characters[index] == '.' {
                found = true;
                last_relevant = index as i32;
            } else if found && number.characters[index] != '0' {
                last_relevant = index as i32;
            };
            index += 1;
        }
        has_last = found;
        if has_last && zero_end > out_pre_spaces {
            let mut last_zero = (number.characters.len() as i32) - 1;
            if zero_end - out_pre_spaces < last_zero {
                last_zero = zero_end - out_pre_spaces;
            };
            if last_relevant < last_zero {
                last_relevant = last_zero;
            };
        };
    };
    if sign_wrote == false && out_pre_spaces == 0 {
        num_count = num_count + 1;
    };
    let mut last_char = '\0';
    if has_last {
        last_char = number_format_at(number, number_format_index(last_relevant));
    };
    let mut output = String::new();
    let mut num_in = false;
    let mut num_curr: i32 = 0;
    let mut number_p: usize = 0;
    let mut position: usize = 0;
    while position < format.nodes.len() {
        let node = format.nodes[position];
        position += 1;
        if node.action == false {
            output.push(format.characters[node.position]);
        } else if node.key == NUMBER_KEY_NINE
            || node.key == NUMBER_KEY_ZERO
            || node.key == NUMBER_KEY_DEC
            || node.key == NUMBER_KEY_D
        {
            if format.roman == false {
                num_in = false;
                let predec_space = format.zero == false
                    && number_p == 0
                    && number_format_at(number, 0) == '0'
                    && post != 0;
                if sign_wrote == false
                    && (num_curr >= out_pre_spaces || (format.zero && zero_start == num_curr))
                    && (predec_space == false || (has_last && last_char == '.'))
                {
                    if format.lsign != 0 && lsign != 0 {
                        if lsign == 1 {
                            if sign == '-' {
                                output.push('-');
                            } else {
                                output.push('+');
                            };
                            sign_wrote = true;
                        };
                    } else if bracket {
                        if sign == '+' {
                            output.push(' ');
                        } else {
                            output.push('<');
                        };
                        sign_wrote = true;
                    } else if sign == '+' {
                        if format.fillmode == false {
                            output.push(' ');
                        };
                        sign_wrote = true;
                    } else if sign == '-' {
                        output.push('-');
                        sign_wrote = true;
                    };
                };
                if num_curr < out_pre_spaces && (zero_start > num_curr || format.zero == false) {
                    if format.fillmode == false {
                        output.push(' ');
                    };
                } else if format.zero && num_curr < out_pre_spaces && zero_start <= num_curr {
                    output.push('0');
                    num_in = true;
                } else {
                    let current = number_format_at(number, number_p);
                    if current == '.' {
                        if has_last == false || last_char != '.' || format.fillmode {
                            output.push('.');
                        };
                    } else if has_last
                        && (number_p as i32) > last_relevant
                        && node.key != NUMBER_KEY_ZERO
                    {
                    } else if format.zero == false
                        && number_p == 0
                        && number_format_at(number, 0) == '0'
                        && post != 0
                    {
                        if format.fillmode == false {
                            output.push(' ');
                        } else if has_last && last_char == '.' {
                            output.push('0');
                        };
                    } else {
                        output.push(current);
                        num_in = true;
                    };
                    if current != '\0' {
                        number_p += 1;
                    };
                };
                let mut end = num_count;
                if out_pre_spaces != 0 {
                    end = end + 1;
                };
                if format.decimal {
                    end = end + 1;
                };
                if has_last && last_relevant == (number_p as i32) {
                    end = num_curr;
                };
                if num_curr + 1 == end {
                    if sign_wrote && bracket {
                        if sign == '+' {
                            output.push(' ');
                        } else {
                            output.push('>');
                        };
                    } else if format.lsign != 0 && lsign == 2 {
                        if sign == '-' {
                            output.push('-');
                        } else {
                            output.push('+');
                        };
                    };
                };
                num_curr = num_curr + 1;
            };
        } else if node.key == NUMBER_KEY_COMMA || node.key == NUMBER_KEY_G {
            if num_in {
                output.push(',');
            } else if format.fillmode == false {
                output.push(' ');
            };
        } else if node.key == NUMBER_KEY_L {
            output.push(' ');
        } else if node.key == NUMBER_KEY_RN || node.key == NUMBER_KEY_LOWER_RN {
            if format.fillmode == false {
                let mut pad = (number.characters.len() as i32) - (number_p as i32);
                while pad < 15 {
                    output.push(' ');
                    pad = pad + 1;
                }
            };
            let mut index = number_p;
            while index < number.characters.len() {
                let mut letter = number.characters[index];
                if node.key == NUMBER_KEY_LOWER_RN {
                    letter = letter.to_ascii_lowercase();
                };
                output.push(letter);
                index += 1;
            }
        } else if node.key == NUMBER_KEY_TH || node.key == NUMBER_KEY_LOWER_TH {
            if format.roman == false
                && number_format_at(number, 0) != '#'
                && sign != '-'
                && format.decimal == false
            {
                let last = number_format_at(number, number.characters.len() - 1);
                if (last as i32) < 48 || (last as i32) > 57 {
                    return TextValue::Error(make_sql_error(NUMBER_FORMAT_TEXT));
                };
                let mut choice: usize = 3;
                if number.characters.len() < 2
                    || number.characters[number.characters.len() - 2] != '1'
                {
                    if last == '1' {
                        choice = 0;
                    } else if last == '2' {
                        choice = 1;
                    } else if last == '3' {
                        choice = 2;
                    };
                };
                if node.key == NUMBER_KEY_TH {
                    output.push_str(NUMBER_SUFFIX_UPPER[choice]);
                } else {
                    output.push_str(NUMBER_SUFFIX_LOWER[choice]);
                };
            };
        } else if node.key == NUMBER_KEY_MI {
            if sign == '-' {
                output.push('-');
            } else if format.fillmode == false {
                output.push(' ');
            };
        } else if node.key == NUMBER_KEY_PL {
            if sign == '+' {
                output.push('+');
            } else if format.fillmode == false {
                output.push(' ');
            };
        } else if node.key == NUMBER_KEY_SG {
            output.push(sign);
        };
    }
    // A digit position past the end of the number writes the C string terminator, and the text
    // ends there when PostgreSQL measures it.
    let finished = output;
    let written: Vec<char> = finished.chars().collect();
    let mut text = String::new();
    let mut index: usize = 0;
    while index < written.len() && written[index] != '\0' {
        text.push(written[index]);
        index += 1;
    }
    TextValue::Value(text)
}

// Rounds a decimal digit string with an implied exponent to scientific notation with post
// fraction digits, as printf's %+.*e (ties to even on the exact value) or numeric_out_sci
// (ties away from zero); returns the digits with a sign or a leading space.
fn number_format_scientific(
    digits: &NumberDigits,
    exponent: i32,
    negative: bool,
    post: i32,
    ties_even: bool,
) -> Vec<char> {
    let mut first: usize = 0;
    while first < digits.characters.len() && digits.characters[first] == '0' {
        first += 1;
    }
    let mut kept: Vec<char> = Vec::new();
    let mut integer_digits: usize = 1;
    let mut power = exponent;
    if first == digits.characters.len() {
        power = 0;
        let mut count: i32 = 0;
        while count <= post {
            kept.push('0');
            count = count + 1;
        }
    } else {
        power = exponent - (first as i32);
        let mut index = first;
        while (kept.len() as i32) <= post {
            if index < digits.characters.len() {
                kept.push(digits.characters[index]);
            } else {
                kept.push('0');
            };
            index += 1;
        }
        let mut up = false;
        if index < digits.characters.len() {
            let next = digits.characters[index];
            let mut rest_nonzero = false;
            let mut later = index + 1;
            while later < digits.characters.len() {
                if digits.characters[later] != '0' {
                    rest_nonzero = true;
                };
                later += 1;
            }
            let previous = kept[kept.len() - 1];
            let odd = previous == '1'
                || previous == '3'
                || previous == '5'
                || previous == '7'
                || previous == '9';
            if (next as i32) > 53 || (next == '5' && rest_nonzero) {
                up = true;
            } else if next == '5' {
                up = ties_even == false || odd;
            };
        };
        if up {
            let mut carry = true;
            let mut slot = kept.len();
            while carry && slot > 0 {
                slot = slot - 1;
                let digit = kept[slot];
                if digit == '9' {
                    kept[slot] = '0';
                } else {
                    kept[slot] = char::from_u32(((digit as i32) + 1) as u32).unwrap_or('0');
                    carry = false;
                };
            }
            // A carry out of every digit leaves them all zero. printf renormalizes to a leading
            // one with a larger exponent; numeric_out_sci fixes the exponent before rounding and
            // prints the carried mantissa as 10.
            if carry {
                kept[0] = '1';
                if ties_even {
                    power = power + 1;
                } else {
                    kept.push('0');
                    integer_digits = 2;
                };
            };
        };
    };
    let mut output: Vec<char> = Vec::new();
    if negative {
        output.push('-');
    } else {
        output.push(' ');
    };
    let mut slot: usize = 0;
    while slot < kept.len() {
        if slot == integer_digits {
            output.push('.');
        };
        output.push(kept[slot]);
        slot += 1;
    }
    output.push('e');
    let mut magnitude = power;
    if power < 0 {
        output.push('-');
        magnitude = 0 - power;
    } else {
        output.push('+');
    };
    if magnitude < 10 {
        output.push('0');
    };
    let exponent_string = text_number(magnitude, 10);
    let exponent_text: Vec<char> = exponent_string.chars().collect();
    let mut place: usize = 0;
    while place < exponent_text.len() {
        output.push(exponent_text[place]);
        place += 1;
    }
    output
}

// The integer path shared by int4 and int8 once V has scaled the value: zero-padded fraction
// digits, the number of leading blanks, or the overflow marker.
fn number_format_integer(
    format: &NumberFormat,
    digits: &NumberDigits,
    negative: bool,
    pre: i32,
) -> TextValue {
    let mut number: Vec<char> = Vec::new();
    let mut copied: usize = 0;
    while copied < digits.characters.len() {
        number.push(digits.characters[copied]);
        copied += 1;
    }
    let digits_before = digits.characters.len() as i32;
    if format.post > 0 {
        number.push('.');
        let mut count: i32 = 0;
        while count < format.post {
            number.push('0');
            count = count + 1;
        }
    };
    let mut sign = '+';
    if negative {
        sign = '-';
    };
    let mut out_pre_spaces: i32 = 0;
    if digits_before < pre {
        out_pre_spaces = pre - digits_before;
    } else if digits_before > pre {
        let overflow = NumberDigits {
            characters: number_format_overflow(pre, format.post),
        };
        return number_format_process(format, pre, format.post, &overflow, 0, sign);
    };
    let rendered = NumberDigits { characters: number };
    number_format_process(format, pre, format.post, &rendered, out_pre_spaces, sign)
}

fn number_format_prepare(template: &str, numeric_c: bool, monetary_c: bool) -> NumberFormat {
    let format = number_format_parse(template);
    if format.error != 0 {
        return format;
    };
    let mut error: u32 = 0;
    if (format.numeric_locale && numeric_c == false)
        || (format.monetary_locale && monetary_c == false)
    {
        error = 1;
    };
    NumberFormat {
        error: error,
        characters: format.characters,
        nodes: format.nodes,
        pre: format.pre,
        post: format.post,
        multi: format.multi,
        decimal: format.decimal,
        zero: format.zero,
        blank: format.blank,
        fillmode: format.fillmode,
        bracket: format.bracket,
        minus: format.minus,
        plus: format.plus,
        lsign: format.lsign,
        pre_lsign_num: format.pre_lsign_num,
        roman: format.roman,
        multiplied: format.multiplied,
        eeee: format.eeee,
        zero_start: format.zero_start,
        zero_end: format.zero_end,
        numeric_locale: format.numeric_locale,
        monetary_locale: format.monetary_locale,
    }
}

// The template outcome before any value: an empty template gives an empty string, a syntax
// error wins, and a template that reads an undeclared locale defers.
fn number_format_template_state(format: &NumberFormat) -> TextValue {
    if format.error == 1 {
        return TextValue::Unknown;
    };
    if format.error != 0 {
        return TextValue::Error(make_sql_error(format.error));
    };
    TextValue::NonNull
}

fn number_format_digits(value: i64) -> Vec<char> {
    let mut digits: Vec<char> = Vec::new();
    if value == 0i64 {
        digits.push('0');
        return digits;
    };
    let mut reversed: Vec<char> = Vec::new();
    let mut remaining = value;
    while remaining != 0i64 {
        let mut digit = remaining % 10i64;
        if digit < 0i64 {
            digit = 0i64 - digit;
        };
        reversed.push(char::from_u32(((digit as i32) + 48) as u32).unwrap_or('0'));
        remaining = remaining / 10i64;
    }
    let mut index = reversed.len();
    while index > 0 {
        index = index - 1;
        digits.push(reversed[index]);
    }
    digits
}

fn number_format_power(multi: i32) -> i64 {
    let mut result: i64 = 1i64;
    let mut count: i32 = 0;
    while count < multi {
        result = result * 10i64;
        count = count + 1;
    }
    result
}

fn number_format_int8(
    value: i64,
    template: &str,
    numeric_c: bool,
    monetary_c: bool,
    wide: bool,
) -> TextValue {
    if template == "" {
        return make_text_value("");
    };
    let format = number_format_prepare(template, numeric_c, monetary_c);
    let state = number_format_template_state(&format);
    if state != TextValue::NonNull {
        return state;
    };
    if format.roman {
        let mut roman: i64 = value;
        if value > 2147483647i64 || value < -2147483648i64 {
            roman = 2147483647i64;
        };
        let number = NumberDigits {
            characters: number_format_roman(roman as i32),
        };
        return number_format_process(&format, format.pre, format.post, &number, 0, '\0');
    };
    let negative = value < 0i64;
    if format.eeee {
        let digits = NumberDigits {
            characters: number_format_digits(value),
        };
        let exponent = (digits.characters.len() as i32) - 1;
        let number =
            number_format_scientific(&digits, exponent, negative, format.post, wide == false);
        let rendered = NumberDigits { characters: number };
        return number_format_process(&format, format.pre, format.post, &rendered, 0, '+');
    };
    let mut scaled = value;
    let mut pre = format.pre;
    if format.multiplied {
        // int8 multiplies through dtoi8 and int8mul, which raise errors. int4 in 18.6
        // multiplies after a C cast of the power to int32, whose overflow is undefined, so it
        // defers wherever the cast or the product leaves the int32 range.
        if wide {
            if format.multi >= 19 {
                return TextValue::Error(make_sql_error(NUMBER_FORMAT_RANGE));
            };
            let factor = number_format_power(format.multi);
            if value != 0i64
                && (value > 9223372036854775807i64 / factor
                    || value < (0i64 - 9223372036854775807i64 - 1i64) / factor)
            {
                return TextValue::Error(make_sql_error(NUMBER_FORMAT_RANGE));
            };
            scaled = value * factor;
        } else {
            if format.multi >= 10 {
                return TextValue::Unknown;
            };
            let factor = number_format_power(format.multi);
            let product = value * factor;
            if product > 2147483647i64 || product < -2147483648i64 {
                return TextValue::Unknown;
            };
            scaled = product;
        };
        pre = pre + format.multi;
    };
    let digits = NumberDigits {
        characters: number_format_digits(scaled),
    };
    number_format_integer(&format, &digits, scaled < 0i64, pre)
}

pub fn sql__pg_catalog__to_char__c1f5(
    input: Int4Value,
    template: TextValue,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if let Int4Value::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == Int4Value::Unknown
        || template == TextValue::Unknown
        || template == TextValue::NonNull
    {
        return TextValue::Unknown;
    };
    if input == Int4Value::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if let Int4Value::Value(value) = input {
        if let TextValue::Value(format) = template {
            return number_format_int8(value as i64, format.as_str(), numeric_c, monetary_c, false);
        };
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__to_char__ow74(
    input: Int8Value,
    template: TextValue,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if let Int8Value::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == Int8Value::Unknown
        || template == TextValue::Unknown
        || template == TextValue::NonNull
    {
        return TextValue::Unknown;
    };
    if input == Int8Value::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if let Int8Value::Value(value) = input {
        if let TextValue::Value(format) = template {
            return number_format_int8(value, format.as_str(), numeric_c, monetary_c, true);
        };
    };
    TextValue::Unknown
}

// numeric_out's spellings of NaN and infinity (the sign is separate).
const NUMBER_SPECIAL_SPELLINGS: &[&str] = &["NaN", "Infinity"];

// A numeric value's sign and digits as numeric_out prints them; special is 1 for NaN and 2 or 3
// for positive or negative infinity.
#[derive(Clone)]
struct NumberDecimal {
    special: i32,
    negative: bool,
    whole: Vec<char>,
    fraction: Vec<char>,
}

fn number_format_decimal(text: &str) -> NumberDecimal {
    let characters: Vec<char> = text.chars().collect();
    let mut whole: Vec<char> = Vec::new();
    let mut fraction: Vec<char> = Vec::new();
    let mut special: i32 = 0;
    if text == "NaN" {
        special = 1;
    } else if text == "Infinity" {
        special = 2;
    } else if text == "-Infinity" {
        special = 3;
    };
    let mut negative = false;
    let mut point = false;
    let mut index: usize = 0;
    while special == 0 && index < characters.len() {
        let current = characters[index];
        if current == '-' {
            negative = true;
        } else if current == '.' {
            point = true;
        } else if point {
            fraction.push(current);
        } else {
            whole.push(current);
        };
        index += 1;
    }
    NumberDecimal {
        special: special,
        negative: negative,
        whole: whole,
        fraction: fraction,
    }
}

// numeric_round to scale digits (halves away from zero) followed by numeric_out, which prints no
// sign for a zero result; with ties_even it is printf's %.*f on an exact binary value instead,
// which keeps the sign of a negative value that rounds to zero.
fn number_format_decimal_round(
    value: &NumberDecimal,
    scale: i32,
    ties_even: bool,
) -> NumberDecimal {
    let mut digits: Vec<char> = Vec::new();
    let mut index: usize = 0;
    while index < value.whole.len() {
        digits.push(value.whole[index]);
        index += 1;
    }
    let mut kept: i32 = 0;
    index = 0;
    while kept < scale {
        if index < value.fraction.len() {
            digits.push(value.fraction[index]);
        } else {
            digits.push('0');
        };
        index += 1;
        kept = kept + 1;
    }
    let mut up = false;
    if index < value.fraction.len() {
        up = (value.fraction[index] as i32) >= 53;
        if ties_even && value.fraction[index] == '5' {
            let mut later = index + 1;
            let mut beyond = false;
            while later < value.fraction.len() {
                if value.fraction[later] != '0' {
                    beyond = true;
                };
                later += 1;
            }
            if beyond == false {
                let mut previous = '0';
                if digits.len() > 0 {
                    previous = digits[digits.len() - 1];
                };
                up = previous == '1'
                    || previous == '3'
                    || previous == '5'
                    || previous == '7'
                    || previous == '9';
            };
        };
    };
    let mut overflow = false;
    if up {
        let mut carry = true;
        let mut slot = digits.len();
        while carry && slot > 0 {
            slot = slot - 1;
            let digit = digits[slot];
            if digit == '9' {
                digits[slot] = '0';
            } else {
                digits[slot] = char::from_u32(((digit as i32) + 1) as u32).unwrap_or('0');
                carry = false;
            };
        }
        overflow = carry;
    };
    let wide = (digits.len() as i32) - scale;
    let mut whole: Vec<char> = Vec::new();
    if overflow {
        whole.push('1');
    };
    let mut position: i32 = 0;
    let mut slot: usize = 0;
    while position < wide {
        let digit = digits[slot];
        if whole.len() > 0 || digit != '0' {
            whole.push(digit);
        };
        slot += 1;
        position = position + 1;
    }
    if whole.len() == 0 {
        whole.push('0');
    };
    let mut fraction: Vec<char> = Vec::new();
    let mut zero = whole.len() == 1 && whole[0] == '0';
    while slot < digits.len() {
        if digits[slot] != '0' {
            zero = false;
        };
        fraction.push(digits[slot]);
        slot += 1;
    }
    NumberDecimal {
        special: 0,
        negative: value.negative && (zero == false || ties_even),
        whole: whole,
        fraction: fraction,
    }
}

// Multiplying by a power of ten shifts the decimal point.
fn number_format_decimal_shift(value: &NumberDecimal, places: i32) -> NumberDecimal {
    let mut whole: Vec<char> = Vec::new();
    let mut index: usize = 0;
    while index < value.whole.len() {
        whole.push(value.whole[index]);
        index += 1;
    }
    let mut moved: i32 = 0;
    index = 0;
    while moved < places {
        if index < value.fraction.len() {
            whole.push(value.fraction[index]);
        } else {
            whole.push('0');
        };
        index += 1;
        moved = moved + 1;
    }
    let mut fraction: Vec<char> = Vec::new();
    while index < value.fraction.len() {
        fraction.push(value.fraction[index]);
        index += 1;
    }
    NumberDecimal {
        special: value.special,
        negative: value.negative,
        whole: whole,
        fraction: fraction,
    }
}

fn number_format_numeric(
    text: &str,
    template: &str,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if template == "" {
        return make_text_value("");
    };
    let format = number_format_prepare(template, numeric_c, monetary_c);
    let state = number_format_template_state(&format);
    if state != TextValue::NonNull {
        return state;
    };
    let value = number_format_decimal(text);
    if format.roman {
        // numeric_int4_opt_error rounds halves away from zero; NaN, infinities and int32
        // overflow become PG_INT32_MAX, which prints as the overflow marker.
        let mut roman: i64 = 2147483647i64;
        if value.special == 0 {
            let rounded = number_format_decimal_round(&value, 0, false);
            if rounded.whole.len() <= 10 {
                let mut magnitude: i64 = 0i64;
                let mut index: usize = 0;
                while index < rounded.whole.len() {
                    magnitude = magnitude * 10i64 + ((rounded.whole[index] as i32) - 48) as i64;
                    index += 1;
                }
                if rounded.negative {
                    magnitude = 0i64 - magnitude;
                };
                if magnitude <= 2147483647i64 && magnitude >= -2147483648i64 {
                    roman = magnitude;
                };
            };
        };
        let number = NumberDigits {
            characters: number_format_roman(roman as i32),
        };
        return number_format_process(&format, format.pre, format.post, &number, 0, '\0');
    };
    if format.eeee {
        if value.special != 0 {
            let mut field: Vec<char> = Vec::new();
            let mut count: i32 = 0;
            while count < format.pre + format.post + 6 {
                if count == 0 {
                    field.push(' ');
                } else if count == format.pre + 1 {
                    field.push('.');
                } else {
                    field.push('#');
                };
                count = count + 1;
            }
            let number = NumberDigits { characters: field };
            return number_format_process(&format, format.pre, format.post, &number, 0, '+');
        };
        let mut digits: Vec<char> = Vec::new();
        let mut index: usize = 0;
        while index < value.whole.len() {
            digits.push(value.whole[index]);
            index += 1;
        }
        index = 0;
        while index < value.fraction.len() {
            digits.push(value.fraction[index]);
            index += 1;
        }
        let exponent = (value.whole.len() as i32) - 1;
        let source = NumberDigits { characters: digits };
        let number = NumberDigits {
            characters: number_format_scientific(
                &source,
                exponent,
                value.negative,
                format.post,
                false,
            ),
        };
        return number_format_process(&format, format.pre, format.post, &number, 0, '+');
    };
    let mut pre = format.pre;
    let mut places: i32 = 0;
    if format.multiplied {
        places = format.multi;
        pre = pre + format.multi;
    };
    let scaled = number_format_decimal_shift(&value, places);
    let rounded = number_format_decimal_round(&scaled, format.post, false);
    let mut characters: Vec<char> = Vec::new();
    let mut sign = '+';
    let mut whole_length: i32 = 0;
    if value.special != 0 {
        let mut choice: usize = 0;
        if value.special > 1 {
            choice = 1;
        };
        if value.special == 3 {
            sign = '-';
        };
        let spelled_text = NUMBER_SPECIAL_SPELLINGS[choice];
        let spelled: Vec<char> = spelled_text.chars().collect();
        let mut index: usize = 0;
        while index < spelled.len() {
            characters.push(spelled[index]);
            index += 1;
        }
        whole_length = spelled.len() as i32;
    } else {
        if rounded.negative {
            sign = '-';
        };
        let mut index: usize = 0;
        while index < rounded.whole.len() {
            characters.push(rounded.whole[index]);
            index += 1;
        }
        whole_length = rounded.whole.len() as i32;
        if rounded.fraction.len() > 0 {
            characters.push('.');
            index = 0;
            while index < rounded.fraction.len() {
                characters.push(rounded.fraction[index]);
                index += 1;
            }
        };
    };
    if whole_length > pre {
        let overflow = NumberDigits {
            characters: number_format_overflow(pre, format.post),
        };
        return number_format_process(&format, pre, format.post, &overflow, 0, sign);
    };
    let number = NumberDigits {
        characters: characters,
    };
    number_format_process(&format, pre, format.post, &number, pre - whole_length, sign)
}

pub fn sql__pg_catalog__to_char__hftr(
    input: NumericValue,
    template: TextValue,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if let NumericValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == NumericValue::Unknown
        || template == TextValue::Unknown
        || template == TextValue::NonNull
    {
        return TextValue::Unknown;
    };
    if input == NumericValue::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if let NumericValue::Value(text) = input {
        if let TextValue::Value(format) = template {
            return number_format_numeric(text.as_str(), format.as_str(), numeric_c, monetary_c);
        };
    };
    TextValue::Unknown
}

// The exact decimal expansion of a float magnitude, from the same decomposition float_output
// uses; the caller handles NaN and infinities.
fn number_format_float_decimal(magnitude: i64, single: bool) -> NumberDecimal {
    let mut unit = 4503599627370496i64;
    let mut bias: i32 = 1023;
    let mut width: i32 = 52;
    if single {
        unit = 8388608i64;
        bias = 127;
        width = 23;
    };
    let mut whole: Vec<char> = Vec::new();
    let mut fraction: Vec<char> = Vec::new();
    if magnitude == 0i64 {
        whole.push('0');
        return NumberDecimal {
            special: 0,
            negative: false,
            whole: whole,
            fraction: fraction,
        };
    };
    let exponent = (magnitude / unit) as i32;
    let mantissa = magnitude % unit;
    let mut coefficient = mantissa;
    let mut power = 1 - bias - width;
    if exponent > 0 {
        coefficient = coefficient + unit;
        power = exponent - bias - width;
    };
    let exact = float_output_dyadic(coefficient, power);
    let digits: Vec<char> = exact.digits.chars().collect();
    let weight = exact.weight;
    if weight < 0 {
        whole.push('0');
        let mut zeros: i32 = weight + 1;
        while zeros < 0 {
            fraction.push('0');
            zeros = zeros + 1;
        }
        let mut index: usize = 0;
        while index < digits.len() {
            fraction.push(digits[index]);
            index += 1;
        }
    } else {
        let mut position: i32 = 0;
        let mut index: usize = 0;
        while position <= weight {
            if index < digits.len() {
                whole.push(digits[index]);
            } else {
                whole.push('0');
            };
            index += 1;
            position = position + 1;
        }
        while index < digits.len() {
            fraction.push(digits[index]);
            index += 1;
        }
    };
    NumberDecimal {
        special: 0,
        negative: false,
        whole: whole,
        fraction: fraction,
    }
}

fn number_format_float_field(format: &NumberFormat) -> TextValue {
    let mut field: Vec<char> = Vec::new();
    let mut count: i32 = 0;
    while count < format.pre + format.post + 6 {
        if count == 0 {
            field.push(' ');
        } else if count == format.pre + 1 {
            field.push('.');
        } else {
            field.push('#');
        };
        count = count + 1;
    }
    let number = NumberDigits { characters: field };
    number_format_process(format, format.pre, format.post, &number, 0, '+')
}

// float4_to_char and float8_to_char. bits holds the float's IEEE pattern (float4 widened with
// its sign). PostgreSQL prints with its own snprintf, which spells NaN and the infinities itself
// and otherwise rounds the exact binary value to nearest with ties to even.
fn number_format_float(
    bits: i64,
    single: bool,
    template: &str,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if template == "" {
        return make_text_value("");
    };
    let format = number_format_prepare(template, numeric_c, monetary_c);
    let state = number_format_template_state(&format);
    if state != TextValue::NonNull {
        return state;
    };
    let mut value = float8_number(bits);
    if single {
        value = float4_number(bits as i32);
    };
    let nan = value != value;
    let infinite = nan == false && (value - value) != 0.0f64;
    if format.roman {
        let mut roman: i32 = 2147483647;
        if nan == false {
            let rounded = float8_rounded(make_float8_value(value), 3);
            if let Float8Value::Value(rounded_bits) = rounded {
                let whole = float8_number(rounded_bits);
                if whole >= -2147483648.0f64 && whole < 2147483648.0f64 {
                    roman = whole as i32;
                };
            };
        };
        let number = NumberDigits {
            characters: number_format_roman(roman),
        };
        return number_format_process(&format, format.pre, format.post, &number, 0, '\0');
    };
    let mut digits_limit: i32 = 15;
    if single {
        digits_limit = 6;
    };
    if format.eeee {
        if nan || infinite {
            return number_format_float_field(&format);
        };
        let negative = bits < 0i64;
        let mut magnitude = bits;
        if negative {
            magnitude = bits - (0i64 - 9223372036854775807i64 - 1i64);
            if single {
                magnitude = bits + 2147483648i64;
            };
        };
        let exact = number_format_float_decimal(magnitude, single);
        let mut collected: Vec<char> = Vec::new();
        let mut index: usize = 0;
        while index < exact.whole.len() {
            collected.push(exact.whole[index]);
            index += 1;
        }
        index = 0;
        while index < exact.fraction.len() {
            collected.push(exact.fraction[index]);
            index += 1;
        }
        let source = NumberDigits {
            characters: collected,
        };
        let number = NumberDigits {
            characters: number_format_scientific(
                &source,
                (exact.whole.len() as i32) - 1,
                negative,
                format.post,
                true,
            ),
        };
        return number_format_process(&format, format.pre, format.post, &number, 0, '+');
    };
    let mut pre = format.pre;
    let mut scaled = value;
    if format.multiplied {
        // pow(10, multi) is exact only through 10^22; float4 rounds it and the product to
        // single precision, as its float arithmetic does.
        if format.multi > 22 {
            return TextValue::Unknown;
        };
        let mut factor = 1.0f64;
        let mut count: i32 = 0;
        while count < format.multi {
            factor = factor * 10.0f64;
            count = count + 1;
        }
        if single {
            let narrow = float4_number((factor as f32).to_bits() as i32);
            let product = value * narrow;
            scaled = float4_number((product as f32).to_bits() as i32);
        } else {
            scaled = value * factor;
        };
        pre = pre + format.multi;
    };
    let mut post = format.post;
    let scaled_bits = scaled.to_bits() as i64;
    let negative = scaled_bits < 0i64 && scaled == scaled;
    let mut sign = '+';
    if negative {
        sign = '-';
    };
    let mut characters: Vec<char> = Vec::new();
    let mut whole_length: i32 = 0;
    if scaled != scaled || (scaled - scaled) != 0.0f64 {
        let mut choice: usize = 0;
        if scaled == scaled {
            choice = 1;
        };
        let spelled_text = NUMBER_SPECIAL_SPELLINGS[choice];
        let spelled: Vec<char> = spelled_text.chars().collect();
        whole_length = spelled.len() as i32;
        if whole_length >= digits_limit {
            post = 0;
        } else if whole_length + post > digits_limit {
            post = digits_limit - whole_length;
        };
        let mut index: usize = 0;
        while index < spelled.len() {
            characters.push(spelled[index]);
            index += 1;
        }
    } else {
        let mut magnitude = scaled_bits;
        if scaled_bits < 0i64 {
            magnitude = scaled_bits - (0i64 - 9223372036854775807i64 - 1i64);
        };
        let exact = number_format_float_decimal(magnitude, false);
        let integral = number_format_decimal_round(&exact, 0, true);
        let integral_length = integral.whole.len() as i32;
        if integral_length >= digits_limit {
            post = 0;
        } else if integral_length + post > digits_limit {
            post = digits_limit - integral_length;
        };
        let rounded = number_format_decimal_round(&exact, post, true);
        let mut index: usize = 0;
        while index < rounded.whole.len() {
            characters.push(rounded.whole[index]);
            index += 1;
        }
        whole_length = rounded.whole.len() as i32;
        if rounded.fraction.len() > 0 {
            characters.push('.');
            index = 0;
            while index < rounded.fraction.len() {
                characters.push(rounded.fraction[index]);
                index += 1;
            }
        };
    };
    if whole_length > pre {
        let overflow = NumberDigits {
            characters: number_format_overflow(pre, post),
        };
        return number_format_process(&format, pre, post, &overflow, 0, sign);
    };
    let number = NumberDigits {
        characters: characters,
    };
    number_format_process(&format, pre, post, &number, pre - whole_length, sign)
}

pub fn sql__pg_catalog__to_char__b68b(
    input: Float8Value,
    template: TextValue,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if let Float8Value::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == Float8Value::Unknown
        || template == TextValue::Unknown
        || template == TextValue::NonNull
    {
        return TextValue::Unknown;
    };
    if input == Float8Value::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    let known = float8_semantic(input);
    if let Float8Value::Value(bits) = known {
        if let TextValue::Value(format) = template {
            return number_format_float(bits, false, format.as_str(), numeric_c, monetary_c);
        };
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__to_char__1rcw(
    input: Float4Value,
    template: TextValue,
    numeric_c: bool,
    monetary_c: bool,
) -> TextValue {
    if let Float4Value::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == Float4Value::Unknown
        || template == TextValue::Unknown
        || template == TextValue::NonNull
    {
        return TextValue::Unknown;
    };
    if input == Float4Value::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if input == Float4Value::UnspecifiedNan {
        if let TextValue::Value(format) = template {
            return number_format_float(
                2143289344i64,
                true,
                format.as_str(),
                numeric_c,
                monetary_c,
            );
        };
    };
    if let Float4Value::Value(bits) = input {
        if let TextValue::Value(format) = template {
            return number_format_float(bits as i64, true, format.as_str(), numeric_c, monetary_c);
        };
    };
    TextValue::Unknown
}
