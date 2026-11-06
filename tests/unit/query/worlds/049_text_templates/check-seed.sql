-- name: AmountWithGrouping
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('1,234','9,999',1234,false);

-- name: AmountWithTrailingMinus
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('42-','99MI',-42,false);

-- name: AmountRomanNumeral
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('XIV','RN',14,false);

-- name: AmountScaledByMultiplier
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('123','99V9',12.3,false);

-- name: AmountMismatch
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('12','99',13,false);

-- name: AmountTruncatedByTemplate
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('99999','999',99999,false);

-- name: AmountNotANumber
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('abc','999',0,false);

-- name: AmountInvalidRoman
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('IIII','RN',4,false);

-- name: AmountScientificTemplate
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('12','9.9EEEE',12,false);

-- name: AmountEmptyTemplate
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('12','',12,false);

-- name: AmountNullText
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES (NULL,'999',1,false);

-- name: AmountBypassed
INSERT INTO parsed_amounts(amount_text,template,expected,bypass) VALUES ('abc','999',0,true);

-- name: CodeWithPrefix
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('EU-17','EU',false);

-- name: CodeWithoutPrefix
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('US-17','EU',false);

-- name: CodeOutsideRegions
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('JP-3','JP',false);

-- name: CodeCaseDiffers
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('eu-17','eu',false);

-- name: CodeNullPrefix
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('EU-1',NULL,false);

-- name: CodeBypassed
INSERT INTO prefixed_codes(code,prefix,bypass) VALUES ('JP-3','EU',true);

-- name: PartExtracted
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES ('order-42','%#"[0-9]+#"','#','42',true,false);

-- name: PartMismatch
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES ('order-42','%#"[a-z]+#"%','#','42',true,false);

-- name: PartInvalidEscape
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES (NULL,'%#"[0-9]+#"','##','42',true,false);

-- name: PartNullPattern
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES ('order-42',NULL,'##','42',true,false);

-- name: UntypedCollationExpectedPresent
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES ('order-42','%#"[0-9]+#"','#','42',false,false);

-- name: PartsBypassed
INSERT INTO extracted_parts(label,pattern,escape_character,expected_part,expect_untyped_null,bypass) VALUES (NULL,'x','##','42',false,true);
