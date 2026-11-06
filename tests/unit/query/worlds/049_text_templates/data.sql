INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('1,234','9,999',1234,false);
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('EU-17','EU',false);
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES ('order-42','%#"[0-9]+#"','#','42',true,false);
