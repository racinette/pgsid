const MAX_CAPTURE_WORK: usize = 2000000;

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct MatchSpan {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum MatchOutcome {
    Found(MatchSpan),
    NoMatch,
    Uncertain,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum WorkOutcome {
    Ready(usize),
    Uncertain,
}

pub fn charge_work(current: usize, amount: usize) -> WorkOutcome {
    if current > MAX_CAPTURE_WORK {
        return WorkOutcome::Uncertain;
    }
    if amount > MAX_CAPTURE_WORK - current {
        return WorkOutcome::Uncertain;
    }
    WorkOutcome::Ready(current + amount)
}

pub fn find_literal(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
) -> MatchOutcome {
    let needle: Vec<char> = pattern.chars().collect();
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut start = from;
    while start <= haystack.len() {
        let mut offset = 0;
        while offset < needle.len() {
            if offset >= haystack.len() - start {
                break;
            }
            let actual = haystack[start + offset];
            let expected = needle[offset];
            if actual != expected
                && (case_sensitive || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
            {
                break;
            }
            offset += 1;
        }
        if offset == needle.len() {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: start + offset,
            });
        }
        if start == haystack.len() {
            break;
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

pub fn find_any_character(subject: &str, from: usize, dot_crosses_newline: bool) -> MatchOutcome {
    let haystack: Vec<char> = subject.chars().collect();
    let mut start = from;
    while start < haystack.len() {
        if dot_crosses_newline || haystack[start] != '\n' {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: start + 1,
            });
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

pub fn find_simple_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
) -> MatchOutcome {
    let atoms: Vec<char> = pattern.chars().collect();
    let haystack: Vec<char> = subject.chars().collect();
    let mut position = 0;
    while position < atoms.len() {
        let atom = atoms[position];
        if atom == '^'
            || atom == '$'
            || atom == '['
            || atom == ']'
            || atom == '('
            || atom == ')'
            || atom == '{'
            || atom == '}'
            || atom == '*'
            || atom == '+'
            || atom == '?'
            || atom == '|'
            || atom == '\\'
        {
            return MatchOutcome::Uncertain;
        }
        position += 1;
    }
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut start = from;
    while start <= haystack.len() {
        let mut offset = 0;
        while offset < atoms.len() {
            if offset >= haystack.len() - start {
                break;
            }
            let actual = haystack[start + offset];
            let atom = atoms[offset];
            if atom == '.' && actual == '\n' && dot_crosses_newline == false {
                break;
            }
            if atom != '.'
                && actual != atom
                && (case_sensitive || actual.to_ascii_lowercase() != atom.to_ascii_lowercase())
            {
                break;
            }
            offset += 1;
        }
        if offset == atoms.len() {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: start + offset,
            });
        }
        if start == haystack.len() {
            break;
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}
