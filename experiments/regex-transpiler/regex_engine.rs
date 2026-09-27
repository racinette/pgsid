const MAX_BACKREFERENCE_GROUP_DEPTH: usize = 64;
const MAX_LOOKAROUND_NESTING: usize = 64;
const MAX_BOUND: usize = 255;
const MAX_CAPTURE_STATES: usize = 2048;
const MAX_CAPTURE_WORK: usize = 2_000_000;
const MAX_AUTOMATON_STATES: usize = 100_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Syntax {
    Advanced,
    Extended,
    Basic,
    Literal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NewlineMode {
    Ordinary,
    Sensitive,
    Stop,
    Anchors,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Options {
    pub syntax: Syntax,
    pub case_sensitive: bool,
    pub expanded: bool,
    pub newline: NewlineMode,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            syntax: Syntax::Advanced,
            case_sensitive: true,
            expanded: false,
            newline: NewlineMode::Ordinary,
        }
    }
}

#[derive(Debug)]
pub enum CompileOutcome {
    Ready(Program),
    Uncertain,
    InvalidPattern,
}

#[derive(Debug)]
pub struct Program {
    expression: Expression,
    groups: Vec<Expression>,
    mode: MatchMode,
    preference: MatchPreference,
    capture_count: usize,
    has_backreference: bool,
}

#[derive(Debug, Clone, Copy)]
struct MatchMode {
    newline: NewlineMode,
    case_sensitive: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MatchSpan {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, PartialEq, Eq)]
pub enum MatchOutcome {
    Found(MatchSpan),
    NoMatch,
    Uncertain,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CountOutcome {
    Count(u32),
    InvalidStart,
    Uncertain,
}

#[derive(Debug)]
enum Expression {
    Empty,
    Literal(u32),
    CharacterClass {
        negated: bool,
        bracket: bool,
        ranges: Vec<CharacterRange>,
        complement_ranges: Vec<Vec<CharacterRange>>,
    },
    AnyCharacter,
    BeginningOfString,
    EndOfString,
    AbsoluteBeginning,
    AbsoluteEnd,
    BeginningOfWord,
    EndOfWord,
    WordBoundary,
    NonWordBoundary,
    CapturingGroup {
        index: usize,
        inner: Box<Expression>,
    },
    NonCapturingGroup(Box<Expression>),
    BackReference(usize),
    PositiveLookahead(Box<Expression>),
    NegativeLookahead(Box<Expression>),
    PositiveLookbehind {
        id: usize,
        inner: Box<Expression>,
    },
    NegativeLookbehind {
        id: usize,
        inner: Box<Expression>,
    },
    GroupRef(usize),
    Concatenation(Vec<Expression>),
    Alternation(Vec<Expression>),
    Repeat(Box<Expression>, Repetition, bool),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MatchPreference {
    Longest,
    Shortest,
}

#[derive(Debug)]
struct CharacterRange {
    from: u32,
    to: u32,
}

#[derive(Debug)]
enum Repetition {
    ZeroOrMore,
    OneOrMore,
    ZeroOrOne,
    Bounded {
        min: usize,
        max: Option<usize>,
        fixed: bool,
    },
}

#[derive(Debug)]
enum ParseIssue {
    Unsupported,
    Invalid,
}

struct Cursor<'a> {
    characters: &'a [char],
    position: usize,
}

struct ParseContext {
    closed_captures: Vec<bool>,
    has_backreference: bool,
    next_lookbehind_id: usize,
    groups: Vec<Expression>,
    max_group_depth: usize,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum GroupKind {
    Capturing,
    NonCapturing,
    PositiveLookahead,
    NegativeLookahead,
    PositiveLookbehind,
    NegativeLookbehind,
}

impl GroupKind {
    fn is_lookaround(self) -> bool {
        matches!(
            self,
            Self::PositiveLookahead
                | Self::NegativeLookahead
                | Self::PositiveLookbehind
                | Self::NegativeLookbehind
        )
    }
}

impl Cursor<'_> {
    fn peek(&self) -> Option<char> {
        self.characters.get(self.position).copied()
    }
}

type Parsed<'a> = Result<(Cursor<'a>, Expression), ParseIssue>;

fn concatenate(mut parts: Vec<Expression>) -> Expression {
    match parts.len() {
        0 => Expression::Empty,
        1 => parts.pop().unwrap(),
        _ => Expression::Concatenation(parts),
    }
}

struct RegexFrame {
    kind: Option<GroupKind>,
    capture_index: Option<usize>,
    lookbehind_id: Option<usize>,
    in_lookaround: bool,
    lookaround_depth: usize,
    branches: Vec<Expression>,
    parts: Vec<Expression>,
}

impl RegexFrame {
    fn root() -> Self {
        Self {
            kind: None,
            capture_index: None,
            lookbehind_id: None,
            in_lookaround: false,
            lookaround_depth: 0,
            branches: Vec::new(),
            parts: Vec::new(),
        }
    }

    fn finish(mut self) -> Expression {
        self.branches.push(concatenate(self.parts));
        if self.branches.len() == 1 {
            self.branches.pop().unwrap()
        } else {
            Expression::Alternation(self.branches)
        }
    }
}

fn parse_group_header<'a>(
    mut cursor: Cursor<'a>,
    syntax: Syntax,
) -> Result<(Cursor<'a>, Option<GroupKind>), ParseIssue> {
    cursor.position += 1;
    if cursor.peek() != Some('?') {
        return Ok((cursor, Some(GroupKind::Capturing)));
    }
    if syntax != Syntax::Advanced {
        return Err(ParseIssue::Invalid);
    }
    cursor.position += 1;
    if cursor.peek() == Some('#') {
        cursor.position += 1;
        while cursor.peek().is_some_and(|character| character != ')') {
            cursor.position += 1;
        }
        if cursor.peek() == Some(')') {
            cursor.position += 1;
        }
        return Ok((cursor, None));
    }
    let kind = match cursor.peek() {
        Some(':') => GroupKind::NonCapturing,
        Some('=') => GroupKind::PositiveLookahead,
        Some('!') => GroupKind::NegativeLookahead,
        Some('<') => {
            cursor.position += 1;
            match cursor.peek() {
                Some('=') => GroupKind::PositiveLookbehind,
                Some('!') => GroupKind::NegativeLookbehind,
                _ => return Err(ParseIssue::Invalid),
            }
        }
        _ => return Err(ParseIssue::Invalid),
    };
    cursor.position += 1;
    Ok((cursor, Some(kind)))
}

fn parse_alternation<'a>(
    mut cursor: Cursor<'a>,
    syntax: Syntax,
    context: &mut ParseContext,
) -> Parsed<'a> {
    let mut frames = vec![RegexFrame::root()];
    loop {
        match cursor.peek() {
            None => {
                if frames.len() != 1 {
                    return Err(ParseIssue::Invalid);
                }
                return Ok((cursor, frames.pop().unwrap().finish()));
            }
            Some('|') => {
                let frame = frames.last_mut().unwrap();
                frame
                    .branches
                    .push(concatenate(std::mem::take(&mut frame.parts)));
                cursor.position += 1;
            }
            Some(')') if frames.len() > 1 => {
                cursor.position += 1;
                let frame = frames.pop().unwrap();
                let kind = frame.kind.unwrap();
                let capture_index = frame.capture_index;
                let lookbehind_id = frame.lookbehind_id;
                let inner = frame.finish();
                if let Some(index) = capture_index {
                    context.closed_captures[index] = true;
                }
                let group = match kind {
                    GroupKind::Capturing if capture_index.is_some() => Expression::CapturingGroup {
                        index: capture_index.unwrap(),
                        inner: Box::new(inner),
                    },
                    GroupKind::Capturing | GroupKind::NonCapturing => {
                        Expression::NonCapturingGroup(Box::new(inner))
                    }
                    GroupKind::PositiveLookahead => Expression::PositiveLookahead(Box::new(inner)),
                    GroupKind::NegativeLookahead => Expression::NegativeLookahead(Box::new(inner)),
                    GroupKind::PositiveLookbehind => Expression::PositiveLookbehind {
                        id: lookbehind_id.unwrap(),
                        inner: Box::new(inner),
                    },
                    GroupKind::NegativeLookbehind => Expression::NegativeLookbehind {
                        id: lookbehind_id.unwrap(),
                        inner: Box::new(inner),
                    },
                };
                let (next, group) = parse_repetition(cursor, group, syntax)?;
                cursor = next;
                let id = context.groups.len();
                context.groups.push(group);
                frames
                    .last_mut()
                    .unwrap()
                    .parts
                    .push(Expression::GroupRef(id));
            }
            Some(')') if syntax == Syntax::Advanced => {
                return Ok((cursor, frames.pop().unwrap().finish()));
            }
            Some('(') => {
                let (next, kind) = parse_group_header(cursor, syntax)?;
                cursor = next;
                if let Some(kind) = kind {
                    let parent = frames.last().unwrap();
                    let lookaround_depth =
                        parent.lookaround_depth + usize::from(kind.is_lookaround());
                    if lookaround_depth > MAX_LOOKAROUND_NESTING {
                        return Err(ParseIssue::Unsupported);
                    }
                    let in_lookaround = parent.in_lookaround;
                    let capture_index = if kind == GroupKind::Capturing && !in_lookaround {
                        context.closed_captures.push(false);
                        Some(context.closed_captures.len() - 1)
                    } else {
                        None
                    };
                    let lookbehind_id = if matches!(
                        kind,
                        GroupKind::PositiveLookbehind | GroupKind::NegativeLookbehind
                    ) {
                        let id = context.next_lookbehind_id;
                        context.next_lookbehind_id += 1;
                        Some(id)
                    } else {
                        None
                    };
                    frames.push(RegexFrame {
                        kind: Some(kind),
                        capture_index,
                        lookbehind_id,
                        in_lookaround: in_lookaround || kind.is_lookaround(),
                        lookaround_depth,
                        branches: Vec::new(),
                        parts: Vec::new(),
                    });
                    context.max_group_depth = context.max_group_depth.max(frames.len() - 1);
                } else {
                    let (next, atom) = parse_repetition(cursor, Expression::Empty, syntax)?;
                    cursor = next;
                    frames.last_mut().unwrap().parts.push(atom);
                }
            }
            Some(_) => {
                let in_lookaround = frames.last().unwrap().in_lookaround;
                let (next, atom) = parse_atom(cursor, syntax, context, in_lookaround)?;
                let (next, atom) = parse_repetition(next, atom, syntax)?;
                cursor = next;
                frames.last_mut().unwrap().parts.push(atom);
            }
        }
    }
}

