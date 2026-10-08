// Portions Copyright (c) 1996-2025, PostgreSQL Global Development Group.
const UNICODE_ALLOCATION_ERROR: u32 = 56966976;

fn unicode_middle(low: usize, high: usize) -> usize {
    let distance: i32 = (high - low) as i32;
    let half: i32 = distance / 2;
    low + usize::try_from(half).unwrap_or(0)
}

fn unicode_decomposition_index(code: i32) -> usize {
    let mut low: usize = 0;
    let mut high = UNICODE_DECOMP_POINTS.len();
    while low < high {
        let middle = unicode_middle(low, high);
        let candidate = UNICODE_DECOMP_POINTS[middle];
        if candidate < code {
            low = middle + 1;
        } else if candidate > code {
            high = middle;
        } else {
            return middle;
        };
    }
    UNICODE_DECOMP_POINTS.len()
}

fn unicode_combining_class(code: i32) -> i32 {
    let index = unicode_decomposition_index(code);
    if index == UNICODE_DECOMP_POINTS.len() {
        return 0;
    }
    let packed = UNICODE_DECOMP_PROPERTIES[index] as usize;
    let properties: i32 = packed as i32;
    let combining_class = properties / 256;
    combining_class
}

fn unicode_scalar(code: i32) -> char {
    char::from_u32(code as u32).unwrap_or(' ')
}

fn unicode_decomposition(code: i32, compat: bool) -> Vec<char> {
    let mut output: Vec<char> = Vec::new();
    if code >= 44032 && code < 55204 {
        let syllable = code - 44032;
        output.push(unicode_scalar(4352 + syllable / 588));
        output.push(unicode_scalar(4449 + syllable % 588 / 28));
        if syllable % 28 != 0 {
            output.push(unicode_scalar(4519 + syllable % 28));
        }
        return output;
    }
    let index = unicode_decomposition_index(code);
    if index == UNICODE_DECOMP_POINTS.len() {
        output.push(unicode_scalar(code));
        return output;
    }
    let packed = UNICODE_DECOMP_PROPERTIES[index] as usize;
    let properties: i32 = packed as i32;
    let flags = properties % 256;
    let size = usize::try_from(flags % 32).unwrap_or(0);
    if size == 0 || (compat == false && flags / 32 % 2 == 1) {
        output.push(unicode_scalar(code));
        return output;
    }
    let offset = UNICODE_DECOMP_OFFSETS[index] as usize;
    let mut item: usize = 0;
    while item < size {
        let mut child: i32 = offset as i32;
        if flags / 64 % 2 == 0 {
            child = UNICODE_DECOMP_CODES[offset + item];
        }
        let children = unicode_decomposition(child, compat);
        let mut position: usize = 0;
        while position < children.len() {
            output.push(children[position]);
            position += 1;
        }
        item += 1;
    }
    output
}

fn unicode_composition(first: i32, second: i32) -> i32 {
    if first >= 4352 && first < 4371 && second >= 4449 && second < 4470 {
        return 44032 + ((first - 4352) * 21 + second - 4449) * 28;
    }
    if first >= 44032
        && first < 55204
        && (first - 44032) % 28 == 0
        && second > 4519
        && second < 4547
    {
        return first + second - 4519;
    }
    let left: i64 = first as i64;
    let right: i64 = second as i64;
    let key = left * 2097152i64 + right;
    let mut low: usize = 0;
    let mut high = UNICODE_COMPOSE_KEYS.len();
    while low < high {
        let middle = unicode_middle(low, high);
        let candidate = UNICODE_COMPOSE_KEYS[middle];
        if candidate < key {
            low = middle + 1;
        } else if candidate > key {
            high = middle;
        } else {
            return UNICODE_COMPOSE_POINTS[middle];
        };
    }
    0
}

pub fn unicode_normalization_form(value: &str) -> i32 {
    let characters: Vec<char> = value.chars().collect();
    if characters.len() < 3 || characters.len() > 4 {
        return 0;
    }
    if (characters[0] != 'N' && characters[0] != 'n')
        || (characters[1] != 'F' && characters[1] != 'f')
    {
        return 0;
    }
    let mut position: usize = 2;
    let mut form: i32 = 0;
    if characters.len() == 4 {
        if characters[2] != 'K' && characters[2] != 'k' {
            return 0;
        }
        position = 3;
        form = 2;
    }
    if characters[position] == 'C' || characters[position] == 'c' {
        return form + 1;
    }
    if characters[position] == 'D' || characters[position] == 'd' {
        return form + 2;
    }
    0
}

pub fn unicode_allocation_size(count: i64) -> BoolValue {
    if count < 0i64 || count > 268435454i64 {
        return BoolValue::Error(make_sql_error(UNICODE_ALLOCATION_ERROR));
    }
    BoolValue::Value(true)
}

