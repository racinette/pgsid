const MAX_CAPTURE_WORK: usize = 2000000;
const MAX_ASSERTION_ATTEMPTS: usize = 4096;

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

struct FlatGroupResult {
    valid: bool,
    atoms: Vec<char>,
}

struct GroupChoiceResult {
    valid: bool,
    left: Vec<char>,
    right: Vec<char>,
}

struct LookbehindResult {
    valid: bool,
    positive: bool,
    prefix: Vec<char>,
    remainder: Vec<char>,
}

struct LookaheadResult {
    valid: bool,
    positive: bool,
    offset: usize,
    assertion: Vec<char>,
    remainder: Vec<char>,
}

struct FixedBackrefResult {
    valid: bool,
    atoms: Vec<char>,
}

struct SingleCaptureResult {
    valid: bool,
    repeated: bool,
    zero_allowed: bool,
    prefix: Vec<char>,
    atom: Vec<char>,
    between: Vec<char>,
    suffix: Vec<char>,
}

#[derive(Clone, Copy)]
struct CaptureState {
    start: usize,
    capture: usize,
    capture_end: usize,
}

struct InlineResult {
    valid: bool,
    mode: char,
    atoms: Vec<char>,
}

struct BoundedGroupResult {
    valid: bool,
    prefix: Vec<char>,
    member: Vec<char>,
    suffix: Vec<char>,
    lower: usize,
    upper: usize,
}

struct BasicLiteralResult {
    valid: bool,
    atoms: Vec<char>,
}

struct ExtendedEscapeResult {
    valid: bool,
    atoms: Vec<char>,
}

struct BasicBoundResult {
    valid: bool,
    atoms: Vec<char>,
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

pub fn definitely_invalid_grouping(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut depth = 0;
    let mut bracket = false;
    let mut bracket_members = 0;
    let mut negated = false;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 {
                return true;
            }
            let escaped = source[position + 1];
            if bracket == false && syntax == 'b' && escaped == '(' {
                depth += 1;
            } else if bracket == false && syntax == 'b' && escaped == ')' {
                if depth == 0 {
                    return true;
                }
                depth = depth - 1;
            }
            if bracket {
                bracket_members += 1;
            }
            position += 2;
        } else if bracket {
            if atom == ']' && bracket_members > 0 && (negated == false || bracket_members > 1) {
                bracket = false;
            } else {
                if atom == '^' && bracket_members == 0 {
                    negated = true;
                }
                bracket_members += 1;
            }
            position += 1;
        } else if atom == '[' {
            bracket = true;
            bracket_members = 0;
            negated = false;
            position += 1;
        } else if syntax != 'b' && atom == '(' {
            depth += 1;
            position += 1;
        } else if syntax != 'b' && atom == ')' {
            if depth == 0 && syntax == 'a' {
                return true;
            }
            if depth > 0 {
                depth = depth - 1;
            }
            position += 1;
        } else {
            position += 1;
        };
    }
    bracket || depth > 0
}

pub fn definitely_invalid_simple_repeat(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    if source.len() >= 4 && source[0] == '*' && source[1] == '*' && source[2] == '*' {
        if source[3] == '=' {
            return false;
        }
        if source[3] == ':' {
            position = 4;
        }
    }
    let mut bracket = false;
    let mut bracket_members = 0;
    let mut previous_repeat = false;
    let mut previous_lazy = false;
    let mut after_open = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 {
                return false;
            }
            previous_repeat = false;
            after_open = false;
            position += 2;
        } else if bracket {
            if atom == ']' && bracket_members > 0 {
                bracket = false;
            } else {
                bracket_members += 1;
            }
            position += 1;
        } else if atom == '[' {
            bracket = true;
            bracket_members = 0;
            previous_repeat = false;
            after_open = false;
            position += 1;
        } else if atom == '(' && syntax != 'b' {
            previous_repeat = false;
            after_open = true;
            position += 1;
        } else if atom == '*' || syntax != 'b' && (atom == '+' || atom == '?') {
            if previous_repeat
                && (syntax != 'b' || position != 1)
                && (syntax != 'a' || atom != '?' || previous_lazy)
                || position == 0 && syntax != 'b'
                || after_open && atom != '?'
            {
                return true;
            }
            previous_lazy = previous_repeat && atom == '?';
            previous_repeat = true;
            after_open = false;
            position += 1;
        } else {
            previous_repeat = false;
            after_open = false;
            position += 1;
        };
    }
    false
}

pub fn definitely_invalid_bound(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    if source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && source[3] == '='
    {
        return false;
    }
    let mut position = 0;
    let mut bracket = false;
    let mut bracket_members = 0;
    while position < source.len() {
        let atom = source[position];
        if bracket {
            if atom == ']' && bracket_members > 0 {
                bracket = false;
            } else {
                bracket_members += 1;
            }
            position += 1;
        } else if atom == '[' {
            bracket = true;
            bracket_members = 0;
            position += 1;
        } else if atom == '\\'
            && (syntax != 'b' || position + 1 == source.len() || source[position + 1] != '{')
        {
            position += 2;
        } else if atom == '{' && syntax != 'b'
            || atom == '\\'
                && syntax == 'b'
                && position + 1 < source.len()
                && source[position + 1] == '{'
        {
            if syntax == 'b' {
                position += 2;
            } else {
                position += 1;
            }
            if position < source.len()
                && (source[position] as u32) >= 48
                && (source[position] as u32) <= 57
            {
                let mut lower = 0;
                while position < source.len()
                    && (source[position] as u32) >= 48
                    && (source[position] as u32) <= 57
                {
                    let double = lower + lower;
                    let four = double + double;
                    let eight = four + four;
                    lower = eight + double + ((source[position] as u32) - 48) as usize;
                    if lower > 255 {
                        return true;
                    }
                    position += 1;
                }
                let mut upper = lower;
                let mut has_upper = true;
                if position < source.len() && source[position] == ',' {
                    position += 1;
                    upper = 0;
                    has_upper = false;
                    while position < source.len()
                        && (source[position] as u32) >= 48
                        && (source[position] as u32) <= 57
                    {
                        let double = upper + upper;
                        let four = double + double;
                        let eight = four + four;
                        upper = eight + double + ((source[position] as u32) - 48) as usize;
                        if upper > 255 {
                            return true;
                        }
                        has_upper = true;
                        position += 1;
                    }
                }
                if has_upper && upper < lower {
                    return true;
                }
                if syntax == 'b' {
                    if position + 1 >= source.len()
                        || source[position] != '\\'
                        || source[position + 1] != '}'
                    {
                        return true;
                    }
                    position += 2;
                } else {
                    if position == source.len() || source[position] != '}' {
                        return true;
                    }
                    position += 1;
                };
            }
        } else {
            position += 1;
        };
    }
    false
}

