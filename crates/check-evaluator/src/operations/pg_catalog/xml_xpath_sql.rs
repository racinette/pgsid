const SQLSTATE_XML_NAMESPACE_ARRAY: u32 = 3452544;
const SQLSTATE_XML_NAMESPACE_NULL: u32 = 3452548;
const SQLSTATE_XML_NAMESPACE_REGISTER: u32 = 56966976;
const XPATH_SQL_NULL: i32 = 8;
const XPATH_SQL_INPUT: i32 = 9;
const XPATH_SQL_ENCODING: i32 = 10;
const XPATH_SQL_STORAGE: i32 = 11;
const XPATH_SQL_NAMESPACES: i32 = 12;

#[derive(Clone)]
struct XPathSqlResult { state: i32, present: BoolValue, output: ArrayValue }

fn xpath_sql_unknown(state: i32) -> XPathSqlResult {
    XPathSqlResult { state, present: BoolValue::Unknown, output: ArrayValue::Unknown }
}

fn xpath_sql_error(error: SqlError) -> XPathSqlResult {
    XPathSqlResult { state: XPATH_RESULT_SQL_ERROR, present: BoolValue::Error(error), output: ArrayValue::Error(error) }
}

fn xpath_sql_empty_namespaces() -> ArrayValue {
    let dimensions: Vec<ArrayDimension> = Vec::new(); let elements: Vec<ArrayElement> = Vec::new();
    let payload = ArrayPayload { element_type: "pg_catalog.text".to_owned(), element_kind: 8, dimensions, elements, null_bitmap: BoolValue::Value(false) };
    ArrayValue::Value(payload)
}

pub(crate) fn xpath_sql_array(input: XPathXmlResult) -> ArrayValue {
    if input.state == XPATH_RESULT_SQL_ERROR { return ArrayValue::Error(input.error); };
    if input.state < 0 { return ArrayValue::Error(make_sql_error(SQLSTATE_INVALID_XPATH)); };
    if input.shaped == false { return ArrayValue::Unknown; };
    let mut elements: Vec<ArrayElement> = Vec::new(); let mut index: usize = 0;
    while index < input.values.len() {
        let cell = array_element_from_xml(input.values[index].clone()); elements.push(cell); index += 1;
    }
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    if elements.len() > 0 { dimensions.push(ArrayDimension { lower: 1, length: elements.len() as i32 }); };
    let payload = ArrayPayload { element_type: "pg_catalog.xml".to_owned(), element_kind: 45, dimensions, elements, null_bitmap: BoolValue::Value(false) };
    ArrayValue::Value(payload)
}

pub(crate) fn xpath_sql_execute(expression: TextValue, input: XmlValue, mappings: ArrayValue, utf8: bool, limit: i32, extra: i32, precision_known: bool, serialize: bool) -> XPathSqlResult {
    let powers = xpath_powers_empty();
    xpath_sql_execute_profile(expression,input,mappings,utf8,limit,extra,precision_known,serialize,&powers)
}

