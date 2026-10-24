const SQLSTATE_INVALID_XML_DOCUMENT: u32 = 3452566;
const SQLSTATE_INVALID_XML_CONTENT: u32 = 3452567;
const SQLSTATE_INVALID_XML_COMMENT: u32 = 3452572;
const SQLSTATE_NOT_XML_DOCUMENT: u32 = 3452565;

pub fn xml_from_storage_text(input: TextValue) -> XmlValue {
    if let TextValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Null = input { return XmlValue::Null; };
    if let TextValue::Value(value) = input { return make_xml_value(value.as_str()); };
    XmlValue::Unknown
}

fn xml_text_encoding_available(input: &str, utf8: bool) -> bool {
    if utf8 { return true; };
    let characters: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    while index < characters.len() {
        if characters[index] as i32 > 127 { return false; };
        index += 1;
    }
    true
}

pub fn xml_from_text_context(input: TextValue, mode: i32, utf8: bool) -> XmlValue {
    if let TextValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Null = input { return XmlValue::Null; };
    if let TextValue::Value(value) = input {
        if xml_text_encoding_available(value.as_str(),utf8) == false { return XmlValue::Unknown; };
        if mode == 0 {
            if xml_well_formed(value.as_str(),true) && xml_well_formed(value.as_str(),false) {
                return make_xml_value(value.as_str());
            };
            return XmlValue::Unknown;
        };
        if mode != 1 && mode != 2 { return XmlValue::Unknown; };
        let text = TextValue::Value(value);
        let document = mode == 1;
        return xml_from_text_utf8(text,document);
    };
    XmlValue::Unknown
}

pub fn sql__pg_catalog__xml__8nn5(input: TextValue, mode: i32, utf8: bool) -> XmlValue {
    xml_from_text_context(input,mode,utf8)
}

pub fn xml_is_document_context(input: XmlValue, utf8: bool) -> BoolValue {
    if utf8 { return xml_is_document_utf8(input); };
    let stored = input.clone();
    if let XmlValue::Value(value) = stored {
        if xml_text_encoding_available(value.as_str(),utf8) == false { return BoolValue::Unknown; };
    };
    let rendered = input.clone();
    if let XmlValue::RenderedText(value) = rendered {
        if xml_text_encoding_available(value.as_str(),utf8) == false { return BoolValue::Unknown; };
    };
    xml_is_document_utf8(input)
}

pub fn xml_serialize_context(input: XmlValue, mode: i32, indent: bool, utf8: bool) -> TextValue {
    if let XmlValue::Error(error) = input { return TextValue::Error(error); };
    if let XmlValue::Null = input { return TextValue::Null; };
    if indent { return xml_indent_utf8(input,mode == 1,utf8); };
    if mode == 1 {
        let document = xml_is_document_context(input.clone(),utf8);
        let mut valid = false;
        if let BoolValue::Value(value) = document {
            if value == false { return TextValue::Error(make_sql_error(SQLSTATE_NOT_XML_DOCUMENT)); };
            valid = true;
        };
        if valid == false { return TextValue::Unknown; };
    };
    xml_to_text(input)
}

pub fn sql__pg_catalog__xml_send__uur7(input: XmlValue, client_utf8: bool) -> ByteaValue {
    if let XmlValue::Error(error) = input { return ByteaValue::Error(error); };
    if let XmlValue::Null = input { return ByteaValue::Null; };
    if client_utf8 == false { return ByteaValue::Unknown; };
    xml_to_bytea_utf8(input)
}

pub fn xml_from_text_utf8(input: TextValue, document: bool) -> XmlValue {
    if let TextValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Null = input { return XmlValue::Null; };
    if let TextValue::Value(value) = input {
        if xml_well_formed(value.as_str(), document) == false {
            let mut state = SQLSTATE_INVALID_XML_CONTENT;
            if document { state = SQLSTATE_INVALID_XML_DOCUMENT; };
            return XmlValue::Error(make_sql_error(state));
        };
        return make_xml_value(value.as_str());
    };
    XmlValue::Unknown
}

pub fn xml_to_text(input: XmlValue) -> TextValue {
    if let XmlValue::Error(error) = input { return TextValue::Error(error); };
    if let XmlValue::Null = input { return TextValue::Null; };
    if let XmlValue::Value(value) = input { return TextValue::Value(value); };
    TextValue::Unknown
}

pub fn sql__pg_catalog__text__03xf(input: XmlValue) -> TextValue {
    xml_to_text(input)
}