fn known_posix_class_name(name: Vec<char>) -> bool {
    if name.len() == 1 {
        return name[0] == '<' || name[0] == '>';
    }
    if name.len() == 4 {
        return name[0] == 'w' && name[1] == 'o' && name[2] == 'r' && name[3] == 'd';
    }
    if name.len() == 6 {
        return name[0] == 'x'
            && name[1] == 'd'
            && name[2] == 'i'
            && name[3] == 'g'
            && name[4] == 'i'
            && name[5] == 't';
    }
    if name.len() != 5 {
        return false;
    }
    name[0] == 'a'
        && name[1] == 'l'
        && (name[2] == 'n' && name[3] == 'u' && name[4] == 'm'
            || name[2] == 'p' && name[3] == 'h' && name[4] == 'a')
        || name[0] == 'a' && name[1] == 's' && name[2] == 'c' && name[3] == 'i' && name[4] == 'i'
        || name[0] == 'b' && name[1] == 'l' && name[2] == 'a' && name[3] == 'n' && name[4] == 'k'
        || name[0] == 'c' && name[1] == 'n' && name[2] == 't' && name[3] == 'r' && name[4] == 'l'
        || name[0] == 'd' && name[1] == 'i' && name[2] == 'g' && name[3] == 'i' && name[4] == 't'
        || name[0] == 'g' && name[1] == 'r' && name[2] == 'a' && name[3] == 'p' && name[4] == 'h'
        || name[0] == 'l' && name[1] == 'o' && name[2] == 'w' && name[3] == 'e' && name[4] == 'r'
        || name[0] == 'p' && name[1] == 'r' && name[2] == 'i' && name[3] == 'n' && name[4] == 't'
        || name[0] == 'p' && name[1] == 'u' && name[2] == 'n' && name[3] == 'c' && name[4] == 't'
        || name[0] == 's' && name[1] == 'p' && name[2] == 'a' && name[3] == 'c' && name[4] == 'e'
        || name[0] == 'u' && name[1] == 'p' && name[2] == 'p' && name[3] == 'e' && name[4] == 'r'
}

pub fn definitely_invalid_posix_class(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut bracket = false;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '[' && bracket == false {
            bracket = true;
            position += 1;
        } else if atom == '['
            && bracket
            && position + 1 < source.len()
            && source[position + 1] == ':'
        {
            position += 2;
            let mut name: Vec<char> = Vec::new();
            while position < source.len() && source[position] != ':' {
                name.push(source[position]);
                position += 1;
            }
            if position + 1 >= source.len() || source[position + 1] != ']' {
                return true;
            }
            if known_posix_class_name(name) == false {
                return true;
            }
            position += 2;
        } else if atom == ']' && bracket {
            bracket = false;
            position += 1;
        } else if atom == '\\' && syntax == 'a' {
            position += 2;
        } else {
            position += 1;
        };
    }
    false
}

pub fn definitely_invalid_backreference(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut open: Vec<usize> = Vec::new();
    let mut closed: Vec<usize> = Vec::new();
    let mut depth = 0;
    let mut bracket = false;
    let mut bracket_members = 0;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if bracket {
            if atom == ']' && bracket_members > 0 {
                bracket = false;
            } else {
                bracket_members += 1;
            }
            position += 1;
        } else if atom == '[' {
            bracket = true;
            bracket_members = 0;
            position += 1;
        } else if atom == '\\' {
            if position + 1 >= source.len() {
                return false;
            }
            let escaped = source[position + 1];
            if syntax == 'b' && escaped == '(' {
                closed.push(0);
                if depth == open.len() {
                    open.push(closed.len());
                } else {
                    open[depth] = closed.len();
                }
                depth += 1;
            } else if syntax == 'b' && escaped == ')' {
                if depth > 0 {
                    depth = depth - 1;
                    closed[open[depth] - 1] = 1;
                }
            } else if (escaped as u32) >= 49
                && (escaped as u32) <= 57
                && (position + 2 == source.len()
                    || (source[position + 2] as u32) < 48
                    || (source[position + 2] as u32) > 57)
            {
                let reference = ((escaped as u32) - 48) as usize;
                if reference > closed.len() || closed[reference - 1] == 0 {
                    return true;
                }
            }
            position += 2;
        } else if syntax == 'a' && atom == '(' {
            closed.push(0);
            if depth == open.len() {
                open.push(closed.len());
            } else {
                open[depth] = closed.len();
            }
            depth += 1;
            position += 1;
        } else if syntax == 'a' && atom == ')' {
            if depth > 0 {
                depth = depth - 1;
                closed[open[depth] - 1] = 1;
            }
            position += 1;
        } else {
            position += 1;
        };
    }
    false
}

fn posix_class_kind(first: char, second: char, third: char, fourth: char, fifth: char) -> usize {
    if first == 'd' && second == 'i' && third == 'g' && fourth == 'i' && fifth == 't' {
        return 1;
    }
    if first == 'a' && second == 'l' && third == 'p' && fourth == 'h' && fifth == 'a' {
        return 2;
    }
    if first == 'u' && second == 'p' && third == 'p' && fourth == 'e' && fifth == 'r' {
        return 3;
    }
    if first == 's' && second == 'p' && third == 'a' && fourth == 'c' && fifth == 'e' {
        return 4;
    }
    0
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
                && escaped != ' '
            {
                return false;
            }
        }
        if atom == '['
            && atoms.len() - position >= 11
            && atoms[position + 1] == '['
            && atoms[position + 2] == ':'
            && atoms[position + 8] == ':'
            && atoms[position + 9] == ']'
            && atoms[position + 10] == ']'
        {
            if posix_class_kind(
                atoms[position + 3],
                atoms[position + 4],
                atoms[position + 5],
                atoms[position + 6],
                atoms[position + 7],
            ) == 0
            {
                return false;
            }
            position += 10;
        } else if atom == '[' {
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
                            let unicode = first >= 128 && last >= 128;
                            if first > last
                                || (digits == false
                                    && uppercase == false
                                    && lowercase == false
                                    && unicode == false)
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

pub fn supports_extended_literal_closing_group(pattern: &str, expanded: bool) -> bool {
    let source = pattern_atoms(pattern, expanded);
    let raw: Vec<char> = pattern.chars().collect();
    if source.len() != raw.len() {
        return false;
    }
    let mut closing = false;
    let mut position = 0;
    while position < source.len() {
        if source[position] == ')' {
            closing = true;
        } else if simple_literal_char(source[position]) == false {
            return false;
        }
        position += 1;
    }
    closing
}

pub fn find_extended_literal_closing_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
) -> MatchOutcome {
    if supports_extended_literal_closing_group(pattern, false) == false {
        return MatchOutcome::Uncertain;
    }
    find_literal(pattern, subject, from, case_sensitive)
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

fn flat_group_atoms(pattern: &str, expanded: bool) -> FlatGroupResult {
    let source = pattern_atoms(pattern, expanded);
    let mut result: Vec<char> = Vec::new();
    let mut position = 0;
    let mut depth = 0;
    let mut bracket = false;
    let mut grouped = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 {
                return FlatGroupResult {
                    valid: false,
                    atoms: result,
                };
            }
            let escaped = source[position + 1];
            if (escaped as u32) >= 48 && (escaped as u32) <= 57 {
                return FlatGroupResult {
                    valid: false,
                    atoms: result,
                };
            }
            result.push(atom);
            result.push(escaped);
            position += 2;
        } else if atom == '[' && bracket == false {
            bracket = true;
            result.push(atom);
            position += 1;
        } else if atom == ']' && bracket {
            bracket = false;
            result.push(atom);
            position += 1;
        } else if bracket {
            result.push(atom);
            position += 1;
        } else if atom == '(' {
            if source.len() - position > 1 && source[position + 1] == '?' {
                return FlatGroupResult {
                    valid: false,
                    atoms: result,
                };
            }
            grouped = true;
            depth += 1;
            position += 1;
        } else if atom == ')' {
            if depth == 0 {
                return FlatGroupResult {
                    valid: false,
                    atoms: result,
                };
            }
            depth = depth - 1;
            if source.len() - position > 1
                && (source[position + 1] == '*'
                    || source[position + 1] == '+'
                    || source[position + 1] == '?'
                    || source[position + 1] == '{')
            {
                return FlatGroupResult {
                    valid: false,
                    atoms: result,
                };
            }
            position += 1;
        } else if atom == '|' && depth > 0 {
            return FlatGroupResult {
                valid: false,
                atoms: result,
            };
        } else {
            result.push(atom);
            position += 1;
        };
    }
    FlatGroupResult {
        valid: grouped && depth == 0 && bracket == false,
        atoms: result,
    }
}

