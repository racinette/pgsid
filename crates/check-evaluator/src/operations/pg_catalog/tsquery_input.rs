const TSQUERY_SYNTAX_ERROR: u32 = 6819553;
const TSQUERY_PROGRAM_LIMIT: u32 = 8584704;
const TSQUERY_INVALID_PARAMETER: u32 = 3452619;
const TSQUERY_STACK_ERROR: u32 = 56966976;

#[derive(Clone, Copy)]
struct TsqueryOperator { kind: i32, distance: i32 }

#[derive(Clone)]
struct TsqueryBuild {
    nodes: Vec<TsqueryNode>,
    roots: Vec<usize>,
    depth: usize,
    valid: bool,
}

#[derive(Clone)]
struct TsqueryText { chars: Vec<char> }

#[derive(Clone)]
struct TsqueryToken {
    text: String,
    end: usize,
    weight: i32,
    prefix: bool,
    state: i32,
}

fn tsquery_priority(kind: i32) -> i32 {
    if kind == 1 { return 4; };
    if kind == 2 { return 2; };
    if kind == 3 { return 1; };
    if kind == 4 { return 3; };
    0
}

fn tsquery_delimiter(value: char) -> bool {
    value == '!' || value == '&' || value == '|' || value == '(' || value == ')' || value == '<'
}

fn tsquery_read_token(input: &TsqueryText, start: usize, utf8: bool) -> TsqueryToken {
    let mut index = start;
    let mut text = String::new();
    let mut state: i32 = 0;
    let quoted = input.chars[index] == '\'';
    if quoted { index += 1; };
    let mut closed = false;
    while index < input.chars.len() {
        let value = input.chars[index];
        if value == '\\' {
            index += 1;
            if index == input.chars.len() { state = 1; break; };
            let escaped = input.chars[index];
            if escaped == '\0' || (utf8 == false && (escaped as i32) > 127) { state = 2; break; };
            text.push(escaped);
            index += 1;
        } else if quoted && value == '\'' {
            if index + 1 < input.chars.len() && input.chars[index + 1] == '\'' { text.push('\''); index += 2; }
            else { closed = true; index += 1; break; };
        } else if quoted == false && (numeric_space(value) || tsquery_delimiter(value) || value == ':') {
            break;
        } else {
            if value == '\0' || (utf8 == false && (value as i32) > 127) { state = 2; break; };
            text.push(value);
            index += 1;
        };
    }
    if state == 0 && ((quoted && closed == false) || text == "") { state = 1; };
    let mut weight: i32 = 0;
    let mut prefix = false;
    if state == 0 && index < input.chars.len() && input.chars[index] == ':' {
        index += 1;
        while index < input.chars.len() {
            let modifier = input.chars[index];
            if modifier == 'A' || modifier == 'a' { if weight / 8 % 2 == 0 { weight = weight + 8; }; }
            else if modifier == 'B' || modifier == 'b' { if weight / 4 % 2 == 0 { weight = weight + 4; }; }
            else if modifier == 'C' || modifier == 'c' { if weight / 2 % 2 == 0 { weight = weight + 2; }; }
            else if modifier == 'D' || modifier == 'd' { if weight / 1 % 2 == 0 { weight = weight + 1; }; }
            else if modifier == '*' { prefix = true; }
            else { break; };
            index += 1;
        }
    };
    if state == 0 && tsvector_lexeme_bytes(text.as_str()) >= 2047 { state = 3; };
    TsqueryToken {text:text,end:index,weight:weight,prefix:prefix,state:state}
}

fn tsquery_reduce(input: TsqueryBuild, operator: TsqueryOperator) -> TsqueryBuild {
    let mut nodes = input.nodes;
    let mut roots = input.roots;
    let mut depth = input.depth;
    let mut arity: usize = 2;
    if operator.kind == 1 { arity = 1; };
    if depth < arity { return TsqueryBuild {nodes:nodes,roots:roots,depth:depth,valid:false}; };
    let left = roots[depth - arity];
    let mut right: usize = 0;
    if arity == 2 { right = roots[depth - 1]; };
    depth = depth - arity;
    let root = nodes.len();
    nodes.push(TsqueryNode {kind:operator.kind,text:String::new(),weight:0,prefix:false,distance:operator.distance,left:left,right:right});
    roots[depth] = root;
    depth += 1;
    TsqueryBuild {nodes:nodes,roots:roots,depth:depth,valid:input.valid}
}

