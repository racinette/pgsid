/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */

const SIMILAR_ESCAPE_ERROR: u32 = 3452621;
const SQLSTATE_SIMILAR_QUOTES: u32 = 3452556;
const SIMILAR_ALLOCATION_ERROR: u32 = 56966976;

fn similar_pattern_capacity_fits(bytes: i64) -> bool {
    27i64 + 3i64 * bytes <= 1073741823i64
}

fn similar_pattern_value(pattern: TextValue, escape: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = pattern { unresolved_flavor = 1; };
    if let TextValue::NonNull = pattern { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = escape { unresolved_flavor = 1; };
    if let TextValue::NonNull = escape { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = pattern { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = escape { unresolved_flavor = 2; };
    if let TextValue::Error(error) = pattern {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = escape {
        return TextValue::Error(error);
    }
    let mut condition_flavor_21_4: i32 = unresolved_flavor; if let TextValue::Unknown = pattern { if condition_flavor_21_4 < 1 { condition_flavor_21_4 = 1; }; }; if let TextValue::Unimplemented = pattern { condition_flavor_21_4 = 2; }; if let TextValue::Unknown = escape { if condition_flavor_21_4 < 1 { condition_flavor_21_4 = 1; }; }; if let TextValue::Unimplemented = escape { condition_flavor_21_4 = 2; }; if ((pattern == TextValue::Unknown || pattern == TextValue::Unimplemented) || pattern == TextValue::NonNull) || ((escape == TextValue::Unknown || escape == TextValue::Unimplemented) || escape == TextValue::NonNull) {
        return text_unresolved(condition_flavor_21_4);
    }
    if pattern == TextValue::Null || escape == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(pattern_value) = pattern {
        if let TextValue::Value(escape_value) = escape {
            let characters: Vec<char> = pattern_value.chars().collect();
            let escapes: Vec<char> = escape_value.chars().collect();
            if escapes.len() > 1 {
                return TextValue::Error(make_sql_error(SIMILAR_ESCAPE_ERROR));
            }
            if similar_pattern_capacity_fits(text_build_octets(pattern_value.as_str())) == false {
                return TextValue::Error(make_sql_error(SIMILAR_ALLOCATION_ERROR));
            }
            let mut escaping = false;
            let mut escape_character = '\\';
            if escapes.len() == 1 {
                escaping = true;
                escape_character = escapes[0];
            }
            let escape_code: i32 = escape_character as i32;
            let mut output = String::new();
            output.push_str("^(?:");
            let mut after_escape = false;
            let mut quotes: i32 = 0;
            let mut bracket_depth: i32 = 0;
            let mut class_position: i32 = 0;
            let mut index: usize = 0;
            while index < characters.len() {
                let character = characters[index];
                let code: i32 = character as i32;
                if escaping && escape_code > 127 && code > 127 {
                    if after_escape {
                        output.push('\\');
                        output.push(character);
                        after_escape = false;
                    } else if character == escape_character {
                        after_escape = true;
                    } else {
                        output.push(character);
                    };
                } else if after_escape {
                    if character == '"' && bracket_depth < 1 {
                        if quotes == 0 {
                            output.push_str("){1,1}?(");
                        } else if quotes == 1 {
                            output.push_str("){1,1}(?:");
                        } else {
                            return TextValue::Error(make_sql_error(SQLSTATE_SIMILAR_QUOTES));
                        }
                        quotes = quotes + 1;
                    } else {
                        output.push('\\');
                        output.push(character);
                        class_position = 3;
                    }
                    after_escape = false;
                } else if escaping && character == escape_character {
                    after_escape = true;
                } else if bracket_depth > 0 {
                    if character == '\\' {
                        output.push('\\');
                    }
                    output.push(character);
                    if character == ']' && class_position > 2 {
                        bracket_depth = bracket_depth - 1;
                    } else if character == '[' {
                        bracket_depth = bracket_depth + 1;
                        class_position = 3;
                    } else if character == '^' {
                        class_position = class_position + 1;
                    } else {
                        class_position = 3;
                    };
                } else if character == '[' {
                    output.push(character);
                    bracket_depth = 1;
                    class_position = 1;
                } else if character == '%' {
                    output.push_str(".*");
                } else if character == '_' {
                    output.push('.');
                } else if character == '(' {
                    output.push_str("(?:");
                } else if character == '\\'
                    || character == '.'
                    || character == '^'
                    || character == '$'
                {
                    output.push('\\');
                    output.push(character);
                } else {
                    output.push(character);
                }
                index += 1;
            }
            output.push_str(")$");
            return TextValue::Value(output);
        }
    }
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__similar_to_escape__7txt(pattern: TextValue) -> TextValue {
    similar_pattern_value(pattern, make_text_value("\\"))
}

pub fn sql__pg_catalog__similar_to_escape__9vor(
    pattern: TextValue,
    escape: TextValue,
) -> TextValue {
    similar_pattern_value(pattern, escape)
}