pub fn supports_flat_groups(pattern: &str, expanded: bool) -> bool {
    let parsed = flat_group_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

fn group_choice_atoms(pattern: &str, expanded: bool) -> GroupChoiceResult {
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut bracket = false;
    let mut inside = false;
    let mut opened = false;
    let mut closed = false;
    let mut split = false;
    let mut group_start = 0;
    let mut group_end = 0;
    let mut split_position = 0;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 {
                valid = false;
                break;
            }
            if (source[position + 1] as u32) >= 48 && (source[position + 1] as u32) <= 57 {
                valid = false;
                break;
            }
            position += 2;
        } else if atom == '[' && bracket == false {
            if source.len() - position > 1 && source[position + 1] == '[' {
                valid = false;
                break;
            }
            bracket = true;
            position += 1;
        } else if atom == ']' && bracket {
            bracket = false;
            position += 1;
        } else if bracket {
            position += 1;
        } else if atom == '(' {
            if opened || (source.len() - position > 1 && source[position + 1] == '?') {
                valid = false;
                break;
            }
            opened = true;
            inside = true;
            group_start = position;
            position += 1;
        } else if atom == '|' {
            if inside == false || split {
                valid = false;
                break;
            }
            split = true;
            split_position = position;
            position += 1;
        } else if atom == ')' {
            if inside == false {
                valid = false;
                break;
            }
            inside = false;
            closed = true;
            group_end = position;
            if source.len() - position > 1
                && (source[position + 1] == '*'
                    || source[position + 1] == '+'
                    || source[position + 1] == '?'
                    || source[position + 1] == '{')
            {
                valid = false;
                break;
            }
            position += 1;
        } else if atom == '?' {
            valid = false;
            break;
        } else {
            position += 1;
        };
    }
    let mut left: Vec<char> = Vec::new();
    let mut right: Vec<char> = Vec::new();
    if valid && opened && closed && split && bracket == false {
        let mut index = 0;
        while index < group_start {
            left.push(source[index]);
            right.push(source[index]);
            index += 1;
        }
        index = group_start + 1;
        while index < split_position {
            left.push(source[index]);
            index += 1;
        }
        index = split_position + 1;
        while index < group_end {
            right.push(source[index]);
            index += 1;
        }
        index = group_end + 1;
        while index < source.len() {
            left.push(source[index]);
            right.push(source[index]);
            index += 1;
        }
    } else {
        valid = false;
    };
    GroupChoiceResult { valid, left, right }
}

pub fn supports_group_choice(pattern: &str, expanded: bool) -> bool {
    let parsed = group_choice_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.left) && supports_atoms(parsed.right)
}

fn optional_group_atoms(pattern: &str, expanded: bool) -> GroupChoiceResult {
    let source = pattern_atoms(pattern, expanded);
    let mut included: Vec<char> = Vec::new();
    let mut omitted: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    while position < source.len() && source[position] != '(' {
        let atom = source[position];
        if simple_literal_char(atom) == false && (atom != '^' || position != 0) {
            valid = false;
            break;
        }
        included.push(atom);
        omitted.push(atom);
        position += 1;
    }
    if position == source.len() {
        valid = false;
    }
    if valid {
        position += 1;
        let mut members = 0;
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            included.push(source[position]);
            members += 1;
            position += 1;
        }
        if members == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        if position == source.len() || source[position] != '?' {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() {
            let atom = source[position];
            if simple_literal_char(atom) == false && (atom != '$' || position + 1 != source.len()) {
                valid = false;
                break;
            }
            included.push(atom);
            omitted.push(atom);
            position += 1;
        }
    }
    GroupChoiceResult {
        valid,
        left: included,
        right: omitted,
    }
}

pub fn supports_optional_group(pattern: &str, expanded: bool) -> bool {
    let parsed = optional_group_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.left) && supports_atoms(parsed.right)
}

fn fixed_lookbehind_atoms(pattern: &str, expanded: bool) -> LookbehindResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut remainder: Vec<char> = Vec::new();
    let mut valid = source.len() >= 6;
    let mut positive = true;
    if valid {
        valid = source[0] == '('
            && source[1] == '?'
            && source[2] == '<'
            && (source[3] == '=' || source[3] == '!');
        positive = source[3] == '=';
    }
    let mut position = 4;
    if valid {
        while position < source.len() && source[position] != ')' {
            let atom = source[position];
            if atom == '\\'
                || atom == '.'
                || atom == '^'
                || atom == '$'
                || atom == '*'
                || atom == '+'
                || atom == '?'
                || atom == '{'
                || atom == '}'
                || atom == '['
                || atom == ']'
                || atom == '('
                || atom == '|'
            {
                valid = false;
                break;
            }
            prefix.push(atom);
            position += 1;
        }
        if position == source.len() || prefix.len() == 0 || prefix.len() > 8 {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() {
            remainder.push(source[position]);
            position += 1;
        }
    }
    LookbehindResult {
        valid,
        positive,
        prefix,
        remainder,
    }
}

pub fn supports_fixed_lookbehind(pattern: &str, expanded: bool) -> bool {
    let parsed = fixed_lookbehind_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.remainder)
}

fn leading_lookahead_atoms(pattern: &str, expanded: bool) -> LookaheadResult {
    let source = pattern_atoms(pattern, expanded);
    let mut assertion: Vec<char> = Vec::new();
    let mut remainder: Vec<char> = Vec::new();
    let mut valid = source.len() >= 4;
    let mut positive = true;
    if valid {
        valid = source[0] == '(' && source[1] == '?' && (source[2] == '=' || source[2] == '!');
        positive = source[2] == '=';
    }
    let mut position = 3;
    if valid {
        while position < source.len() && source[position] != ')' {
            let atom = source[position];
            if atom == '\\' || atom == '[' || atom == '(' {
                valid = false;
                break;
            }
            assertion.push(atom);
            position += 1;
        }
        if position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() {
            remainder.push(source[position]);
            position += 1;
        }
    }
    LookaheadResult {
        valid,
        positive,
        offset: 0,
        assertion,
        remainder,
    }
}

pub fn supports_leading_lookahead(pattern: &str, expanded: bool) -> bool {
    let parsed = leading_lookahead_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.assertion) && supports_atoms(parsed.remainder)
}

