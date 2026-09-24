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

pub fn supports_simple_advanced(pattern: &str) -> bool {
    let atoms: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    while position < atoms.len() {
        let atom = atoms[position];
        if atom == '\\' {
            position += 1;
            if position == atoms.len() {
                return false;
            }
            let escaped = atoms[position];
            if escaped != '.'
                && escaped != '^'
                && escaped != '$'
                && escaped != '*'
                && escaped != '+'
                && escaped != '?'
                && escaped != '|'
                && escaped != '('
                && escaped != ')'
                && escaped != '['
                && escaped != ']'
                && escaped != '{'
                && escaped != '}'
                && escaped != '\\'
            {
                return false;
            }
        }
        if atom == '[' {
            position += 1;
            if position < atoms.len() && atoms[position] == '^' {
                position += 1;
            }
            if position == atoms.len() || atoms[position] == ']' {
                return false;
            }
            while position < atoms.len() && atoms[position] != ']' {
                if atoms[position] == '[' || atoms[position] == '\\' || atoms[position] == '-' {
                    return false;
                }
                if atoms.len() - position > 1 && atoms[position + 1] == '-' {
                    if atoms.len() - position <= 2 || atoms[position + 2] == ']' {
                        return false;
                    }
                    let first = atoms[position] as u32;
                    let last = atoms[position + 2] as u32;
                    let digits = first >= 48 && first <= 57 && last >= 48 && last <= 57;
                    let uppercase = first >= 65 && first <= 90 && last >= 65 && last <= 90;
                    let lowercase = first >= 97 && first <= 122 && last >= 97 && last <= 122;
                    if first > last || (digits == false && uppercase == false && lowercase == false)
                    {
                        return false;
                    }
                    position += 2;
                }
                position += 1;
            }
            if position == atoms.len() {
                return false;
            }
        }
        if atom != '\\'
            && atom != '['
            && (atom == ']'
                || atom == '('
                || atom == ')'
                || atom == '{'
                || atom == '}'
                || atom == '*'
                || atom == '+'
                || atom == '?'
                || atom == '|')
        {
            return false;
        }
        position += 1;
    }
    true
}

pub fn find_simple_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> MatchOutcome {
    let atoms: Vec<char> = pattern.chars().collect();
    let haystack: Vec<char> = subject.chars().collect();
    let mut position = 0;
    while position < atoms.len() {
        let atom = atoms[position];
        if atom == '\\' {
            position += 1;
            if position == atoms.len() {
                return MatchOutcome::Uncertain;
            }
            let escaped = atoms[position];
            if escaped != '.'
                && escaped != '^'
                && escaped != '$'
                && escaped != '*'
                && escaped != '+'
                && escaped != '?'
                && escaped != '|'
                && escaped != '('
                && escaped != ')'
                && escaped != '['
                && escaped != ']'
                && escaped != '{'
                && escaped != '}'
                && escaped != '\\'
            {
                return MatchOutcome::Uncertain;
            }
        }
        if atom == '[' {
            position += 1;
            if position < atoms.len() && atoms[position] == '^' {
                position += 1;
            }
            if position == atoms.len() || atoms[position] == ']' {
                return MatchOutcome::Uncertain;
            }
            while position < atoms.len() && atoms[position] != ']' {
                if atoms[position] == '[' || atoms[position] == '\\' || atoms[position] == '-' {
                    return MatchOutcome::Uncertain;
                }
                if atoms.len() - position > 1 && atoms[position + 1] == '-' {
                    if atoms.len() - position <= 2 || atoms[position + 2] == ']' {
                        return MatchOutcome::Uncertain;
                    }
                    let first = atoms[position] as u32;
                    let last = atoms[position + 2] as u32;
                    let digits = first >= 48 && first <= 57 && last >= 48 && last <= 57;
                    let uppercase = first >= 65 && first <= 90 && last >= 65 && last <= 90;
                    let lowercase = first >= 97 && first <= 122 && last >= 97 && last <= 122;
                    if first > last || (digits == false && uppercase == false && lowercase == false)
                    {
                        return MatchOutcome::Uncertain;
                    }
                    position += 2;
                }
                position += 1;
            }
            if position == atoms.len() {
                return MatchOutcome::Uncertain;
            }
        }
        if atom != '\\'
            && atom != '['
            && (atom == ']'
                || atom == '('
                || atom == ')'
                || atom == '{'
                || atom == '}'
                || atom == '*'
                || atom == '+'
                || atom == '?'
                || atom == '|')
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
        let mut atom_position = 0;
        let mut subject_position = start;
        while atom_position < atoms.len() {
            let escaped = atoms[atom_position] == '\\';
            if escaped {
                atom_position += 1;
            }
            let atom = atoms[atom_position];
            if escaped == false
                && atom == '^'
                && subject_position != 0
                && (line_anchors == false || haystack[subject_position - 1] != '\n')
            {
                break;
            }
            if escaped == false
                && atom == '$'
                && subject_position != haystack.len()
                && (line_anchors == false || haystack[subject_position] != '\n')
            {
                break;
            }
            if escaped == false && atom == '[' {
                if subject_position >= haystack.len() {
                    break;
                }
                let actual = haystack[subject_position];
                let mut class_position = atom_position + 1;
                let negated = atoms[class_position] == '^';
                if negated {
                    class_position += 1;
                }
                while atoms[class_position] != ']' {
                    let expected = atoms[class_position];
                    let ranged = atoms[class_position + 1] == '-';
                    if ranged {
                        let upper = atoms[class_position + 2];
                        if (case_sensitive
                            && (actual as u32) >= (expected as u32)
                            && (actual as u32) <= (upper as u32))
                            || (case_sensitive == false
                                && (actual.to_ascii_lowercase() as u32)
                                    >= (expected.to_ascii_lowercase() as u32)
                                && (actual.to_ascii_lowercase() as u32)
                                    <= (upper.to_ascii_lowercase() as u32))
                        {
                            break;
                        }
                        class_position += 2;
                    }
                    if ranged == false
                        && (actual == expected
                            || (case_sensitive == false
                                && actual.to_ascii_lowercase() == expected.to_ascii_lowercase()))
                    {
                        break;
                    }
                    class_position += 1;
                }
                let included = atoms[class_position] != ']';
                if included == negated
                    || (negated && actual == '\n' && dot_crosses_newline == false)
                {
                    break;
                }
                subject_position += 1;
                while atoms[atom_position] != ']' {
                    atom_position += 1;
                }
            }
            if escaped || (atom != '^' && atom != '$' && atom != '[') {
                if subject_position >= haystack.len() {
                    break;
                }
                let actual = haystack[subject_position];
                if escaped == false && atom == '.' && actual == '\n' && dot_crosses_newline == false
                {
                    break;
                }
                if (escaped || atom != '.')
                    && actual != atom
                    && (case_sensitive || actual.to_ascii_lowercase() != atom.to_ascii_lowercase())
                {
                    break;
                }
                subject_position += 1;
            }
            atom_position += 1;
        }
        if atom_position == atoms.len() {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: subject_position,
            });
        }
        if start == haystack.len() {
            break;
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}
