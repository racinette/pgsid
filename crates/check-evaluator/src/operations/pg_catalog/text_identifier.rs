const TEXT_IDENTIFIER_ALLOCATION_ERROR: u32 = 56966976;

fn text_identifier_keyword(input: &str) -> bool {
    let keywords: Vec<char> = "all analyse analyze and any array as asc asymmetric authorization between bigint binary bit boolean both case cast char character check coalesce collate collation column concurrently constraint create cross current_catalog current_date current_role current_schema current_time current_timestamp current_user dec decimal default deferrable desc distinct do else end except exists extract false fetch float for foreign freeze from full grant greatest group grouping having ilike in initially inner inout int integer intersect interval into is isnull join json json_array json_arrayagg json_exists json_object json_objectagg json_query json_scalar json_serialize json_table json_value lateral leading least left like limit localtime localtimestamp merge_action national natural nchar none normalize not notnull null nullif numeric offset on only or order out outer overlaps overlay placing position precision primary real references returning right row select session_user setof similar smallint some substring symmetric system_user table tablesample then time timestamp to trailing treat trim true union unique user using values varchar variadic verbose when where window with xmlattributes xmlconcat xmlelement xmlexists xmlforest xmlnamespaces xmlparse xmlpi xmlroot xmlserialize xmltable".chars().collect();
    let mut word = String::new();
    let mut index: usize = 0;
    while index <= keywords.len() {
        if index == keywords.len() || keywords[index] == ' ' {
            if word.as_str() == input { return true; };
            word = String::new();
        } else { word.push(keywords[index]); };
        index += 1;
    }
    false
}

fn quote_identifier_capacity(bytes: i64, quotes: i64, sql_text: bool) -> bool {
    let mut maximum: i64 = 1073741822i64;
    if sql_text { maximum = 1073741819i64; };
    bytes + quotes + 2i64 <= maximum
}

pub(crate) fn quote_ident_output_context(input: TextValue, quote_all: i32, sql_text: bool) -> TextValue {
    if let TextValue::Error(error) = input { return TextValue::Error(error); };
    if input == TextValue::Null { return TextValue::Null; };
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut safe = characters.len() > 0;
        let mut quotes: i64 = 0i64;
        let mut index: usize = 0;
        while index < characters.len() {
            let character = characters[index];
            let code = character as i32;
            if (code < 97 || code > 122) && character != '_' && (index == 0 || code < 48 || code > 57) { safe = false; };
            if character == '"' { quotes = quotes + 1i64; };
            index += 1;
        }
        if safe && text_identifier_keyword(text.as_str()) { safe = false; };
        if quote_all == 1 { safe = false; };
        if safe {
            if quote_all != 0 {
                let bytes = text_build_octets(text.as_str());
                if quote_identifier_capacity(bytes, 0i64, sql_text) { return TextValue::NonNull; };
                return TextValue::Unknown;
            };
            return TextValue::Value(text);
        };
        let bytes = text_build_octets(text.as_str());
        if quote_identifier_capacity(bytes, quotes, sql_text) == false {
            return TextValue::Error(make_sql_error(TEXT_IDENTIFIER_ALLOCATION_ERROR));
        };
        let mut output = String::new();
        output.push('"');
        index = 0;
        while index < characters.len() {
            let character = characters[index];
            if character == '"' { output.push('"'); };
            output.push(character);
            index += 1;
        }
        output.push('"');
        return TextValue::Value(output);
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__quote_ident__dyzt(input: TextValue) -> TextValue {
    quote_ident_context(input,-1)
}

pub fn quote_ident_context(input: TextValue, quote_all: i32) -> TextValue {
    quote_ident_output_context(input, quote_all, true)
}
