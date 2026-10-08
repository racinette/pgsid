const REGEX_PARAMETER_ERROR: u32 = 3452619;

#[derive(Clone, Copy)]
struct RegexFlagState {
    valid: bool,
    global: bool,
    options: RegexOptions,
}

fn regex_syntax_mode(mode: i32) -> Syntax {
    if mode == 1 {
        return Syntax::Basic;
    }
    if mode == 2 {
        return Syntax::Extended;
    }
    if mode == 3 {
        return Syntax::Literal;
    }
    Syntax::Advanced
}

fn regex_newline_mode(mode: i32) -> NewlineMode {
    if mode == 1 {
        return NewlineMode::Sensitive;
    }
    if mode == 2 {
        return NewlineMode::Stop;
    }
    if mode == 3 {
        return NewlineMode::Anchors;
    }
    NewlineMode::Ordinary
}

fn parse_regex_flags(flags: &str) -> RegexFlagState {
    let characters: Vec<char> = flags.chars().collect();
    let mut syntax: i32 = 0;
    let mut newline: i32 = 0;
    let mut case_sensitive = true;
    let mut expanded = false;
    let mut global = false;
    let mut valid = true;
    let mut index: usize = 0;
    while index < characters.len() {
        let flag = characters[index];
        if flag == 'b' {
            syntax = 1;
        } else if flag == 'e' {
            syntax = 1;
        } else if flag == 'q' {
            syntax = 3;
        } else if flag == 'c' {
            case_sensitive = true;
        } else if flag == 'i' {
            case_sensitive = false;
        } else if flag == 'm' || flag == 'n' {
            newline = 1;
        } else if flag == 'p' {
            newline = 2;
        } else if flag == 'w' {
            newline = 3;
        } else if flag == 's' {
            newline = 0;
        } else if flag == 't' {
            expanded = false;
        } else if flag == 'x' {
            expanded = true;
        } else if flag == 'g' {
            global = true;
        } else {
            valid = false;
        }
        index += 1;
    }
    RegexFlagState {
        valid: valid,
        global: global,
        options: RegexOptions {
            syntax: regex_syntax_mode(syntax),
            case_sensitive: case_sensitive,
            expanded: expanded,
            newline: regex_newline_mode(newline),
        },
    }
}
