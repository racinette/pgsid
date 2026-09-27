const MAX_CAPTURE_WORK: usize = 2000000;
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
pub enum Syntax {
    Advanced,
    Basic,
    Extended,
    Literal,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum NewlineMode {
    Ordinary,
    Sensitive,
    Stop,
    Anchors,
}

#[derive(Clone, Copy)]
pub struct RegexOptions {
    pub syntax: Syntax,
    pub case_sensitive: bool,
    pub expanded: bool,
    pub newline: NewlineMode,
}

pub fn find(pattern: &str, subject: &str, from: usize, options: RegexOptions) -> MatchOutcome {
    capture_match_outcome(execute_pattern(
        pattern, subject, from, options, false, false, false,
    ))
}

pub fn count(pattern: &str, subject: &str, from: usize, options: RegexOptions) -> CountOutcome {
    let result = execute_pattern(pattern, subject, from, options, true, false, false);
    if result.kind == 2 {
        return CountOutcome::Uncertain;
    }
    if result.kind == 3 {
        return CountOutcome::InvalidPattern;
    }
    CountOutcome::Count(result.count)
}

pub enum MatchListOutcome {
    Matches(Vec<MatchSpan>),
    InvalidPattern,
    Uncertain,
}

pub fn find_all(
    pattern: &str,
    subject: &str,
    from: usize,
    options: RegexOptions,
) -> MatchListOutcome {
    let result = execute_pattern(pattern, subject, from, options, true, false, true);
    if result.kind == 2 {
        return MatchListOutcome::Uncertain;
    }
    if result.kind == 3 {
        return MatchListOutcome::InvalidPattern;
    }
    MatchListOutcome::Matches(result.matches)
}

pub enum CompileOutcome {
    Compiled(CompiledRegex),
    InvalidPattern,
    Uncertain,
}

pub fn compile(pattern: &str, options: RegexOptions) -> CompileOutcome {
    if options.syntax == Syntax::Literal
        && (options.expanded || options.newline != NewlineMode::Ordinary)
    {
        return CompileOutcome::InvalidPattern;
    }
    let program = compile_pattern_source(pattern, options, true);
    if program.limited {
        return CompileOutcome::Uncertain;
    }
    if program.valid == false {
        return CompileOutcome::InvalidPattern;
    }
    CompileOutcome::Compiled(program)
}

pub fn find_compiled(program: &CompiledRegex, subject: &str, from: usize) -> MatchOutcome {
    capture_match_outcome(execute_compiled_pattern(
        program, subject, from, false, false, false,
    ))
}

pub fn count_compiled(program: &CompiledRegex, subject: &str, from: usize) -> CountOutcome {
    let result = execute_compiled_pattern(program, subject, from, true, false, false);
    if result.kind == 2 {
        return CountOutcome::Uncertain;
    }
    if result.kind == 3 {
        return CountOutcome::InvalidPattern;
    }
    CountOutcome::Count(result.count)
}

pub fn find_all_compiled(program: &CompiledRegex, subject: &str, from: usize) -> MatchListOutcome {
    let result = execute_compiled_pattern(program, subject, from, true, false, true);
    if result.kind == 2 {
        return MatchListOutcome::Uncertain;
    }
    if result.kind == 3 {
        return MatchListOutcome::InvalidPattern;
    }
    MatchListOutcome::Matches(result.matches)
}

pub fn captures_compiled(program: &CompiledRegex, subject: &str, from: usize) -> CaptureOutcome {
    let result = execute_compiled_pattern(program, subject, from, false, true, false);
    if result.kind == 2 {
        return CaptureOutcome::Uncertain;
    }
    if result.kind == 3 {
        return CaptureOutcome::InvalidPattern;
    }
    if result.kind == 1 {
        return CaptureOutcome::NoMatch;
    }
    CaptureOutcome::Found(result.groups)
}

pub struct CaptureBatch {
    pub groups_per_match: usize,
    pub groups: Vec<CaptureSpan>,
}

pub enum CaptureListOutcome {
    Matches(CaptureBatch),
    InvalidPattern,
    Uncertain,
}

pub fn captures_all_compiled(
    program: &CompiledRegex,
    subject: &str,
    from: usize,
) -> CaptureListOutcome {
    capture_list_outcome(execute_compiled_pattern(
        program, subject, from, true, true, true,
    ))
}

#[derive(Clone, Copy)]
pub struct CaptureSpan {
    pub matched: bool,
    pub start: usize,
    pub end: usize,
}

pub enum CaptureOutcome {
    Found(Vec<CaptureSpan>),
    InvalidPattern,
    NoMatch,
    Uncertain,
}

pub fn captures(
    pattern: &str,
    subject: &str,
    from: usize,
    options: RegexOptions,
) -> CaptureOutcome {
    let result = execute_pattern(pattern, subject, from, options, false, true, false);
    if result.kind == 2 {
        return CaptureOutcome::Uncertain;
    }
    if result.kind == 3 {
        return CaptureOutcome::InvalidPattern;
    }
    if result.kind == 1 {
        return CaptureOutcome::NoMatch;
    }
    CaptureOutcome::Found(result.groups)
}

pub fn captures_all(
    pattern: &str,
    subject: &str,
    from: usize,
    options: RegexOptions,
) -> CaptureListOutcome {
    capture_list_outcome(execute_pattern(
        pattern, subject, from, options, true, true, true,
    ))
}

fn capture_list_outcome(result: CaptureRunResult) -> CaptureListOutcome {
    if result.kind == 2 {
        return CaptureListOutcome::Uncertain;
    }
    if result.kind == 3 {
        return CaptureListOutcome::InvalidPattern;
    }
    CaptureListOutcome::Matches(CaptureBatch {
        groups_per_match: result.group_width,
        groups: result.groups,
    })
}

struct CaptureRunResult {
    kind: usize,
    start: usize,
    end: usize,
    count: usize,
    groups: Vec<CaptureSpan>,
    matches: Vec<MatchSpan>,
    group_width: usize,
    work: usize,
}

fn make_capture_run_result(
    kind: usize,
    start: usize,
    end: usize,
    count: usize,
) -> CaptureRunResult {
    let groups: Vec<CaptureSpan> = Vec::new();
    let matches: Vec<MatchSpan> = Vec::new();
    CaptureRunResult {
        kind,
        start,
        end,
        count,
        groups,
        matches,
        group_width: 0,
        work: 0,
    }
}

fn complete_search_result(
    count: usize,
    groups: Vec<CaptureSpan>,
    matches: Vec<MatchSpan>,
    work: usize,
) -> CaptureRunResult {
    CaptureRunResult {
        kind: 1,
        start: 0,
        end: 0,
        count,
        groups,
        matches,
        group_width: 0,
        work,
    }
}

fn capture_tree_result(kind: usize, count: usize, work: usize) -> CaptureRunResult {
    let groups: Vec<CaptureSpan> = Vec::new();
    let matches: Vec<MatchSpan> = Vec::new();
    CaptureRunResult {
        kind,
        start: 0,
        end: 0,
        count,
        groups,
        matches,
        group_width: 0,
        work,
    }
}

fn capture_match_outcome(result: CaptureRunResult) -> MatchOutcome {
    if result.kind == 2 {
        return MatchOutcome::Uncertain;
    }
    if result.kind == 3 {
        return MatchOutcome::InvalidPattern;
    }
    if result.kind == 1 {
        return MatchOutcome::NoMatch;
    }
    MatchOutcome::Found(MatchSpan {
        start: result.start,
        end: result.end,
    })
}

fn execute_pattern(
    pattern: &str,
    subject: &str,
    from: usize,
    options: RegexOptions,
    counting: bool,
    capturing: bool,
    collecting: bool,
) -> CaptureRunResult {
    if options.syntax == Syntax::Literal
        && (options.expanded || options.newline != NewlineMode::Ordinary)
    {
        return make_capture_run_result(3, 0, 0, 0);
    }
    let program = compile_pattern_source(pattern, options, capturing);
    if program.limited {
        return make_capture_run_result(2, 0, 0, 0);
    }
    if program.valid == false {
        return make_capture_run_result(3, 0, 0, 0);
    }
    execute_compiled_pattern(&program, subject, from, counting, capturing, collecting)
}

fn execute_compiled_pattern(
    program: &CompiledRegex,
    subject: &str,
    from: usize,
    counting: bool,
    capturing: bool,
    collecting: bool,
) -> CaptureRunResult {
    if program.valid == false {
        return make_capture_run_result(3, 0, 0, 0);
    }
    let result = execute_capture_program(
        program,
        subject,
        from,
        program.case_sensitive,
        program.dot_crosses_newline,
        program.line_anchors,
        counting,
        capturing,
        collecting,
    );
    if capturing && collecting {
        return CaptureRunResult {
            kind: result.kind,
            start: result.start,
            end: result.end,
            count: result.count,
            groups: result.groups,
            matches: result.matches,
            group_width: program.captures + 1,
            work: result.work,
        };
    }
    result
}

fn compile_pattern_source(pattern: &str, options: RegexOptions, capturing: bool) -> CompiledRegex {
    let mut syntax = 'a';
    if options.syntax == Syntax::Basic {
        syntax = 'b';
    } else if options.syntax == Syntax::Extended {
        syntax = 'e';
    } else if options.syntax == Syntax::Literal {
        syntax = 'q';
    }
    let parsed = capture_pattern_source(pattern, syntax, options.expanded);
    compile_capture_program_atoms(
        parsed.atoms,
        parsed.token_ends,
        parsed.syntax,
        parsed.valid,
        parsed.case_mode,
        parsed.newline_mode,
        capturing,
        options.case_sensitive,
        options.newline == NewlineMode::Ordinary || options.newline == NewlineMode::Anchors,
        options.newline == NewlineMode::Sensitive || options.newline == NewlineMode::Anchors,
    )
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct MatchSpan {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum MatchOutcome {
    Found(MatchSpan),
    InvalidPattern,
    NoMatch,
    Uncertain,
}

pub enum CountOutcome {
    Count(usize),
    InvalidPattern,
    Uncertain,
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

pub struct CompiledRegex {
    valid: bool,
    limited: bool,
    nodes: Vec<CaptureNode>,
    root: usize,
    references: Vec<usize>,
    minimums: Vec<usize>,
    maximums: Vec<usize>,
    first_literals: Vec<usize>,
    last_literals: Vec<usize>,
    interpreted: bool,
    regular: bool,
    prefilter: bool,
    instructions: Vec<CaptureInstruction>,
    class_members: Vec<CaptureClassMember>,
    case_mode: char,
    newline_mode: char,
    shortest: bool,
    captures: usize,
    backreferences: bool,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
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

fn zero_width_word(atom: char) -> bool {
    let codepoint = atom as u32;
    let lower = atom.to_ascii_lowercase() as u32;
    (codepoint >= 48 && codepoint <= 57) || (lower >= 97 && lower <= 122) || atom == '_'
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
    token_ends: Vec<usize>,
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

fn capture_pattern_source(pattern: &str, mut syntax: char, expanded: bool) -> CaptureSource {
    let source: Vec<char> = pattern.chars().collect();
    let mut position = 0;
    let mut valid = true;
    let mut case_mode = ' ';
    let mut newline_mode = ' ';
    let mut effective_expanded = expanded;
    if syntax != 'q'
        && source.len() >= 4
        && source[0] == '*'
        && source[1] == '*'
        && source[2] == '*'
        && (source[3] == ':' || source[3] == '=')
    {
        position = 4;
        syntax = 'a';
        if source[3] == '=' {
            syntax = 'q';
        }
    };
    if syntax == 'a'
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
    let mut token_ends: Vec<usize> = Vec::new();
    while valid && position < source.len() {
        let atom = source[position];
        let token_start = atoms.len();
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
            if position < source.len() {
                position += 1;
            };
        } else if syntax == 'a' && atom == '(' {
            atoms.push(atom);
            position += 1;
            if position < source.len() && source[position] == '?' {
                atoms.push('?');
                position += 1;
                if position < source.len() {
                    let marker = source[position];
                    atoms.push(marker);
                    position += 1;
                    if marker == '<' && position < source.len() {
                        atoms.push(source[position]);
                        position += 1;
                    }
                }
            }
        } else if syntax == 'a' && (atom == '*' || atom == '+' || atom == '?') {
            atoms.push(atom);
            position += 1;
            if position < source.len() && source[position] == '?' {
                atoms.push('?');
                position += 1;
            }
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
        if syntax != 'q' && atoms.len() > token_start {
            let basic_bound = syntax == 'b'
                && atoms.len() - token_start == 2
                && atoms[token_start] == '\\'
                && atoms[token_start + 1] == '{';
            if basic_bound || (syntax != 'b' && atoms[token_start] == '{') {
                let mut in_bound = basic_bound;
                let mut first = true;
                while position < source.len() {
                    let current = source[position];
                    if effective_expanded
                        && (current == ' ' || ((current as u32) >= 9 && (current as u32) <= 13))
                    {
                        position += 1;
                    } else if effective_expanded && current == '#' {
                        while position < source.len() && source[position] != '\n' {
                            position += 1;
                        }
                    } else {
                        if first && (current as u32) >= 48 && (current as u32) <= 57 {
                            in_bound = true;
                        }
                        first = false;
                        if in_bound == false {
                            break;
                        }
                        atoms.push(current);
                        position += 1;
                        if basic_bound && current == '\\' {
                            if position < source.len() && source[position] == '}' {
                                atoms.push('}');
                                position += 1;
                            } else {
                                valid = false;
                            };
                            break;
                        } else if basic_bound == false && current == '}' {
                            if syntax == 'a' && position < source.len() && source[position] == '?' {
                                atoms.push('?');
                                position += 1;
                            }
                            break;
                        } else if current != ',' && ((current as u32) < 48 || (current as u32) > 57)
                        {
                            valid = false;
                            break;
                        };
                    };
                }
            }
        }
        while token_ends.len() < atoms.len() {
            token_ends.push(atoms.len());
        }
    }
    CaptureSource {
        valid,
        syntax,
        case_mode,
        newline_mode,
        atoms,
        token_ends,
    }
}

fn compile_capture_program_atoms(
    source: Vec<char>,
    token_ends: Vec<usize>,
    syntax: char,
    mut valid: bool,
    case_mode: char,
    newline_mode: char,
    capturing: bool,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
) -> CompiledRegex {
    let mut limited = false;
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
                && (token_ends[position] == position + 1
                    || source.len() - position < 2
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
            if syntax != 'b'
                && position < source.len()
                && source[position] == '?'
                && token_ends[position - 1] > position
            {
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
                            limited = true;
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
                    let limit = token_ends[escape_start];
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
            let mut quantifier_end = position;
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
                quantifier_end = token_ends[position];
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
                    && quantifier_end > position + 1
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
                if syntax == 'a' && position < quantifier_end && source[position] == '?' {
                    preference = 2;
                    position += 1;
                };
                if fixed {
                    preference = inner.preference;
                };
                if lower == 0 && upper == 0 && unbounded == false {
                    preference = 0;
                }
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
    let mut first_literals: Vec<usize> = Vec::new();
    let mut last_literals: Vec<usize> = Vec::new();
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
        let mut first_literal = 0;
        let mut last_literal = 0;
        if node.operation == VM_LITERAL
            || node.operation == VM_ANY
            || node.operation == VM_WORD
            || node.operation == VM_CLASS
            || node.operation == VM_NUMERIC
        {
            minimum = 1;
            maximum = 1;
            if node.operation == VM_LITERAL {
                first_literal = ((node.atom as u32) as usize) + 1;
                last_literal = first_literal;
            } else if node.operation == VM_NUMERIC {
                first_literal = node.group + 1;
                last_literal = first_literal;
            };
        } else if node.operation == VM_BACKREF {
            minimum = capture_minimums[node.group];
            maximum = capture_maximums[node.group];
        } else if node.operation == NODE_SEQUENCE {
            minimum = capture_width_sum(minimums[node.left], minimums[node.right]);
            maximum = capture_width_sum(maximums[node.left], maximums[node.right]);
            if minimums[node.left] > 0 {
                first_literal = first_literals[node.left];
            }
            if minimums[node.right] > 0 {
                last_literal = last_literals[node.right];
            }
        } else if node.operation == NODE_ALTERNATIVE {
            minimum = minimums[node.left];
            if minimums[node.right] < minimum {
                minimum = minimums[node.right];
            }
            maximum = maximums[node.left];
            if maximums[node.right] > maximum {
                maximum = maximums[node.right];
            }
            if first_literals[node.left] == first_literals[node.right] {
                first_literal = first_literals[node.left];
            }
            if last_literals[node.left] == last_literals[node.right] {
                last_literal = last_literals[node.left];
            }
        } else if node.operation == NODE_GROUP {
            minimum = minimums[node.left];
            maximum = maximums[node.left];
            first_literal = first_literals[node.left];
            last_literal = last_literals[node.left];
        } else if node.operation == NODE_REPEAT {
            minimum = capture_width_repeat(minimums[node.left], node.lower);
            maximum = capture_width_repeat(maximums[node.left], node.upper);
            if node.unbounded && maximums[node.left] > 0 {
                maximum = MAX_CAPTURE_WORK;
            }
            if node.lower > 0 && minimums[node.left] > 0 {
                first_literal = first_literals[node.left];
                last_literal = last_literals[node.left];
            }
        };
        if node.operation == NODE_GROUP && node.group > 0 {
            capture_minimums[node.group] = minimum;
            capture_maximums[node.group] = maximum;
        }
        minimums.push(minimum);
        maximums.push(maximum);
        first_literals.push(first_literal);
        last_literals.push(last_literal);
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
            first_literals[current.left] = 0;
            if minimums[left.right] > 0 {
                first_literals[current.left] = first_literals[left.right];
            }
            last_literals[current.left] = 0;
            if minimums[current.right] > 0 {
                last_literals[current.left] = last_literals[current.right];
            }
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
    let interpreted = backreferences || assertions || capturing;
    let regular = backreferences == false && assertions == false;
    let mut prefilter = true;
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
    while head < tasks.len() && valid && prefilter {
        if instructions.len() > MAX_CAPTURE_INSTRUCTIONS {
            prefilter = false;
            if regular {
                limited = true;
                valid = false;
            }
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
        prefilter = false;
        if regular {
            limited = true;
            valid = false;
        }
    }
    CompiledRegex {
        valid,
        limited,
        nodes,
        root,
        references,
        minimums,
        maximums,
        first_literals,
        last_literals,
        interpreted,
        regular,
        prefilter,
        instructions,
        class_members,
        case_mode,
        newline_mode,
        shortest,
        captures: groups,
        backreferences,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
    }
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

fn capture_repeat_endpoint(
    begin: usize,
    end: usize,
    minimum: usize,
    maximum: usize,
    shortest: bool,
) -> usize {
    let mut width = maximum;
    if shortest {
        width = minimum;
    }
    if width > end - begin {
        width = end - begin;
    }
    begin + width
}

fn capture_boundary_matches(expected: usize, actual: char, case_sensitive: bool) -> bool {
    if expected == 0 {
        return true;
    }
    let mut actual_code = ((actual as u32) as usize) + 1;
    let mut expected_code = expected;
    if case_sensitive == false {
        if actual_code >= 66 && actual_code <= 91 {
            actual_code += 32;
        }
        if expected_code >= 66 && expected_code <= 91 {
            expected_code += 32;
        }
    }
    actual_code == expected_code
}

fn execute_capture_tree(
    program: &CompiledRegex,
    subject: &str,
    from: usize,
    exact_end: usize,
    exact_match: bool,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    counting: bool,
    capturing: bool,
    collecting: bool,
    start_work: usize,
    batch: Vec<MatchSpan>,
    batch_mode: bool,
) -> CaptureRunResult {
    let mut count = 0;
    let mut all_groups: Vec<CaptureSpan> = Vec::new();
    let mut matches: Vec<MatchSpan> = Vec::new();
    let haystack: Vec<char> = subject.chars().collect();
    let mut width = 0;
    if program.backreferences || capturing {
        width = program.captures + 1;
    }
    let mut work = start_work;
    let mut start = from;
    let mut batch_index = 0;
    if batch_mode {
        if batch.len() == 0 {
            return complete_search_result(count, all_groups, matches, work);
        }
        start = batch[0].start;
    }
    while start <= haystack.len() {
        let mut next_start = start + 1;
        if program.minimums[program.root] > haystack.len() - start {
            if batch_mode {
                return capture_tree_result(2, 0, work);
            }
            return complete_search_result(count, all_groups, matches, work);
        }
        let mut minimum_end = start + program.minimums[program.root];
        let mut maximum_end = haystack.len();
        if program.maximums[program.root] < haystack.len() - start {
            maximum_end = start + program.maximums[program.root];
        }
        if exact_match {
            minimum_end = exact_end;
            maximum_end = exact_end;
        }
        if batch_mode {
            minimum_end = batch[batch_index].end;
            maximum_end = minimum_end;
        }
        let mut match_end = maximum_end;
        if program.shortest {
            match_end = minimum_end;
        }
        let mut searching = true;
        let mut found_match = false;
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
                    return capture_tree_result(2, 0, work);
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
                    if frame.begin == frame.end && lower > 1 {
                        lower = 1;
                        upper = 1;
                    }
                }
                let repeated_reference = node.operation == NODE_REPEAT
                    && program.nodes[node.left].operation == VM_BACKREF
                    && (node.unbounded || upper > 0);
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
                        let span = frame.end - frame.begin;
                        let left_minimum = program.minimums[node.left];
                        let right_minimum = program.minimums[node.right];
                        if left_minimum > span || right_minimum > span {
                            complete = true;
                        } else {
                            let mut lower = frame.begin + left_minimum;
                            if program.maximums[node.right] < span
                                && frame.end - program.maximums[node.right] > lower
                            {
                                lower = frame.end - program.maximums[node.right];
                            }
                            let mut upper = frame.end - right_minimum;
                            if program.maximums[node.left] < span
                                && frame.begin + program.maximums[node.left] < upper
                            {
                                upper = frame.begin + program.maximums[node.left];
                            }
                            if lower > upper {
                                complete = true;
                            } else {
                                cursor = upper;
                                if child_shortest {
                                    cursor = lower;
                                }
                                phase = DISSECT_LEFT;
                                let mut possible = true;
                                if cursor > frame.begin
                                    && capture_boundary_matches(
                                        program.last_literals[node.left],
                                        haystack[cursor - 1],
                                        case_sensitive,
                                    ) == false
                                {
                                    possible = false;
                                }
                                if cursor < frame.end
                                    && capture_boundary_matches(
                                        program.first_literals[node.right],
                                        haystack[cursor],
                                        case_sensitive,
                                    ) == false
                                {
                                    possible = false;
                                }
                                if possible == false {
                                    advance = true;
                                } else {
                                    child = true;
                                    child_end = cursor;
                                };
                            };
                        };
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
                            let mut available = haystack.len() - frame.begin;
                            if node.operation >= NODE_LOOKBEHIND {
                                available = frame.begin;
                            }
                            let minimum_width = program.minimums[node.left];
                            let mut maximum_width = program.maximums[node.left];
                            if maximum_width > available {
                                maximum_width = available;
                            }
                            if minimum_width > available {
                                success = node.operation == NODE_NOT_LOOKAHEAD
                                    || node.operation == NODE_NOT_LOOKBEHIND;
                                complete = true;
                            } else {
                                cursor = frame.begin + minimum_width;
                                child_end = cursor;
                                if node.operation >= NODE_LOOKBEHIND {
                                    cursor = frame.begin - maximum_width;
                                    child_begin = cursor;
                                    child_end = frame.begin;
                                }
                                child = true;
                                phase = DISSECT_ASSERTION;
                            };
                        };
                    } else if node.operation == NODE_REPEAT && repeated_reference == false {
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
                            let endpoint = capture_repeat_endpoint(
                                frame.begin,
                                frame.end,
                                program.minimums[node.left],
                                program.maximums[node.left],
                                child_shortest,
                            );
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
                        } else if node.operation == VM_BACKREF || repeated_reference {
                            let mut reference = node.group;
                            let mut minimum_repeats = 1;
                            let mut maximum_repeats = 1;
                            let mut unbounded_repeats = false;
                            if repeated_reference {
                                reference = program.nodes[node.left].group;
                                minimum_repeats = lower;
                                maximum_repeats = upper;
                                unbounded_repeats = node.unbounded;
                            }
                            let register = captures[frame.capture + reference];
                            let length = register.end - register.start;
                            matched = register.status == 2;
                            if length == 0 {
                                matched = matched && end == frame.end;
                            } else {
                                let mut repeats = 0;
                                while matched && end < frame.end {
                                    matched = length <= frame.end - end
                                        && (unbounded_repeats || repeats < maximum_repeats);
                                    let mut offset = 0;
                                    while matched && offset < length {
                                        if work == MAX_CAPTURE_WORK {
                                            return capture_tree_result(2, 0, work);
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
                                        repeats += 1;
                                    }
                                }
                                matched = matched && repeats >= minimum_repeats;
                            };
                        } else if node.operation == VM_CLASS {
                            if end < haystack.len() {
                                let mut class_position = node.group;
                                let mut included = false;
                                while program.class_members[class_position].kind > 0 {
                                    if work == MAX_CAPTURE_WORK {
                                        return capture_tree_result(2, 0, work);
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
                                return capture_tree_result(2, 0, work);
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
                            limit = frame.begin - program.minimums[node.left];
                        } else if program.maximums[node.left] < haystack.len() - frame.begin {
                            limit = frame.begin + program.maximums[node.left];
                        };
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
                        let endpoint = capture_repeat_endpoint(
                            current.cursor,
                            frame.end,
                            program.minimums[node.left],
                            program.maximums[node.left],
                            child_shortest,
                        );
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
                    let limit = capture_repeat_endpoint(
                        current.begin,
                        frame.end,
                        program.minimums[node.left],
                        program.maximums[node.left],
                        child_shortest == false,
                    );
                    if endpoint == limit {
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
                    let mut lower = frame.begin;
                    let mut upper = frame.end;
                    if node.operation == NODE_SEQUENCE {
                        lower += program.minimums[node.left];
                        if program.maximums[node.right] < frame.end - frame.begin
                            && frame.end - program.maximums[node.right] > lower
                        {
                            lower = frame.end - program.maximums[node.right];
                        }
                        upper = frame.end - program.minimums[node.right];
                        if program.maximums[node.left] < frame.end - frame.begin
                            && frame.begin + program.maximums[node.left] < upper
                        {
                            upper = frame.begin + program.maximums[node.left];
                        }
                    }
                    let mut choosing = true;
                    while choosing {
                        if (ascending && cursor == upper) || (ascending == false && cursor == lower)
                        {
                            success = false;
                            complete = true;
                            choosing = false;
                        } else {
                            if work == MAX_CAPTURE_WORK {
                                return capture_tree_result(2, 0, work);
                            }
                            work += 1;
                            if ascending {
                                cursor += 1;
                            } else {
                                cursor = cursor - 1;
                            };
                            let mut possible = true;
                            if node.operation == NODE_SEQUENCE {
                                if cursor > frame.begin
                                    && capture_boundary_matches(
                                        program.last_literals[node.left],
                                        haystack[cursor - 1],
                                        case_sensitive,
                                    ) == false
                                {
                                    possible = false;
                                }
                                if cursor < frame.end
                                    && capture_boundary_matches(
                                        program.first_literals[node.right],
                                        haystack[cursor],
                                        case_sensitive,
                                    ) == false
                                {
                                    possible = false;
                                }
                            }
                            if possible {
                                child = true;
                                child_end = cursor;
                                phase = DISSECT_LEFT;
                                if node.operation == NODE_REPEAT {
                                    child_node = frame.node;
                                    child_prefix = true;
                                    phase = DISSECT_PREFIX;
                                }
                                choosing = false;
                            }
                        };
                    }
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
                                    return capture_tree_result(2, 0, work);
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
                found_match = true;
                if capturing {
                    let mut groups: Vec<CaptureSpan> = Vec::new();
                    groups.push(CaptureSpan {
                        matched: true,
                        start,
                        end: match_end,
                    });
                    group = 1;
                    while group < width {
                        if work == MAX_CAPTURE_WORK {
                            return capture_tree_result(2, 0, work);
                        }
                        work += 1;
                        let register = captures[returned + group];
                        groups.push(CaptureSpan {
                            matched: register.status == 2,
                            start: register.start,
                            end: register.end,
                        });
                        group += 1;
                    }
                    if counting == false {
                        return CaptureRunResult {
                            kind: 0,
                            start,
                            end: match_end,
                            count: 1,
                            groups,
                            matches,
                            group_width: 0,
                            work,
                        };
                    }
                    let mut group_index = 0;
                    while group_index < groups.len() {
                        if work == MAX_CAPTURE_WORK {
                            return capture_tree_result(2, 0, work);
                        }
                        work += 1;
                        all_groups.push(groups[group_index]);
                        group_index += 1;
                    }
                }
                if counting == false {
                    return make_capture_run_result(0, start, match_end, 1);
                }
                count += 1;
                if collecting && capturing == false {
                    matches.push(MatchSpan {
                        start,
                        end: match_end,
                    });
                }
                next_start = match_end;
                if match_end == start {
                    if match_end == haystack.len() {
                        return complete_search_result(count, all_groups, matches, work);
                    }
                    next_start += 1;
                }
                break;
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
        if exact_match {
            return capture_tree_result(2, 0, work);
        }
        if batch_mode {
            if found_match == false {
                return capture_tree_result(2, 0, work);
            }
            batch_index += 1;
            if batch_index == batch.len() {
                return complete_search_result(count, all_groups, matches, work);
            }
            start = batch[batch_index].start;
        } else {
            start = next_start;
        };
    }
    complete_search_result(count, all_groups, matches, work)
}

fn execute_capture_tree_search(
    program: &CompiledRegex,
    subject: &str,
    from: usize,
    exact_end: usize,
    exact_match: bool,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    counting: bool,
    capturing: bool,
    collecting: bool,
    start_work: usize,
) -> CaptureRunResult {
    let batch: Vec<MatchSpan> = Vec::new();
    execute_capture_tree(
        program,
        subject,
        from,
        exact_end,
        exact_match,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        counting,
        capturing,
        collecting,
        start_work,
        batch,
        false,
    )
}

fn complete_program_search(
    program: &CompiledRegex,
    subject: &str,
    case_sensitive: bool,
    dot_crosses_newline: bool,
    line_anchors: bool,
    count: usize,
    matches: Vec<MatchSpan>,
    work: usize,
    capture_all: bool,
) -> CaptureRunResult {
    if capture_all {
        return execute_capture_tree(
            program,
            subject,
            0,
            0,
            false,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            true,
            true,
            true,
            work,
            matches,
            true,
        );
    }
    let groups: Vec<CaptureSpan> = Vec::new();
    complete_search_result(count, groups, matches, work)
}

fn execute_capture_program(
    program: &CompiledRegex,
    subject: &str,
    from: usize,
    mut case_sensitive: bool,
    mut dot_crosses_newline: bool,
    mut line_anchors: bool,
    counting: bool,
    capturing: bool,
    collecting: bool,
) -> CaptureRunResult {
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
    if program.interpreted && program.prefilter == false {
        return execute_capture_tree_search(
            program,
            subject,
            from,
            0,
            false,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            counting,
            capturing,
            collecting,
            0,
        );
    }
    let mut count = 0;
    let mut matches: Vec<MatchSpan> = Vec::new();
    let mut work = 0;
    let projected = program.regular == false;
    let haystack: Vec<char> = subject.chars().collect();
    if from > haystack.len() {
        return complete_program_search(
            program,
            subject,
            case_sensitive,
            dot_crosses_newline,
            line_anchors,
            count,
            matches,
            work,
            capturing && collecting,
        );
    };
    let mut seen_epochs: Vec<usize> = Vec::new();
    let mut seen_starts: Vec<usize> = Vec::new();
    let mut instruction_index = 0;
    while instruction_index < program.instructions.len() {
        seen_epochs.push(0);
        seen_starts.push(0);
        instruction_index += 1;
    }
    let mut search_from = from;
    let mut epoch = 0;
    while search_from <= haystack.len() {
        let mut stack: Vec<PatternWorkState> = Vec::new();
        let mut stack_len = 0;
        let mut next: Vec<PatternWorkState> = Vec::new();
        let mut next_len = 0;
        let mut found = false;
        let mut best_start = search_from;
        let mut best_end = search_from;
        let mut position = search_from;
        while position <= haystack.len() {
            epoch += 1;
            if found == false {
                let seed = PatternWorkState {
                    pattern: 0,
                    subject: position,
                };
                if stack_len == stack.len() {
                    stack.push(seed);
                } else {
                    stack[stack_len] = seed;
                }
                stack_len += 1;
            }
            while stack_len > 0 {
                stack_len = stack_len - 1;
                let state = stack[stack_len];
                if work == MAX_CAPTURE_WORK {
                    if projected {
                        return execute_capture_tree_search(
                            program,
                            subject,
                            from,
                            0,
                            false,
                            case_sensitive,
                            dot_crosses_newline,
                            line_anchors,
                            counting,
                            capturing,
                            collecting,
                            0,
                        );
                    }
                    return make_capture_run_result(2, 0, 0, 0);
                };
                work += 1;
                let instruction = state.pattern;
                let start = state.subject;
                if seen_epochs[instruction] != epoch || seen_starts[instruction] > start {
                    seen_epochs[instruction] = epoch;
                    seen_starts[instruction] = start;
                    let step = program.instructions[instruction];
                    if step.operation == VM_ACCEPT {
                        if projected {
                            return execute_capture_tree_search(
                                program,
                                subject,
                                from,
                                0,
                                false,
                                case_sensitive,
                                dot_crosses_newline,
                                line_anchors,
                                counting,
                                capturing,
                                collecting,
                                0,
                            );
                        }
                        if found == false
                            || start < best_start
                            || (start == best_start
                                && ((program.shortest && position < best_end)
                                    || (program.shortest == false && position > best_end)))
                        {
                            found = true;
                            best_start = start;
                            best_end = position;
                        };
                    } else if projected
                        && (step.operation == VM_BACKREF
                            || (step.operation >= NODE_LOOKAHEAD
                                && step.operation <= NODE_NOT_LOOKBEHIND))
                    {
                        // These transitions admit every possible match of the unchecked condition.
                        let resumed = PatternWorkState {
                            pattern: instruction + 1,
                            subject: start,
                        };
                        if stack_len == stack.len() {
                            stack.push(resumed);
                        } else {
                            stack[stack_len] = resumed;
                        }
                        stack_len += 1;
                        if step.operation == VM_BACKREF && position < haystack.len() {
                            if next_len == next.len() {
                                next.push(state);
                            } else {
                                next[next_len] = state;
                            }
                            next_len += 1;
                        }
                    } else if capture_assertion(step.operation) {
                        let before = position > 0 && zero_width_word(haystack[position - 1]);
                        let after =
                            position < haystack.len() && zero_width_word(haystack[position]);
                        let previous_newline = position > 0 && haystack[position - 1] == '\n';
                        let next_newline = position < haystack.len() && haystack[position] == '\n';
                        if capture_assertion_matches(
                            step.operation,
                            position,
                            haystack.len(),
                            before,
                            after,
                            previous_newline,
                            next_newline,
                            line_anchors,
                        ) {
                            let resumed = PatternWorkState {
                                pattern: instruction + 1,
                                subject: start,
                            };
                            if stack_len == stack.len() {
                                stack.push(resumed);
                            } else {
                                stack[stack_len] = resumed;
                            }
                            stack_len += 1;
                        }
                    } else if step.operation == VM_SPLIT {
                        let skipped = PatternWorkState {
                            pattern: step.alternate,
                            subject: start,
                        };
                        if stack_len == stack.len() {
                            stack.push(skipped);
                        } else {
                            stack[stack_len] = skipped;
                        };
                        stack_len += 1;
                        let branch = PatternWorkState {
                            pattern: step.target,
                            subject: start,
                        };
                        if stack_len == stack.len() {
                            stack.push(branch);
                        } else {
                            stack[stack_len] = branch;
                        }
                        stack_len += 1;
                    } else if step.operation == VM_JUMP
                        || step.operation == VM_CLEAR
                        || step.operation == VM_OPEN
                        || step.operation == VM_CLOSE
                    {
                        let mut target = instruction + 1;
                        if step.operation == VM_JUMP {
                            target = step.target;
                        }
                        let resumed = PatternWorkState {
                            pattern: target,
                            subject: start,
                        };
                        if stack_len == stack.len() {
                            stack.push(resumed);
                        } else {
                            stack[stack_len] = resumed;
                        }
                        stack_len += 1;
                    } else if step.operation == VM_CLASS {
                        if position < haystack.len() {
                            let mut class_position = step.group;
                            let mut included = false;
                            while program.class_members[class_position].kind > 0 {
                                if work == MAX_CAPTURE_WORK {
                                    if projected {
                                        return execute_capture_tree_search(
                                            program,
                                            subject,
                                            from,
                                            0,
                                            false,
                                            case_sensitive,
                                            dot_crosses_newline,
                                            line_anchors,
                                            counting,
                                            capturing,
                                            collecting,
                                            0,
                                        );
                                    }
                                    return make_capture_run_result(2, 0, 0, 0);
                                }
                                work += 1;
                                if capture_class_member_matches(
                                    program.class_members[class_position],
                                    haystack[position],
                                    case_sensitive,
                                ) {
                                    included = true;
                                }
                                class_position += 1;
                            }
                            let negated = step.atom == '^';
                            let matched = included != negated
                                && (negated == false
                                    || dot_crosses_newline
                                    || haystack[position] != '\n');
                            if matched {
                                let resumed = PatternWorkState {
                                    pattern: instruction + 1,
                                    subject: start,
                                };
                                if next_len == next.len() {
                                    next.push(resumed);
                                } else {
                                    next[next_len] = resumed;
                                }
                                next_len += 1;
                            };
                        };
                    } else {
                        if position < haystack.len() {
                            let actual = haystack[position];
                            let codepoint = actual as u32;
                            let lowercase = actual.to_ascii_lowercase() as u32;
                            let word = (codepoint >= 48 && codepoint <= 57)
                                || (lowercase >= 97 && lowercase <= 122)
                                || actual == '_';
                            let mut numeric_lower = step.group;
                            if numeric_lower >= 65 && numeric_lower <= 90 {
                                numeric_lower += 32;
                            };
                            let matched = (step.operation == VM_ANY
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
                                let resumed = PatternWorkState {
                                    pattern: instruction + 1,
                                    subject: start,
                                };
                                if next_len == next.len() {
                                    next.push(resumed);
                                } else {
                                    next[next_len] = resumed;
                                }
                                next_len += 1;
                            };
                        };
                    };
                };
            }
            let mut keep = 0;
            let mut index = 0;
            while index < next_len {
                let state = next[index];
                if found == false
                    || state.subject < best_start
                    || (program.shortest == false && state.subject == best_start)
                {
                    next[keep] = state;
                    keep += 1;
                }
                index += 1;
            }
            next_len = keep;
            if found && next_len == 0 {
                break;
            }
            if position == haystack.len() {
                break;
            }
            position += 1;
            stack_len = 0;
            index = 0;
            while index < next_len {
                let state = next[index];
                if stack_len == stack.len() {
                    stack.push(state);
                } else {
                    stack[stack_len] = state;
                }
                stack_len += 1;
                index += 1;
            }
            next_len = 0;
        }
        if found {
            if counting == false {
                if capturing {
                    return execute_capture_tree_search(
                        program,
                        subject,
                        best_start,
                        best_end,
                        true,
                        case_sensitive,
                        dot_crosses_newline,
                        line_anchors,
                        false,
                        true,
                        false,
                        work,
                    );
                }
                return make_capture_run_result(0, best_start, best_end, 1);
            }
            count += 1;
            if collecting {
                matches.push(MatchSpan {
                    start: best_start,
                    end: best_end,
                });
            }
            search_from = best_end;
            if best_end == best_start {
                if best_end == haystack.len() {
                    return complete_program_search(
                        program,
                        subject,
                        case_sensitive,
                        dot_crosses_newline,
                        line_anchors,
                        count,
                        matches,
                        work,
                        capturing && collecting,
                    );
                }
                search_from += 1;
            };
        } else {
            return complete_program_search(
                program,
                subject,
                case_sensitive,
                dot_crosses_newline,
                line_anchors,
                count,
                matches,
                work,
                capturing && collecting,
            );
        };
    }
    complete_program_search(
        program,
        subject,
        case_sensitive,
        dot_crosses_newline,
        line_anchors,
        count,
        matches,
        work,
        capturing && collecting,
    )
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
