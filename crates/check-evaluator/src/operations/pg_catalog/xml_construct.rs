const SQLSTATE_INVALID_XML_PROCESSING_INSTRUCTION: u32 = 3452573;

#[derive(Clone)]
struct XmlConstructorDeclaration {
    version: String,
    has_version: bool,
    standalone: i32,
    body: String,
}

fn xml_constructor_declaration_state(version: String, has_version: bool, standalone: i32, body: String) -> XmlConstructorDeclaration {
    XmlConstructorDeclaration { version: version, has_version: has_version, standalone: standalone, body: body }
}

fn parse_xml_constructor_declaration(input: &str) -> XmlConstructorDeclaration {
    let source = XmlSource { characters: input.chars().collect() };
    let mut version = String::new();
    let mut has_version = false;
    let mut standalone: i32 = -1;
    let mut body = String::new();
    if xml_at(&source, 0, "<?xml") == false {
        body = input.to_owned();
        return xml_constructor_declaration_state(version,has_version,standalone,body);
    };
    if source.characters.len() > 5 && xml_constructor_name_character(source.characters[5]) {
        body = input.to_owned();
        return xml_constructor_declaration_state(version,has_version,standalone,body);
    };
    if source.characters.len() <= 5 || xml_space(source.characters[5]) == false { return xml_constructor_declaration_state(version,has_version,standalone,body); };
    let parsed_version = xml_declaration_value(&source,xml_skip_space(&source,5),"version");
    if parsed_version.valid == false { return xml_constructor_declaration_state(version,has_version,standalone,body); };
    version = xml_source_range(&source,parsed_version.value);
    has_version = true;
    let mut position = parsed_version.next;
    let encoding_start = xml_skip_space(&source,position);
    if xml_at(&source,encoding_start,"encoding") {
        if encoding_start == position { return xml_constructor_declaration_state(version,has_version,standalone,body); };
        let encoding = xml_declaration_value(&source,encoding_start,"encoding");
        if encoding.valid == false { return xml_constructor_declaration_state(version,has_version,standalone,body); };
        position = encoding.next;
    };
    let standalone_start = xml_skip_space(&source,position);
    if xml_at(&source,standalone_start,"standalone") {
        if standalone_start == position { return xml_constructor_declaration_state(version,has_version,standalone,body); };
        let parsed_standalone = xml_declaration_value(&source,standalone_start,"standalone");
        if parsed_standalone.valid == false { return xml_constructor_declaration_state(version,has_version,standalone,body); };
        if xml_span_is(&source,parsed_standalone.value,"yes") { standalone = 1; }
        else if xml_span_is(&source,parsed_standalone.value,"no") { standalone = 0; }
        else { return xml_constructor_declaration_state(version,has_version,standalone,body); };
        position = parsed_standalone.next;
    };
    position = xml_skip_space(&source,position);
    if xml_at(&source,position,"?>") == false { return xml_constructor_declaration_state(version,has_version,standalone,body); };
    position += 2;
    let mut index: usize = 0;
    while index < position {
        if source.characters[index] as i32 > 127 { return xml_constructor_declaration_state(version,has_version,standalone,body); };
        index += 1;
    }
    body = xml_source_range(&source,XmlSpan { start: position, end: source.characters.len() });
    xml_constructor_declaration_state(version,has_version,standalone,body)
}

fn xml_constructor_output(version: &str, has_version: bool, standalone: i32, body: &str) -> XmlValue {
    let mut output = String::new();
    if (has_version && version != "1.0") || standalone != -1 {
        output.push_str("<?xml version=\"");
        if has_version { output.push_str(version); } else { output.push_str("1.0"); };
        output.push('"');
        if standalone == 1 { output.push_str(" standalone=\"yes\""); };
        if standalone == 0 { output.push_str(" standalone=\"no\""); };
        output.push_str("?>");
    };
    output.push_str(body);
    make_xml_value(output.as_str())
}

pub fn xml_concat_begin() -> XmlConcatState {
    XmlConcatState {
        status: CheckOutcome::True, has_value: false,
        version: String::new(), version_consistent: true,
        standalone: 1, body: String::new(),
    }
}

fn xml_concat_status(input: XmlConcatState, status: CheckOutcome) -> XmlConcatState {
    XmlConcatState { status: status, has_value: input.has_value, version: input.version,
        version_consistent: input.version_consistent, standalone: input.standalone, body: input.body }
}

pub fn xml_concat_append(input: XmlConcatState, value: XmlValue) -> XmlConcatState {
    let status = input.status;
    if let CheckOutcome::Error(_error) = status { return input; };
    if let XmlValue::Error(error) = value {
        let failed = CheckOutcome::Error(error);
        return xml_concat_status(input,failed);
    };
    if let XmlValue::Null = value { return input; };
    if input.status == CheckOutcome::Unknown { return input; };
    if let XmlValue::Value(text) = value {
        let declaration = parse_xml_constructor_declaration(text.as_str());
        let mut standalone = input.standalone;
        let mut consistent = input.version_consistent;
        let mut version = input.version;
        let mut body = input.body;
        if declaration.standalone == 0 && standalone == 1 { standalone = 0; };
        if declaration.standalone < 0 { standalone = -1; };
        if declaration.has_version == false { consistent = false; }
        else if input.has_value == false { version = declaration.version; }
        else if version.as_str() != declaration.version.as_str() { consistent = false; };
        body.push_str(declaration.body.as_str());
        return XmlConcatState { status: input.status, has_value: true, version: version,
            version_consistent: consistent, standalone: standalone, body: body };
    };
    xml_concat_status(input,CheckOutcome::Unknown)
}

