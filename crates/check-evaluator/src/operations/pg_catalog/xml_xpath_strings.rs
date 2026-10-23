fn xpath_string_find(input: &str, needle: &str) -> i32 {
    let source: Vec<char> = input.chars().collect(); let pattern: Vec<char> = needle.chars().collect();
    let mut position: usize = 0;
    while position+pattern.len() <= source.len() {
        let mut index: usize = 0; let mut matched = true;
        while index < pattern.len() { if source[position+index] != pattern[index] { matched = false; }; index += 1; }
        if matched { return position as i32; }; position += 1;
    }
    -1
}

fn xpath_string_slice(input: &str, start: usize, end: usize) -> String {
    let source: Vec<char> = input.chars().collect(); let mut output = String::new(); let mut position = start;
    while position < end && position < source.len() { output.push(source[position]); position += 1; } output
}

fn xpath_string_normalize(input: &str) -> String {
    let source: Vec<char> = input.chars().collect(); let mut output = String::new();
    let mut written = false; let mut pending = false; let mut index: usize = 0;
    while index < source.len() {
        let value = source[index];
        if xml_space(value) { pending = written; }
        else { if pending { output.push(' '); }; output.push(value); written = true; pending = false; };
        index += 1;
    }
    output
}

fn xpath_string_translate(input: &str, from: &str, to: &str) -> String {
    let source: Vec<char> = input.chars().collect(); let old: Vec<char> = from.chars().collect(); let replacement: Vec<char> = to.chars().collect();
    let mut output = String::new(); let mut index: usize = 0;
    while index < source.len() {
        let value = source[index]; let mut position: usize = 0;
        while position < old.len() && old[position] != value { position += 1; }
        if position == old.len() { output.push(value); }
        else if position < replacement.len() { output.push(replacement[position]); };
        index += 1;
    }
    output
}

fn xpath_string_substring(input: &str, start: f64, length: f64, bounded: bool) -> String {
    let begin = xpath_number_round(start); let end = begin+xpath_number_round(length);
    let source: Vec<char> = input.chars().collect(); let mut output = String::new(); let mut index: usize = 0;
    while index < source.len() {
        let position = (index as i32) as f64+1.0f64;
        if position >= begin && (bounded == false || position < end) { output.push(source[index]); };
        index += 1;
    }
    output
}
