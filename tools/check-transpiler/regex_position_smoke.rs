pub fn checked_position(value: i32, fallback: usize) -> usize {
    usize::try_from(value).unwrap_or(fallback)
}

pub fn match_count(value: usize) -> i32 {
    value as i32
}

pub fn eager_fallback(value: i32, divisor: i32) -> usize {
    let denominator: i32 = divisor;
    let fallback: usize = usize::try_from(1 / denominator).unwrap_or(0);
    usize::try_from(value).unwrap_or(fallback)
}

enum RegexCountState {
    Count(usize),
    InvalidPattern,
    Uncertain,
}
fn regex_count_state_value(mode: i32) -> RegexCountState {
    if mode < 0 {
        return RegexCountState::InvalidPattern;
    }
    if mode == 0 {
        return RegexCountState::Uncertain;
    }
    RegexCountState::Count(usize::try_from(mode).unwrap_or(0))
}
pub fn regex_count_state(mode: i32) -> i32 {
    let outcome = regex_count_state_value(mode);
    if let RegexCountState::InvalidPattern = outcome {
        return -1;
    }
    if let RegexCountState::Count(value) = outcome {
        return value as i32;
    }
    0
}

#[derive(Clone, Copy)]
struct OwnedSpan {
    start: usize,
    end: usize,
}
struct OwnedBatch {
    groups: Vec<OwnedSpan>,
}
enum OwnedSearch {
    Matches(OwnedBatch),
    Invalid,
}
pub fn owned_spans_snapshot() -> bool {
    let mut groups: Vec<OwnedSpan> = Vec::new();
    groups.push(OwnedSpan { start: 1, end: 2 });
    let original = groups[0];
    let batch = OwnedBatch { groups: groups };
    let selected = OwnedSearch::Matches(batch);
    if let OwnedSearch::Matches(selected_batch) = selected {
        let mut edited = selected_batch.groups;
        edited[0] = OwnedSpan { start: 7, end: 8 };
        return original.start == 1 && original.end == 2 && edited[0].start == 7;
    }
    false
}