pub fn xml_concat_finish(input: XmlConcatState) -> XmlValue {
    let status = input.status;
    if let CheckOutcome::Error(error) = status { return XmlValue::Error(error); };
    if input.status == CheckOutcome::Unknown { return XmlValue::Unknown; };
    if input.has_value == false { return XmlValue::Null; };
    xml_constructor_output(input.version.as_str(),input.version_consistent,input.standalone,input.body.as_str())
}

pub fn sql__pg_catalog__xmlconcat2__vnu3(left: XmlValue, right: XmlValue) -> XmlValue {
    if let XmlValue::Error(error) = left { return XmlValue::Error(error); };
    if let XmlValue::Error(error) = right { return XmlValue::Error(error); };
    if let XmlValue::Null = left { return right; };
    if let XmlValue::Null = right { return left; };
    let initial = xml_concat_begin();
    let first = xml_concat_append(initial,left);
    let both = xml_concat_append(first,right);
    xml_concat_finish(both)
}

pub fn xml_root(input: XmlValue, version: TextValue, standalone: i32) -> XmlValue {
    if let XmlValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Error(error) = version { return XmlValue::Error(error); };
    if let XmlValue::Null = input { return XmlValue::Null; };
    let mut supplied = String::new();
    let mut has_version = false;
    let mut known_version = false;
    if let TextValue::Null = version { known_version = true; };
    if let TextValue::Value(value) = version {
        supplied = value;
        has_version = true;
        known_version = true;
    };
    if known_version == false || standalone < 0 || standalone > 3 { return XmlValue::Unknown; };
    if let XmlValue::Value(value) = input {
        let declaration = parse_xml_constructor_declaration(value.as_str());
        let mut selected = declaration.standalone;
        if standalone == 0 { selected = 1; };
        if standalone == 1 { selected = 0; };
        if standalone == 2 { selected = -1; };
        return xml_constructor_output(supplied.as_str(),has_version,selected,declaration.body.as_str());
    };
    XmlValue::Unknown
}

pub fn xml_make_processing_instruction(name: &str, content: TextValue, present: bool, mapped: bool) -> XmlValue {
    let mut target = name.to_owned();
    if mapped == false { target = xml_constructor_name(name); };
    if let TextValue::Error(error) = content { return XmlValue::Error(error); };
    let characters: Vec<char> = target.chars().collect();
    if characters.len() == 3 && (characters[0] == 'x' || characters[0] == 'X')
        && (characters[1] == 'm' || characters[1] == 'M')
        && (characters[2] == 'l' || characters[2] == 'L') {
        return XmlValue::Error(make_sql_error(SQLSTATE_INVALID_XML_PROCESSING_INSTRUCTION));
    };
    let mut output = "<?".to_owned();
    output.push_str(target.as_str());
    if present {
        if let TextValue::Null = content { return XmlValue::Null; };
        if let TextValue::Unknown = content { return XmlValue::Unknown; };
        if let TextValue::Value(value) = content {
            let source = XmlSource { characters: value.as_str().chars().collect() };
            let mut index: usize = 0;
            while index < source.characters.len() {
                if xml_at(&source,index,"?>") { return XmlValue::Error(make_sql_error(SQLSTATE_INVALID_XML_PROCESSING_INSTRUCTION)); };
                index += 1;
            }
            index = 0;
            while index < source.characters.len() && source.characters[index] == ' ' { index += 1; }
            output.push(' ');
            while index < source.characters.len() { output.push(source.characters[index]); index += 1; }
        };
    };
    output.push_str("?>");
    make_xml_value(output.as_str())
}

fn xml_constructor_name_start(character: char) -> bool {
    character == ':' || character == '_' || xml_legacy_base(character) || xml_legacy_ideographic(character)
}

fn xml_constructor_name_character(character: char) -> bool {
    xml_constructor_name_start(character) || character == '-' || character == '.'
        || xml_legacy_digit(character) || xml_legacy_combining(character) || xml_legacy_extender(character)
}

fn xml_constructor_name(input: &str) -> String {
    let characters: Vec<char> = input.chars().collect();
    let hex: Vec<char> = "0123456789ABCDEF".chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < characters.len() {
        let character = characters[index];
        let mut escape = xml_constructor_name_character(character) == false;
        if index == 0 { escape = xml_constructor_name_start(character) == false || character == ':'; };
        if character == '_' && index + 1 < characters.len() && characters[index + 1] == 'x' { escape = true; };
        if escape {
            let code = character as i32;
            let mut divisor: i32 = 1048576;
            while divisor > 4096 && divisor > code { divisor = divisor / 16; }
            output.push_str("_x");
            while divisor > 0 {
                let word = (code / divisor) % 16;
                let digit = usize::try_from(word).unwrap_or(0);
                output.push(hex[digit]);
                divisor = divisor / 16;
            }
            output.push('_');
        } else { output.push(character); };
        index += 1;
    }
    output
}
