const MAX_CAPTURE_WORK: usize = 2000000;
const MAX_ASSERTION_ATTEMPTS: usize = 4096;
const VM_LITERAL: usize = 1;
const VM_ANY: usize = 2;
const VM_WORD: usize = 3;
const VM_OPEN: usize = 4;
const VM_CLOSE: usize = 5;
const VM_BACKREF: usize = 6;
const VM_SPLIT: usize = 7;
const VM_BEGIN: usize = 8;
const VM_END: usize = 9;
const VM_ACCEPT: usize = 10;
const VM_JUMP: usize = 11;
const VM_CLASS: usize = 12;
const VM_NUMERIC: usize = 13;

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

struct NonCaptureResult {
    valid: bool,
    prefix: Vec<char>,
    branches: Vec<char>,
    suffix: Vec<char>,
}

struct LookbehindResult {
    valid: bool,
    positive: bool,
    anchored: bool,
    prefix: Vec<char>,
    alternate: Vec<char>,
    split: bool,
    remainder: Vec<char>,
}

struct AnchorLookbehindResult {
    valid: bool,
    prefix: Vec<char>,
    remainder: Vec<char>,
}

struct LookaheadResult {
    valid: bool,
    positive: bool,
    behind: bool,
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

struct RepeatedBackrefResult {
    valid: bool,
    prefix: Vec<char>,
    member: Vec<char>,
    suffix: Vec<char>,
    suffix_anchor: bool,
    lower: usize,
    upper: usize,
}

struct ChoiceCaptureResult {
    valid: bool,
    prefix: Vec<char>,
    first: Vec<char>,
    second: Vec<char>,
    between: Vec<char>,
    suffix: Vec<char>,
}

struct RepeatedChoiceResult {
    valid: bool,
    prefix: Vec<char>,
    first: Vec<char>,
    second: Vec<char>,
    suffix: Vec<char>,
    lower: usize,
    upper: usize,
    backref: bool,
    lazy: bool,
}

#[derive(Clone, Copy)]
struct RepeatedChoiceState {
    position: usize,
    repetitions: usize,
    capture_start: usize,
    capture_end: usize,
    first_length: usize,
}

#[derive(Clone, Copy)]
struct CaptureState {
    start: usize,
    capture: usize,
    capture_end: usize,
}

struct TwoCaptureResult {
    valid: bool,
    first: char,
    first_quantifier: char,
    first_lazy: bool,
    second: char,
    second_quantifier: char,
    second_reference: bool,
}

#[derive(Clone, Copy)]
struct PatternWorkState {
    pattern: usize,
    subject: usize,
}

#[derive(Clone, Copy)]
struct CaptureInstruction {
    operation: usize,
    target: usize,
    alternate: usize,
    group: usize,
    atom: char,
}

struct CaptureProgram {
    valid: bool,
    instructions: Vec<CaptureInstruction>,
    noncapturing: usize,
    atoms: Vec<char>,
}

#[derive(Clone, Copy)]
struct CaptureFrame {
    group: usize,
    start: usize,
    starred: bool,
    choice: bool,
    split: usize,
    jump: usize,
    branched: bool,
}

#[derive(Clone, Copy)]
struct CaptureEvent {
    group: usize,
    start: usize,
    end: usize,
    previous: usize,
    closed: bool,
}

#[derive(Clone, Copy)]
struct CaptureWorkState {
    instruction: usize,
    subject: usize,
    capture: usize,
}

struct TwoChoiceResult {
    valid: bool,
    first_left: Vec<char>,
    first_right: Vec<char>,
    second_left: Vec<char>,
    second_right: Vec<char>,
    second_reference: bool,
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

struct NumericEscapeResult {
    recognized: bool,
    valid: bool,
    value: usize,
    next: usize,
}

struct NumericLiteralResult {
    valid: bool,
    atoms: Vec<usize>,
}

struct InlineOptionsResult {
    valid: bool,
    syntax: char,
    case_mode: char,
    newline_mode: char,
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

pub fn supports_quoted_literal(pattern: &str) -> bool {
    let source: Vec<char> = pattern.chars().collect();
    source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && source[3] == '='
}

pub fn find_quoted_literal(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
) -> MatchOutcome {
    if supports_quoted_literal(pattern) == false {
        return MatchOutcome::Uncertain;
    }
    let needle: Vec<char> = pattern.chars().collect();
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut start = from;
    while start <= haystack.len() {
        let mut offset = 0;
        while offset + 4 < needle.len() && offset < haystack.len() - start {
            let actual = haystack[start + offset];
            let expected = needle[offset + 4];
            if actual != expected
                && (case_sensitive || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
            {
                break;
            }
            offset += 1;
        }
        if offset + 4 == needle.len() {
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

fn numeric_hex_digit(atom: char) -> usize {
    let codepoint = atom as u32;
    if codepoint >= 48 && codepoint <= 57 {
        return (codepoint - 48) as usize;
    }
    if codepoint >= 65 && codepoint <= 70 {
        return (codepoint - 55) as usize;
    }
    if codepoint >= 97 && codepoint <= 102 {
        return (codepoint - 87) as usize;
    }
    16
}

fn make_numeric_escape(
    recognized: bool,
    valid: bool,
    value: usize,
    next: usize,
) -> NumericEscapeResult {
    NumericEscapeResult {
        recognized,
        valid,
        value,
        next,
    }
}

fn numeric_escape(pattern: &str, expanded: bool, position: usize) -> NumericEscapeResult {
    let source = pattern_atoms(pattern, expanded);
    if position + 1 >= source.len() {
        return make_numeric_escape(false, false, 0, position + 1);
    }
    let marker = source[position + 1];
    if marker == 'z' {
        return make_numeric_escape(true, false, 0, position + 1);
    }
    if marker == 'c' {
        if position + 2 < source.len() {
            let letter = source[position + 2].to_ascii_lowercase() as u32;
            if letter >= 97 && letter <= 122 {
                return make_numeric_escape(true, true, (letter - 96) as usize, position + 3);
            }
        }
        return make_numeric_escape(true, false, 0, position + 1);
    }
    if marker == 'u' || marker == 'U' || marker == 'x' {
        let mut next = position + 2;
        let mut value = 0;
        let mut digits = 0;
        let mut required = 8;
        if marker == 'u' {
            required = 4;
        };
        while next < source.len() && (marker == 'x' || digits < required) {
            let digit = numeric_hex_digit(source[next]);
            if digit == 16 {
                break;
            }
            if value > 134217727 {
                return make_numeric_escape(true, false, 0, position + 1);
            }
            let double = value + value;
            let four = double + double;
            let eight = four + four;
            value = eight + eight + digit;
            digits += 1;
            next += 1;
        }
        if (marker == 'x' && digits > 0 || marker != 'x' && digits == required)
            && value <= 2147483646
        {
            return make_numeric_escape(true, true, value, next);
        }
        return make_numeric_escape(true, false, 0, position + 1);
    }
    if (marker as u32) >= 48
        && (marker as u32) <= 55
        && (marker == '0'
            || position + 2 < source.len()
                && (source[position + 2] as u32) >= 48
                && (source[position + 2] as u32) <= 57)
    {
        let mut next = position + 1;
        let mut value = 0;
        let mut digits = 0;
        while next < source.len() && digits < 3 {
            let codepoint = source[next] as u32;
            if codepoint < 48 || codepoint > 55 {
                break;
            }
            let double = value + value;
            let four = double + double;
            let candidate = four + four + ((codepoint - 48) as usize);
            if candidate > 255 {
                break;
            }
            value = candidate;
            digits += 1;
            next += 1;
        }
        return make_numeric_escape(true, true, value, next);
    }
    make_numeric_escape(false, false, 0, position + 1)
}

pub fn definitely_invalid_numeric_escape(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    while position < source.len() {
        if source[position] == '\\' && position + 1 < source.len() {
            let marker = source[position + 1];
            if marker == 'u' || marker == 'U' || marker == 'x' || marker == 'z' {
                let parsed = numeric_escape(pattern, expanded, position);
                if parsed.valid == false {
                    return true;
                }
                position = parsed.next;
            } else {
                position += 2;
            };
        } else {
            position += 1;
        };
    }
    false
}

fn numeric_literal_atoms(pattern: &str, expanded: bool) -> NumericLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<usize> = Vec::new();
    let mut position = 0;
    let mut escaped = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' {
            let parsed = numeric_escape(pattern, expanded, position);
            if parsed.recognized == false || parsed.valid == false {
                valid = false;
                break;
            }
            atoms.push(parsed.value);
            position = parsed.next;
            escaped = true;
        } else if simple_literal_char(atom) {
            atoms.push((atom as u32) as usize);
            position += 1;
        } else {
            valid = false;
            break;
        };
    }
    NumericLiteralResult {
        valid: valid && escaped,
        atoms,
    }
}

pub fn supports_numeric_literal_escape(pattern: &str, expanded: bool) -> bool {
    let parsed = numeric_literal_atoms(pattern, expanded);
    parsed.valid
}

pub fn find_numeric_literal_escape(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = numeric_literal_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut start = from;
    while start <= haystack.len() {
        let mut offset = 0;
        while offset < parsed.atoms.len() && offset < haystack.len() - start {
            let actual = haystack[start + offset] as u32;
            let expected = parsed.atoms[offset];
            let mut lowered = expected;
            if expected >= 65 && expected <= 90 {
                lowered += 32;
            }
            if (actual as usize) != expected
                && (case_sensitive
                    || ((haystack[start + offset].to_ascii_lowercase() as u32) as usize) != lowered)
            {
                break;
            }
            offset += 1;
        }
        if offset == parsed.atoms.len() {
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
        } else if atom == '('
            && source.len() - position >= 3
            && source[position + 1] == '?'
            && source[position + 2] == '#'
        {
            let mut comment_end = position + 3;
            while comment_end < source.len() && source[comment_end] != ')' {
                comment_end += 1;
            }
            if comment_end < source.len() {
                position = comment_end + 1;
            } else {
                result.push(atom);
                position += 1;
            };
        } else if expanded && atom == '#' {
            while position < source.len() && source[position] != '\n' {
                position += 1;
            }
            if position < source.len() {
                position += 1;
            }
        } else if expanded && (atom == ' ' || ((atom as u32) >= 9 && (atom as u32) <= 13)) {
            position += 1;
        } else {
            result.push(atom);
            position += 1;
        };
    }
    let mut normalized: Vec<char> = Vec::new();
    position = 0;
    while position < result.len() {
        let mut skipped = false;
        if result.len() - position >= 7
            && result[position] == '('
            && result[position + 1] == '?'
            && result[position + 2] == ':'
        {
            let mut group_end = position + 3;
            let mut bracket = false;
            let mut escaped = false;
            let mut nested = false;
            while group_end < result.len() {
                let atom = result[group_end];
                if escaped {
                    escaped = false;
                } else if atom == '\\' {
                    escaped = true;
                } else if atom == '[' {
                    bracket = true;
                } else if atom == ']' && bracket {
                    bracket = false;
                } else if atom == '(' && bracket == false {
                    nested = true;
                    break;
                } else if atom == ')' && bracket == false {
                    break;
                };
                group_end += 1;
            }
            if nested == false
                && result.len() - group_end >= 4
                && result[group_end] == ')'
                && result[group_end + 1] == '{'
                && result[group_end + 2] == '0'
                && result[group_end + 3] == '}'
            {
                let mut member: Vec<char> = Vec::new();
                let mut index = position + 3;
                while index < group_end {
                    member.push(result[index]);
                    index += 1;
                }
                if supports_atoms(member) {
                    position = group_end + 4;
                    skipped = true;
                }
            }
        }
        if skipped == false {
            normalized.push(result[position]);
            position += 1;
        }
    }
    normalized
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
            if source.len() - position > 2
                && (source[position + 2] == '*'
                    || syntax == 'a'
                        && (source[position + 2] == '+' || source[position + 2] == '?'))
                && (syntax == 'a'
                    && (source[position + 1] == 'A'
                        || source[position + 1] == 'Z'
                        || source[position + 1] == 'm'
                        || source[position + 1] == 'M'
                        || source[position + 1] == 'y'
                        || source[position + 1] == 'Y')
                    || syntax == 'b'
                        && (source[position + 1] == '<' || source[position + 1] == '>'))
            {
                return true;
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
        } else if syntax == 'a'
            && (atom == '^' || atom == '$')
            && source.len() - position > 1
            && (source[position + 1] == '*'
                || source[position + 1] == '+'
                || source[position + 1] == '?')
        {
            return true;
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

pub fn definitely_invalid_bracket_range(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut bracket = false;
    let mut first_member = 0;
    while position < source.len() {
        let atom = source[position];
        if bracket == false {
            if atom == '[' {
                bracket = true;
                first_member = position + 1;
            } else if atom == '\\' && syntax == 'a' {
                position += 1;
            };
        } else if atom == '['
            && position + 1 < source.len()
            && (source[position + 1] == ':'
                || source[position + 1] == '.'
                || source[position + 1] == '=')
        {
            let delimiter = source[position + 1];
            position += 2;
            while position + 1 < source.len()
                && (source[position] != delimiter || source[position + 1] != ']')
            {
                position += 1;
            }
            if position + 1 < source.len() {
                position += 1;
            };
        } else if atom == ']' && position > first_member {
            bracket = false;
        } else if atom == '\\' && syntax == 'a' && position + 1 < source.len() {
            position += 1;
        } else if atom == '-'
            && position > first_member
            && position + 1 < source.len()
            && source[position + 1] != ']'
        {
            if position >= first_member + 3 && source[position - 2] == '-' {
                return true;
            }
            let left = source[position - 1];
            let right = source[position + 1];
            if syntax == 'a'
                && ((position >= first_member + 2
                    && source[position - 2] == '\\'
                    && (left == 'w'
                        || left == 'W'
                        || left == 'd'
                        || left == 'D'
                        || left == 's'
                        || left == 'S'))
                    || (right == '\\'
                        && position + 2 < source.len()
                        && (source[position + 2] == 'w'
                            || source[position + 2] == 'W'
                            || source[position + 2] == 'd'
                            || source[position + 2] == 'D'
                            || source[position + 2] == 's'
                            || source[position + 2] == 'S')))
            {
                return true;
            }
            if left == ']' && position >= first_member + 2 {
                let delimiter = source[position - 2];
                if delimiter == ':' || delimiter == '=' {
                    return true;
                };
            };
            if right == '[' && position + 2 < source.len() {
                let delimiter = source[position + 2];
                if delimiter == ':' || delimiter == '=' {
                    return true;
                };
            };
            if left != ']' && right != '[' && right != '\\' && (left as u32) > (right as u32) {
                return true;
            };
        }
        position += 1;
    }
    false
}

pub fn definitely_invalid_bracket_construct(pattern: &str, syntax: char, expanded: bool) -> bool {
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut bracket = false;
    while position < source.len() {
        let atom = source[position];
        if atom == '[' && bracket == false {
            bracket = true;
            if source.len() - position >= 8
                && source[position + 1] == '['
                && source[position + 2] == ':'
                && (source[position + 3] == '<' || source[position + 3] == '>')
                && source[position + 4] == ':'
                && source[position + 5] == ']'
                && source[position + 6] == ']'
                && (source[position + 7] == '*'
                    || source[position + 7] == '+'
                    || source[position + 7] == '?')
            {
                return true;
            }
        } else if atom == '['
            && bracket
            && source.len() - position >= 4
            && (source[position + 1] == '.' || source[position + 1] == '=')
        {
            let marker = source[position + 1];
            if source[position + 2] == marker && source[position + 3] == ']' {
                return true;
            }
            position += 2;
            while position + 1 < source.len()
                && (source[position] != marker || source[position + 1] != ']')
            {
                position += 1;
            }
            if position + 1 < source.len() {
                position += 1;
            };
        } else if atom == '\\' && syntax == 'a' && position + 1 < source.len() {
            let escaped = source[position + 1];
            if bracket
                && (escaped == 'A'
                    || escaped == 'Z'
                    || escaped == 'm'
                    || escaped == 'M'
                    || escaped == 'y'
                    || escaped == 'Y')
            {
                return true;
            }
            position += 1;
        } else if atom == ']' && bracket {
            bracket = false;
        };
        position += 1;
    }
    false
}

pub fn definitely_invalid_inline_options(pattern: &str, syntax: char) -> bool {
    if syntax != 'a' {
        return false;
    }
    let source: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    if source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && source[3] == ':'
    {
        position = 4;
    }
    if source.len() - position < 3 || source[position] != '(' || source[position + 1] != '?' {
        return false;
    }
    position += 2;
    let mut options = 0;
    let mut mode = 'a';
    while position < source.len() {
        let option = source[position];
        let codepoint = option as u32;
        if (codepoint < 65 || codepoint > 90) && (codepoint < 97 || codepoint > 122) {
            break;
        }
        if option != 'b'
            && option != 'e'
            && option != 'q'
            && option != 'c'
            && option != 'i'
            && option != 't'
            && option != 'x'
            && option != 'm'
            && option != 'n'
            && option != 'p'
            && option != 'w'
            && option != 's'
        {
            return true;
        }
        if option == 'b' || option == 'e' || option == 'q' {
            mode = option;
        };
        options += 1;
        position += 1;
    }
    if options == 0 || position == source.len() || source[position] != ')' {
        return false;
    }
    position += 1;
    if mode == 'a'
        && source.len() - position >= 4
        && source[position] == '('
        && source[position + 1] == '?'
    {
        let next = source[position + 2] as u32;
        if (next >= 65 && next <= 90) || (next >= 97 && next <= 122) {
            return true;
        }
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
    let mut paren_depth = 0;
    let mut assertion_depth = 0;
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
            if syntax == 'a'
                && assertion_depth > 0
                && (escaped as u32) >= 49
                && (escaped as u32) <= 57
                && (position + 2 == source.len()
                    || (source[position + 2] as u32) < 48
                    || (source[position + 2] as u32) > 57)
            {
                return true;
            }
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
            } else if syntax == 'b'
                && (escaped as u32) >= 49
                && (escaped as u32) <= 57
                && position + 2 < source.len()
                && (source[position + 2] as u32) >= 48
                && (source[position + 2] as u32) <= 57
            {
                return true;
            } else if syntax == 'a'
                && (escaped as u32) >= 49
                && (escaped as u32) <= 57
                && position + 2 < source.len()
                && (source[position + 2] as u32) >= 48
                && (source[position + 2] as u32) <= 57
            {
                let mut reference = ((escaped as u32) - 48) as usize;
                let mut scan = position + 2;
                let mut digits = 1;
                while scan < source.len()
                    && (source[scan] as u32) >= 48
                    && (source[scan] as u32) <= 57
                    && digits < 3
                {
                    let double = reference + reference;
                    let four = double + double;
                    let eight = four + four;
                    reference = eight + double + ((source[scan] as u32) - 48) as usize;
                    scan += 1;
                    digits += 1;
                }
                if reference <= closed.len() && closed[reference - 1] == 0 {
                    return true;
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
            paren_depth += 1;
            if assertion_depth == 0
                && source.len() - position >= 3
                && source[position + 1] == '?'
                && (source[position + 2] == '='
                    || source[position + 2] == '!'
                    || source[position + 2] == '<')
            {
                assertion_depth = paren_depth;
            };
            closed.push(0);
            if depth == open.len() {
                open.push(closed.len());
            } else {
                open[depth] = closed.len();
            }
            depth += 1;
            position += 1;
        } else if syntax == 'a' && atom == ')' {
            if assertion_depth == paren_depth {
                assertion_depth = 0;
            };
            if paren_depth > 0 {
                paren_depth = paren_depth - 1;
            };
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

fn posix_class_kind(
    first: char,
    second: char,
    third: char,
    fourth: char,
    fifth: char,
    sixth: char,
) -> usize {
    if first == 'd'
        && second == 'i'
        && third == 'g'
        && fourth == 'i'
        && fifth == 't'
        && sixth == ':'
    {
        return 1;
    }
    if first == 'a'
        && second == 'l'
        && third == 'p'
        && fourth == 'h'
        && fifth == 'a'
        && sixth == ':'
    {
        return 2;
    }
    if first == 'u'
        && second == 'p'
        && third == 'p'
        && fourth == 'e'
        && fifth == 'r'
        && sixth == ':'
    {
        return 3;
    }
    if first == 's'
        && second == 'p'
        && third == 'a'
        && fourth == 'c'
        && fifth == 'e'
        && sixth == ':'
    {
        return 4;
    }
    if first == 'a'
        && second == 'l'
        && third == 'n'
        && fourth == 'u'
        && fifth == 'm'
        && sixth == ':'
    {
        return 5;
    }
    if first == 'a'
        && second == 's'
        && third == 'c'
        && fourth == 'i'
        && fifth == 'i'
        && sixth == ':'
    {
        return 6;
    }
    if first == 'b'
        && second == 'l'
        && third == 'a'
        && fourth == 'n'
        && fifth == 'k'
        && sixth == ':'
    {
        return 7;
    }
    if first == 'c'
        && second == 'n'
        && third == 't'
        && fourth == 'r'
        && fifth == 'l'
        && sixth == ':'
    {
        return 8;
    }
    if first == 'g'
        && second == 'r'
        && third == 'a'
        && fourth == 'p'
        && fifth == 'h'
        && sixth == ':'
    {
        return 9;
    }
    if first == 'l'
        && second == 'o'
        && third == 'w'
        && fourth == 'e'
        && fifth == 'r'
        && sixth == ':'
    {
        return 10;
    }
    if first == 'p'
        && second == 'r'
        && third == 'i'
        && fourth == 'n'
        && fifth == 't'
        && sixth == ':'
    {
        return 11;
    }
    if first == 'p'
        && second == 'u'
        && third == 'n'
        && fourth == 'c'
        && fifth == 't'
        && sixth == ':'
    {
        return 12;
    }
    if first == 'x'
        && second == 'd'
        && third == 'i'
        && fourth == 'g'
        && fifth == 'i'
        && sixth == 't'
    {
        return 13;
    }
    if first == 'w' && second == 'o' && third == 'r' && fourth == 'd' && fifth == ':' {
        return 14;
    }
    0
}

fn posix_class_width(kind: usize) -> usize {
    if kind == 14 {
        return 10;
    }
    if kind == 13 {
        return 12;
    }
    11
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
                && escaped != '\t'
                && escaped != '#'
            {
                return false;
            }
        }
        if atom == '['
            && atoms.len() - position >= 10
            && atoms[position + 1] == '['
            && atoms[position + 2] == ':'
        {
            let kind = posix_class_kind(
                atoms[position + 3],
                atoms[position + 4],
                atoms[position + 5],
                atoms[position + 6],
                atoms[position + 7],
                atoms[position + 8],
            );
            if kind == 0 {
                return false;
            }
            let width = posix_class_width(kind);
            if atoms.len() - position < width
                || atoms[position + width - 3] != ':'
                || atoms[position + width - 2] != ']'
                || atoms[position + width - 1] != ']'
            {
                return false;
            }
            position += width - 1;
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
                if atoms[position] == '[' && position != first_member {
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
                        && escaped != ']'
                        && escaped != '\\'
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
                        && (atoms.len() - position > 1
                            && atoms[position + 1] == '-'
                            && position != first_member
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
                            let punctuation = first == 45 && last >= 45 && last <= 63;
                            if first > last
                                || (digits == false
                                    && uppercase == false
                                    && lowercase == false
                                    && unicode == false
                                    && punctuation == false)
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

fn noncapture_literal_atoms(pattern: &str, expanded: bool) -> NonCaptureResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut branches: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut valid = true;
    let mut position = 0;
    while position < source.len() && source[position] != '(' {
        if simple_literal_char(source[position]) == false {
            valid = false;
            break;
        }
        prefix.push(source[position]);
        position += 1;
    }
    if source.len() - position < 4
        || source[position] != '('
        || source[position + 1] != '?'
        || source[position + 2] != ':'
    {
        valid = false;
    }
    if valid {
        position += 3;
        while position < source.len() && source[position] != ')' {
            if source[position] == '\\'
                && source.len() - position > 1
                && source[position + 1] == 'w'
            {
                branches.push(source[position]);
                branches.push(source[position + 1]);
                position += 2;
            } else if source[position] != '|' && simple_literal_char(source[position]) == false {
                valid = false;
                break;
            } else {
                branches.push(source[position]);
                position += 1;
            };
        }
        if position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            suffix.push(source[position]);
            position += 1;
        }
    }
    NonCaptureResult {
        valid,
        prefix,
        branches,
        suffix,
    }
}

pub fn supports_noncapture_literal(pattern: &str, expanded: bool) -> bool {
    noncapture_literal_atoms(pattern, expanded).valid
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

pub fn supports_multi_optional_group(pattern: &str, expanded: bool) -> bool {
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut groups = 0;
    let mut inside = false;
    let mut members = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '(' {
            if inside {
                return false;
            }
            inside = true;
            members = 0;
            groups += 1;
            position += 1;
        } else if atom == ')' {
            if inside == false
                || members == 0
                || source.len() - position < 2
                || source[position + 1] != '?'
            {
                return false;
            }
            inside = false;
            position += 2;
        } else if simple_literal_char(atom) {
            if inside {
                members += 1;
            }
            position += 1;
        } else {
            return false;
        };
    }
    inside == false && groups >= 2
}

pub fn find_multi_optional_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_multi_optional_group(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let source = pattern_atoms(pattern, expanded);
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut work = 0;
    let mut start = from;
    while start <= haystack.len() {
        let mut stack: Vec<PatternWorkState> = Vec::new();
        stack.push(PatternWorkState {
            pattern: 0,
            subject: start,
        });
        let mut stack_len = 1;
        let mut found = false;
        let mut best_end = start;
        while stack_len > 0 {
            stack_len = stack_len - 1;
            let state = stack[stack_len];
            let mut pattern_position = state.pattern;
            let mut subject_position = state.subject;
            let mut matched = true;
            while pattern_position < source.len() {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                }
                work += 1;
                let atom = source[pattern_position];
                if atom == '(' {
                    let mut closing = pattern_position + 1;
                    while source[closing] != ')' {
                        closing += 1;
                    }
                    let skipped = PatternWorkState {
                        pattern: closing + 2,
                        subject: subject_position,
                    };
                    if stack_len == stack.len() {
                        stack.push(skipped);
                    } else {
                        stack[stack_len] = skipped;
                    }
                    stack_len += 1;
                    pattern_position += 1;
                } else if atom == ')' {
                    pattern_position += 2;
                } else {
                    if subject_position == haystack.len() {
                        matched = false;
                        break;
                    }
                    let actual = haystack[subject_position];
                    if actual != atom
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != atom.to_ascii_lowercase())
                    {
                        matched = false;
                        break;
                    }
                    subject_position += 1;
                    pattern_position += 1;
                };
            }
            if matched && (found == false || subject_position > best_end) {
                found = true;
                best_end = subject_position;
            }
        }
        if found {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: best_end,
            });
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

pub fn supports_chained_assertions(pattern: &str, expanded: bool) -> bool {
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut assertions = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '(' {
            if source.len() - position < 5 || source[position + 1] != '?' {
                return false;
            }
            if source[position + 2] == '=' || source[position + 2] == '!' {
                if simple_literal_char(source[position + 3]) == false || source[position + 4] != ')'
                {
                    return false;
                }
                position += 5;
            } else if source.len() - position >= 6
                && source[position + 2] == '<'
                && (source[position + 3] == '=' || source[position + 3] == '!')
            {
                if simple_literal_char(source[position + 4]) == false || source[position + 5] != ')'
                {
                    return false;
                }
                position += 6;
            } else {
                return false;
            };
            assertions += 1;
        } else if simple_literal_char(atom) {
            position += 1;
            if position < source.len() && source[position] == '*' {
                position += 1;
            }
        } else {
            return false;
        };
    }
    assertions >= 2
}

pub fn find_chained_assertions(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_chained_assertions(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let source = pattern_atoms(pattern, expanded);
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut work = 0;
    let mut start = from;
    while start <= haystack.len() {
        let mut stack: Vec<PatternWorkState> = Vec::new();
        stack.push(PatternWorkState {
            pattern: 0,
            subject: start,
        });
        let mut stack_len = 1;
        let mut found = false;
        let mut best_end = start;
        while stack_len > 0 {
            stack_len = stack_len - 1;
            let state = stack[stack_len];
            let mut pattern_position = state.pattern;
            let mut subject_position = state.subject;
            let mut matched = true;
            while pattern_position < source.len() {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                }
                work += 1;
                let atom = source[pattern_position];
                if atom == '(' {
                    let mut lookbehind = false;
                    let mut positive = source[pattern_position + 2] == '=';
                    let mut expected = source[pattern_position + 3];
                    let mut width = 5;
                    if source[pattern_position + 2] == '<' {
                        lookbehind = true;
                        positive = source[pattern_position + 3] == '=';
                        expected = source[pattern_position + 4];
                        width = 6;
                    };
                    let mut holds = false;
                    if lookbehind && subject_position > 0 {
                        let actual = haystack[subject_position - 1];
                        holds = actual == expected
                            || (case_sensitive == false
                                && actual.to_ascii_lowercase() == expected.to_ascii_lowercase());
                    } else if lookbehind == false && subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        holds = actual == expected
                            || (case_sensitive == false
                                && actual.to_ascii_lowercase() == expected.to_ascii_lowercase());
                    }
                    if holds != positive {
                        matched = false;
                        break;
                    }
                    pattern_position += width;
                } else if pattern_position + 1 < source.len() && source[pattern_position + 1] == '*'
                {
                    let skipped = PatternWorkState {
                        pattern: pattern_position + 2,
                        subject: subject_position,
                    };
                    if stack_len == stack.len() {
                        stack.push(skipped);
                    } else {
                        stack[stack_len] = skipped;
                    }
                    stack_len += 1;
                    if subject_position == haystack.len() {
                        matched = false;
                        break;
                    }
                    let actual = haystack[subject_position];
                    if actual != atom
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != atom.to_ascii_lowercase())
                    {
                        matched = false;
                        break;
                    }
                    subject_position += 1;
                } else {
                    if subject_position == haystack.len() {
                        matched = false;
                        break;
                    }
                    let actual = haystack[subject_position];
                    if actual != atom
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != atom.to_ascii_lowercase())
                    {
                        matched = false;
                        break;
                    }
                    subject_position += 1;
                    pattern_position += 1;
                };
            }
            if matched && (found == false || subject_position > best_end) {
                found = true;
                best_end = subject_position;
            }
        }
        if found {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: best_end,
            });
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

fn make_capture_step(
    operation: usize,
    target: usize,
    alternate: usize,
    group: usize,
    atom: char,
) -> CaptureInstruction {
    CaptureInstruction {
        operation,
        target,
        alternate,
        group,
        atom,
    }
}

fn compile_capture_program_atoms(source: Vec<char>) -> CaptureProgram {
    let mut instructions: Vec<CaptureInstruction> = Vec::new();
    let mut frames: Vec<CaptureFrame> = Vec::new();
    let mut frame_count = 0;
    let mut groups = 0;
    let mut noncapturing = 0;
    let mut closed_groups = 0;
    let mut valid = true;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '^' && position == 0 {
            instructions.push(make_capture_step(VM_BEGIN, 0, 0, 0, ' '));
            position += 1;
        } else if atom == '$' && position + 1 == source.len() {
            instructions.push(make_capture_step(VM_END, 0, 0, 0, ' '));
            position += 1;
        } else if atom == '(' {
            let mut group = 0;
            let mut starred = false;
            if source.len() - position >= 7 && source[position + 1] == '[' {
                let mut closing = position + 2;
                while closing < source.len() && source[closing] != ']' {
                    closing += 1;
                }
                starred = source.len() - closing >= 3
                    && source[closing + 1] == ')'
                    && source[closing + 2] == '*';
            }
            if source.len() - position >= 3
                && source[position + 1] == '?'
                && source[position + 2] == ':'
            {
                noncapturing += 1;
                position += 3;
            } else {
                groups += 1;
                group = groups;
                position += 1;
            }
            let mut choice = false;
            let mut scan = position;
            let mut depth = 0;
            let mut bracket = false;
            let mut escaped = false;
            while scan < source.len() {
                let member = source[scan];
                if escaped {
                    escaped = false;
                } else if member == '\\' {
                    escaped = true;
                } else if member == '[' {
                    bracket = true;
                } else if member == ']' && bracket {
                    bracket = false;
                } else if bracket == false && member == '(' {
                    depth += 1;
                } else if bracket == false && member == ')' {
                    if depth == 0 {
                        break;
                    }
                    depth = depth - 1;
                } else if bracket == false && member == '|' && depth == 0 {
                    choice = true;
                    break;
                }
                scan += 1;
            }
            let frame = CaptureFrame {
                group,
                start: instructions.len(),
                starred,
                choice,
                split: 0,
                jump: 0,
                branched: false,
            };
            if frame_count == frames.len() {
                frames.push(frame);
            } else {
                frames[frame_count] = frame;
            }
            frame_count += 1;
            if starred {
                let first = instructions.len();
                instructions.push(make_capture_step(VM_SPLIT, first + 1, 0, 0, ' '));
            }
            if group > 0 {
                instructions.push(make_capture_step(VM_OPEN, 0, 0, group, ' '));
            }
            if choice {
                let split = instructions.len();
                instructions.push(make_capture_step(VM_SPLIT, split + 1, 0, 0, ' '));
                frames[frame_count - 1] = CaptureFrame {
                    group,
                    start: frame.start,
                    starred,
                    choice,
                    split,
                    jump: 0,
                    branched: false,
                };
            }
        } else if atom == '|' {
            if frame_count == 0 {
                valid = false;
                break;
            }
            let frame = frames[frame_count - 1];
            if frame.choice == false || frame.branched {
                valid = false;
                break;
            }
            let jump = instructions.len();
            instructions.push(make_capture_step(VM_JUMP, 0, 0, 0, ' '));
            instructions[frame.split] =
                make_capture_step(VM_SPLIT, frame.split + 1, instructions.len(), 0, ' ');
            frames[frame_count - 1] = CaptureFrame {
                group: frame.group,
                start: frame.start,
                starred: frame.starred,
                choice: frame.choice,
                split: frame.split,
                jump,
                branched: true,
            };
            position += 1;
        } else if atom == ')' {
            if frame_count == 0 {
                valid = false;
                break;
            }
            frame_count = frame_count - 1;
            let frame = frames[frame_count];
            if frame.choice {
                if frame.branched == false {
                    valid = false;
                    break;
                }
                instructions[frame.jump] =
                    make_capture_step(VM_JUMP, instructions.len(), 0, 0, ' ');
            }
            if frame.group > 0 {
                if frame.group > closed_groups {
                    closed_groups = frame.group;
                }
                instructions.push(make_capture_step(VM_CLOSE, 0, 0, frame.group, ' '));
            }
            position += 1;
            if frame.starred && position < source.len() && source[position] == '*' {
                instructions.push(make_capture_step(VM_JUMP, frame.start, 0, 0, ' '));
                let split = instructions[frame.start];
                instructions[frame.start] =
                    make_capture_step(VM_SPLIT, split.target, instructions.len(), 0, ' ');
                position += 1;
            } else if position < source.len() && source[position] == '+' {
                let next = instructions.len() + 1;
                instructions.push(make_capture_step(VM_SPLIT, frame.start, next, 0, ' '));
                position += 1;
            } else if source.len() - position >= 3
                && source[position] == '{'
                && source[position + 1] == '0'
                && source[position + 2] == '}'
                && frame.start < instructions.len()
            {
                instructions[frame.start] =
                    make_capture_step(VM_JUMP, instructions.len(), 0, 0, ' ');
                position += 3;
            };
        } else {
            let mut operation = 0;
            let mut member = ' ';
            let mut reference = 0;
            if atom == '.' {
                operation = VM_ANY;
                position += 1;
            } else if atom == '[' {
                operation = VM_CLASS;
                reference = position;
                position += 1;
                while position < source.len() && source[position] != ']' {
                    if source[position] == '[' || source[position] == '\\' {
                        valid = false;
                        break;
                    }
                    position += 1;
                }
                if position == source.len() || position == reference + 1 {
                    valid = false;
                } else {
                    position += 1;
                    let mut member_atoms: Vec<char> = Vec::new();
                    let mut member_position = reference;
                    while member_position < position {
                        member_atoms.push(source[member_position]);
                        member_position += 1;
                    }
                    if supports_atoms(member_atoms) == false {
                        valid = false;
                    };
                };
            } else if atom == '\\' && source.len() - position >= 2 {
                let escaped = source[position + 1];
                let escape_start = position;
                position += 2;
                if escaped == 'w' {
                    operation = VM_WORD;
                } else if (escaped as u32) >= 48 && (escaped as u32) <= 57 {
                    reference = ((escaped as u32) - 48) as usize;
                    let mut decimal_digits = 1;
                    while position < source.len()
                        && (source[position] as u32) >= 48
                        && (source[position] as u32) <= 57
                        && decimal_digits < 3
                    {
                        let double = reference + reference;
                        let four = double + double;
                        let eight = four + four;
                        reference = eight + double + ((source[position] as u32) - 48) as usize;
                        position += 1;
                        decimal_digits += 1;
                    }
                    if escaped != '0' && reference <= closed_groups {
                        operation = VM_BACKREF;
                    } else if (escaped as u32) <= 55 && (escaped == '0' || decimal_digits > 1) {
                        let mut octal_position = escape_start + 1;
                        let mut octal = 0;
                        let mut octal_digits = 0;
                        while octal_position < source.len() && octal_digits < 3 {
                            let codepoint = source[octal_position] as u32;
                            if codepoint < 48 || codepoint > 55 {
                                break;
                            }
                            let double = octal + octal;
                            let four = double + double;
                            let candidate = four + four + ((codepoint - 48) as usize);
                            if candidate > 255 {
                                break;
                            }
                            octal = candidate;
                            octal_position += 1;
                            octal_digits += 1;
                        }
                        operation = VM_NUMERIC;
                        reference = octal;
                        position = octal_position;
                    } else {
                        valid = false;
                    };
                } else {
                    valid = false;
                };
            } else if simple_literal_char(atom) {
                operation = VM_LITERAL;
                member = atom;
                position += 1;
            } else {
                valid = false;
            }
            if valid == false {
                break;
            }
            let first = instructions.len();
            if position < source.len() && source[position] == '*' {
                instructions.push(make_capture_step(VM_SPLIT, first + 1, first + 3, 0, ' '));
                instructions.push(make_capture_step(operation, 0, 0, reference, member));
                instructions.push(make_capture_step(VM_JUMP, first, 0, 0, ' '));
                position += 1;
            } else {
                instructions.push(make_capture_step(operation, 0, 0, reference, member));
            }
            if position < source.len() && source[position] == '+' {
                let next = instructions.len() + 1;
                instructions.push(make_capture_step(VM_SPLIT, first, next, 0, ' '));
                position += 1;
            }
        };
    }
    if frame_count != 0 {
        valid = false;
    }
    if valid {
        instructions.push(make_capture_step(VM_ACCEPT, 0, 0, 0, ' '));
    }
    CaptureProgram {
        valid,
        instructions,
        noncapturing,
        atoms: source,
    }
}

fn compile_capture_program(pattern: &str, expanded: bool) -> CaptureProgram {
    compile_capture_program_atoms(pattern_atoms(pattern, expanded))
}

pub fn supports_capture_program(pattern: &str, expanded: bool) -> bool {
    let program = compile_capture_program(pattern, expanded);
    if program.valid == false {
        return false;
    }
    let noncapturing = program.noncapturing;
    let code = program.instructions;
    let mut zero_group = false;
    let mut simple_zero_program = true;
    let mut zero_position = 0;
    while zero_position < code.len() {
        let operation = code[zero_position].operation;
        if operation == VM_JUMP {
            zero_group = true;
        } else if operation != VM_OPEN
            && operation != VM_CLOSE
            && operation != VM_ANY
            && operation != VM_BACKREF
            && operation != VM_ACCEPT
        {
            simple_zero_program = false;
        }
        zero_position += 1;
    }
    if zero_group && simple_zero_program && noncapturing == 0 {
        return true;
    }
    let mut forward_choice = false;
    let mut forward_valid = code.len() > 1 && code[code.len() - 1].operation == VM_ACCEPT;
    let mut forward_position = 0;
    while forward_position < code.len() {
        let step = code[forward_position];
        if step.operation == VM_SPLIT {
            forward_choice = true;
            if step.target <= forward_position
                || step.alternate <= forward_position
                || step.target >= code.len()
                || step.alternate >= code.len()
            {
                forward_valid = false;
            }
        } else if step.operation == VM_JUMP {
            if step.target <= forward_position || step.target >= code.len() {
                forward_valid = false;
            }
        } else if step.operation != VM_LITERAL
            && step.operation != VM_OPEN
            && step.operation != VM_CLOSE
            && step.operation != VM_ACCEPT
        {
            forward_valid = false;
        }
        forward_position += 1;
    }
    if forward_choice && forward_valid {
        return true;
    }
    if code.len() == 8
        && code[0].operation == VM_LITERAL
        && code[1].operation == VM_SPLIT
        && code[1].target == 2
        && code[1].alternate == 6
        && code[2].operation == VM_OPEN
        && code[2].group == 1
        && code[3].operation == VM_CLASS
        && code[4].operation == VM_CLOSE
        && code[4].group == 1
        && code[5].operation == VM_JUMP
        && code[5].target == 1
        && code[6].operation == VM_BACKREF
        && code[6].group == 1
        && code[7].operation == VM_ACCEPT
    {
        return true;
    }
    if code.len() == 10
        && code[0].operation == VM_LITERAL
        && code[1].operation == VM_OPEN
        && code[1].group == 1
        && code[2].operation == VM_CLASS
        && code[3].operation == VM_CLOSE
        && code[3].group == 1
        && code[4].operation == VM_OPEN
        && code[4].group == 2
        && code[5].operation == VM_SPLIT
        && code[5].target == 6
        && code[5].alternate == 8
        && code[6].operation == VM_BACKREF
        && code[6].group == 1
        && code[7].operation == VM_JUMP
        && code[7].target == 5
        && code[8].operation == VM_CLOSE
        && code[8].group == 2
        && code[9].operation == VM_ACCEPT
    {
        return true;
    }
    if noncapturing > 0 {
        let mut position = 0;
        let mut literals = 0;
        let mut valid = code.len() > 1;
        while position < code.len() {
            let operation = code[position].operation;
            if operation == VM_LITERAL {
                literals += 1;
            } else if operation != VM_OPEN && operation != VM_CLOSE && operation != VM_ACCEPT {
                valid = false;
                break;
            }
            position += 1;
        }
        return valid && literals > 0 && code[code.len() - 1].operation == VM_ACCEPT;
    }
    let mut position = 0;
    if code.len() > 0 && code[0].operation == VM_LITERAL {
        position = 1;
    }
    let mut captures = 0;
    while code.len() - position >= 3
        && code[position].operation == VM_OPEN
        && code[position].group == captures + 1
        && code[position + 1].operation == VM_LITERAL
        && code[position + 2].operation == VM_CLOSE
        && code[position + 2].group == captures + 1
    {
        captures += 1;
        position += 3;
    }
    if captures >= 4 && code.len() - position >= 2 {
        if (code[position].operation == VM_BACKREF && code[position].group <= captures)
            || (code[position].operation == VM_NUMERIC && code[position].group <= 255)
        {
            position += 1;
            if code.len() - position >= 2 && code[position].operation == VM_LITERAL {
                position += 1;
            }
            if code.len() - position == 1 && code[position].operation == VM_ACCEPT {
                return true;
            }
        }
    }
    if code.len() == 7 || code.len() == 8 {
        let prefix = code[0].operation == VM_LITERAL
            && code[1].operation == VM_OPEN
            && code[1].group == 1
            && code[2].operation == VM_CLASS
            && code[3].operation == VM_CLOSE
            && code[3].group == 1;
        if code.len() == 7 {
            return prefix
                && code[4].operation == VM_BACKREF
                && code[4].group == 1
                && code[5].operation == VM_SPLIT
                && code[5].target == 4
                && code[5].alternate == 6
                && code[6].operation == VM_ACCEPT;
        }
        return prefix
            && code[4].operation == VM_SPLIT
            && code[4].target == 5
            && code[4].alternate == 7
            && code[5].operation == VM_BACKREF
            && code[5].group == 1
            && code[6].operation == VM_JUMP
            && code[6].target == 4
            && code[7].operation == VM_ACCEPT;
    }
    if code.len() == 9 {
        return code[0].operation == VM_OPEN
            && code[0].group == 1
            && code[1].operation == VM_OPEN
            && code[1].group == 2
            && code[2].operation == VM_ANY
            && code[3].operation == VM_CLOSE
            && code[3].group == 2
            && code[4].operation == VM_CLOSE
            && code[4].group == 1
            && code[5].operation == VM_OPEN
            && code[5].group == 3
            && code[6].operation == VM_BACKREF
            && code[6].group == 2
            && code[7].operation == VM_CLOSE
            && code[7].group == 3
            && code[8].operation == VM_ACCEPT;
    }
    if code.len() == 10 {
        return code[0].operation == VM_LITERAL
            && code[1].operation == VM_OPEN
            && code[1].group == 1
            && code[2].operation == VM_LITERAL
            && code[3].operation == VM_ANY
            && code[4].operation == VM_SPLIT
            && code[4].target == 5
            && code[4].alternate == 7
            && code[5].operation == VM_CLASS
            && code[6].operation == VM_JUMP
            && code[6].target == 4
            && code[7].operation == VM_CLOSE
            && code[7].group == 1
            && code[8].operation == VM_SPLIT
            && code[8].target == 1
            && code[8].alternate == 9
            && code[9].operation == VM_ACCEPT;
    }
    if code.len() != 12 {
        return false;
    }
    if code[0].operation == VM_LITERAL {
        return code[1].operation == VM_OPEN
            && code[1].group == 1
            && code[2].operation == VM_LITERAL
            && code[3].operation == VM_SPLIT
            && code[3].target == 4
            && code[3].alternate == 6
            && code[4].operation == VM_LITERAL
            && code[5].operation == VM_JUMP
            && code[5].target == 3
            && code[6].operation == VM_CLOSE
            && code[6].group == 1
            && code[7].operation == VM_SPLIT
            && code[7].target == 8
            && code[7].alternate == 10
            && code[8].operation == VM_ANY
            && code[9].operation == VM_JUMP
            && code[9].target == 7
            && code[10].operation == VM_BACKREF
            && code[10].group == 1
            && code[11].operation == VM_ACCEPT;
    }
    code[0].operation == VM_BEGIN
        && code[1].operation == VM_OPEN
        && code[1].group == 1
        && (code[2].operation == VM_WORD || code[2].operation == VM_ANY)
        && code[3].operation == VM_SPLIT
        && code[3].target == 2
        && code[3].alternate == 4
        && code[4].operation == VM_CLOSE
        && code[4].group == 1
        && code[5].operation == VM_OPEN
        && code[5].group == 2
        && code[6].operation == VM_LITERAL
        && code[7].operation == VM_BACKREF
        && code[7].group == 1
        && code[8].operation == VM_CLOSE
        && code[8].group == 2
        && code[9].operation == VM_SPLIT
        && code[9].target == 5
        && code[9].alternate == 10
        && code[10].operation == VM_END
        && code[11].operation == VM_ACCEPT
}

pub fn find_capture_program(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_capture_program(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let program = compile_capture_program(pattern, expanded);
    run_capture_program(
        program,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    )
}

fn run_capture_program(
    program: CaptureProgram,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> MatchOutcome {
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut work = 0;
    let mut start = from;
    while start <= haystack.len() {
        let mut captures: Vec<CaptureEvent> = Vec::new();
        captures.push(CaptureEvent {
            group: 0,
            start: 0,
            end: 0,
            previous: 0,
            closed: false,
        });
        let mut stack: Vec<CaptureWorkState> = Vec::new();
        stack.push(CaptureWorkState {
            instruction: 0,
            subject: start,
            capture: 0,
        });
        let mut stack_len = 1;
        let mut found = false;
        let mut best_end = start;
        while stack_len > 0 {
            stack_len = stack_len - 1;
            let state = stack[stack_len];
            let mut instruction = state.instruction;
            let mut subject_position = state.subject;
            let mut capture = state.capture;
            let mut matched = true;
            while matched {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                }
                work += 1;
                let step = program.instructions[instruction];
                if step.operation == VM_ACCEPT {
                    if found == false || subject_position > best_end {
                        found = true;
                        best_end = subject_position;
                    }
                    break;
                } else if step.operation == VM_BEGIN {
                    matched = subject_position == 0
                        || (line_anchors && haystack[subject_position - 1] == '\n');
                    instruction += 1;
                } else if step.operation == VM_END {
                    matched = subject_position == haystack.len()
                        || (line_anchors && haystack[subject_position] == '\n');
                    instruction += 1;
                } else if step.operation == VM_SPLIT {
                    let skipped = CaptureWorkState {
                        instruction: step.alternate,
                        subject: subject_position,
                        capture: capture,
                    };
                    if stack_len == stack.len() {
                        stack.push(skipped);
                    } else {
                        stack[stack_len] = skipped;
                    }
                    stack_len += 1;
                    instruction = step.target;
                } else if step.operation == VM_JUMP {
                    instruction = step.target;
                } else if step.operation == VM_OPEN {
                    captures.push(CaptureEvent {
                        group: step.group,
                        start: subject_position,
                        end: subject_position,
                        previous: capture,
                        closed: false,
                    });
                    capture = captures.len() - 1;
                    instruction += 1;
                } else if step.operation == VM_CLOSE || step.operation == VM_BACKREF {
                    let mut event_index = capture;
                    let mut located = false;
                    let mut capture_start = 0;
                    let mut capture_end = 0;
                    while event_index > 0 {
                        if work == MAX_CAPTURE_WORK {
                            return MatchOutcome::Uncertain;
                        }
                        work += 1;
                        let event = captures[event_index];
                        if event.group == step.group
                            && ((step.operation == VM_CLOSE && event.closed == false)
                                || (step.operation == VM_BACKREF && event.closed))
                        {
                            located = true;
                            capture_start = event.start;
                            capture_end = event.end;
                            break;
                        }
                        event_index = event.previous;
                    }
                    if located == false {
                        matched = false;
                    } else if step.operation == VM_CLOSE {
                        captures.push(CaptureEvent {
                            group: step.group,
                            start: capture_start,
                            end: subject_position,
                            previous: capture,
                            closed: true,
                        });
                        capture = captures.len() - 1;
                        instruction += 1;
                    } else {
                        let width = capture_end - capture_start;
                        if width > haystack.len() - subject_position {
                            matched = false;
                        } else {
                            let mut offset = 0;
                            while offset < width {
                                if work == MAX_CAPTURE_WORK {
                                    return MatchOutcome::Uncertain;
                                }
                                work += 1;
                                let actual = haystack[subject_position + offset];
                                let expected = haystack[capture_start + offset];
                                if actual != expected
                                    && (case_sensitive
                                        || actual.to_ascii_lowercase()
                                            != expected.to_ascii_lowercase())
                                {
                                    matched = false;
                                    break;
                                }
                                offset += 1;
                            }
                            if matched {
                                subject_position += width;
                                instruction += 1;
                            }
                        };
                    };
                } else if step.operation == VM_CLASS {
                    if subject_position == haystack.len() {
                        matched = false;
                    } else {
                        let mut member: Vec<char> = Vec::new();
                        let mut class_position = step.group;
                        while class_position < program.atoms.len() {
                            let class_atom = program.atoms[class_position];
                            member.push(class_atom);
                            class_position += 1;
                            if class_atom == ']' {
                                break;
                            };
                        }
                        let found_member = search_atoms(
                            member,
                            subject,
                            subject_position,
                            case_sensitive,
                            dot_crosses_newline,
                            line_anchors,
                        );
                        if found_member.kind == 2 {
                            return MatchOutcome::Uncertain;
                        }
                        matched = found_member.kind == 0
                            && found_member.start == subject_position
                            && found_member.end == subject_position + 1;
                        if matched {
                            subject_position += 1;
                            instruction += 1;
                        };
                    };
                } else {
                    if subject_position == haystack.len() {
                        matched = false;
                    } else {
                        let actual = haystack[subject_position];
                        let codepoint = actual as u32;
                        let lowercase = actual.to_ascii_lowercase() as u32;
                        let word = (codepoint >= 48 && codepoint <= 57)
                            || (lowercase >= 97 && lowercase <= 122)
                            || actual == '_';
                        let mut numeric_lower = step.group;
                        if numeric_lower >= 65 && numeric_lower <= 90 {
                            numeric_lower += 32;
                        };
                        matched = (step.operation == VM_ANY
                            && (dot_crosses_newline || actual != '\n'))
                            || (step.operation == VM_WORD && word)
                            || (step.operation == VM_NUMERIC
                                && ((actual as u32) as usize == step.group
                                    || (case_sensitive == false
                                        && (actual.to_ascii_lowercase() as u32) as usize
                                            == numeric_lower)))
                            || (step.operation == VM_LITERAL
                                && (actual == step.atom
                                    || (case_sensitive == false
                                        && actual.to_ascii_lowercase()
                                            == step.atom.to_ascii_lowercase())));
                        if matched {
                            subject_position += 1;
                            instruction += 1;
                        }
                    };
                };
            }
        }
        if found {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: best_end,
            });
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

fn fixed_lookbehind_atoms(pattern: &str, expanded: bool) -> LookbehindResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut alternate: Vec<char> = Vec::new();
    let mut remainder: Vec<char> = Vec::new();
    let mut valid = source.len() >= 6;
    let mut positive = true;
    let mut anchored = false;
    let mut split = false;
    if valid {
        valid = source[0] == '('
            && source[1] == '?'
            && source[2] == '<'
            && (source[3] == '=' || source[3] == '!');
        positive = source[3] == '=';
    }
    let mut position = 4;
    if valid {
        if position < source.len() && source[position] == '^' {
            anchored = true;
            position += 1;
        }
        while position < source.len() && source[position] != ')' {
            let atom = source[position];
            if atom == '|' && split == false {
                split = true;
                position += 1;
            } else if atom == '\\'
                || atom == '|'
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
            {
                valid = false;
                break;
            } else if split {
                alternate.push(atom);
                position += 1;
            } else {
                prefix.push(atom);
                position += 1;
            };
        }
        if position == source.len() || prefix.len() > 8 || alternate.len() > 8 || split && anchored
        {
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
        anchored,
        prefix,
        alternate,
        split,
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

fn anchor_lookbehind_atoms(pattern: &str, expanded: bool) -> AnchorLookbehindResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut remainder: Vec<char> = Vec::new();
    let mut valid = source.len() >= 10;
    if valid {
        valid = source[0] == '('
            && source[1] == '^'
            && source[2] == '|'
            && source[3] == '('
            && source[4] == '?'
            && source[5] == '<'
            && source[6] == '=';
    }
    let mut position = 7;
    if valid {
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            prefix.push(source[position]);
            position += 1;
        }
        if prefix.len() > 8 || source.len() - position < 3 || source[position + 1] != ')' {
            valid = false;
        }
    }
    if valid {
        position += 2;
        while position < source.len() {
            remainder.push(source[position]);
            position += 1;
        }
        if remainder.len() == 0 {
            valid = false;
        }
    }
    AnchorLookbehindResult {
        valid,
        prefix,
        remainder,
    }
}

pub fn supports_anchor_lookbehind(pattern: &str, expanded: bool) -> bool {
    let parsed = anchor_lookbehind_atoms(pattern, expanded);
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
        behind: false,
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
    let mut behind = false;
    let mut grouped = false;
    while position < source.len() && source[position] != '(' {
        let atom = source[position];
        if atom == '\\'
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
        valid = source[position] == '(' && source[position + 1] == '?';
        if valid && (source[position + 2] == '=' || source[position + 2] == '!') {
            positive = source[position + 2] == '=';
            position += 3;
        } else if valid
            && source.len() - position >= 5
            && source[position + 2] == '<'
            && (source[position + 3] == '=' || source[position + 3] == '!')
        {
            behind = true;
            positive = source[position + 3] == '=';
            position += 4;
        } else {
            valid = false;
        };
    }
    if valid {
        let mut group_depth = 0;
        while position < source.len() {
            let atom = source[position];
            if atom == ')' {
                if group_depth == 0 {
                    break;
                }
                group_depth = group_depth - 1;
                position += 1;
            } else if atom == '(' {
                grouped = true;
                group_depth += 1;
                position += 1;
            } else if atom == '\\'
                || atom == '['
                || (group_depth > 0 && simple_literal_char(atom) == false)
            {
                valid = false;
                break;
            } else {
                assertion.push(atom);
                position += 1;
            };
        }
        if group_depth > 0 {
            valid = false;
        }
        if position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() {
            if grouped
                && source[position] == '\\'
                && source.len() - position > 1
                && (source[position + 1] as u32) >= 48
                && (source[position + 1] as u32) <= 57
            {
                valid = false;
            }
            remainder.push(source[position]);
            position += 1;
        }
    }
    LookaheadResult {
        valid,
        positive,
        behind,
        offset,
        assertion,
        remainder,
    }
}

pub fn supports_middle_lookahead(pattern: &str, expanded: bool) -> bool {
    let parsed = middle_lookahead_atoms(pattern, expanded);
    if parsed.valid == false || parsed.behind {
        return false;
    }
    supports_atoms(parsed.assertion) && supports_atoms(parsed.remainder)
}

pub fn supports_middle_lookbehind(pattern: &str, expanded: bool) -> bool {
    let parsed = middle_lookahead_atoms(pattern, expanded);
    if parsed.valid == false || parsed.behind == false || parsed.assertion.len() != 1 {
        return false;
    }
    simple_literal_char(parsed.assertion[0]) && supports_atoms(parsed.remainder)
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
            if position < source.len() && source[position] == '?' {
                position += 1;
            }
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
            if source.len() - position > 1 && source[position] == '[' && source[position + 1] == ':'
            {
                while position < source.len()
                    && (source.len() - position < 3
                        || source[position] != ':'
                        || source[position + 1] != ']'
                        || source[position + 2] != ']')
                {
                    atom.push(source[position]);
                    position += 1;
                }
                if source.len() - position < 3 {
                    valid = false;
                } else {
                    atom.push(':');
                    atom.push(']');
                    atom.push(']');
                    position += 3;
                };
            } else {
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
            };
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

fn repeated_backref_atoms(pattern: &str, expanded: bool) -> RepeatedBackrefResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut member: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut suffix_anchor = false;
    let mut lower = 0;
    let mut upper = 0;
    while position < source.len() && source[position] != '(' {
        if simple_literal_char(source[position]) == false
            && (source[position] != '^' || position != 0)
        {
            valid = false;
            break;
        }
        prefix.push(source[position]);
        position += 1;
    }
    if source.len() - position < 6 || source[position] != '(' || source[position + 1] != '[' {
        valid = false;
    }
    if valid {
        position += 2;
        member.push('[');
        while position < source.len() && source[position] != ']' {
            if source[position] == '[' || source[position] == '\\' {
                valid = false;
                break;
            }
            member.push(source[position]);
            position += 1;
        }
        if member.len() == 1 || source.len() - position < 4 || source[position] != ']' {
            valid = false;
        }
    }
    if valid {
        member.push(']');
        position += 1;
        if source[position] != ')' || source[position + 1] != '\\' || source[position + 2] != '1' {
            valid = false;
        } else {
            position += 3;
        };
    }
    if valid && position == source.len() {
        valid = false;
    }
    if valid {
        if source[position] == '*' || source[position] == '+' || source[position] == '?' {
            if source[position] == '+' {
                lower = 1;
            }
            if source[position] == '?' {
                upper = 1;
            } else {
                upper = MAX_CAPTURE_WORK;
            }
            position += 1;
        } else if source[position] == '{' {
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
                if lower > 16 {
                    valid = false;
                    break;
                }
            }
            if digits == 0 || position == source.len() {
                valid = false;
            }
            if valid {
                upper = lower;
                if source[position] == ',' {
                    upper = 0;
                    digits = 0;
                    position += 1;
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
                        if upper > 16 {
                            valid = false;
                            break;
                        }
                    }
                    if digits == 0 || upper < lower {
                        valid = false;
                    }
                }
                if position == source.len() || source[position] != '}' {
                    valid = false;
                } else {
                    position += 1;
                };
            };
        } else {
            valid = false;
        };
    }
    if valid {
        while position < source.len() {
            if source[position] == '$' && position + 1 == source.len() {
                suffix_anchor = true;
                break;
            }
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            suffix.push(source[position]);
            position += 1;
        }
    }
    RepeatedBackrefResult {
        valid,
        prefix,
        member,
        suffix,
        suffix_anchor,
        lower,
        upper,
    }
}

pub fn supports_repeated_backref(pattern: &str, expanded: bool) -> bool {
    let parsed = repeated_backref_atoms(pattern, expanded);
    parsed.valid && supports_atoms(parsed.prefix) && supports_atoms(parsed.member)
}

pub fn find_repeated_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_repeated_backref(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let parsed = repeated_backref_atoms(pattern, expanded);
    let haystack: Vec<char> = subject.chars().collect();
    let mut search_from = from;
    let mut work = 0;
    while search_from <= haystack.len() {
        if work == MAX_CAPTURE_WORK {
            return MatchOutcome::Uncertain;
        }
        work += 1;
        let mut prefix: Vec<char> = Vec::new();
        let mut index = 0;
        while index < parsed.prefix.len() {
            prefix.push(parsed.prefix[index]);
            index += 1;
        }
        let first = search_atoms(
            prefix,
            subject,
            search_from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
        if first.kind == 2 {
            return MatchOutcome::Uncertain;
        }
        if first.kind == 1 {
            break;
        }
        if first.end < haystack.len() {
            let mut member: Vec<char> = Vec::new();
            index = 0;
            while index < parsed.member.len() {
                member.push(parsed.member[index]);
                index += 1;
            }
            let captured = search_atoms(
                member,
                subject,
                first.end,
                case_sensitive,
                dot_crosses_newline,
                line_anchors,
            );
            if captured.kind == 2 {
                return MatchOutcome::Uncertain;
            }
            if captured.kind == 0 && captured.start == first.end && captured.end == first.end + 1 {
                let captured_char = haystack[first.end];
                let mut repetitions = 0;
                let mut position = captured.end;
                let mut found = false;
                let mut best_end = position;
                while repetitions <= parsed.upper {
                    if work == MAX_CAPTURE_WORK {
                        return MatchOutcome::Uncertain;
                    }
                    work += 1;
                    if repetitions >= parsed.lower {
                        let mut suffix_matches = true;
                        index = 0;
                        while index < parsed.suffix.len() {
                            if index >= haystack.len() - position {
                                suffix_matches = false;
                                break;
                            }
                            let actual = haystack[position + index];
                            let expected = parsed.suffix[index];
                            if actual != expected
                                && (case_sensitive
                                    || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                            {
                                suffix_matches = false;
                                break;
                            }
                            index += 1;
                        }
                        if suffix_matches && parsed.suffix_anchor {
                            let suffix_end = position + parsed.suffix.len();
                            suffix_matches = suffix_end == haystack.len()
                                || (line_anchors && haystack[suffix_end] == '\n');
                        }
                        if suffix_matches {
                            found = true;
                            best_end = position + parsed.suffix.len();
                        }
                    }
                    if position == haystack.len() || repetitions == parsed.upper {
                        break;
                    }
                    let actual = haystack[position];
                    if actual != captured_char
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != captured_char.to_ascii_lowercase())
                    {
                        break;
                    }
                    repetitions += 1;
                    position += 1;
                }
                if found {
                    return MatchOutcome::Found(MatchSpan {
                        start: first.start,
                        end: best_end,
                    });
                };
            };
        };
        search_from = first.start + 1;
    }
    MatchOutcome::NoMatch
}

fn two_capture_atoms(pattern: &str, expanded: bool) -> TwoCaptureResult {
    let source = pattern_atoms(pattern, expanded);
    let mut position = 0;
    let mut valid = true;
    let mut first = ' ';
    let mut second = ' ';
    let mut first_quantifier = ' ';
    let mut first_lazy = false;
    let mut second_quantifier = ' ';
    let mut second_reference = false;
    if source.len() < 8 || source[position] != '(' {
        valid = false;
    }
    if valid {
        position += 1;
        first = source[position];
        if simple_literal_char(first) == false {
            valid = false;
        }
        position += 1;
    }
    if valid
        && position < source.len()
        && (source[position] == '?' || source[position] == '*' || source[position] == '+')
    {
        first_quantifier = source[position];
        position += 1;
    }
    if valid && first_quantifier != ' ' && position < source.len() && source[position] == '?' {
        first_lazy = true;
        position += 1;
    }
    if valid {
        if position == source.len() || source[position] != ')' {
            valid = false;
        } else {
            position += 1;
        };
    }
    if valid {
        if position == source.len() || source[position] != '(' {
            valid = false;
        } else {
            position += 1;
        };
    }
    if valid {
        if position == source.len() {
            valid = false;
        } else {
            second = source[position];
            if simple_literal_char(second) == false {
                valid = false;
            }
            position += 1;
        };
    }
    if valid
        && position < source.len()
        && (source[position] == '?' || source[position] == '*' || source[position] == '+')
    {
        second_quantifier = source[position];
        position += 1;
    }
    if valid {
        if position == source.len() || source[position] != ')' {
            valid = false;
        } else {
            position += 1;
        };
    }
    if valid
        && source.len() - position >= 2
        && source[position] == '\\'
        && source[position + 1] == '2'
    {
        second_reference = true;
        position += 2;
    }
    if valid {
        if source.len() - position != 2 || source[position] != '\\' || source[position + 1] != '1' {
            valid = false;
        };
    }
    TwoCaptureResult {
        valid,
        first,
        first_quantifier,
        first_lazy,
        second,
        second_quantifier,
        second_reference,
    }
}

pub fn supports_two_capture_backref(pattern: &str, expanded: bool) -> bool {
    two_capture_atoms(pattern, expanded).valid
}

pub fn find_two_capture_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = two_capture_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    }
    let mut work = 0;
    let mut start = from;
    while start <= haystack.len() {
        let mut first_run = 0;
        while first_run < haystack.len() - start {
            let actual = haystack[start + first_run];
            if actual != parsed.first
                && (case_sensitive
                    || actual.to_ascii_lowercase() != parsed.first.to_ascii_lowercase())
            {
                break;
            }
            first_run += 1;
        }
        let mut first_min = 1;
        if parsed.first_quantifier == '?' || parsed.first_quantifier == '*' {
            first_min = 0;
        }
        let mut first_max = first_run;
        if parsed.first_quantifier == ' ' || parsed.first_quantifier == '?' {
            if first_max > 1 {
                first_max = 1;
            }
        }
        let mut found = false;
        let mut best_end = start;
        let mut first_length = first_min;
        while first_length <= first_max {
            let second_start = start + first_length;
            let mut second_run = 0;
            while second_run < haystack.len() - second_start {
                let actual = haystack[second_start + second_run];
                if actual != parsed.second
                    && (case_sensitive
                        || actual.to_ascii_lowercase() != parsed.second.to_ascii_lowercase())
                {
                    break;
                }
                second_run += 1;
            }
            let mut second_min = 1;
            if parsed.second_quantifier == '?' || parsed.second_quantifier == '*' {
                second_min = 0;
            }
            let mut second_max = second_run;
            if parsed.second_quantifier == ' ' || parsed.second_quantifier == '?' {
                if second_max > 1 {
                    second_max = 1;
                }
            }
            let mut second_length = second_min;
            while second_length <= second_max {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                }
                work += 1;
                let mut position = second_start + second_length;
                let mut matches = true;
                if parsed.second_reference {
                    if second_length > haystack.len() - position {
                        matches = false;
                    } else {
                        let mut index = 0;
                        while index < second_length {
                            let actual = haystack[position + index];
                            let expected = haystack[second_start + index];
                            if actual != expected
                                && (case_sensitive
                                    || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                            {
                                matches = false;
                                break;
                            }
                            index += 1;
                        }
                        if matches {
                            position += second_length;
                        }
                    };
                }
                if matches {
                    if first_length > haystack.len() - position {
                        matches = false;
                    } else {
                        let mut index = 0;
                        while index < first_length {
                            let actual = haystack[position + index];
                            let expected = haystack[start + index];
                            if actual != expected
                                && (case_sensitive
                                    || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                            {
                                matches = false;
                                break;
                            }
                            index += 1;
                        }
                        if matches {
                            position += first_length;
                        }
                    };
                }
                if matches {
                    let mut preferred = found == false || position > best_end;
                    if parsed.first_lazy {
                        preferred = found == false || position < best_end;
                    }
                    if preferred {
                        found = true;
                        best_end = position;
                    }
                }
                second_length += 1;
            }
            first_length += 1;
        }
        if found {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: best_end,
            });
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

fn choice_capture_atoms(pattern: &str, expanded: bool) -> ChoiceCaptureResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut first: Vec<char> = Vec::new();
    let mut second: Vec<char> = Vec::new();
    let mut between: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut valid = true;
    let mut nested = false;
    let mut reference = '1';
    let mut position = 0;
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
        if position < source.len() && source[position] == '(' {
            nested = true;
            reference = '2';
            position += 1;
        }
        while position < source.len() && source[position] != '|' && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            first.push(source[position]);
            position += 1;
        }
        if first.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid && source[position] == '|' {
        position += 1;
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            second.push(source[position]);
            position += 1;
        }
        if second.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid && second.len() == 0 {
        let mut index = 0;
        while index < first.len() {
            second.push(first[index]);
            index += 1;
        }
    }
    if valid {
        position += 1;
        if nested {
            while position < source.len() && source[position] != ')' {
                if simple_literal_char(source[position]) == false {
                    valid = false;
                    break;
                }
                between.push(source[position]);
                position += 1;
            }
            if position == source.len() {
                valid = false;
            }
            if valid {
                position += 1;
            }
        }
        while position < source.len() && source[position] != '\\' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            between.push(source[position]);
            position += 1;
        }
        if source.len() - position < 2 || source[position + 1] != reference {
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
    ChoiceCaptureResult {
        valid,
        prefix,
        first,
        second,
        between,
        suffix,
    }
}

pub fn supports_choice_capture_backref(pattern: &str, expanded: bool) -> bool {
    choice_capture_atoms(pattern, expanded).valid
}

fn two_choice_atoms(pattern: &str, expanded: bool) -> TwoChoiceResult {
    let source = pattern_atoms(pattern, expanded);
    let mut first_left: Vec<char> = Vec::new();
    let mut first_right: Vec<char> = Vec::new();
    let mut second_left: Vec<char> = Vec::new();
    let mut second_right: Vec<char> = Vec::new();
    let mut valid = source.len() >= 11;
    let mut position = 0;
    if valid {
        valid = source[position] == '(';
        position += 1;
    }
    if valid {
        while position < source.len() && source[position] != '|' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            first_left.push(source[position]);
            position += 1;
        }
        if first_left.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            first_right.push(source[position]);
            position += 1;
        }
        if first_right.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        if position == source.len() || source[position] != '(' {
            valid = false;
        } else {
            position += 1;
        };
    }
    if valid {
        while position < source.len() && source[position] != '|' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            second_left.push(source[position]);
            position += 1;
        }
        if second_left.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            second_right.push(source[position]);
            position += 1;
        }
        if position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
    }
    let mut second_reference = false;
    if valid
        && source.len() - position >= 2
        && source[position] == '\\'
        && source[position + 1] == '2'
    {
        second_reference = true;
        position += 2;
    }
    if valid
        && (source.len() - position != 2 || source[position] != '\\' || source[position + 1] != '1')
    {
        valid = false;
    }
    TwoChoiceResult {
        valid,
        first_left,
        first_right,
        second_left,
        second_right,
        second_reference,
    }
}

pub fn supports_two_choice_backref(pattern: &str, expanded: bool) -> bool {
    two_choice_atoms(pattern, expanded).valid
}

fn repeated_choice_atoms(pattern: &str, expanded: bool) -> RepeatedChoiceResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut first: Vec<char> = Vec::new();
    let mut second: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut valid = true;
    let mut lower = 0;
    let mut upper = 0;
    let mut backref = false;
    let mut lazy = false;
    let mut nested = false;
    let mut reference = '1';
    let mut position = 0;
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
        if position < source.len() && source[position] == '(' {
            nested = true;
            reference = '2';
            position += 1;
        }
        while position < source.len() && source[position] != '|' && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            first.push(source[position]);
            position += 1;
        }
        if first.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid && source[position] == '|' {
        position += 1;
        while position < source.len() && source[position] != ')' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            second.push(source[position]);
            position += 1;
        }
        if second.len() == 0 || position == source.len() {
            valid = false;
        }
    }
    if valid {
        position += 1;
        if position == source.len() {
            valid = false;
        } else if source[position] == '*' {
            lower = 0;
            upper = MAX_CAPTURE_WORK;
            position += 1;
        } else if source[position] == '+' {
            lower = 1;
            upper = MAX_CAPTURE_WORK;
            position += 1;
        } else if source[position] == '?' {
            lower = 0;
            upper = 1;
            position += 1;
        } else if source[position] == '{' {
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
                if lower > 16 {
                    valid = false;
                    break;
                }
            }
            if digits == 0 || position == source.len() {
                valid = false;
            }
            upper = lower;
            if valid && source[position] == ',' {
                position += 1;
                upper = 0;
                digits = 0;
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
                    if upper > 16 {
                        valid = false;
                        break;
                    }
                }
                if digits == 0 {
                    upper = MAX_CAPTURE_WORK;
                }
            }
            if position == source.len() || source[position] != '}' || upper < lower {
                valid = false;
            }
            if valid {
                position += 1;
            }
        } else {
            valid = false;
        };
    }
    if valid && position < source.len() && source[position] == '?' {
        lazy = true;
        position += 1;
    }
    if valid && nested {
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
            suffix.push(source[position]);
            position += 1;
        }
        if valid && position < source.len() {
            if source.len() - position == 2 && source[position + 1] == reference {
                backref = true;
            } else {
                valid = false;
            };
        }
    }
    if lazy && backref {
        valid = false;
    }
    RepeatedChoiceResult {
        valid,
        prefix,
        first,
        second,
        suffix,
        lower,
        upper,
        backref,
        lazy,
    }
}

