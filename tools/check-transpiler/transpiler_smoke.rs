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

#[derive(Clone, Copy)]
pub struct BorrowedText<'a> {
    pub value: &'a str,
}

pub fn wrap_text(value: &str) -> BorrowedText<'_> {
    BorrowedText { value }
}

pub fn same_text(left: BorrowedText, right: &str) -> bool {
    left.value == right
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum WrappedText<'a> {
    Missing,
    Value(&'a str),
}

pub fn make_wrapped_text(value: &str) -> WrappedText<'_> {
    WrappedText::Value(value)
}

pub fn same_wrapped_text(value: WrappedText, expected: &str) -> bool {
    if let WrappedText::Value(text) = value {
        return text == expected;
    }
    false
}

pub fn wrapped_text_is_value(value: WrappedText) -> bool {
    if let WrappedText::Value(_text) = value {
        return true;
    }
    false
}

#[derive(Clone, Copy)]
pub enum WrappedSpan {
    Missing,
    Value(Span),
}

pub fn make_wrapped_span(value: Span) -> WrappedSpan {
    WrappedSpan::Value(value)
}

pub fn shift_wrapped_span(value: WrappedSpan, offset: usize) -> usize {
    if let WrappedSpan::Value(span) = value {
        let mut changed = span;
        changed.start += offset;
        return changed.start;
    }
    0
}

pub struct Token {
    value: usize,
}

pub fn make_token(value: usize) -> Token {
    Token { value }
}

pub fn token_value(token: &Token) -> usize {
    token.value
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

pub fn span_start(span: &Span) -> usize {
    span.start
}

pub fn borrowed_span_start(span: Span) -> usize {
    span_start(&span)
}

pub fn echo_bool(value: bool) -> bool {
    value
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

pub fn forwarded_chars(characters: Vec<char>) -> Vec<char> {
    echo_chars(characters)
}

pub fn forwarded_span(span: Span, offset: usize) -> Span {
    shift_span(span, offset)
}

pub fn char_stack(value: char) -> Vec<char> {
    let mut characters: Vec<char> = Vec::new();
    characters.push(value);
    characters[0] = 'b';
    characters
}

pub fn span_stack(value: Span) -> Vec<Span> {
    let mut spans: Vec<Span> = Vec::new();
    spans.push(value);
    spans[0] = Span {
        start: value.start + 1,
        end: value.end,
    };
    spans
}

pub fn shift_span_stack(mut spans: Vec<Span>, position: usize, offset: usize) -> Vec<Span> {
    let previous = spans[position];
    spans[position] = Span {
        start: previous.start + offset,
        end: previous.end,
    };
    spans
}

pub fn span_stack_at(spans: Vec<Span>, position: usize) -> Span {
    spans[position]
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

pub fn signed_add(left: i32, right: i32) -> i32 {
    left + right
}

pub fn signed_subtract(left: i32, right: i32) -> i32 {
    left - right
}

pub fn signed_negate(value: i32) -> i32 {
    -value
}

pub fn signed_minimum() -> i32 {
    -2147483647 - 1
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

pub fn index_from_codepoint(value: char) -> usize {
    (value as u32) as usize
}

pub fn index_from_u32(value: u32) -> usize {
    value as usize
}

pub fn choose_position(value: usize, limit: usize) -> usize {
    let mut selected = 0;
    if value < limit {
        selected += value;
    } else {
        selected += limit;
    }
    selected
}

pub fn choose_with_returns(value: usize, limit: usize) -> usize {
    if value < limit {
        return value;
    } else {
        return limit;
    }
}

pub fn classify_position(value: usize, limit: usize) -> usize {
    let mut category = 0;
    if value < limit {
        category += 1;
    } else if value == limit {
        category += 2;
    } else {
        category += 3;
    }
    category
}

const POSITION_LIMIT: usize = 3;

pub fn below_default_limit(value: usize) -> bool {
    value < POSITION_LIMIT
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct NamedSpan {
    pub from_position: usize,
}

pub fn named_position(value: NamedSpan) -> usize {
    value.from_position
}

pub fn stack_probe(seed: usize) -> usize {
    let mut work: Vec<usize> = Vec::new();
    work.push(seed);
    work.push(seed + 1);
    let mut cursor = work.len();
    cursor = cursor - 1;
    let mut value = work[cursor];
    value = value + 2;
    work[cursor] = value;
    work[cursor]
}

pub fn append_position(mut positions: Vec<usize>, next: usize) -> usize {
    positions.push(next);
    positions.len()
}

pub fn overwrite_position(mut positions: Vec<usize>, at: usize, next: usize) -> usize {
    positions[at] = next;
    positions[at]
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ConditionMode {
    Run,
    Stop,
}

pub fn select_condition_mode(mode: ConditionMode, stop: bool) -> ConditionMode {
    let mut selected = mode;
    if stop {
        selected = ConditionMode::Stop;
    }
    selected
}

pub fn matches_literal(value: &str) -> bool {
    value == "a\"b\\c\n\u{1f600}\0"
}

pub fn matches_empty(value: &str) -> bool {
    value == ""
}

pub fn condition_literals(mode: ConditionMode) -> usize {
    let mut visits = 0;
    if mode == ConditionMode::Stop {
        return visits;
    }
    while ConditionMode::Run == mode {
        if (Span {
            start: visits,
            end: 1,
        }) == (Span { start: 0, end: 1 })
        {
            visits += 1;
        }
        break;
    }
    visits
}
