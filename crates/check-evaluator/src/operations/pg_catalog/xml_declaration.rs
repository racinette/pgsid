#[derive(Clone, Copy)]
struct XmlDeclaration {
    next: usize,
    valid: bool,
    standalone: bool,
}

#[derive(Clone, Copy)]
struct XmlQuoted {
    value: XmlSpan,
    next: usize,
    valid: bool,
}

fn xml_parse_quoted(source: &XmlSource, start: usize) -> XmlQuoted {
    let mut position = start;
    let empty = XmlSpan {
        start: start,
        end: start,
    };
    if position >= source.characters.len()
        || (source.characters[position] != '"' && source.characters[position] != '\'')
    {
        return XmlQuoted {
            value: empty,
            next: position,
            valid: false,
        };
    }
    let quote = source.characters[position];
    position += 1;
    let begin = position;
    while position < source.characters.len() && source.characters[position] != quote {
        position += 1;
    }
    XmlQuoted {
        value: XmlSpan {
            start: begin,
            end: position,
        },
        next: position + 1,
        valid: position < source.characters.len(),
    }
}

fn xml_declaration_value(source: &XmlSource, start: usize, keyword: &str) -> XmlQuoted {
    let characters: Vec<char> = keyword.chars().collect();
    let mut position = start;
    let empty = XmlSpan {
        start: start,
        end: start,
    };
    if xml_at(source, position, keyword) == false {
        return XmlQuoted {
            value: empty,
            next: position,
            valid: false,
        };
    }
    position = xml_skip_space(source, position + characters.len());
    if position >= source.characters.len() || source.characters[position] != '=' {
        return XmlQuoted {
            value: empty,
            next: position,
            valid: false,
        };
    }
    xml_parse_quoted(source, xml_skip_space(source, position + 1))
}

fn xml_parse_declaration(source: &XmlSource, start: usize, document: bool) -> XmlDeclaration {
    let absent = XmlDeclaration {
        next: start,
        valid: true,
        standalone: false,
    };
    if xml_at(source, start, "<?xml") == false {
        return absent;
    }
    let mut position = start + 5;
    if position < source.characters.len() && xml_name_character(source.characters[position]) {
        return absent;
    }
    let invalid = XmlDeclaration {
        next: start,
        valid: false,
        standalone: false,
    };
    if position >= source.characters.len() || xml_space(source.characters[position]) == false {
        return invalid;
    }
    position = xml_skip_space(source, position);
    let version = xml_declaration_value(source, position, "version");
    if version.valid == false {
        return invalid;
    }
    if document {
        if version.value.end - version.value.start < 2
            || xml_at(source, version.value.start, "1.") == false
        {
            return invalid;
        }
        let mut digit = version.value.start + 2;
        while digit < version.value.end {
            let code = source.characters[digit] as i32;
            if code < 48 || code > 57 {
                return invalid;
            }
            digit += 1;
        }
    }
    position = version.next;
    let encoding_start = xml_skip_space(source, position);
    if xml_at(source, encoding_start, "encoding") {
        if encoding_start == position {
            return invalid;
        }
        let encoding = xml_declaration_value(source, encoding_start, "encoding");
        if encoding.valid == false {
            return invalid;
        }
        if document {
            if encoding.value.start == encoding.value.end {
                return invalid;
            }
            let first = source.characters[encoding.value.start] as i32;
            if (first < 65 || first > 90) && (first < 97 || first > 122) {
                return invalid;
            }
            let mut index = encoding.value.start + 1;
            while index < encoding.value.end {
                let code = source.characters[index] as i32;
                if (code < 65 || code > 90)
                    && (code < 97 || code > 122)
                    && (code < 48 || code > 57)
                    && code != 45
                    && code != 46
                    && code != 95
                {
                    return invalid;
                }
                index += 1;
            }
        }
        position = encoding.next;
    }
    let standalone_start = xml_skip_space(source, position);
    let mut standalone = false;
    if xml_at(source, standalone_start, "standalone") {
        if standalone_start == position {
            return invalid;
        }
        let declared = xml_declaration_value(source, standalone_start, "standalone");
        if declared.valid == false {
            return invalid;
        }
        if xml_span_is(source, declared.value, "yes") {
            standalone = true;
        } else if xml_span_is(source, declared.value, "no") == false {
            return invalid;
        };
        position = declared.next;
    }
    position = xml_skip_space(source, position);
    if xml_at(source, position, "?>") == false {
        return invalid;
    }
    position += 2;
    let mut index = start;
    while index < position {
        let code = source.characters[index] as i32;
        if code > 127 {
            return invalid;
        }
        index += 1;
    }
    XmlDeclaration {
        next: position,
        valid: true,
        standalone: standalone,
    }
}