pub fn unicode_normalize_text(value: String, form: i32) -> TextValue {
    let characters: Vec<char> = value.chars().collect();
    let length: i32 = characters.len() as i32;
    let size: i64 = length as i64;
    let input_size = unicode_allocation_size(size);
    if let BoolValue::Error(error) = input_size {
        return TextValue::Error(error);
    }
    let compat = form == 3 || form == 4;
    let mut count: i64 = 0i64;
    let mut index: usize = 0;
    while index < characters.len() {
        let parts = unicode_decomposition(characters[index] as i32, compat);
        let part_length: i32 = parts.len() as i32;
        let part_size: i64 = part_length as i64;
        count = count + part_size;
        let expanded_size = unicode_allocation_size(count);
        if let BoolValue::Error(error) = expanded_size {
            return TextValue::Error(error);
        }
        index += 1;
    }
    let mut decomposed: Vec<char> = Vec::new();
    index = 0;
    while index < characters.len() {
        let parts = unicode_decomposition(characters[index] as i32, compat);
        let mut position: usize = 0;
        while position < parts.len() {
            decomposed.push(parts[position]);
            position += 1;
        }
        index += 1;
    }
    index = 1;
    while index < decomposed.len() {
        let previous = unicode_combining_class(decomposed[index - 1] as i32);
        let next = unicode_combining_class(decomposed[index] as i32);
        if previous != 0 && next != 0 && previous > next {
            let saved = decomposed[index - 1];
            decomposed[index - 1] = decomposed[index];
            decomposed[index] = saved;
            if index > 1 {
                index = index - 1;
            }
        } else {
            index += 1;
        };
    }
    let mut output = String::new();
    if form == 2 || form == 4 || decomposed.len() == 0 {
        index = 0;
        while index < decomposed.len() {
            output.push(decomposed[index]);
            index += 1;
        }
        return TextValue::Value(output);
    }
    let mut composed: Vec<char> = Vec::new();
    let mut starter: i32 = decomposed[0] as i32;
    let mut starter_position: usize = 0;
    let mut previous_class: i32 = -1;
    composed.push(unicode_scalar(starter));
    index = 1;
    while index < decomposed.len() {
        let code: i32 = decomposed[index] as i32;
        let combining_class = unicode_combining_class(code);
        let mut replacement: i32 = 0;
        if previous_class < combining_class {
            replacement = unicode_composition(starter, code);
        }
        if replacement != 0 {
            composed[starter_position] = unicode_scalar(replacement);
            starter = replacement;
        } else if combining_class == 0 {
            starter_position = composed.len();
            starter = code;
            previous_class = -1;
            composed.push(unicode_scalar(code));
        } else {
            previous_class = combining_class;
            composed.push(unicode_scalar(code));
        }
        index += 1;
    }
    index = 0;
    while index < composed.len() {
        output.push(composed[index]);
        index += 1;
    }
    TextValue::Value(output)
}

fn unicode_quick_field(index: usize, form: i32) -> i32 {
    if form == 3 {
        return UNICODE_NFKC_QUICK_RANGES[index];
    }
    UNICODE_NFC_QUICK_RANGES[index]
}

fn unicode_quick_property(code: i32, form: i32) -> i32 {
    let mut low: usize = 0;
    let length: i32 = UNICODE_NFC_QUICK_RANGES.len() as i32;
    let mut high = usize::try_from(length / 3).unwrap_or(0);
    if form == 3 {
        let length: i32 = UNICODE_NFKC_QUICK_RANGES.len() as i32;
        high = usize::try_from(length / 3).unwrap_or(0);
    }
    while low < high {
        let middle = unicode_middle(low, high);
        let offset = middle + middle + middle;
        let first = unicode_quick_field(offset, form);
        let last = unicode_quick_field(offset + 1, form);
        let property = unicode_quick_field(offset + 2, form);
        if code < first {
            high = middle;
        } else if code > last {
            low = middle + 1;
        } else {
            return property;
        };
    }
    1
}

pub fn unicode_normalized_text(value: String, form: i32) -> BoolValue {
    let characters: Vec<char> = value.chars().collect();
    let length: i32 = characters.len() as i32;
    let size: i64 = length as i64;
    let input_size = unicode_allocation_size(size);
    if let BoolValue::Error(error) = input_size {
        return BoolValue::Error(error);
    }
    let mut quick: i32 = 2;
    if form == 1 || form == 3 {
        quick = 1;
        let mut previous: i32 = 0;
        let mut index: usize = 0;
        while index < characters.len() {
            let code: i32 = characters[index] as i32;
            let combining_class = unicode_combining_class(code);
            if previous > combining_class && combining_class != 0 {
                return BoolValue::Value(false);
            }
            let property = unicode_quick_property(code, form);
            if property == 0 {
                return BoolValue::Value(false);
            }
            if property == 2 {
                quick = 2;
            }
            previous = combining_class;
            index += 1;
        }
    }
    if quick == 1 {
        return BoolValue::Value(true);
    }
    let normalized = unicode_normalize_text(value.clone(), form);
    if let TextValue::Error(error) = normalized {
        return BoolValue::Error(error);
    }
    if let TextValue::Value(text) = normalized {
        return BoolValue::Value(text == value);
    }
    BoolValue::Unknown
}

pub fn unicode_text_assigned(value: String) -> bool {
    let characters: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    while index < characters.len() {
        let code: i32 = characters[index] as i32;
        let mut low: usize = 0;
        let length: i32 = UNICODE_ASSIGNED_RANGES.len() as i32;
        let mut high = usize::try_from(length / 3).unwrap_or(0);
        let mut found = false;
        while low < high {
            let middle = unicode_middle(low, high);
            let first = UNICODE_ASSIGNED_RANGES[middle + middle + middle];
            let last = UNICODE_ASSIGNED_RANGES[middle + middle + middle + 1];
            if code < first {
                high = middle;
            } else if code > last {
                low = middle + 1;
            } else {
                found = true;
                break;
            };
        }
        if found == false {
            return false;
        }
        index += 1;
    }
    true
}

pub fn unicode_data_version() -> TextValue {
    TextValue::Value(UNICODE_VERSION_LABEL[0].to_owned())
}

pub fn unicode_icu_profile(version: &str) -> TextValue {
    if version == "" {
        return TextValue::Null;
    }
    TextValue::Value(version.to_owned())
}

pub fn unicode_icu_data_version() -> TextValue {
    unicode_icu_profile(UNICODE_ICU_VERSION_LABEL[0])
}