pub fn supports_repeated_choice(pattern: &str, expanded: bool) -> bool {
    repeated_choice_atoms(pattern, expanded).valid
}

fn basic_bounded_backref_atoms(pattern: &str, expanded: bool) -> RepeatedChoiceResult {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut first: Vec<char> = Vec::new();
    let second: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut valid = true;
    let mut position = 0;
    while position < source.len() && source[position] != '\\' {
        if simple_literal_char(source[position]) == false {
            valid = false;
            break;
        }
        prefix.push(source[position]);
        position += 1;
    }
    if source.len() - position < 3 || source[position + 1] != '(' {
        valid = false;
    }
    if valid {
        position += 2;
        while position < source.len() && source[position] != '\\' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            first.push(source[position]);
            position += 1;
        }
        if first.len() == 0 || source.len() - position < 2 || source[position + 1] != ')' {
            valid = false;
        }
    }
    if valid {
        position += 2;
        if source.len() - position < 4 || source[position] != '\\' || source[position + 1] != '{' {
            valid = false;
        }
    }
    let mut lower = 0;
    let mut upper = 0;
    if valid {
        position += 2;
        let mut digits = 0;
        while position < source.len()
            && (source[position] as u32) >= 48
            && (source[position] as u32) <= 57
        {
            let double = lower + lower;
            let four = double + double;
            let eight = four + four;
            lower = eight + double + ((source[position] as u32) - 48) as usize;
            position += 1;
            digits += 1;
            if lower > 16 {
                valid = false;
                break;
            }
        }
        if digits == 0 {
            valid = false;
        }
    }
    if valid {
        upper = lower;
        if position < source.len() && source[position] == ',' {
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
                position += 1;
                digits += 1;
                if upper > 16 {
                    valid = false;
                    break;
                }
            }
            if digits == 0 {
                valid = false;
            }
        }
        if upper < lower
            || source.len() - position < 2
            || source[position] != '\\'
            || source[position + 1] != '}'
        {
            valid = false;
        }
    }
    if valid {
        position += 2;
        while position < source.len() && source[position] != '\\' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            suffix.push(source[position]);
            position += 1;
        }
        if source.len() - position != 2 || source[position] != '\\' || source[position + 1] != '1' {
            valid = false;
        }
    }
    RepeatedChoiceResult {
        valid,
        prefix,
        first,
        second,
        suffix,
        lower,
        upper,
        backref: true,
        lazy: false,
    }
}

