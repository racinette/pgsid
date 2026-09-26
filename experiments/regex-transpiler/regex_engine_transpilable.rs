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

pub struct SearchResult {
    pub kind: usize,
    pub start: usize,
    pub end: usize,
}

pub enum CountOutcome {
    Count(usize),
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

pub fn pattern_atoms(pattern: &str, expanded: bool) -> Vec<char> {
    let source: Vec<char> = pattern.chars().collect();
    if expanded == false {
        return source;
    }
    let mut result: Vec<char> = Vec::new();
    let mut position = 0;
    let mut bracket = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            result.push(atom);
            position += 1;
            if position < source.len() {
                result.push(source[position]);
                position += 1;
            }
        } else if bracket {
            result.push(atom);
            if atom == ']' {
                bracket = false;
            }
            position += 1;
        } else if atom == '[' {
            result.push(atom);
            bracket = true;
            position += 1;
        } else if atom == '#' {
            while position < source.len() && source[position] != '\n' {
                position += 1;
            }
            if position < source.len() {
                position += 1;
            }
        } else if atom == ' ' || ((atom as u32) >= 9 && (atom as u32) <= 13) {
            position += 1;
        } else {
            result.push(atom);
            position += 1;
        };
    }
    result
}

fn supports_atoms(atoms: Vec<char>) -> bool {
    let mut position = 0;
    let mut after_repeat = false;
    while position < atoms.len() {
        let atom = atoms[position];
        if atom == '{'
            && (after_repeat
                || (atoms.len() - position > 1
                    && (atoms[position + 1] as u32) >= 48
                    && (atoms[position + 1] as u32) <= 57))
        {
            return false;
        }
        after_repeat = false;
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
                || atom == '*'
                || atom == '+'
                || atom == '?')
        {
            return false;
        }
        if repeatable && atoms.len() - position > 1 {
            let next = atoms[position + 1];
            if next == '*' || next == '+' || next == '?' {
                after_repeat = true;
                position += 1;
                if atoms.len() - position > 1 && atoms[position + 1] == '?' {
                    position += 1;
                }
            } else if next == '{'
                && atoms.len() - position > 2
                && (atoms[position + 2] as u32) >= 48
                && (atoms[position + 2] as u32) <= 57
            {
                after_repeat = true;
                let mut bound_position = position + 2;
                let mut lower = 0;
                while bound_position < atoms.len()
                    && (atoms[bound_position] as u32) >= 48
                    && (atoms[bound_position] as u32) <= 57
                {
                    if lower > 25 {
                        return false;
                    }
                    let digit = ((atoms[bound_position] as u32) - 48) as usize;
                    let double = lower + lower;
                    let four = double + double;
                    let eight = four + four;
                    lower = eight + double + digit;
                    if lower > 255 {
                        return false;
                    }
                    bound_position += 1;
                }
                let mut upper = lower;
                if bound_position < atoms.len() && atoms[bound_position] == ',' {
                    bound_position += 1;
                    upper = MAX_CAPTURE_WORK;
                    if bound_position < atoms.len()
                        && (atoms[bound_position] as u32) >= 48
                        && (atoms[bound_position] as u32) <= 57
                    {
                        upper = 0;
                        while bound_position < atoms.len()
                            && (atoms[bound_position] as u32) >= 48
                            && (atoms[bound_position] as u32) <= 57
                        {
                            if upper > 25 {
                                return false;
                            }
                            let digit = ((atoms[bound_position] as u32) - 48) as usize;
                            let double = upper + upper;
                            let four = double + double;
                            let eight = four + four;
                            upper = eight + double + digit;
                            if upper > 255 {
                                return false;
                            }
                            bound_position += 1;
                        }
                    }
                }
                if upper < lower || bound_position == atoms.len() || atoms[bound_position] != '}' {
                    return false;
                }
                position = bound_position;
                if atoms.len() - position > 1 && atoms[position + 1] == '?' {
                    position += 1;
                }
            };
        }
        position += 1;
    }
    true
}

pub fn supports_simple_advanced(pattern: &str) -> bool {
    let atoms = pattern_atoms(pattern, false);
    supports_atoms(atoms)
}

pub fn supports_expanded_advanced(pattern: &str) -> bool {
    let atoms = pattern_atoms(pattern, true);
    supports_atoms(atoms)
}