pub(crate) fn xpath_sql_execute_profile(expression: TextValue, input: XmlValue, mappings: ArrayValue, utf8: bool, limit: i32, extra: i32, precision_known: bool, serialize: bool, powers: &XPathPowers) -> XPathSqlResult {
    if let TextValue::Error(error) = expression { return xpath_sql_error(error); };
    if let XmlValue::Error(error) = input { return xpath_sql_error(error); };
    if let ArrayValue::Error(error) = mappings { return xpath_sql_error(error); };
    let mut is_null = false;
    if let TextValue::Null = expression { is_null = true; };
    if let XmlValue::Null = input { is_null = true; };
    if let ArrayValue::Null = mappings { is_null = true; };
    if is_null { return XPathSqlResult { state: XPATH_SQL_NULL, present: BoolValue::Null, output: ArrayValue::Null }; };
    let mut path = String::new(); let mut source = String::new(); let mut rendered = false;
    let mut known_path = false; let mut known_input = false;
    if let TextValue::Value(value) = expression { path = value; known_path = true; };
    let stored = input.clone();
    if let XmlValue::Value(value) = stored { source = value; known_input = true; };
    if let XmlValue::RenderedText(value) = input { source = value; known_input = true; rendered = true; };
    if known_path == false || known_input == false { return xpath_sql_unknown(XPATH_SQL_INPUT); };
    if let ArrayValue::Value(mapping) = mappings {
        if mapping.element_type.as_str() != "pg_catalog.text" || mapping.element_kind != 8 { return xpath_sql_unknown(XPATH_SQL_INPUT); };
        if mapping.dimensions.len() != 0 && (mapping.dimensions.len() != 2 || mapping.dimensions[1].length != 2) {
            return xpath_sql_error(make_sql_error(SQLSTATE_XML_NAMESPACE_ARRAY));
        };
        if (mapping.elements.len() as i32)%2 != 0 || (mapping.dimensions.len() == 0 && mapping.elements.len() != 0) { return xpath_sql_unknown(XPATH_SQL_INPUT); };
        if path.as_str() == "" { return xpath_sql_error(make_sql_error(SQLSTATE_INVALID_XPATH)); };
        if utf8 == false { return xpath_sql_unknown(XPATH_SQL_ENCODING); };
        if rendered {
            let characters = XmlSource { characters: source.as_str().chars().collect() };
            let declaration = xml_parse_declaration(&characters,0,false);
            if declaration.valid == false { return xpath_sql_unknown(XPATH_SQL_STORAGE); };
        };
        let content = xml_query_content(source.as_str());
        if xml_query_well_formed(content.as_str()) == false { return xpath_sql_error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
        let document = xpath_document_parse(content.as_str()); let tree = document.tree; let graph = document.graph;
        if graph.ids.valid == false || xml_query_names_valid(&tree) == false { return xpath_sql_error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
        let mut namespaces = xpath_namespaces_empty(); let mut index: usize = 0;
        while index < mapping.elements.len() {
            let prefix = mapping.elements[index].clone(); let uri = mapping.elements[index+1].clone();
            if let ArrayElement::Null = prefix { return xpath_sql_error(make_sql_error(SQLSTATE_XML_NAMESPACE_NULL)); };
            if let ArrayElement::Null = uri { return xpath_sql_error(make_sql_error(SQLSTATE_XML_NAMESPACE_NULL)); };
            let mut name = String::new(); let mut address = String::new(); let mut name_known = false; let mut uri_known = false;
            if let ArrayElement::Text(value) = prefix { name = value; name_known = true; };
            if let ArrayElement::Text(value) = uri { address = value; uri_known = true; };
            if name_known == false || uri_known == false { return xpath_sql_unknown(XPATH_SQL_NAMESPACES); };
            if name.as_str() == "" { return xpath_sql_error(make_sql_error(SQLSTATE_XML_NAMESPACE_REGISTER)); };
            namespaces = xpath_namespaces_push(namespaces,name.as_str(),address.as_str()); index += 2;
        }
        let program = xpath_compile_with_limit(path.as_str(),limit);
        let value = xpath_evaluate(&program,&tree,&graph,&namespaces,powers);
        if value.state < 0 { return xpath_sql_error(make_sql_error(SQLSTATE_INVALID_XPATH)); };
        if value.state != 0 { return xpath_sql_unknown(value.state); };
        let present = xpath_result_exists(&value);
        if serialize == false { return XPathSqlResult { state: 0, present, output: ArrayValue::Unknown }; };
        let result = xpath_result_to_xml(value,&tree,&graph,extra,precision_known); let state = result.state;
        let output = xpath_sql_array(result);
        return XPathSqlResult { state, present, output };
    };
    xpath_sql_unknown(XPATH_SQL_INPUT)
}

pub fn sql__pg_catalog__xpath__abvz(expression: TextValue, input: XmlValue, namespaces: ArrayValue, utf8: bool, limit: i32, extra: i32, known: bool, power_words: &str) -> ArrayValue {
    let powers = xpath_power_context(power_words);
    let result = xpath_sql_execute_profile(expression,input,namespaces,utf8,limit,extra,known,true,&powers); result.output
}

pub fn sql__pg_catalog__xpath__nuen(expression: TextValue, input: XmlValue, utf8: bool, limit: i32, extra: i32, known: bool, power_words: &str) -> ArrayValue {
    let namespaces = xpath_sql_empty_namespaces();
    let powers = xpath_power_context(power_words);
    let result = xpath_sql_execute_profile(expression,input,namespaces,utf8,limit,extra,known,true,&powers); result.output
}

pub fn sql__pg_catalog__xpath_exists__1hns(expression: TextValue, input: XmlValue, namespaces: ArrayValue, utf8: bool, limit: i32, extra: i32, known: bool, power_words: &str) -> BoolValue {
    let powers = xpath_power_context(power_words);
    let result = xpath_sql_execute_profile(expression,input,namespaces,utf8,limit,extra,known,false,&powers); result.present
}

pub fn sql__pg_catalog__xpath_exists__s9ul(expression: TextValue, input: XmlValue, utf8: bool, limit: i32, extra: i32, known: bool, power_words: &str) -> BoolValue {
    let namespaces = xpath_sql_empty_namespaces();
    let powers = xpath_power_context(power_words);
    let result = xpath_sql_execute_profile(expression,input,namespaces,utf8,limit,extra,known,false,&powers); result.present
}

pub fn sql__pg_catalog__xmlexists__3gat(expression: TextValue, input: XmlValue, utf8: bool, limit: i32, extra: i32, known: bool, power_words: &str) -> BoolValue {
    sql__pg_catalog__xpath_exists__s9ul(expression,input,utf8,limit,extra,known,power_words)
}
