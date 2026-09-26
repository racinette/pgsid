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
        let mut repeatable = atom != '^' && atom != '$' && atom != '|';
        if atom == '\\' {
            position += 1;
            if position == atoms.len() {
                return false;
            }
            let escaped = atoms[position];
            repeatable = escaped != 'A'
                && escaped != 'Z'
                && escaped != 'm'
                && escaped != 'M'
                && escaped != 'y'
                && escaped != 'Y';
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
                && escaped != 'A'
                && escaped != 'Z'
                && escaped != 'm'
                && escaped != 'M'
                && escaped != 'y'
                && escaped != 'Y'
                && escaped != 'd'
                && escaped != 'D'
                && escaped != 's'
                && escaped != 'S'
                && escaped != 'w'
                && escaped != 'W'
                && escaped != 'a'
                && escaped != 'b'
                && escaped != 'B'
                && escaped != 'e'
                && escaped != 'f'
                && escaped != 'n'
                && escaped != 'r'
                && escaped != 't'
                && escaped != 'v'
            {
                return false;
            }
        }
        if atom == '[' {
            position += 1;
            if position < atoms.len() && atoms[position] == '^' {
                position += 1;
            }
            if position == atoms.len() {
                return false;
            }
            let first_member = position;
            if atoms[position] == ']' {
                position += 1;
            }
            if position == atoms.len() {
                return false;
            }
            while position < atoms.len() && atoms[position] != ']' {
                if atoms[position] == '[' {
                    return false;
                }
                if atoms[position] == '\\' {
                    if atoms.len() - position <= 1 {
                        return false;
                    }
                    let escaped = atoms[position + 1];
                    if escaped != 'd'
                        && escaped != 'D'
                        && escaped != 's'
                        && escaped != 'S'
                        && escaped != 'w'
                        && escaped != 'W'
                    {
                        return false;
                    }
                    if atoms.len() - position > 2
                        && atoms[position + 2] == '-'
                        && (atoms.len() - position <= 3 || atoms[position + 3] != ']')
                    {
                        return false;
                    }
                    position += 2;
                } else {
                    if atoms[position] == '-'
                        && (atoms.len() - position > 1 && atoms[position + 1] == '-'
                            || (position != first_member
                                && (atoms.len() - position <= 1 || atoms[position + 1] != ']')))
                    {
                        return false;
                    }
                    if atoms.len() - position > 1 && atoms[position + 1] == '-' {
                        if atoms.len() - position <= 2 {
                            return false;
                        }
                        if atoms[position + 2] != ']' {
                            if atoms[position + 2] == '\\' {
                                return false;
                            }
                            let first = atoms[position] as u32;
                            let last = atoms[position + 2] as u32;
                            let digits = first >= 48 && first <= 57 && last >= 48 && last <= 57;
                            let uppercase = first >= 65 && first <= 90 && last >= 65 && last <= 90;
                            let lowercase =
                                first >= 97 && first <= 122 && last >= 97 && last <= 122;
                            if first > last
                                || (digits == false && uppercase == false && lowercase == false)
                            {
                                return false;
                            }
                            position += 2;
                        }
                    }
                    position += 1;
                };
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
                || atom == '?')
        {
            return false;
        }
        if repeatable && atoms.len() - position > 1 {
            let next = atoms[position + 1];
            if next == '*' || next == '+' || next == '?' {
                position += 1;
            }
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
    let mut branch_starts: Vec<usize> = Vec::new();
    branch_starts.push(0);
    let mut position = 0;
    while position < atoms.len() {
        let atom = atoms[position];
        let mut repeatable = atom != '^' && atom != '$' && atom != '|';
        if atom == '\\' {
            position += 1;
            if position == atoms.len() {
                return MatchOutcome::Uncertain;
            }
            let escaped = atoms[position];
            repeatable = escaped != 'A'
                && escaped != 'Z'
                && escaped != 'm'
                && escaped != 'M'
                && escaped != 'y'
                && escaped != 'Y';
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
                && escaped != 'A'
                && escaped != 'Z'
                && escaped != 'm'
                && escaped != 'M'
                && escaped != 'y'
                && escaped != 'Y'
                && escaped != 'd'
                && escaped != 'D'
                && escaped != 's'
                && escaped != 'S'
                && escaped != 'w'
                && escaped != 'W'
                && escaped != 'a'
                && escaped != 'b'
                && escaped != 'B'
                && escaped != 'e'
                && escaped != 'f'
                && escaped != 'n'
                && escaped != 'r'
                && escaped != 't'
                && escaped != 'v'
            {
                return MatchOutcome::Uncertain;
            }
        }
        if atom == '[' {
            position += 1;
            if position < atoms.len() && atoms[position] == '^' {
                position += 1;
            }
            if position == atoms.len() {
                return MatchOutcome::Uncertain;
            }
            let first_member = position;
            if atoms[position] == ']' {
                position += 1;
            }
            if position == atoms.len() {
                return MatchOutcome::Uncertain;
            }
            while position < atoms.len() && atoms[position] != ']' {
                if atoms[position] == '[' {
                    return MatchOutcome::Uncertain;
                }
                if atoms[position] == '\\' {
                    if atoms.len() - position <= 1 {
                        return MatchOutcome::Uncertain;
                    }
                    let escaped = atoms[position + 1];
                    if escaped != 'd'
                        && escaped != 'D'
                        && escaped != 's'
                        && escaped != 'S'
                        && escaped != 'w'
                        && escaped != 'W'
                    {
                        return MatchOutcome::Uncertain;
                    }
                    if atoms.len() - position > 2
                        && atoms[position + 2] == '-'
                        && (atoms.len() - position <= 3 || atoms[position + 3] != ']')
                    {
                        return MatchOutcome::Uncertain;
                    }
                    position += 2;
                } else {
                    if atoms[position] == '-'
                        && (atoms.len() - position > 1 && atoms[position + 1] == '-'
                            || (position != first_member
                                && (atoms.len() - position <= 1 || atoms[position + 1] != ']')))
                    {
                        return MatchOutcome::Uncertain;
                    }
                    if atoms.len() - position > 1 && atoms[position + 1] == '-' {
                        if atoms.len() - position <= 2 {
                            return MatchOutcome::Uncertain;
                        }
                        if atoms[position + 2] != ']' {
                            if atoms[position + 2] == '\\' {
                                return MatchOutcome::Uncertain;
                            }
                            let first = atoms[position] as u32;
                            let last = atoms[position + 2] as u32;
                            let digits = first >= 48 && first <= 57 && last >= 48 && last <= 57;
                            let uppercase = first >= 65 && first <= 90 && last >= 65 && last <= 90;
                            let lowercase =
                                first >= 97 && first <= 122 && last >= 97 && last <= 122;
                            if first > last
                                || (digits == false && uppercase == false && lowercase == false)
                            {
                                return MatchOutcome::Uncertain;
                            }
                            position += 2;
                        }
                    }
                    position += 1;
                };
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
                || atom == '?')
        {
            return MatchOutcome::Uncertain;
        }
        if atom == '|' {
            branch_starts.push(position + 1);
        }
        if repeatable && atoms.len() - position > 1 {
            let next = atoms[position + 1];
            if next == '*' || next == '+' || next == '?' {
                position += 1;
            }
        }
        position += 1;
    }
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut start = from;
    let mut work = 0;
    while start <= haystack.len() {
        let mut queue: Vec<usize> = Vec::new();
        let mut branch = 0;
        while branch < branch_starts.len() {
            queue.push(branch_starts[branch]);
            queue.push(start);
            queue.push(0);
            branch += 1;
        }
        let mut head = 0;
        let mut found = false;
        let mut best_end = start;
        while head < queue.len() {
            if work == MAX_CAPTURE_WORK {
                return MatchOutcome::Uncertain;
            }
            work += 1;
            let atom_position = queue[head];
            let subject_position = queue[head + 1];
            let repeated = queue[head + 2];
            head += 3;
            if atom_position == atoms.len() || atoms[atom_position] == '|' {
                if found == false || subject_position > best_end {
                    found = true;
                    best_end = subject_position;
                }
            } else {
                let escaped = atoms[atom_position] == '\\';
                let mut atom_end = atom_position + 1;
                let mut atom = atoms[atom_position];
                if escaped {
                    atom = atoms[atom_end];
                    atom_end += 1;
                }
                let mut matched = false;
                let mut consumed = 0;
                if escaped == false && atom == '^' {
                    matched = subject_position == 0
                        || (line_anchors && haystack[subject_position - 1] == '\n');
                } else if escaped == false && atom == '$' {
                    matched = subject_position == haystack.len()
                        || (line_anchors && haystack[subject_position] == '\n');
                } else if escaped && atom == 'A' {
                    matched = subject_position == 0;
                } else if escaped && atom == 'Z' {
                    matched = subject_position == haystack.len();
                } else if escaped && (atom == 'm' || atom == 'M' || atom == 'y' || atom == 'Y') {
                    let left_word = subject_position > 0
                        && (((haystack[subject_position - 1].to_ascii_lowercase() as u32) >= 97
                            && (haystack[subject_position - 1].to_ascii_lowercase() as u32)
                                <= 122)
                            || ((haystack[subject_position - 1] as u32) >= 48
                                && (haystack[subject_position - 1] as u32) <= 57)
                            || haystack[subject_position - 1] == '_');
                    let right_word = subject_position < haystack.len()
                        && (((haystack[subject_position].to_ascii_lowercase() as u32) >= 97
                            && (haystack[subject_position].to_ascii_lowercase() as u32) <= 122)
                            || ((haystack[subject_position] as u32) >= 48
                                && (haystack[subject_position] as u32) <= 57)
                            || haystack[subject_position] == '_');
                    matched = (atom == 'm' && left_word == false && right_word)
                        || (atom == 'M' && left_word && right_word == false)
                        || (atom == 'y' && left_word != right_word)
                        || (atom == 'Y' && left_word == right_word);
                } else if escaped == false && atom == '[' {
                    let mut class_position = atom_end;
                    let negated = atoms[class_position] == '^';
                    if negated {
                        class_position += 1;
                    }
                    let leading_closing = atoms[class_position] == ']';
                    if leading_closing {
                        class_position += 1;
                    }
                    let mut included = false;
                    if subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        if leading_closing && actual == ']' {
                            included = true;
                        }
                        while atoms[class_position] != ']' {
                            if atoms[class_position] == '\\' {
                                let shorthand = atoms[class_position + 1];
                                let codepoint = actual as u32;
                                let lowercase = actual.to_ascii_lowercase() as u32;
                                let digit = codepoint >= 48 && codepoint <= 57;
                                let space = (codepoint >= 9 && codepoint <= 13) || actual == ' ';
                                let word =
                                    digit || (lowercase >= 97 && lowercase <= 122) || actual == '_';
                                let member = ((shorthand == 'd' || shorthand == 'D') && digit)
                                    || ((shorthand == 's' || shorthand == 'S') && space)
                                    || ((shorthand == 'w' || shorthand == 'W') && word);
                                let complement =
                                    shorthand == 'D' || shorthand == 'S' || shorthand == 'W';
                                if member != complement {
                                    included = true;
                                }
                                class_position += 2;
                            } else {
                                let expected = atoms[class_position];
                                let ranged = atoms[class_position + 1] == '-'
                                    && atoms[class_position + 2] != ']';
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
                                        included = true;
                                    }
                                    class_position += 2;
                                } else if actual == expected
                                    || (case_sensitive == false
                                        && actual.to_ascii_lowercase()
                                            == expected.to_ascii_lowercase())
                                {
                                    included = true;
                                }
                                class_position += 1;
                            };
                        }
                        matched = included != negated
                            && (negated == false || actual != '\n' || dot_crosses_newline);
                        if matched {
                            consumed = 1;
                        }
                    } else {
                        while atoms[class_position] != ']' {
                            if atoms[class_position] == '\\' {
                                class_position += 1;
                            }
                            class_position += 1;
                        }
                    }
                    atom_end = class_position + 1;
                } else if escaped
                    && (atom == 'd'
                        || atom == 'D'
                        || atom == 's'
                        || atom == 'S'
                        || atom == 'w'
                        || atom == 'W')
                {
                    if subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        let codepoint = actual as u32;
                        let lowercase = actual.to_ascii_lowercase() as u32;
                        let digit = codepoint >= 48 && codepoint <= 57;
                        let space = (codepoint >= 9 && codepoint <= 13) || actual == ' ';
                        let word = digit || (lowercase >= 97 && lowercase <= 122) || actual == '_';
                        let included = ((atom == 'd' || atom == 'D') && digit)
                            || ((atom == 's' || atom == 'S') && space)
                            || ((atom == 'w' || atom == 'W') && word);
                        let negated = atom == 'D' || atom == 'S' || atom == 'W';
                        matched = included != negated;
                        if matched {
                            consumed = 1;
                        }
                    }
                } else if escaped
                    && (atom == 'a'
                        || atom == 'b'
                        || atom == 'B'
                        || atom == 'e'
                        || atom == 'f'
                        || atom == 'n'
                        || atom == 'r'
                        || atom == 't'
                        || atom == 'v')
                {
                    if subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        matched = (atom == 'a' && actual == '\u{0007}')
                            || (atom == 'b' && actual == '\u{0008}')
                            || (atom == 'B' && actual == '\\')
                            || (atom == 'e' && actual == '\u{001b}')
                            || (atom == 'f' && actual == '\u{000c}')
                            || (atom == 'n' && actual == '\n')
                            || (atom == 'r' && actual == '\r')
                            || (atom == 't' && actual == '\t')
                            || (atom == 'v' && actual == '\u{000b}');
                        if matched {
                            consumed = 1;
                        }
                    }
                } else if subject_position < haystack.len() {
                    let actual = haystack[subject_position];
                    matched = (escaped == false
                        && atom == '.'
                        && (dot_crosses_newline || actual != '\n'))
                        || (atom != '.' || escaped)
                            && (actual == atom
                                || (case_sensitive == false
                                    && actual.to_ascii_lowercase() == atom.to_ascii_lowercase()));
                    if matched {
                        consumed = 1;
                    }
                }
                let mut repetition = ' ';
                if atom_end < atoms.len() {
                    let next = atoms[atom_end];
                    if next == '*' || next == '+' || next == '?' {
                        repetition = next;
                        atom_end += 1;
                    }
                }
                if repetition == '*' || repetition == '?' || (repetition == '+' && repeated == 1) {
                    queue.push(atom_end);
                    queue.push(subject_position);
                    queue.push(0);
                }
                if matched {
                    if repetition == '*' || repetition == '+' {
                        queue.push(atom_position);
                        queue.push(subject_position + consumed);
                        queue.push(1);
                    } else {
                        queue.push(atom_end);
                        queue.push(subject_position + consumed);
                        queue.push(0);
                    };
                };
            };
        }
        if found {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: best_end,
            });
        }
        if start == haystack.len() {
            break;
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}
