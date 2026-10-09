#[derive(Clone, Copy)]
struct XmlDtdItem {
    next: usize,
    valid: bool,
    kind: i32,
    name: XmlSpan,
    value: XmlSpan,
    external: bool,
    unparsed: bool,
}

#[derive(Clone, Copy)]
struct XmlDtdAttribute {
    next: usize,
    valid: bool,
    name: XmlSpan,
    value: XmlSpan,
    tokenized: bool,
    has_default: bool,
}

fn xml_parse_dtd_attribute(source: &XmlSource, start: usize) -> XmlDtdAttribute {
    let empty = XmlSpan {
        start: start,
        end: start,
    };
    let invalid = XmlDtdAttribute {
        next: start,
        valid: false,
        name: empty,
        value: empty,
        tokenized: false,
        has_default: false,
    };
    let name = xml_name(source, start);
    if name.valid == false {
        return invalid;
    }
    let declared_name = XmlSpan {
        start: start,
        end: name.next,
    };
    let mut position = xml_skip_space(source, name.next);
    if position == name.next {
        return invalid;
    }
    let mut tokenized = true;
    if position < source.characters.len() && source.characters[position] == '(' {
        let enumeration = xml_dtd_enumeration(source, position, false);
        if enumeration.valid == false {
            return invalid;
        }
        position = enumeration.next;
    } else {
        let attribute_type = xml_name(source, position);
        if attribute_type.valid == false {
            return invalid;
        }
        let type_name = XmlSpan {
            start: position,
            end: attribute_type.next,
        };
        position = attribute_type.next;
        if xml_span_is(source, type_name, "NOTATION") {
            let spaced = xml_skip_space(source, position);
            if spaced == position {
                return invalid;
            }
            let notation = xml_dtd_enumeration(source, spaced, true);
            if notation.valid == false {
                return invalid;
            }
            position = notation.next;
        } else if xml_span_is(source, type_name, "CDATA") {
            tokenized = false;
        } else if xml_span_is(source, type_name, "ID") == false
            && xml_span_is(source, type_name, "IDREF") == false
            && xml_span_is(source, type_name, "IDREFS") == false
            && xml_span_is(source, type_name, "ENTITY") == false
            && xml_span_is(source, type_name, "ENTITIES") == false
            && xml_span_is(source, type_name, "NMTOKEN") == false
            && xml_span_is(source, type_name, "NMTOKENS") == false
        {
            return invalid;
        };
    };
    let mut spaced = xml_skip_space(source, position);
    if spaced == position {
        return invalid;
    }
    position = spaced;
    let mut value = empty;
    let mut has_default = false;
    if xml_at(source, position, "#REQUIRED") {
        position += 9;
    } else if xml_at(source, position, "#IMPLIED") {
        position += 8;
    } else {
        has_default = true;
        if xml_at(source, position, "#FIXED") {
            position += 6;
            spaced = xml_skip_space(source, position);
            if spaced == position {
                return invalid;
            }
            position = spaced;
        }
        let default_value = xml_dtd_literal(source, position, false);
        if default_value.valid == false {
            return invalid;
        }
        position = default_value.next;
        value = default_value.value;
    };
    XmlDtdAttribute {
        next: position,
        valid: true,
        name: declared_name,
        value: value,
        tokenized: tokenized,
        has_default: has_default,
    }
}

fn xml_dtd_model(source: &XmlSource, start: usize, depth: usize, mixed: bool) -> XmlScan {
    let invalid = XmlScan {
        next: start,
        valid: false,
    };
    if depth > 256 || start >= source.characters.len() || source.characters[start] != '(' {
        return invalid;
    }
    let mut position = xml_skip_space(source, start + 1);
    if mixed && xml_at(source, position, "#PCDATA") {
        position = xml_skip_space(source, position + 7);
        let mut names: usize = 0;
        while position < source.characters.len() && source.characters[position] == '|' {
            let name = xml_name(source, xml_skip_space(source, position + 1));
            if name.valid == false {
                return invalid;
            }
            names += 1;
            position = xml_skip_space(source, name.next);
        }
        if position >= source.characters.len() || source.characters[position] != ')' {
            return invalid;
        }
        position += 1;
        if position < source.characters.len() && source.characters[position] == '*' {
            position += 1;
        } else if names > 0 {
            return invalid;
        };
        return XmlScan {
            next: position,
            valid: true,
        };
    }
    let mut separator = ' ';
    let mut ended = false;
    while ended == false {
        if position < source.characters.len() && source.characters[position] == '(' {
            let group = xml_dtd_model(source, position, depth + 1, false);
            if group.valid == false {
                return invalid;
            }
            position = group.next;
        } else {
            let name = xml_name(source, position);
            if name.valid == false {
                return invalid;
            }
            position = name.next;
            if position < source.characters.len() {
                let quantifier = source.characters[position];
                if quantifier == '?' || quantifier == '*' || quantifier == '+' {
                    position += 1;
                }
            }
        };
        position = xml_skip_space(source, position);
        if position >= source.characters.len() {
            return invalid;
        }
        let character = source.characters[position];
        if character == ')' {
            position += 1;
            ended = true;
        } else if character == ',' || character == '|' {
            if separator != ' ' && separator != character {
                return invalid;
            }
            separator = character;
            position = xml_skip_space(source, position + 1);
        } else {
            return invalid;
        };
    }
    if position < source.characters.len() {
        let quantifier = source.characters[position];
        if quantifier == '?' || quantifier == '*' || quantifier == '+' {
            position += 1;
        }
    }
    XmlScan {
        next: position,
        valid: true,
    }
}