fn middle_lookahead_atoms(pattern: &str, expanded: bool) -> LookaheadResult {
    let source = pattern_atoms(pattern, expanded);
    let mut assertion: Vec<char> = Vec::new();
    let mut remainder: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut positive = true;
    while position < source.len() && source[position] != '(' {
        let atom = source[position];
        if atom == '\\'
            || atom == '.'
            || atom == '^'
            || atom == '$'
            || atom == '*'
            || atom == '+'
            || atom == '?'
            || atom == '{'
            || atom == '}'
            || atom == '['
            || atom == ']'
            || atom == ')'
            || atom == '|'
        {
            valid = false;
            break;
        }
        remainder.push(atom);
        position += 1;
    }
    let offset = remainder.len();
    if offset == 0 || source.len() - position < 4 {
        valid = false;
    }
    if valid {
        valid = source[position] == '('
            && source[position + 1] == '?'
            && (source[position + 2] == '=' || source[position + 2] == '!');
        positive = source[position + 2] == '=';
        position += 3;
    }
    if valid {
        while position < source.len() && source[position] != ')' {
            let atom = source[position];
            if atom == '\\' || atom == '[' || atom == '(' {
                valid = false;
                break;
            }
            assertion.push(atom);
            position += 1;
        }
        if position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() {
            remainder.push(source[position]);
            position += 1;
        }
    }
    LookaheadResult {
        valid,
        positive,
        offset,
        assertion,
        remainder,
    }
}

pub fn supports_middle_lookahead(pattern: &str, expanded: bool) -> bool {
    let parsed = middle_lookahead_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.assertion) && supports_atoms(parsed.remainder)
}

fn fixed_backref_atoms(pattern: &str, expanded: bool) -> FixedBackrefResult {
    let source = pattern_atoms(pattern, expanded);
    let mut result: Vec<char> = Vec::new();
    let mut capture: Vec<char> = Vec::new();
    let mut position = 0;
    let mut grouped = false;
    let mut referenced = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '(' {
            if grouped {
                valid = false;
                break;
            }
            grouped = true;
            position += 1;
            while position < source.len() && source[position] != ')' {
                let member = source[position];
                if member == '\\'
                    || member == '.'
                    || member == '^'
                    || member == '$'
                    || member == '*'
                    || member == '+'
                    || member == '?'
                    || member == '{'
                    || member == '}'
                    || member == '['
                    || member == ']'
                    || member == '('
                    || member == '|'
                {
                    valid = false;
                    break;
                }
                capture.push(member);
                result.push(member);
                position += 1;
            }
            if valid == false || position == source.len() || capture.len() == 0 {
                valid = false;
                break;
            }
            position += 1;
            if position < source.len()
                && (source[position] == '*'
                    || source[position] == '+'
                    || source[position] == '?'
                    || source[position] == '{')
            {
                valid = false;
                break;
            }
        } else if atom == '\\' {
            if source.len() - position <= 1
                || source[position + 1] != '1'
                || grouped == false
                || referenced
            {
                valid = false;
                break;
            }
            referenced = true;
            let mut index = 0;
            while index < capture.len() {
                result.push(capture[index]);
                index += 1;
            }
            position += 2;
        } else if atom == ')' || atom == '|' {
            valid = false;
            break;
        } else {
            result.push(atom);
            position += 1;
        };
    }
    FixedBackrefResult {
        valid: valid && grouped && referenced,
        atoms: result,
    }
}

pub fn supports_fixed_backref(pattern: &str, expanded: bool) -> bool {
    let parsed = fixed_backref_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

fn single_capture_atoms(pattern: &str, expanded: bool) -> SingleCaptureResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut atom: Vec<char> = Vec::new();
    let mut between: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut repeated = false;
    let mut zero_allowed = false;
    while position < source.len() && source[position] != '(' {
        if simple_literal_char(source[position]) == false {
            valid = false;
            break;
        }
        prefix.push(source[position]);
        position += 1;
    }
    if position == source.len() {
        valid = false;
    }
    if valid {
        position += 1;
        if position == source.len() {
            valid = false;
        } else if source[position] == '[' {
            atom.push('[');
            position += 1;
            while position < source.len() && source[position] != ']' {
                if source[position] == '\\' || source[position] == '[' {
                    valid = false;
                    break;
                }
                atom.push(source[position]);
                position += 1;
            }
            if position == source.len() || atom.len() == 1 {
                valid = false;
            }
            if valid {
                atom.push(']');
                position += 1;
            }
        } else if source[position] == '.' {
            atom.push('.');
            position += 1;
        } else if source[position] == '\\' {
            if source.len() - position <= 1 {
                valid = false;
            } else {
                let escaped = source[position + 1];
                if escaped != 'd'
                    && escaped != 'D'
                    && escaped != 's'
                    && escaped != 'S'
                    && escaped != 'w'
                    && escaped != 'W'
                {
                    valid = false;
                } else {
                    atom.push('\\');
                    atom.push(escaped);
                    position += 2;
                };
            };
        } else if simple_literal_char(source[position]) {
            atom.push(source[position]);
            position += 1;
        } else {
            valid = false;
        };
    }
    if valid {
        if position < source.len() && (source[position] == '+' || source[position] == '*') {
            repeated = true;
            zero_allowed = source[position] == '*';
            position += 1;
        }
    }
    if valid {
        if position == source.len() || source[position] != ')' {
            valid = false;
        } else {
            position += 1;
        };
    }
    if valid {
        while position < source.len() && source[position] != '\\' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            between.push(source[position]);
            position += 1;
        }
        if source.len() - position < 2 || source[position + 1] != '1' {
            valid = false;
        }
    }
    if valid {
        position += 2;
        while position < source.len() {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            suffix.push(source[position]);
            position += 1;
        }
    }
    SingleCaptureResult {
        valid,
        repeated,
        zero_allowed,
        prefix,
        atom,
        between,
        suffix,
    }
}

pub fn supports_single_capture_backref(pattern: &str, expanded: bool) -> bool {
    let parsed = single_capture_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atom)
}

fn inline_atoms(pattern: &str, expanded: bool) -> InlineResult {
    let source: Vec<char> = pattern.chars().collect();
    let mut valid = source.len() >= 4;
    let mut mode = ' ';
    if valid {
        mode = source[2];
        valid = source[0] == '('
            && source[1] == '?'
            && source[3] == ')'
            && (mode == 'i'
                || mode == 'c'
                || mode == 'n'
                || mode == 'p'
                || mode == 'w'
                || mode == 'x'
                || mode == 't'
                || mode == 'b'
                || mode == 'e'
                || mode == 'q');
    }
    let mut effective_expanded = expanded;
    if mode == 'x' {
        effective_expanded = true;
    } else if mode == 't' {
        effective_expanded = false;
    } else if mode == 'q' {
        effective_expanded = false;
    }
    let normalized = pattern_atoms(pattern, effective_expanded);
    let mut atoms: Vec<char> = Vec::new();
    if valid {
        let mut position = 4;
        while position < normalized.len() {
            let atom = normalized[position];
            if mode == 'e' && atom == '\\'
                || mode == 'b' && (atom == '\\' || atom == '[' || atom == ']')
            {
                valid = false;
                break;
            }
            if mode == 'b'
                && (atom == '+'
                    || atom == '?'
                    || atom == '|'
                    || atom == '('
                    || atom == ')'
                    || atom == '{'
                    || atom == '}')
                || mode == 'q'
                    && (atom == '\\'
                        || atom == '.'
                        || atom == '^'
                        || atom == '$'
                        || atom == '*'
                        || atom == '+'
                        || atom == '?'
                        || atom == '|'
                        || atom == '('
                        || atom == ')'
                        || atom == '['
                        || atom == ']'
                        || atom == '{'
                        || atom == '}')
            {
                atoms.push('\\');
            }
            atoms.push(atom);
            position += 1;
        }
    }
    InlineResult { valid, mode, atoms }
}