pub fn supports_extended_compatible(pattern: &str, expanded: bool) -> bool {
    let source: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    while position < source.len() {
        if source[position] == '\\' {
            position += 1;
            if position == source.len() {
                return false;
            }
            let escaped = source[position];
            if escaped != '.'
                && escaped != '+'
                && escaped != '?'
                && escaped != '|'
                && escaped != '^'
                && escaped != '$'
                && escaped != '*'
                && escaped != '['
                && escaped != ']'
                && escaped != '('
                && escaped != ')'
                && escaped != '{'
                && escaped != '}'
                && escaped != '\\'
            {
                return false;
            }
        }
        position += 1;
    }
    if expanded {
        return supports_expanded_advanced(pattern);
    }
    supports_simple_advanced(pattern)
}

pub fn supports_basic_compatible(pattern: &str, expanded: bool) -> bool {
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut bracket = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            position += 1;
            if position == source.len() {
                return false;
            }
            let escaped = source[position];
            if escaped != '.'
                && escaped != '+'
                && escaped != '?'
                && escaped != '|'
                && escaped != '^'
                && escaped != '$'
                && escaped != '*'
                && escaped != '['
                && escaped != ']'
                && escaped != '\\'
            {
                return false;
            }
            position += 1;
        } else {
            if atom == '[' && bracket == false {
                bracket = true;
            } else if atom == ']' && bracket == true {
                bracket = false;
            };
            if atom == '+'
                || atom == '?'
                || atom == '|'
                || atom == '('
                || atom == ')'
                || atom == '{'
                || atom == '}'
                || (atom == '^' && bracket == false && position != 0)
                || (atom == '$' && bracket == false && position + 1 != source.len())
            {
                return false;
            }
            position += 1;
        };
    }
    if expanded {
        return supports_expanded_advanced(pattern);
    }
    supports_simple_advanced(pattern)
}