fn named_class_ranges(name: &str) -> Option<Vec<CharacterRange>> {
    let range = |from: char, to: char| CharacterRange {
        from: from as u32,
        to: to as u32,
    };
    let ranges = match name {
        "alnum" => vec![range('0', '9'), range('A', 'Z'), range('a', 'z')],
        "alpha" => vec![range('A', 'Z'), range('a', 'z')],
        "ascii" => vec![range('\0', '\u{007f}')],
        "blank" => vec![range('\t', '\t'), range(' ', ' ')],
        "cntrl" => vec![range('\0', '\u{001f}'), range('\u{007f}', '\u{009f}')],
        "digit" => vec![range('0', '9')],
        "graph" => vec![range('!', '~')],
        "lower" => vec![range('a', 'z')],
        "print" => vec![range(' ', '~')],
        "punct" => vec![
            range('!', '/'),
            range(':', '@'),
            range('[', '`'),
            range('{', '~'),
        ],
        "space" => vec![range('\t', '\r'), range(' ', ' ')],
        "upper" => vec![range('A', 'Z')],
        "word" => vec![
            range('0', '9'),
            range('A', 'Z'),
            range('_', '_'),
            range('a', 'z'),
        ],
        "xdigit" => vec![range('0', '9'), range('A', 'F'), range('a', 'f')],
        _ => return None,
    };
    Some(ranges)
}

fn bracket_boundary<'a>(cursor: &Cursor<'a>) -> Option<(Cursor<'a>, Expression)> {
    let marker = cursor
        .characters
        .get(cursor.position..cursor.position + 6)?;
    let expression = if marker == ['[', ':', '<', ':', ']', ']'] {
        Expression::BeginningOfWord
    } else if marker == ['[', ':', '>', ':', ']', ']'] {
        Expression::EndOfWord
    } else {
        return None;
    };
    Some((
        Cursor {
            characters: cursor.characters,
            position: cursor.position + 6,
        },
        expression,
    ))
}

fn collating_character(name: &[char]) -> Result<char, ParseIssue> {
    if let [character] = name {
        return Ok(*character);
    }
    let name: String = name.iter().collect();
    match name.as_str() {
        "NUL" => Ok('\0'),
        "SOH" => Ok('\u{0001}'),
        "STX" => Ok('\u{0002}'),
        "ETX" => Ok('\u{0003}'),
        "EOT" => Ok('\u{0004}'),
        "ENQ" => Ok('\u{0005}'),
        "ACK" => Ok('\u{0006}'),
        "BEL" | "alert" => Ok('\u{0007}'),
        "BS" | "backspace" => Ok('\u{0008}'),
        "HT" | "tab" => Ok('\t'),
        "LF" | "newline" => Ok('\n'),
        "VT" | "vertical-tab" => Ok('\u{000b}'),
        "FF" | "form-feed" => Ok('\u{000c}'),
        "CR" | "carriage-return" => Ok('\r'),
        "SO" => Ok('\u{000e}'),
        "SI" => Ok('\u{000f}'),
        "DLE" => Ok('\u{0010}'),
        "DC1" => Ok('\u{0011}'),
        "DC2" => Ok('\u{0012}'),
        "DC3" => Ok('\u{0013}'),
        "DC4" => Ok('\u{0014}'),
        "NAK" => Ok('\u{0015}'),
        "SYN" => Ok('\u{0016}'),
        "ETB" => Ok('\u{0017}'),
        "CAN" => Ok('\u{0018}'),
        "EM" => Ok('\u{0019}'),
        "SUB" => Ok('\u{001a}'),
        "ESC" => Ok('\u{001b}'),
        "IS4" | "FS" => Ok('\u{001c}'),
        "IS3" | "GS" => Ok('\u{001d}'),
        "IS2" | "RS" => Ok('\u{001e}'),
        "IS1" | "US" => Ok('\u{001f}'),
        "space" => Ok(' '),
        "exclamation-mark" => Ok('!'),
        "quotation-mark" => Ok('"'),
        "number-sign" => Ok('#'),
        "dollar-sign" => Ok('$'),
        "percent-sign" => Ok('%'),
        "ampersand" => Ok('&'),
        "apostrophe" => Ok('\''),
        "left-parenthesis" => Ok('('),
        "right-parenthesis" => Ok(')'),
        "asterisk" => Ok('*'),
        "plus-sign" => Ok('+'),
        "comma" => Ok(','),
        "hyphen" | "hyphen-minus" => Ok('-'),
        "period" | "full-stop" => Ok('.'),
        "slash" | "solidus" => Ok('/'),
        "zero" => Ok('0'),
        "one" => Ok('1'),
        "two" => Ok('2'),
        "three" => Ok('3'),
        "four" => Ok('4'),
        "five" => Ok('5'),
        "six" => Ok('6'),
        "seven" => Ok('7'),
        "eight" => Ok('8'),
        "nine" => Ok('9'),
        "colon" => Ok(':'),
        "semicolon" => Ok(';'),
        "less-than-sign" => Ok('<'),
        "equals-sign" => Ok('='),
        "greater-than-sign" => Ok('>'),
        "question-mark" => Ok('?'),
        "commercial-at" => Ok('@'),
        "left-square-bracket" => Ok('['),
        "backslash" | "reverse-solidus" => Ok('\\'),
        "right-square-bracket" => Ok(']'),
        "circumflex" | "circumflex-accent" => Ok('^'),
        "underscore" | "low-line" => Ok('_'),
        "grave-accent" => Ok('`'),
        "left-brace" | "left-curly-bracket" => Ok('{'),
        "vertical-line" => Ok('|'),
        "right-brace" | "right-curly-bracket" => Ok('}'),
        "tilde" => Ok('~'),
        "DEL" => Ok('\u{007f}'),
        _ => Err(ParseIssue::Invalid),
    }
}

fn parse_collating_character<'a>(mut cursor: Cursor<'a>) -> Result<(Cursor<'a>, char), ParseIssue> {
    let marker = cursor.characters[cursor.position + 1];
    let start = cursor.position + 2;
    let mut end = start;
    while end + 1 < cursor.characters.len()
        && (cursor.characters[end] != marker || cursor.characters[end + 1] != ']')
    {
        end += 1;
    }
    if end + 1 >= cursor.characters.len() || start == end {
        return Err(ParseIssue::Invalid);
    }
    let character = collating_character(&cursor.characters[start..end])?;
    cursor.position = end + 2;
    Ok((cursor, character))
}

fn simple_control_escape(escaped: char) -> Option<char> {
    match escaped {
        'a' => Some('\u{0007}'),
        'b' => Some('\u{0008}'),
        'B' => Some('\\'),
        'e' => Some('\u{001b}'),
        'f' => Some('\u{000c}'),
        'n' => Some('\n'),
        'r' => Some('\r'),
        't' => Some('\t'),
        'v' => Some('\u{000b}'),
        _ => None,
    }
}

fn control_letter(character: char) -> char {
    char::from_u32((character as u32) & 0x1f).unwrap()
}

fn bracket_character<'a>(
    mut cursor: Cursor<'a>,
    syntax: Syntax,
    captures: usize,
) -> Result<(Cursor<'a>, u32, bool), ParseIssue> {
    let raw = cursor.peek().ok_or(ParseIssue::Invalid)?;
    if raw == '[' {
        match cursor.characters.get(cursor.position + 1) {
            Some('.') => {
                let (next, character) = parse_collating_character(cursor)?;
                return Ok((next, character as u32, true));
            }
            Some('=') | Some(':') => return Err(ParseIssue::Invalid),
            _ => {}
        }
    }
    if raw == '\\' && syntax == Syntax::Advanced {
        cursor.position += 1;
        let escaped = cursor.peek().ok_or(ParseIssue::Invalid)?;
        if matches!(escaped, '1'..='9') {
            let mut number = 0_u32;
            let mut digits = 0;
            for atom in cursor.characters[cursor.position..].iter().take(255) {
                let Some(digit) = atom.to_digit(10) else {
                    break;
                };
                number = number.wrapping_mul(10).wrapping_add(digit);
                digits += 1;
            }
            if digits == 1 || (number > 0 && number as usize <= captures) {
                return Err(ParseIssue::Invalid);
            }
        }
        if shorthand_class(escaped).is_some() {
            return Err(ParseIssue::Invalid);
        }
        if let Some((next, character)) = numeric_escape(Cursor {
            characters: cursor.characters,
            position: cursor.position,
        })? {
            return Ok((next, character, true));
        }
        if escaped == 'c' {
            let control = cursor
                .characters
                .get(cursor.position + 1)
                .ok_or(ParseIssue::Invalid)?;
            cursor.position += 2;
            return Ok((cursor, control_letter(*control) as u32, true));
        }
        if let Some(character) = simple_control_escape(escaped) {
            cursor.position += 1;
            return Ok((cursor, character as u32, true));
        }
        if escaped.is_ascii_alphanumeric() {
            return Err(ParseIssue::Invalid);
        }
        cursor.position += 1;
        return Ok((cursor, escaped as u32, true));
    }
    cursor.position += 1;
    Ok((cursor, raw as u32, false))
}

