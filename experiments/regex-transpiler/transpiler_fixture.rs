const MAX_PATTERN_SCALARS: usize = 1024;
const MAX_SUBJECT_SCALARS: usize = 4096;

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Found(Span),
    NoMatch,
    Uncertain,
}

pub fn literal_search(pattern: &str, subject: &str) -> Outcome {
    let pattern_chars: Vec<char> = pattern.chars().collect();
    let subject_chars: Vec<char> = subject.chars().collect();
    if pattern_chars.len() > MAX_PATTERN_SCALARS || subject_chars.len() > MAX_SUBJECT_SCALARS {
        return Outcome::Uncertain;
    }

    let mut start = 0;
    while start + pattern_chars.len() <= subject_chars.len() {
        let mut offset = 0;
        while offset < pattern_chars.len() {
            if subject_chars[start + offset] != pattern_chars[offset] {
                break;
            }
            offset += 1;
        }
        if offset == pattern_chars.len() {
            return Outcome::Found(Span {
                start,
                end: start + offset,
            });
        }
        start += 1;
    }
    Outcome::NoMatch
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
