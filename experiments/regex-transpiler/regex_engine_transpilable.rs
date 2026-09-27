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
const VM_WORD_END: usize = 14;
const VM_WORD_BEGIN: usize = 26;
const VM_ABSOLUTE_BEGIN: usize = 27;
const VM_ABSOLUTE_END: usize = 28;
const VM_BOUNDARY: usize = 29;
const VM_NOT_BOUNDARY: usize = 30;
const CAPTURE_CLASS_RANGE: usize = 15;
const NODE_SEQUENCE: usize = 16;
const NODE_ALTERNATIVE: usize = 17;
const NODE_GROUP: usize = 18;
const NODE_REPEAT: usize = 19;
const NODE_EMPTY: usize = 20;
const VM_CLEAR: usize = 21;
const MAX_CAPTURE_INSTRUCTIONS: usize = 100000;
const NODE_LOOKAHEAD: usize = 22;
const NODE_NOT_LOOKAHEAD: usize = 23;
const NODE_LOOKBEHIND: usize = 24;
const NODE_NOT_LOOKBEHIND: usize = 25;
const DISSECT_ENTER: usize = 0;
const DISSECT_LEFT: usize = 1;
const DISSECT_RIGHT: usize = 2;
const DISSECT_GROUP: usize = 3;
const DISSECT_ALTERNATIVE: usize = 4;
const DISSECT_LAST_ALTERNATIVE: usize = 5;
const DISSECT_PREFIX: usize = 6;
const DISSECT_LAST_REPEAT: usize = 7;
const DISSECT_ITERATION: usize = 8;
const DISSECT_ITERATION_RESULT: usize = 9;
const DISSECT_ITERATION_ADVANCE: usize = 10;
const DISSECT_ASSERTION: usize = 11;

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
    nodes: Vec<CaptureNode>,
    root: usize,
    references: Vec<usize>,
    minimums: Vec<usize>,
    maximums: Vec<usize>,
    interpreted: bool,
    instructions: Vec<CaptureInstruction>,
    class_members: Vec<CaptureClassMember>,
    case_mode: char,
    newline_mode: char,
    shortest: bool,
    captures: usize,
    backreferences: bool,
}

#[derive(Clone, Copy)]
struct CaptureNode {
    operation: usize,
    left: usize,
    right: usize,
    group: usize,
    atom: char,
    lower: usize,
    upper: usize,
    unbounded: bool,
    preference: usize,
    first: usize,
    last: usize,
}

#[derive(Clone, Copy)]
struct CaptureFrame {
    operation: usize,
    sequence: usize,
    alternative: usize,
    group: usize,
    first: usize,
    branched: bool,
}

#[derive(Clone, Copy)]
struct CaptureBuildTask {
    node: usize,
    entry: usize,
    exit: usize,
}

#[derive(Clone, Copy)]
struct CaptureRegister {
    start: usize,
    end: usize,
    status: usize,
}

#[derive(Clone, Copy)]
struct CaptureDissectFrame {
    node: usize,
    begin: usize,
    end: usize,
    capture: usize,
    phase: usize,
    cursor: usize,
    path: usize,
    prefix: bool,
}

#[derive(Clone, Copy)]
struct CaptureRepeatPath {
    begin: usize,
    cursor: usize,
    capture: usize,
    count: usize,
    previous: usize,
}

#[derive(Clone, Copy)]
struct ZeroWidthFrame {
    alternative: bool,
    sequence: bool,
}

struct ZeroWidthResult {
    valid: bool,
    matches: bool,
}

struct LiteralZeroWidthGroup {
    valid: bool,
    prefix: Vec<char>,
    suffix: Vec<char>,
    boundary: char,
}

#[derive(Clone, Copy)]
struct UnicodeToken {
    kind: usize,
    lower: usize,
    upper: usize,
    repeat: bool,
}

struct UnicodeProgram {
    valid: bool,
    tokens: Vec<UnicodeToken>,
}

#[derive(Clone, Copy)]
struct WidthFrame {
    sequence: usize,
    alternative: usize,
    has_alternative: bool,
}