fn parse_character_class<'a>(
    mut cursor: Cursor<'a>,
    syntax: Syntax,
    captures: usize,
) -> Parsed<'a> {
    let negated = cursor.peek() == Some('^');
    if negated {
        cursor.position += 1;
    }
    let mut ranges = Vec::new();
    let mut complement_ranges = Vec::new();
    loop {
        let Some(first) = cursor.peek() else {
            return Err(ParseIssue::Invalid);
        };
        if first == ']' && (!ranges.is_empty() || !complement_ranges.is_empty()) {
            cursor.position += 1;
            return Ok((
                cursor,
                Expression::CharacterClass {
                    negated,
                    bracket: true,
                    ranges,
                    complement_ranges,
                },
            ));
        }
        if first == '[' && cursor.characters.get(cursor.position + 1) == Some(&':') {
            let start = cursor.position + 2;
            let mut end = start;
            while cursor
                .characters
                .get(end)
                .is_some_and(|character| *character != ':')
            {
                end += 1;
            }
            if cursor.characters.get(end) != Some(&':')
                || cursor.characters.get(end + 1) != Some(&']')
            {
                return Err(ParseIssue::Invalid);
            }
            let name: String = cursor.characters[start..end].iter().collect();
            if name == "<" || name == ">" {
                return Err(ParseIssue::Unsupported);
            }
            let class = named_class_ranges(&name).ok_or(ParseIssue::Invalid)?;
            cursor.position = end + 2;
            if cursor.peek() == Some('-')
                && cursor.characters.get(cursor.position + 1) != Some(&']')
            {
                return Err(ParseIssue::Invalid);
            }
            ranges.extend(class);
            continue;
        }
        if first == '[' && cursor.characters.get(cursor.position + 1) == Some(&'=') {
            let (next, character) = parse_collating_character(cursor)?;
            cursor = next;
            if cursor.peek() == Some('-')
                && cursor.characters.get(cursor.position + 1) != Some(&']')
            {
                return Err(ParseIssue::Invalid);
            }
            ranges.push(CharacterRange {
                from: character as u32,
                to: character as u32,
            });
            continue;
        }
        if first == '\\' && syntax == Syntax::Advanced {
            let escaped = cursor
                .characters
                .get(cursor.position + 1)
                .copied()
                .ok_or(ParseIssue::Invalid)?;
            if let Some(Expression::CharacterClass {
                negated: complement,
                ranges: class,
                ..
            }) = shorthand_class(escaped)
            {
                cursor.position += 2;
                if cursor.peek() == Some('-')
                    && cursor.characters.get(cursor.position + 1) != Some(&']')
                {
                    return Err(ParseIssue::Invalid);
                }
                if complement {
                    complement_ranges.push(class);
                } else {
                    ranges.extend(class);
                }
                continue;
            }
        }
        let (next, first, escaped_first) = bracket_character(cursor, syntax, captures)?;
        cursor = next;
        if first == '-' as u32
            && !escaped_first
            && (!ranges.is_empty() || !complement_ranges.is_empty())
            && cursor.peek() != Some(']')
        {
            return Err(ParseIssue::Invalid);
        }
        let range_follows = (first != '-' as u32
            || escaped_first
            || (ranges.is_empty() && complement_ranges.is_empty()))
            && cursor.peek() == Some('-')
            && cursor.characters.get(cursor.position + 1) != Some(&']');
        if range_follows {
            cursor.position += 1;
            let (next, last, _) = bracket_character(cursor, syntax, captures)?;
            cursor = next;
            if last < first {
                return Err(ParseIssue::Invalid);
            }
            ranges.push(CharacterRange {
                from: first,
                to: last,
            });
        } else {
            ranges.push(CharacterRange {
                from: first,
                to: first,
            });
        }
    }
}

fn shorthand_class(escape: char) -> Option<Expression> {
    let range = |from: char, to: char| CharacterRange {
        from: from as u32,
        to: to as u32,
    };
    let ranges = match escape.to_ascii_lowercase() {
        'd' => vec![range('0', '9')],
        'w' => vec![
            range('0', '9'),
            range('A', 'Z'),
            range('_', '_'),
            range('a', 'z'),
        ],
        's' => vec![range('\t', '\r'), range(' ', ' ')],
        _ => return None,
    };
    Some(Expression::CharacterClass {
        negated: escape.is_ascii_uppercase(),
        bracket: false,
        ranges,
        complement_ranges: Vec::new(),
    })
}

fn numeric_escape<'a>(mut cursor: Cursor<'a>) -> Result<Option<(Cursor<'a>, u32)>, ParseIssue> {
    let Some(escape) = cursor.peek() else {
        return Err(ParseIssue::Invalid);
    };
    let (base, min_digits, max_digits) = match escape {
        'u' => (16, 4, 4),
        'U' => (16, 8, 8),
        'x' => (16, 1, 255),
        '0'..='7' => (8, 1, 3),
        _ => return Ok(None),
    };
    if base != 8 {
        cursor.position += 1;
    }
    let mut value = 0_u32;
    let mut digits = 0;
    while digits < max_digits {
        let Some(digit) = cursor.peek().and_then(|character| character.to_digit(base)) else {
            break;
        };
        value = value.wrapping_mul(base).wrapping_add(digit);
        cursor.position += 1;
        digits += 1;
        if base == 8 && value > 0xff {
            cursor.position -= 1;
            value >>= 3;
            break;
        }
    }
    if digits < min_digits {
        return Err(ParseIssue::Invalid);
    }
    if value > 0x7fff_fffe {
        return Err(ParseIssue::Invalid);
    }
    Ok(Some((cursor, value)))
}

fn parse_atom<'a>(
    mut cursor: Cursor<'a>,
    syntax: Syntax,
    context: &mut ParseContext,
    in_lookaround: bool,
) -> Parsed<'a> {
    let character = cursor.peek().ok_or(ParseIssue::Invalid)?;
    cursor.position += 1;
    let atom = match character {
        '(' => return Err(ParseIssue::Invalid),
        '^' => Expression::BeginningOfString,
        '$' => Expression::EndOfString,
        '.' => Expression::AnyCharacter,
        '[' => {
            if let Some(boundary) = bracket_boundary(&cursor) {
                return Ok(boundary);
            }
            return parse_character_class(cursor, syntax, context.closed_captures.len() - 1);
        }
        '\\' => {
            let escaped = cursor.peek().ok_or(ParseIssue::Invalid)?;
            if syntax == Syntax::Extended {
                cursor.position += 1;
                return Ok((cursor, Expression::Literal(escaped as u32)));
            }
            let assertion = match escaped {
                'A' => Some(Expression::AbsoluteBeginning),
                'Z' => Some(Expression::AbsoluteEnd),
                'm' => Some(Expression::BeginningOfWord),
                'M' => Some(Expression::EndOfWord),
                'y' => Some(Expression::WordBoundary),
                'Y' => Some(Expression::NonWordBoundary),
                _ => None,
            };
            if let Some(assertion) = assertion {
                cursor.position += 1;
                return Ok((cursor, assertion));
            }
            if let Some(class) = shorthand_class(escaped) {
                cursor.position += 1;
                return Ok((cursor, class));
            }
            if let Some(control) = simple_control_escape(escaped) {
                cursor.position += 1;
                return Ok((cursor, Expression::Literal(control as u32)));
            }
            if escaped == 'c' {
                let control = cursor
                    .characters
                    .get(cursor.position + 1)
                    .ok_or(ParseIssue::Invalid)?;
                cursor.position += 2;
                return Ok((cursor, Expression::Literal(control_letter(*control) as u32)));
            }
            if syntax == Syntax::Advanced && matches!(escaped, '1'..='9') {
                let mut end = cursor.position;
                let mut number = 0_u32;
                while end - cursor.position < 255 {
                    let Some(digit) = cursor.characters.get(end).and_then(|c| c.to_digit(10))
                    else {
                        break;
                    };
                    number = number.wrapping_mul(10).wrapping_add(digit);
                    end += 1;
                }
                let number = number as usize;
                if end == cursor.position + 1
                    || (number > 0 && number < context.closed_captures.len())
                {
                    if in_lookaround
                        || number >= context.closed_captures.len()
                        || !context.closed_captures[number]
                    {
                        return Err(ParseIssue::Invalid);
                    }
                    cursor.position = end;
                    context.has_backreference = true;
                    return Ok((cursor, Expression::BackReference(number)));
                }
                if matches!(escaped, '8' | '9') {
                    return Err(ParseIssue::Invalid);
                }
            }
            if let Some((next, character)) = numeric_escape(Cursor {
                characters: cursor.characters,
                position: cursor.position,
            })? {
                return Ok((next, Expression::Literal(character)));
            }
            if escaped.is_ascii_alphanumeric() {
                return Err(ParseIssue::Invalid);
            }
            cursor.position += 1;
            Expression::Literal(escaped as u32)
        }
        '*' | '+' | '?' => return Err(ParseIssue::Invalid),
        '{' | ']' | '}' => Expression::Literal(character as u32),
        _ => Expression::Literal(character as u32),
    };
    Ok((cursor, atom))
}

