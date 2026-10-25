#[derive(Clone, Copy)]
struct TsqueryRenderFrame {
    node: usize,
    priority: i32,
    right_phrase: bool,
    step: i32,
}

pub fn sql__pg_catalog__numnode__7bkv(input: TsqueryValue) -> Int4Value {
    if let TsqueryValue::Error(error) = input { return Int4Value::Error(error); };
    if let TsqueryValue::Null = input { return Int4Value::Null; };
    if let TsqueryValue::Value(value) = input { return make_int4_value(value.nodes.len() as i32); };
    Int4Value::Unknown
}

pub fn tsquery_to_text(input: TsqueryValue) -> TextValue {
    if let TsqueryValue::Error(error) = input { return TextValue::Error(error); };
    if let TsqueryValue::Null = input { return TextValue::Null; };
    if let TsqueryValue::Value(value) = input { return tsquery_render(&value,value.root); };
    TextValue::Unknown
}

fn tsquery_render(value: &TsqueryPayload, root: usize) -> TextValue {
    let mut output = String::new();
    if value.nodes.len() == 0 { return TextValue::Value(output); };
    let mut frames: Vec<TsqueryRenderFrame> = Vec::new();
    frames.push(TsqueryRenderFrame {node:root,priority:0,right_phrase:false,step:0});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let frame = frames[depth];
        let node = value.nodes[frame.node].clone();
        if frame.step == 2 { output.push_str(" )"); }
        else if frame.step == 1 {
            if node.kind == 2 { output.push_str(" & "); }
            else if node.kind == 3 { output.push_str(" | "); }
            else if node.distance == 1 { output.push_str(" <-> "); }
            else {
                output.push_str(" <");
                let distance = text_signed_number(node.distance as i64);
                output.push_str(distance.as_str());
                output.push_str("> ");
            };
        } else if node.kind == 0 {
            output.push('\'');
            let chars: Vec<char> = node.text.chars().collect();
            let mut index: usize = 0;
            while index < chars.len() {
                let ch = chars[index];
                if ch == '\'' || ch == '\\' { output.push(ch); };
                output.push(ch);
                index += 1;
            }
            output.push('\'');
            if node.prefix || node.weight != 0 {
                output.push(':');
                if node.prefix { output.push('*'); };
                if (node.weight / 8 % 2) != 0 { output.push('A'); };
                if (node.weight / 4 % 2) != 0 { output.push('B'); };
                if (node.weight / 2 % 2) != 0 { output.push('C'); };
                if (node.weight / 1 % 2) != 0 { output.push('D'); };
            };
        } else {
            let priority = tsquery_priority(node.kind);
            if priority < frame.priority || (node.kind == 4 && frame.right_phrase) {
                output.push_str("( ");
                let closing = TsqueryRenderFrame {node:frame.node,priority:0,right_phrase:false,step:2};
                if depth < frames.len() { frames[depth] = closing; } else { frames.push(closing); };
                depth += 1;
            };
            if node.kind == 1 { output.push('!'); }
            else {
                let right = TsqueryRenderFrame {node:node.right,priority:priority,right_phrase:node.kind == 4,step:0};
                if depth < frames.len() { frames[depth] = right; } else { frames.push(right); };
                depth += 1;
                let separator = TsqueryRenderFrame {node:frame.node,priority:0,right_phrase:false,step:1};
                if depth < frames.len() { frames[depth] = separator; } else { frames.push(separator); };
                depth += 1;
            };
            let left = TsqueryRenderFrame {node:node.left,priority:priority,right_phrase:false,step:0};
            if depth < frames.len() { frames[depth] = left; } else { frames.push(left); };
            depth += 1;
        };
    }
    TextValue::Value(output)
}

pub fn sql__pg_catalog__querytree__8aj6(input: TsqueryValue) -> TextValue {
    if let TsqueryValue::Error(error) = input { return TextValue::Error(error); };
    if let TsqueryValue::Null = input { return TextValue::Null; };
    if let TsqueryValue::Value(value) = input {
        if value.nodes.len() == 0 { return TextValue::Value(String::new()); };
        let unrestricted = value.nodes.len();
        let original_root = value.root;
        let mut nodes = value.nodes;
        let mut roots: Vec<usize> = Vec::new();
        let mut index: usize = 0;
        while index < nodes.len() {
            let node = nodes[index].clone();
            let mut root = index;
            if node.kind == 1 { root = unrestricted; }
            else if node.kind > 1 {
                let left = roots[node.left];
                let right = roots[node.right];
                if node.kind == 3 && (left == unrestricted || right == unrestricted) { root = unrestricted; }
                else if left == unrestricted { root = right; }
                else if right == unrestricted { root = left; }
                else {
                    nodes[index] = TsqueryNode {kind:node.kind,text:node.text,weight:node.weight,prefix:node.prefix,distance:node.distance,left:left,right:right};
                };
            };
            roots.push(root);
            index += 1;
        }
        let root = roots[original_root];
        if root == unrestricted { return TextValue::Value("T".to_owned()); };
        let rendered = TsqueryPayload {nodes:nodes,root:root,native_bytes:-1};
        return tsquery_render(&rendered,root);
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__tsquerysend__0660(input: TsqueryValue, utf8: bool) -> ByteaValue {
    if let TsqueryValue::Error(error) = input { return ByteaValue::Error(error); };
    if let TsqueryValue::Null = input { return ByteaValue::Null; };
    if let TsqueryValue::Value(value) = input {
        let mut output = String::new();
        let count = value.nodes.len() as i32;
        output = bytea_append_byte(output,count / 16777216 % 256);
        output = bytea_append_byte(output,count / 65536 % 256);
        output = bytea_append_byte(output,count / 256 % 256);
        output = bytea_append_byte(output,count % 256);
        if count == 0 { return ByteaValue::Value(output); };
        let mut stack: Vec<usize> = Vec::new();
        stack.push(value.root);
        let mut depth: usize = 1;
        while depth > 0 {
            depth = depth - 1;
            let node = value.nodes[stack[depth]].clone();
            if node.kind == 0 {
                output = bytea_append_byte(output,1);
                output = bytea_append_byte(output,node.weight);
                let mut prefix: i32 = 0;
                if node.prefix { prefix = 1; };
                output = bytea_append_byte(output,prefix);
                let chars: Vec<char> = node.text.chars().collect();
                let mut index: usize = 0;
                while index < chars.len() {
                    if utf8 == false && (chars[index] as i32) > 127 { return ByteaValue::Unknown; };
                    output = bytea_utf8_character(output,chars[index]);
                    index += 1;
                }
                output = bytea_append_byte(output,0);
            } else {
                output = bytea_append_byte(output,2);
                output = bytea_append_byte(output,node.kind);
                if node.kind == 4 {
                    let mut distance = node.distance;
                    if distance < 0 { distance = distance + 65536; };
                    output = bytea_append_byte(output,distance / 256);
                    output = bytea_append_byte(output,distance % 256);
                };
                if depth < stack.len() { stack[depth] = node.left; } else { stack.push(node.left); };
                depth += 1;
                if node.kind != 1 {
                    if depth < stack.len() { stack[depth] = node.right; } else { stack.push(node.right); };
                    depth += 1;
                };
            };
        }
        return ByteaValue::Value(output);
    };
    ByteaValue::Unknown
}