pub fn supports_inline_advanced(pattern: &str, expanded: bool) -> bool {
    let parsed = inline_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

fn simple_literal_char(atom: char) -> bool {
    atom != '\\'
        && atom != '.'
        && atom != '^'
        && atom != '$'
        && atom != '*'
        && atom != '+'
        && atom != '?'
        && atom != '{'
        && atom != '}'
        && atom != '['
        && atom != ']'
        && atom != '('
        && atom != ')'
        && atom != '|'
}

fn bounded_group_atoms(pattern: &str, expanded: bool) -> BoundedGroupResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut member: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut lower = 0;
    let mut upper = 0;
    while position < source.len() && source[position] != '(' {
        if simple_literal_char(source[position]) == false {
            valid = false;
            break;
        }
        prefix.push(source[position]);
        position += 1;
    }
    if position == source.len() {
        valid = false;
    }
    if valid {
        position += 1;
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            member.push(source[position]);
            position += 1;
        }
        if position == source.len() || member.len() == 0 || member.len() > 16 {
            valid = false;
        }
    }
    if valid {
        position += 1;
        if position == source.len()
            || (source[position] != '{' && source[position] != '*' && source[position] != '+')
        {
            valid = false;
        }
    }
    if valid && (source[position] == '*' || source[position] == '+') {
        if source[position] == '+' {
            lower = 1;
        }
        upper = MAX_CAPTURE_WORK;
        position += 1;
    } else if valid {
        position += 1;
        let mut digits = 0;
        while position < source.len()
            && (source[position] as u32) >= 48
            && (source[position] as u32) <= 57
        {
            let double = lower + lower;
            let four = double + double;
            let eight = four + four;
            lower = eight + double + ((source[position] as u32) - 48) as usize;
            digits += 1;
            position += 1;
            if digits > 2 {
                valid = false;
                break;
            }
        }
        if digits == 0 || lower > 16 || position == source.len() {
            valid = false;
        }
    }
    if valid && upper != MAX_CAPTURE_WORK {
        upper = lower;
        if source[position] == ',' {
            position += 1;
            let mut digits = 0;
            upper = 0;
            while position < source.len()
                && (source[position] as u32) >= 48
                && (source[position] as u32) <= 57
            {
                let double = upper + upper;
                let four = double + double;
                let eight = four + four;
                upper = eight + double + ((source[position] as u32) - 48) as usize;
                digits += 1;
                position += 1;
                if digits > 2 {
                    valid = false;
                    break;
                }
            }
            if digits == 0 || upper > 16 || upper < lower {
                valid = false;
            }
        }
        if position == source.len() || source[position] != '}' {
            valid = false;
        }
    }
    if valid {
        if upper != MAX_CAPTURE_WORK {
            position += 1;
        }
        while position < source.len() {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            suffix.push(source[position]);
            position += 1;
        }
        let mut size = prefix.len() + suffix.len();
        let mut repeat = 0;
        while repeat < upper && upper != MAX_CAPTURE_WORK {
            size += member.len();
            repeat += 1;
        }
        if size > 256 {
            valid = false;
        }
    }
    BoundedGroupResult {
        valid,
        prefix,
        member,
        suffix,
        lower,
        upper,
    }
}

pub fn supports_bounded_group(pattern: &str, expanded: bool) -> bool {
    let parsed = bounded_group_atoms(pattern, expanded);
    parsed.valid
}

pub fn supports_extended_group(pattern: &str, expanded: bool) -> bool {
    let source: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    while position < source.len() {
        if source[position] == '\\' {
            return false;
        }
        position += 1;
    }
    supports_flat_groups(pattern, expanded)
        || supports_group_choice(pattern, expanded)
        || supports_optional_group(pattern, expanded)
        || supports_bounded_group(pattern, expanded)
}

fn basic_literal_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut translated = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\'
            || atom == '['
            || atom == ']'
            || (atom == '^' && position != 0)
            || (atom == '$' && position + 1 != source.len())
        {
            valid = false;
            break;
        }
        if atom == '+'
            || atom == '?'
            || atom == '|'
            || atom == '('
            || atom == ')'
            || atom == '{'
            || atom == '}'
        {
            atoms.push('\\');
            translated = true;
        }
        atoms.push(atom);
        position += 1;
    }
    BasicLiteralResult {
        valid: valid && translated,
        atoms,
    }
}

pub fn supports_basic_literal_punctuation(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_literal_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

fn extended_escape_atoms(pattern: &str, expanded: bool) -> ExtendedEscapeResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut bracket = false;
    let mut valid = true;
    let mut translated = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 || bracket {
                valid = false;
                break;
            }
            let escaped = source[position + 1];
            let codepoint = escaped as u32;
            if (codepoint >= 65 && codepoint <= 90) || (codepoint >= 97 && codepoint <= 122) {
                atoms.push(escaped);
                translated = true;
            } else if escaped == '.'
                || escaped == '^'
                || escaped == '$'
                || escaped == '*'
                || escaped == '+'
                || escaped == '?'
                || escaped == '|'
                || escaped == '('
                || escaped == ')'
                || escaped == '['
                || escaped == ']'
                || escaped == '{'
                || escaped == '}'
                || escaped == '\\'
            {
                atoms.push(atom);
                atoms.push(escaped);
            } else {
                valid = false;
                break;
            }
            position += 2;
        } else {
            if atom == '[' && bracket == false {
                bracket = true;
            } else if atom == ']' && bracket {
                bracket = false;
            }
            atoms.push(atom);
            position += 1;
        };
    }
    ExtendedEscapeResult {
        valid: valid && translated && bracket == false,
        atoms,
    }
}

pub fn supports_extended_literal_escape(pattern: &str, expanded: bool) -> bool {
    let parsed = extended_escape_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn supports_basic_letter_escape(pattern: &str, expanded: bool) -> bool {
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 {
                return false;
            }
            let escaped = source[position + 1];
            if escaped == '('
                || escaped == ')'
                || escaped == '{'
                || escaped == '}'
                || ((escaped as u32) >= 48 && (escaped as u32) <= 57)
            {
                return false;
            }
            position += 2;
        } else {
            if atom == '+'
                || atom == '?'
                || atom == '|'
                || atom == '('
                || atom == ')'
                || atom == '{'
                || atom == '}'
                || (atom == '^' && position != 0)
                || (atom == '$' && position + 1 != source.len())
            {
                return false;
            }
            position += 1;
        };
    }
    supports_extended_literal_escape(pattern, expanded)
}