fn xml_public_literal(source: &XmlSource, start: usize) -> XmlQuoted {
    let quoted = xml_parse_quoted(source, start);
    if quoted.valid == false {
        return quoted;
    }
    let mut position = quoted.value.start;
    let mut bytes: i32 = 0;
    while position < quoted.value.end {
        let character = source.characters[position];
        let code = character as i32;
        if (code < 65 || code > 90)
            && (code < 97 || code > 122)
            && (code < 48 || code > 57)
            && character != ' '
            && character != '\r'
            && character != '\n'
            && character != '-'
            && character != '\''
            && character != '('
            && character != ')'
            && character != '+'
            && character != ','
            && character != '.'
            && character != '/'
            && character != ':'
            && character != '='
            && character != '?'
            && character != ';'
            && character != '!'
            && character != '*'
            && character != '#'
            && character != '@'
            && character != '$'
            && character != '_'
            && character != '%'
        {
            return XmlQuoted {
                value: quoted.value,
                next: quoted.next,
                valid: false,
            };
        }
        if bytes >= 49999 {
            return XmlQuoted {
                value: quoted.value,
                next: quoted.next,
                valid: false,
            };
        }
        bytes = bytes + 1;
        if character == '\r'
            && position + 1 < quoted.value.end
            && source.characters[position + 1] == '\n'
        {
            position += 1;
        }
        position += 1;
    }
    quoted
}

fn xml_external_id(source: &XmlSource, start: usize, notation: bool) -> XmlQuoted {
    let empty = XmlSpan {
        start: start,
        end: start,
    };
    let invalid = XmlQuoted {
        value: empty,
        next: start,
        valid: false,
    };
    let mut position = start;
    if xml_at(source, position, "SYSTEM") {
        position += 6;
        let spaced = xml_skip_space(source, position);
        if spaced == position {
            return invalid;
        }
        position = spaced;
    } else if xml_at(source, position, "PUBLIC") {
        position += 6;
        let spaced = xml_skip_space(source, position);
        if spaced == position {
            return invalid;
        }
        let public_id = xml_public_literal(source, spaced);
        if public_id.valid == false {
            return invalid;
        }
        position = xml_skip_space(source, public_id.next);
        if notation
            && (position >= source.characters.len()
                || (source.characters[position] != '\'' && source.characters[position] != '"'))
        {
            return XmlQuoted {
                value: empty,
                next: public_id.next,
                valid: true,
            };
        }
        if position == public_id.next {
            return invalid;
        }
    } else {
        return invalid;
    };
    let system = xml_parse_quoted(source, position);
    if system.valid == false {
        return invalid;
    }
    position = system.value.start;
    let mut bytes: i32 = 0;
    while position < system.value.end {
        if xml_character(source.characters[position]) == false {
            return invalid;
        }
        if bytes >= 49995 {
            return invalid;
        }
        bytes = bytes + xml_character_octets(source.characters[position]);
        if source.characters[position] == '\r'
            && position + 1 < system.value.end
            && source.characters[position + 1] == '\n'
        {
            position += 1;
        }
        position += 1;
    }
    system
}

fn xml_dtd_literal(source: &XmlSource, start: usize, entity: bool) -> XmlQuoted {
    let quoted = xml_parse_quoted(source, start);
    if quoted.valid == false {
        return quoted;
    }
    let invalid = XmlQuoted {
        value: quoted.value,
        next: quoted.next,
        valid: false,
    };
    let mut position = quoted.value.start;
    while position < quoted.value.end {
        let character = source.characters[position];
        if entity == false && (xml_character(character) == false || character == '<') {
            return invalid;
        }
        if entity == false && character == '&' {
            let reference = xml_reference(source, position);
            if reference.valid == false || reference.next > quoted.value.end {
                return invalid;
            }
            position = reference.next;
        } else {
            position += 1;
        };
    }
    quoted
}