struct WidthResult {
    valid: bool,
    minimum: usize,
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

pub fn definitely_invalid_numeric_escape(
    pattern: &str,
    requested_syntax: char,
    expanded: bool,
) -> bool {
    let selected = validation_pattern_source(pattern, requested_syntax, expanded);
    if selected.syntax != 'a' {
        return false;
    }
    let parsed = capture_pattern_source(pattern, expanded);
    let source = parsed.atoms;
    let mut position = 0;
    let mut escape_index = 0;
    while position < source.len() {
        if source[position] == '\\' && position + 1 < source.len() {
            let marker = source[position + 1];
            if marker == 'z' {
                return true;
            }
            if marker == 'u' || marker == 'U' || marker == 'x' || marker == 'c' {
                while escape_index < parsed.escape_ends.len()
                    && parsed.escape_ends[escape_index] < position
                {
                    escape_index += 2;
                }
                let mut limit = source.len();
                if escape_index < parsed.escape_ends.len()
                    && parsed.escape_ends[escape_index] == position
                {
                    limit = parsed.escape_ends[escape_index + 1];
                }
                let mut window: Vec<char> = Vec::new();
                let mut next = position;
                while next < limit && next - position < 257 {
                    window.push(source[next]);
                    next += 1;
                }
                let numeric = parse_capture_numeric(window, 0, false);
                if numeric.valid == false {
                    return true;
                }
                position += numeric.end;
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
    if result.len() == 5
        && result[0] == '('
        && simple_literal_char(result[1])
        && result[2] == '*'
        && result[3] == ')'
        && result[4] == '*'
    {
        let mut flattened: Vec<char> = Vec::new();
        flattened.push(result[1]);
        flattened.push('*');
        return flattened;
    }
    let mut normalized: Vec<char> = Vec::new();
    position = 0;
    while position < result.len() {
        let mut skipped = false;
        if result.len() - position >= 7
            && result[position] == '('
            && result[position + 1] == '?'
            && result[position + 2] == ':'
            && result[position + 3] == '\\'
            && (result[position + 4] == 'm'
                || result[position + 4] == 'M'
                || result[position + 4] == 'y'
                || result[position + 4] == 'Y'
                || result[position + 4] == 'A'
                || result[position + 4] == 'Z')
            && result[position + 5] == ')'
            && result[position + 6] == '+'
        {
            normalized.push(result[position + 3]);
            normalized.push(result[position + 4]);
            position += 7;
            skipped = true;
        }
        if skipped == false
            && result.len() - position >= 7
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

pub fn definitely_invalid_grouping(pattern: &str, requested_syntax: char, expanded: bool) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
    let mut depth = 0;
    let mut bracket = false;
    let mut bracket_members = 0;
    let mut negated = false;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            if bracket {
                bracket_members += 1;
            }
            position += 3;
        } else if atom == '\\' && (bracket == false || syntax == 'a') {
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

pub fn definitely_invalid_simple_repeat(
    pattern: &str,
    requested_syntax: char,
    expanded: bool,
) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
    let mut position = 0;
    let mut bracket = false;
    let mut bracket_members = 0;
    let mut previous_repeat = false;
    let mut previous_lazy = false;
    let mut after_open = false;
    let mut basic_star_literal = true;
    while position < source.len() {
        let atom = source[position];
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            if bracket {
                bracket_members += 1;
            }
            previous_repeat = false;
            after_open = false;
            position += 3;
        } else if atom == '\\' && (bracket == false || syntax == 'a') {
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
            basic_star_literal = syntax == 'b' && source[position + 1] == '(';
            position += 2;
        } else if bracket {
            if atom == ']' && bracket_members > 0 {
                bracket = false;
            } else {
                bracket_members += 1;
            }
            position += 1;
        } else if atom == '[' {
            basic_star_literal = false;
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
        } else if syntax == 'b' && atom == '*' && basic_star_literal {
            basic_star_literal = false;
            previous_repeat = false;
            position += 1;
        } else if atom == '*' || syntax != 'b' && (atom == '+' || atom == '?') {
            if previous_repeat && (syntax != 'a' || atom != '?' || previous_lazy)
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
            basic_star_literal = basic_star_literal && atom == '^';
            previous_repeat = false;
            after_open = false;
            position += 1;
        };
    }
    false
}

pub fn definitely_invalid_bound(pattern: &str, requested_syntax: char, expanded: bool) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
    let mut position = 0;
    let mut bracket = false;
    let mut bracket_members = 0;
    while position < source.len() {
        let atom = source[position];
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            if bracket {
                bracket_members += 1;
            }
            position += 3;
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

pub fn definitely_invalid_posix_class(
    pattern: &str,
    requested_syntax: char,
    expanded: bool,
) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
    let mut bracket = false;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            position += 3;
        } else if atom == '[' && bracket == false {
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

pub fn definitely_invalid_bracket_range(
    pattern: &str,
    requested_syntax: char,
    expanded: bool,
) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
    let mut position = 0;
    let mut bracket = false;
    let mut first_member = 0;
    while position < source.len() {
        let atom = source[position];
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            position += 2;
        } else if bracket == false {
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

pub fn definitely_invalid_bracket_construct(
    pattern: &str,
    requested_syntax: char,
    expanded: bool,
) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'e' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
    let mut position = 0;
    let mut bracket = false;
    while position < source.len() {
        let atom = source[position];
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            position += 2;
        } else if atom == '[' && bracket == false {
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

pub fn definitely_invalid_backreference(
    pattern: &str,
    requested_syntax: char,
    expanded: bool,
) -> bool {
    let parsed = validation_pattern_source(pattern, requested_syntax, expanded);
    let syntax = parsed.syntax;
    if syntax != 'a' && syntax != 'b' {
        return false;
    }
    let source = parsed.atoms;
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
        if syntax == 'a'
            && atom == '\\'
            && source.len() - position >= 3
            && source[position + 1] == 'c'
        {
            if bracket {
                bracket_members += 1;
            }
            position += 3;
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
                && (syntax == 'b'
                    || position + 2 == source.len()
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
                        && escaped != 'n'
                        && escaped != 'r'
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
                if source.len() - position >= 6
                    && source[position + 3] == '\\'
                    && source[position + 4] == 'w'
                    && source[position + 5] == ')'
                {
                    position += 6;
                } else if (simple_literal_char(source[position + 3]) || source[position + 3] == '.')
                    && source[position + 4] == ')'
                {
                    position += 5;
                } else {
                    return false;
                };
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
        } else if simple_literal_char(atom) || atom == '.' {
            position += 1;
            if position < source.len() && source[position] == '*' {
                position += 1;
            }
        } else if atom == '\\' && source.len() - position >= 2 && source[position + 1] == 'w' {
            position += 2;
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
    dot_crosses_newline: bool,
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
                    let mut any = expected == '.';
                    let mut word = false;
                    if expected == '\\' {
                        word = true;
                        width = 6;
                    }
                    if source[pattern_position + 2] == '<' {
                        lookbehind = true;
                        positive = source[pattern_position + 3] == '=';
                        expected = source[pattern_position + 4];
                        width = 6;
                        any = false;
                    };
                    let mut holds = false;
                    if lookbehind && subject_position > 0 {
                        let actual = haystack[subject_position - 1];
                        holds = actual == expected
                            || (case_sensitive == false
                                && actual.to_ascii_lowercase() == expected.to_ascii_lowercase());
                    } else if lookbehind == false && subject_position < haystack.len() {
                        let actual = haystack[subject_position];
                        holds = (any && (dot_crosses_newline || actual != '\n'))
                            || (word && zero_width_word(actual))
                            || (any == false
                                && word == false
                                && (actual == expected
                                    || (case_sensitive == false
                                        && actual.to_ascii_lowercase()
                                            == expected.to_ascii_lowercase())));
                    }
                    if holds != positive {
                        matched = false;
                        break;
                    }
                    pattern_position += width;
                } else {
                    let mut atom_width = 1;
                    let mut word = false;
                    if atom == '\\' {
                        atom_width = 2;
                        word = true;
                    }
                    let repeated = pattern_position + atom_width < source.len()
                        && source[pattern_position + atom_width] == '*';
                    if repeated {
                        let skipped = PatternWorkState {
                            pattern: pattern_position + atom_width + 1,
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
                        let accepts = (word && zero_width_word(actual))
                            || (atom == '.' && (dot_crosses_newline || actual != '\n'))
                            || (word == false
                                && atom != '.'
                                && (actual == atom
                                    || (case_sensitive == false
                                        && actual.to_ascii_lowercase()
                                            == atom.to_ascii_lowercase())));
                        if accepts == false {
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
                        let accepts = (word && zero_width_word(actual))
                            || (atom == '.' && (dot_crosses_newline || actual != '\n'))
                            || (word == false
                                && atom != '.'
                                && (actual == atom
                                    || (case_sensitive == false
                                        && actual.to_ascii_lowercase()
                                            == atom.to_ascii_lowercase())));
                        if accepts == false {
                            matched = false;
                            break;
                        }
                        subject_position += 1;
                        pattern_position += atom_width;
                    };
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

fn zero_width_word(atom: char) -> bool {
    let codepoint = atom as u32;
    let lower = atom.to_ascii_lowercase() as u32;
    (codepoint >= 48 && codepoint <= 57) || (lower >= 97 && lower <= 122) || atom == '_'
}

fn evaluate_zero_width(
    pattern: &str,
    subject: &str,
    offset: usize,
    case_sensitive: bool,
    line_anchors: bool,
    expanded: bool,
) -> ZeroWidthResult {
    let source = pattern_atoms(pattern, expanded);
    let haystack: Vec<char> = subject.chars().collect();
    if offset > haystack.len() {
        return ZeroWidthResult {
            valid: true,
            matches: false,
        };
    }
    let mut frames: Vec<ZeroWidthFrame> = Vec::new();
    let mut frame_count = 0;
    let mut alternative = false;
    let mut sequence = true;
    let mut position = 0;
    let mut assertions = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '(' && source.len() - position >= 6 && source[position + 1] == '?' {
            let positive = source[position + 2] == '=';
            if (positive == false && source[position + 2] != '!')
                || simple_literal_char(source[position + 3]) == false
                || simple_literal_char(source[position + 4]) == false
                || source[position + 5] != ')'
            {
                return ZeroWidthResult {
                    valid: false,
                    matches: false,
                };
            }
            let mut holds = offset + 1 < haystack.len();
            if holds {
                let first = haystack[offset];
                let second = haystack[offset + 1];
                let expected_first = source[position + 3];
                let expected_second = source[position + 4];
                holds = (first == expected_first
                    || (case_sensitive == false
                        && first.to_ascii_lowercase() == expected_first.to_ascii_lowercase()))
                    && (second == expected_second
                        || (case_sensitive == false
                            && second.to_ascii_lowercase()
                                == expected_second.to_ascii_lowercase()));
            }
            sequence = sequence && (holds == positive);
            assertions += 1;
            position += 6;
        } else if atom == '(' {
            let frame = ZeroWidthFrame {
                alternative,
                sequence,
            };
            if frame_count == frames.len() {
                frames.push(frame);
            } else {
                frames[frame_count] = frame;
            };
            frame_count += 1;
            alternative = false;
            sequence = true;
            position += 1;
        } else if atom == ')' {
            if frame_count == 0 {
                return ZeroWidthResult {
                    valid: false,
                    matches: false,
                };
            }
            let mut value = alternative || sequence;
            frame_count = frame_count - 1;
            let frame = frames[frame_count];
            alternative = frame.alternative;
            sequence = frame.sequence;
            position += 1;
            if position < source.len() && (source[position] == '*' || source[position] == '?') {
                value = true;
                position += 1;
            } else if position < source.len() && source[position] == '+' {
                position += 1;
            };
            sequence = sequence && value;
        } else if atom == '|' {
            alternative = alternative || sequence;
            sequence = true;
            position += 1;
        } else {
            let mut value = false;
            if atom == '^' {
                value = offset == 0 || (line_anchors && haystack[offset - 1] == '\n');
                position += 1;
            } else if atom == '$' {
                value = offset == haystack.len() || (line_anchors && haystack[offset] == '\n');
                position += 1;
            } else if atom == '\\' && source.len() - position >= 2 {
                let boundary = source[position + 1];
                if boundary != 'Y' && boundary != 'm' && boundary != 'M' {
                    return ZeroWidthResult {
                        valid: false,
                        matches: false,
                    };
                }
                let mut before = false;
                let mut after = false;
                if offset > 0 {
                    before = zero_width_word(haystack[offset - 1]);
                }
                if offset < haystack.len() {
                    after = zero_width_word(haystack[offset]);
                }
                value = (boundary == 'Y' && before == after)
                    || (boundary == 'm' && before == false && after)
                    || (boundary == 'M' && before && after == false);
                position += 2;
            } else {
                return ZeroWidthResult {
                    valid: false,
                    matches: false,
                };
            };
            assertions += 1;
            if position < source.len() && (source[position] == '*' || source[position] == '?') {
                value = true;
                position += 1;
            } else if position < source.len() && source[position] == '+' {
                position += 1;
            };
            sequence = sequence && value;
        };
    }
    ZeroWidthResult {
        valid: frame_count == 0 && assertions > 0,
        matches: alternative || sequence,
    }
}

pub fn supports_zero_width_assertions(pattern: &str, expanded: bool) -> bool {
    evaluate_zero_width(pattern, pattern, 0, true, false, expanded).valid
}

pub fn find_zero_width_assertions(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    line_anchors: bool,
    expanded: bool,
) -> MatchOutcome {
    let haystack: Vec<char> = subject.chars().collect();
    let mut position = from;
    while position <= haystack.len() {
        let result = evaluate_zero_width(
            pattern,
            subject,
            position,
            case_sensitive,
            line_anchors,
            expanded,
        );
        if result.valid == false {
            return MatchOutcome::Uncertain;
        }
        if result.matches {
            return MatchOutcome::Found(MatchSpan {
                start: position,
                end: position,
            });
        }
        position += 1;
    }
    MatchOutcome::NoMatch
}

fn parse_literal_zero_width_group(pattern: &str, expanded: bool) -> LiteralZeroWidthGroup {
    let source = pattern_atoms(pattern, expanded);
    let mut prefix: Vec<char> = Vec::new();
    let mut suffix: Vec<char> = Vec::new();
    let mut position = 0;
    let mut valid = true;
    let mut boundary = ' ';
    while position < source.len() && source[position] != '(' {
        if simple_literal_char(source[position]) == false {
            valid = false;
            break;
        }
        prefix.push(source[position]);
        position += 1;
    }
    if valid && source.len() - position >= 5 && source[position] == '(' {
        if source[position + 1] == '\\'
            && (source[position + 2] == 'm' || source[position + 2] == 'Y')
        {
            boundary = source[position + 2];
            position += 3;
            if boundary == 'Y'
                && source.len() - position >= 2
                && source[position] == '\\'
                && source[position + 1] == 'Y'
            {
                position += 2;
            }
        } else {
            valid = false;
        }
        if source.len() - position < 2 || source[position] != ')' || source[position + 1] != '+' {
            valid = false;
        } else {
            position += 2;
        };
    } else {
        valid = false;
    }
    if valid {
        while position < source.len() {
            if simple_literal_char(source[position]) == false {
                valid = false;
                break;
            }
            suffix.push(source[position]);
            position += 1;
        }
    }
    LiteralZeroWidthGroup {
        valid: valid && prefix.len() > 0,
        prefix,
        suffix,
        boundary,
    }
}

pub fn supports_literal_zero_width_group(pattern: &str, expanded: bool) -> bool {
    parse_literal_zero_width_group(pattern, expanded).valid
}

pub fn find_literal_zero_width_group(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    let parsed = parse_literal_zero_width_group(pattern, expanded);
    if parsed.valid == false {
        return MatchOutcome::Uncertain;
    }
    let haystack: Vec<char> = subject.chars().collect();
    let mut cursor = from;
    while cursor <= haystack.len() {
        let mut atoms: Vec<char> = Vec::new();
        let mut position = 0;
        while position < parsed.prefix.len() {
            atoms.push(parsed.prefix[position]);
            position += 1;
        }
        position = 0;
        while position < parsed.suffix.len() {
            atoms.push(parsed.suffix[position]);
            position += 1;
        }
        let found = search_atoms(atoms, subject, cursor, case_sensitive, true, false);
        if found.kind == 2 {
            return MatchOutcome::Uncertain;
        }
        if found.kind == 1 {
            return MatchOutcome::NoMatch;
        }
        let assertion_position = found.start + parsed.prefix.len();
        let before = zero_width_word(haystack[assertion_position - 1]);
        let mut after = false;
        if assertion_position < haystack.len() {
            after = zero_width_word(haystack[assertion_position]);
        }
        if (parsed.boundary == 'Y' && before == after)
            || (parsed.boundary == 'm' && before == false && after)
        {
            return MatchOutcome::Found(MatchSpan {
                start: found.start,
                end: found.end,
            });
        }
        cursor = found.start + 1;
    }
    MatchOutcome::NoMatch
}

fn unicode_hex_step(value: usize, digit: usize) -> usize {
    let double = value + value;
    let four = double + double;
    let eight = four + four;
    eight + eight + digit
}

fn unicode_quad(first: char, second: char, third: char, fourth: char) -> usize {
    let a = numeric_hex_digit(first);
    let b = numeric_hex_digit(second);
    let c = numeric_hex_digit(third);
    let d = numeric_hex_digit(fourth);
    if a == 16 || b == 16 || c == 16 || d == 16 {
        return 65536;
    }
    let first_pair = unicode_hex_step(a, b);
    let second_pair = unicode_hex_step(first_pair, c);
    unicode_hex_step(second_pair, d)
}

fn parse_unicode_program(pattern: &str, expanded: bool) -> UnicodeProgram {
    let source = pattern_atoms(pattern, expanded);
    let mut tokens: Vec<UnicodeToken> = Vec::new();
    let mut position = 0;
    let mut seen_numeric = false;
    let mut valid = true;
    while position < source.len() {
        let mut kind = 0;
        let mut lower = 0;
        let mut upper = 0;
        if source[position] == '['
            && source.len() - position >= 15
            && source[position + 1] == '\\'
            && source[position + 2] == 'u'
            && source[position + 7] == '-'
            && source[position + 8] == '\\'
            && source[position + 9] == 'u'
            && source[position + 14] == ']'
        {
            lower = unicode_quad(
                source[position + 3],
                source[position + 4],
                source[position + 5],
                source[position + 6],
            );
            upper = unicode_quad(
                source[position + 10],
                source[position + 11],
                source[position + 12],
                source[position + 13],
            );
            if lower == 65536 || upper == 65536 || lower > upper {
                valid = false;
                break;
            }
            kind = 2;
            seen_numeric = true;
            position += 15;
        } else if source[position] == '['
            && source.len() - position >= 10
            && source[position + 1] == '['
            && source[position + 2] == ':'
        {
            let class_kind = posix_class_kind(
                source[position + 3],
                source[position + 4],
                source[position + 5],
                source[position + 6],
                source[position + 7],
                source[position + 8],
            );
            let width = posix_class_width(class_kind);
            if (class_kind != 3 && class_kind != 5)
                || source.len() - position < width
                || source[position + width - 3] != ':'
                || source[position + width - 2] != ']'
                || source[position + width - 1] != ']'
            {
                valid = false;
                break;
            }
            kind = class_kind + 1;
            position += width;
        } else if source[position] == '\\'
            && source.len() - position >= 6
            && source[position + 1] == 'u'
        {
            lower = unicode_quad(
                source[position + 2],
                source[position + 3],
                source[position + 4],
                source[position + 5],
            );
            if lower == 65536 {
                valid = false;
                break;
            }
            upper = lower;
            kind = 1;
            seen_numeric = true;
            position += 6;
        } else if simple_literal_char(source[position]) {
            lower = (source[position] as u32) as usize;
            upper = lower;
            kind = 1;
            position += 1;
        } else {
            valid = false;
            break;
        };
        let mut repeat = false;
        let mut required = true;
        if position < source.len() && (source[position] == '*' || source[position] == '+') {
            required = source[position] == '+';
            repeat = true;
            position += 1;
        }
        if required {
            tokens.push(UnicodeToken {
                kind,
                lower,
                upper,
                repeat: false,
            });
        }
        if repeat {
            tokens.push(UnicodeToken {
                kind,
                lower,
                upper,
                repeat: true,
            });
        }
    }
    UnicodeProgram {
        valid: valid && seen_numeric && tokens.len() > 0,
        tokens,
    }
}

fn unicode_token_matches(token: UnicodeToken, actual: char, case_sensitive: bool) -> bool {
    let codepoint = (actual as u32) as usize;
    if token.kind == 1 {
        let mut lowered = token.lower;
        if lowered >= 65 && lowered <= 90 {
            lowered += 32;
        }
        return codepoint == token.lower
            || (case_sensitive == false
                && ((actual.to_ascii_lowercase() as u32) as usize) == lowered);
    }
    if token.kind == 2 {
        return codepoint >= token.lower && codepoint <= token.upper;
    }
    let upper = codepoint >= 65 && codepoint <= 90;
    let lower = codepoint >= 97 && codepoint <= 122;
    if token.kind == 4 {
        return upper || (case_sensitive == false && lower);
    }
    token.kind == 6 && (upper || lower || (codepoint >= 48 && codepoint <= 57))
}

pub fn supports_unicode_simple(pattern: &str, expanded: bool) -> bool {
    parse_unicode_program(pattern, expanded).valid
}

pub fn find_unicode_simple(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    let program = parse_unicode_program(pattern, expanded);
    if program.valid == false {
        return MatchOutcome::Uncertain;
    }
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
            if work == MAX_CAPTURE_WORK {
                return MatchOutcome::Uncertain;
            }
            work += 1;
            stack_len = stack_len - 1;
            let state = stack[stack_len];
            if state.pattern == program.tokens.len() {
                if found == false || state.subject > best_end {
                    found = true;
                    best_end = state.subject;
                }
            } else {
                let token = program.tokens[state.pattern];
                if token.repeat {
                    let skipped = PatternWorkState {
                        pattern: state.pattern + 1,
                        subject: state.subject,
                    };
                    if stack_len == stack.len() {
                        stack.push(skipped);
                    } else {
                        stack[stack_len] = skipped;
                    }
                    stack_len += 1;
                }
                if state.subject < haystack.len()
                    && unicode_token_matches(token, haystack[state.subject], case_sensitive)
                {
                    let mut next_pattern = state.pattern;
                    if token.repeat == false {
                        next_pattern += 1;
                    }
                    let next = PatternWorkState {
                        pattern: next_pattern,
                        subject: state.subject + 1,
                    };
                    if stack_len == stack.len() {
                        stack.push(next);
                    } else {
                        stack[stack_len] = next;
                    }
                    stack_len += 1;
                }
            };
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

fn width_choice(sequence: usize, alternative: usize, has_alternative: bool) -> usize {
    if has_alternative && alternative < sequence {
        return alternative;
    }
    sequence
}

fn parse_minimum_width(pattern: &str, expanded: bool) -> WidthResult {
    let source = pattern_atoms(pattern, expanded);
    let mut frames: Vec<WidthFrame> = Vec::new();
    let mut frame_count = 0;
    let mut sequence = 0;
    let mut alternative = 0;
    let mut has_alternative = false;
    let mut last = 0;
    let mut has_last = false;
    let mut quantified = false;
    let mut position = 0;
    while position < source.len() {
        let atom = source[position];
        if atom == '*' || atom == '+' || atom == '?' || atom == '{' {
            if has_last == false || quantified {
                return WidthResult {
                    valid: false,
                    minimum: 0,
                };
            }
            if atom == '*' || atom == '?' {
                last = 0;
                position += 1;
            } else if atom == '+' {
                position += 1;
            } else {
                position += 1;
                let mut lower = 0;
                let mut digits = 0;
                while position < source.len()
                    && (source[position] as u32) >= 48
                    && (source[position] as u32) <= 57
                {
                    let digit = ((source[position] as u32) - 48) as usize;
                    let double = lower + lower;
                    let four = double + double;
                    let eight = four + four;
                    lower = eight + double + digit;
                    digits += 1;
                    position += 1;
                    if lower > 255 {
                        return WidthResult {
                            valid: false,
                            minimum: 0,
                        };
                    }
                }
                if digits == 0 {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                if position < source.len() && source[position] == ',' {
                    position += 1;
                    let mut upper = 0;
                    let mut upper_digits = 0;
                    while position < source.len()
                        && (source[position] as u32) >= 48
                        && (source[position] as u32) <= 57
                    {
                        let digit = ((source[position] as u32) - 48) as usize;
                        let double = upper + upper;
                        let four = double + double;
                        let eight = four + four;
                        upper = eight + double + digit;
                        upper_digits += 1;
                        position += 1;
                        if upper > 255 {
                            return WidthResult {
                                valid: false,
                                minimum: 0,
                            };
                        }
                    }
                    if upper_digits > 0 && upper < lower {
                        return WidthResult {
                            valid: false,
                            minimum: 0,
                        };
                    }
                }
                if position == source.len() || source[position] != '}' {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                position += 1;
                let unit = last;
                last = 0;
                let mut repeated = 0;
                while repeated < lower {
                    last += unit;
                    if last > 65535 {
                        return WidthResult {
                            valid: false,
                            minimum: 0,
                        };
                    }
                    repeated += 1;
                }
            };
            quantified = true;
            if position < source.len() && source[position] == '?' {
                position += 1;
            }
        } else if atom == '|' || atom == ')' {
            if has_last {
                sequence += last;
                has_last = false;
            }
            if atom == '|' {
                if has_alternative == false || sequence < alternative {
                    alternative = sequence;
                }
                has_alternative = true;
                sequence = 0;
                position += 1;
            } else {
                if frame_count == 0 {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                let group_width = width_choice(sequence, alternative, has_alternative);
                frame_count = frame_count - 1;
                let frame = frames[frame_count];
                sequence = frame.sequence;
                alternative = frame.alternative;
                has_alternative = frame.has_alternative;
                last = group_width;
                has_last = true;
                quantified = false;
                position += 1;
            };
        } else if atom == '(' {
            if source.len() - position > 1 && source[position + 1] == '?' {
                return WidthResult {
                    valid: false,
                    minimum: 0,
                };
            }
            if has_last {
                sequence += last;
                has_last = false;
            }
            let frame = WidthFrame {
                sequence,
                alternative,
                has_alternative,
            };
            if frame_count == frames.len() {
                frames.push(frame);
            } else {
                frames[frame_count] = frame;
            }
            frame_count += 1;
            sequence = 0;
            alternative = 0;
            has_alternative = false;
            quantified = false;
            position += 1;
        } else {
            if has_last {
                sequence += last;
            }
            has_last = true;
            quantified = false;
            last = 1;
            if atom == '^' || atom == '$' {
                last = 0;
                position += 1;
            } else if atom == '.' {
                position += 1;
            } else if atom == '[' {
                let mut end = position + 1;
                if source.len() - position >= 10
                    && source[position + 1] == '['
                    && source[position + 2] == ':'
                {
                    let kind = posix_class_kind(
                        source[position + 3],
                        source[position + 4],
                        source[position + 5],
                        source[position + 6],
                        source[position + 7],
                        source[position + 8],
                    );
                    end = position + posix_class_width(kind);
                } else {
                    while end < source.len() && source[end] != ']' {
                        if source[end] == '\\' {
                            end += 1;
                        }
                        end += 1;
                    }
                    end += 1;
                };
                if end > source.len() {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                let mut member: Vec<char> = Vec::new();
                let mut index = position;
                while index < end {
                    member.push(source[index]);
                    index += 1;
                }
                if supports_atoms(member) == false {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                position = end;
            } else if atom == '\\' {
                if source.len() - position < 2 {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                let escaped = source[position + 1];
                if escaped == 'm'
                    || escaped == 'M'
                    || escaped == 'y'
                    || escaped == 'Y'
                    || escaped == 'A'
                    || escaped == 'Z'
                {
                    last = 0;
                } else if escaped != 'd'
                    && escaped != 'D'
                    && escaped != 's'
                    && escaped != 'S'
                    && escaped != 'w'
                    && escaped != 'W'
                    && escaped != 'n'
                    && escaped != 'r'
                    && escaped != 't'
                    && escaped != '.'
                    && escaped != '+'
                    && escaped != '-'
                    && escaped != '?'
                    && escaped != '*'
                    && escaped != '^'
                    && escaped != '$'
                    && escaped != '|'
                    && escaped != '('
                    && escaped != ')'
                    && escaped != '\\'
                {
                    return WidthResult {
                        valid: false,
                        minimum: 0,
                    };
                }
                position += 2;
            } else if simple_literal_char(atom) {
                position += 1;
            } else {
                return WidthResult {
                    valid: false,
                    minimum: 0,
                };
            };
        };
        if sequence > 65535 {
            return WidthResult {
                valid: false,
                minimum: 0,
            };
        }
    }
    if frame_count != 0 {
        return WidthResult {
            valid: false,
            minimum: 0,
        };
    }
    if has_last {
        sequence += last;
    }
    WidthResult {
        valid: sequence <= 65535,
        minimum: width_choice(sequence, alternative, has_alternative),
    }
}

pub fn definitely_no_match_by_width(
    pattern: &str,
    subject: &str,
    from: usize,
    expanded: bool,
) -> bool {
    let parsed = parse_minimum_width(pattern, expanded);
    if parsed.valid == false {
        return false;
    }
    let haystack: Vec<char> = subject.chars().collect();
    from <= haystack.len() && parsed.minimum > haystack.len() - from
}

pub fn find_width_rejected(
    pattern: &str,
    subject: &str,
    from: usize,
    expanded: bool,
) -> MatchOutcome {
    if definitely_no_match_by_width(pattern, subject, from, expanded) {
        return MatchOutcome::NoMatch;
    }
    MatchOutcome::Uncertain
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

fn make_capture_node(
    operation: usize,
    left: usize,
    right: usize,
    group: usize,
    atom: char,
    preference: usize,
    first: usize,
    last: usize,
) -> CaptureNode {
    CaptureNode {
        operation,
        left,
        right,
        group,
        atom,
        lower: 0,
        upper: 0,
        unbounded: false,
        preference,
        first,
        last,
    }
}

fn capture_width_sum(left: usize, right: usize) -> usize {
    if left > MAX_CAPTURE_WORK - right {
        return MAX_CAPTURE_WORK;
    }
    left + right
}

fn capture_width_repeat(width: usize, count: usize) -> usize {
    let mut result = 0;
    let mut index = 0;
    while index < count {
        result = capture_width_sum(result, width);
        index += 1;
    }
    result
}

#[derive(Clone, Copy)]
struct CaptureClassMember {
    kind: usize,
    lower: u32,
    upper: u32,
    complement: bool,
}

struct CaptureClass {
    valid: bool,
    negated: bool,
    members: Vec<CaptureClassMember>,
}

struct CaptureClassAtom {
    valid: bool,
    range_endpoint: bool,
    end: usize,
    kind: usize,
    value: u32,
    complement: bool,
}

struct CaptureSource {
    valid: bool,
    syntax: char,
    case_mode: char,
    newline_mode: char,
    atoms: Vec<char>,
    escape_ends: Vec<usize>,
}

struct CaptureNumeric {
    valid: bool,
    backreference: bool,
    value: u32,
    end: usize,
}

fn capture_digit_value(atom: char) -> u32 {
    let value = atom as u32;
    if value >= 48 && value <= 57 {
        return value - 48;
    }
    if value >= 65 && value <= 70 {
        return value - 55;
    }
    if value >= 97 && value <= 102 {
        return value - 87;
    }
    16
}

struct CaptureInteger {
    value: u32,
    high: bool,
}

fn capture_wrapping_digit(value: u32, base: usize, digit: u32) -> CaptureInteger {
    let maximum: u32 = 2147483647;
    let mut result: u32 = 0;
    let mut high = false;
    let mut count = 0;
    while count < base {
        if value > maximum - result {
            result = value - (maximum - result) - 1;
            high = high == false;
        } else {
            result += value;
        };
        count += 1;
    }
    if digit > maximum - result {
        result = digit - (maximum - result) - 1;
        high = high == false;
    } else {
        result += digit;
    };
    CaptureInteger {
        value: result,
        high,
    }
}

fn parse_capture_numeric(source: Vec<char>, groups: usize, basic: bool) -> CaptureNumeric {
    let marker = source[1];
    let mut value: u32 = 0;
    let mut high = false;
    let mut end = 2;
    let mut valid = source.len() > 2;
    let mut backreference = false;
    if marker == 'c' {
        if valid {
            value = source[2] as u32;
            while value >= 32 {
                let mut chunk: u32 = 32;
                while chunk + chunk <= value {
                    chunk += chunk;
                }
                value = value - chunk;
            }
            end = 3;
        }
    } else if marker == 'x' || marker == 'u' || marker == 'U' {
        let mut digits = 0;
        let mut limit = 255;
        if marker == 'u' {
            limit = 4;
        } else if marker == 'U' {
            limit = 8;
        };
        while end < source.len() && digits < limit {
            let digit = capture_digit_value(source[end]);
            if digit == 16 {
                break;
            }
            let number = capture_wrapping_digit(value, 16, digit);
            value = number.value;
            high = number.high;
            end += 1;
            digits += 1;
        }
        valid = high == false
            && value <= 2147483646
            && digits > 0
            && (marker == 'x' || digits == limit);
    } else {
        let mut digits = 0;
        end = 1;
        if marker != '0' {
            while end < source.len() && digits < 255 {
                let digit = capture_digit_value(source[end]);
                if digit > 9 || (basic && digits == 1) {
                    break;
                }
                let number = capture_wrapping_digit(value, 10, digit);
                value = number.value;
                high = number.high;
                end += 1;
                digits += 1;
            }
            backreference = digits == 1
                || (high == false
                    && value > 0
                    && value <= 2147483646
                    && (value as usize) <= groups);
        }
        if backreference {
            valid = high == false && value > 0 && value <= 2147483646 && (value as usize) <= groups;
        } else {
            end = 1;
            digits = 0;
            value = 0;
            while end < source.len() && digits < 3 {
                let digit = capture_digit_value(source[end]);
                if digit > 7 {
                    break;
                }
                let candidate = capture_wrapping_digit(value, 8, digit).value;
                if candidate > 255 {
                    break;
                }
                value = candidate;
                end += 1;
                digits += 1;
            }
            valid = digits > 0;
        };
    };
    CaptureNumeric {
        valid,
        backreference,
        value,
        end,
    }
}

fn capture_assertion(operation: usize) -> bool {
    operation == VM_BEGIN
        || operation == VM_END
        || operation == VM_WORD_BEGIN
        || operation == VM_WORD_END
        || operation == VM_ABSOLUTE_BEGIN
        || operation == VM_ABSOLUTE_END
        || operation == VM_BOUNDARY
        || operation == VM_NOT_BOUNDARY
}

fn capture_assertion_matches(
    operation: usize,
    position: usize,
    length: usize,
    before: bool,
    after: bool,
    previous_newline: bool,
    next_newline: bool,
    line_anchors: bool,
) -> bool {
    (operation == VM_BEGIN && (position == 0 || (line_anchors && previous_newline)))
        || (operation == VM_END && (position == length || (line_anchors && next_newline)))
        || (operation == VM_ABSOLUTE_BEGIN && position == 0)
        || (operation == VM_ABSOLUTE_END && position == length)
        || (operation == VM_WORD_BEGIN && before == false && after)
        || (operation == VM_WORD_END && before && after == false)
        || (operation == VM_BOUNDARY && before != after)
        || (operation == VM_NOT_BOUNDARY && before == after)
}

fn capture_collating_value(name: Vec<char>) -> u32 {
    if name.len() == 1 {
        return name[0] as u32;
    }
    if name.len() == 3 && name[0] == 'N' && name[1] == 'U' && name[2] == 'L' {
        return 0;
    }
    if name.len() == 3 && name[0] == 'S' && name[1] == 'O' && name[2] == 'H' {
        return 1;
    }
    if name.len() == 3 && name[0] == 'S' && name[1] == 'T' && name[2] == 'X' {
        return 2;
    }
    if name.len() == 3 && name[0] == 'E' && name[1] == 'T' && name[2] == 'X' {
        return 3;
    }
    if name.len() == 3 && name[0] == 'E' && name[1] == 'O' && name[2] == 'T' {
        return 4;
    }
    if name.len() == 3 && name[0] == 'E' && name[1] == 'N' && name[2] == 'Q' {
        return 5;
    }
    if name.len() == 3 && name[0] == 'A' && name[1] == 'C' && name[2] == 'K' {
        return 6;
    }
    if name.len() == 3 && name[0] == 'B' && name[1] == 'E' && name[2] == 'L' {
        return 7;
    }
    if name.len() == 5
        && name[0] == 'a'
        && name[1] == 'l'
        && name[2] == 'e'
        && name[3] == 'r'
        && name[4] == 't'
    {
        return 7;
    }
    if name.len() == 2 && name[0] == 'B' && name[1] == 'S' {
        return 8;
    }
    if name.len() == 9
        && name[0] == 'b'
        && name[1] == 'a'
        && name[2] == 'c'
        && name[3] == 'k'
        && name[4] == 's'
        && name[5] == 'p'
        && name[6] == 'a'
        && name[7] == 'c'
        && name[8] == 'e'
    {
        return 8;
    }
    if name.len() == 2 && name[0] == 'H' && name[1] == 'T' {
        return 9;
    }
    if name.len() == 3 && name[0] == 't' && name[1] == 'a' && name[2] == 'b' {
        return 9;
    }
    if name.len() == 2 && name[0] == 'L' && name[1] == 'F' {
        return 10;
    }
    if name.len() == 7
        && name[0] == 'n'
        && name[1] == 'e'
        && name[2] == 'w'
        && name[3] == 'l'
        && name[4] == 'i'
        && name[5] == 'n'
        && name[6] == 'e'
    {
        return 10;
    }
    if name.len() == 2 && name[0] == 'V' && name[1] == 'T' {
        return 11;
    }
    if name.len() == 12
        && name[0] == 'v'
        && name[1] == 'e'
        && name[2] == 'r'
        && name[3] == 't'
        && name[4] == 'i'
        && name[5] == 'c'
        && name[6] == 'a'
        && name[7] == 'l'
        && name[8] == '-'
        && name[9] == 't'
        && name[10] == 'a'
        && name[11] == 'b'
    {
        return 11;
    }
    if name.len() == 2 && name[0] == 'F' && name[1] == 'F' {
        return 12;
    }
    if name.len() == 9
        && name[0] == 'f'
        && name[1] == 'o'
        && name[2] == 'r'
        && name[3] == 'm'
        && name[4] == '-'
        && name[5] == 'f'
        && name[6] == 'e'
        && name[7] == 'e'
        && name[8] == 'd'
    {
        return 12;
    }
    if name.len() == 2 && name[0] == 'C' && name[1] == 'R' {
        return 13;
    }
    if name.len() == 15
        && name[0] == 'c'
        && name[1] == 'a'
        && name[2] == 'r'
        && name[3] == 'r'
        && name[4] == 'i'
        && name[5] == 'a'
        && name[6] == 'g'
        && name[7] == 'e'
        && name[8] == '-'
        && name[9] == 'r'
        && name[10] == 'e'
        && name[11] == 't'
        && name[12] == 'u'
        && name[13] == 'r'
        && name[14] == 'n'
    {
        return 13;
    }
    if name.len() == 2 && name[0] == 'S' && name[1] == 'O' {
        return 14;
    }
    if name.len() == 2 && name[0] == 'S' && name[1] == 'I' {
        return 15;
    }
    if name.len() == 3 && name[0] == 'D' && name[1] == 'L' && name[2] == 'E' {
        return 16;
    }
    if name.len() == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '1' {
        return 17;
    }
    if name.len() == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '2' {
        return 18;
    }
    if name.len() == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '3' {
        return 19;
    }
    if name.len() == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '4' {
        return 20;
    }
    if name.len() == 3 && name[0] == 'N' && name[1] == 'A' && name[2] == 'K' {
        return 21;
    }
    if name.len() == 3 && name[0] == 'S' && name[1] == 'Y' && name[2] == 'N' {
        return 22;
    }
    if name.len() == 3 && name[0] == 'E' && name[1] == 'T' && name[2] == 'B' {
        return 23;
    }
    if name.len() == 3 && name[0] == 'C' && name[1] == 'A' && name[2] == 'N' {
        return 24;
    }
    if name.len() == 2 && name[0] == 'E' && name[1] == 'M' {
        return 25;
    }
    if name.len() == 3 && name[0] == 'S' && name[1] == 'U' && name[2] == 'B' {
        return 26;
    }
    if name.len() == 3 && name[0] == 'E' && name[1] == 'S' && name[2] == 'C' {
        return 27;
    }
    if name.len() == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '4' {
        return 28;
    }
    if name.len() == 2 && name[0] == 'F' && name[1] == 'S' {
        return 28;
    }
    if name.len() == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '3' {
        return 29;
    }
    if name.len() == 2 && name[0] == 'G' && name[1] == 'S' {
        return 29;
    }
    if name.len() == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '2' {
        return 30;
    }
    if name.len() == 2 && name[0] == 'R' && name[1] == 'S' {
        return 30;
    }
    if name.len() == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '1' {
        return 31;
    }
    if name.len() == 2 && name[0] == 'U' && name[1] == 'S' {
        return 31;
    }
    if name.len() == 5
        && name[0] == 's'
        && name[1] == 'p'
        && name[2] == 'a'
        && name[3] == 'c'
        && name[4] == 'e'
    {
        return 32;
    }
    if name.len() == 16
        && name[0] == 'e'
        && name[1] == 'x'
        && name[2] == 'c'
        && name[3] == 'l'
        && name[4] == 'a'
        && name[5] == 'm'
        && name[6] == 'a'
        && name[7] == 't'
        && name[8] == 'i'
        && name[9] == 'o'
        && name[10] == 'n'
        && name[11] == '-'
        && name[12] == 'm'
        && name[13] == 'a'
        && name[14] == 'r'
        && name[15] == 'k'
    {
        return 33;
    }
    if name.len() == 14
        && name[0] == 'q'
        && name[1] == 'u'
        && name[2] == 'o'
        && name[3] == 't'
        && name[4] == 'a'
        && name[5] == 't'
        && name[6] == 'i'
        && name[7] == 'o'
        && name[8] == 'n'
        && name[9] == '-'
        && name[10] == 'm'
        && name[11] == 'a'
        && name[12] == 'r'
        && name[13] == 'k'
    {
        return 34;
    }
    if name.len() == 11
        && name[0] == 'n'
        && name[1] == 'u'
        && name[2] == 'm'
        && name[3] == 'b'
        && name[4] == 'e'
        && name[5] == 'r'
        && name[6] == '-'
        && name[7] == 's'
        && name[8] == 'i'
        && name[9] == 'g'
        && name[10] == 'n'
    {
        return 35;
    }
    if name.len() == 11
        && name[0] == 'd'
        && name[1] == 'o'
        && name[2] == 'l'
        && name[3] == 'l'
        && name[4] == 'a'
        && name[5] == 'r'
        && name[6] == '-'
        && name[7] == 's'
        && name[8] == 'i'
        && name[9] == 'g'
        && name[10] == 'n'
    {
        return 36;
    }
    if name.len() == 12
        && name[0] == 'p'
        && name[1] == 'e'
        && name[2] == 'r'
        && name[3] == 'c'
        && name[4] == 'e'
        && name[5] == 'n'
        && name[6] == 't'
        && name[7] == '-'
        && name[8] == 's'
        && name[9] == 'i'
        && name[10] == 'g'
        && name[11] == 'n'
    {
        return 37;
    }
    if name.len() == 9
        && name[0] == 'a'
        && name[1] == 'm'
        && name[2] == 'p'
        && name[3] == 'e'
        && name[4] == 'r'
        && name[5] == 's'
        && name[6] == 'a'
        && name[7] == 'n'
        && name[8] == 'd'
    {
        return 38;
    }
    if name.len() == 10
        && name[0] == 'a'
        && name[1] == 'p'
        && name[2] == 'o'
        && name[3] == 's'
        && name[4] == 't'
        && name[5] == 'r'
        && name[6] == 'o'
        && name[7] == 'p'
        && name[8] == 'h'
        && name[9] == 'e'
    {
        return 39;
    }
    if name.len() == 16
        && name[0] == 'l'
        && name[1] == 'e'
        && name[2] == 'f'
        && name[3] == 't'
        && name[4] == '-'
        && name[5] == 'p'
        && name[6] == 'a'
        && name[7] == 'r'
        && name[8] == 'e'
        && name[9] == 'n'
        && name[10] == 't'
        && name[11] == 'h'
        && name[12] == 'e'
        && name[13] == 's'
        && name[14] == 'i'
        && name[15] == 's'
    {
        return 40;
    }
    if name.len() == 17
        && name[0] == 'r'
        && name[1] == 'i'
        && name[2] == 'g'
        && name[3] == 'h'
        && name[4] == 't'
        && name[5] == '-'
        && name[6] == 'p'
        && name[7] == 'a'
        && name[8] == 'r'
        && name[9] == 'e'
        && name[10] == 'n'
        && name[11] == 't'
        && name[12] == 'h'
        && name[13] == 'e'
        && name[14] == 's'
        && name[15] == 'i'
        && name[16] == 's'
    {
        return 41;
    }
    if name.len() == 8
        && name[0] == 'a'
        && name[1] == 's'
        && name[2] == 't'
        && name[3] == 'e'
        && name[4] == 'r'
        && name[5] == 'i'
        && name[6] == 's'
        && name[7] == 'k'
    {
        return 42;
    }
    if name.len() == 9
        && name[0] == 'p'
        && name[1] == 'l'
        && name[2] == 'u'
        && name[3] == 's'
        && name[4] == '-'
        && name[5] == 's'
        && name[6] == 'i'
        && name[7] == 'g'
        && name[8] == 'n'
    {
        return 43;
    }
    if name.len() == 5
        && name[0] == 'c'
        && name[1] == 'o'
        && name[2] == 'm'
        && name[3] == 'm'
        && name[4] == 'a'
    {
        return 44;
    }
    if name.len() == 6
        && name[0] == 'h'
        && name[1] == 'y'
        && name[2] == 'p'
        && name[3] == 'h'
        && name[4] == 'e'
        && name[5] == 'n'
    {
        return 45;
    }
    if name.len() == 12
        && name[0] == 'h'
        && name[1] == 'y'
        && name[2] == 'p'
        && name[3] == 'h'
        && name[4] == 'e'
        && name[5] == 'n'
        && name[6] == '-'
        && name[7] == 'm'
        && name[8] == 'i'
        && name[9] == 'n'
        && name[10] == 'u'
        && name[11] == 's'
    {
        return 45;
    }
    if name.len() == 6
        && name[0] == 'p'
        && name[1] == 'e'
        && name[2] == 'r'
        && name[3] == 'i'
        && name[4] == 'o'
        && name[5] == 'd'
    {
        return 46;
    }
    if name.len() == 9
        && name[0] == 'f'
        && name[1] == 'u'
        && name[2] == 'l'
        && name[3] == 'l'
        && name[4] == '-'
        && name[5] == 's'
        && name[6] == 't'
        && name[7] == 'o'
        && name[8] == 'p'
    {
        return 46;
    }
    if name.len() == 5
        && name[0] == 's'
        && name[1] == 'l'
        && name[2] == 'a'
        && name[3] == 's'
        && name[4] == 'h'
    {
        return 47;
    }
    if name.len() == 7
        && name[0] == 's'
        && name[1] == 'o'
        && name[2] == 'l'
        && name[3] == 'i'
        && name[4] == 'd'
        && name[5] == 'u'
        && name[6] == 's'
    {
        return 47;
    }
    if name.len() == 4 && name[0] == 'z' && name[1] == 'e' && name[2] == 'r' && name[3] == 'o' {
        return 48;
    }
    if name.len() == 3 && name[0] == 'o' && name[1] == 'n' && name[2] == 'e' {
        return 49;
    }
    if name.len() == 3 && name[0] == 't' && name[1] == 'w' && name[2] == 'o' {
        return 50;
    }
    if name.len() == 5
        && name[0] == 't'
        && name[1] == 'h'
        && name[2] == 'r'
        && name[3] == 'e'
        && name[4] == 'e'
    {
        return 51;
    }
    if name.len() == 4 && name[0] == 'f' && name[1] == 'o' && name[2] == 'u' && name[3] == 'r' {
        return 52;
    }
    if name.len() == 4 && name[0] == 'f' && name[1] == 'i' && name[2] == 'v' && name[3] == 'e' {
        return 53;
    }
    if name.len() == 3 && name[0] == 's' && name[1] == 'i' && name[2] == 'x' {
        return 54;
    }
    if name.len() == 5
        && name[0] == 's'
        && name[1] == 'e'
        && name[2] == 'v'
        && name[3] == 'e'
        && name[4] == 'n'
    {
        return 55;
    }
    if name.len() == 5
        && name[0] == 'e'
        && name[1] == 'i'
        && name[2] == 'g'
        && name[3] == 'h'
        && name[4] == 't'
    {
        return 56;
    }
    if name.len() == 4 && name[0] == 'n' && name[1] == 'i' && name[2] == 'n' && name[3] == 'e' {
        return 57;
    }
    if name.len() == 5
        && name[0] == 'c'
        && name[1] == 'o'
        && name[2] == 'l'
        && name[3] == 'o'
        && name[4] == 'n'
    {
        return 58;
    }
    if name.len() == 9
        && name[0] == 's'
        && name[1] == 'e'
        && name[2] == 'm'
        && name[3] == 'i'
        && name[4] == 'c'
        && name[5] == 'o'
        && name[6] == 'l'
        && name[7] == 'o'
        && name[8] == 'n'
    {
        return 59;
    }
    if name.len() == 14
        && name[0] == 'l'
        && name[1] == 'e'
        && name[2] == 's'
        && name[3] == 's'
        && name[4] == '-'
        && name[5] == 't'
        && name[6] == 'h'
        && name[7] == 'a'
        && name[8] == 'n'
        && name[9] == '-'
        && name[10] == 's'
        && name[11] == 'i'
        && name[12] == 'g'
        && name[13] == 'n'
    {
        return 60;
    }
    if name.len() == 11
        && name[0] == 'e'
        && name[1] == 'q'
        && name[2] == 'u'
        && name[3] == 'a'
        && name[4] == 'l'
        && name[5] == 's'
        && name[6] == '-'
        && name[7] == 's'
        && name[8] == 'i'
        && name[9] == 'g'
        && name[10] == 'n'
    {
        return 61;
    }
    if name.len() == 17
        && name[0] == 'g'
        && name[1] == 'r'
        && name[2] == 'e'
        && name[3] == 'a'
        && name[4] == 't'
        && name[5] == 'e'
        && name[6] == 'r'
        && name[7] == '-'
        && name[8] == 't'
        && name[9] == 'h'
        && name[10] == 'a'
        && name[11] == 'n'
        && name[12] == '-'
        && name[13] == 's'
        && name[14] == 'i'
        && name[15] == 'g'
        && name[16] == 'n'
    {
        return 62;
    }
    if name.len() == 13
        && name[0] == 'q'
        && name[1] == 'u'
        && name[2] == 'e'
        && name[3] == 's'
        && name[4] == 't'
        && name[5] == 'i'
        && name[6] == 'o'
        && name[7] == 'n'
        && name[8] == '-'
        && name[9] == 'm'
        && name[10] == 'a'
        && name[11] == 'r'
        && name[12] == 'k'
    {
        return 63;
    }
    if name.len() == 13
        && name[0] == 'c'
        && name[1] == 'o'
        && name[2] == 'm'
        && name[3] == 'm'
        && name[4] == 'e'
        && name[5] == 'r'
        && name[6] == 'c'
        && name[7] == 'i'
        && name[8] == 'a'
        && name[9] == 'l'
        && name[10] == '-'
        && name[11] == 'a'
        && name[12] == 't'
    {
        return 64;
    }
    if name.len() == 19
        && name[0] == 'l'
        && name[1] == 'e'
        && name[2] == 'f'
        && name[3] == 't'
        && name[4] == '-'
        && name[5] == 's'
        && name[6] == 'q'
        && name[7] == 'u'
        && name[8] == 'a'
        && name[9] == 'r'
        && name[10] == 'e'
        && name[11] == '-'
        && name[12] == 'b'
        && name[13] == 'r'
        && name[14] == 'a'
        && name[15] == 'c'
        && name[16] == 'k'
        && name[17] == 'e'
        && name[18] == 't'
    {
        return 91;
    }
    if name.len() == 9
        && name[0] == 'b'
        && name[1] == 'a'
        && name[2] == 'c'
        && name[3] == 'k'
        && name[4] == 's'
        && name[5] == 'l'
        && name[6] == 'a'
        && name[7] == 's'
        && name[8] == 'h'
    {
        return 92;
    }
    if name.len() == 15
        && name[0] == 'r'
        && name[1] == 'e'
        && name[2] == 'v'
        && name[3] == 'e'
        && name[4] == 'r'
        && name[5] == 's'
        && name[6] == 'e'
        && name[7] == '-'
        && name[8] == 's'
        && name[9] == 'o'
        && name[10] == 'l'
        && name[11] == 'i'
        && name[12] == 'd'
        && name[13] == 'u'
        && name[14] == 's'
    {
        return 92;
    }
    if name.len() == 20
        && name[0] == 'r'
        && name[1] == 'i'
        && name[2] == 'g'
        && name[3] == 'h'
        && name[4] == 't'
        && name[5] == '-'
        && name[6] == 's'
        && name[7] == 'q'
        && name[8] == 'u'
        && name[9] == 'a'
        && name[10] == 'r'
        && name[11] == 'e'
        && name[12] == '-'
        && name[13] == 'b'
        && name[14] == 'r'
        && name[15] == 'a'
        && name[16] == 'c'
        && name[17] == 'k'
        && name[18] == 'e'
        && name[19] == 't'
    {
        return 93;
    }
    if name.len() == 10
        && name[0] == 'c'
        && name[1] == 'i'
        && name[2] == 'r'
        && name[3] == 'c'
        && name[4] == 'u'
        && name[5] == 'm'
        && name[6] == 'f'
        && name[7] == 'l'
        && name[8] == 'e'
        && name[9] == 'x'
    {
        return 94;
    }
    if name.len() == 17
        && name[0] == 'c'
        && name[1] == 'i'
        && name[2] == 'r'
        && name[3] == 'c'
        && name[4] == 'u'
        && name[5] == 'm'
        && name[6] == 'f'
        && name[7] == 'l'
        && name[8] == 'e'
        && name[9] == 'x'
        && name[10] == '-'
        && name[11] == 'a'
        && name[12] == 'c'
        && name[13] == 'c'
        && name[14] == 'e'
        && name[15] == 'n'
        && name[16] == 't'
    {
        return 94;
    }
    if name.len() == 10
        && name[0] == 'u'
        && name[1] == 'n'
        && name[2] == 'd'
        && name[3] == 'e'
        && name[4] == 'r'
        && name[5] == 's'
        && name[6] == 'c'
        && name[7] == 'o'
        && name[8] == 'r'
        && name[9] == 'e'
    {
        return 95;
    }
    if name.len() == 8
        && name[0] == 'l'
        && name[1] == 'o'
        && name[2] == 'w'
        && name[3] == '-'
        && name[4] == 'l'
        && name[5] == 'i'
        && name[6] == 'n'
        && name[7] == 'e'
    {
        return 95;
    }
    if name.len() == 12
        && name[0] == 'g'
        && name[1] == 'r'
        && name[2] == 'a'
        && name[3] == 'v'
        && name[4] == 'e'
        && name[5] == '-'
        && name[6] == 'a'
        && name[7] == 'c'
        && name[8] == 'c'
        && name[9] == 'e'
        && name[10] == 'n'
        && name[11] == 't'
    {
        return 96;
    }
    if name.len() == 10
        && name[0] == 'l'
        && name[1] == 'e'
        && name[2] == 'f'
        && name[3] == 't'
        && name[4] == '-'
        && name[5] == 'b'
        && name[6] == 'r'
        && name[7] == 'a'
        && name[8] == 'c'
        && name[9] == 'e'
    {
        return 123;
    }
    if name.len() == 18
        && name[0] == 'l'
        && name[1] == 'e'
        && name[2] == 'f'
        && name[3] == 't'
        && name[4] == '-'
        && name[5] == 'c'
        && name[6] == 'u'
        && name[7] == 'r'
        && name[8] == 'l'
        && name[9] == 'y'
        && name[10] == '-'
        && name[11] == 'b'
        && name[12] == 'r'
        && name[13] == 'a'
        && name[14] == 'c'
        && name[15] == 'k'
        && name[16] == 'e'
        && name[17] == 't'
    {
        return 123;
    }
    if name.len() == 13
        && name[0] == 'v'
        && name[1] == 'e'
        && name[2] == 'r'
        && name[3] == 't'
        && name[4] == 'i'
        && name[5] == 'c'
        && name[6] == 'a'
        && name[7] == 'l'
        && name[8] == '-'
        && name[9] == 'l'
        && name[10] == 'i'
        && name[11] == 'n'
        && name[12] == 'e'
    {
        return 124;
    }
    if name.len() == 11
        && name[0] == 'r'
        && name[1] == 'i'
        && name[2] == 'g'
        && name[3] == 'h'
        && name[4] == 't'
        && name[5] == '-'
        && name[6] == 'b'
        && name[7] == 'r'
        && name[8] == 'a'
        && name[9] == 'c'
        && name[10] == 'e'
    {
        return 125;
    }
    if name.len() == 19
        && name[0] == 'r'
        && name[1] == 'i'
        && name[2] == 'g'
        && name[3] == 'h'
        && name[4] == 't'
        && name[5] == '-'
        && name[6] == 'c'
        && name[7] == 'u'
        && name[8] == 'r'
        && name[9] == 'l'
        && name[10] == 'y'
        && name[11] == '-'
        && name[12] == 'b'
        && name[13] == 'r'
        && name[14] == 'a'
        && name[15] == 'c'
        && name[16] == 'k'
        && name[17] == 'e'
        && name[18] == 't'
    {
        return 125;
    }
    if name.len() == 5
        && name[0] == 't'
        && name[1] == 'i'
        && name[2] == 'l'
        && name[3] == 'd'
        && name[4] == 'e'
    {
        return 126;
    }
    if name.len() == 3 && name[0] == 'D' && name[1] == 'E' && name[2] == 'L' {
        return 127;
    }
    2147483647
}

fn parse_capture_class_atom(source: Vec<char>, syntax: char, groups: usize) -> CaptureClassAtom {
    let position = 0;
    let mut range_endpoint = true;
    let mut valid = position < source.len();
    let mut end = position;
    let mut kind = CAPTURE_CLASS_RANGE;
    let mut value: u32 = 0;
    let mut complement = false;
    if valid {
        let atom = source[position];
        value = atom as u32;
        end += 1;
        if atom == '['
            && source.len() - position >= 2
            && (source[position + 1] == ':'
                || source[position + 1] == '.'
                || source[position + 1] == '=')
        {
            valid = false;
            if source[position + 1] == '.' || source[position + 1] == '=' {
                let marker = source[position + 1];
                range_endpoint = marker == '.';
                end = position + 2;
                let mut name: Vec<char> = Vec::new();
                while end + 1 < source.len() && (source[end] != marker || source[end + 1] != ']') {
                    name.push(source[end]);
                    end += 1;
                }
                if end + 1 < source.len() && name.len() > 0 {
                    value = capture_collating_value(name);
                    valid = value != 2147483647;
                    end += 2;
                }
            } else if source[position + 1] == ':' && source.len() - position >= 8 {
                kind = posix_class_kind(
                    source[position + 2],
                    source[position + 3],
                    source[position + 4],
                    source[position + 5],
                    source[position + 6],
                    source[position + 7],
                );
                if kind > 0 {
                    end = position + posix_class_width(kind) - 2;
                    valid = end <= source.len() && source[end - 2] == ':' && source[end - 1] == ']';
                };
            };
        } else if atom == '\\' && syntax == 'a' {
            valid = end < source.len();
            if valid {
                let escaped = source[end];
                end += 1;
                value = escaped as u32;
                if escaped == 'x'
                    || escaped == 'u'
                    || escaped == 'U'
                    || escaped == 'c'
                    || (value >= 48 && value <= 57)
                {
                    let numeric = parse_capture_numeric(source, groups, false);
                    valid = numeric.valid && numeric.backreference == false;
                    value = numeric.value;
                    end = numeric.end;
                } else if escaped == 'd' || escaped == 'D' {
                    kind = 1;
                    complement = escaped == 'D';
                } else if escaped == 's' || escaped == 'S' {
                    kind = 4;
                    complement = escaped == 'S';
                } else if escaped == 'w' || escaped == 'W' {
                    kind = 14;
                    complement = escaped == 'W';
                } else if escaped == 'a' {
                    value = 7;
                } else if escaped == 'b' {
                    value = 8;
                } else if escaped == 'B' {
                    value = 92;
                } else if escaped == 'e' {
                    value = 27;
                } else if escaped == 'f' {
                    value = 12;
                } else if escaped == 'n' {
                    value = 10;
                } else if escaped == 'r' {
                    value = 13;
                } else if escaped == 't' {
                    value = 9;
                } else if escaped == 'v' {
                    value = 11;
                } else if (value >= 48 && value <= 57)
                    || (value >= 65 && value <= 90)
                    || (value >= 97 && value <= 122)
                {
                    valid = false;
                };
            };
        };
    };
    CaptureClassAtom {
        valid,
        range_endpoint,
        end,
        kind,
        value,
        complement,
    }
}

fn parse_capture_class(source: Vec<char>, syntax: char, groups: usize) -> CaptureClass {
    let mut position = 1;
    let mut negated = false;
    if position < source.len() && source[position] == '^' {
        negated = true;
        position += 1;
    };
    let first = position;
    let mut members: Vec<CaptureClassMember> = Vec::new();
    let mut valid = false;
    while position < source.len() {
        if source[position] == ']' && position > first {
            valid = true;
            break;
        };
        if source[position] == '-'
            && position > first
            && position + 1 < source.len()
            && source[position + 1] != ']'
        {
            break;
        };
        let mut lookahead: Vec<char> = Vec::new();
        let mut look = position;
        while look < source.len() && look - position < 257 {
            lookahead.push(source[look]);
            look += 1;
        }
        let atom = parse_capture_class_atom(lookahead, syntax, groups);
        if atom.valid == false {
            break;
        };
        position += atom.end;
        let mut upper = atom.value;
        if source.len() - position >= 2 && source[position] == '-' && source[position + 1] != ']' {
            let mut lookahead: Vec<char> = Vec::new();
            let mut look = position + 1;
            while look < source.len() && look - position < 258 {
                lookahead.push(source[look]);
                look += 1;
            }
            let bound = parse_capture_class_atom(lookahead, syntax, groups);
            if bound.valid == false
                || atom.range_endpoint == false
                || bound.range_endpoint == false
                || atom.kind != CAPTURE_CLASS_RANGE
                || bound.kind != CAPTURE_CLASS_RANGE
                || bound.value < atom.value
            {
                break;
            };
            upper = bound.value;
            position += 1 + bound.end;
        };
        members.push(CaptureClassMember {
            kind: atom.kind,
            lower: atom.value,
            upper,
            complement: atom.complement,
        });
    }
    members.push(CaptureClassMember {
        kind: 0,
        lower: 0,
        upper: 0,
        complement: false,
    });
    CaptureClass {
        valid,
        negated,
        members,
    }
}

fn capture_class_member_matches(member: CaptureClassMember, actual: char, sensitive: bool) -> bool {
    let codepoint = actual as u32;
    let digit = codepoint >= 48 && codepoint <= 57;
    let upper = codepoint >= 65 && codepoint <= 90;
    let lower = codepoint >= 97 && codepoint <= 122;
    let letter = upper || lower;
    let space = (codepoint >= 9 && codepoint <= 13) || codepoint == 32;
    let kind = member.kind;
    let mut matched = (kind == 1 && digit)
        || (kind == 2 && letter)
        || (kind == 3 && (upper || (sensitive == false && lower)))
        || (kind == 4 && space)
        || (kind == 5 && (digit || letter))
        || (kind == 6 && codepoint <= 127)
        || (kind == 7 && (codepoint == 32 || codepoint == 9))
        || (kind == 8 && (codepoint <= 31 || (codepoint >= 127 && codepoint <= 159)))
        || (kind == 9 && codepoint >= 33 && codepoint <= 126)
        || (kind == 10 && (lower || (sensitive == false && upper)))
        || (kind == 11 && codepoint >= 32 && codepoint <= 126)
        || (kind == 12
            && ((codepoint >= 33 && codepoint <= 47)
                || (codepoint >= 58 && codepoint <= 64)
                || (codepoint >= 91 && codepoint <= 96)
                || (codepoint >= 123 && codepoint <= 126)))
        || (kind == 13
            && (digit
                || (codepoint >= 65 && codepoint <= 70)
                || (codepoint >= 97 && codepoint <= 102)))
        || (kind == 14 && (digit || letter || codepoint == 95));
    if kind == CAPTURE_CLASS_RANGE {
        matched = codepoint >= member.lower && codepoint <= member.upper;
        if sensitive == false {
            let mut alternate = codepoint;
            if upper {
                alternate += 32;
            } else if lower {
                alternate = alternate - 32;
            };
            matched = matched || (alternate >= member.lower && alternate <= member.upper);
        };
    };
    matched != member.complement
}

fn validation_pattern_source(pattern: &str, syntax: char, expanded: bool) -> InlineOptionsResult {
    let source: Vec<char> = pattern.chars().collect();
    let prefixed = source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && (source[3] == ':' || source[3] == '=');
    if syntax == 'a' || ((syntax == 'b' || syntax == 'e') && prefixed) {
        let parsed = capture_pattern_source(pattern, expanded);
        return InlineOptionsResult {
            valid: parsed.valid,
            syntax: parsed.syntax,
            case_mode: parsed.case_mode,
            newline_mode: parsed.newline_mode,
            atoms: parsed.atoms,
        };
    }
    InlineOptionsResult {
        valid: true,
        syntax,
        case_mode: ' ',
        newline_mode: ' ',
        atoms: pattern_atoms(pattern, expanded),
    }
}

fn capture_pattern_source(pattern: &str, expanded: bool) -> CaptureSource {
    let source: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    let mut valid = true;
    let mut syntax = 'a';
    let mut case_mode = ' ';
    let mut newline_mode = ' ';
    let mut effective_expanded = expanded;
    if source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && (source[3] == ':' || source[3] == '=')
    {
        position = 4;
        if source[3] == '=' {
            syntax = 'q';
        }
    };
    if syntax != 'q'
        && source.len() - position >= 3
        && source[position] == '('
        && source[position + 1] == '?'
        && (((source[position + 2] as u32) >= 65 && (source[position + 2] as u32) <= 90)
            || ((source[position + 2] as u32) >= 97 && (source[position + 2] as u32) <= 122))
    {
        position += 2;
        while position < source.len() && source[position] != ')' {
            let option = source[position];
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
            position += 1;
        }
        if position == source.len() {
            valid = false;
        } else {
            position += 1;
        };
    };
    if syntax == 'q' {
        effective_expanded = false;
        newline_mode = 's';
    }
    let mut atoms: Vec<char> = Vec::new();
    let mut escape_ends: Vec<usize> = Vec::new();
    while valid && position < source.len() {
        let atom = source[position];
        if syntax == 'q' {
            atoms.push(atom);
            position += 1;
        } else if atom == '[' {
            atoms.push(atom);
            position += 1;
            if position < source.len() && source[position] == '^' {
                atoms.push(source[position]);
                position += 1;
            };
            let first = position;
            let mut special = ' ';
            while position < source.len() {
                let current = source[position];
                atoms.push(current);
                position += 1;
                if special == ' ' && syntax == 'a' && current == '\\' && position < source.len() {
                    let marker = source[position];
                    atoms.push(marker);
                    position += 1;
                    if marker == 'c' && position < source.len() {
                        atoms.push(source[position]);
                        position += 1;
                    }
                } else if special != ' ' {
                    if current == special && position < source.len() && source[position] == ']' {
                        atoms.push(']');
                        position += 1;
                        special = ' ';
                    };
                } else if current == '['
                    && position < source.len()
                    && (source[position] == ':'
                        || source[position] == '.'
                        || source[position] == '=')
                {
                    special = source[position];
                    atoms.push(special);
                    position += 1;
                } else if current == ']' && position > first + 1 {
                    break;
                };
            }
        } else if atom == '\\' {
            let escape_start = atoms.len();
            atoms.push(atom);
            position += 1;
            if position < source.len() {
                let marker = source[position];
                atoms.push(marker);
                position += 1;
                if syntax == 'a' && marker == 'c' && position < source.len() {
                    atoms.push(source[position]);
                    position += 1;
                } else if syntax == 'a'
                    && (marker == 'x'
                        || marker == 'u'
                        || marker == 'U'
                        || ((marker as u32) >= 48 && (marker as u32) <= 57))
                {
                    let mut limit = 255;
                    if marker == 'u' {
                        limit = 4;
                    } else if marker == 'U' {
                        limit = 8;
                    };
                    let mut digits = 0;
                    while position < source.len() && digits < limit {
                        let digit = capture_digit_value(source[position]);
                        if digit == 16
                            || ((marker as u32) >= 48 && (marker as u32) <= 57 && digit > 9)
                        {
                            break;
                        }
                        atoms.push(source[position]);
                        position += 1;
                        digits += 1;
                    }
                };
            };
            escape_ends.push(escape_start);
            escape_ends.push(atoms.len());
        } else if syntax == 'a'
            && atom == '('
            && source.len() - position >= 3
            && source[position + 1] == '?'
            && source[position + 2] == '#'
        {
            position += 3;
            while position < source.len() && source[position] != ')' {
                position += 1;
            }
            if position == source.len() {
                valid = false;
            } else {
                position += 1;
            };
        } else if effective_expanded && atom == '#' {
            while position < source.len() && source[position] != '\n' {
                position += 1;
            }
        } else if effective_expanded && (atom == ' ' || ((atom as u32) >= 9 && (atom as u32) <= 13))
        {
            position += 1;
        } else {
            atoms.push(atom);
            position += 1;
        };
    }
    CaptureSource {
        valid,
        syntax,
        case_mode,
        newline_mode,
        atoms,
        escape_ends,
    }
}

fn compile_capture_program_atoms(
    source: Vec<char>,
    escape_ends: Vec<usize>,
    syntax: char,
    mut valid: bool,
    case_mode: char,
    newline_mode: char,
) -> CaptureProgram {
    let mut class_members: Vec<CaptureClassMember> = Vec::new();
    let mut nodes: Vec<CaptureNode> = Vec::new();
    nodes.push(make_capture_node(NODE_EMPTY, 0, 0, 0, ' ', 0, 1, 0));
    let mut frames: Vec<CaptureFrame> = Vec::new();
    frames.push(CaptureFrame {
        operation: NODE_GROUP,
        sequence: 0,
        alternative: 0,
        group: 0,
        first: 1,
        branched: false,
    });
    let mut frame_count = 1;
    let mut groups = 0;
    let mut closed: Vec<usize> = Vec::new();
    closed.push(0);
    let mut backreferences = false;
    let mut assertions = false;
    let mut assertion_depth = 0;
    let mut position = 0;
    let mut escape_index = 0;
    let mut basic_star_literal = true;
    while position < source.len() && valid {
        let mut atom = source[position];
        let mut literal = syntax == 'q';
        if syntax == 'b' {
            if atom == '\\'
                && source.len() - position >= 2
                && (source[position + 1] == '(' || source[position + 1] == ')')
            {
                position += 1;
                atom = source[position];
            } else if atom == '+'
                || atom == '?'
                || atom == '|'
                || atom == '('
                || atom == ')'
                || atom == '{'
                || atom == '}'
            {
                literal = true;
            } else if atom == '^' && frames[frame_count - 1].sequence > 0 {
                literal = true;
            } else if atom == '$'
                && position + 1 < source.len()
                && (source.len() - position < 3
                    || source[position + 1] != '\\'
                    || source[position + 2] != ')')
            {
                literal = true;
            } else if atom == '*' && basic_star_literal {
                literal = true;
            };
        }
        if syntax == 'e' && atom == ')' && frame_count == 1 {
            literal = true;
        }
        if atom == ']'
            || atom == '}'
            || (atom == '{'
                && (source.len() - position < 2
                    || (source[position + 1] as u32) < 48
                    || (source[position + 1] as u32) > 57))
        {
            literal = true;
        }
        let mut node = 0;
        let mut has_atom = false;
        if literal {
            node = nodes.len();
            nodes.push(make_capture_node(VM_LITERAL, 0, 0, 0, atom, 0, 1, 0));
            position += 1;
            has_atom = true;
        } else if atom == '(' {
            basic_star_literal = true;
            let mut group = 0;
            let first = groups + 1;
            let mut operation = NODE_GROUP;
            position += 1;
            if syntax != 'b' && position < source.len() && source[position] == '?' {
                if syntax != 'a' {
                    valid = false;
                }
                position += 1;
                if position < source.len() && source[position] == ':' {
                    position += 1;
                } else {
                    let mut behind = false;
                    if position < source.len() && source[position] == '<' {
                        behind = true;
                        position += 1;
                    }
                    if position < source.len()
                        && (source[position] == '=' || source[position] == '!')
                    {
                        operation = NODE_LOOKAHEAD;
                        if behind {
                            operation = NODE_LOOKBEHIND;
                        }
                        if source[position] == '!' {
                            operation = NODE_NOT_LOOKAHEAD;
                            if behind {
                                operation = NODE_NOT_LOOKBEHIND;
                            }
                        }
                        position += 1;
                        assertions = true;
                        assertion_depth += 1;
                        if assertion_depth > 64 {
                            valid = false;
                        }
                    } else {
                        valid = false;
                    };
                };
            } else if assertion_depth == 0 {
                groups += 1;
                group = groups;
                closed.push(0);
            }
            let frame = CaptureFrame {
                operation,
                sequence: 0,
                alternative: 0,
                group,
                first,
                branched: false,
            };
            if frame_count == frames.len() {
                frames.push(frame);
            } else {
                frames[frame_count] = frame;
            };
            frame_count += 1;
        } else if atom == '|' {
            let frame = frames[frame_count - 1];
            let mut alternative = frame.sequence;
            if frame.branched {
                alternative = nodes.len();
                nodes.push(make_capture_node(
                    NODE_ALTERNATIVE,
                    frame.alternative,
                    frame.sequence,
                    0,
                    ' ',
                    1,
                    frame.first,
                    groups,
                ));
            };
            frames[frame_count - 1] = CaptureFrame {
                operation: frame.operation,
                sequence: 0,
                alternative,
                branched: true,
                group: frame.group,
                first: frame.first,
            };
            position += 1;
        } else if atom == ')' {
            if frame_count == 1 {
                valid = false;
            } else {
                frame_count = frame_count - 1;
                let frame = frames[frame_count];
                let mut inner = frame.sequence;
                if frame.branched {
                    inner = nodes.len();
                    nodes.push(make_capture_node(
                        NODE_ALTERNATIVE,
                        frame.alternative,
                        frame.sequence,
                        0,
                        ' ',
                        1,
                        frame.first,
                        groups,
                    ));
                };
                let mut preference = nodes[inner].preference;
                if frame.operation != NODE_GROUP {
                    preference = 0;
                    assertion_depth = assertion_depth - 1;
                }
                node = nodes.len();
                nodes.push(make_capture_node(
                    frame.operation,
                    inner,
                    0,
                    frame.group,
                    ' ',
                    preference,
                    frame.first,
                    groups,
                ));
                if frame.group > 0 {
                    closed[frame.group] = 1;
                };
                position += 1;
                has_atom = true;
            };
        } else if atom == '^' || atom == '$' {
            let mut operation = VM_BEGIN;
            if atom == '$' {
                operation = VM_END;
            };
            node = nodes.len();
            nodes.push(make_capture_node(operation, 0, 0, 0, ' ', 0, 1, 0));
            position += 1;
            has_atom = true;
        } else {
            let mut operation = 0;
            let mut member = ' ';
            let mut reference = 0;
            if atom == '.' {
                operation = VM_ANY;
                position += 1;
            } else if atom == '['
                && source.len() - position >= 7
                && source[position + 1] == '['
                && source[position + 2] == ':'
                && (source[position + 3] == '<' || source[position + 3] == '>')
                && source[position + 4] == ':'
                && source[position + 5] == ']'
                && source[position + 6] == ']'
            {
                operation = VM_WORD_BEGIN;
                if source[position + 3] == '>' {
                    operation = VM_WORD_END;
                }
                position += 7;
            } else if atom == '[' {
                operation = VM_CLASS;
                reference = class_members.len();
                let mut class_atoms: Vec<char> = Vec::new();
                class_atoms.push('[');
                position += 1;
                if position < source.len() && source[position] == '^' {
                    class_atoms.push('^');
                    position += 1;
                }
                let first = position;
                let mut special = ' ';
                while position < source.len() {
                    let current = source[position];
                    class_atoms.push(current);
                    position += 1;
                    if special == ' ' && syntax == 'a' && current == '\\' && position < source.len()
                    {
                        let marker = source[position];
                        class_atoms.push(marker);
                        position += 1;
                        if marker == 'c' && position < source.len() {
                            class_atoms.push(source[position]);
                            position += 1;
                        }
                    } else if special != ' ' {
                        if current == special && position < source.len() && source[position] == ']'
                        {
                            class_atoms.push(']');
                            position += 1;
                            special = ' ';
                        }
                    } else if current == '['
                        && position < source.len()
                        && (source[position] == ':'
                            || source[position] == '.'
                            || source[position] == '=')
                    {
                        special = source[position];
                        class_atoms.push(special);
                        position += 1;
                    } else if current == ']' && position > first + 1 {
                        break;
                    };
                }
                let parsed_class = parse_capture_class(class_atoms, syntax, groups);
                valid = parsed_class.valid;
                if parsed_class.negated {
                    member = '^';
                }
                let mut index = 0;
                while index < parsed_class.members.len() {
                    class_members.push(parsed_class.members[index]);
                    index += 1;
                }
            } else if atom == '\\' && source.len() - position >= 2 {
                let escaped = source[position + 1];
                let escape_start = position;
                position += 2;
                if syntax == 'e'
                    || (syntax == 'b'
                        && escaped != '<'
                        && escaped != '>'
                        && ((escaped as u32) < 49 || (escaped as u32) > 57))
                {
                    operation = VM_LITERAL;
                    member = escaped;
                    if syntax == 'b' && escaped == '{' {
                        valid = false;
                    }
                } else if syntax == 'b' && (escaped == '<' || escaped == '>') {
                    operation = VM_WORD_BEGIN;
                    if escaped == '>' {
                        operation = VM_WORD_END;
                    }
                } else if escaped == 'A'
                    || escaped == 'Z'
                    || escaped == 'm'
                    || escaped == 'y'
                    || escaped == 'Y'
                {
                    operation = VM_ABSOLUTE_BEGIN;
                    if escaped == 'Z' {
                        operation = VM_ABSOLUTE_END;
                    } else if escaped == 'm' {
                        operation = VM_WORD_BEGIN;
                    } else if escaped == 'y' {
                        operation = VM_BOUNDARY;
                    } else if escaped == 'Y' {
                        operation = VM_NOT_BOUNDARY;
                    };
                } else if escaped == 'd'
                    || escaped == 'D'
                    || escaped == 's'
                    || escaped == 'S'
                    || escaped == 'W'
                {
                    operation = VM_CLASS;
                    reference = class_members.len();
                    let mut kind = 14;
                    if escaped == 'd' || escaped == 'D' {
                        kind = 1;
                    } else if escaped == 's' || escaped == 'S' {
                        kind = 4;
                    };
                    class_members.push(CaptureClassMember {
                        kind,
                        lower: 0,
                        upper: 0,
                        complement: escaped == 'D' || escaped == 'S' || escaped == 'W',
                    });
                    class_members.push(CaptureClassMember {
                        kind: 0,
                        lower: 0,
                        upper: 0,
                        complement: false,
                    });
                } else if escaped == 'a'
                    || escaped == 'b'
                    || escaped == 'B'
                    || escaped == 'e'
                    || escaped == 'f'
                    || escaped == 't'
                    || escaped == 'v'
                {
                    operation = VM_NUMERIC;
                    reference = 7;
                    if escaped == 'b' {
                        reference = 8;
                    } else if escaped == 'B' {
                        reference = 92;
                    } else if escaped == 'e' {
                        reference = 27;
                    } else if escaped == 'f' {
                        reference = 12;
                    } else if escaped == 't' {
                        reference = 9;
                    } else if escaped == 'v' {
                        reference = 11;
                    };
                } else if escaped == 'w' {
                    operation = VM_WORD;
                } else if escaped == 'M' {
                    operation = VM_WORD_END;
                } else if escaped == 'n'
                    || escaped == 'r'
                    || ((escaped as u32) < 48 || (escaped as u32) > 57)
                        && ((escaped as u32) < 65 || (escaped as u32) > 90)
                        && ((escaped as u32) < 97 || (escaped as u32) > 122)
                {
                    operation = VM_LITERAL;
                    member = escaped;
                    if escaped == 'n' {
                        member = '\n';
                    } else if escaped == 'r' {
                        member = '\r';
                    };
                } else if escaped == 'c'
                    || escaped == 'x'
                    || escaped == 'u'
                    || escaped == 'U'
                    || ((escaped as u32) >= 48 && (escaped as u32) <= 57)
                {
                    while escape_index < escape_ends.len()
                        && escape_ends[escape_index] < escape_start
                    {
                        escape_index += 2;
                    }
                    let mut limit = source.len();
                    if escape_index < escape_ends.len() && escape_ends[escape_index] == escape_start
                    {
                        limit = escape_ends[escape_index + 1];
                    }
                    let mut window: Vec<char> = Vec::new();
                    let mut next = escape_start;
                    while next < limit && next - escape_start < 257 {
                        window.push(source[next]);
                        next += 1;
                    }
                    let numeric = parse_capture_numeric(window, groups, syntax == 'b');
                    valid = numeric.valid;
                    if valid {
                        reference = numeric.value as usize;
                        position = escape_start + numeric.end;
                        operation = VM_NUMERIC;
                        if numeric.backreference {
                            operation = VM_BACKREF;
                            valid = reference < closed.len() && closed[reference] > 0;
                        }
                    }
                } else {
                    valid = false;
                };
            } else if simple_literal_char(atom) {
                operation = VM_LITERAL;
                member = atom;
                position += 1;
            } else {
                valid = false;
            };
            if valid == false {
                break;
            };

            node = nodes.len();
            nodes.push(make_capture_node(
                operation, 0, 0, reference, member, 0, 1, 0,
            ));
            if operation == VM_BACKREF {
                backreferences = true;
                if assertion_depth > 0 {
                    valid = false;
                }
            };
            has_atom = true;
        };
        if has_atom && valid {
            basic_star_literal = nodes[node].operation == VM_BEGIN;
            let mut repeated = false;
            let mut lower = 0;
            let mut upper = 0;
            let mut unbounded = false;
            let mut fixed = false;
            if syntax != 'q' && position < source.len() {
                let mut basic_bound = false;
                if syntax == 'b'
                    && source.len() - position >= 2
                    && source[position] == '\\'
                    && source[position + 1] == '{'
                {
                    basic_bound = true;
                    position += 1;
                }
                let quantifier = source[position];
                if (quantifier == '*' && (syntax != 'b' || basic_star_literal == false))
                    || (syntax != 'b' && (quantifier == '+' || quantifier == '?'))
                {
                    repeated = true;
                    unbounded = quantifier != '?';
                    upper = 1;
                    if quantifier == '+' {
                        lower = 1;
                    };
                    position += 1;
                } else if (syntax != 'b' || basic_bound)
                    && quantifier == '{'
                    && source.len() - position >= 2
                    && (source[position + 1] as u32) >= 48
                    && (source[position + 1] as u32) <= 57
                {
                    repeated = true;
                    fixed = true;
                    position += 1;
                    while position < source.len()
                        && (source[position] as u32) >= 48
                        && (source[position] as u32) <= 57
                    {
                        let double = lower + lower;
                        let four = double + double;
                        lower = four + four + double + ((source[position] as u32) - 48) as usize;
                        position += 1;
                        if lower > 255 {
                            valid = false;
                            break;
                        };
                    }
                    upper = lower;
                    if position < source.len() && source[position] == ',' {
                        fixed = false;
                        position += 1;
                        upper = 0;
                        unbounded = true;
                        while position < source.len()
                            && (source[position] as u32) >= 48
                            && (source[position] as u32) <= 57
                        {
                            unbounded = false;
                            let double = upper + upper;
                            let four = double + double;
                            upper =
                                four + four + double + ((source[position] as u32) - 48) as usize;
                            position += 1;
                            if upper > 255 {
                                valid = false;
                                break;
                            };
                        }
                    };
                    if basic_bound && position < source.len() && source[position] == '\\' {
                        position += 1;
                    } else if basic_bound {
                        valid = false;
                    };
                    if position == source.len()
                        || source[position] != '}'
                        || (unbounded == false && upper < lower)
                    {
                        valid = false;
                    } else {
                        position += 1;
                    };
                };
                if basic_bound && repeated == false {
                    valid = false;
                }
            };
            if repeated && valid {
                let inner = nodes[node];
                if capture_assertion(inner.operation)
                    || (inner.operation >= NODE_LOOKAHEAD && inner.operation <= NODE_NOT_LOOKBEHIND)
                {
                    valid = false;
                };
                let mut preference = 1;
                if syntax == 'a' && position < source.len() && source[position] == '?' {
                    preference = 2;
                    position += 1;
                };
                if fixed {
                    preference = inner.preference;
                };
                let child = node;
                node = nodes.len();
                nodes.push(CaptureNode {
                    operation: NODE_REPEAT,
                    left: child,
                    right: 0,
                    group: 0,
                    atom: ' ',
                    lower,
                    upper,
                    unbounded,
                    preference,
                    first: inner.first,
                    last: inner.last,
                });
            };
            let frame = frames[frame_count - 1];
            let mut sequence = node;
            if frame.sequence > 0 {
                let mut preference = nodes[frame.sequence].preference;
                if preference == 0 {
                    preference = nodes[node].preference;
                };
                sequence = nodes.len();
                nodes.push(make_capture_node(
                    NODE_SEQUENCE,
                    frame.sequence,
                    node,
                    0,
                    ' ',
                    preference,
                    frame.first,
                    groups,
                ));
            };
            frames[frame_count - 1] = CaptureFrame {
                operation: frame.operation,
                sequence,
                alternative: frame.alternative,
                branched: frame.branched,
                group: frame.group,
                first: frame.first,
            };
        };
    }
    if frame_count != 1 {
        valid = false;
    };
    let root_frame = frames[0];
    let mut root = root_frame.sequence;
    if root_frame.branched {
        root = nodes.len();
        nodes.push(make_capture_node(
            NODE_ALTERNATIVE,
            root_frame.alternative,
            root_frame.sequence,
            0,
            ' ',
            1,
            1,
            groups,
        ));
    };
    let mut capture_minimums: Vec<usize> = Vec::new();
    let mut capture_maximums: Vec<usize> = Vec::new();
    let mut capture_index = 0;
    while capture_index <= groups {
        capture_minimums.push(0);
        capture_maximums.push(MAX_CAPTURE_WORK);
        capture_index += 1;
    }
    let mut references: Vec<usize> = Vec::new();
    let mut minimums: Vec<usize> = Vec::new();
    let mut maximums: Vec<usize> = Vec::new();
    let mut index = 0;
    while index < nodes.len() {
        let node = nodes[index];
        let mut value = 0;
        if node.operation == VM_BACKREF {
            value = 1;
        }
        if node.left > 0 && references[node.left] > 0 {
            value = 1;
        }
        if node.right > 0 && references[node.right] > 0 {
            value = 1;
        }
        references.push(value);
        let mut minimum = 0;
        let mut maximum = 0;
        if node.operation == VM_LITERAL
            || node.operation == VM_ANY
            || node.operation == VM_WORD
            || node.operation == VM_CLASS
            || node.operation == VM_NUMERIC
        {
            minimum = 1;
            maximum = 1;
        } else if node.operation == VM_BACKREF {
            minimum = capture_minimums[node.group];
            maximum = capture_maximums[node.group];
        } else if node.operation == NODE_SEQUENCE {
            minimum = capture_width_sum(minimums[node.left], minimums[node.right]);
            maximum = capture_width_sum(maximums[node.left], maximums[node.right]);
        } else if node.operation == NODE_ALTERNATIVE {
            minimum = minimums[node.left];
            if minimums[node.right] < minimum {
                minimum = minimums[node.right];
            }
            maximum = maximums[node.left];
            if maximums[node.right] > maximum {
                maximum = maximums[node.right];
            }
        } else if node.operation == NODE_GROUP {
            minimum = minimums[node.left];
            maximum = maximums[node.left];
        } else if node.operation == NODE_REPEAT {
            minimum = capture_width_repeat(minimums[node.left], node.lower);
            maximum = capture_width_repeat(maximums[node.left], node.upper);
            if node.unbounded && maximums[node.left] > 0 {
                maximum = MAX_CAPTURE_WORK;
            }
        };
        if node.operation == NODE_GROUP && node.group > 0 {
            capture_minimums[node.group] = minimum;
            capture_maximums[node.group] = maximum;
        }
        minimums.push(minimum);
        maximums.push(maximum);
        index += 1;
    }
    index = nodes.len();
    while index > 0 {
        index = index - 1;
        while nodes[index].operation == NODE_SEQUENCE
            && nodes[nodes[index].left].operation == NODE_SEQUENCE
        {
            let current = nodes[index];
            let left = nodes[current.left];
            let mut preference = nodes[left.right].preference;
            if preference == 0 {
                preference = nodes[current.right].preference;
            }
            nodes[current.left] = make_capture_node(
                NODE_SEQUENCE,
                left.right,
                current.right,
                0,
                ' ',
                preference,
                current.first,
                current.last,
            );
            let mut reference = 0;
            if references[left.right] > 0 || references[current.right] > 0 {
                reference = 1;
            }
            references[current.left] = reference;
            minimums[current.left] =
                capture_width_sum(minimums[left.right], minimums[current.right]);
            maximums[current.left] =
                capture_width_sum(maximums[left.right], maximums[current.right]);
            nodes[index] = make_capture_node(
                NODE_SEQUENCE,
                left.left,
                current.left,
                0,
                ' ',
                current.preference,
                current.first,
                current.last,
            );
        }
    }
    let shortest = nodes[root].preference == 2;
    let interpreted = backreferences || assertions;
    let mut instructions: Vec<CaptureInstruction> = Vec::new();
    instructions.push(make_capture_step(VM_JUMP, 1, 0, 0, ' '));
    instructions.push(make_capture_step(VM_ACCEPT, 0, 0, 0, ' '));
    let mut tasks: Vec<CaptureBuildTask> = Vec::new();
    tasks.push(CaptureBuildTask {
        node: root,
        entry: 0,
        exit: 1,
    });
    let mut head = 0;
    while head < tasks.len() && valid && interpreted == false {
        if instructions.len() > MAX_CAPTURE_INSTRUCTIONS {
            valid = false;
            break;
        };
        let task = tasks[head];
        head += 1;
        let node = nodes[task.node];
        if node.operation == NODE_EMPTY {
            instructions[task.entry] = make_capture_step(VM_JUMP, task.exit, 0, 0, ' ');
        } else if node.operation == NODE_SEQUENCE {
            let middle = instructions.len();
            instructions.push(make_capture_step(VM_JUMP, 0, 0, 0, ' '));
            tasks.push(CaptureBuildTask {
                node: node.left,
                entry: task.entry,
                exit: middle,
            });
            tasks.push(CaptureBuildTask {
                node: node.right,
                entry: middle,
                exit: task.exit,
            });
        } else if node.operation == NODE_ALTERNATIVE {
            let left = instructions.len();
            instructions.push(make_capture_step(VM_JUMP, 0, 0, 0, ' '));
            let right = instructions.len();
            instructions.push(make_capture_step(VM_JUMP, 0, 0, 0, ' '));
            instructions[task.entry] = make_capture_step(VM_SPLIT, left, right, 0, ' ');
            tasks.push(CaptureBuildTask {
                node: node.left,
                entry: left,
                exit: task.exit,
            });
            tasks.push(CaptureBuildTask {
                node: node.right,
                entry: right,
                exit: task.exit,
            });
        } else if node.operation == NODE_GROUP {
            let begin = instructions.len();
            instructions[task.entry] = make_capture_step(VM_JUMP, begin, 0, 0, ' ');
            instructions.push(make_capture_step(VM_CLEAR, node.first, node.last, 0, ' '));
            if node.group > 0 {
                instructions.push(make_capture_step(VM_OPEN, 0, 0, node.group, ' '));
            };
            let inner = instructions.len();
            instructions.push(make_capture_step(VM_JUMP, 0, 0, 0, ' '));
            let end = instructions.len();
            if node.group > 0 {
                instructions.push(make_capture_step(VM_CLOSE, 0, 0, node.group, ' '));
            };
            instructions.push(make_capture_step(VM_JUMP, task.exit, 0, 0, ' '));
            tasks.push(CaptureBuildTask {
                node: node.left,
                entry: inner,
                exit: end,
            });
        } else if node.operation == NODE_REPEAT {
            let mut entry = task.entry;
            let mut copies = node.upper;
            if node.unbounded {
                copies = node.lower + 1;
            };
            let mut count = 0;
            while count < copies {
                let begin = instructions.len();
                instructions.push(make_capture_step(VM_CLEAR, node.first, node.last, 0, ' '));
                let inner = instructions.len();
                instructions.push(make_capture_step(VM_JUMP, 0, 0, 0, ' '));
                let next = instructions.len();
                instructions.push(make_capture_step(VM_JUMP, task.exit, 0, 0, ' '));
                if count < node.lower {
                    instructions[entry] = make_capture_step(VM_JUMP, begin, 0, 0, ' ');
                } else {
                    instructions[entry] = make_capture_step(VM_SPLIT, begin, task.exit, 0, ' ');
                };
                let mut exit = next;
                if node.unbounded && count == node.lower {
                    exit = entry;
                };
                tasks.push(CaptureBuildTask {
                    node: node.left,
                    entry: inner,
                    exit,
                });
                entry = next;
                count += 1;
            }
            instructions[entry] = make_capture_step(VM_JUMP, task.exit, 0, 0, ' ');
        } else {
            let begin = instructions.len();
            instructions[task.entry] = make_capture_step(VM_JUMP, begin, 0, 0, ' ');
            instructions.push(make_capture_step(
                node.operation,
                0,
                0,
                node.group,
                node.atom,
            ));
            instructions.push(make_capture_step(VM_JUMP, task.exit, 0, 0, ' '));
        };
    }
    if instructions.len() > MAX_CAPTURE_INSTRUCTIONS {
        valid = false;
    }
    CaptureProgram {
        valid,
        nodes,
        root,
        references,
        minimums,
        maximums,
        interpreted,
        instructions,
        class_members,
        case_mode,
        newline_mode,
        shortest,
        captures: groups,
        backreferences,
    }
}

fn compile_capture_program(pattern: &str, expanded: bool) -> CaptureProgram {
    let parsed = capture_pattern_source(pattern, expanded);
    compile_capture_program_atoms(
        parsed.atoms,
        parsed.escape_ends,
        parsed.syntax,
        parsed.valid,
        parsed.case_mode,
        parsed.newline_mode,
    )
}

pub fn supports_capture_program(pattern: &str, expanded: bool) -> bool {
    let program = compile_capture_program(pattern, expanded);
    program.valid
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
    let program = compile_capture_program(pattern, expanded);
    if program.valid == false {
        return MatchOutcome::Uncertain;
    };
    run_capture_program(
        program,
        subject,
        from,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    )
}

fn make_capture_dissect_frame(
    node: usize,
    begin: usize,
    end: usize,
    capture: usize,
    prefix: bool,
) -> CaptureDissectFrame {
    CaptureDissectFrame {
        node,
        begin,
        end,
        capture,
        phase: DISSECT_ENTER,
        cursor: 0,
        path: 0,
        prefix,
    }
}

fn run_capture_tree(
    program: CaptureProgram,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> MatchOutcome {
    let haystack: Vec<char> = subject.chars().collect();
    let mut width = 0;
    if program.backreferences {
        width = program.captures + 1;
    }
    let mut work = 0;
    let mut start = from;
    while start <= haystack.len() {
        if program.minimums[program.root] > haystack.len() - start {
            return MatchOutcome::NoMatch;
        }
        let minimum_end = start + program.minimums[program.root];
        let mut maximum_end = haystack.len();
        if program.maximums[program.root] < haystack.len() - start {
            maximum_end = start + program.maximums[program.root];
        }
        let mut match_end = maximum_end;
        if program.shortest {
            match_end = minimum_end;
        }
        let mut searching = true;
        while searching {
            let mut captures: Vec<CaptureRegister> = Vec::new();
            let mut group = 0;
            while group < width {
                captures.push(CaptureRegister {
                    start: 0,
                    end: 0,
                    status: 0,
                });
                group += 1;
            }
            let mut frames: Vec<CaptureDissectFrame> = Vec::new();
            frames.push(make_capture_dissect_frame(
                program.root,
                start,
                match_end,
                0,
                false,
            ));
            let mut paths: Vec<CaptureRepeatPath> = Vec::new();
            paths.push(CaptureRepeatPath {
                begin: 0,
                cursor: 0,
                capture: 0,
                count: 0,
                previous: 0,
            });
            let mut depth = 1;
            let mut success = false;
            let mut returned = 0;
            while depth > 0 {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                }
                work += 1;
                let frame = frames[depth - 1];
                let node = program.nodes[frame.node];
                let mut phase = frame.phase;
                let mut cursor = frame.cursor;
                let mut path = frame.path;
                let mut complete = false;
                let mut child = false;
                let mut child_node = node.left;
                let mut child_begin = frame.begin;
                let mut child_end = frame.end;
                let mut child_capture = frame.capture;
                let mut child_prefix = false;
                let mut clear = false;
                let mut advance = false;
                let mut lower = node.lower;
                let mut upper = node.upper;
                if frame.prefix {
                    lower = lower - 1;
                    if node.unbounded == false {
                        upper = upper - 1;
                    }
                }
                let child_shortest = program.nodes[node.left].preference == 2;
                let mut minimum = program.minimums[frame.node];
                let mut maximum = program.maximums[frame.node];
                if frame.prefix {
                    minimum = capture_width_repeat(program.minimums[node.left], lower);
                    maximum = capture_width_repeat(program.maximums[node.left], upper);
                    if node.unbounded && program.maximums[node.left] > 0 {
                        maximum = MAX_CAPTURE_WORK;
                    }
                }
                if phase == DISSECT_ENTER
                    && (frame.end - frame.begin < minimum || frame.end - frame.begin > maximum)
                {
                    success = false;
                    complete = true;
                } else if phase == DISSECT_ENTER {
                    success = false;
                    returned = frame.capture;
                    if node.operation == NODE_SEQUENCE {
                        cursor = frame.end;
                        if child_shortest {
                            cursor = frame.begin;
                        }
                        child = true;
                        child_end = cursor;
                        phase = DISSECT_LEFT;
                    } else if node.operation == NODE_ALTERNATIVE {
                        child = true;
                        phase = DISSECT_ALTERNATIVE;
                    } else if node.operation == NODE_GROUP {
                        child = true;
                        clear = true;
                        phase = DISSECT_GROUP;
                    } else if node.operation >= NODE_LOOKAHEAD
                        && node.operation <= NODE_NOT_LOOKBEHIND
                    {
                        if frame.begin != frame.end {
                            complete = true;
                        } else {
                            cursor = frame.begin;
                            if node.operation >= NODE_LOOKBEHIND {
                                cursor = 0;
                                child_begin = 0;
                            }
                            child_end = frame.begin;
                            child = true;
                            phase = DISSECT_ASSERTION;
                        };
                    } else if node.operation == NODE_REPEAT {
                        if frame.prefix == false && lower > 0 && program.references[node.left] == 0
                        {
                            cursor = frame.end;
                            if node.preference == 2 {
                                cursor = frame.begin;
                            }
                            child = true;
                            child_node = frame.node;
                            child_prefix = true;
                            child_end = cursor;
                            phase = DISSECT_PREFIX;
                        } else if upper == 0 && node.unbounded == false {
                            success = frame.begin == frame.end;
                            complete = true;
                        } else if child_shortest && lower == 0 && frame.begin == frame.end {
                            success = true;
                            complete = true;
                        } else {
                            let mut endpoint = frame.end;
                            if child_shortest {
                                endpoint = frame.begin;
                            }
                            path = paths.len();
                            paths.push(CaptureRepeatPath {
                                begin: frame.begin,
                                cursor: endpoint,
                                capture: frame.capture,
                                count: 0,
                                previous: 0,
                            });
                            phase = DISSECT_ITERATION;
                        };
                    } else {
                        let mut matched = false;
                        let mut end = frame.begin;
                        if node.operation == NODE_EMPTY {
                            matched = true;
                        } else if capture_assertion(node.operation) {
                            let before = end > 0 && zero_width_word(haystack[end - 1]);
                            let after = end < haystack.len() && zero_width_word(haystack[end]);
                            let previous_newline = end > 0 && haystack[end - 1] == '\n';
                            let next_newline = end < haystack.len() && haystack[end] == '\n';
                            matched = capture_assertion_matches(
                                node.operation,
                                end,
                                haystack.len(),
                                before,
                                after,
                                previous_newline,
                                next_newline,
                                line_anchors,
                            );
                        } else if node.operation == VM_BACKREF {
                            let register = captures[frame.capture + node.group];
                            let length = register.end - register.start;
                            matched = register.status == 2 && length <= haystack.len() - end;
                            let mut offset = 0;
                            while matched && offset < length {
                                if work == MAX_CAPTURE_WORK {
                                    return MatchOutcome::Uncertain;
                                }
                                work += 1;
                                let actual = haystack[end + offset];
                                let expected = haystack[register.start + offset];
                                matched = actual == expected
                                    || (case_sensitive == false
                                        && actual.to_ascii_lowercase()
                                            == expected.to_ascii_lowercase());
                                offset += 1;
                            }
                            if matched {
                                end += length;
                            }
                        } else if node.operation == VM_CLASS {
                            if end < haystack.len() {
                                let mut class_position = node.group;
                                let mut included = false;
                                while program.class_members[class_position].kind > 0 {
                                    if work == MAX_CAPTURE_WORK {
                                        return MatchOutcome::Uncertain;
                                    }
                                    work += 1;
                                    if capture_class_member_matches(
                                        program.class_members[class_position],
                                        haystack[end],
                                        case_sensitive,
                                    ) {
                                        included = true;
                                    }
                                    class_position += 1;
                                }
                                let negated = node.atom == '^';
                                matched = included != negated
                                    && (negated == false
                                        || dot_crosses_newline
                                        || haystack[end] != '\n');
                                if matched {
                                    end += 1;
                                }
                            }
                        } else if end < haystack.len() {
                            let actual = haystack[end];
                            let mut numeric_lower = node.group;
                            if numeric_lower >= 65 && numeric_lower <= 90 {
                                numeric_lower += 32;
                            }
                            matched = (node.operation == VM_ANY
                                && (dot_crosses_newline || actual != '\n'))
                                || (node.operation == VM_WORD && zero_width_word(actual))
                                || (node.operation == VM_NUMERIC
                                    && (((actual as u32) as usize) == node.group
                                        || (case_sensitive == false
                                            && ((actual.to_ascii_lowercase() as u32) as usize)
                                                == numeric_lower)))
                                || (node.operation == VM_LITERAL
                                    && (actual == node.atom
                                        || (case_sensitive == false
                                            && actual.to_ascii_lowercase()
                                                == node.atom.to_ascii_lowercase())));
                            if matched {
                                end += 1;
                            }
                        }

                        success = matched && end == frame.end;
                        complete = true;
                    };
                } else if phase == DISSECT_LEFT || phase == DISSECT_PREFIX {
                    if success {
                        child = true;
                        child_begin = cursor;
                        child_capture = returned;
                        child_node = node.right;
                        phase = DISSECT_RIGHT;
                        if node.operation == NODE_REPEAT {
                            child_node = node.left;
                            phase = DISSECT_LAST_REPEAT;
                            clear = true;
                        }
                    } else {
                        advance = true;
                    };
                } else if phase == DISSECT_RIGHT || phase == DISSECT_LAST_REPEAT {
                    if success {
                        complete = true;
                    } else {
                        advance = true;
                    };
                } else if phase == DISSECT_GROUP {
                    if success && width > 0 && node.group > 0 {
                        let snapshot = captures.len();
                        group = 0;
                        while group < width {
                            if work == MAX_CAPTURE_WORK {
                                return MatchOutcome::Uncertain;
                            }
                            work += 1;
                            if group == node.group {
                                captures.push(CaptureRegister {
                                    start: frame.begin,
                                    end: frame.end,
                                    status: 2,
                                });
                            } else {
                                captures.push(captures[returned + group]);
                            };
                            group += 1;
                        }
                        returned = snapshot;
                    }
                    complete = true;
                } else if phase == DISSECT_ALTERNATIVE {
                    if success {
                        complete = true;
                    } else {
                        child = true;
                        child_node = node.right;
                        phase = DISSECT_LAST_ALTERNATIVE;
                    };
                } else if phase == DISSECT_LAST_ALTERNATIVE {
                    complete = true;
                } else if phase == DISSECT_ASSERTION {
                    if success {
                        success =
                            node.operation == NODE_LOOKAHEAD || node.operation == NODE_LOOKBEHIND;
                        returned = frame.capture;
                        complete = true;
                    } else {
                        let mut limit = haystack.len();
                        if node.operation >= NODE_LOOKBEHIND {
                            limit = frame.begin;
                        }
                        if cursor == limit {
                            success = node.operation == NODE_NOT_LOOKAHEAD
                                || node.operation == NODE_NOT_LOOKBEHIND;
                            returned = frame.capture;
                            complete = true;
                        } else {
                            cursor += 1;
                            child = true;
                            if node.operation >= NODE_LOOKBEHIND {
                                child_begin = cursor;
                                child_end = frame.begin;
                            } else {
                                child_end = cursor;
                            };
                        };
                    };
                } else if phase == DISSECT_ITERATION {
                    let current = paths[path];
                    let count = current.count + 1;
                    let mut minimum = lower;
                    if minimum == 0 {
                        minimum = 1;
                    }
                    let mut maximum = frame.end - frame.begin;
                    if node.unbounded == false && upper < maximum {
                        maximum = upper;
                    }
                    if maximum < minimum {
                        maximum = minimum;
                    }
                    if (current.cursor == current.begin
                        && current.cursor != frame.end
                        && (count >= minimum || minimum - count < frame.end - current.cursor))
                        || (count == maximum && current.cursor != frame.end)
                        || (current.cursor == frame.end && count < minimum)
                    {
                        phase = DISSECT_ITERATION_ADVANCE;
                    } else {
                        child = true;
                        child_begin = current.begin;
                        child_end = current.cursor;
                        child_capture = current.capture;
                        clear = true;
                        phase = DISSECT_ITERATION_RESULT;
                    };
                } else if phase == DISSECT_ITERATION_RESULT {
                    let current = paths[path];
                    if success && current.cursor == frame.end {
                        complete = true;
                    } else if success {
                        let mut endpoint = frame.end;
                        if child_shortest {
                            endpoint = current.cursor;
                        }
                        let previous = path;
                        path = paths.len();
                        paths.push(CaptureRepeatPath {
                            begin: current.cursor,
                            cursor: endpoint,
                            capture: returned,
                            count: current.count + 1,
                            previous,
                        });
                        phase = DISSECT_ITERATION;
                    } else {
                        phase = DISSECT_ITERATION_ADVANCE;
                    };
                } else if phase == DISSECT_ITERATION_ADVANCE {
                    let current = paths[path];
                    let mut endpoint = current.cursor;
                    if (child_shortest && endpoint == frame.end)
                        || (child_shortest == false && endpoint == current.begin)
                    {
                        path = current.previous;
                        if path == 0 {
                            success = lower == 0 && frame.begin == frame.end;
                            returned = frame.capture;
                            complete = true;
                        }
                    } else {
                        if child_shortest {
                            endpoint += 1;
                        } else {
                            endpoint = endpoint - 1;
                        };
                        paths[path] = CaptureRepeatPath {
                            begin: current.begin,
                            cursor: endpoint,
                            capture: current.capture,
                            count: current.count,
                            previous: current.previous,
                        };
                        phase = DISSECT_ITERATION;
                    };
                }
                if advance {
                    let mut ascending = child_shortest;
                    if node.operation == NODE_REPEAT {
                        ascending = node.preference == 2;
                    }
                    if (ascending && cursor == frame.end)
                        || (ascending == false && cursor == frame.begin)
                    {
                        success = false;
                        complete = true;
                    } else {
                        if ascending {
                            cursor += 1;
                        } else {
                            cursor = cursor - 1;
                        };
                        child = true;
                        child_end = cursor;
                        phase = DISSECT_LEFT;
                        if node.operation == NODE_REPEAT {
                            child_node = frame.node;
                            child_prefix = true;
                            phase = DISSECT_PREFIX;
                        }
                    };
                }
                if complete {
                    depth = depth - 1;
                } else {
                    frames[depth - 1] = CaptureDissectFrame {
                        node: frame.node,
                        begin: frame.begin,
                        end: frame.end,
                        capture: frame.capture,
                        phase,
                        cursor,
                        path,
                        prefix: frame.prefix,
                    };
                    if child {
                        if clear && width > 0 {
                            let snapshot = captures.len();
                            group = 0;
                            while group < width {
                                if work == MAX_CAPTURE_WORK {
                                    return MatchOutcome::Uncertain;
                                }
                                work += 1;
                                if group >= node.first && group <= node.last {
                                    captures.push(CaptureRegister {
                                        start: 0,
                                        end: 0,
                                        status: 0,
                                    });
                                } else {
                                    captures.push(captures[child_capture + group]);
                                };
                                group += 1;
                            }
                            child_capture = snapshot;
                        }
                        let next = make_capture_dissect_frame(
                            child_node,
                            child_begin,
                            child_end,
                            child_capture,
                            child_prefix,
                        );
                        if depth == frames.len() {
                            frames.push(next);
                        } else {
                            frames[depth] = next;
                        };
                        depth += 1;
                    }
                };
            }
            if success {
                return MatchOutcome::Found(MatchSpan {
                    start,
                    end: match_end,
                });
            }
            if program.shortest {
                if match_end == maximum_end {
                    searching = false;
                } else {
                    match_end += 1;
                };
            } else if match_end == minimum_end {
                searching = false;
            } else {
                match_end = match_end - 1;
            };
        }
        start += 1;
    }
    MatchOutcome::NoMatch
}

fn run_capture_program(
    program: CaptureProgram,
    subject: &str,
    from: usize,
    mut case_sensitive: bool,
    mut dot_crosses_newline: bool,
    mut line_anchors: bool,
) -> MatchOutcome {
    if program.case_mode == 'i' {
        case_sensitive = false;
    } else if program.case_mode == 'c' {
        case_sensitive = true;
    }
    if program.newline_mode == 'm' || program.newline_mode == 'n' {
        dot_crosses_newline = false;
        line_anchors = true;
    } else if program.newline_mode == 'p' {
        dot_crosses_newline = false;
        line_anchors = false;
    } else if program.newline_mode == 'w' {
        dot_crosses_newline = true;
        line_anchors = true;
    } else if program.newline_mode == 's' {
        dot_crosses_newline = true;
        line_anchors = false;
    }
    if program.interpreted {
        return run_capture_tree(
            program,
            subject,
            from,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
        );
    }
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return MatchOutcome::NoMatch;
    };
    let mut marks: Vec<usize> = Vec::new();
    let mut rows: Vec<usize> = Vec::new();
    let mut instruction = 0;
    while instruction < program.instructions.len() {
        rows.push(marks.len());
        let mut position = 0;
        while position <= haystack.len() {
            if marks.len() == MAX_CAPTURE_WORK {
                return MatchOutcome::Uncertain;
            };
            marks.push(0);
            position += 1;
        }
        instruction += 1;
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
            let mut instruction = state.pattern;
            let mut subject_position = state.subject;
            let mut matched = true;
            while matched {
                if work == MAX_CAPTURE_WORK {
                    return MatchOutcome::Uncertain;
                };
                work += 1;
                let cell = rows[instruction] + subject_position;
                if marks[cell] == start + 1 {
                    break;
                }
                marks[cell] = start + 1;
                let step = program.instructions[instruction];
                if step.operation == VM_ACCEPT {
                    if found == false
                        || (program.shortest && subject_position < best_end)
                        || (program.shortest == false && subject_position > best_end)
                    {
                        found = true;
                        best_end = subject_position;
                    };
                    break;
                } else if capture_assertion(step.operation) {
                    let before =
                        subject_position > 0 && zero_width_word(haystack[subject_position - 1]);
                    let after = subject_position < haystack.len()
                        && zero_width_word(haystack[subject_position]);
                    let previous_newline =
                        subject_position > 0 && haystack[subject_position - 1] == '\n';
                    let next_newline =
                        subject_position < haystack.len() && haystack[subject_position] == '\n';
                    matched = capture_assertion_matches(
                        step.operation,
                        subject_position,
                        haystack.len(),
                        before,
                        after,
                        previous_newline,
                        next_newline,
                        line_anchors,
                    );
                    instruction += 1;
                } else if step.operation == VM_SPLIT {
                    let skipped = PatternWorkState {
                        pattern: step.alternate,
                        subject: subject_position,
                    };
                    if stack_len == stack.len() {
                        stack.push(skipped);
                    } else {
                        stack[stack_len] = skipped;
                    };
                    stack_len += 1;
                    instruction = step.target;
                } else if step.operation == VM_JUMP {
                    instruction = step.target;
                } else if step.operation == VM_CLEAR
                    || step.operation == VM_OPEN
                    || step.operation == VM_CLOSE
                {
                    instruction += 1;
                } else if step.operation == VM_CLASS {
                    if subject_position == haystack.len() {
                        matched = false;
                    } else {
                        let mut class_position = step.group;
                        let mut included = false;
                        while program.class_members[class_position].kind > 0 {
                            if work == MAX_CAPTURE_WORK {
                                return MatchOutcome::Uncertain;
                            }
                            work += 1;
                            if capture_class_member_matches(
                                program.class_members[class_position],
                                haystack[subject_position],
                                case_sensitive,
                            ) {
                                included = true;
                            }
                            class_position += 1;
                        }
                        let negated = step.atom == '^';
                        matched = included != negated
                            && (negated == false
                                || dot_crosses_newline
                                || haystack[subject_position] != '\n');
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
                        };
                    };
                };
            }
        }
        if found {
            return MatchOutcome::Found(MatchSpan {
                start,
                end: best_end,
            });
        };
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
    let mut offset = 0;
    while position < source.len() && source[position] != '(' {
        let atom = source[position];
        if atom == '\\'
            && source.len() - position >= 2
            && (source[position + 1] == 'Y'
                || source[position + 1] == 'm'
                || source[position + 1] == 'M')
        {
            remainder.push(atom);
            remainder.push(source[position + 1]);
            position += 2;
        } else if atom == '\\'
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
        } else {
            remainder.push(atom);
            position += 1;
            offset += 1;
        };
    }
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
                || (source.len() - position > 2
                    && (source[position + 2] as u32) >= 48
                    && (source[position + 2] as u32) <= 57)
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
        if source.len() - position < 2
            || source[position + 1] != '1'
            || (source.len() - position > 2
                && (source[position + 2] as u32) >= 48
                && (source[position + 2] as u32) <= 57)
        {
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
    if supports_inline_negative_word(pattern, expanded) {
        return true;
    }
    supports_atoms(parsed.atoms)
}

fn supports_inline_negative_word(pattern: &str, expanded: bool) -> bool {
    let parsed = inline_atoms(pattern, expanded);
    if parsed.valid == false || parsed.mode != 'n' {
        return false;
    }
    let source = parsed.atoms;
    if source.len() < 11
        || source[0] != '^'
        || source[1] != '('
        || source[2] != '?'
        || source[3] != '!'
        || source[4] != '['
    {
        return false;
    }
    let mut position = 5;
    while position < source.len() && source[position] != ']' {
        if simple_literal_char(source[position]) == false {
            return false;
        }
        position += 1;
    }
    position > 5
        && source.len() - position == 5
        && source[position] == ']'
        && source[position + 1] == ')'
        && source[position + 2] == '\\'
        && source[position + 3] == 'S'
        && source[position + 4] == '+'
}

fn find_inline_negative_word(
    pattern: &str,
    subject: &str,
    from: usize,
    case_sensitive: bool,
    expanded: bool,
) -> MatchOutcome {
    if supports_inline_negative_word(pattern, expanded) == false {
        return MatchOutcome::Uncertain;
    }
    let source = inline_atoms(pattern, expanded).atoms;
    let haystack: Vec<char> = subject.chars().collect();
    let mut start = from;
    while start < haystack.len() {
        if start == 0 || haystack[start - 1] == '\n' {
            let actual = haystack[start];
            let codepoint = actual as u32;
            let space = (codepoint >= 9 && codepoint <= 13) || actual == ' ';
            if space == false {
                let mut blocked = false;
                let mut position = 5;
                while source[position] != ']' {
                    let excluded = source[position];
                    if actual == excluded
                        || (case_sensitive == false
                            && actual.to_ascii_lowercase() == excluded.to_ascii_lowercase())
                    {
                        blocked = true;
                    }
                    position += 1;
                }
                if blocked == false {
                    let mut end = start + 1;
                    while end < haystack.len() {
                        let next = haystack[end];
                        let value = next as u32;
                        if (value >= 9 && value <= 13) || next == ' ' {
                            break;
                        }
                        end += 1;
                    }
                    return MatchOutcome::Found(MatchSpan { start, end });
                }
            }
        }
        start += 1;
    }
    MatchOutcome::NoMatch
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
    let escape_ends: Vec<usize> = Vec::new();
    let program =
        compile_capture_program_atoms(parsed.atoms, escape_ends, 'a', parsed.valid, ' ', ' ');
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
    let escape_ends: Vec<usize> = Vec::new();
    let program =
        compile_capture_program_atoms(parsed.atoms, escape_ends, 'a', parsed.valid, ' ', ' ');
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
                        && escaped != 'n'
                        && escaped != 'r'
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
                                if shorthand == ']'
                                    || shorthand == '\\'
                                    || shorthand == 'n'
                                    || shorthand == 'r'
                                {
                                    if (shorthand != 'n' && shorthand != 'r' && actual == shorthand)
                                        || (shorthand == 'n' && actual == '\n')
                                        || (shorthand == 'r' && actual == '\r')
                                    {
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
    if supports_inline_negative_word(pattern, expanded) {
        return find_inline_negative_word(pattern, subject, from, case_sensitive, expanded);
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