fn parse_basic_repetition<'a>(mut cursor: Cursor<'a>, atom: Expression) -> Parsed<'a> {
    if matches!(
        atom,
        Expression::BeginningOfWord
            | Expression::EndOfWord
            | Expression::WordBoundary
            | Expression::NonWordBoundary
    ) {
        if cursor.peek() == Some('*')
            || (cursor.peek() == Some('\\')
                && cursor.characters.get(cursor.position + 1) == Some(&'{'))
        {
            return Err(ParseIssue::Invalid);
        }
        return Ok((cursor, atom));
    }
    if matches!(
        atom,
        Expression::BeginningOfString | Expression::EndOfString
    ) {
        return Ok((cursor, atom));
    }
    let repetition = if cursor.peek() == Some('*') {
        cursor.position += 1;
        Repetition::ZeroOrMore
    } else if cursor.peek() == Some('\\')
        && cursor.characters.get(cursor.position + 1) == Some(&'{')
    {
        cursor.position += 2;
        if !cursor
            .peek()
            .is_some_and(|character| character.is_ascii_digit())
        {
            return Err(ParseIssue::Invalid);
        }
        let (next, min) = parse_bound(cursor)?;
        cursor = next;
        let fixed = cursor.peek() != Some(',');
        let max = if !fixed {
            cursor.position += 1;
            if cursor
                .peek()
                .is_some_and(|character| character.is_ascii_digit())
            {
                let (next, max) = parse_bound(cursor)?;
                cursor = next;
                if max < min {
                    return Err(ParseIssue::Invalid);
                }
                Some(max)
            } else {
                None
            }
        } else {
            Some(min)
        };
        if cursor.peek() != Some('\\') || cursor.characters.get(cursor.position + 1) != Some(&'}') {
            return Err(ParseIssue::Invalid);
        }
        cursor.position += 2;
        Repetition::Bounded { min, max, fixed }
    } else {
        return Ok((cursor, atom));
    };
    if cursor.peek() == Some('*')
        || (cursor.peek() == Some('\\') && cursor.characters.get(cursor.position + 1) == Some(&'{'))
    {
        return Err(ParseIssue::Invalid);
    }
    Ok((
        cursor,
        Expression::Repeat(Box::new(atom), repetition, false),
    ))
}

struct BasicFrame {
    capture_index: Option<usize>,
    parts: Vec<Expression>,
}

fn parse_basic_iterative<'a>(mut cursor: Cursor<'a>, context: &mut ParseContext) -> Parsed<'a> {
    let mut frames = vec![BasicFrame {
        capture_index: None,
        parts: Vec::new(),
    }];
    loop {
        let Some(character) = cursor.peek() else {
            if frames.len() != 1 {
                return Err(ParseIssue::Invalid);
            }
            return Ok((cursor, concatenate(frames.pop().unwrap().parts)));
        };
        let escaped = if character == '\\' {
            cursor.characters.get(cursor.position + 1).copied()
        } else {
            None
        };
        if escaped == Some(')') {
            if frames.len() == 1 {
                return Err(ParseIssue::Invalid);
            }
            cursor.position += 2;
            let frame = frames.pop().unwrap();
            let index = frame.capture_index.unwrap();
            context.closed_captures[index] = true;
            let group = Expression::CapturingGroup {
                index,
                inner: Box::new(concatenate(frame.parts)),
            };
            let (next, group) = parse_basic_repetition(cursor, group)?;
            cursor = next;
            let id = context.groups.len();
            context.groups.push(group);
            frames
                .last_mut()
                .unwrap()
                .parts
                .push(Expression::GroupRef(id));
            continue;
        }
        if escaped == Some('(') {
            cursor.position += 2;
            context.closed_captures.push(false);
            frames.push(BasicFrame {
                capture_index: Some(context.closed_captures.len() - 1),
                parts: Vec::new(),
            });
            context.max_group_depth = context.max_group_depth.max(frames.len() - 1);
            continue;
        }
        let previous_is_repeat = match frames.last().unwrap().parts.last() {
            Some(Expression::Repeat(_, _, _)) => true,
            Some(Expression::GroupRef(id)) => {
                matches!(context.groups[*id], Expression::Repeat(_, _, _))
            }
            _ => false,
        };
        if character == '*' && previous_is_repeat {
            return Err(ParseIssue::Invalid);
        }
        let atom = if character == '\\' {
            let escaped = escaped.ok_or(ParseIssue::Invalid)?;
            cursor.position += 2;
            match escaped {
                '(' => unreachable!(),
                '{' => return Err(ParseIssue::Invalid),
                '<' => Expression::BeginningOfWord,
                '>' => Expression::EndOfWord,
                '1'..='9' => {
                    let index = escaped as usize - '0' as usize;
                    if index >= context.closed_captures.len() || !context.closed_captures[index] {
                        return Err(ParseIssue::Invalid);
                    }
                    context.has_backreference = true;
                    Expression::BackReference(index)
                }
                _ => Expression::Literal(escaped as u32),
            }
        } else {
            cursor.position += 1;
            match character {
                '[' => {
                    let (next, class) = if let Some(boundary) = bracket_boundary(&cursor) {
                        boundary
                    } else {
                        parse_character_class(
                            cursor,
                            Syntax::Basic,
                            context.closed_captures.len() - 1,
                        )?
                    };
                    cursor = next;
                    class
                }
                '.' => Expression::AnyCharacter,
                '^' if frames.last().unwrap().parts.is_empty() => Expression::BeginningOfString,
                '$' if cursor.peek().is_none()
                    || (cursor.peek() == Some('\\')
                        && cursor.characters.get(cursor.position + 1) == Some(&')')) =>
                {
                    Expression::EndOfString
                }
                _ => Expression::Literal(character as u32),
            }
        };
        let (next, atom) = parse_basic_repetition(cursor, atom)?;
        cursor = next;
        frames.last_mut().unwrap().parts.push(atom);
    }
}

fn parse_bound<'a>(mut cursor: Cursor<'a>) -> Result<(Cursor<'a>, usize), ParseIssue> {
    let mut value = 0;
    while let Some(digit) = cursor.peek().filter(|character| character.is_ascii_digit()) {
        value = value * 10 + (digit as usize - '0' as usize);
        if value > MAX_BOUND {
            return Err(ParseIssue::Invalid);
        }
        cursor.position += 1;
    }
    Ok((cursor, value))
}

fn parse_repetition<'a>(mut cursor: Cursor<'a>, atom: Expression, syntax: Syntax) -> Parsed<'a> {
    let repetition = match cursor.peek() {
        Some('*') => Repetition::ZeroOrMore,
        Some('+') => Repetition::OneOrMore,
        Some('?') => Repetition::ZeroOrOne,
        Some('{')
            if cursor
                .characters
                .get(cursor.position + 1)
                .is_some_and(|character| character.is_ascii_digit()) =>
        {
            cursor.position += 1;
            let (next, min) = parse_bound(cursor)?;
            cursor = next;
            let fixed = cursor.peek() != Some(',');
            let max = if !fixed {
                cursor.position += 1;
                if cursor
                    .peek()
                    .is_some_and(|character| character.is_ascii_digit())
                {
                    let (next, max) = parse_bound(cursor)?;
                    cursor = next;
                    if max < min {
                        return Err(ParseIssue::Invalid);
                    }
                    Some(max)
                } else {
                    None
                }
            } else {
                Some(min)
            };
            if cursor.peek() != Some('}') {
                return Err(ParseIssue::Invalid);
            }
            Repetition::Bounded { min, max, fixed }
        }
        _ => return Ok((cursor, atom)),
    };
    if matches!(
        &atom,
        Expression::BeginningOfString
            | Expression::EndOfString
            | Expression::AbsoluteBeginning
            | Expression::AbsoluteEnd
            | Expression::BeginningOfWord
            | Expression::EndOfWord
            | Expression::WordBoundary
            | Expression::NonWordBoundary
            | Expression::PositiveLookahead(_)
            | Expression::NegativeLookahead(_)
            | Expression::PositiveLookbehind { .. }
            | Expression::NegativeLookbehind { .. }
    ) {
        return Err(ParseIssue::Invalid);
    }
    cursor.position += 1;
    let non_greedy = if cursor.peek() == Some('?') {
        if syntax != Syntax::Advanced {
            return Err(ParseIssue::Unsupported);
        }
        cursor.position += 1;
        true
    } else {
        false
    };
    match cursor.peek() {
        Some('{')
            if cursor
                .characters
                .get(cursor.position + 1)
                .is_some_and(char::is_ascii_digit) =>
        {
            return Err(ParseIssue::Invalid)
        }
        Some('*') | Some('+') => return Err(ParseIssue::Invalid),
        _ => {}
    }
    Ok((
        cursor,
        Expression::Repeat(Box::new(atom), repetition, non_greedy),
    ))
}

fn expanded_escape(
    source: &[char],
    position: usize,
    in_class: bool,
) -> Result<(usize, Vec<char>), ParseIssue> {
    let escaped = *source.get(position + 1).ok_or(ParseIssue::Invalid)?;
    if escaped == 'c' {
        let control = *source.get(position + 2).ok_or(ParseIssue::Invalid)?;
        return Ok((
            position + 3,
            format!("\\U{:08x}", control as u32 & 31).chars().collect(),
        ));
    }
    if matches!(escaped, 'x' | 'u' | 'U' | '0') {
        let (next, value) = numeric_escape(Cursor {
            characters: source,
            position: position + 1,
        })?
        .ok_or(ParseIssue::Invalid)?;
        return Ok((next.position, format!("\\U{value:08x}").chars().collect()));
    }
    if !in_class && matches!(escaped, '1'..='9') {
        let mut end = position + 1;
        while end - position <= 255 && source.get(end).is_some_and(char::is_ascii_digit) {
            end += 1;
        }
        let mut atom = vec!['(', '?', ':'];
        atom.extend_from_slice(&source[position..end]);
        atom.push(')');
        return Ok((end, atom));
    }
    Ok((position + 2, source[position..position + 2].to_vec()))
}

