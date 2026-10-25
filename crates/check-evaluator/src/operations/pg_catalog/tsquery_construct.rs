fn tsquery_rebuild(input: TsqueryPayload) -> TsqueryValue {
    let bytes = tsquery_canonical_bytes(&input);
    if bytes < 0 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
    let mut stack: Vec<usize> = Vec::new();
    stack.push(input.root);
    let mut depth: usize = 1;
    let mut pool: i32 = 0;
    while depth > 0 {
        depth = depth - 1;
        let node = input.nodes[stack[depth]].clone();
        if node.kind == 0 {
            if pool > 1048575 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
            pool = pool + tsvector_lexeme_bytes(node.text.as_str()) + 1;
        } else {
            if depth < stack.len() { stack[depth] = node.left; } else { stack.push(node.left); };
            depth += 1;
            if node.kind != 1 {
                if depth < stack.len() { stack[depth] = node.right; } else { stack.push(node.right); };
                depth += 1;
            };
        };
    }
    make_tsquery_value(TsqueryPayload {nodes:input.nodes,root:input.root,native_bytes:bytes})
}

fn tsquery_join(left: TsqueryValue, right: TsqueryValue, distance: Int4Value, kind: i32) -> TsqueryValue {
    if let TsqueryValue::Error(error) = left { return TsqueryValue::Error(error); };
    if let TsqueryValue::Error(error) = right { return TsqueryValue::Error(error); };
    if let Int4Value::Error(error) = distance { return TsqueryValue::Error(error); };
    if let TsqueryValue::Unknown = left { return TsqueryValue::Unknown; };
    if let TsqueryValue::Unknown = right { return TsqueryValue::Unknown; };
    if distance == Int4Value::Unknown { return TsqueryValue::Unknown; };
    if let TsqueryValue::Null = left { return TsqueryValue::Null; };
    if let TsqueryValue::Null = right { return TsqueryValue::Null; };
    if distance == Int4Value::Null { return TsqueryValue::Null; };
    if let TsqueryValue::Value(a) = left {
        if let TsqueryValue::Value(b) = right {
            if let Int4Value::Value(space) = distance {
                if kind == 4 && (space < 0 || space > 16384) { return TsqueryValue::Error(make_sql_error(TSQUERY_INVALID_PARAMETER)); };
                if a.nodes.len() == 0 { return TsqueryValue::Value(b); };
                if b.nodes.len() == 0 { return TsqueryValue::Value(a); };
                if a.nodes.len() + b.nodes.len() > 89478483 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
                let offset = a.nodes.len();
                let left_root = a.root;
                let right_root = offset + b.root;
                let mut nodes = a.nodes;
                let mut index: usize = 0;
                while index < b.nodes.len() {
                    let node = b.nodes[index].clone();
                    let mut l: usize = 0;
                    let mut r: usize = 0;
                    if node.kind != 0 { l = node.left + offset; };
                    if node.kind > 1 { r = node.right + offset; };
                    nodes.push(TsqueryNode {kind:node.kind,text:node.text,weight:node.weight,prefix:node.prefix,distance:node.distance,left:l,right:r});
                    index += 1;
                }
                let root = nodes.len();
                let mut phrase: i32 = 0;
                if kind == 4 { phrase = space; };
                nodes.push(TsqueryNode {kind:kind,text:String::new(),weight:0,prefix:false,distance:phrase,left:left_root,right:right_root});
                return tsquery_rebuild(TsqueryPayload {nodes:nodes,root:root,native_bytes:-1});
            };
        };
    };
    TsqueryValue::Unknown
}

pub fn sql__pg_catalog__tsquery_and__zwff(a: TsqueryValue,b: TsqueryValue)->TsqueryValue { tsquery_join(a,b,make_int4_value(0),2) }
pub fn sql__pg_catalog__tsquery_or__le7y(a: TsqueryValue,b: TsqueryValue)->TsqueryValue { tsquery_join(a,b,make_int4_value(0),3) }
pub fn sql__pg_catalog__tsquery_phrase__gq2o(a: TsqueryValue,b: TsqueryValue)->TsqueryValue { tsquery_join(a,b,make_int4_value(1),4) }
pub fn sql__pg_catalog__tsquery_phrase__u1ck(a: TsqueryValue,b: TsqueryValue,distance: Int4Value)->TsqueryValue { tsquery_join(a,b,distance,4) }
pub fn sql__pg_catalog__tsquery_not__5zwa(input: TsqueryValue)->TsqueryValue {
    if let TsqueryValue::Value(value) = input {
        if value.nodes.len() == 0 { return TsqueryValue::Value(value); };
        if value.nodes.len() > 89478483 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
        let left = value.root;
        let mut nodes = value.nodes;
        let root = nodes.len();
        nodes.push(TsqueryNode {kind:1,text:String::new(),weight:0,prefix:false,distance:0,left:left,right:0});
        return tsquery_rebuild(TsqueryPayload {nodes:nodes,root:root,native_bytes:-1});
    };
    input
}