pub fn tsquery_from_text_context(input: TextValue, utf8: bool) -> TsqueryValue {
    if let TextValue::Error(error) = input { return TsqueryValue::Error(error); };
    if input == TextValue::Null { return TsqueryValue::Null; };
    if let TextValue::Value(source) = input {
        let chars: Vec<char> = source.chars().collect();
        let text = TsqueryText {chars:chars};
        let nodes: Vec<TsqueryNode> = Vec::new();
        let roots: Vec<usize> = Vec::new();
        let mut build = TsqueryBuild {nodes:nodes,roots:roots,depth:0,valid:true};
        let mut operators: Vec<TsqueryOperator> = Vec::new();
        let mut floors: Vec<usize> = Vec::new();
        let mut operator_depth: usize = 0;
        let mut paren_depth: usize = 0;
        let mut floor: usize = 0;
        let mut index: usize = 0;
        let mut pool: i32 = 0;
        let mut operand = true;
        while index < text.chars.len() {
            let value = text.chars[index];
            if numeric_space(value) { index += 1; }
            else if operand && value == '(' {
                if paren_depth < floors.len() { floors[paren_depth] = floor; } else { floors.push(floor); };
                paren_depth += 1;
                floor = operator_depth;
                index += 1;
            } else if operand && value != '!' {
                if value == ':' || tsquery_delimiter(value) { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
                let token = tsquery_read_token(&text,index,utf8);
                if token.state == 1 { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
                if token.state == 2 { return TsqueryValue::Unknown; };
                if token.state == 3 || pool >= 1048575 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
                pool = pool + tsvector_lexeme_bytes(token.text.as_str()) + 1;
                index = token.end;
                let mut saved_nodes = build.nodes;
                let mut saved_roots = build.roots;
                let root = saved_nodes.len();
                saved_nodes.push(TsqueryNode {kind:0,text:token.text,weight:token.weight,prefix:token.prefix,distance:0,left:0,right:0});
                if build.depth < saved_roots.len() { saved_roots[build.depth] = root; } else { saved_roots.push(root); };
                build = TsqueryBuild {nodes:saved_nodes,roots:saved_roots,depth:build.depth + 1,valid:build.valid};
                operand = false;
            } else if operand == false && value == ')' {
                if paren_depth == 0 { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
                while operator_depth > floor { operator_depth = operator_depth - 1; build = tsquery_reduce(build,operators[operator_depth]); };
                paren_depth = paren_depth - 1;
                floor = floors[paren_depth];
                index += 1;
            } else {
                let mut kind: i32 = 0;
                let mut distance: i32 = 0;
                if operand && value == '!' { kind = 1; index += 1; }
                else if operand == false && value == '&' { kind = 2; index += 1; }
                else if operand == false && value == '|' { kind = 3; index += 1; }
                else if operand == false && value == '<' {
                    index += 1;
                    if index < text.chars.len() && text.chars[index] == '-' { distance = 1; index += 1; }
                    else {
                        if index == text.chars.len() || (text.chars[index] as i32) < 48 || (text.chars[index] as i32) > 57 { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
                        while index < text.chars.len() && (text.chars[index] as i32) >= 48 && (text.chars[index] as i32) <= 57 {
                            distance = distance * 10 + (text.chars[index] as i32) - 48;
                            if distance > 16384 { return TsqueryValue::Error(make_sql_error(TSQUERY_INVALID_PARAMETER)); };
                            index += 1;
                        }
                    };
                    if index == text.chars.len() || text.chars[index] != '>' { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
                    index += 1;
                    kind = 4;
                } else { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
                let priority = tsquery_priority(kind);
                while operator_depth > floor {
                    let previous = tsquery_priority(operators[operator_depth - 1].kind);
                    if previous < priority || (kind == 1 && previous == priority) { break; };
                    operator_depth = operator_depth - 1;
                    build = tsquery_reduce(build,operators[operator_depth]);
                }
                if operator_depth - floor >= 32 { return TsqueryValue::Error(make_sql_error(TSQUERY_STACK_ERROR)); };
                let operator = TsqueryOperator {kind:kind,distance:distance};
                if operator_depth < operators.len() { operators[operator_depth] = operator; } else { operators.push(operator); };
                operator_depth += 1;
                operand = true;
            };
        }
        if paren_depth != 0 || (operand && (operator_depth != 0 || build.nodes.len() > 0)) { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
        while operator_depth > 0 { operator_depth = operator_depth - 1; build = tsquery_reduce(build,operators[operator_depth]); };
        if build.valid == false || build.depth > 1 { return TsqueryValue::Error(make_sql_error(TSQUERY_SYNTAX_ERROR)); };
        let mut root: usize = 0;
        if build.depth == 1 { root = build.roots[0]; };
        let payload = TsqueryPayload {nodes:build.nodes,root:root,native_bytes:-1};
        let bytes = tsquery_canonical_bytes(&payload);
        if bytes < 0 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
        return make_tsquery_value(TsqueryPayload {nodes:payload.nodes,root:root,native_bytes:bytes});
    };
    TsqueryValue::Unknown
}
