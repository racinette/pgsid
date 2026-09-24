const MAX_PATTERN_SCALARS: usize = 3072;
const MAX_SUBJECT_SCALARS: usize = 4096;
const MAX_LOOKBEHIND_SUBJECT_SCALARS: usize = 256;
const MAX_GROUP_DEPTH: usize = 64;
const MAX_CAPTURE_GROUPS: usize = 128;
const MAX_BOUND: usize = 255;
const MAX_CAPTURE_STATES: usize = 2048;

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
    mode: MatchMode,
    preference: MatchPreference,
    capture_count: usize,
    has_backreference: bool,
    has_lookbehind: bool,
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
    Literal(char),
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
    PositiveLookbehind(Box<Expression>),
    NegativeLookbehind(Box<Expression>),
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
    from: char,
    to: char,
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
    has_lookbehind: bool,
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

fn parse_alternation<'a>(
    mut cursor: Cursor<'a>,
    depth: usize,
    syntax: Syntax,
    context: &mut ParseContext,
    in_lookaround: bool,
) -> Parsed<'a> {
    if depth > MAX_GROUP_DEPTH {
        return Err(ParseIssue::Unsupported);
    }
    let mut branches = Vec::new();
    loop {
        let (next, branch) = parse_concatenation(cursor, depth, syntax, context, in_lookaround)?;
        cursor = next;
        branches.push(branch);
        if cursor.peek() != Some('|') {
            break;
        }
        cursor.position += 1;
    }
    if branches.len() == 1 {
        Ok((cursor, branches.pop().unwrap()))
    } else {
        Ok((cursor, Expression::Alternation(branches)))
    }
}

fn parse_concatenation<'a>(
    mut cursor: Cursor<'a>,
    depth: usize,
    syntax: Syntax,
    context: &mut ParseContext,
    in_lookaround: bool,
) -> Parsed<'a> {
    let mut parts = Vec::new();
    while let Some(character) = cursor.peek() {
        if character == '|' || (character == ')' && (depth > 0 || syntax == Syntax::Advanced)) {
            break;
        }
        let (next, atom) = parse_atom(cursor, depth, syntax, context, in_lookaround)?;
        let (next, atom) = parse_repetition(next, atom, syntax)?;
        cursor = next;
        parts.push(atom);
    }
    Ok((cursor, concatenate(parts)))
}

fn named_class_ranges(name: &str) -> Option<Vec<CharacterRange>> {
    let range = |from, to| CharacterRange { from, to };
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
        "hyphen" | "hyphen-minus" => Ok('-'),
        "period" | "full-stop" => Ok('.'),
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
        _ => Err(ParseIssue::Unsupported),
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
) -> Result<(Cursor<'a>, char, bool), ParseIssue> {
    let raw = cursor.peek().ok_or(ParseIssue::Invalid)?;
    if raw == '[' {
        match cursor.characters.get(cursor.position + 1) {
            Some('.') => {
                let (next, character) = parse_collating_character(cursor)?;
                return Ok((next, character, true));
            }
            Some('=') | Some(':') => return Err(ParseIssue::Invalid),
            _ => {}
        }
    }
    if raw == '\\' && syntax == Syntax::Advanced {
        cursor.position += 1;
        let escaped = cursor.peek().ok_or(ParseIssue::Invalid)?;
        if matches!(escaped, '1'..='9') {
            return Err(ParseIssue::Unsupported);
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
            return Ok((cursor, control_letter(*control), true));
        }
        if let Some(character) = simple_control_escape(escaped) {
            cursor.position += 1;
            return Ok((cursor, character, true));
        }
        if escaped.is_ascii_alphanumeric() {
            return Err(ParseIssue::Invalid);
        }
        cursor.position += 1;
        return Ok((cursor, escaped, true));
    }
    cursor.position += 1;
    Ok((cursor, raw, false))
}

