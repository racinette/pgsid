fn xml_query_uri_alpha(character: char) -> bool {
    let code = character as i32;
    (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

fn xml_query_uri_digit(character: char) -> bool {
    let code = character as i32;
    code >= 48 && code <= 57
}

fn xml_query_uri_hex(character: char) -> bool {
    let code = character as i32;
    xml_query_uri_digit(character) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)
}

fn xml_query_uri_step(source: &XmlSource, position: usize, category: i32) -> usize {
    if position >= source.characters.len() { return position; };
    let character = source.characters[position];
    if character == '%' {
        if position+2 < source.characters.len() && xml_query_uri_hex(source.characters[position+1]) && xml_query_uri_hex(source.characters[position+2]) { return position+3; };
        return position;
    };
    let ordinary = xml_query_uri_alpha(character) || xml_query_uri_digit(character)
        || character == '-' || character == '.' || character == '_' || character == '~'
        || character == '!' || character == '$' || character == '&' || character == '\''
        || character == '(' || character == ')' || character == '*' || character == '+'
        || character == ',' || character == ';' || character == '=';
    if ordinary || (category >= 1 && character == ':') || (category >= 2 && character == '@')
        || (category >= 3 && (character == '/' || character == '?'))
        || (category == 4 && (character == '[' || character == ']')) { return position+1; };
    position
}

fn xml_query_uri_run(source: &XmlSource, start: usize, category: i32) -> usize {
    let mut position = start;
    let mut scanning = true;
    while scanning {
        let next = xml_query_uri_step(source,position,category);
        if next == position { scanning = false; } else { position = next; };
    }
    position
}

fn xml_query_uri_authority(source: &XmlSource, start: usize) -> XmlScan {
    let user = xml_query_uri_run(source,start,1);
    let mut position = start;
    if user < source.characters.len() && source.characters[user] == '@' { position = user+1; };
    if position < source.characters.len() && source.characters[position] == '[' {
        position += 1;
        while position < source.characters.len() && source.characters[position] != ']' { position += 1; }
        if position == source.characters.len() { return XmlScan { next: position, valid: false }; };
        position += 1;
    } else {
        position = xml_query_uri_run(source,position,0);
    };
    if position < source.characters.len() && source.characters[position] == ':' {
        position += 1;
        let begin = position;
        let mut port: i32 = 0;
        while position < source.characters.len() && xml_query_uri_digit(source.characters[position]) {
            let digit = source.characters[position] as i32 - 48;
            if port > 214748364 || (port == 214748364 && digit > 7) { return XmlScan { next: position, valid: false }; };
            port = port * 10 + digit; position += 1;
        }
        if position == begin { return XmlScan { next: position, valid: false }; };
    };
    XmlScan { next: position, valid: true }
}

fn xml_query_uri_valid(input: &str) -> bool {
    let source = XmlSource { characters: input.chars().collect() };
    let mut position: usize = 0;
    let mut scheme = false;
    if source.characters.len() > 0 && xml_query_uri_alpha(source.characters[0]) {
        let mut end: usize = 1;
        let mut scanning = true;
        while end < source.characters.len() && scanning {
            let character = source.characters[end];
            if xml_query_uri_alpha(character) || xml_query_uri_digit(character) || character == '+' || character == '-' || character == '.' { end += 1; }
            else { scanning = false; };
        }
        if end < source.characters.len() && source.characters[end] == ':' { position = end+1; scheme = true; };
    };
    let mut authority = false;
    if xml_at(&source,position,"//") {
        let parsed = xml_query_uri_authority(&source,position+2);
        if parsed.valid == false { return false; };
        position = parsed.next; authority = true;
    };
    let mut first = true;
    let mut scanning = true;
    while position < source.characters.len() && scanning {
        let character = source.characters[position];
        if character == '/' { position += 1; first = false; }
        else if authority && first { scanning = false; }
        else if scheme == false && first && character == ':' { return false; }
        else {
            let next = xml_query_uri_step(&source,position,2);
            if next == position { scanning = false; } else { position = next; };
        };
    }
    if position < source.characters.len() && source.characters[position] == '?' { position = xml_query_uri_run(&source,position+1,3); };
    if position < source.characters.len() && source.characters[position] == '#' { position = xml_query_uri_run(&source,position+1,4); };
    position == source.characters.len()
}