fn expanded_characters(pattern: &str, syntax: Syntax) -> Result<Vec<char>, ParseIssue> {
    let source: Vec<char> = pattern.chars().collect();
    let mut result = Vec::new();
    let mut position = 0;
    while let Some(character) = source.get(position).copied() {
        if character == '\\' && syntax == Syntax::Advanced {
            let (next, atom) = expanded_escape(&source, position, false)?;
            result.extend(atom);
            position = next;
        } else if character == '\\' {
            let escaped = source.get(position + 1).ok_or(ParseIssue::Invalid)?;
            result.push(character);
            result.push(*escaped);
            position += 2;
        } else if character == '('
            && source.get(position + 1) == Some(&'?')
            && source.get(position + 2) == Some(&'#')
        {
            while let Some(comment) = source.get(position) {
                result.push(*comment);
                position += 1;
                if *comment == ')' {
                    break;
                }
            }
        } else if character == '[' {
            result.push(character);
            position += 1;
            if source.get(position) == Some(&'^') {
                result.push('^');
                position += 1;
            }
            if source.get(position) == Some(&']') {
                result.push(']');
                position += 1;
            }
            loop {
                let current = *source.get(position).ok_or(ParseIssue::Invalid)?;
                if current == '\\' && syntax == Syntax::Advanced {
                    let (next, atom) = expanded_escape(&source, position, true)?;
                    result.extend(atom);
                    position = next;
                } else if current == '['
                    && matches!(source.get(position + 1), Some(':' | '.' | '='))
                {
                    let delimiter = source[position + 1];
                    result.push(current);
                    result.push(delimiter);
                    position += 2;
                    loop {
                        let nested = *source.get(position).ok_or(ParseIssue::Unsupported)?;
                        result.push(nested);
                        position += 1;
                        if nested == delimiter && source.get(position) == Some(&']') {
                            result.push(']');
                            position += 1;
                            break;
                        }
                    }
                } else {
                    result.push(current);
                    position += 1;
                    if current == ']' {
                        break;
                    }
                }
            }
        } else if character == '#' {
            while let Some(comment) = source.get(position) {
                position += 1;
                if *comment == '\n' {
                    break;
                }
            }
        } else if matches!(character, '\t'..='\r' | ' ') {
            position += 1;
        } else {
            result.push(character);
            position += 1;
        }
    }
    Ok(result)
}

fn expression_preference(
    expression: &Expression,
    groups: &[Expression],
) -> Option<MatchPreference> {
    let mut pending = vec![expression];
    while let Some(expression) = pending.pop() {
        match expression {
            Expression::GroupRef(id) => pending.push(&groups[*id]),
            Expression::CapturingGroup { inner, .. } | Expression::NonCapturingGroup(inner) => {
                pending.push(inner);
            }
            Expression::Repeat(inner, repetition, non_greedy) => {
                if matches!(repetition, Repetition::Bounded { fixed: true, .. }) {
                    pending.push(inner);
                } else if *non_greedy {
                    return Some(MatchPreference::Shortest);
                } else {
                    return Some(MatchPreference::Longest);
                }
            }
            Expression::Concatenation(parts) => {
                for part in parts.iter().rev() {
                    pending.push(part);
                }
            }
            Expression::Alternation(_) => return Some(MatchPreference::Longest),
            _ => {}
        }
    }
    None
}

fn estimated_automaton_states(expression: &Expression, groups: &[usize]) -> Option<usize> {
    let estimate = match expression {
        Expression::GroupRef(id) => *groups.get(*id)?,
        Expression::CapturingGroup { inner, .. } | Expression::NonCapturingGroup(inner) => {
            estimated_automaton_states(inner, groups)?
        }
        Expression::PositiveLookahead(inner)
        | Expression::NegativeLookahead(inner)
        | Expression::PositiveLookbehind { inner, .. }
        | Expression::NegativeLookbehind { inner, .. } => {
            2_usize.checked_add(estimated_automaton_states(inner, groups)?)?
        }
        Expression::Concatenation(parts) => parts.iter().try_fold(1_usize, |total, part| {
            total.checked_add(estimated_automaton_states(part, groups)?)
        })?,
        Expression::Alternation(branches) => {
            branches.iter().try_fold(2_usize, |total, branch| {
                total.checked_add(estimated_automaton_states(branch, groups)?)
            })?
        }
        Expression::Repeat(inner, repetition, _) => {
            let (min, max) = match repetition {
                Repetition::ZeroOrMore => (0, None),
                Repetition::OneOrMore => (1, None),
                Repetition::ZeroOrOne => (0, Some(1)),
                Repetition::Bounded { min, max, .. } => (*min, *max),
            };
            let copies = max.unwrap_or(min + 1);
            let branches = max.map_or(1, |max| max - min);
            copies
                .checked_mul(estimated_automaton_states(inner, groups)?)?
                .checked_add(branches + 1)?
        }
        _ => 2,
    };
    (estimate <= MAX_AUTOMATON_STATES).then_some(estimate)
}

pub fn compile(pattern: &str, options: Options) -> CompileOutcome {
    if options.syntax == Syntax::Literal
        && (options.expanded || options.newline != NewlineMode::Ordinary)
    {
        return CompileOutcome::InvalidPattern;
    }

    let (mut syntax, mut body, mut newline) = if options.syntax == Syntax::Literal {
        (Syntax::Literal, pattern, options.newline)
    } else if let Some(body) = pattern.strip_prefix("***=") {
        (Syntax::Literal, body, NewlineMode::Ordinary)
    } else if let Some(body) = pattern.strip_prefix("***:") {
        (Syntax::Advanced, body, options.newline)
    } else {
        (options.syntax, pattern, options.newline)
    };
    let mut case_sensitive = options.case_sensitive;
    let mut expanded = options.expanded;
    if syntax == Syntax::Advanced {
        if let Some(rest) = body.strip_prefix("(?") {
            let option_length = rest
                .bytes()
                .take_while(|byte| byte.is_ascii_alphabetic())
                .count();
            if option_length > 0 {
                let Some(after_options) = rest[option_length..].strip_prefix(')') else {
                    return CompileOutcome::InvalidPattern;
                };
                for option in rest[..option_length].chars() {
                    match option {
                        'b' => syntax = Syntax::Basic,
                        'e' => syntax = Syntax::Extended,
                        'q' => syntax = Syntax::Literal,
                        'c' => case_sensitive = true,
                        'i' => case_sensitive = false,
                        't' => expanded = false,
                        'x' => expanded = true,
                        'm' | 'n' => newline = NewlineMode::Sensitive,
                        'p' => newline = NewlineMode::Stop,
                        'w' => newline = NewlineMode::Anchors,
                        's' => newline = NewlineMode::Ordinary,
                        _ => return CompileOutcome::InvalidPattern,
                    }
                }
                if syntax == Syntax::Literal {
                    expanded = false;
                    newline = NewlineMode::Ordinary;
                }
                body = after_options;
            }
        }
    }
    if syntax == Syntax::Literal {
        return CompileOutcome::Ready(Program {
            expression: concatenate(
                body.chars()
                    .map(|character| Expression::Literal(character as u32))
                    .collect(),
            ),
            mode: MatchMode {
                newline,
                case_sensitive,
            },
            preference: MatchPreference::Longest,
            capture_count: 0,
            has_backreference: false,
            groups: Vec::new(),
        });
    }
    let characters: Vec<char> = if expanded {
        match expanded_characters(body, syntax) {
            Ok(characters) => characters,
            Err(ParseIssue::Unsupported) => return CompileOutcome::Uncertain,
            Err(ParseIssue::Invalid) => return CompileOutcome::InvalidPattern,
        }
    } else {
        body.chars().collect()
    };
    let cursor = Cursor {
        characters: &characters,
        position: 0,
    };
    let mut context = ParseContext {
        closed_captures: vec![false],
        has_backreference: false,
        next_lookbehind_id: 0,
        groups: Vec::new(),
        max_group_depth: 0,
    };
    let parsed = match syntax {
        Syntax::Advanced | Syntax::Extended => parse_alternation(cursor, syntax, &mut context),
        Syntax::Basic => parse_basic_iterative(cursor, &mut context),
        Syntax::Literal => unreachable!(),
    };
    match parsed {
        Ok((cursor, expression)) if cursor.position == characters.len() => {
            if context.has_backreference && context.max_group_depth > MAX_BACKREFERENCE_GROUP_DEPTH
            {
                return CompileOutcome::Uncertain;
            }
            let mut group_costs = Vec::with_capacity(context.groups.len());
            for group in &context.groups {
                let Some(cost) = estimated_automaton_states(group, &group_costs) else {
                    return CompileOutcome::Uncertain;
                };
                group_costs.push(cost);
            }
            if estimated_automaton_states(&expression, &group_costs).is_none() {
                return CompileOutcome::Uncertain;
            }
            let preference = expression_preference(&expression, &context.groups)
                .unwrap_or(MatchPreference::Longest);
            CompileOutcome::Ready(Program {
                expression,
                groups: context.groups,
                mode: MatchMode {
                    newline,
                    case_sensitive,
                },
                preference,
                capture_count: context.closed_captures.len() - 1,
                has_backreference: context.has_backreference,
            })
        }
        Ok(_) | Err(ParseIssue::Invalid) => CompileOutcome::InvalidPattern,
        Err(ParseIssue::Unsupported) => CompileOutcome::Uncertain,
    }
}

fn push_unique(mut positions: Vec<usize>, position: usize) -> Vec<usize> {
    if !positions.contains(&position) {
        positions.push(position);
    }
    positions
}

struct MatchContext<'a> {
    groups: &'a [Expression],
    lookbehind_ends: Vec<Option<Vec<bool>>>,
    capture_work: usize,
}

fn charge_capture_work(context: &mut MatchContext, amount: usize) -> Result<(), ()> {
    context.capture_work = context
        .capture_work
        .checked_add(amount)
        .filter(|work| *work <= MAX_CAPTURE_WORK)
        .ok_or(())?;
    Ok(())
}

struct Automaton<'a> {
    states: Vec<Vec<Transition<'a>>>,
    groups: &'a [Expression],
    start: usize,
    accept: usize,
}