fn parse_character_class<'a>(mut cursor: Cursor<'a>, syntax: Syntax) -> Parsed<'a> {
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
                from: character,
                to: character,
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
        let (next, first, escaped_first) = bracket_character(cursor, syntax)?;
        cursor = next;
        if first == '-'
            && !escaped_first
            && (!ranges.is_empty() || !complement_ranges.is_empty())
            && cursor.peek() != Some(']')
        {
            return Err(ParseIssue::Invalid);
        }
        let range_follows =
            (first != '-' || escaped_first || (ranges.is_empty() && complement_ranges.is_empty()))
                && cursor.peek() == Some('-')
                && cursor.characters.get(cursor.position + 1) != Some(&']');
        if range_follows {
            cursor.position += 1;
            let (next, last, _) = bracket_character(cursor, syntax)?;
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
    let range = |from, to| CharacterRange { from, to };
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

fn numeric_escape<'a>(mut cursor: Cursor<'a>) -> Result<Option<(Cursor<'a>, char)>, ParseIssue> {
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
        value = value
            .checked_mul(base)
            .and_then(|number| number.checked_add(digit))
            .ok_or(ParseIssue::Unsupported)?;
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
    let character = char::from_u32(value).ok_or(ParseIssue::Unsupported)?;
    Ok(Some((cursor, character)))
}

fn parse_atom<'a>(
    mut cursor: Cursor<'a>,
    depth: usize,
    syntax: Syntax,
    context: &mut ParseContext,
    in_lookaround: bool,
) -> Parsed<'a> {
    let character = cursor.peek().ok_or(ParseIssue::Invalid)?;
    cursor.position += 1;
    let atom = match character {
        '(' => {
            let kind = if cursor.peek() == Some('?') {
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
                    return Ok((cursor, Expression::Empty));
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
                kind
            } else {
                GroupKind::Capturing
            };
            if matches!(
                kind,
                GroupKind::PositiveLookbehind | GroupKind::NegativeLookbehind
            ) {
                context.has_lookbehind = true;
            }
            let capture_index = if kind == GroupKind::Capturing && !in_lookaround {
                if context.closed_captures.len() > MAX_CAPTURE_GROUPS {
                    return Err(ParseIssue::Unsupported);
                }
                context.closed_captures.push(false);
                Some(context.closed_captures.len() - 1)
            } else {
                None
            };
            let (mut next, expression) = parse_alternation(
                cursor,
                depth + 1,
                syntax,
                context,
                in_lookaround || kind.is_lookaround(),
            )?;
            if next.peek() != Some(')') {
                return Err(ParseIssue::Invalid);
            }
            next.position += 1;
            if let Some(index) = capture_index {
                context.closed_captures[index] = true;
            }
            let expression = match kind {
                GroupKind::Capturing if capture_index.is_some() => Expression::CapturingGroup {
                    index: capture_index.unwrap(),
                    inner: Box::new(expression),
                },
                GroupKind::Capturing | GroupKind::NonCapturing => {
                    Expression::NonCapturingGroup(Box::new(expression))
                }
                GroupKind::PositiveLookahead => Expression::PositiveLookahead(Box::new(expression)),
                GroupKind::NegativeLookahead => Expression::NegativeLookahead(Box::new(expression)),
                GroupKind::PositiveLookbehind => {
                    Expression::PositiveLookbehind(Box::new(expression))
                }
                GroupKind::NegativeLookbehind => {
                    Expression::NegativeLookbehind(Box::new(expression))
                }
            };
            return Ok((next, expression));
        }
        '^' => Expression::BeginningOfString,
        '$' => Expression::EndOfString,
        '.' => Expression::AnyCharacter,
        '[' => {
            if let Some(boundary) = bracket_boundary(&cursor) {
                return Ok(boundary);
            }
            return parse_character_class(cursor, syntax);
        }
        '\\' => {
            let escaped = cursor.peek().ok_or(ParseIssue::Invalid)?;
            if syntax == Syntax::Extended {
                cursor.position += 1;
                return Ok((cursor, Expression::Literal(escaped)));
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
                return Ok((cursor, Expression::Literal(control)));
            }
            if escaped == 'c' {
                let control = cursor
                    .characters
                    .get(cursor.position + 1)
                    .ok_or(ParseIssue::Invalid)?;
                cursor.position += 2;
                return Ok((cursor, Expression::Literal(control_letter(*control))));
            }
            if syntax == Syntax::Advanced && matches!(escaped, '1'..='9') {
                let mut end = cursor.position;
                let mut number = 0_usize;
                while end - cursor.position < 255 {
                    let Some(digit) = cursor.characters.get(end).and_then(|c| c.to_digit(10))
                    else {
                        break;
                    };
                    number = number
                        .checked_mul(10)
                        .and_then(|value| value.checked_add(digit as usize))
                        .ok_or(ParseIssue::Unsupported)?;
                    end += 1;
                }
                if end == cursor.position + 1 || number < context.closed_captures.len() {
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
            Expression::Literal(escaped)
        }
        '*' | '+' | '?' => return Err(ParseIssue::Invalid),
        '{' | ']' | '}' => Expression::Literal(character),
        _ => Expression::Literal(character),
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

fn parse_basic<'a>(mut cursor: Cursor<'a>, depth: usize, context: &mut ParseContext) -> Parsed<'a> {
    if depth > MAX_GROUP_DEPTH {
        return Err(ParseIssue::Unsupported);
    }
    let mut parts = Vec::new();
    loop {
        let Some(character) = cursor.peek() else {
            break;
        };
        let escaped = if character == '\\' {
            cursor.characters.get(cursor.position + 1).copied()
        } else {
            None
        };
        if escaped == Some(')') {
            if depth == 0 {
                return Err(ParseIssue::Invalid);
            }
            break;
        }
        if character == '*' && matches!(parts.last(), Some(Expression::Repeat(_, _, _))) {
            return Err(ParseIssue::Invalid);
        }
        let atom = if character == '\\' {
            let escaped = escaped.ok_or(ParseIssue::Invalid)?;
            cursor.position += 2;
            match escaped {
                '(' => {
                    if context.closed_captures.len() > MAX_CAPTURE_GROUPS {
                        return Err(ParseIssue::Unsupported);
                    }
                    context.closed_captures.push(false);
                    let index = context.closed_captures.len() - 1;
                    let (next, inner) = parse_basic(cursor, depth + 1, context)?;
                    cursor = next;
                    if cursor.peek() != Some('\\')
                        || cursor.characters.get(cursor.position + 1) != Some(&')')
                    {
                        return Err(ParseIssue::Invalid);
                    }
                    cursor.position += 2;
                    context.closed_captures[index] = true;
                    Expression::CapturingGroup {
                        index,
                        inner: Box::new(inner),
                    }
                }
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
                _ => Expression::Literal(escaped),
            }
        } else {
            cursor.position += 1;
            match character {
                '[' => {
                    let (next, class) = if let Some(boundary) = bracket_boundary(&cursor) {
                        boundary
                    } else {
                        parse_character_class(cursor, Syntax::Basic)?
                    };
                    cursor = next;
                    class
                }
                '.' => Expression::AnyCharacter,
                '^' if parts.is_empty() => Expression::BeginningOfString,
                '$' if cursor.peek().is_none()
                    || (cursor.peek() == Some('\\')
                        && cursor.characters.get(cursor.position + 1) == Some(&')')) =>
                {
                    Expression::EndOfString
                }
                _ => Expression::Literal(character),
            }
        };
        let (next, atom) = parse_basic_repetition(cursor, atom)?;
        cursor = next;
        parts.push(atom);
    }
    Ok((cursor, concatenate(parts)))
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
            | Expression::PositiveLookbehind(_)
            | Expression::NegativeLookbehind(_)
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
        Some('{') => return Err(ParseIssue::Unsupported),
        Some('*') | Some('+') => return Err(ParseIssue::Invalid),
        _ => {}
    }
    Ok((
        cursor,
        Expression::Repeat(Box::new(atom), repetition, non_greedy),
    ))
}