fn basic_bound_atoms(pattern: &str, expanded: bool) -> BasicBoundResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut bracket = false;
    let mut valid = true;
    let mut bounded = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 || bracket {
                valid = false;
                break;
            }
            let escaped = source[position + 1];
            if escaped == '{' {
                if source.len() - position <= 2
                    || (source[position + 2] as u32) < 48
                    || (source[position + 2] as u32) > 57
                {
                    valid = false;
                    break;
                }
                atoms.push('{');
                bounded = true;
            } else if escaped == '}' {
                atoms.push('}');
            } else if escaped == '.'
                || escaped == '^'
                || escaped == '$'
                || escaped == '*'
                || escaped == '+'
                || escaped == '?'
                || escaped == '|'
                || escaped == '['
                || escaped == ']'
                || escaped == '\\'
            {
                atoms.push(atom);
                atoms.push(escaped);
            } else {
                valid = false;
                break;
            }
            position += 2;
        } else {
            if atom == '[' && bracket == false {
                bracket = true;
            } else if atom == ']' && bracket {
                bracket = false;
            }
            if bracket == false
                && (atom == '+'
                    || atom == '?'
                    || atom == '|'
                    || atom == '('
                    || atom == ')'
                    || atom == '{'
                    || atom == '}'
                    || (atom == '^' && position != 0)
                    || (atom == '$' && position + 1 != source.len()))
            {
                valid = false;
                break;
            }
            atoms.push(atom);
            position += 1;
        };
    }
    BasicBoundResult {
        valid: valid && bounded && bracket == false,
        atoms,
    }
}

pub fn supports_basic_escaped_bound(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_bound_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

fn basic_fixed_backref_atoms(pattern: &str, expanded: bool) -> FixedBackrefResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut capture: Vec<char> = Vec::new();
    let mut position = 0;
    let mut grouped = false;
    let mut referenced = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            if source.len() - position <= 1 {
                valid = false;
                break;
            }
            let escaped = source[position + 1];
            if escaped == '(' && grouped == false {
                grouped = true;
                position += 2;
                while position < source.len() {
                    if source[position] == '\\'
                        && source.len() - position > 1
                        && source[position + 1] == ')'
                    {
                        break;
                    }
                    if simple_literal_char(source[position]) == false {
                        valid = false;
                        break;
                    }
                    capture.push(source[position]);
                    atoms.push(source[position]);
                    position += 1;
                }
                if valid == false || source.len() - position <= 1 || capture.len() == 0 {
                    valid = false;
                    break;
                }
                position += 2;
            } else if escaped == '1' && grouped && referenced == false {
                referenced = true;
                let mut index = 0;
                while index < capture.len() {
                    atoms.push(capture[index]);
                    index += 1;
                }
                position += 2;
            } else {
                valid = false;
                break;
            };
        } else {
            if simple_literal_char(atom) == false {
                valid = false;
                break;
            }
            atoms.push(atom);
            position += 1;
        };
    }
    FixedBackrefResult {
        valid: valid && grouped && referenced,
        atoms,
    }
}