fn xml_dtd_enumeration(source: &XmlSource, start: usize, notation: bool) -> XmlScan {
    let invalid = XmlScan {
        next: start,
        valid: false,
    };
    if start >= source.characters.len() || source.characters[start] != '(' {
        return invalid;
    }
    let mut position = xml_skip_space(source, start + 1);
    let mut ended = false;
    while ended == false {
        let begin = position;
        if notation {
            let name = xml_name(source, position);
            if name.valid == false {
                return invalid;
            }
            position = name.next;
        } else {
            while position < source.characters.len()
                && xml_name_character(source.characters[position])
            {
                position += 1;
            }
            if position == begin {
                return invalid;
            }
        };
        position = xml_skip_space(source, position);
        if position >= source.characters.len() {
            return invalid;
        }
        if source.characters[position] == ')' {
            position += 1;
            ended = true;
        } else if source.characters[position] == '|' {
            position = xml_skip_space(source, position + 1);
        } else {
            return invalid;
        };
    }
    XmlScan {
        next: position,
        valid: true,
    }
}

fn xml_parse_dtd_item(source: &XmlSource, start: usize) -> XmlDtdItem {
    let empty = XmlSpan {
        start: start,
        end: start,
    };
    let invalid = XmlDtdItem {
        next: start,
        valid: false,
        kind: 0,
        name: empty,
        value: empty,
        external: false,
        unparsed: false,
    };
    let mut position = start;
    let mut kind: i32 = 0;
    if xml_at(source, position, "<!ELEMENT") {
        position += 9;
        kind = 1;
    } else if xml_at(source, position, "<!ATTLIST") {
        position += 9;
        kind = 2;
    } else if xml_at(source, position, "<!ENTITY") {
        position += 8;
        kind = 3;
    } else if xml_at(source, position, "<!NOTATION") {
        position += 10;
        kind = 5;
    } else {
        return invalid;
    };
    let mut spaced = xml_skip_space(source, position);
    if spaced == position {
        return invalid;
    }
    position = spaced;
    if kind == 3 && position < source.characters.len() && source.characters[position] == '%' {
        kind = 4;
        position += 1;
        spaced = xml_skip_space(source, position);
        if spaced == position {
            return invalid;
        }
        position = spaced;
    }
    let name = xml_name(source, position);
    if name.valid == false {
        return invalid;
    }
    let declared_name = XmlSpan {
        start: position,
        end: name.next,
    };
    position = name.next;
    spaced = xml_skip_space(source, position);
    if kind != 2 && spaced == position {
        return invalid;
    }
    position = spaced;
    let mut value = empty;
    let mut external = false;
    let mut unparsed = false;
    if kind == 1 {
        if xml_at(source, position, "EMPTY") {
            position += 5;
        } else if xml_at(source, position, "ANY") {
            position += 3;
        } else {
            let model = xml_dtd_model(source, position, 0, true);
            if model.valid == false {
                return invalid;
            }
            position = model.next;
        };
    } else if kind == 2 {
        let mut ended = false;
        let mut previous = name.next;
        while ended == false {
            position = xml_skip_space(source, previous);
            if position < source.characters.len() && source.characters[position] == '>' {
                ended = true;
            } else {
                if position == previous {
                    return invalid;
                }
                let attribute = xml_parse_dtd_attribute(source, position);
                if attribute.valid == false {
                    return invalid;
                }
                position = attribute.next;
                previous = position;
            };
        }
    } else if kind == 3 || kind == 4 {
        if position < source.characters.len()
            && (source.characters[position] == '\'' || source.characters[position] == '"')
        {
            let literal = xml_dtd_literal(source, position, true);
            if literal.valid == false {
                return invalid;
            }
            value = literal.value;
            position = literal.next;
        } else {
            external = true;
            let identifier = xml_external_id(source, position, false);
            if identifier.valid == false {
                return invalid;
            }
            value = identifier.value;
            let mut index = value.start;
            while index < value.end {
                if source.characters[index] == '#' {
                    return invalid;
                }
                index += 1;
            }
            position = xml_skip_space(source, identifier.next);
            if kind == 3 && position > identifier.next && xml_at(source, position, "NDATA") {
                unparsed = true;
                position += 5;
                spaced = xml_skip_space(source, position);
                if spaced == position {
                    return invalid;
                }
                let notation = xml_name(source, spaced);
                if notation.valid == false {
                    return invalid;
                }
                position = notation.next;
            }
        };
    } else {
        let identifier = xml_external_id(source, position, true);
        if identifier.valid == false {
            return invalid;
        }
        position = identifier.next;
    };
    position = xml_skip_space(source, position);
    if position >= source.characters.len() || source.characters[position] != '>' {
        return invalid;
    }
    XmlDtdItem {
        next: position + 1,
        valid: true,
        kind: kind,
        name: declared_name,
        value: value,
        external: external,
        unparsed: unparsed,
    }
}