pub fn supports_basic_bounded_backref(pattern: &str, expanded: bool) -> bool {
    basic_bounded_backref_atoms(pattern, expanded).valid
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

fn inline_options_atoms(pattern: &str, expanded: bool) -> InlineOptionsResult {
    let source: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    let mut valid = true;
    let mut prefixed = false;
    let mut syntax = 'a';
    let mut case_mode = ' ';
    let mut newline_mode = ' ';
    let mut effective_expanded = expanded;
    if source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && source[3] == ':'
    {
        prefixed = true;
        position = 4;
    }
    if source.len() - position >= 3 && source[position] == '(' && source[position + 1] == '?' {
        position += 2;
        let mut options = 0;
        while position < source.len() {
            let option = source[position];
            let codepoint = option as u32;
            if codepoint < 65 || codepoint > 90 && codepoint < 97 || codepoint > 122 {
                break;
            }
            if option == 'b' || option == 'e' || option == 'q' {
                syntax = option;
            } else if option == 'i' || option == 'c' {
                case_mode = option;
            } else if option == 'n'
                || option == 'm'
                || option == 'p'
                || option == 'w'
                || option == 's'
            {
                newline_mode = option;
            } else if option == 'x' {
                effective_expanded = true;
            } else if option == 't' {
                effective_expanded = false;
            } else {
                valid = false;
                break;
            };
            options += 1;
            position += 1;
        }
        if options == 0 || position == source.len() || source[position] != ')' {
            valid = false;
        } else {
            position += 1;
        };
    } else if prefixed == false {
        valid = false;
    }
    if syntax == 'q' {
        effective_expanded = false;
        newline_mode = 's';
    }
    let normalized = pattern_atoms(pattern, effective_expanded);
    let mut atoms: Vec<char> = Vec::new();
    if valid {
        while position < normalized.len() {
            let atom = normalized[position];
            if (syntax == 'b' || syntax == 'e') && atom == '\\' {
                if position + 1 == normalized.len() {
                    valid = false;
                    break;
                }
                let escaped = normalized[position + 1];
                if syntax == 'b'
                    && (escaped == '(' || escaped == ')' || escaped == '{' || escaped == '}')
                {
                    valid = false;
                    break;
                }
                if simple_literal_char(escaped) == false {
                    atoms.push('\\');
                }
                atoms.push(escaped);
                position += 2;
            } else {
                if syntax == 'b'
                    && (atom == '+'
                        || atom == '?'
                        || atom == '|'
                        || atom == '('
                        || atom == ')'
                        || atom == '{'
                        || atom == '}')
                {
                    atoms.push('\\');
                }
                atoms.push(atom);
                position += 1;
            };
        }
    }
    InlineOptionsResult {
        valid,
        syntax,
        case_mode,
        newline_mode,
        atoms,
    }
}

pub fn supports_inline_options(pattern: &str, expanded: bool) -> bool {
    let parsed = inline_options_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    if parsed.syntax == 'q' {
        return true;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_inline_options(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_inline_options(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let parsed = inline_options_atoms(pattern, expanded);
    let mut sensitive = case_sensitive;
    let mut crosses = dot_crosses_newline;
    let mut anchors = line_anchors;
    if parsed.case_mode == 'i' {
        sensitive = false;
    } else if parsed.case_mode == 'c' {
        sensitive = true;
    }
    if parsed.newline_mode == 'm' || parsed.newline_mode == 'n' {
        crosses = false;
        anchors = true;
    } else if parsed.newline_mode == 'p' {
        crosses = false;
        anchors = false;
    } else if parsed.newline_mode == 'w' {
        crosses = true;
        anchors = true;
    } else if parsed.newline_mode == 's' {
        crosses = true;
        anchors = false;
    }
    if parsed.syntax == 'q' {
        let haystack: Vec<char> = subject.chars().collect();
        if from > haystack.len() {
            return MatchOutcome::NoMatch;
        }
        let mut start = from;
        while start <= haystack.len() {
            let mut offset = 0;
            while offset < parsed.atoms.len() && offset < haystack.len() - start {
                let actual = haystack[start + offset];
                let expected = parsed.atoms[offset];
                if actual != expected
                    && (sensitive || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                {
                    break;
                }
                offset += 1;
            }
            if offset == parsed.atoms.len() {
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
        return MatchOutcome::NoMatch;
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
        if atom == '\\' || atom == '[' || atom == ']' {
            valid = false;
            break;
        }
        if (atom == '^' && position != 0)
            || (atom == '$' && position + 1 != source.len())
            || (atom == '*' && (position == 0 || (position == 1 && source[0] == '^')))
            || atom == '+'
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

fn basic_transparent_group_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut depth = 0;
    let mut grouped = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' && position + 1 < source.len() && source[position + 1] == '(' {
            depth += 1;
            grouped = true;
            position += 2;
        } else if atom == '\\' && position + 1 < source.len() && source[position + 1] == ')' {
            if depth == 0 {
                valid = false;
                break;
            }
            depth = depth - 1;
            position += 2;
            if position < source.len() && source[position] == '*' {
                valid = false;
                break;
            };
        } else if atom == '*' && (atoms.len() == 0 || atoms[atoms.len() - 1] == '^') {
            atoms.push('\\');
            atoms.push('*');
            position += 1;
        } else if atom == '\\' || atom == '[' || atom == ']' {
            valid = false;
            break;
        } else if simple_literal_char(atom)
            || atom == '^'
            || atom == '$'
            || atom == '*'
            || atom == '.'
        {
            atoms.push(atom);
            position += 1;
        } else {
            valid = false;
            break;
        };
    }
    BasicLiteralResult {
        valid: valid && grouped && depth == 0,
        atoms,
    }
}

pub fn supports_basic_transparent_group(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_transparent_group_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_basic_transparent_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_basic_transparent_group(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        basic_transparent_group_atoms(pattern, expanded).atoms,
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

fn basic_special_bracket_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut bracket = false;
    let mut translated = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '[' && bracket == false {
            bracket = true;
            atoms.push(atom);
        } else if atom == ']' && bracket {
            bracket = false;
            atoms.push(atom);
        } else if atom == '\\' && bracket {
            atoms.push('\\');
            atoms.push('\\');
            translated = true;
        } else if atom == ']' && bracket == false {
            atoms.push('\\');
            atoms.push(']');
            translated = true;
        } else if bracket {
            if atom == '[' {
                if position + 1 < source.len()
                    && (source[position + 1] == ':'
                        || source[position + 1] == '.'
                        || source[position + 1] == '=')
                {
                    valid = false;
                    break;
                }
                translated = true;
            };
            atoms.push(atom);
        } else if simple_literal_char(atom) {
            atoms.push(atom);
        } else {
            valid = false;
            break;
        };
        position += 1;
    }
    BasicLiteralResult {
        valid: valid && translated && bracket == false,
        atoms,
    }
}

pub fn supports_basic_special_bracket(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_special_bracket_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_basic_special_bracket(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_basic_special_bracket(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        basic_special_bracket_atoms(pattern, expanded).atoms,
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

fn basic_literal_escaped_letter_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut escaped_letter = false;
    let mut punctuation = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '\\' && position + 1 < source.len() {
            let letter = source[position + 1];
            let codepoint = letter as u32;
            if codepoint >= 65 && codepoint <= 90 || codepoint >= 97 && codepoint <= 122 {
                atoms.push(letter);
                escaped_letter = true;
                position += 2;
            } else {
                valid = false;
                break;
            };
        } else if atom == '+'
            || atom == '?'
            || atom == '|'
            || atom == '('
            || atom == ')'
            || atom == '{'
            || atom == '}'
        {
            atoms.push('\\');
            atoms.push(atom);
            punctuation = true;
            position += 1;
        } else if simple_literal_char(atom) {
            atoms.push(atom);
            position += 1;
        } else {
            valid = false;
            break;
        };
    }
    BasicLiteralResult {
        valid: valid && escaped_letter && punctuation,
        atoms,
    }
}

pub fn supports_basic_literal_escaped_letter(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_literal_escaped_letter_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_basic_literal_escaped_letter(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_basic_literal_escaped_letter(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        basic_literal_escaped_letter_atoms(pattern, expanded).atoms,
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

fn basic_repeated_capture_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    while position < source.len() && source[position] != '\\' {
        if simple_literal_char(source[position]) == false {
            valid = false;
            break;
        }
        atoms.push(source[position]);
        position += 1;
    }
    if source.len() - position < 7 || source[position] != '\\' || source[position + 1] != '(' {
        valid = false;
    }
    if valid {
        atoms.push('(');
        position += 2;
        if simple_literal_char(source[position]) == false {
            valid = false;
        } else {
            atoms.push(source[position]);
            position += 1;
        };
    }
    if valid {
        if position == source.len() || source[position] != '*' && source[position] != '+' {
            valid = false;
        } else {
            atoms.push(source[position]);
            position += 1;
        };
    }
    if valid {
        if source.len() - position < 2 || source[position] != '\\' || source[position + 1] != ')' {
            valid = false;
        } else {
            atoms.push(')');
            position += 2;
        };
    }
    if valid {
        while position < source.len() && source[position] != '\\' {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            atoms.push(source[position]);
            position += 1;
        }
    }
    if valid {
        if source.len() - position < 2 || source[position] != '\\' || source[position + 1] != '1' {
            valid = false;
        } else {
            atoms.push('\\');
            atoms.push('1');
            position += 2;
        };
    }
    if valid {
        while position < source.len() {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            atoms.push(source[position]);
            position += 1;
        }
    }
    BasicLiteralResult { valid, atoms }
}

pub fn supports_basic_repeated_capture(pattern: &str, expanded: bool) -> bool {
    let parsed = basic_repeated_capture_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    let program = compile_capture_program_atoms(parsed.atoms);
    program.valid
}

pub fn find_basic_repeated_capture(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = basic_repeated_capture_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let program = compile_capture_program_atoms(parsed.atoms);
    if program.valid == false {
        return MatchOutcome::Uncertain;
    }
    run_capture_program(
        program,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    )
}

fn collating_bracket_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut bracket = false;
    let mut translated = false;
    let mut valid = true;
    while position < source.len() {
        let atom = source[position];
        if atom == '[' && bracket == false {
            bracket = true;
            atoms.push(atom);
            position += 1;
        } else if atom == '['
            && bracket
            && position + 1 < source.len()
            && (source[position + 1] == '.' || source[position + 1] == '=')
        {
            let marker = source[position + 1];
            let start = position + 2;
            let mut end = start;
            while end + 1 < source.len() && (source[end] != marker || source[end + 1] != ']') {
                end += 1;
            }
            if end + 1 >= source.len() || end == start {
                valid = false;
                break;
            }
            let mut member = source[start];
            if end == start + 4
                && source[start] == 'z'
                && source[start + 1] == 'e'
                && source[start + 2] == 'r'
                && source[start + 3] == 'o'
            {
                member = '0';
            } else if end == start + 3
                && source[start] == 'o'
                && source[start + 1] == 'n'
                && source[start + 2] == 'e'
            {
                member = '1';
            } else if end == start + 3
                && source[start] == 't'
                && source[start + 1] == 'w'
                && source[start + 2] == 'o'
            {
                member = '2';
            } else if end == start + 5
                && source[start] == 't'
                && source[start + 1] == 'h'
                && source[start + 2] == 'r'
                && source[start + 3] == 'e'
                && source[start + 4] == 'e'
            {
                member = '3';
            } else if end == start + 4
                && source[start] == 'f'
                && source[start + 1] == 'o'
                && source[start + 2] == 'u'
                && source[start + 3] == 'r'
            {
                member = '4';
            } else if end == start + 4
                && source[start] == 'f'
                && source[start + 1] == 'i'
                && source[start + 2] == 'v'
                && source[start + 3] == 'e'
            {
                member = '5';
            } else if end == start + 3
                && source[start] == 's'
                && source[start + 1] == 'i'
                && source[start + 2] == 'x'
            {
                member = '6';
            } else if end == start + 5
                && source[start] == 's'
                && source[start + 1] == 'e'
                && source[start + 2] == 'v'
                && source[start + 3] == 'e'
                && source[start + 4] == 'n'
            {
                member = '7';
            } else if end == start + 5
                && source[start] == 'e'
                && source[start + 1] == 'i'
                && source[start + 2] == 'g'
                && source[start + 3] == 'h'
                && source[start + 4] == 't'
            {
                member = '8';
            } else if end == start + 4
                && source[start] == 'n'
                && source[start + 1] == 'i'
                && source[start + 2] == 'n'
                && source[start + 3] == 'e'
            {
                member = '9';
            } else if end > start + 1 {
                valid = false;
                break;
            };
            atoms.push(member);
            position = end + 2;
            translated = true;
        } else if atom == ']' && bracket {
            bracket = false;
            atoms.push(atom);
            position += 1;
        } else if bracket || simple_literal_char(atom) {
            atoms.push(atom);
            position += 1;
        } else {
            valid = false;
            break;
        };
    }
    BasicLiteralResult {
        valid: valid && translated && bracket == false,
        atoms,
    }
}

pub fn supports_collating_bracket(pattern: &str, expanded: bool) -> bool {
    let parsed = collating_bracket_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_collating_bracket(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = collating_bracket_atoms(pattern, expanded);
    if parsed.valid == false || supports_atoms(parsed.atoms) == false {
        return MatchOutcome::Uncertain;
    }
    let result = search_atoms(
        collating_bracket_atoms(pattern, expanded).atoms,
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

fn bracket_word_atoms(pattern: &str, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut translated = false;
    while position < source.len() {
        if source.len() - position >= 6
            && source[position] == '['
            && source[position + 1] == '['
            && source[position + 2] == ':'
            && (source[position + 3] == '<' || source[position + 3] == '>')
            && source[position + 4] == ':'
            && source[position + 5] == ']'
            && source.len() - position >= 7
            && source[position + 6] == ']'
        {
            atoms.push('\\');
            if source[position + 3] == '<' {
                atoms.push('m');
            } else {
                atoms.push('M');
            };
            position += 7;
            translated = true;
        } else if simple_literal_char(source[position]) {
            atoms.push(source[position]);
            position += 1;
        } else {
            valid = false;
            break;
        };
    }
    BasicLiteralResult {
        valid: valid && translated,
        atoms,
    }
}

pub fn supports_bracket_word_boundary(pattern: &str, expanded: bool) -> bool {
    let parsed = bracket_word_atoms(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_bracket_word_boundary(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = bracket_word_atoms(pattern, expanded);
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

fn angle_word_atoms(pattern: &str, syntax: char, expanded: bool) -> BasicLiteralResult {
    let source = pattern_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut valid = syntax == 'a' || syntax == 'b';
    let mut translated = false;
    let mut position = 0;
    while valid && position < source.len() {
        if source[position] == '\\'
            && source.len() - position >= 2
            && (source[position + 1] == '<' || source[position + 1] == '>')
        {
            if syntax == 'b' {
                atoms.push('\\');
                if source[position + 1] == '<' {
                    atoms.push('m');
                } else {
                    atoms.push('M');
                };
            } else {
                atoms.push(source[position + 1]);
            };
            translated = true;
            position += 2;
        } else if simple_literal_char(source[position]) {
            atoms.push(source[position]);
            position += 1;
        } else {
            valid = false;
        };
    }
    BasicLiteralResult {
        valid: valid && translated,
        atoms,
    }
}

pub fn supports_angle_word(pattern: &str, syntax: char, expanded: bool) -> bool {
    let parsed = angle_word_atoms(pattern, syntax, expanded);
    if parsed.valid == false {
        return false;
    }
    supports_atoms(parsed.atoms)
}

pub fn find_angle_word(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    syntax: char,
    expanded: bool,
) -> MatchOutcome {
    let parsed = angle_word_atoms(pattern, syntax, expanded);
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
                && escaped != '\t'
                && escaped != '#'
            {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
        }
        if atom == '['
            && atoms.len() - position >= 10
            && atoms[position + 1] == '['
            && atoms[position + 2] == ':'
        {
            let kind = posix_class_kind(
                atoms[position + 3],
                atoms[position + 4],
                atoms[position + 5],
                atoms[position + 6],
                atoms[position + 7],
                atoms[position + 8],
            );
            if kind == 0 {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
            let width = posix_class_width(kind);
            if atoms.len() - position < width
                || atoms[position + width - 3] != ':'
                || atoms[position + width - 2] != ']'
                || atoms[position + width - 1] != ']'
            {
                return SearchResult {
                    kind: 2,
                    start: 0,
                    end: 0,
                };
            }
            position += width - 1;
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
                if atoms[position] == '[' && position != first_member {
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
                        && escaped != ']'
                        && escaped != '\\'
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
                        && (atoms.len() - position > 1
                            && atoms[position + 1] == '-'
                            && position != first_member
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
                            let punctuation = first == 45 && last >= 45 && last <= 63;
                            if first > last
                                || (digits == false
                                    && uppercase == false
                                    && lowercase == false
                                    && unicode == false
                                    && punctuation == false)
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
                    && atoms.len() - atom_position >= 10
                    && atoms[atom_position + 1] == '['
                    && atoms[atom_position + 2] == ':'
                {
                    let kind = posix_class_kind(
                        atoms[atom_position + 3],
                        atoms[atom_position + 4],
                        atoms[atom_position + 5],
                        atoms[atom_position + 6],
                        atoms[atom_position + 7],
                        atoms[atom_position + 8],
                    );
                    if subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        let codepoint = actual as u32;
                        let digit = codepoint >= 48 && codepoint <= 57;
                        let upper = codepoint >= 65 && codepoint <= 90;
                        let lower = codepoint >= 97 && codepoint <= 122;
                        let space = (codepoint >= 9 && codepoint <= 13) || actual == ' ';
                        let letter = upper || lower;
                        let printable = codepoint >= 32 && codepoint <= 126;
                        let punctuation = (codepoint >= 33 && codepoint <= 47)
                            || (codepoint >= 58 && codepoint <= 64)
                            || (codepoint >= 91 && codepoint <= 96)
                            || (codepoint >= 123 && codepoint <= 126);
                        matched = (kind == 1 && digit)
                            || (kind == 2 && letter)
                            || (kind == 3 && (upper || (case_sensitive == false && lower)))
                            || (kind == 4 && space)
                            || (kind == 5 && (digit || letter))
                            || (kind == 6 && codepoint <= 127)
                            || (kind == 7 && (actual == ' ' || actual == '\t'))
                            || (kind == 8
                                && (codepoint <= 31 || (codepoint >= 127 && codepoint <= 159)))
                            || (kind == 9 && codepoint >= 33 && codepoint <= 126)
                            || (kind == 10 && (lower || (case_sensitive == false && upper)))
                            || (kind == 11 && printable)
                            || (kind == 12 && punctuation)
                            || (kind == 13
                                && (digit
                                    || (codepoint >= 65 && codepoint <= 70)
                                    || (codepoint >= 97 && codepoint <= 102)))
                            || (kind == 14 && (digit || letter || actual == '_'));
                        if matched {
                            consumed = 1;
                        }
                    };
                    atom_end = atom_position + posix_class_width(kind);
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
                                if shorthand == ']' || shorthand == '\\' {
                                    if actual == shorthand {
                                        included = true;
                                    }
                                } else {
                                    let codepoint = actual as u32;
                                    let lowercase = actual.to_ascii_lowercase() as u32;
                                    let digit = codepoint >= 48 && codepoint <= 57;
                                    let space =
                                        (codepoint >= 9 && codepoint <= 13) || actual == ' ';
                                    let word = digit
                                        || (lowercase >= 97 && lowercase <= 122)
                                        || actual == '_';
                                    let member = ((shorthand == 'd' || shorthand == 'D') && digit)
                                        || ((shorthand == 's' || shorthand == 'S') && space)
                                        || ((shorthand == 'w' || shorthand == 'W') && word);
                                    let complement =
                                        shorthand == 'D' || shorthand == 'S' || shorthand == 'W';
                                    if member != complement {
                                        included = true;
                                    }
                                };
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

pub fn find_noncapture_literal(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = noncapture_literal_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let mut found = false;
    let mut best_start = 0;
    let mut best_end = 0;
    let mut branch_start = 0;
    while branch_start <= parsed.branches.len() {
        let mut branch_end = branch_start;
        while branch_end < parsed.branches.len() && parsed.branches[branch_end] != '|' {
            branch_end += 1;
        }
        let mut atoms: Vec<char> = Vec::new();
        let mut index = 0;
        while index < parsed.prefix.len() {
            atoms.push(parsed.prefix[index]);
            index += 1;
        }
        index = branch_start;
        while index < branch_end {
            atoms.push(parsed.branches[index]);
            index += 1;
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
            return MatchOutcome::Uncertain;
        }
        if result.kind == 0
            && (found == false
                || result.start < best_start
                || result.start == best_start && result.end > best_end)
        {
            found = true;
            best_start = result.start;
            best_end = result.end;
        }
        if branch_end == parsed.branches.len() {
            break;
        }
        branch_start = branch_end + 1;
    }
    if found {
        return MatchOutcome::Found(MatchSpan {
            start: best_start,
            end: best_end,
        });
    }
    MatchOutcome::NoMatch
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
                if expected == '.' && actual == '\n' && dot_crosses_newline == false
                    || expected != '.'
                        && actual != expected
                        && (case_sensitive
                            || actual.to_ascii_lowercase() != expected.to_ascii_lowercase())
                {
                    preceding = false;
                    break;
                }
                index += 1;
            }
        }
        if preceding && parsed.anchored {
            let anchor = result.start - parsed.prefix.len();
            if anchor != 0 && (line_anchors == false || haystack[anchor - 1] != '\n') {
                preceding = false;
            }
        }
        if parsed.split && preceding == false && result.start >= parsed.alternate.len() {
            preceding = true;
            let mut index = 0;
            while index < parsed.alternate.len() {
                let actual = haystack[result.start - parsed.alternate.len() + index];
                let expected = parsed.alternate[index];
                if expected == '.' && actual == '\n' && dot_crosses_newline == false
                    || expected != '.'
                        && actual != expected
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

pub fn find_anchor_lookbehind(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = anchor_lookbehind_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let haystack: Vec<char> = subject.chars().collect();
    let mut cursor = from;
    let mut attempts = 0;
    while cursor <= haystack.len() {
        if attempts == MAX_ASSERTION_ATTEMPTS {
            return MatchOutcome::Uncertain;
        }
        attempts += 1;
        let mut remainder: Vec<char> = Vec::new();
        let mut index = 0;
        while index < parsed.remainder.len() {
            remainder.push(parsed.remainder[index]);
            index += 1;
        }
        let result = search_atoms(
            remainder,
            subject,
            cursor,
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
        let mut assertion = result.start == 0;
        if line_anchors && result.start > 0 && haystack[result.start - 1] == '\n' {
            assertion = true;
        }
        if result.start >= parsed.prefix.len() {
            let mut preceding = true;
            index = 0;
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
            if preceding {
                assertion = true;
            }
        }
        if assertion {
            return MatchOutcome::Found(MatchSpan {
                start: result.start,
                end: result.end,
            });
        }
        cursor = result.start + 1;
    }
    MatchOutcome::NoMatch
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
        let assertion_position = result.start + parsed.offset;
        let mut assertion_start = assertion_position;
        if parsed.behind && assertion_start > 0 {
            assertion_start = assertion_start - 1;
        }
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
        let holds = assertion.kind == 0
            && assertion.start == assertion_start
            && (parsed.behind == false
                || (assertion_position > 0 && assertion.end == assertion_position));
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

pub fn find_middle_lookbehind(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_middle_lookbehind(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    find_middle_lookahead(
        pattern,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        expanded,
    )
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

fn choice_capture_pattern(pattern: &str, expanded: bool, choose_first: bool) -> Vec<char> {
    let parsed = choice_capture_atoms(pattern, expanded);
    let mut atoms: Vec<char> = Vec::new();
    let mut member: Vec<char> = Vec::new();
    let mut position = 0;
    while position < parsed.prefix.len() {
        atoms.push(parsed.prefix[position]);
        position += 1;
    }
    position = 0;
    if choose_first {
        while position < parsed.first.len() {
            member.push(parsed.first[position]);
            position += 1;
        }
    } else {
        while position < parsed.second.len() {
            member.push(parsed.second[position]);
            position += 1;
        }
    };
    position = 0;
    while position < member.len() {
        atoms.push(member[position]);
        position += 1;
    }
    position = 0;
    while position < parsed.between.len() {
        atoms.push(parsed.between[position]);
        position += 1;
    }
    position = 0;
    while position < member.len() {
        atoms.push(member[position]);
        position += 1;
    }
    position = 0;
    while position < parsed.suffix.len() {
        atoms.push(parsed.suffix[position]);
        position += 1;
    }
    atoms
}

pub fn find_choice_capture_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_choice_capture_backref(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let first = search_atoms(
        choice_capture_pattern(pattern, expanded, true),
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    );
    let second = search_atoms(
        choice_capture_pattern(pattern, expanded, false),
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    );
    if first.kind == 2 || second.kind == 2 {
        return MatchOutcome::Uncertain;
    }
    if first.kind == 1 && second.kind == 1 {
        return MatchOutcome::NoMatch;
    }
    if second.kind == 1
        || first.kind == 0
            && (first.start < second.start
                || first.start == second.start && first.end >= second.end)
    {
        return MatchOutcome::Found(MatchSpan {
            start: first.start,
            end: first.end,
        });
    }
    MatchOutcome::Found(MatchSpan {
        start: second.start,
        end: second.end,
    })
}

pub fn find_two_choice_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = two_choice_atoms(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let mut found = false;
    let mut best_start = 0;
    let mut best_end = 0;
    let mut first_variant = 0;
    while first_variant < 2 {
        let mut first: Vec<char> = Vec::new();
        let mut index = 0;
        if first_variant == 0 {
            while index < parsed.first_left.len() {
                first.push(parsed.first_left[index]);
                index += 1;
            }
        } else {
            while index < parsed.first_right.len() {
                first.push(parsed.first_right[index]);
                index += 1;
            }
        };
        let mut second_variant = 0;
        while second_variant < 2 {
            let mut second: Vec<char> = Vec::new();
            index = 0;
            if second_variant == 0 {
                while index < parsed.second_left.len() {
                    second.push(parsed.second_left[index]);
                    index += 1;
                }
            } else {
                while index < parsed.second_right.len() {
                    second.push(parsed.second_right[index]);
                    index += 1;
                }
            };
            let mut atoms: Vec<char> = Vec::new();
            index = 0;
            while index < first.len() {
                atoms.push(first[index]);
                index += 1;
            }
            index = 0;
            while index < second.len() {
                atoms.push(second[index]);
                index += 1;
            }
            if parsed.second_reference {
                index = 0;
                while index < second.len() {
                    atoms.push(second[index]);
                    index += 1;
                }
            }
            index = 0;
            while index < first.len() {
                atoms.push(first[index]);
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
                return MatchOutcome::Uncertain;
            }
            if result.kind == 0
                && (found == false
                    || result.start < best_start
                    || result.start == best_start && result.end > best_end)
            {
                found = true;
                best_start = result.start;
                best_end = result.end;
            }
            second_variant += 1;
        }
        first_variant += 1;
    }
    if found {
        return MatchOutcome::Found(MatchSpan {
            start: best_start,
            end: best_end,
        });
    }
    MatchOutcome::NoMatch
}

pub fn find_repeated_choice(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = repeated_choice_atoms(pattern, expanded);
    find_repeated_choice_parsed(parsed, subject, from, case_sensitive)
}

fn find_repeated_choice_parsed(
    parsed: RepeatedChoiceResult,
    subject: &str,
    from: usize,
    case_sensitive: bool,
) -> MatchOutcome {
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let haystack: Vec<char> = subject.chars().collect();
    let mut start = from;
    let mut work = 0;
    while start <= haystack.len() {
        let mut prefix_matches = parsed.prefix.len() <= haystack.len() - start;
        let mut index = 0;
        while prefix_matches && index < parsed.prefix.len() {
            if haystack[start + index] != parsed.prefix[index]
                && (case_sensitive
                    || haystack[start + index].to_ascii_lowercase()
                        != parsed.prefix[index].to_ascii_lowercase())
            {
                prefix_matches = false;
            }
            index += 1;
        }
        if prefix_matches {
            let mut queue: Vec<RepeatedChoiceState> = Vec::new();
            queue.push(RepeatedChoiceState {
                position: start + parsed.prefix.len(),
                repetitions: 0,
                capture_start: 0,
                capture_end: 0,
                first_length: 0,
            });
            let mut head = 0;
            let mut found = false;
            let mut best_end = start;
            let mut best_group_end = start;
            let mut best_first_length = 0;
            while head < queue.len() {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                }
                work += 1;
                let state = queue[head];
                head += 1;
                if state.repetitions >= parsed.lower {
                    let mut suffix_matches = parsed.suffix.len() <= haystack.len() - state.position;
                    index = 0;
                    while suffix_matches && index < parsed.suffix.len() {
                        if haystack[state.position + index] != parsed.suffix[index]
                            && (case_sensitive
                                || haystack[state.position + index].to_ascii_lowercase()
                                    != parsed.suffix[index].to_ascii_lowercase())
                        {
                            suffix_matches = false;
                        }
                        index += 1;
                    }
                    let mut candidate_end = state.position + parsed.suffix.len();
                    if suffix_matches && parsed.backref {
                        if state.repetitions == 0
                            || state.capture_end - state.capture_start
                                > haystack.len() - candidate_end
                        {
                            suffix_matches = false;
                        } else {
                            index = 0;
                            while suffix_matches && index < state.capture_end - state.capture_start
                            {
                                if work == MAX_CAPTURE_WORK {
                                    return MatchOutcome::Uncertain;
                                }
                                work += 1;
                                let actual = haystack[candidate_end + index];
                                let expected = haystack[state.capture_start + index];
                                if actual != expected
                                    && (case_sensitive
                                        || actual.to_ascii_lowercase()
                                            != expected.to_ascii_lowercase())
                                {
                                    suffix_matches = false;
                                }
                                index += 1;
                            }
                            candidate_end += state.capture_end - state.capture_start;
                        };
                    }
                    if suffix_matches {
                        let mut preferred = found == false || candidate_end > best_end;
                        if parsed.lazy {
                            preferred = found == false || candidate_end < best_end;
                        }
                        if parsed.backref {
                            preferred = found == false
                                || state.position > best_group_end
                                || state.position == best_group_end
                                    && state.first_length > best_first_length;
                        }
                        if preferred {
                            found = true;
                            best_end = candidate_end;
                            best_group_end = state.position;
                            best_first_length = state.first_length;
                        }
                    }
                }
                if state.repetitions < parsed.upper {
                    let mut first_matches = parsed.first.len() <= haystack.len() - state.position;
                    index = 0;
                    while first_matches && index < parsed.first.len() {
                        if haystack[state.position + index] != parsed.first[index]
                            && (case_sensitive
                                || haystack[state.position + index].to_ascii_lowercase()
                                    != parsed.first[index].to_ascii_lowercase())
                        {
                            first_matches = false;
                        }
                        index += 1;
                    }
                    if first_matches {
                        let mut first_length = state.first_length;
                        if state.repetitions == 0 {
                            first_length = parsed.first.len();
                        }
                        queue.push(RepeatedChoiceState {
                            position: state.position + parsed.first.len(),
                            repetitions: state.repetitions + 1,
                            capture_start: state.position,
                            capture_end: state.position + parsed.first.len(),
                            first_length,
                        });
                    }
                    let mut second_matches = parsed.second.len() > 0
                        && parsed.second.len() <= haystack.len() - state.position;
                    index = 0;
                    while second_matches && index < parsed.second.len() {
                        if haystack[state.position + index] != parsed.second[index]
                            && (case_sensitive
                                || haystack[state.position + index].to_ascii_lowercase()
                                    != parsed.second[index].to_ascii_lowercase())
                        {
                            second_matches = false;
                        }
                        index += 1;
                    }
                    if second_matches {
                        let mut first_length = state.first_length;
                        if state.repetitions == 0 {
                            first_length = parsed.second.len();
                        }
                        queue.push(RepeatedChoiceState {
                            position: state.position + parsed.second.len(),
                            repetitions: state.repetitions + 1,
                            capture_start: state.position,
                            capture_end: state.position + parsed.second.len(),
                            first_length,
                        });
                    }
                }
            }
            if found {
                return MatchOutcome::Found(MatchSpan {
                    start,
                    end: best_end,
                });
            }
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

pub fn find_basic_bounded_backref(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = basic_bounded_backref_atoms(pattern, expanded);
    find_repeated_choice_parsed(parsed, subject, from, case_sensitive)
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
