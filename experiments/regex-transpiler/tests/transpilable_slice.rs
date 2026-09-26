#[path = "../regex_engine_transpilable.rs"]
mod candidate;

use serde_json::{json, Value};
use std::collections::BTreeSet;
#[path = "../regex_engine.rs"]
#[allow(dead_code)]
mod engine;

#[test]
fn guarded_work_returns_uncertain_at_the_budget() {
    assert!(matches!(
        candidate::charge_work(1999999, 1),
        candidate::WorkOutcome::Ready(2000000)
    ));
    assert!(matches!(
        candidate::charge_work(2000000, 1),
        candidate::WorkOutcome::Uncertain
    ));
    assert!(matches!(
        candidate::charge_work(2000001, 0),
        candidate::WorkOutcome::Uncertain
    ));
}

#[test]
fn flat_groups_only_remove_capture_delimiters() {
    assert!(candidate::supports_flat_groups("a((b)c)", false));
    for pattern in ["(a|b)c", "(ab)+", "(a)\\1", "(?=a)a", "(ab"] {
        assert!(!candidate::supports_flat_groups(pattern, false));
    }
}

#[test]
fn group_choice_gate_rejects_unsupported_precedence() {
    assert!(candidate::supports_group_choice("a(b|bc)", false));
    for pattern in ["(a|b)+", "((a|b))", "(a|b)\\1", "(?=a|b)c", "a|b(c|d)"] {
        assert!(!candidate::supports_group_choice(pattern, false));
    }
}