pub fn supports_basic_fixed_backref(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_fixed_backref_atoms(pattern, expanded);
    parsed.valid
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
                && escaped != ' '
            {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
        }
        if atom == '['
            && atoms.len() - position >= 11
            && atoms[position + 1] == '['
            && atoms[position + 2] == ':'
            && atoms[position + 8] == ':'
            && atoms[position + 9] == ']'
            && atoms[position + 10] == ']'
        {
            if posix_class_kind(
                atoms[position + 3],
                atoms[position + 4],
                atoms[position + 5],
                atoms[position + 6],
                atoms[position + 7],
            ) == 0
            {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
            position += 10;
        } else if atom == '[' {
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
                            let unicode = first >= 128 && last >= 128;
                            if first > last
                                || (digits == false
                                    && uppercase == false
                                    && lowercase == false
                                    && unicode == false)
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
                } else if escaped == false
                    && atom == '['
                    && atoms.len() - atom_position >= 11
                    && atoms[atom_position + 1] == '['
                    && atoms[atom_position + 2] == ':'
                    && atoms[atom_position + 8] == ':'
                    && atoms[atom_position + 9] == ']'
                    && atoms[atom_position + 10] == ']'
                {
                    let kind = posix_class_kind(
                        atoms[atom_position + 3],
                        atoms[atom_position + 4],
                        atoms[atom_position + 5],
                        atoms[atom_position + 6],
                        atoms[atom_position + 7],
                    );
                    if subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        let codepoint = actual as u32;
                        let digit = codepoint >= 48 && codepoint <= 57;
                        let upper = codepoint >= 65 && codepoint <= 90;
                        let lower = codepoint >= 97 && codepoint <= 122;
                        let space = (codepoint >= 9 && codepoint <= 13) || actual == ' ';
                        matched = (kind == 1 && digit)
                            || (kind == 2 && (upper || lower))
                            || (kind == 3 && (upper || (case_sensitive == false && lower)))
                            || (kind == 4 && space);
                        if matched {
                            consumed = 1;
                        }
                    };
                    atom_end = atom_position + 11;
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

pub fn find_flat_groups(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = flat_group_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        parsed.atoms,
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

fn search_group_choice(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let parsed = group_choice_atoms(pattern, expanded);
    search_two_arms(
        parsed,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    )
}

fn search_two_arms(
    parsed: GroupChoiceResult,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> SearchResult {
    if parsed.valid == false {
        return SearchResult {
            kind: 2,
            start: 0,
            end: 0,
        };
    }
    let left = search_atoms(
        parsed.left,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    );
    let right = search_atoms(
        parsed.right,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    );
    if left.kind == 2 || right.kind == 2 {
        return SearchResult {
            kind: 2,
            start: 0,
            end: 0,
        };
    }
    if left.kind == 1 && right.kind == 1 {
        return left;
    }
    if right.kind == 1
        || (left.kind == 0
            && (left.start < right.start || (left.start == right.start && left.end >= right.end)))
    {
        return left;
    }
    right
}

pub fn find_optional_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = optional_group_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_two_arms(
        parsed,
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

pub fn find_group_choice(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_group_choice(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

pub fn count_group_choice(
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
        let result = search_group_choice(
            pattern,
            subject,
            position,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
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

fn search_fixed_lookbehind(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let haystack: Vec<char> = subject.chars().collect();
    let mut cursor = from;
    let mut attempts = 0;
    while cursor <= haystack.len() {
        if attempts == MAX_ASSERTION_ATTEMPTS {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        attempts += 1;
        let parsed = fixed_lookbehind_atoms(pattern, expanded);
        if parsed.valid == false {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        let result = search_atoms(
            parsed.remainder,
            subject,
            cursor,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if result.kind != 0 {
            return result;
        }
        let mut preceding = result.start >= parsed.prefix.len();
        if preceding {
            let mut index = 0;
            while index < parsed.prefix.len() {
                let actual = haystack[result.start - parsed.prefix.len() + index];
                let expected = parsed.prefix[index];
                if actual != expected
                    && (case_sensitive
                        || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                {
                    preceding = false;
                    break;
                }
                index += 1;
            }
        }
        if preceding == parsed.positive {
            return result;
        }
        cursor = result.start + 1;
    }
    SearchResult {
        kind: 1,
        start: 0,
        end: 0,
    }
}

pub fn find_fixed_lookbehind(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_fixed_lookbehind(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

pub fn count_fixed_lookbehind(
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
        let result = search_fixed_lookbehind(
            pattern,
            subject,
            position,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
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

fn search_leading_lookahead(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let haystack: Vec<char> = subject.chars().collect();
    let mut cursor = from;
    let mut attempts = 0;
    while cursor <= haystack.len() {
        if attempts == MAX_ASSERTION_ATTEMPTS {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        attempts += 1;
        let parsed = leading_lookahead_atoms(pattern, expanded);
        if parsed.valid == false {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        let result = search_atoms(
            parsed.remainder,
            subject,
            cursor,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if result.kind != 0 {
            return result;
        }
        let assertion = search_atoms(
            parsed.assertion,
            subject,
            result.start,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if assertion.kind == 2 {
            return assertion;
        }
        let holds = assertion.kind == 0 && assertion.start == result.start;
        if holds == parsed.positive {
            return result;
        }
        cursor = result.start + 1;
    }
    SearchResult {
        kind: 1,
        start: 0,
        end: 0,
    }
}

pub fn find_leading_lookahead(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_leading_lookahead(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

pub fn count_leading_lookahead(
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
        let result = search_leading_lookahead(
            pattern,
            subject,
            position,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
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

fn search_middle_lookahead(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let haystack: Vec<char> = subject.chars().collect();
    let mut cursor = from;
    let mut attempts = 0;
    while cursor <= haystack.len() {
        if attempts == MAX_ASSERTION_ATTEMPTS {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        attempts += 1;
        let parsed = middle_lookahead_atoms(pattern, expanded);
        if parsed.valid == false {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        let result = search_atoms(
            parsed.remainder,
            subject,
            cursor,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if result.kind != 0 {
            return result;
        }
        let assertion_start = result.start + parsed.offset;
        let assertion = search_atoms(
            parsed.assertion,
            subject,
            assertion_start,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if assertion.kind == 2 {
            return assertion;
        }
        let holds = assertion.kind == 0 && assertion.start == assertion_start;
        if holds == parsed.positive {
            return result;
        }
        cursor = result.start + 1;
    }
    SearchResult {
        kind: 1,
        start: 0,
        end: 0,
    }
}

pub fn find_middle_lookahead(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_middle_lookahead(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

fn search_fixed_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let parsed = fixed_backref_atoms(pattern, expanded);
    if parsed.valid == false {
        return SearchResult {
            kind: 2,
            start: 0,
            end: 0,
        };
    }
    search_atoms(
        parsed.atoms,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    )
}

pub fn find_fixed_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_fixed_backref(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

pub fn find_single_capture_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = single_capture_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    if parsed.repeated {
        if parsed.zero_allowed {
            return find_star_capture_backref(
                pattern,
                subject,
                from,
                case_sensitive,
                dot_crosses_newline,
                line_anchors,
                expanded,
            );
        }
        return find_repeated_capture_backref(
            pattern,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
        );
    }
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut states: Vec<CaptureState> = Vec::new();
    if haystack.len() - from < parsed.prefix.len() {
        return MatchOutcome::NoMatch;
    }
    let mut search_from = from + parsed.prefix.len();
    let mut truncated = false;
    while search_from < haystack.len() {
        let mut atom: Vec<char> = Vec::new();
        let mut index = 0;
        while index < parsed.atom.len() {
            atom.push(parsed.atom[index]);
            index += 1;
        }
        let result = search_atoms(
            atom,
            subject,
            search_from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if result.kind == 2 {
            return MatchOutcome::Uncertain;
        }
        if result.kind == 1 {
            break;
        }
        if result.end != result.start + 1 {
            return MatchOutcome::Uncertain;
        }
        let start = result.start - parsed.prefix.len();
        let mut matches = true;
        index = 0;
        while index < parsed.prefix.len() {
            let actual = haystack[start + index];
            let expected = parsed.prefix[index];
            if actual != expected
                && (case_sensitive || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
            {
                matches = false;
            }
            index += 1;
        }
        if matches {
            states.push(CaptureState {
                start,
                capture: result.start,
                capture_end: result.end,
            });
            if states.len() == MAX_CAPTURE_WORK {
                truncated = true;
                break;
            }
        }
        search_from = result.start + 1;
    }
    let mut cursor = 0;
    while cursor < states.len() {
        let state = states[cursor];
        let mut matches = true;
        let mut position = state.capture + 1;
        if matches {
            let mut index = 0;
            while index < parsed.between.len() {
                if position == haystack.len() {
                    matches = false;
                    break;
                }
                let actual = haystack[position];
                let expected = parsed.between[index];
                if actual != expected
                    && (case_sensitive
                        || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                {
                    matches = false;
                    break;
                }
                position += 1;
                index += 1;
            }
        }
        if matches {
            if position == haystack.len() {
                matches = false;
            } else {
                let actual = haystack[position];
                let expected = haystack[state.capture];
                if actual != expected
                    && (case_sensitive
                        || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                {
                    matches = false;
                }
                position += 1;
            };
        }
        if matches {
            let mut index = 0;
            while index < parsed.suffix.len() {
                if position == haystack.len() {
                    matches = false;
                    break;
                }
                let actual = haystack[position];
                let expected = parsed.suffix[index];
                if actual != expected
                    && (case_sensitive
                        || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                {
                    matches = false;
                    break;
                }
                position += 1;
                index += 1;
            }
        }
        if matches {
            return MatchOutcome::Found(MatchSpan {
                start: state.start,
                end: position,
            });
        }
        cursor += 1;
    }
    if truncated {
        return MatchOutcome::Uncertain;
    }
    MatchOutcome::NoMatch
}

fn search_repeated_capture_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let parsed = single_capture_atoms(pattern, expanded);
    if parsed.valid == false || parsed.repeated == false {
        return SearchResult {
            kind: 2,
            start: 0,
            end: 0,
        };
    }
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() || haystack.len() - from < parsed.prefix.len() {
        return SearchResult {
            kind: 1,
            start: 0,
            end: 0,
        };
    }
    let mut search_from = from + parsed.prefix.len();
    let mut work = 0;
    while search_from < haystack.len() {
        if work == MAX_CAPTURE_WORK {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        work += 1;
        let mut atom: Vec<char> = Vec::new();
        let mut index = 0;
        while index < parsed.atom.len() {
            atom.push(parsed.atom[index]);
            index += 1;
        }
        let first = search_atoms(
            atom,
            subject,
            search_from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if first.kind == 2 {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        if first.kind == 1 {
            break;
        }
        if first.end != first.start + 1 {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
        let start = first.start - parsed.prefix.len();
        let mut prefix_matches = true;
        index = 0;
        while index < parsed.prefix.len() {
            let actual = haystack[start + index];
            let expected = parsed.prefix[index];
            if actual != expected
                && (case_sensitive || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
            {
                prefix_matches = false;
            }
            index += 1;
        }
        if prefix_matches {
            let mut states: Vec<CaptureState> = Vec::new();
            let mut capture_end = first.start;
            let mut atom_matches = true;
            while atom_matches && capture_end < haystack.len() {
                if work == MAX_CAPTURE_WORK {
                    return SearchResult {
                        kind: 2,
                        start: 0,
                        end: 0,
                    };
                }
                work += 1;
                let mut member: Vec<char> = Vec::new();
                index = 0;
                while index < parsed.atom.len() {
                    member.push(parsed.atom[index]);
                    index += 1;
                }
                let result = search_atoms(
                    member,
                    subject,
                    capture_end,
                    case_sensitive,
                    dot_crosses_newline,
                    line_anchors,
                );
                if result.kind == 2 {
                    return SearchResult {
                        kind: 2,
                        start: 0,
                        end: 0,
                    };
                }
                atom_matches = result.kind == 0
                    && result.start == capture_end
                    && result.end == capture_end + 1;
                if atom_matches {
                    capture_end += 1;
                    states.push(CaptureState {
                        start,
                        capture: first.start,
                        capture_end,
                    });
                }
            }
            let mut cursor = states.len();
            while cursor > 0 {
                cursor = cursor - 1;
                let state = states[cursor];
                let mut matches = true;
                let mut position = state.capture_end;
                index = 0;
                while index < parsed.between.len() {
                    if position == haystack.len() {
                        matches = false;
                        break;
                    }
                    let actual = haystack[position];
                    let expected = parsed.between[index];
                    if actual != expected
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                    {
                        matches = false;
                        break;
                    }
                    position += 1;
                    index += 1;
                }
                let mut offset = 0;
                while matches && offset < state.capture_end - state.capture {
                    if position == haystack.len() || work == MAX_CAPTURE_WORK {
                        if work == MAX_CAPTURE_WORK {
                            return SearchResult {
                                kind: 2,
                                start: 0,
                                end: 0,
                            };
                        }
                        matches = false;
                        break;
                    }
                    work += 1;
                    let actual = haystack[position];
                    let expected = haystack[state.capture + offset];
                    if actual != expected
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                    {
                        matches = false;
                        break;
                    }
                    position += 1;
                    offset += 1;
                }
                index = 0;
                while matches && index < parsed.suffix.len() {
                    if position == haystack.len() {
                        matches = false;
                        break;
                    }
                    let actual = haystack[position];
                    let expected = parsed.suffix[index];
                    if actual != expected
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                    {
                        matches = false;
                        break;
                    }
                    position += 1;
                    index += 1;
                }
                if matches {
                    return SearchResult {
                        kind: 0,
                        start: state.start,
                        end: position,
                    };
                }
            }
        }
        search_from = first.start + 1;
    }
    SearchResult {
        kind: 1,
        start: 0,
        end: 0,
    }
}

fn find_repeated_capture_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_repeated_capture_backref(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

fn find_star_capture_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = single_capture_atoms(pattern, expanded);
    if parsed.valid == false || parsed.zero_allowed == false {
        return MatchOutcome::Uncertain;
    }
    let mut empty: Vec<char> = Vec::new();
    let mut index = 0;
    while index < parsed.prefix.len() {
        empty.push(parsed.prefix[index]);
        index += 1;
    }
    index = 0;
    while index < parsed.between.len() {
        empty.push(parsed.between[index]);
        index += 1;
    }
    index = 0;
    while index < parsed.suffix.len() {
        empty.push(parsed.suffix[index]);
        index += 1;
    }
    let zero = search_atoms(
        empty,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    );
    let nonzero = search_repeated_capture_backref(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
    );
    if zero.kind == 2 || nonzero.kind == 2 {
        return MatchOutcome::Uncertain;
    }
    if zero.kind == 1 && nonzero.kind == 1 {
        return MatchOutcome::NoMatch;
    }
    if nonzero.kind == 1
        || (zero.kind == 0
            && (zero.start < nonzero.start
                || (zero.start == nonzero.start && zero.end >= nonzero.end)))
    {
        return MatchOutcome::Found(MatchSpan {
            start: zero.start,
            end: zero.end,
        });
    }
    MatchOutcome::Found(MatchSpan {
        start: nonzero.start,
        end: nonzero.end,
    })
}

pub fn count_fixed_backref(
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
        let result = search_fixed_backref(
            pattern,
            subject,
            position,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
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

pub fn find_inline_advanced(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = inline_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let mut sensitive = case_sensitive;
    let mut crosses = dot_crosses_newline;
    let mut anchors = line_anchors;
    if parsed.mode == 'i' {
        sensitive = false;
    } else if parsed.mode == 'c' {
        sensitive = true;
    } else if parsed.mode == 'n' {
        crosses = false;
        anchors = true;
    } else if parsed.mode == 'p' {
        crosses = false;
        anchors = false;
    } else if parsed.mode == 'w' {
        crosses = true;
        anchors = true;
    }
    let result = search_atoms(parsed.atoms, subject, from, sensitive, crosses, anchors);
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

fn search_bounded_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> SearchResult {
    let parsed = bounded_group_atoms(pattern, expanded);
    if parsed.valid == false {
        return SearchResult {
            kind: 2,
            start: 0,
            end: 0,
        };
    }
    let mut upper = parsed.upper;
    if upper == MAX_CAPTURE_WORK {
        let haystack: Vec<char> = subject.chars().collect();
        upper = 0;
        let mut consumed = 0;
        while haystack.len() - consumed >= parsed.member.len() && consumed <= 256 {
            consumed += parsed.member.len();
            upper += 1;
        }
        if consumed > 256 - parsed.prefix.len() - parsed.suffix.len() {
            return SearchResult {
                kind: 2,
                start: 0,
                end: 0,
            };
        }
    }
    let mut repetitions = parsed.lower;
    let mut found = false;
    let mut best_start = 0;
    let mut best_end = 0;
    while repetitions <= upper {
        let mut atoms: Vec<char> = Vec::new();
        let mut index = 0;
        while index < parsed.prefix.len() {
            atoms.push(parsed.prefix[index]);
            index += 1;
        }
        let mut repeat = 0;
        while repeat < repetitions {
            index = 0;
            while index < parsed.member.len() {
                atoms.push(parsed.member[index]);
                index += 1;
            }
            repeat += 1;
        }
        index = 0;
        while index < parsed.suffix.len() {
            atoms.push(parsed.suffix[index]);
            index += 1;
        }
        let result = search_atoms(
            atoms,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if result.kind == 2 {
            return result;
        }
        if result.kind == 0
            && (found == false
                || result.start < best_start
                || (result.start == best_start && result.end > best_end))
        {
            found = true;
            best_start = result.start;
            best_end = result.end;
        }
        repetitions += 1;
    }
    if found {
        return SearchResult {
            kind: 0,
            start: best_start,
            end: best_end,
        };
    }
    SearchResult {
        kind: 1,
        start: 0,
        end: 0,
    }
}

pub fn find_bounded_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let result = search_bounded_group(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
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

pub fn find_extended_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_flat_groups(pattern, expanded) {
        return find_flat_groups(
            pattern,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
        );
    }
    if supports_group_choice(pattern, expanded) {
        return find_group_choice(
            pattern,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
        );
    }
    if supports_optional_group(pattern, expanded) {
        return find_optional_group(
            pattern,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
        );
    }
    if supports_bounded_group(pattern, expanded) {
        return find_bounded_group(
            pattern,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            expanded,
        );
    }
    MatchOutcome::Uncertain
}

pub fn find_basic_literal_punctuation(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = basic_literal_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        parsed.atoms,
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

pub fn find_extended_literal_escape(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = extended_escape_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        parsed.atoms,
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

pub fn find_basic_letter_escape(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    find_extended_literal_escape(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
    )
}

pub fn find_basic_escaped_bound(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = basic_bound_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        parsed.atoms,
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

pub fn find_basic_fixed_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = basic_fixed_backref_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        parsed.atoms,
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
