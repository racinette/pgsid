#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

pub struct Snapshot {
    pub before: Span,
    pub after: Span,
}

pub struct CharBag {
    pub characters: Vec<char>,
}

pub fn shift_span(span: Span, offset: usize) -> Span {
    let mut shifted = span;
    shifted.start += offset;
    shifted.end += offset;
    shifted
}

pub fn same_span(left: Span, right: Span) -> bool {
    left == right
}

pub fn shift_parameter(mut span: Span, offset: usize) -> Span {
    span.start += offset;
    span
}

pub fn snapshot_before_shift(mut span: Span, offset: usize) -> Snapshot {
    let snapshot = Snapshot {
        before: span,
        after: span,
    };
    span.start += offset;
    Snapshot {
        before: snapshot.before,
        after: span,
    }
}

pub fn echo_chars(characters: Vec<char>) -> Vec<char> {
    characters
}

pub fn echo_bag(bag: CharBag) -> CharBag {
    bag
}

pub fn char_at(characters: Vec<char>, position: usize) -> char {
    characters[position]
}

pub fn add_positions(left: usize, right: usize) -> usize {
    left + right
}

pub fn subtract_positions(left: usize, right: usize) -> usize {
    left - right
}

pub fn is_before_first(position: i32) -> bool {
    position < 1
}

pub fn char_count(input: &str) -> usize {
    let characters: Vec<char> = input.chars().collect();
    characters.len()
}

pub fn char_codepoint(value: char) -> u32 {
    value as u32
}
