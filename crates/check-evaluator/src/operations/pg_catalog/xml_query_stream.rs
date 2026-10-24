const XML_QUERY_BUFFER_LIMIT: i64 = 10000000i64;

#[derive(Clone, Copy)]
struct XmlQueryStream { cursor: i64, base: i64, end: i64, total: i64, valid: bool, slow: bool }

fn xml_query_stream_grow(input: XmlQueryStream, threshold: i64) -> XmlQueryStream {
    if input.end-input.cursor >= threshold { return input; };
    let valid = input.valid && input.cursor-input.base <= XML_QUERY_BUFFER_LIMIT;
    let mut end = input.end+4000i64; if end > input.total { end = input.total; };
    XmlQueryStream { cursor: input.cursor, base: input.base, end, total: input.total, valid, slow: input.slow }
}

fn xml_query_stream_shrink(input: XmlQueryStream) -> XmlQueryStream {
    let mut base = input.base;
    if input.cursor-base > 80i64 { base = input.cursor-80i64; };
    XmlQueryStream { cursor: input.cursor, base, end: input.end, total: input.total, valid: input.valid, slow: input.slow }
}

fn xml_query_stream_range(input: XmlQueryStream, source: &XmlSource, start: usize, end: usize, threshold: i64, mode: i32) -> XmlQueryStream {
    let mut state = input; let mut position = start; let mut cursor = input.cursor;
    let mut read_end = input.end; let mut base = input.base; let mut slow = false; let mut chunk: i64 = 0i64;
    while position < end && state.valid {
        let character = source.characters[position]; let width = xml_character_octets(character) as i64;
        if mode == 1 || mode == 2 {
            let crlf = character == '\r' && position+1 < end && source.characters[position+1] == '\n';
            let complex = character as i32 >= 128 || (character == '\r' && crlf == false);
            if slow == false && (complex || cursor == read_end || (mode == 2 && character == '-')) {
                if cursor-base > 80i64 { base = cursor-80i64; };
            };
            if complex { slow = true; };
        };
        let mut needed = threshold; if slow && (mode == 1 || mode == 2) { needed = 250i64; }; if width > needed { needed = width; };
        if read_end-cursor < needed {
            if cursor-base > XML_QUERY_BUFFER_LIMIT { return XmlQueryStream { cursor, base, end: read_end, total: input.total, valid: false, slow }; };
            read_end = read_end+4000i64; if read_end > input.total { read_end = input.total; };
        };
        cursor = cursor+width; chunk = chunk+width;
        if mode == 1 && slow && chunk >= 300i64 {
            if cursor-base > 80i64 { base = cursor-80i64; }; chunk = 0i64;
        };
        position += 1;
    }
    state = XmlQueryStream { cursor, base, end: read_end, total: input.total, valid: state.valid, slow };
    state
}

fn xml_query_stream_blank(input: XmlQueryStream, source: &XmlSource, start: usize) -> XmlQueryStream {
    let end = xml_skip_space(source,start);
    let mut state = xml_query_stream_range(input,source,start,end,1i64,0);
    if end-start > 4 { state = xml_query_stream_grow(state,250i64); };
    state
}

fn xml_query_stream_tag(input: XmlQueryStream, source: &XmlSource, start: usize, end: usize, closing: bool) -> XmlQueryStream {
    let mut state = xml_query_stream_grow(input,250i64); let mut position = start+1;
    if closing { position += 1; };
    state = xml_query_stream_range(state,source,start,position,1i64,0);
    state = xml_query_stream_grow(state,250i64);
    let name = xml_name(source,position);
    state = xml_query_stream_range(state,source,position,name.next,1i64,0); position = name.next;
    state = xml_query_stream_blank(state,source,position); position = xml_skip_space(source,position);
    if closing { return xml_query_stream_range(state,source,position,end,1i64,0); };
    state = xml_query_stream_grow(state,250i64);
    while position < end && source.characters[position] != '/' && source.characters[position] != '>' && state.valid {
        state = xml_query_stream_grow(state,250i64);
        let attribute = xml_name(source,position);
        state = xml_query_stream_range(state,source,position,attribute.next,1i64,0); position = attribute.next;
        state = xml_query_stream_blank(state,source,position); position = xml_skip_space(source,position);
        state = xml_query_stream_range(state,source,position,position+1,1i64,0); position += 1;
        state = xml_query_stream_blank(state,source,position); position = xml_skip_space(source,position);
        let quote = source.characters[position]; state = xml_query_stream_grow(state,250i64);
        state = xml_query_stream_range(state,source,position,position+1,1i64,0); position += 1;
        let beginning = position;
        while position < end && source.characters[position] != quote { position += 1; }
        state = xml_query_stream_range(state,source,beginning,position+1,10i64,0); position += 1;
        state = xml_query_stream_blank(state,source,position); position = xml_skip_space(source,position);
        state = xml_query_stream_grow(state,250i64);
    }
    xml_query_stream_range(state,source,position,end,1i64,0)
}