enum Transition<'a> {
    Epsilon(usize),
    Assertion(&'a Expression, usize),
    Character(&'a Expression, usize),
}

enum BuildTask<'a> {
    Visit(&'a Expression),
    Concatenate(usize),
    Alternate(usize),
    Repeat { min: usize, max: Option<usize> },
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ScanMode {
    Search,
    Lookahead,
    Lookbehind,
}

impl<'a> Automaton<'a> {
    fn new(expression: &'a Expression, groups: &'a [Expression]) -> Self {
        let mut automaton = Self {
            states: Vec::new(),
            groups,
            start: 0,
            accept: 0,
        };
        (automaton.start, automaton.accept) = automaton.compile(expression);
        automaton
    }

    fn state(&mut self) -> usize {
        let index = self.states.len();
        self.states.push(Vec::new());
        index
    }

    fn compile(&mut self, expression: &'a Expression) -> (usize, usize) {
        let mut tasks = vec![BuildTask::Visit(expression)];
        let mut fragments = Vec::new();
        while let Some(task) = tasks.pop() {
            match task {
                BuildTask::Visit(expression) => match expression {
                    Expression::GroupRef(id) => tasks.push(BuildTask::Visit(&self.groups[*id])),
                    Expression::CapturingGroup { inner, .. }
                    | Expression::NonCapturingGroup(inner) => {
                        tasks.push(BuildTask::Visit(inner));
                    }
                    Expression::Concatenation(parts) => {
                        tasks.push(BuildTask::Concatenate(parts.len()));
                        for part in parts.iter().rev() {
                            tasks.push(BuildTask::Visit(part));
                        }
                    }
                    Expression::Alternation(branches) => {
                        tasks.push(BuildTask::Alternate(branches.len()));
                        for branch in branches.iter().rev() {
                            tasks.push(BuildTask::Visit(branch));
                        }
                    }
                    Expression::Repeat(inner, repetition, _) => {
                        let (min, max) = match repetition {
                            Repetition::ZeroOrMore => (0, None),
                            Repetition::OneOrMore => (1, None),
                            Repetition::ZeroOrOne => (0, Some(1)),
                            Repetition::Bounded { min, max, .. } => (*min, *max),
                        };
                        tasks.push(BuildTask::Repeat { min, max });
                        for _ in 0..max.unwrap_or(min + 1) {
                            tasks.push(BuildTask::Visit(inner));
                        }
                    }
                    Expression::BackReference(_) => unreachable!(),
                    _ => {
                        let start = self.state();
                        let end = self.state();
                        let transition = match expression {
                            Expression::Literal(_)
                            | Expression::CharacterClass { .. }
                            | Expression::AnyCharacter => Transition::Character(expression, end),
                            Expression::Empty => Transition::Epsilon(end),
                            _ => Transition::Assertion(expression, end),
                        };
                        self.states[start].push(transition);
                        fragments.push((start, end));
                    }
                },
                BuildTask::Concatenate(count) => {
                    let parts = fragments.split_off(fragments.len() - count);
                    let start = self.state();
                    let mut end = start;
                    for (part_start, part_end) in parts {
                        self.states[end].push(Transition::Epsilon(part_start));
                        end = part_end;
                    }
                    fragments.push((start, end));
                }
                BuildTask::Alternate(count) => {
                    let branches = fragments.split_off(fragments.len() - count);
                    let start = self.state();
                    let end = self.state();
                    for (branch_start, branch_end) in branches {
                        self.states[start].push(Transition::Epsilon(branch_start));
                        self.states[branch_end].push(Transition::Epsilon(end));
                    }
                    fragments.push((start, end));
                }
                BuildTask::Repeat { min, max } => {
                    let count = max.unwrap_or(min + 1);
                    let parts = fragments.split_off(fragments.len() - count);
                    let start = self.state();
                    let mut end = start;
                    for (index, (part_start, part_end)) in parts.into_iter().enumerate() {
                        if index < min {
                            self.states[end].push(Transition::Epsilon(part_start));
                            end = part_end;
                        } else {
                            let next = self.state();
                            self.states[end].push(Transition::Epsilon(next));
                            self.states[end].push(Transition::Epsilon(part_start));
                            self.states[part_end].push(Transition::Epsilon(next));
                            if max.is_none() {
                                self.states[part_end].push(Transition::Epsilon(part_start));
                            }
                            end = next;
                        }
                    }
                    fragments.push((start, end));
                }
            }
        }
        fragments.pop().unwrap()
    }
}

fn set_active(
    active: &mut [Option<usize>],
    indexes: &mut Vec<usize>,
    index: usize,
    start: usize,
) -> bool {
    match active[index] {
        Some(previous) if previous <= start => return false,
        None => indexes.push(index),
        Some(_) => {}
    }
    active[index] = Some(start);
    true
}

fn run_automaton(
    automaton: &Automaton<'_>,
    subject: &[char],
    from: usize,
    mode: MatchMode,
    preference: MatchPreference,
    scan_mode: ScanMode,
    context: &mut MatchContext,
) -> (Option<MatchSpan>, Vec<bool>) {
    let collect_all_ends = scan_mode == ScanMode::Lookbehind;
    let mut active = vec![None; automaton.states.len()];
    let mut next = vec![None; automaton.states.len()];
    let mut active_indexes = Vec::new();
    let mut next_indexes = Vec::new();
    let mut ends = if collect_all_ends {
        vec![false; subject.len() + 1]
    } else {
        Vec::new()
    };
    let mut best: Option<MatchSpan> = None;
    for position in from..=subject.len() {
        if scan_mode != ScanMode::Lookahead || position == from {
            set_active(&mut active, &mut active_indexes, automaton.start, position);
        }
        let mut queue = active_indexes.clone();
        let mut queue_position = 0;
        while queue_position < queue.len() {
            let index = queue[queue_position];
            queue_position += 1;
            let start = active[index].unwrap();
            for transition in &automaton.states[index] {
                let destination = match transition {
                    Transition::Epsilon(destination) => Some(*destination),
                    Transition::Assertion(assertion, destination)
                        if match_ends(assertion, subject, position, mode, context)
                            .contains(&position) =>
                    {
                        Some(*destination)
                    }
                    _ => None,
                };
                if let Some(destination) = destination {
                    if set_active(&mut active, &mut active_indexes, destination, start) {
                        queue.push(destination);
                    }
                }
            }
        }
        if let Some(start) = active[automaton.accept] {
            if collect_all_ends {
                ends[position] = true;
            }
            let candidate = MatchSpan {
                start,
                end: position,
            };
            if best.as_ref().is_none_or(|current| {
                start < current.start
                    || (start == current.start
                        && match preference {
                            MatchPreference::Longest => position > current.end,
                            MatchPreference::Shortest => position < current.end,
                        })
            }) {
                best = Some(candidate);
            }
        }
        if scan_mode == ScanMode::Lookahead && best.is_some() {
            break;
        }
        if position == subject.len() {
            break;
        }
        for index in &active_indexes {
            let start = active[*index].unwrap();
            for transition in &automaton.states[*index] {
                if let Transition::Character(character, destination) = transition {
                    if match_ends(character, subject, position, mode, context)
                        .contains(&(position + 1))
                    {
                        set_active(&mut next, &mut next_indexes, *destination, start);
                    }
                }
            }
        }
        if !collect_all_ends
            && best.as_ref().is_some_and(|span| {
                next_indexes
                    .iter()
                    .all(|index| next[*index].unwrap() > span.start)
            })
        {
            break;
        }
        if scan_mode == ScanMode::Lookahead && next_indexes.is_empty() {
            break;
        }
        for index in active_indexes.drain(..) {
            active[index] = None;
        }
        let previous = active;
        active = next;
        next = previous;
        let previous_indexes = active_indexes;
        active_indexes = next_indexes;
        next_indexes = previous_indexes;
    }
    (best, ends)
}

fn advance(
    expression: &Expression,
    subject: &[char],
    positions: Vec<usize>,
    mode: MatchMode,
    context: &mut MatchContext,
) -> Vec<usize> {
    let mut next = Vec::new();
    for position in positions {
        for end in match_ends(expression, subject, position, mode, context) {
            next = push_unique(next, end);
        }
    }
    next
}

fn match_repeat(
    expression: &Expression,
    repetition: &Repetition,
    subject: &[char],
    start: usize,
    mode: MatchMode,
    context: &mut MatchContext,
) -> Vec<usize> {
    if let Repetition::Bounded { min, max, .. } = repetition {
        let mut reached = if *min == 0 { vec![start] } else { Vec::new() };
        let mut frontier = vec![start];
        let limit = max.unwrap_or(min + subject.len() + 1);
        for count in 1..=limit {
            frontier = advance(expression, subject, frontier, mode, context);
            if frontier.is_empty() {
                break;
            }
            if count >= *min {
                let mut grew = false;
                for end in &frontier {
                    if !reached.contains(end) {
                        reached.push(*end);
                        grew = true;
                    }
                }
                if max.is_none() && !grew {
                    break;
                }
            }
        }
        return reached;
    }
    let mut reached = match repetition {
        Repetition::OneOrMore => advance(expression, subject, vec![start], mode, context),
        Repetition::ZeroOrMore | Repetition::ZeroOrOne => vec![start],
        Repetition::Bounded { .. } => Vec::new(),
    };
    if matches!(repetition, Repetition::ZeroOrOne) {
        return advance(expression, subject, vec![start], mode, context)
            .into_iter()
            .fold(reached, push_unique);
    }

    let mut frontier = reached.clone();
    while !frontier.is_empty() {
        let candidates = advance(expression, subject, frontier, mode, context);
        frontier = Vec::new();
        for end in candidates {
            if !reached.contains(&end) {
                reached.push(end);
                frontier.push(end);
            }
        }
    }
    reached
}

fn equal_char(left: char, right: char, case_sensitive: bool) -> bool {
    left == right || (!case_sensitive && left.to_ascii_lowercase() == right.to_ascii_lowercase())
}

fn equal_codepoint(character: char, expected: u32, case_sensitive: bool) -> bool {
    char::from_u32(expected).is_some_and(|expected| equal_char(character, expected, case_sensitive))
}

fn in_range(character: char, range: &CharacterRange, case_sensitive: bool) -> bool {
    (range.from <= character as u32 && character as u32 <= range.to)
        || (!case_sensitive
            && ((range.from <= character.to_ascii_lowercase() as u32
                && character.to_ascii_lowercase() as u32 <= range.to)
                || (range.from <= character.to_ascii_uppercase() as u32
                    && character.to_ascii_uppercase() as u32 <= range.to)))
}

fn is_word(character: Option<&char>) -> bool {
    character.is_some_and(|character| character.is_ascii_alphanumeric() || *character == '_')
}

fn lookbehind_matches(
    id: usize,
    expression: &Expression,
    subject: &[char],
    position: usize,
    mode: MatchMode,
    context: &mut MatchContext,
) -> bool {
    if context.lookbehind_ends.len() <= id {
        context.lookbehind_ends.resize_with(id + 1, || None);
    }
    if context.lookbehind_ends[id].is_none() {
        let automaton = Automaton::new(expression, context.groups);
        let (_, ends) = run_automaton(
            &automaton,
            subject,
            0,
            mode,
            MatchPreference::Longest,
            ScanMode::Lookbehind,
            context,
        );
        context.lookbehind_ends[id] = Some(ends);
    }
    context.lookbehind_ends[id].as_ref().unwrap()[position]
}

fn match_ends(
    expression: &Expression,
    subject: &[char],
    start: usize,
    mode: MatchMode,
    context: &mut MatchContext,
) -> Vec<usize> {
    let stop_at_newline = matches!(mode.newline, NewlineMode::Sensitive | NewlineMode::Stop);
    let line_anchors = matches!(mode.newline, NewlineMode::Sensitive | NewlineMode::Anchors);
    match expression {
        Expression::Empty => vec![start],
        Expression::Literal(expected) => {
            if subject.get(start).is_some_and(|character| {
                equal_codepoint(*character, *expected, mode.case_sensitive)
            }) {
                vec![start + 1]
            } else {
                Vec::new()
            }
        }
        Expression::CharacterClass {
            negated,
            bracket,
            ranges,
            complement_ranges,
        } => {
            let matched = subject.get(start).is_some_and(|character| {
                (!*bracket || !*negated || !stop_at_newline || *character != '\n')
                    && ((ranges
                        .iter()
                        .any(|range| in_range(*character, range, mode.case_sensitive))
                        || complement_ranges.iter().any(|class| {
                            !class
                                .iter()
                                .any(|range| in_range(*character, range, mode.case_sensitive))
                        }))
                        != *negated)
            });
            if matched {
                vec![start + 1]
            } else {
                Vec::new()
            }
        }
        Expression::AnyCharacter => {
            if subject
                .get(start)
                .is_some_and(|character| !stop_at_newline || *character != '\n')
            {
                vec![start + 1]
            } else {
                Vec::new()
            }
        }
        Expression::BeginningOfString => {
            if start == 0 || (line_anchors && subject.get(start.wrapping_sub(1)) == Some(&'\n')) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::EndOfString => {
            if start == subject.len() || (line_anchors && subject.get(start) == Some(&'\n')) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::AbsoluteBeginning => {
            if start == 0 {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::AbsoluteEnd => {
            if start == subject.len() {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::BeginningOfWord => {
            if !is_word(
                start
                    .checked_sub(1)
                    .and_then(|position| subject.get(position)),
            ) && is_word(subject.get(start))
            {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::EndOfWord => {
            if is_word(
                start
                    .checked_sub(1)
                    .and_then(|position| subject.get(position)),
            ) && !is_word(subject.get(start))
            {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::WordBoundary | Expression::NonWordBoundary => {
            let left = is_word(
                start
                    .checked_sub(1)
                    .and_then(|position| subject.get(position)),
            );
            let right = is_word(subject.get(start));
            if (left != right) == matches!(expression, Expression::WordBoundary) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::CapturingGroup { inner, .. } | Expression::NonCapturingGroup(inner) => {
            match_ends(inner, subject, start, mode, context)
        }
        Expression::GroupRef(id) => {
            let group = &context.groups[*id];
            match_ends(group, subject, start, mode, context)
        }
        Expression::BackReference(_) => Vec::new(),
        Expression::PositiveLookahead(inner) | Expression::NegativeLookahead(inner) => {
            let automaton = Automaton::new(inner, context.groups);
            let matches = run_automaton(
                &automaton,
                subject,
                start,
                mode,
                MatchPreference::Shortest,
                ScanMode::Lookahead,
                context,
            )
            .0
            .is_some();
            if matches == matches!(expression, Expression::PositiveLookahead(_)) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::PositiveLookbehind { id, inner }
        | Expression::NegativeLookbehind { id, inner } => {
            let matches = lookbehind_matches(*id, inner, subject, start, mode, context);
            if matches == matches!(expression, Expression::PositiveLookbehind { .. }) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::Concatenation(parts) => {
            let mut positions = vec![start];
            for part in parts {
                positions = advance(part, subject, positions, mode, context);
                if positions.is_empty() {
                    break;
                }
            }
            positions
        }
        Expression::Alternation(branches) => {
            let mut ends = Vec::new();
            for branch in branches {
                for end in match_ends(branch, subject, start, mode, context) {
                    ends = push_unique(ends, end);
                }
            }
            ends
        }
        Expression::Repeat(inner, repetition, _) => {
            match_repeat(inner, repetition, subject, start, mode, context)
        }
    }
}

#[derive(Clone)]
struct CaptureState {
    position: usize,
    captures: Vec<Option<MatchSpan>>,
}

fn clear_captures(
    expression: &Expression,
    captures: &mut [Option<MatchSpan>],
    groups: &[Expression],
) {
    match expression {
        Expression::GroupRef(id) => clear_captures(&groups[*id], captures, groups),
        Expression::CapturingGroup { index, inner } => {
            captures[*index] = None;
            clear_captures(inner, captures, groups);
        }
        Expression::NonCapturingGroup(inner) | Expression::Repeat(inner, _, _) => {
            clear_captures(inner, captures, groups)
        }
        Expression::Concatenation(parts) | Expression::Alternation(parts) => {
            for part in parts {
                clear_captures(part, captures, groups);
            }
        }
        _ => {}
    }
}

fn contains_backreference(expression: &Expression, groups: &[Expression]) -> bool {
    match expression {
        Expression::BackReference(_) => true,
        Expression::GroupRef(id) => contains_backreference(&groups[*id], groups),
        Expression::CapturingGroup { inner, .. }
        | Expression::NonCapturingGroup(inner)
        | Expression::Repeat(inner, _, _) => contains_backreference(inner, groups),
        Expression::Concatenation(parts) | Expression::Alternation(parts) => parts
            .iter()
            .any(|part| contains_backreference(part, groups)),
        _ => false,
    }
}

fn capture_endpoints(
    expression: &Expression,
    subject: &[char],
    begin: usize,
    end: usize,
    mode: MatchMode,
    context: &mut MatchContext,
) -> Result<Vec<usize>, ()> {
    charge_capture_work(context, end - begin + 1)?;
    let mut ends = if contains_backreference(expression, context.groups) {
        (begin..=end).collect::<Vec<_>>()
    } else {
        match_ends(expression, subject, begin, mode, context)
            .into_iter()
            .filter(|position| *position <= end)
            .collect()
    };
    ends.sort_unstable();
    if expression_preference(expression, context.groups) != Some(MatchPreference::Shortest) {
        ends.reverse();
    }
    Ok(ends)
}

fn dissect_capture(
    expression: &Expression,
    subject: &[char],
    end: usize,
    mut state: CaptureState,
    mode: MatchMode,
    context: &mut MatchContext,
) -> Result<Option<CaptureState>, ()> {
    charge_capture_work(context, state.captures.len() + 1)?;
    let begin = state.position;
    match expression {
        Expression::GroupRef(id) => {
            dissect_capture(&context.groups[*id], subject, end, state, mode, context)
        }
        Expression::CapturingGroup { index, inner } => {
            clear_captures(expression, &mut state.captures, context.groups);
            let Some(mut result) = dissect_capture(inner, subject, end, state, mode, context)?
            else {
                return Ok(None);
            };
            result.captures[*index] = Some(MatchSpan { start: begin, end });
            Ok(Some(result))
        }
        Expression::NonCapturingGroup(inner) => {
            dissect_capture(inner, subject, end, state, mode, context)
        }
        Expression::BackReference(index) => {
            let Some(span) = state.captures[*index] else {
                return Ok(None);
            };
            if span.end - span.start != end - begin {
                return Ok(None);
            }
            for offset in 0..end - begin {
                charge_capture_work(context, 1)?;
                if !equal_char(
                    subject[span.start + offset],
                    subject[begin + offset],
                    mode.case_sensitive,
                ) {
                    return Ok(None);
                }
            }
            state.position = end;
            Ok(Some(state))
        }
        Expression::Alternation(branches) => {
            for branch in branches {
                if let Some(result) =
                    dissect_capture(branch, subject, end, state.clone(), mode, context)?
                {
                    return Ok(Some(result));
                }
            }
            Ok(None)
        }
        Expression::Concatenation(parts) => {
            if parts.is_empty() {
                return Ok((begin == end).then_some(state));
            }
            let ends = capture_endpoints(&parts[0], subject, begin, end, mode, context)?;
            let mut stack = vec![(0, state, ends, 0)];
            while let Some((index, state, ends, cursor)) = stack.pop() {
                charge_capture_work(context, 1)?;
                if cursor == ends.len() {
                    continue;
                }
                let split = ends[cursor];
                stack.push((index, state.clone(), ends, cursor + 1));
                if index + 1 == parts.len() && split != end {
                    continue;
                }
                if let Some(result) =
                    dissect_capture(&parts[index], subject, split, state, mode, context)?
                {
                    if index + 1 == parts.len() {
                        return Ok(Some(result));
                    }
                    let ends =
                        capture_endpoints(&parts[index + 1], subject, split, end, mode, context)?;
                    stack.push((index + 1, result, ends, 0));
                }
            }
            Ok(None)
        }
        Expression::Repeat(inner, repetition, lazy) => {
            let (min, max) = match repetition {
                Repetition::ZeroOrMore => (0, None),
                Repetition::OneOrMore => (1, None),
                Repetition::ZeroOrOne => (0, Some(1)),
                Repetition::Bounded { min, max, .. } => (*min, *max),
            };
            if min > 0 && !contains_backreference(inner, context.groups) {
                let prefix = Repetition::Bounded {
                    min: min - 1,
                    max: max.map(|max| max - 1),
                    fixed: false,
                };
                let mut splits = match_repeat(inner, &prefix, subject, begin, mode, context);
                splits.retain(|split| *split <= end);
                splits.sort_unstable();
                let shortest = match repetition {
                    Repetition::Bounded { fixed: true, .. } => {
                        expression_preference(inner, context.groups)
                            == Some(MatchPreference::Shortest)
                    }
                    _ => *lazy,
                };
                if !shortest {
                    splits.reverse();
                }
                for split in splits {
                    let mut candidate = state.clone();
                    candidate.position = split;
                    clear_captures(inner, &mut candidate.captures, context.groups);
                    if let Some(result) =
                        dissect_capture(inner, subject, end, candidate, mode, context)?
                    {
                        return Ok(Some(result));
                    }
                }
                return Ok(None);
            }
            if max == Some(0) {
                return Ok((begin == end).then_some(state));
            }
            let shortest =
                expression_preference(inner, context.groups) == Some(MatchPreference::Shortest);
            if shortest && min == 0 && begin == end {
                return Ok(Some(state));
            }
            let minimum = min.max(1);
            let maximum = max.unwrap_or(end - begin).min(end - begin).max(minimum);
            if maximum > MAX_CAPTURE_STATES {
                return Err(());
            }
            let first = if shortest { begin } else { end };
            let mut stack = vec![(state.clone(), first, 0)];
            while let Some((mut candidate, split, count)) = stack.pop() {
                charge_capture_work(context, 1)?;
                let position = candidate.position;
                if shortest && split < end {
                    stack.push((candidate.clone(), split + 1, count));
                } else if !shortest && split > position {
                    stack.push((candidate.clone(), split - 1, count));
                }
                let count = count + 1;
                if (split == position
                    && split != end
                    && (count >= minimum || minimum - count < end - split))
                    || (count == maximum && split != end)
                    || (split == end && count < minimum)
                {
                    continue;
                }
                clear_captures(inner, &mut candidate.captures, context.groups);
                if let Some(result) =
                    dissect_capture(inner, subject, split, candidate, mode, context)?
                {
                    if split == end {
                        return Ok(Some(result));
                    }
                    let next = if shortest { split } else { end };
                    stack.push((result, next, count));
                }
            }
            Ok((min == 0 && begin == end).then_some(state))
        }
        _ => {
            if match_ends(expression, subject, begin, mode, context).contains(&end) {
                state.position = end;
                Ok(Some(state))
            } else {
                Ok(None)
            }
        }
    }
}

fn capture_width_bounds(
    expression: &Expression,
    groups: &[Expression],
    captures: &mut [(usize, usize)],
    limit: usize,
) -> (usize, usize) {
    match expression {
        Expression::GroupRef(id) => capture_width_bounds(&groups[*id], groups, captures, limit),
        Expression::CapturingGroup { index, inner } => {
            let bounds = capture_width_bounds(inner, groups, captures, limit);
            captures[*index] = bounds;
            bounds
        }
        Expression::NonCapturingGroup(inner) => {
            capture_width_bounds(inner, groups, captures, limit)
        }
        Expression::Literal(_) | Expression::CharacterClass { .. } | Expression::AnyCharacter => {
            (1, 1)
        }
        Expression::BackReference(index) => captures[*index],
        Expression::Concatenation(parts) => {
            let mut bounds = (0_usize, 0_usize);
            for part in parts {
                let part = capture_width_bounds(part, groups, captures, limit);
                bounds.0 = bounds.0.saturating_add(part.0).min(limit);
                bounds.1 = bounds.1.saturating_add(part.1).min(limit);
            }
            bounds
        }
        Expression::Alternation(parts) => {
            let mut bounds = (limit, 0);
            for part in parts {
                let part = capture_width_bounds(part, groups, captures, limit);
                bounds.0 = bounds.0.min(part.0);
                bounds.1 = bounds.1.max(part.1);
            }
            bounds
        }
        Expression::Repeat(inner, repetition, _) => {
            let (lower, upper) = match repetition {
                Repetition::ZeroOrMore => (0, limit),
                Repetition::OneOrMore => (1, limit),
                Repetition::ZeroOrOne => (0, 1),
                Repetition::Bounded { min, max, .. } => (*min, max.unwrap_or(limit)),
            };
            let bounds = capture_width_bounds(inner, groups, captures, limit);
            (
                bounds.0.saturating_mul(lower).min(limit),
                bounds.1.saturating_mul(upper).min(limit),
            )
        }
        _ => (0, 0),
    }
}

fn first_capture_match(
    expression: &Expression,
    subject: &[char],
    from: usize,
    mode: MatchMode,
    preference: MatchPreference,
    capture_count: usize,
    context: &mut MatchContext,
) -> Result<Option<MatchSpan>, ()> {
    let mut widths = vec![(0, subject.len() + 1); capture_count + 1];
    let (minimum, maximum) =
        capture_width_bounds(expression, context.groups, &mut widths, subject.len() + 1);
    for start in from..=subject.len() {
        if minimum > subject.len() - start {
            break;
        }
        let limit = start + maximum.min(subject.len() - start);
        let mut ends: Vec<usize> = (start + minimum..=limit).collect();
        if preference == MatchPreference::Longest {
            ends.reverse();
        }
        for end in ends {
            let state = CaptureState {
                position: start,
                captures: vec![None; capture_count + 1],
            };
            if dissect_capture(expression, subject, end, state, mode, context)?.is_some() {
                return Ok(Some(MatchSpan { start, end }));
            }
        }
    }
    Ok(None)
}

impl Program {
    pub fn find(&self, subject: &str, from: usize) -> MatchOutcome {
        let characters: Vec<char> = subject.chars().collect();
        let mut context = MatchContext {
            groups: &self.groups,
            lookbehind_ends: Vec::new(),
            capture_work: 0,
        };
        let result = if self.has_backreference {
            first_capture_match(
                &self.expression,
                &characters,
                from,
                self.mode,
                self.preference,
                self.capture_count,
                &mut context,
            )
        } else {
            let automaton = Automaton::new(&self.expression, &self.groups);
            Ok(run_automaton(
                &automaton,
                &characters,
                from,
                self.mode,
                self.preference,
                ScanMode::Search,
                &mut context,
            )
            .0)
        };
        match result {
            Ok(Some(span)) => MatchOutcome::Found(span),
            Ok(None) => MatchOutcome::NoMatch,
            Err(()) => MatchOutcome::Uncertain,
        }
    }

    pub fn count(&self, subject: &str, start_1_based: i32) -> CountOutcome {
        if start_1_based < 1 {
            return CountOutcome::InvalidStart;
        }
        let characters: Vec<char> = subject.chars().collect();
        let mut context = MatchContext {
            groups: &self.groups,
            lookbehind_ends: Vec::new(),
            capture_work: 0,
        };
        let automaton = if self.has_backreference {
            None
        } else {
            Some(Automaton::new(&self.expression, &self.groups))
        };
        let mut search_from = (start_1_based - 1) as usize;
        let mut count = 0;
        loop {
            let found = if self.has_backreference {
                first_capture_match(
                    &self.expression,
                    &characters,
                    search_from,
                    self.mode,
                    self.preference,
                    self.capture_count,
                    &mut context,
                )
            } else {
                Ok(run_automaton(
                    automaton.as_ref().unwrap(),
                    &characters,
                    search_from,
                    self.mode,
                    self.preference,
                    ScanMode::Search,
                    &mut context,
                )
                .0)
            };
            let span = match found {
                Ok(Some(span)) => span,
                Ok(None) => break,
                Err(()) => return CountOutcome::Uncertain,
            };
            count += 1;
            search_from = if span.start == span.end {
                span.end + 1
            } else {
                span.end
            };
            if search_from > characters.len() {
                break;
            }
        }
        CountOutcome::Count(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn automaton_builds_deep_group_chains_iteratively() {
        let mut expression = Expression::Literal('a' as u32);
        for _ in 0..512 {
            expression = Expression::NonCapturingGroup(Box::new(expression));
        }
        assert_eq!(expression_preference(&expression, &[]), None);
        let automaton = Automaton::new(&expression, &[]);
        let mut context = MatchContext {
            groups: &[],
            lookbehind_ends: Vec::new(),
            capture_work: 0,
        };
        let (found, _) = run_automaton(
            &automaton,
            &['a'],
            0,
            MatchMode {
                newline: NewlineMode::Ordinary,
                case_sensitive: true,
            },
            MatchPreference::Longest,
            ScanMode::Search,
            &mut context,
        );
        assert_eq!(found, Some(MatchSpan { start: 0, end: 1 }));
    }
}