fn search_atoms(
    atoms: Vec<char>,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> SearchResult {
    let haystack: Vec<char> = subject.chars().collect();
    let mut branch_starts: Vec<usize> = Vec::new();
    branch_starts.push(0);
    let mut shortest = false;
    let mut preference_known = false;
    let mut alternation = false;
    let mut position = 0;
    let mut after_repeat = false;
    while position < atoms.len() {
        let atom = atoms[position];
        if atom == '{'
            && (after_repeat
                || (atoms.len() - position > 1
                    && (atoms[position + 1] as u32) >= 48
                    && (atoms[position + 1] as u32) <= 57))
        {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        after_repeat = false;
        let mut repeatable = atom != '^' && atom != '$' && atom != '|';
        if atom == '\\' {
            position += 1;
            if position == atoms.len() {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
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
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
        }
        if atom == '[' {
            position += 1;
            if position < atoms.len() && atoms[position] == '^' {
                position += 1;
            }
            if position == atoms.len() {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
            let first_member = position;
            if atoms[position] == ']' {
                position += 1;
            }
            if position == atoms.len() {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
            while position < atoms.len() && atoms[position] != ']' {
                if atoms[position] == '[' {
                    return SearchResult {
                        kind: 2,
                        start: 0,
                        end: 0,
                    };
                }
                if atoms[position] == '\\' {
                    if atoms.len() - position <= 1 {
                        return SearchResult {
                            kind: 2,
                            start: 0,
                            end: 0,
                        };
                    }
                    let escaped = atoms[position + 1];
                    if escaped != 'd'
                        && escaped != 'D'
                        && escaped != 's'
                        && escaped != 'S'
                        && escaped != 'w'
                        && escaped != 'W'
                    {
                        return SearchResult {
                            kind: 2,
                            start: 0,
                            end: 0,
                        };
                    }
                    if atoms.len() - position > 2
                        && atoms[position + 2] == '-'
                        && (atoms.len() - position <= 3 || atoms[position + 3] != ']')
                    {
                        return SearchResult {
                            kind: 2,
                            start: 0,
                            end: 0,
                        };
                    }
                    position += 2;
                } else {
                    if atoms[position] == '-'
                        && (atoms.len() - position > 1 && atoms[position + 1] == '-'
                            || (position != first_member
                                && (atoms.len() - position <= 1 || atoms[position + 1] != ']')))
                    {
                        return SearchResult {
                            kind: 2,
                            start: 0,
                            end: 0,
                        };
                    }
                    if atoms.len() - position > 1 && atoms[position + 1] == '-' {
                        if atoms.len() - position <= 2 {
                            return SearchResult {
                                kind: 2,
                                start: 0,
                                end: 0,
                            };
                        }
                        if atoms[position + 2] != ']' {
                            if atoms[position + 2] == '\\' {
                                return SearchResult {
                                    kind: 2,
                                    start: 0,
                                    end: 0,
                                };
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
                                return SearchResult {
                                    kind: 2,
                                    start: 0,
                                    end: 0,
                                };
                            }
                            position += 2;
                        }
                    }
                    position += 1;
                };
            }
            if position == atoms.len() {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
        }
        if atom != '\\'
            && atom != '['
            && (atom == ']'
                || atom == '('
                || atom == ')'
                || atom == '*'
                || atom == '+'
                || atom == '?')
        {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        if atom == '|' {
            branch_starts.push(position + 1);
            alternation = true;
        }
        if repeatable && atoms.len() - position > 1 {
            let next = atoms[position + 1];
            if next == '*' || next == '+' || next == '?' {
                after_repeat = true;
                position += 1;
                let mut lazy = false;
                if atoms.len() - position > 1 && atoms[position + 1] == '?' {
                    lazy = true;
                    position += 1;
                }
                if preference_known == false {
                    preference_known = true;
                    shortest = lazy;
                }
            } else if next == '{'
                && atoms.len() - position > 2
                && (atoms[position + 2] as u32) >= 48
                && (atoms[position + 2] as u32) <= 57
            {
                after_repeat = true;
                let mut bound_position = position + 2;
                let mut lower = 0;
                while bound_position < atoms.len()
                    && (atoms[bound_position] as u32) >= 48
                    && (atoms[bound_position] as u32) <= 57
                {
                    if lower > 25 {
                        return SearchResult {
                            kind: 2,
                            start: 0,
                            end: 0,
                        };
                    }
                    let digit = ((atoms[bound_position] as u32) - 48) as usize;
                    let double = lower + lower;
                    let four = double + double;
                    let eight = four + four;
                    lower = eight + double + digit;
                    if lower > 255 {
                        return SearchResult {
                            kind: 2,
                            start: 0,
                            end: 0,
                        };
                    }
                    bound_position += 1;
                }
                let mut upper = lower;
                let mut fixed = true;
                if bound_position < atoms.len() && atoms[bound_position] == ',' {
                    fixed = false;
                    bound_position += 1;
                    upper = MAX_CAPTURE_WORK;
                    if bound_position < atoms.len()
                        && (atoms[bound_position] as u32) >= 48
                        && (atoms[bound_position] as u32) <= 57
                    {
                        upper = 0;
                        while bound_position < atoms.len()
                            && (atoms[bound_position] as u32) >= 48
                            && (atoms[bound_position] as u32) <= 57
                        {
                            if upper > 25 {
                                return SearchResult {
                                    kind: 2,
                                    start: 0,
                                    end: 0,
                                };
                            }
                            let digit = ((atoms[bound_position] as u32) - 48) as usize;
                            let double = upper + upper;
                            let four = double + double;
                            let eight = four + four;
                            upper = eight + double + digit;
                            if upper > 255 {
                                return SearchResult {
                                    kind: 2,
                                    start: 0,
                                    end: 0,
                                };
                            }
                            bound_position += 1;
                        }
                    }
                }
                if upper < lower || bound_position == atoms.len() || atoms[bound_position] != '}' {
                    return SearchResult {
                        kind: 2,
                        start: 0,
                        end: 0,
                    };
                }
                position = bound_position;
                let mut lazy = false;
                if atoms.len() - position > 1 && atoms[position + 1] == '?' {
                    lazy = true;
                    position += 1;
                }
                if fixed == false && preference_known == false {
                    preference_known = true;
                    shortest = lazy;
                }
            };
        }
        position += 1;
    }
    if alternation {
        shortest = false;
    }
    if from > haystack.len() {
        return SearchResult {
            kind: 1,
            start: 0,
            end: 0,
        };
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
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
            work += 1;
            let atom_position = queue[head];
            let subject_position = queue[head + 1];
            let repeated = queue[head + 2];
            head += 3;
            if atom_position == atoms.len() || atoms[atom_position] == '|' {
                if found == false
                    || (shortest && subject_position < best_end)
                    || (shortest == false && subject_position > best_end)
                {
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
                let mut minimum = 0;
                let mut maximum = 0;
                if atom_end < atoms.len() {
                    let next = atoms[atom_end];
                    if next == '*' || next == '+' || next == '?' {
                        repetition = next;
                        atom_end += 1;
                        if atom_end < atoms.len() && atoms[atom_end] == '?' {
                            atom_end += 1;
                        }
                    } else if next == '{'
                        && atoms.len() - atom_end > 1
                        && (atoms[atom_end + 1] as u32) >= 48
                        && (atoms[atom_end + 1] as u32) <= 57
                    {
                        repetition = next;
                        atom_end += 1;
                        while (atoms[atom_end] as u32) >= 48 && (atoms[atom_end] as u32) <= 57 {
                            let digit = ((atoms[atom_end] as u32) - 48) as usize;
                            let double = minimum + minimum;
                            let four = double + double;
                            let eight = four + four;
                            minimum = eight + double + digit;
                            atom_end += 1;
                        }
                        maximum = minimum;
                        if atoms[atom_end] == ',' {
                            atom_end += 1;
                            maximum = MAX_CAPTURE_WORK;
                            if atoms[atom_end] != '}' {
                                maximum = 0;
                                while (atoms[atom_end] as u32) >= 48
                                    && (atoms[atom_end] as u32) <= 57
                                {
                                    let digit = ((atoms[atom_end] as u32) - 48) as usize;
                                    let double = maximum + maximum;
                                    let four = double + double;
                                    let eight = four + four;
                                    maximum = eight + double + digit;
                                    atom_end += 1;
                                }
                            }
                        }
                        atom_end += 1;
                        if atom_end < atoms.len() && atoms[atom_end] == '?' {
                            atom_end += 1;
                        }
                    };
                }
                if repetition == '*'
                    || repetition == '?'
                    || (repetition == '+' && repeated == 1)
                    || (repetition == '{' && repeated >= minimum)
                {
                    queue.push(atom_end);
                    queue.push(subject_position);
                    queue.push(0);
                }
                if matched {
                    if repetition == '*' || repetition == '+' {
                        queue.push(atom_position);
                        queue.push(subject_position + consumed);
                        queue.push(1);
                    } else if repetition == '{' {
                        if repeated < maximum {
                            queue.push(atom_position);
                            queue.push(subject_position + consumed);
                            queue.push(repeated + 1);
                        }
                    } else {
                        queue.push(atom_end);
                        queue.push(subject_position + consumed);
                        queue.push(0);
                    };
                };
            };
        }
        if found {
            return SearchResult {
                kind: 0,
                start,
                end: best_end,
            };
        }
        if start == haystack.len() {
            break;
        }
        start += 1;
    }
    SearchResult {
        kind: 1,
        start: 0,
        end: 0,
    }
}

fn find_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let atoms = pattern_atoms(pattern, expanded);
    let result = search_atoms(
        atoms,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    );
    if result.kind == 2 {
        return MatchOutcome::Uncertain;
    }
    if result.kind == 1 {
        return MatchOutcome::NoMatch;
    }
    MatchOutcome::Found(MatchSpan {
        start: result.start,
        end: result.end,
    })
}

fn count_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> CountOutcome {
    let characters: Vec<char> = subject.chars().collect();
    let mut position = from;
    let mut count = 0;
    while position <= characters.len() {
        let atoms = pattern_atoms(pattern, expanded);
        let result = search_atoms(
            atoms,
            subject,
            position,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if result.kind == 2 {
            return CountOutcome::Uncertain;
        }
        if result.kind == 1 {
            break;
        }
        if count == MAX_CAPTURE_WORK {
            return CountOutcome::Uncertain;
        }
        count += 1;
        if result.start == result.end {
            position = result.end + 1;
        } else {
            position = result.end;
        };
    }
    CountOutcome::Count(count)
}

pub fn find_simple_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> MatchOutcome {
    find_advanced(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        false,
    )
}

pub fn find_expanded_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> MatchOutcome {
    find_advanced(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        true,
    )
}

pub fn count_simple_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> CountOutcome {
    count_advanced(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        false,
    )
}

pub fn count_expanded_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> CountOutcome {
    count_advanced(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        true,
    )
}

pub fn find_extended_compatible(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    find_advanced(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
    )
}

pub fn find_basic_compatible(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    find_advanced(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
    )
}