fn xml_query_stream_valid(source: &XmlSource) -> bool {
    let mut total: i64 = 0i64; let mut index: usize = 0;
    while index < source.characters.len() { total = total+xml_character_octets(source.characters[index]) as i64; index += 1; }
    if total <= XML_QUERY_BUFFER_LIMIT { return true; };
    let mut state = XmlQueryStream { cursor: 0i64, base: 0i64, end: 0i64, total, valid: true, slow: false };
    state = xml_query_stream_grow(state,250i64);
    let mut position: usize = 0; let mut depth: usize = 0; let mut subset = false; let mut pending = false;
    while position < source.characters.len() && state.valid {
        if subset && pending {
            state = xml_query_stream_blank(state,source,position); position = xml_skip_space(source,position);
            state = xml_query_stream_shrink(state); pending = false;
        };
        state = xml_query_stream_grow(state,250i64);
        let mut end = position; let prior_depth = depth;
        if xml_at(source,position,"<!--") {
            let parsed = xml_comment(source,position); end = parsed.next;
            state = xml_query_stream_range(state,source,position,position+4,1i64,0);
            state = xml_query_stream_grow(state,250i64);
            state = xml_query_stream_range(state,source,position+4,end-3,1i64,2);
            if state.slow == false { state = xml_query_stream_shrink(state); state = xml_query_stream_grow(state,250i64); };
            state = xml_query_stream_range(state,source,end-3,end,1i64,0);
            if subset { pending = true; };
        } else if xml_at(source,position,"<?") {
            let parsed = xml_processing_instruction(source,position); end = parsed.next;
            state = xml_query_stream_range(state,source,position,end,250i64,0);
            if subset { pending = true; };
        } else if xml_at(source,position,"<![CDATA[") {
            let parsed = xml_cdata(source,position); end = parsed.next;
            state = xml_query_stream_range(state,source,position,end,250i64,0);
        } else if xml_at(source,position,"<!DOCTYPE") {
            let mut quote = ' '; end = position+9;
            while end < source.characters.len() && (quote != ' ' || (source.characters[end] != '[' && source.characters[end] != '>')) {
                let character = source.characters[end]; if quote != ' ' { if character == quote { quote = ' '; }; } else if character == '\'' || character == '"' { quote = character; };
                end += 1;
            }
            subset = source.characters[end] == '['; end += 1;
            state = xml_query_stream_range(state,source,position,end,1i64,0);
        } else if subset && xml_at(source,position,"]") {
            subset = false; end = position+1; end = xml_skip_space(source,end)+1;
            state = xml_query_stream_range(state,source,position,end,1i64,0);
        } else if subset && source.characters[position] == '%' {
            end = position+1; while source.characters[end] != ';' { end += 1; }; end += 1;
            state = xml_query_stream_range(state,source,position,end,1i64,0); pending = true;
        } else if subset && xml_at(source,position,"<!") {
            let mut cursor = position+2;
            state = xml_query_stream_range(state,source,position,cursor,1i64,0);
            while cursor < source.characters.len() && state.valid && source.characters[cursor] != '>' {
                let character = source.characters[cursor];
                if character == '\'' || character == '"' {
                    state = xml_query_stream_grow(state,250i64);
                    let mut closing = cursor+1; while source.characters[closing] != character { closing += 1; };
                    state = xml_query_stream_range(state,source,cursor,closing+1,10i64,0); cursor = closing+1;
                } else {
                    state = xml_query_stream_range(state,source,cursor,cursor+1,1i64,0); cursor += 1;
                };
            }
            end = cursor+1; state = xml_query_stream_range(state,source,cursor,end,1i64,0);
            state = xml_query_stream_grow(state,250i64); pending = true;
        } else if source.characters[position] == '<' {
            let mut quote = ' '; end = position+1;
            while end < source.characters.len() && (quote != ' ' || source.characters[end] != '>') {
                let character = source.characters[end]; if quote != ' ' { if character == quote { quote = ' '; }; } else if character == '\'' || character == '"' { quote = character; };
                end += 1;
            }
            end += 1; let closing = xml_at(source,position,"</");
            state = xml_query_stream_tag(state,source,position,end,closing);
            if closing { depth = depth-1; } else if source.characters[end-2] != '/' { depth += 1; };
        } else if source.characters[position] == '&' {
            let parsed = xml_reference(source,position); end = parsed.next;
            state = xml_query_stream_range(state,source,position,end,1i64,0);
        } else {
            end = position;
            if depth == 0 {
                while end < source.characters.len() && source.characters[end] != '<' && source.characters[end] != ']' { end += 1; }
                state = xml_query_stream_range(state,source,position,end,1i64,0);
            } else {
                while end < source.characters.len() && source.characters[end] != '<' && source.characters[end] != '&' { end += 1; }
                state = xml_query_stream_range(state,source,position,end,1i64,1);
            };
        };
        if prior_depth > 0 && depth > 0 && subset == false { state = xml_query_stream_shrink(state); };
        position = end;
    }
    state = xml_query_stream_grow(state,250i64);
    state.valid
}