pub fn xml_to_output_text(input: XmlValue) -> TextValue {
    if let XmlValue::Error(error) = input { return TextValue::Error(error); };
    if let XmlValue::Null = input { return TextValue::Null; };
    if let XmlValue::RenderedText(value) = input { return TextValue::Value(value); };
    if let XmlValue::Value(value) = input {
        let source = XmlSource { characters: value.as_str().chars().collect() };
        let declaration = xml_parse_declaration(&source, 0, false);
        if declaration.valid == false { return TextValue::Value(value); };
        let mut next = declaration.next;
        let mut version = "1.0".to_owned();
        let mut standalone: i32 = -1;
        if next > 0 {
            let begin = xml_skip_space(&source, 5);
            let parsed = xml_declaration_value(&source, begin, "version");
            version = xml_source_range(&source, parsed.value);
            let mut position = xml_skip_space(&source, parsed.next);
            if xml_at(&source, position, "encoding") {
                let encoding = xml_declaration_value(&source, position, "encoding");
                position = xml_skip_space(&source, encoding.next);
            };
            if xml_at(&source, position, "standalone") {
                standalone = 0;
                if declaration.standalone { standalone = 1; };
            };
        };
        let mut output = String::new();
        if version.as_str() != "1.0" || standalone >= 0 {
            output.push_str("<?xml version=\"");
            output.push_str(version.as_str());
            output.push('"');
            if standalone == 1 { output.push_str(" standalone=\"yes\""); };
            if standalone == 0 { output.push_str(" standalone=\"no\""); };
            output.push_str("?>");
        } else if next < source.characters.len() && source.characters[next] == '\n' {
            next += 1;
        };
        while next < source.characters.len() {
            output.push(source.characters[next]);
            next += 1;
        }
        return TextValue::Value(output);
    };
    TextValue::Unknown
}

pub fn xml_to_bytea_utf8(input: XmlValue) -> ByteaValue {
    let output = xml_to_output_text(input);
    if let TextValue::Error(error) = output { return ByteaValue::Error(error); };
    if let TextValue::Null = output { return ByteaValue::Null; };
    if let TextValue::Value(value) = output {
        let characters: Vec<char> = value.as_str().chars().collect();
        let mut bytes = String::new();
        let mut index: usize = 0;
        while index < characters.len() {
            let encoded = bytea_utf8_character(String::new(), characters[index]);
            bytes.push_str(encoded.as_str());
            index += 1;
        }
        return ByteaValue::Value(bytes);
    };
    ByteaValue::Unknown
}

pub fn xml_is_document_utf8(input: XmlValue) -> BoolValue {
    if let XmlValue::Error(error) = input { return BoolValue::Error(error); };
    if let XmlValue::Null = input { return BoolValue::Null; };
    if let XmlValue::Value(value) = input {
        return BoolValue::Value(xml_well_formed(value.as_str(), true));
    };
    if let XmlValue::RenderedText(value) = input {
        if xml_well_formed(value.as_str(), true) == false {
            return BoolValue::Value(false);
        };
        return BoolValue::Unknown;
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__xmltext__a36t(input: TextValue) -> XmlValue {
    if let TextValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Null = input { return XmlValue::Null; };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.as_str().chars().collect();
        let mut output = String::new();
        let mut index: usize = 0;
        while index < characters.len() {
            let character = characters[index];
            if character == '&' { output.push_str("&amp;"); }
            else if character == '<' { output.push_str("&lt;"); }
            else if character == '>' { output.push_str("&gt;"); }
            else if character == '"' { output.push_str("&quot;"); }
            else if character == '\r' { output.push_str("&#13;"); }
            else { output.push(character); };
            index += 1;
        }
        return make_xml_value(output.as_str());
    };
    XmlValue::Unknown
}

pub fn sql__pg_catalog__xmlcomment__8j57(input: TextValue) -> XmlValue {
    if let TextValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Null = input { return XmlValue::Null; };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.as_str().chars().collect();
        let mut index: usize = 0;
        while index < characters.len() {
            if characters[index] == '-' && (index + 1 == characters.len() || characters[index + 1] == '-') {
                return XmlValue::Error(make_sql_error(SQLSTATE_INVALID_XML_COMMENT));
            };
            index += 1;
        }
        let mut output = "<!--".to_owned();
        output.push_str(value.as_str());
        output.push_str("-->");
        return make_xml_value(output.as_str());
    };
    XmlValue::Unknown
}