fn expanded_characters(pattern: &str) -> Result<Vec<char>, ParseIssue> {
    let source: Vec<char> = pattern.chars().collect();
    let mut result = Vec::new();
    let mut position = 0;
    while let Some(character) = source.get(position).copied() {
        if character == '\\' {
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
            if source.get(position) == Some(&']') {
                return Err(ParseIssue::Unsupported);
            }
            loop {
                let current = *source.get(position).ok_or(ParseIssue::Invalid)?;
                if current == '\\' {
                    let escaped = source.get(position + 1).ok_or(ParseIssue::Invalid)?;
                    result.push(current);
                    result.push(*escaped);
                    position += 2;
                } else if current == '[' && source.get(position + 1) == Some(&':') {
                    result.push(current);
                    result.push(':');
                    position += 2;
                    loop {
                        let nested = *source.get(position).ok_or(ParseIssue::Unsupported)?;
                        result.push(nested);
                        position += 1;
                        if nested == ':' && source.get(position) == Some(&']') {
                            result.push(']');
                            position += 1;
                            break;
                        }
                    }
                } else if current == '[' {
                    return Err(ParseIssue::Unsupported);
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

fn expression_preference(expression: &Expression) -> Option<MatchPreference> {
    match expression {
        Expression::CapturingGroup { inner, .. } | Expression::NonCapturingGroup(inner) => {
            expression_preference(inner)
        }
        Expression::Repeat(inner, repetition, non_greedy) => {
            if matches!(repetition, Repetition::Bounded { fixed: true, .. }) {
                expression_preference(inner)
            } else if *non_greedy {
                Some(MatchPreference::Shortest)
            } else {
                Some(MatchPreference::Longest)
            }
        }
        Expression::Concatenation(parts) => parts.iter().find_map(expression_preference),
        Expression::Alternation(_) => Some(MatchPreference::Longest),
        _ => None,
    }
}

pub fn compile(pattern: &str, options: Options) -> CompileOutcome {
    if pattern.chars().count() > MAX_PATTERN_SCALARS
        || (options.syntax == Syntax::Literal && options.newline != NewlineMode::Ordinary)
    {
        return CompileOutcome::Uncertain;
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
            expression: concatenate(body.chars().map(Expression::Literal).collect()),
            mode: MatchMode {
                newline,
                case_sensitive,
            },
            preference: MatchPreference::Longest,
            capture_count: 0,
            has_backreference: false,
            has_lookbehind: false,
        });
    }
    let characters: Vec<char> = if expanded {
        match expanded_characters(body) {
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
        has_lookbehind: false,
    };
    let parsed = match syntax {
        Syntax::Advanced | Syntax::Extended => {
            parse_alternation(cursor, 0, syntax, &mut context, false)
        }
        Syntax::Basic => parse_basic(cursor, 0, &mut context),
        Syntax::Literal => unreachable!(),
    };
    match parsed {
        Ok((cursor, expression)) if cursor.position == characters.len() => {
            let preference = expression_preference(&expression).unwrap_or(MatchPreference::Longest);
            CompileOutcome::Ready(Program {
                expression,
                mode: MatchMode {
                    newline,
                    case_sensitive,
                },
                preference,
                capture_count: context.closed_captures.len() - 1,
                has_backreference: context.has_backreference,
                has_lookbehind: context.has_lookbehind,
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

fn advance(
    expression: &Expression,
    subject: &[char],
    positions: Vec<usize>,
    mode: MatchMode,
) -> Vec<usize> {
    let mut next = Vec::new();
    for position in positions {
        for end in match_ends(expression, subject, position, mode) {
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
) -> Vec<usize> {
    if let Repetition::Bounded { min, max, .. } = repetition {
        let mut reached = if *min == 0 { vec![start] } else { Vec::new() };
        let mut frontier = vec![start];
        let limit = max.unwrap_or(min + subject.len() + 1);
        for count in 1..=limit {
            frontier = advance(expression, subject, frontier, mode);
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
        Repetition::OneOrMore => advance(expression, subject, vec![start], mode),
        Repetition::ZeroOrMore | Repetition::ZeroOrOne => vec![start],
        Repetition::Bounded { .. } => Vec::new(),
    };
    if matches!(repetition, Repetition::ZeroOrOne) {
        return advance(expression, subject, vec![start], mode)
            .into_iter()
            .fold(reached, push_unique);
    }

    let mut frontier = reached.clone();
    while !frontier.is_empty() {
        let candidates = advance(expression, subject, frontier, mode);
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

fn in_range(character: char, range: &CharacterRange, case_sensitive: bool) -> bool {
    (range.from <= character && character <= range.to)
        || (!case_sensitive
            && ((range.from <= character.to_ascii_lowercase()
                && character.to_ascii_lowercase() <= range.to)
                || (range.from <= character.to_ascii_uppercase()
                    && character.to_ascii_uppercase() <= range.to)))
}

fn is_word(character: Option<&char>) -> bool {
    character.is_some_and(|character| character.is_ascii_alphanumeric() || *character == '_')
}

fn lookbehind_matches(
    expression: &Expression,
    subject: &[char],
    position: usize,
    mode: MatchMode,
) -> bool {
    for start in 0..=position {
        if match_ends(expression, subject, start, mode).contains(&position) {
            return true;
        }
    }
    false
}

fn match_ends(
    expression: &Expression,
    subject: &[char],
    start: usize,
    mode: MatchMode,
) -> Vec<usize> {
    let stop_at_newline = matches!(mode.newline, NewlineMode::Sensitive | NewlineMode::Stop);
    let line_anchors = matches!(mode.newline, NewlineMode::Sensitive | NewlineMode::Anchors);
    match expression {
        Expression::Empty => vec![start],
        Expression::Literal(expected) => {
            if subject
                .get(start)
                .is_some_and(|character| equal_char(*character, *expected, mode.case_sensitive))
            {
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
            match_ends(inner, subject, start, mode)
        }
        Expression::BackReference(_) => Vec::new(),
        Expression::PositiveLookahead(inner) | Expression::NegativeLookahead(inner) => {
            let matches = !match_ends(inner, subject, start, mode).is_empty();
            if matches == matches!(expression, Expression::PositiveLookahead(_)) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::PositiveLookbehind(inner) | Expression::NegativeLookbehind(inner) => {
            let matches = lookbehind_matches(inner, subject, start, mode);
            if matches == matches!(expression, Expression::PositiveLookbehind(_)) {
                vec![start]
            } else {
                Vec::new()
            }
        }
        Expression::Concatenation(parts) => {
            let mut positions = vec![start];
            for part in parts {
                positions = advance(part, subject, positions, mode);
                if positions.is_empty() {
                    break;
                }
            }
            positions
        }
        Expression::Alternation(branches) => {
            let mut ends = Vec::new();
            for branch in branches {
                for end in match_ends(branch, subject, start, mode) {
                    ends = push_unique(ends, end);
                }
            }
            ends
        }
        Expression::Repeat(inner, repetition, _) => {
            match_repeat(inner, repetition, subject, start, mode)
        }
    }
}

fn first_match(
    expression: &Expression,
    subject: &[char],
    from: usize,
    mode: MatchMode,
    preference: MatchPreference,
) -> Option<MatchSpan> {
    for start in from..=subject.len() {
        let ends = match_ends(expression, subject, start, mode);
        let end = if preference == MatchPreference::Shortest {
            ends.into_iter().min()
        } else {
            ends.into_iter().max()
        };
        if let Some(end) = end {
            return Some(MatchSpan { start, end });
        }
    }
    None
}

#[derive(Clone, PartialEq, Eq)]
struct CaptureState {
    position: usize,
    captures: Vec<Option<MatchSpan>>,
}

fn clear_captures(expression: &Expression, captures: &mut [Option<MatchSpan>]) {
    match expression {
        Expression::CapturingGroup { index, inner } => {
            captures[*index] = None;
            clear_captures(inner, captures);
        }
        Expression::NonCapturingGroup(inner)
        | Expression::PositiveLookahead(inner)
        | Expression::NegativeLookahead(inner)
        | Expression::PositiveLookbehind(inner)
        | Expression::NegativeLookbehind(inner)
        | Expression::Repeat(inner, _, _) => clear_captures(inner, captures),
        Expression::Concatenation(parts) | Expression::Alternation(parts) => {
            for part in parts {
                clear_captures(part, captures);
            }
        }
        _ => {}
    }
}

fn push_capture_unique(states: &mut Vec<CaptureState>, state: CaptureState) -> Result<(), ()> {
    if !states.contains(&state) {
        if states.len() >= MAX_CAPTURE_STATES {
            return Err(());
        }
        states.push(state);
    }
    Ok(())
}

fn capture_advance(
    expression: &Expression,
    subject: &[char],
    states: Vec<CaptureState>,
    mode: MatchMode,
) -> Result<Vec<CaptureState>, ()> {
    let mut next = Vec::new();
    for state in states {
        for candidate in capture_match_ends(expression, subject, state, mode)? {
            push_capture_unique(&mut next, candidate)?;
        }
    }
    Ok(next)
}

fn capture_repeat(
    expression: &Expression,
    repetition: &Repetition,
    subject: &[char],
    state: CaptureState,
    mode: MatchMode,
) -> Result<Vec<CaptureState>, ()> {
    let (min, max) = match repetition {
        Repetition::ZeroOrMore => (0, None),
        Repetition::OneOrMore => (1, None),
        Repetition::ZeroOrOne => (0, Some(1)),
        Repetition::Bounded { min, max, .. } => (*min, *max),
    };
    let limit = max.unwrap_or(min + subject.len() + 1);
    let mut frontier = vec![state];
    let mut reached = Vec::new();
    let mut seen = Vec::new();
    for count in 0..=limit {
        if count >= min {
            for candidate in &frontier {
                push_capture_unique(&mut reached, candidate.clone())?;
            }
        }
        if count == limit || frontier.is_empty() {
            break;
        }
        for candidate in &mut frontier {
            clear_captures(expression, &mut candidate.captures);
        }
        let next = capture_advance(expression, subject, frontier, mode)?;
        if max.is_none() && count >= min && next.iter().all(|candidate| seen.contains(candidate)) {
            break;
        }
        for candidate in &next {
            push_capture_unique(&mut seen, candidate.clone())?;
        }
        frontier = next;
    }
    Ok(reached)
}

fn capture_match_ends(
    expression: &Expression,
    subject: &[char],
    state: CaptureState,
    mode: MatchMode,
) -> Result<Vec<CaptureState>, ()> {
    match expression {
        Expression::CapturingGroup { index, inner } => {
            let start = state.position;
            let mut state = state;
            state.captures[*index] = None;
            clear_captures(inner, &mut state.captures);
            let mut results = Vec::new();
            for mut candidate in capture_match_ends(inner, subject, state, mode)? {
                candidate.captures[*index] = Some(MatchSpan {
                    start,
                    end: candidate.position,
                });
                push_capture_unique(&mut results, candidate)?;
            }
            Ok(results)
        }
        Expression::NonCapturingGroup(inner) => capture_match_ends(inner, subject, state, mode),
        Expression::BackReference(index) => {
            let Some(span) = state.captures[*index] else {
                return Ok(Vec::new());
            };
            let length = span.end - span.start;
            if state.position + length > subject.len() {
                return Ok(Vec::new());
            }
            for offset in 0..length {
                if !equal_char(
                    subject[span.start + offset],
                    subject[state.position + offset],
                    mode.case_sensitive,
                ) {
                    return Ok(Vec::new());
                }
            }
            Ok(vec![CaptureState {
                position: state.position + length,
                captures: state.captures,
            }])
        }
        Expression::Concatenation(parts) => {
            let mut states = vec![state];
            for part in parts {
                states = capture_advance(part, subject, states, mode)?;
                if states.is_empty() {
                    break;
                }
            }
            Ok(states)
        }
        Expression::Alternation(branches) => {
            let mut results = Vec::new();
            for branch in branches {
                for candidate in capture_match_ends(branch, subject, state.clone(), mode)? {
                    push_capture_unique(&mut results, candidate)?;
                }
            }
            Ok(results)
        }
        Expression::Repeat(inner, repetition, _) => {
            capture_repeat(inner, repetition, subject, state, mode)
        }
        _ => Ok(match_ends(expression, subject, state.position, mode)
            .into_iter()
            .map(|position| CaptureState {
                position,
                captures: state.captures.clone(),
            })
            .collect()),
    }
}

fn first_capture_match(
    expression: &Expression,
    subject: &[char],
    from: usize,
    mode: MatchMode,
    preference: MatchPreference,
    capture_count: usize,
) -> Result<Option<MatchSpan>, ()> {
    for start in from..=subject.len() {
        let state = CaptureState {
            position: start,
            captures: vec![None; capture_count + 1],
        };
        let states = capture_match_ends(expression, subject, state, mode)?;
        let ends = states.into_iter().map(|state| state.position);
        let end = if preference == MatchPreference::Shortest {
            ends.min()
        } else {
            ends.max()
        };
        if let Some(end) = end {
            return Ok(Some(MatchSpan { start, end }));
        }
    }
    Ok(None)
}

impl Program {
    pub fn find(&self, subject: &str, from: usize) -> MatchOutcome {
        let characters: Vec<char> = subject.chars().collect();
        if characters.len() > MAX_SUBJECT_SCALARS
            || (self.has_lookbehind && characters.len() > MAX_LOOKBEHIND_SUBJECT_SCALARS)
        {
            return MatchOutcome::Uncertain;
        }
        let result = if self.has_backreference {
            first_capture_match(
                &self.expression,
                &characters,
                from,
                self.mode,
                self.preference,
                self.capture_count,
            )
        } else {
            Ok(first_match(
                &self.expression,
                &characters,
                from,
                self.mode,
                self.preference,
            ))
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
        if characters.len() > MAX_SUBJECT_SCALARS
            || (self.has_lookbehind && characters.len() > MAX_LOOKBEHIND_SUBJECT_SCALARS)
        {
            return CountOutcome::Uncertain;
        }
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
                )
            } else {
                Ok(first_match(
                    &self.expression,
                    &characters,
                    search_from,
                    self.mode,
                    self.preference,
                ))
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