#[test]
fn noncapturing_literal_groups_compare_all_branches() {
    for pattern in ["a(?:b)c", "a(?:)b", "a(?:b|b)c", "a(?:b|c|d)n"] {
        assert!(candidate::supports_noncapture_literal(pattern, false));
    }
    assert!(!candidate::supports_noncapture_literal("a(?:(b))c", false));
    assert!(matches!(
        candidate::find_noncapture_literal("a(?:b|bc)c", "abcc", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
}

#[test]
fn optional_group_gate_requires_one_fixed_literal_member() {
    assert!(candidate::supports_optional_group("a(b)?c", false));
    for pattern in ["a([bc])?d", "a(b+)?c", "a(b)?c(d)?e", "a(b)??c"] {
        assert!(!candidate::supports_optional_group(pattern, false));
    }
}

#[test]
fn multiple_optional_literal_groups_search_all_participation_choices() {
    for pattern in ["a(b)?c(d)?e", "(ab)?(cd)?e", "a(b)?(c)?(d)?e"] {
        assert!(candidate::supports_multi_optional_group(pattern, false));
    }
    for pattern in ["a(b)?c", "a(b+)?c(d)?e", "a((b)?)?c(d)?e", "a(b)?c(d)??e"] {
        assert!(!candidate::supports_multi_optional_group(pattern, false));
    }
    for (subject, end) in [("xabcdey", 6), ("xacdey", 5), ("xabcey", 5), ("xacey", 4)] {
        assert!(matches!(
            candidate::find_multi_optional_group("a(b)?c(d)?e", subject, 0, true, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: actual_end })
                if actual_end == end
        ));
    }
    assert!(matches!(
        candidate::find_multi_optional_group("(ab)?(cd)?e", "e", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
}

#[test]
fn fixed_lookbehind_gate_requires_fixed_width_prefix() {
    assert!(candidate::supports_fixed_lookbehind("(?<=ab)c", false));
    for pattern in ["(?<=^a)b", "(?<!^a)b", "(?<=.)b", "(?<=..)b*", "(?<=a|b)c"] {
        assert!(candidate::supports_fixed_lookbehind(pattern, false));
    }
    assert!(candidate::supports_fixed_lookbehind("(?<!\n)b", true));
    assert!(matches!(
        candidate::find_fixed_lookbehind("(?<=^a)b", "ab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
    assert!(matches!(
        candidate::find_fixed_lookbehind("(?<!\n)b", "b", 0, true, true, false, true),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_fixed_lookbehind("(?<=a|a\n)b", "a\nb", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 3 })
    ));
    for pattern in ["(?<=a+)c", "(?<=a\\n)b", "(?=a)b"] {
        assert!(!candidate::supports_fixed_lookbehind(pattern, false));
    }
}

#[test]
fn anchor_or_lookbehind_respects_expanded_whitespace() {
    assert!(candidate::supports_anchor_lookbehind("(^|(?<=\n))b", false));
    assert!(candidate::supports_anchor_lookbehind("(^|(?<=\n))b", true));
    assert!(!candidate::supports_anchor_lookbehind(
        "(^|(?<=a+))b",
        false
    ));
    assert!(matches!(
        candidate::find_anchor_lookbehind("(^|(?<=\n))b", "ab", 0, true, false, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_anchor_lookbehind("(^|(?<=\n))b", "ab", 0, true, false, false, true),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
}

#[test]
fn leading_lookahead_gate_rejects_nested_assertions() {
    assert!(candidate::supports_leading_lookahead("(?=ab)a.", false));
    for pattern in ["(?=(ab))a", "(?=[ab])a", "a(?=b)b", "(?=a\\nb)a"] {
        assert!(!candidate::supports_leading_lookahead(pattern, false));
    }
}

#[test]
fn chained_single_character_assertions_match_with_literal_repetition() {
    for pattern in ["a(?=b)b*(?=c)c*", "(?<=a)b*(?<=b)c*", "(?!a)(?=b)b"] {
        assert!(candidate::supports_chained_assertions(pattern, false));
    }
    for pattern in ["a(?=b)b*", "(?=ab)(?=b)b", "(?=(a))(?=b)b", "(?=b)b+(?=c)c"] {
        assert!(!candidate::supports_chained_assertions(pattern, false));
    }
    assert!(matches!(
        candidate::find_chained_assertions("a(?=b)b*(?=c)c*", "abc", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find_chained_assertions("(?<=a)b*(?<=b)c*", "abc", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
}

#[test]
fn fixed_backref_gate_requires_literal_capture() {
    assert!(candidate::supports_fixed_backref("(a)?b\\1", false));
    assert!(matches!(
        candidate::find_fixed_backref("(a)?b\\1", "zabay", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(candidate::supports_fixed_backref("(ab)c\\1", false));
    for pattern in ["([ab])\\1", "(a+)\\1", "(a)\\2", "(a)|(b)\\1", "(a)*\\1"] {
        assert!(!candidate::supports_fixed_backref(pattern, false));
    }
}

#[test]
fn single_capture_gate_requires_one_atom_and_reference() {
    assert!(candidate::supports_single_capture_backref(
        "([[:digit:]])x\\1",
        false
    ));
    assert!(candidate::supports_single_capture_backref(
        "([ab])\\1",
        false
    ));
    assert!(candidate::supports_single_capture_backref(
        "(\\w)\\1", false
    ));
    assert!(candidate::supports_single_capture_backref(
        "([ab]+)c\\1",
        false
    ));
    assert!(candidate::supports_single_capture_backref(
        "a(b*)c\\1",
        false
    ));
    for pattern in ["([ab]?)\\1", "([ab])\\2", "([ab])", "((a))\\1"] {
        assert!(!candidate::supports_single_capture_backref(pattern, false));
    }
    assert!(matches!(
        candidate::find_single_capture_backref("([ab])\\1", "zaabb", 0, true, true, false, false,),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
    assert!(matches!(
        candidate::find_single_capture_backref("([ab]+)c\\1", "abcab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(matches!(
        candidate::find_single_capture_backref("a(b*)c\\1", "ac", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find_single_capture_backref(
            "([[:digit:]])x\\1",
            "z3x3y",
            0,
            true,
            true,
            false,
            false
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn repeated_class_backreferences_use_the_captured_character() {
    for pattern in [
        "a([bc])\\1*",
        "a([bc])\\1{3,4}",
        "([a-z])\\1+",
        "^([bc])\\1*$",
    ] {
        assert!(candidate::supports_repeated_backref(pattern, false));
    }
    for pattern in [
        "a([bc])\\1",
        "a([bc])\\2*",
        "a([bc]+)\\1*",
        "a([bc])\\1{4,3}",
    ] {
        assert!(!candidate::supports_repeated_backref(pattern, false));
    }
    assert!(matches!(
        candidate::find_repeated_backref("a([bc])\\1*", "abbb", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find_repeated_backref("a([bc])\\1{3,4}", "abbb", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_repeated_backref("^([bc])\\1*$", "bbb", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find_repeated_backref("^([bc])\\1*$", "bcb", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_repeated_backref("^([bc])\\1*$", "x\nbbb\ny", 0, true, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 5 })
    ));
}

#[test]
fn capture_program_reuses_the_first_capture_across_repeated_groups() {
    for pattern in ["^(\\w+)( \\1)+$", "^(.+)( \\1)+$"] {
        assert!(candidate::supports_capture_program(pattern, false));
        assert!(matches!(
            candidate::find_capture_program(pattern, "abc abc abc", 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 11 })
        ));
        assert!(matches!(
            candidate::find_capture_program(pattern, "abc abd abc", 0, true, true, false, false),
            candidate::MatchOutcome::NoMatch
        ));
    }
    for pattern in ["^(\\w+)( \\2)+$", "^(\\w+)( \\1)*$", "^(\\w+)( \\1)+"] {
        assert!(!candidate::supports_capture_program(pattern, false));
    }
    assert!(candidate::supports_capture_program("((.))(\\2)", false));
    assert!(matches!(
        candidate::find_capture_program("((.))(\\2)", "xyy", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
    assert!(candidate::supports_capture_program("a(bc*).*\\1", false));
    assert!(matches!(
        candidate::find_capture_program("a(bc*).*\\1", "abccbccb", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 8 })
    ));
    for pattern in ["a(?:(b))c", "a((?:b))c", "a(?:(?:b))c"] {
        assert!(candidate::supports_capture_program(pattern, false));
        assert!(matches!(
            candidate::find_capture_program(pattern, "xabc", 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
        ));
    }
    assert!(candidate::supports_capture_program("a(?:(b|c))d", false));
    assert!(matches!(
        candidate::find_capture_program("a(?:(b|c))d", "xacd", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(candidate::supports_capture_program("a(b.[bc]*)+", false));
    assert!(matches!(
        candidate::find_capture_program("a(b.[bc]*)+", "abxbcy", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(!candidate::supports_capture_program("a(b.[c-b]*)+", false));
    for pattern in ["a([bc])\\1+", "a([bc])\\1*"] {
        assert!(candidate::supports_capture_program(pattern, false));
        assert!(matches!(
            candidate::find_capture_program(pattern, "abbb", 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
        ));
    }
    assert!(matches!(
        candidate::find_capture_program("a([bc])\\1*", "ab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(candidate::supports_capture_program(
        "(a)(a)(a)(a)\\1",
        false
    ));
    assert!(matches!(
        candidate::find_capture_program("(a)(a)(a)(a)\\1", "aaaaa", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(matches!(
        candidate::find_capture_program("(a)(a)(a)(a)\\1", "aaaa", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    let groups = "(b)".repeat(10);
    for (pattern, subject) in [
        (
            format!("a{groups}\\07c"),
            format!("a{}\u{7}c", "b".repeat(10)),
        ),
        (format!("a{groups}\\10c"), format!("a{}c", "b".repeat(11))),
    ] {
        assert!(candidate::supports_capture_program(&pattern, false));
        assert!(matches!(
            candidate::find_capture_program(&pattern, &subject, 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 13 })
        ));
    }
}

#[test]
fn choice_capture_repeats_the_chosen_literal() {
    assert!(candidate::supports_choice_capture_backref(
        "(a|aa)\\1",
        false
    ));
    assert!(candidate::supports_choice_capture_backref(
        "(a|b)c\\1",
        true
    ));
    for pattern in ["((a|ab))\\2", "((ab|a)b)\\2", "((ab)c)\\2"] {
        assert!(candidate::supports_choice_capture_backref(pattern, false));
    }
    assert!(matches!(
        candidate::find_choice_capture_backref("(a|aa)\\1", "zaaaay", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
    assert!(matches!(
        candidate::find_choice_capture_backref("(a|b)c\\1", "zbcby", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(matches!(
        candidate::find_choice_capture_backref("((a|ab))\\2", "abab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
}

#[test]
fn two_choice_backrefs_compare_all_literal_alternatives() {
    for pattern in ["(a|aa)(a|aa)\\2\\1", "(a|ab)(b|)\\1"] {
        assert!(candidate::supports_two_choice_backref(pattern, false));
    }
    assert!(!candidate::supports_two_choice_backref(
        "(a|ab)(b|)\\2",
        false
    ));
    assert!(matches!(
        candidate::find_two_choice_backref(
            "(a|aa)(a|aa)\\2\\1",
            "aaaaaa",
            0,
            true,
            true,
            false,
            false
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find_two_choice_backref("(a|ab)(b|)\\1", "abbab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
}

#[test]
fn repeated_choice_explores_literal_alternatives() {
    for pattern in [
        "(a|ab)*b",
        "(ab|a)+b",
        "(a|ab){1,2}b",
        "(a|aa){2}\\1",
        "(ab){1,2}\\1",
        "((a|aa)+)\\2",
        "((a|aa){1,2})\\2",
        "(ab|a)+?c",
    ] {
        assert!(candidate::supports_repeated_choice(pattern, false));
    }
    assert!(!candidate::supports_repeated_choice("(a|aa)+?\\1", false));
    assert!(matches!(
        candidate::find_repeated_choice("(a|ab)*b", "zaabb", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
    assert!(matches!(
        candidate::find_repeated_choice("(a|ab){1,2}b", "aabb", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find_repeated_choice("(a|aa){2}\\1", "aaaaaa", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find_repeated_choice("(a|aa){2}\\1", "aaaaa", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find_repeated_choice("(ab){1,2}\\1", "ababab", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find_repeated_choice("((a|aa){1,2})\\2", "aaaaa", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find_repeated_choice("(ab|a)+?c", "ababc", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
}

#[test]
fn invalid_grouping_gate_only_marks_postgres_errors() {
    assert!(candidate::definitely_invalid_grouping("a(b", 'a', false));
    assert!(candidate::definitely_invalid_grouping("a)b", 'a', false));
    assert!(candidate::definitely_invalid_grouping("a[b", 'a', false));
    assert!(candidate::definitely_invalid_grouping("a\\", 'a', false));
    assert!(candidate::definitely_invalid_grouping("a\\(b", 'b', false));
    assert!(!candidate::definitely_invalid_grouping("a\\)b", 'a', false));
    assert!(!candidate::definitely_invalid_grouping("a(b)c", 'a', false));
    assert!(!candidate::definitely_invalid_grouping("a(b", 'l', false));
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_grouping(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 40);
}

#[test]
fn invalid_repeat_gate_only_marks_postgres_errors() {
    for pattern in ["*", "a**", "a*+", "a?*", "(*)", "^*", "$*", "\\A*", "\\y*"] {
        assert!(candidate::definitely_invalid_simple_repeat(
            pattern, 'a', false
        ));
    }
    for pattern in ["\\<*", "\\>*"] {
        assert!(candidate::definitely_invalid_simple_repeat(
            pattern, 'b', false
        ));
    }
    assert!(!candidate::definitely_invalid_simple_repeat(
        "^*", 'b', false
    ));
    assert!(!candidate::definitely_invalid_simple_repeat(
        "(?=a)b", 'a', false
    ));
    assert!(!candidate::definitely_invalid_simple_repeat(
        "***=a*b", 'a', false
    ));
    assert!(!candidate::definitely_invalid_simple_repeat(
        "a+", 'b', false
    ));
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_simple_repeat(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 30);
}

#[test]
fn invalid_bound_gate_only_marks_postgres_errors() {
    for pattern in ["a{1,0}", "a{2,", "a{256}", "a{1,2,3}"] {
        assert!(candidate::definitely_invalid_bound(pattern, 'a', false));
    }
    assert!(candidate::definitely_invalid_bound(
        "a\\{3,1\\}",
        'b',
        false
    ));
    assert!(!candidate::definitely_invalid_bound("a{2,3}", 'a', false));
    assert!(!candidate::definitely_invalid_bound(
        "a\\{2,3\\}",
        'b',
        false
    ));
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_bound(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 30);
}

#[test]
fn invalid_posix_class_gate_only_marks_postgres_errors() {
    assert!(candidate::definitely_invalid_posix_class(
        "[[:unknown:]]",
        'a',
        false
    ));
    assert!(candidate::definitely_invalid_posix_class(
        "[[:woopsie:]]",
        'b',
        false
    ));
    assert!(!candidate::definitely_invalid_posix_class(
        "[[:digit:]]",
        'a',
        false
    ));
    assert!(!candidate::definitely_invalid_posix_class(
        "[[:xdigit:]]",
        'a',
        false
    ));
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_posix_class(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 20);
}

#[test]
fn invalid_bracket_range_gate_only_marks_postgres_errors() {
    for pattern in [
        "a[c-b]",
        "a[a-b-c]",
        "[\\w-~]*",
        "[[:alnum:]-~]*",
        "a[0-[=x=]]",
    ] {
        assert!(candidate::definitely_invalid_bracket_range(
            pattern, 'a', false
        ));
    }
    for pattern in ["a[--?]b", "a[---]b", "a[0-[.9.]]", "a[[.zero.]-9]"] {
        assert!(!candidate::definitely_invalid_bracket_range(
            pattern, 'a', false
        ));
    }
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_bracket_range(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 10);
}

#[test]
fn invalid_bracket_construct_gate_only_marks_postgres_errors() {
    for (pattern, syntax) in [
        ("a[[..]]b", 'a'),
        ("a[[..]]b", 'b'),
        ("a[[==]]b", 'a'),
        ("a[[==]]b", 'b'),
        ("[[:<:]]*", 'a'),
        ("[[:>:]]*", 'a'),
        ("a[\\Z]b", 'a'),
    ] {
        assert!(candidate::definitely_invalid_bracket_construct(
            pattern, syntax, false
        ));
    }
    for pattern in ["a[[.-.]]", "a[[=Y=]]", "[[:<:]]a", "a[\\]]b"] {
        assert!(!candidate::definitely_invalid_bracket_construct(
            pattern, 'a', false
        ));
    }
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_bracket_construct(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 7);
}

#[test]
fn invalid_inline_option_gate_only_marks_postgres_errors() {
    assert!(candidate::definitely_invalid_inline_options("(?z)ab", 'a'));
    assert!(candidate::definitely_invalid_inline_options(
        "(?i)(?q)a+",
        'a'
    ));
    assert!(!candidate::definitely_invalid_inline_options(
        "(?ici)a+", 'a'
    ));
    assert!(!candidate::definitely_invalid_inline_options(
        "(?i)(?=a)a",
        'a'
    ));
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_inline_options(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 2);
}

#[test]
fn all_postgres_named_character_classes_use_their_ascii_ranges() {
    for name in [
        "alnum", "alpha", "ascii", "blank", "cntrl", "digit", "graph", "lower", "print", "punct",
        "space", "upper", "word", "xdigit",
    ] {
        let pattern = format!("[[:{name}:]]+");
        assert!(candidate::supports_simple_advanced(&pattern), "{name}");
    }
    assert!(!candidate::supports_simple_advanced("[[:missing:]]+"));
    assert!(matches!(
        candidate::find_simple_advanced("[[:word:]]+", "x_*", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find_simple_advanced("[[:xdigit:]]+", "xa9Z", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
    assert!(matches!(
        candidate::find_simple_advanced("[[:cntrl:]]+", "x\u{007f}", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
}

#[test]
fn invalid_backreference_gate_only_marks_postgres_errors() {
    assert!(candidate::definitely_invalid_backreference(
        "\\1", 'b', false
    ));
    assert!(candidate::definitely_invalid_backreference(
        "a\\12b", 'b', false
    ));
    assert!(candidate::definitely_invalid_backreference(
        "a(b)c\\2", 'a', false
    ));
    assert!(candidate::definitely_invalid_backreference(
        "a((b)\\1)",
        'a',
        false
    ));
    assert!(candidate::definitely_invalid_backreference(
        "a((((((((((b\\10))))))))))c",
        'a',
        false
    ));
    assert!(candidate::definitely_invalid_backreference(
        "x(\\w)(?=(\\1))",
        'a',
        false
    ));
    assert!(!candidate::definitely_invalid_backreference(
        "(a)\\1", 'a', false
    ));
    assert!(!candidate::definitely_invalid_backreference(
        "(a(b)\\2)",
        'a',
        false
    ));
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_backreference(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 10);
}

#[test]
fn escaped_space_survives_expanded_patterns() {
    assert!(candidate::supports_expanded_advanced("a\\ b"));
    assert!(matches!(
        candidate::find_expanded_advanced("a\\ b", "xa by", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn unmatched_extended_closing_group_is_literal() {
    assert!(candidate::supports_extended_literal_closing_group(
        "ab)", true
    ));
    assert!(candidate::supports_extended_literal_closing_group(
        "ab)", false
    ));
    assert!(matches!(
        candidate::find_extended_literal_closing_group("ab)", "xab)y", 0, true),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn inline_gate_accepts_supported_prefix_flags() {
    for pattern in [
        "(?i)ab", "(?n)^b", "(?x)a b", "(?t)a b", "(?b)a+b", "(?e)a+b", "(?q)a+b",
    ] {
        assert!(candidate::supports_inline_advanced(pattern, false));
    }
    for pattern in ["(?e)\\W+", "a(?i)b", "(?z)ab"] {
        assert!(!candidate::supports_inline_advanced(pattern, false));
    }
    assert!(matches!(
        candidate::find_inline_advanced("(?b)a+b", "xa+by", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(matches!(
        candidate::find_inline_advanced("(?e)a+b", "xaaaby", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
    assert!(matches!(
        candidate::find_inline_advanced("(?q)a+b", "xa+by", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn middle_lookahead_gate_requires_literal_prefix() {
    assert!(candidate::supports_middle_lookahead("a(?=b)b", false));
    for pattern in ["a+(?=b)b", "a(?=[bc])b", "(?=b)b", "a(?=(b))\\1"] {
        assert!(!candidate::supports_middle_lookahead(pattern, false));
    }
    assert!(candidate::supports_middle_lookahead("a(?=((bc)))bc", false));
    assert!(matches!(
        candidate::find_middle_lookahead("a(?=((bc)))bc", "zabc", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn middle_lookbehind_checks_the_character_before_the_assertion() {
    assert!(candidate::supports_middle_lookbehind("a(?<!b)b*", false));
    assert!(!candidate::supports_middle_lookbehind("a(?<!bc)b*", false));
    assert!(matches!(
        candidate::find_middle_lookbehind("a(?<!b)b*", "a", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find_middle_lookbehind("a(?<!a)b*", "ab", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_middle_lookbehind("a(?<=a)b*", "ab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
}

#[test]
fn zero_repetition_of_a_noncapturing_group_consumes_nothing() {
    assert!(candidate::supports_simple_advanced("a(?:[bc]){0}d"));
    assert!(matches!(
        candidate::find_simple_advanced("a(?:[bc]){0}d", "xad", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
    assert!(!candidate::supports_simple_advanced("a(?:[bc){0}d"));
}

#[test]
fn noncapturing_choices_can_include_word_classes() {
    assert!(candidate::supports_noncapture_literal(
        "abc(?:\\w|z)",
        false
    ));
    assert!(matches!(
        candidate::find_noncapture_literal("abc(?:\\w|z)", "!abc8", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
}

#[test]
fn zero_repetition_leaves_captures_unset() {
    assert!(candidate::supports_capture_program("(.){0}(\\1)", false));
    assert!(matches!(
        candidate::find_capture_program("(.){0}(\\1)", "a", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(candidate::supports_capture_program("((.))(\\2){0}", false));
    assert!(matches!(
        candidate::find_capture_program("((.))(\\2){0}", "a", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
}

#[test]
fn starred_capture_backreference_uses_the_last_iteration() {
    assert!(candidate::supports_capture_program("a([bc])*\\1", false));
    assert!(matches!(
        candidate::find_capture_program("a([bc])*\\1", "abc", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_capture_program("a([bc])*\\1", "abb", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn capture_can_contain_a_starred_backreference() {
    assert!(candidate::supports_capture_program("a([bc])(\\1*)", false));
    assert!(matches!(
        candidate::find_capture_program("a([bc])(\\1*)", "ab", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find_capture_program("a([bc])(\\1*)", "abb", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn top_level_choice_keeps_branch_specific_captures() {
    assert!(candidate::supports_capture_program("^(.)\\1|\\1.", false));
    assert!(matches!(
        candidate::find_capture_program("^(.)\\1|\\1.", "ab", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_capture_program("^(.)\\1|\\1.", "aa", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
}

#[test]
fn zero_width_groups_preserve_anchor_and_boundary_logic() {
    assert!(candidate::supports_zero_width_assertions(
        "(^(?!aa)(?!bb))+",
        false
    ));
    assert!(matches!(
        candidate::find_zero_width_assertions("(^(?!aa)(?!bb))+", "aa", 0, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find_zero_width_assertions("(^(?!aa)(?!bb))+", "cc", 0, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 0 })
    ));
    assert!(matches!(
        candidate::find_zero_width_assertions("(\\Y)+", "foo", 0, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 1 })
    ));
    assert!(!candidate::supports_zero_width_assertions("(a*)*", false));
}

#[test]
fn repeated_boundaries_between_literals_do_not_consume_text() {
    assert!(candidate::supports_literal_zero_width_group(
        "abc(\\Y\\Y)+d",
        false
    ));
    assert!(matches!(
        candidate::find_literal_zero_width_group("abc(\\Y\\Y)+d", "abcd", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find_literal_zero_width_group("abc(\\m)+d", "abcd", 0, true, false),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn middle_lookahead_offset_excludes_word_boundaries() {
    assert!(candidate::supports_middle_lookahead("a\\Y(?=45)", false));
    assert!(matches!(
        candidate::find_middle_lookahead("a\\Y(?=45)", "a45", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find_middle_lookahead("a\\Y(?=45)", "a 45", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn chained_lookaheads_share_wildcard_and_word_semantics() {
    assert!(candidate::supports_chained_assertions(
        "a(?=\\w)\\w*(?=.).*",
        false
    ));
    assert!(matches!(
        candidate::find_chained_assertions("a(?=\\w)\\w*(?=.).*", "az3%", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find_chained_assertions("a(?=.).*(?=3)3*", "a\n3", 0, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn unicode_ranges_backtrack_before_numeric_literals() {
    assert!(candidate::supports_unicode_simple(
        "a[\\u1234-\\u25ff]+\\u1236\\u1236x",
        false
    ));
    assert!(matches!(
        candidate::find_unicode_simple(
            "a[\\u1234-\\u25ff]+\\u1236\\u1236x",
            "aሴሶሶx",
            0,
            true,
            false
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(matches!(
        candidate::find_unicode_simple(
            "[[:alnum:]]*[[:upper:]]*[\\u1000-\\u2000]*\\u1237",
            "Aሹ",
            0,
            true,
            false,
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn a_nested_starred_literal_has_the_same_span_as_one_star() {
    assert!(candidate::supports_simple_advanced("(a*)*"));
    assert!(matches!(
        candidate::find_simple_advanced("(a*)*", "aaab", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find_simple_advanced("(a*)*", "bc", 0, true, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 0 })
    ));
}

#[test]
fn group_repetition_gate_requires_fixed_literal_member() {
    assert!(candidate::supports_bounded_group("(ab){1,3}c", false));
    assert!(candidate::supports_bounded_group("a(ab)*c", false));
    assert!(candidate::supports_bounded_group("a(ab)+c", false));
    for pattern in ["(a|b){2}", "(ab){1,}", "(a+){2}", "(ab){17}"] {
        assert!(!candidate::supports_bounded_group(pattern, false));
    }
    assert!(matches!(
        candidate::find_bounded_group("a(b)*c", &"b".repeat(300), 0, true, true, false, false),
        candidate::MatchOutcome::Uncertain
    ));
}

#[test]
fn extended_group_gate_excludes_advanced_escapes() {
    assert!(candidate::supports_extended_group("(a|ab)b", false));
    assert!(candidate::supports_extended_group("a(b)?c", false));
    assert!(!candidate::supports_extended_group("(a|ab)\\w", false));
}

#[test]
fn basic_literal_punctuation_gate_preserves_syntax() {
    assert!(candidate::supports_basic_literal_punctuation("a+b", false));
    for (pattern, subject, end) in [
        ("*", "*", 1),
        ("**", "***", 3),
        ("^*", "*", 1),
        ("x^", "x^", 2),
        ("x$y", "x$y", 3),
        ("^^", "^", 1),
        ("$$", "$", 1),
        ("$^", "$^", 2),
    ] {
        assert!(candidate::supports_basic_literal_punctuation(
            pattern, false
        ));
        assert!(matches!(
            candidate::find_basic_literal_punctuation(
                pattern, subject, 0, true, true, false, false
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: actual }) if actual == end
        ));
    }
    assert!(!candidate::supports_basic_literal_punctuation(
        "a\\+b", false
    ));
    assert!(!candidate::supports_basic_literal_punctuation(
        "[a+b]", false
    ));
}

#[test]
fn numeric_literal_escapes_match_unicode_scalars() {
    for (pattern, subject, end) in [
        ("a\\chb", "a\u{8}b", 3),
        ("a\\cHb", "a\u{8}b", 3),
        ("a\\u0008x", "a\u{8}x", 3),
        ("a\\u00088x", "a\u{8}8x", 4),
        ("a\\U00000008x", "a\u{8}x", 3),
        ("a\\x08x", "a\u{8}x", 3),
        ("a\\010b", "a\u{8}b", 3),
        ("a\\0070b", "a\u{7}0b", 4),
        ("a\\07b", "a\u{7}b", 3),
        ("a\\10b", "a\u{8}b", 3),
        ("a\\12b", "a\nb", 3),
        ("a\\701b", "a81b", 4),
        ("a\\U00001234x", "a\u{1234}x", 3),
        ("a\\U000012345x", "a\u{1234}5x", 4),
    ] {
        assert!(candidate::supports_numeric_literal_escape(pattern, false));
        assert!(matches!(
            candidate::find_numeric_literal_escape(pattern, subject, 0, true, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: actual }) if actual == end
        ));
    }
    for pattern in ["a\\u008x", "a\\U0000008x", "a\\xq", "a\\z"] {
        assert!(!candidate::supports_numeric_literal_escape(pattern, false));
    }
}

#[test]
fn invalid_numeric_escape_gate_only_marks_postgres_errors() {
    for pattern in ["a\\u008x", "a\\U0000008x", "a\\xq", "a\\z", "a\\U0001234x"] {
        assert!(candidate::definitely_invalid_numeric_escape(
            pattern, 'a', false
        ));
    }
    for pattern in ["a\\u0008x", "a\\U00001234x", "a\\x08x", "a\\\\z"] {
        assert!(!candidate::definitely_invalid_numeric_escape(
            pattern, 'a', false
        ));
    }
    let mut identified = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let syntax = input["options"]["syntax"].as_str().unwrap();
            if syntax != "literal"
                && candidate::definitely_invalid_numeric_escape(
                    input["pattern"].as_str().unwrap(),
                    syntax.chars().next().unwrap(),
                    input["options"]["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"]["kind"], "InvalidPattern",
                    "input={input}"
                );
                identified += 1;
            }
        }
    }
    assert!(identified >= 5);
}

#[test]
fn collating_brackets_translate_to_character_classes() {
    for (pattern, subject) in [
        ("a[[.-.]]", "a-"),
        ("a[[.zero.]]", "a0"),
        ("a[[.zero.]-9]", "a2"),
        ("a[0-[.9.]]", "a2"),
    ] {
        assert!(candidate::supports_collating_bracket(pattern, false));
        assert!(matches!(
            candidate::find_collating_bracket(pattern, subject, 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
        ));
    }
    assert!(candidate::supports_collating_bracket("a[[=Y=]]", false));
    assert!(matches!(
        candidate::find_collating_bracket("a[[=Y=]]", "ay", 0, false, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find_collating_bracket("a[[=Y=]]", "ay", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(!candidate::supports_collating_bracket(
        "a[[.missing.]]",
        false
    ));
}

#[test]
fn hyphen_can_start_a_bracket_range() {
    for (pattern, subject) in [("a[--?]b", "a?b"), ("a[---]b", "a-b")] {
        assert!(candidate::supports_simple_advanced(pattern));
        assert!(candidate::supports_basic_compatible(pattern, false));
        assert!(matches!(
            candidate::find_simple_advanced(pattern, subject, 0, true, true, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
        ));
        assert!(matches!(
            candidate::find_basic_compatible(pattern, subject, 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
        ));
    }
    assert!(!candidate::supports_simple_advanced("a[c-b]"));
}

#[test]
fn advanced_brackets_accept_escaped_closing_and_opening_punctuation() {
    for (pattern, subject) in [("a[\\]]b", "a]b"), ("a[\\\\]b", "a\\b"), ("a[[b]c", "a[c")] {
        assert!(candidate::supports_simple_advanced(pattern), "{pattern}");
        assert!(matches!(
            candidate::find_simple_advanced(pattern, subject, 0, true, true, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
        ));
    }
}

#[test]
fn basic_brackets_treat_backslash_as_a_member() {
    for (pattern, subject, start, end) in [
        ("a[\\]]b", "a\\]b", 0, 4),
        ("a[\\\\]b", "a\\b", 0, 3),
        ("a[[b]c", "a[c", 0, 3),
    ] {
        assert!(candidate::supports_basic_special_bracket(pattern, false));
        assert!(matches!(
            candidate::find_basic_special_bracket(pattern, subject, 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: actual_start, end: actual_end })
                if actual_start == start && actual_end == end
        ));
    }
    assert!(matches!(
        candidate::find_basic_special_bracket("a[\\]]b", "a]b", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(!candidate::supports_basic_special_bracket(
        "[[:<:]]a", false
    ));
}

#[test]
fn basic_letter_escapes_can_mix_with_literal_punctuation() {
    assert!(candidate::supports_basic_literal_escaped_letter(
        "(?b)\\w+", false
    ));
    assert!(matches!(
        candidate::find_basic_literal_escaped_letter(
            "(?b)\\w+", "(?b)w+", 0, true, true, false, false
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find_basic_literal_escaped_letter("(?b)\\w+", "", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(!candidate::supports_basic_literal_escaped_letter(
        "a\\12b", false
    ));
}

#[test]
fn basic_repeated_capture_uses_the_captured_phrase() {
    assert!(candidate::supports_basic_repeated_capture(
        "a\\(b*\\)c\\1",
        false
    ));
    assert!(matches!(
        candidate::find_basic_repeated_capture(
            "a\\(b*\\)c\\1",
            "abbcbb",
            0,
            true,
            true,
            false,
            false
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find_basic_repeated_capture(
            "a\\(b*\\)c\\1",
            "abbcb",
            0,
            true,
            true,
            false,
            false
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(!candidate::supports_basic_repeated_capture(
        "a\\(bc\\)d\\1",
        false
    ));
}

#[test]
fn basic_groups_without_backreferences_match_their_contents() {
    for (pattern, subject, expected) in [
        ("\\(a\\)b", "ab", 2),
        ("\\(*\\)", "*", 1),
        ("\\(x$\\)", "x", 1),
    ] {
        assert!(candidate::supports_basic_transparent_group(pattern, false));
        assert!(matches!(
            candidate::find_basic_transparent_group(pattern, subject, 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end }) if end == expected
        ));
    }
    assert!(candidate::supports_basic_transparent_group(
        "\\(^b\\)", false
    ));
    assert!(matches!(
        candidate::find_basic_transparent_group("\\(^b\\)", "^b", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(!candidate::supports_basic_transparent_group(
        "\\(ab\\)*",
        false
    ));
}

#[test]
fn quoted_regex_prefix_matches_literal_text() {
    assert!(candidate::supports_quoted_literal("***=a*b"));
    assert!(matches!(
        candidate::find_quoted_literal("***=a*b", "za*b", 0, true),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(matches!(
        candidate::find_quoted_literal("***=A*B", "za*b", 0, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(!candidate::supports_quoted_literal("***:a*b"));
}

#[test]
fn inline_option_sequences_apply_in_order() {
    for (pattern, subject, start, end) in [
        ("***:(?b)a+b", "a+b", 0, 3),
        ("***:\\w+", "ab", 0, 2),
        ("(?e)\\W+", "WW", 0, 2),
        ("(?m)^b", "a\nb", 2, 3),
        ("(?s)a.b", "a\nb", 0, 3),
        ("(?ici)a+", "Aa", 0, 2),
        ("(?qe)a+", "a", 0, 1),
        ("(?qx)a b", "a b", 0, 3),
        ("(?qi)ab", "Ab", 0, 2),
    ] {
        assert!(candidate::supports_inline_options(pattern, false));
        assert!(matches!(
            candidate::find_inline_options(pattern, subject, 0, true, true, false, false),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: actual_start, end: actual_end })
                if actual_start == start && actual_end == end
        ));
    }
    assert!(matches!(
        candidate::find_inline_options("(?m)a.b", "a\nb", 0, true, true, false, false),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(!candidate::supports_inline_options("(?z)ab", false));
    assert!(!candidate::supports_inline_options("(?i)(?q)a+", false));
}

#[test]
fn bracket_word_boundaries_match_postgres_spelling() {
    assert!(candidate::supports_bracket_word_boundary("[[:<:]]a", false));
    assert!(candidate::supports_bracket_word_boundary("a[[:>:]]", false));
    assert!(!candidate::supports_bracket_word_boundary(
        "[[:<:]]*", false
    ));
    assert!(matches!(
        candidate::find_bracket_word_boundary("[[:<:]]a", " a", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
    assert!(matches!(
        candidate::find_bracket_word_boundary("a[[:>:]]", "a!", 0, true, true, false, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
}

#[test]
fn extended_letter_escapes_are_literal() {
    assert!(candidate::supports_extended_literal_escape("a\\wb", false));
    assert!(!candidate::supports_extended_literal_escape("[\\w]", false));
    assert!(!candidate::supports_extended_literal_escape("a\\1b", false));
}

#[test]
fn basic_letter_escape_gate_excludes_capture_syntax() {
    assert!(candidate::supports_basic_letter_escape("a\\wb", false));
    assert!(!candidate::supports_basic_letter_escape(
        "a\\w\\(b\\)",
        false
    ));
}

#[test]
fn basic_escaped_bound_gate_requires_complete_numeric_bound() {
    assert!(candidate::supports_basic_escaped_bound(
        "a\\{2,3\\}b",
        false
    ));
    for pattern in ["a\\{3,1\\}b", "a\\{2,3", "a{2,3}b", "\\(a\\)\\{2\\}"] {
        assert!(!candidate::supports_basic_escaped_bound(pattern, false));
    }
}

#[test]
fn basic_fixed_backref_gate_requires_literal_capture() {
    assert!(candidate::supports_basic_fixed_backref(
        "\\(ab\\)\\1",
        false
    ));
    for pattern in ["\\([ab]\\)\\1", "\\(a+\\)\\1", "\\(a\\)\\2", "\\(a\\)b"] {
        assert!(!candidate::supports_basic_fixed_backref(pattern, false));
    }
}

#[test]
fn literal_search_matches_the_live_engine() {
    for case_sensitive in [true, false] {
        for pattern in ["", "a", "A", "😀", "aa", "Å", "å", "K", "k", "\n"] {
            let engine::CompileOutcome::Ready(program) = engine::compile(
                pattern,
                engine::Options {
                    syntax: engine::Syntax::Literal,
                    case_sensitive,
                    ..engine::Options::default()
                },
            ) else {
                panic!("literal pattern did not compile");
            };
            for subject in ["", "a", "A", "ba", "😀", "a😀a", "AaA", "Åå", "Kk", "\n"] {
                for from in 0..=subject.chars().count() + 1 {
                    let expected = match program.find(subject, from) {
                        engine::MatchOutcome::Found(span) => (0, span.start, span.end),
                        engine::MatchOutcome::NoMatch => (1, 0, 0),
                        engine::MatchOutcome::Uncertain => (2, 0, 0),
                    };
                    let actual =
                        match candidate::find_literal(pattern, subject, from, case_sensitive) {
                            candidate::MatchOutcome::Found(span) => (0, span.start, span.end),
                            candidate::MatchOutcome::NoMatch => (1, 0, 0),
                            candidate::MatchOutcome::Uncertain => (2, 0, 0),
                        };
                    assert_eq!(
                        actual, expected,
                        "pattern={pattern:?} subject={subject:?} from={from} case_sensitive={case_sensitive}"
                    );
                }
            }
        }
    }
}

#[test]
fn two_capture_backrefs_preserve_empty_participating_groups() {
    for pattern in [
        "(a+)(b+)\\1",
        "(a?)(b)\\1",
        "(a*)(a*)\\2\\1",
        "(a*?)(a+)\\1",
        "(a+?)(a+)\\1",
    ] {
        assert!(candidate::supports_two_capture_backref(pattern, false));
    }
    for pattern in ["(a+)(b+)\\2", "(a|b)(b)\\1", "(a+)(b+)\\1x"] {
        assert!(!candidate::supports_two_capture_backref(pattern, false));
    }
    assert!(matches!(
        candidate::find_two_capture_backref("(a?)(b)\\1", "bb", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find_two_capture_backref("(a*)(a*)\\2\\1", "aaa", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find_two_capture_backref("(a*?)(a+)\\1", "aaaa", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find_two_capture_backref("(a+?)(a+)\\1", "aaaa", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn basic_bounded_group_preserves_last_backreference() {
    assert!(candidate::supports_basic_bounded_backref(
        "\\(ab\\)\\{1,2\\}\\1",
        false
    ));
    assert!(!candidate::supports_basic_bounded_backref(
        "\\(ab\\)\\{1,2\\}\\2",
        false
    ));
    assert!(matches!(
        candidate::find_basic_bounded_backref("\\(ab\\)\\{1,2\\}\\1", "ababab", 0, true, false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
}

#[test]
fn angle_word_escapes_follow_the_selected_syntax() {
    assert!(candidate::supports_angle_word("\\<a", 'b', false));
    assert!(candidate::supports_angle_word("a\\<b", 'a', false));
    assert!(!candidate::supports_angle_word("\\<*", 'b', false));
    assert!(matches!(
        candidate::find_angle_word("a\\<b", "a<b", 0, true, true, false, 'a', false),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find_angle_word("a\\<b", "a<b", 0, true, true, false, 'b', false),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn supported_search_matches_pglite_fixtures() {
    let mut literal = 0;
    let mut quoted_literal = 0;
    let mut insensitive = 0;
    let mut advanced = 0;
    let mut grouped = 0;
    let mut group_choice = 0;
    let mut optional_group = 0;
    let mut multi_optional_group = 0;
    let mut lookbehind = 0;
    let mut lookahead = 0;
    let mut backref = 0;
    let mut single_capture = 0;
    let mut repeated_backref = 0;
    let mut capture_program = 0;
    let mut choice_capture = 0;
    let mut two_capture = 0;
    let mut inline = 0;
    let mut inline_options = 0;
    let mut middle_lookahead = 0;
    let mut chained_assertions = 0;
    let mut bounded_group = 0;
    let mut expanded_advanced = 0;
    let mut extended = 0;
    let mut extended_literal_close = 0;
    let mut repeated_choice = 0;
    let mut extended_group = 0;
    let mut extended_escape = 0;
    let mut numeric_literal = 0;
    let mut basic = 0;
    let mut basic_punctuation = 0;
    let mut basic_escape = 0;
    let mut basic_bound = 0;
    let mut basic_backref = 0;
    let mut bracket_word = 0;
    let mut collating_bracket = 0;
    let mut basic_transparent_group = 0;
    let mut basic_special_bracket = 0;
    let mut basic_literal_escaped_letter = 0;
    let mut basic_repeated_capture = 0;
    let mut invalid_grouping = 0;
    let mut invalid_repeat = 0;
    let mut invalid_bound = 0;
    let mut invalid_posix_class = 0;
    let mut invalid_range = 0;
    let mut invalid_bracket_construct = 0;
    let mut invalid_numeric = 0;
    let mut invalid_backreference = 0;
    let mut dot = 0;
    let mut mixed = 0;
    let mut anchored = 0;
    let mut escaped = 0;
    let mut classes = 0;
    let mut negated_classes = 0;
    let mut range_classes = 0;
    let mut edge_punctuation = 0;
    let mut absolute_anchors = 0;
    let mut positioned = 0;
    let mut newline_modes = BTreeSet::new();
    for (source, required) in [
        (include_str!("../conformance/postgres-fixtures.json"), false),
        (include_str!("../conformance/stress-fixtures.json"), false),
        (
            include_str!("../conformance/targeted-postgres-fixtures.json"),
            true,
        ),
        (
            include_str!("../conformance/stress-position-fixtures.json"),
            false,
        ),
        (
            include_str!("../conformance/stress-boundary-fixtures.json"),
            false,
        ),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        assert_eq!(fixtures["oracle"]["database"], "PostgreSQL via PGlite");
        let mut checked = 0;
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            if fixture["operation"] == "count" {
                continue;
            }
            let input = &fixture["input"];
            let options = &input["options"];
            let pattern = input["pattern"].as_str().unwrap();
            let subject = input["subject"].as_str().unwrap();
            let from = input["start"].as_u64().unwrap_or(1) as usize - 1;
            let syntax = options["syntax"].as_str().unwrap();
            if syntax != "literal"
                && (candidate::definitely_invalid_grouping(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                ) || candidate::definitely_invalid_inline_options(
                    pattern,
                    syntax.chars().next().unwrap(),
                ))
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_grouping += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_simple_repeat(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_repeat += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_bound(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_bound += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_posix_class(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_posix_class += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_bracket_range(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_range += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_bracket_construct(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_bracket_construct += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_numeric_escape(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_numeric += 1;
                checked += 1;
                continue;
            }
            if syntax != "literal"
                && candidate::definitely_invalid_backreference(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                assert_eq!(
                    fixture["expected"],
                    json!({ "kind": "InvalidPattern", "sqlstate": "2201B" }),
                    "input={input}"
                );
                invalid_backreference += 1;
                checked += 1;
                continue;
            }
            let actual = if (options["syntax"] == "advanced" || options["syntax"] == "basic")
                && candidate::supports_quoted_literal(pattern)
            {
                quoted_literal += 1;
                candidate::find_quoted_literal(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "literal"
                && options["expanded"] == false
                && options["newline"] == "ordinary"
            {
                literal += 1;
                let case_sensitive = options["caseSensitive"].as_bool().unwrap();
                if !case_sensitive {
                    insensitive += 1;
                }
                candidate::find_literal(pattern, subject, from, case_sensitive)
            } else if options["syntax"] == "advanced"
                && (options["expanded"] == false && candidate::supports_simple_advanced(pattern)
                    || options["expanded"] == true
                        && candidate::supports_expanded_advanced(pattern))
            {
                advanced += 1;
                let expanded = options["expanded"] == true;
                if expanded {
                    expanded_advanced += 1;
                }
                let newline = options["newline"].as_str().unwrap();
                newline_modes.insert(newline.to_string());
                let crosses_newline = newline == "ordinary" || newline == "anchors";
                let line_anchors = newline == "sensitive" || newline == "anchors";
                let actual = if expanded {
                    candidate::find_expanded_advanced(
                        pattern,
                        subject,
                        from,
                        options["caseSensitive"].as_bool().unwrap(),
                        crosses_newline,
                        line_anchors,
                    )
                } else {
                    candidate::find_simple_advanced(
                        pattern,
                        subject,
                        from,
                        options["caseSensitive"].as_bool().unwrap(),
                        crosses_newline,
                        line_anchors,
                    )
                };
                if pattern == "." && !expanded {
                    dot += 1;
                    assert!(
                        actual == candidate::find_any_character(subject, from, crosses_newline)
                    );
                }
                if pattern != "." && pattern.contains('.') {
                    mixed += 1;
                }
                if pattern.contains('^') || pattern.contains('$') {
                    anchored += 1;
                }
                if pattern.contains('\\') {
                    escaped += 1;
                }
                if pattern.contains('[') {
                    classes += 1;
                }
                if pattern.contains("[^") {
                    negated_classes += 1;
                }
                if pattern.contains('[') && pattern.contains('-') {
                    range_classes += 1;
                }
                if pattern.contains("[-")
                    || pattern.contains("-]")
                    || pattern.contains("[]")
                    || pattern.contains("[^]")
                {
                    edge_punctuation += 1;
                }
                if pattern.contains("\\A") || pattern.contains("\\Z") {
                    absolute_anchors += 1;
                }
                actual
            } else if options["syntax"] == "advanced"
                && candidate::supports_flat_groups(pattern, options["expanded"].as_bool().unwrap())
            {
                grouped += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_flat_groups(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_group_choice(pattern, options["expanded"].as_bool().unwrap())
            {
                group_choice += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_group_choice(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_noncapture_literal(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                grouped += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_noncapture_literal(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_optional_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                optional_group += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_optional_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_multi_optional_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                multi_optional_group += 1;
                candidate::find_multi_optional_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_fixed_lookbehind(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                lookbehind += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_fixed_lookbehind(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_anchor_lookbehind(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                lookbehind += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_anchor_lookbehind(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_leading_lookahead(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                lookahead += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_leading_lookahead(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_fixed_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                backref += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_fixed_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_single_capture_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                single_capture += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_single_capture_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_repeated_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                repeated_backref += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_repeated_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_capture_program(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                capture_program += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_capture_program(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_choice_capture_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                choice_capture += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_choice_capture_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_two_choice_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                choice_capture += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_two_choice_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_two_capture_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                two_capture += 1;
                candidate::find_two_capture_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_inline_advanced(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                inline += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_inline_advanced(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if (options["syntax"] == "advanced"
                || options["syntax"] == "basic" && pattern.starts_with("***:"))
                && candidate::supports_inline_options(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                inline_options += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_inline_options(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_middle_lookahead(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                middle_lookahead += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_middle_lookahead(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_middle_lookbehind(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                lookbehind += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_middle_lookbehind(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_chained_assertions(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                chained_assertions += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_chained_assertions(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_bounded_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                bounded_group += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_bounded_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "extended"
                && candidate::supports_extended_compatible(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                extended += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_extended_compatible(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "extended"
                && candidate::supports_extended_literal_closing_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                extended_literal_close += 1;
                candidate::find_extended_literal_closing_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "extended"
                && candidate::supports_extended_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                extended_group += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_extended_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if (options["syntax"] == "advanced" || options["syntax"] == "extended")
                && candidate::supports_repeated_choice(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                repeated_choice += 1;
                candidate::find_repeated_choice(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "extended"
                && candidate::supports_extended_literal_escape(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                extended_escape += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_extended_literal_escape(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_numeric_literal_escape(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                numeric_literal += 1;
                candidate::find_numeric_literal_escape(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if (options["syntax"] == "advanced" || options["syntax"] == "basic")
                && candidate::supports_collating_bracket(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                collating_bracket += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_collating_bracket(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_transparent_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_transparent_group += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_transparent_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_special_bracket(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_special_bracket += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_special_bracket(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_literal_escaped_letter(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_literal_escaped_letter += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_literal_escaped_letter(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_repeated_capture(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_repeated_capture += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_repeated_capture(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_compatible(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_compatible(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_literal_punctuation(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_punctuation += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_literal_punctuation(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_letter_escape(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_escape += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_letter_escape(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_escaped_bound(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_bound += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_escaped_bound(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_fixed_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_backref += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_basic_fixed_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "basic"
                && candidate::supports_basic_bounded_backref(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                basic_backref += 1;
                candidate::find_basic_bounded_backref(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if (options["syntax"] == "advanced" || options["syntax"] == "basic")
                && candidate::supports_bracket_word_boundary(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                bracket_word += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_bracket_word_boundary(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if (options["syntax"] == "advanced" || options["syntax"] == "basic")
                && candidate::supports_angle_word(
                    pattern,
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            {
                bracket_word += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_angle_word(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "ordinary" || newline == "anchors",
                    newline == "sensitive" || newline == "anchors",
                    syntax.chars().next().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_zero_width_assertions(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                advanced += 1;
                let newline = options["newline"].as_str().unwrap();
                candidate::find_zero_width_assertions(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    newline == "sensitive" || newline == "anchors",
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_literal_zero_width_group(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                advanced += 1;
                candidate::find_literal_zero_width_group(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else if options["syntax"] == "advanced"
                && candidate::supports_unicode_simple(
                    pattern,
                    options["expanded"].as_bool().unwrap(),
                )
            {
                advanced += 1;
                candidate::find_unicode_simple(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    options["expanded"].as_bool().unwrap(),
                )
            } else {
                continue;
            };
            if from > 0 {
                positioned += 1;
            }
            let actual = match actual {
                candidate::MatchOutcome::Found(span) => {
                    json!({ "kind": "Found", "value": { "start": span.start, "end": span.end } })
                }
                candidate::MatchOutcome::NoMatch => json!({ "kind": "NoMatch" }),
                candidate::MatchOutcome::Uncertain => json!({ "kind": "Uncertain" }),
            };
            assert_eq!(actual, fixture["expected"], "input={input}");
            checked += 1;
        }
        if required {
            assert_eq!(checked, fixtures["fixtures"].as_array().unwrap().len());
        }
    }
    assert!(literal >= 40);
    assert!(quoted_literal >= 2);
    assert!(insensitive >= 7);
    assert!(advanced >= 100);
    assert!(grouped >= 20);
    assert!(group_choice >= 20);
    assert!(optional_group >= 50);
    assert!(multi_optional_group >= 4);
    assert!(lookbehind >= 20);
    assert!(lookahead >= 20);
    assert!(backref >= 20);
    assert!(single_capture >= 50);
    assert!(repeated_backref >= 8);
    assert!(capture_program >= 12);
    assert!(choice_capture >= 10);
    assert!(two_capture >= 30);
    assert!(inline >= 20);
    assert!(inline_options >= 10);
    assert!(middle_lookahead >= 20);
    assert!(chained_assertions >= 4);
    assert!(bounded_group >= 20);
    assert!(expanded_advanced >= 200);
    assert!(extended >= 50);
    assert!(extended_literal_close >= 10);
    assert!(repeated_choice >= 20);
    assert!(extended_group >= 20);
    assert!(extended_escape >= 20);
    assert!(numeric_literal >= 10);
    assert!(basic >= 50);
    assert!(basic_punctuation >= 20);
    assert!(basic_escape >= 20);
    assert!(basic_bound >= 20);
    assert!(basic_backref >= 20);
    assert!(bracket_word >= 10);
    assert!(collating_bracket >= 10);
    assert!(basic_transparent_group >= 4);
    assert!(basic_special_bracket >= 4);
    assert!(basic_literal_escaped_letter >= 2);
    assert!(basic_repeated_capture >= 1);
    assert!(invalid_grouping >= 40);
    assert!(invalid_repeat >= 20);
    assert!(invalid_bound >= 20);
    assert!(invalid_posix_class >= 20);
    assert!(invalid_range >= 10);
    assert!(invalid_bracket_construct >= 7);
    assert!(invalid_numeric >= 5);
    assert!(invalid_backreference >= 10);
    assert!(dot >= 20);
    assert!(mixed >= 50);
    assert!(anchored >= 20);
    assert!(escaped >= 40);
    assert!(classes >= 50);
    assert!(negated_classes >= 40);
    assert!(range_classes >= 50);
    assert!(edge_punctuation >= 80);
    assert!(absolute_anchors >= 50);
    assert!(positioned >= 6);
    assert_eq!(newline_modes.len(), 4);
}

#[test]
fn supported_count_matches_pglite_fixtures() {
    let fixtures: Value =
        serde_json::from_str(include_str!("../conformance/stress-position-fixtures.json")).unwrap();
    let mut checked = 0;
    for fixture in fixtures["fixtures"].as_array().unwrap() {
        if fixture["operation"] != "count" {
            continue;
        }
        let input = &fixture["input"];
        let options = &input["options"];
        let pattern = input["pattern"].as_str().unwrap();
        let simple = options["syntax"] == "advanced"
            && (options["expanded"] == false && candidate::supports_simple_advanced(pattern)
                || options["expanded"] == true && candidate::supports_expanded_advanced(pattern));
        let choice = options["syntax"] == "advanced"
            && candidate::supports_group_choice(pattern, options["expanded"] == true);
        let lookbehind = options["syntax"] == "advanced"
            && candidate::supports_fixed_lookbehind(pattern, options["expanded"] == true);
        let lookahead = options["syntax"] == "advanced"
            && candidate::supports_leading_lookahead(pattern, options["expanded"] == true);
        let backref = options["syntax"] == "advanced"
            && candidate::supports_fixed_backref(pattern, options["expanded"] == true);
        if !simple && !choice && !lookbehind && !lookahead && !backref {
            continue;
        }
        let newline = options["newline"].as_str().unwrap();
        let outcome = if backref {
            candidate::count_fixed_backref(
                pattern,
                input["subject"].as_str().unwrap(),
                input["start"].as_u64().unwrap() as usize - 1,
                options["caseSensitive"].as_bool().unwrap(),
                newline == "ordinary" || newline == "anchors",
                newline == "sensitive" || newline == "anchors",
                options["expanded"] == true,
            )
        } else if lookahead {
            candidate::count_leading_lookahead(
                pattern,
                input["subject"].as_str().unwrap(),
                input["start"].as_u64().unwrap() as usize - 1,
                options["caseSensitive"].as_bool().unwrap(),
                newline == "ordinary" || newline == "anchors",
                newline == "sensitive" || newline == "anchors",
                options["expanded"] == true,
            )
        } else if lookbehind {
            candidate::count_fixed_lookbehind(
                pattern,
                input["subject"].as_str().unwrap(),
                input["start"].as_u64().unwrap() as usize - 1,
                options["caseSensitive"].as_bool().unwrap(),
                newline == "ordinary" || newline == "anchors",
                newline == "sensitive" || newline == "anchors",
                options["expanded"] == true,
            )
        } else if choice {
            candidate::count_group_choice(
                pattern,
                input["subject"].as_str().unwrap(),
                input["start"].as_u64().unwrap() as usize - 1,
                options["caseSensitive"].as_bool().unwrap(),
                newline == "ordinary" || newline == "anchors",
                newline == "sensitive" || newline == "anchors",
                options["expanded"] == true,
            )
        } else if options["expanded"] == true {
            candidate::count_expanded_advanced(
                pattern,
                input["subject"].as_str().unwrap(),
                input["start"].as_u64().unwrap() as usize - 1,
                options["caseSensitive"].as_bool().unwrap(),
                newline == "ordinary" || newline == "anchors",
                newline == "sensitive" || newline == "anchors",
            )
        } else {
            candidate::count_simple_advanced(
                pattern,
                input["subject"].as_str().unwrap(),
                input["start"].as_u64().unwrap() as usize - 1,
                options["caseSensitive"].as_bool().unwrap(),
                newline == "ordinary" || newline == "anchors",
                newline == "sensitive" || newline == "anchors",
            )
        };
        let actual = match outcome {
            candidate::CountOutcome::Count(value) => json!({ "kind": "Count", "value": value }),
            candidate::CountOutcome::Uncertain => json!({ "kind": "Uncertain" }),
        };
        assert_eq!(actual, fixture["expected"], "input={input}");
        checked += 1;
    }
    assert_eq!(checked, 180);
}

#[test]
fn any_character_search_matches_the_live_engine() {
    for (newline, dot_crosses_newline) in [
        (engine::NewlineMode::Ordinary, true),
        (engine::NewlineMode::Sensitive, false),
        (engine::NewlineMode::Stop, false),
        (engine::NewlineMode::Anchors, true),
    ] {
        let engine::CompileOutcome::Ready(program) = engine::compile(
            ".",
            engine::Options {
                newline,
                ..engine::Options::default()
            },
        ) else {
            panic!("dot pattern did not compile");
        };
        for subject in ["", "a", "\n", "\na", "a\n", "\n\n", "😀\nβ"] {
            for from in 0..=subject.chars().count() + 1 {
                let expected = match program.find(subject, from) {
                    engine::MatchOutcome::Found(span) => (0, span.start, span.end),
                    engine::MatchOutcome::NoMatch => (1, 0, 0),
                    engine::MatchOutcome::Uncertain => (2, 0, 0),
                };
                let actual = match candidate::find_any_character(subject, from, dot_crosses_newline)
                {
                    candidate::MatchOutcome::Found(span) => (0, span.start, span.end),
                    candidate::MatchOutcome::NoMatch => (1, 0, 0),
                    candidate::MatchOutcome::Uncertain => (2, 0, 0),
                };
                assert_eq!(
                    actual, expected,
                    "subject={subject:?} from={from} newline={newline:?}"
                );
            }
        }
    }
}

#[test]
fn simple_advanced_search_matches_the_live_engine() {
    for case_sensitive in [true, false] {
        for (newline, dot_crosses_newline, line_anchors) in [
            (engine::NewlineMode::Ordinary, true, false),
            (engine::NewlineMode::Sensitive, false, true),
            (engine::NewlineMode::Stop, false, false),
            (engine::NewlineMode::Anchors, true, true),
        ] {
            for pattern in [
                "",
                "a",
                "a.b",
                "a..b",
                ".a",
                "a.",
                "..",
                "Å.😀",
                "a\nb",
                "^a",
                "a$",
                "^$",
                "^a.b$",
                "a^b",
                "a$b",
                "^.",
                "^😀$",
                "a\\.b",
                "a\\+b",
                "\\^a",
                "a\\$",
                "a\\\\b",
                "\\(a\\)",
                "\\[a\\]",
                "a[bc]d",
                "[ab][ab]",
                "[.]",
                "[a^b]",
                "[😀β]",
                "[A]",
                "[a\n]",
                "[^ab]",
                "a[^b]c",
                "[^A]",
                "[^😀β]",
                "[^\n]",
                "[^^]",
                "[a-z]",
                "[A-Z]",
                "[0-9]",
                "[a-cx-z]",
                "[^b-d]",
                "a[1-3]b",
                "[-]",
                "[-a]",
                "[a-]",
                "[a-b-]",
                "[-a-b]",
                "[]]",
                "[]a]",
                "[^]]",
                "[^-]",
                "[]-]",
                "\\A",
                "\\Z",
                "\\Aa",
                "a\\Z",
                "\\A😀\\Z",
                "\\A^a",
                "a$\\Z",
                "\\m",
                "\\M",
                "\\y",
                "\\Y",
                "\\ma",
                "a\\M",
                "a\\Y",
                "\\yA",
                "\\d",
                "\\D",
                "\\s",
                "\\S",
                "\\w",
                "\\W",
                "a\\db",
                "a\\Sb",
                "\\w\\d",
                "\\a",
                "\\b",
                "\\B",
                "\\e",
                "\\f",
                "\\n",
                "\\r",
                "\\t",
                "\\v",
                "a\\nb",
                "[\\d]",
                "[\\D]",
                "[\\s]",
                "[\\S]",
                "[\\w]",
                "[\\W]",
                "[^\\d]",
                "[^\\D]",
                "[a\\d]",
                "[\\d\\w]",
                "[\\d-]",
                "[^\\d\\D]",
                "a*",
                "a+",
                "a?",
                "a*b",
                "a+b",
                "a?b",
                "a.*b",
                "[ab]*c",
                "\\d+",
                "^a+$",
                "a*b*",
                "a|b",
                "ab|a",
                "a|ab",
                "a*|b+",
                "|a",
                "a|",
                "[a|b]|c",
                "\\||b",
                "a*?",
                "a+?",
                "a??",
                "a*?b",
                "a+?b",
                "a??b",
                "a*?b+",
                "a+?b|c",
                "a{2}",
                "a{1,3}",
                "a{0,2}b",
                "a{2,}b",
                "a{1,3}?b",
                "a{0,2}?b",
                "\\d{2,3}",
                "a{0}",
                "a{foo}",
                "a{ 1 , 2 }b",
                "a}",
            ] {
                let engine::CompileOutcome::Ready(program) = engine::compile(
                    pattern,
                    engine::Options {
                        case_sensitive,
                        newline,
                        ..engine::Options::default()
                    },
                ) else {
                    panic!("simple advanced pattern did not compile");
                };
                for subject in [
                    "", "a", "a😀b", "a\nb", "a😀\nb", "\na", "a\n", "Åβ😀", "\na\n", "😀\n", "\t",
                    "\r", "\u{000b}", "\u{0007}", "\u{0008}", "\u{001b}", "\u{000c}", "a.b", "a+b",
                    "^a", "a$", "a\\b", "(a)", "[a]", "zabd", "zacd", "zaed", "ba", ".", "^", "β",
                    "\n", "c", "a\nc", "abc", "zac", "B", "5", "y", "m", "a2b", "-", "]", "za]",
                    "a😀", "a😀\n", "a-", "ab", "éa", "_a", "-a", "5_", "😀a", "aa", "aaa", "aaab",
                    "aabb", "aaac", "abbc", "a1b",
                ] {
                    for from in 0..=subject.chars().count() + 1 {
                        let expected = match program.find(subject, from) {
                            engine::MatchOutcome::Found(span) => (0, span.start, span.end),
                            engine::MatchOutcome::NoMatch => (1, 0, 0),
                            engine::MatchOutcome::Uncertain => (2, 0, 0),
                        };
                        let actual = match candidate::find_simple_advanced(
                            pattern,
                            subject,
                            from,
                            case_sensitive,
                            dot_crosses_newline,
                            line_anchors,
                        ) {
                            candidate::MatchOutcome::Found(span) => (0, span.start, span.end),
                            candidate::MatchOutcome::NoMatch => (1, 0, 0),
                            candidate::MatchOutcome::Uncertain => (2, 0, 0),
                        };
                        assert_eq!(
                            actual, expected,
                            "pattern={pattern:?} subject={subject:?} from={from} case_sensitive={case_sensitive} newline={newline:?}"
                        );
                    }
                }
            }
        }
    }
    for pattern in [
        "[z-a]", "[a-b-c]", "[A-z]", "[--a]", "[a--]", "[^]", "[]", "[a", "[\\d-~]", "[a-\\d]",
        "[\\q]", "(ab)", "a{256}", "a{3,1}", "a{2,", "a*{foo}", "a{2}{3}", "a\\", "a**", "a*??",
        "^*", "\\m+", "{2}",
    ] {
        assert!(matches!(
            candidate::find_simple_advanced(pattern, "ab", 0, true, true, false),
            candidate::MatchOutcome::Uncertain
        ));
    }
}

#[test]
fn support_classification_matches_search_certainty() {
    for pattern in [
        "",
        "a",
        ".",
        "^a$",
        "a\\.b",
        "\\^a",
        "a\\$",
        "a\\\\b",
        "\\(a\\)",
        "\\[a\\]",
        "a*",
        "a*?",
        "a+?",
        "a??",
        "a{2}",
        "a{1,3}",
        "a{2,}",
        "a{foo}",
        "a|b",
        "a|ab",
        "|a",
        "a|",
        "a\\nb",
        "\\B",
        "[ab]",
        "a[bc]d",
        "[a^b]",
        "[😀β]",
        "[a\n]",
        "[^ab]",
        "a[^b]c",
        "[^😀β]",
        "[^\n]",
        "[^^]",
        "[a-z]",
        "[^a-z]",
        "[A-Z]",
        "[0-9]",
        "[a-cx-z]",
        "[z-a]",
        "[a-b-c]",
        "[A-z]",
        "[-]",
        "[-a]",
        "[a-]",
        "[a-b-]",
        "[-a-b]",
        "[]]",
        "[]a]",
        "[^]]",
        "[^-]",
        "[]-]",
        "\\A",
        "\\Z",
        "\\Aa",
        "a\\Z",
        "\\A😀\\Z",
        "\\m",
        "\\M",
        "\\y",
        "\\Y",
        "\\ma",
        "a\\M",
        "a\\Y",
        "\\yA",
        "[\\d]",
        "[\\D]",
        "[\\s]",
        "[\\S]",
        "[\\w]",
        "[\\W]",
        "[^\\d]",
        "[^\\D]",
        "[a\\d]",
        "[\\d\\w]",
        "[\\d-]",
        "[^\\d\\D]",
        "[--a]",
        "[a--]",
        "[---]",
        "[^]",
        "[]",
        "[a",
        "[\\d-~]",
        "[a-\\d]",
        "[\\q]",
        "(ab)",
        "a{2}",
        "a?",
        "a\\",
    ] {
        let supported = candidate::supports_simple_advanced(pattern);
        let certain = !matches!(
            candidate::find_simple_advanced(pattern, "a.b", 0, true, true, false),
            candidate::MatchOutcome::Uncertain
        );
        assert_eq!(supported, certain, "pattern={pattern:?}");
    }
}

#[test]
fn expanded_advanced_search_matches_the_live_engine() {
    assert_eq!(
        candidate::pattern_atoms("a # comment\nb[ #]c", true),
        "ab[ #]c".chars().collect::<Vec<_>>()
    );
    for case_sensitive in [true, false] {
        for (newline, dot_crosses_newline, line_anchors) in [
            (engine::NewlineMode::Ordinary, true, false),
            (engine::NewlineMode::Sensitive, false, true),
            (engine::NewlineMode::Stop, false, false),
            (engine::NewlineMode::Anchors, true, true),
        ] {
            for pattern in [
                "a b c",
                "a# comment\nb",
                "a[ #]b",
                "a\tb",
                "a|ab",
                "^ a $",
                "a+ # comment\nb",
                "a { 2 , 3 } b",
            ] {
                assert!(candidate::supports_expanded_advanced(pattern));
                let engine::CompileOutcome::Ready(program) = engine::compile(
                    pattern,
                    engine::Options {
                        case_sensitive,
                        newline,
                        expanded: true,
                        ..engine::Options::default()
                    },
                ) else {
                    panic!("expanded pattern did not compile: {pattern:?}");
                };
                for subject in ["", "a", "ab", "abc", "za#b", "za b", "aaab", "a\nb"] {
                    for from in 0..=subject.chars().count() + 1 {
                        let expected = match program.find(subject, from) {
                            engine::MatchOutcome::Found(span) => (0, span.start, span.end),
                            engine::MatchOutcome::NoMatch => (1, 0, 0),
                            engine::MatchOutcome::Uncertain => (2, 0, 0),
                        };
                        let actual = match candidate::find_expanded_advanced(
                            pattern,
                            subject,
                            from,
                            case_sensitive,
                            dot_crosses_newline,
                            line_anchors,
                        ) {
                            candidate::MatchOutcome::Found(span) => (0, span.start, span.end),
                            candidate::MatchOutcome::NoMatch => (1, 0, 0),
                            candidate::MatchOutcome::Uncertain => (2, 0, 0),
                        };
                        assert_eq!(
                            actual, expected,
                            "pattern={pattern:?} subject={subject:?} from={from} newline={newline:?}"
                        );
                    }
                }
            }
        }
    }
}
