#[path = "../regex_engine_transpilable.rs"]
mod candidate;

use serde_json::{json, Value};

fn test_syntax(syntax: char) -> candidate::Syntax {
    match syntax {
        'a' => candidate::Syntax::Advanced,
        'b' => candidate::Syntax::Basic,
        'e' => candidate::Syntax::Extended,
        'l' | 'q' => candidate::Syntax::Literal,
        other => panic!("unknown test syntax: {other}"),
    }
}

fn test_options(
    syntax: candidate::Syntax,
    case_sensitive: bool,
    crosses: bool,
    anchors: bool,
    expanded: bool,
) -> candidate::RegexOptions {
    let newline = match (crosses, anchors) {
        (true, false) => candidate::NewlineMode::Ordinary,
        (true, true) => candidate::NewlineMode::Anchors,
        (false, false) => candidate::NewlineMode::Stop,
        (false, true) => candidate::NewlineMode::Sensitive,
    };
    candidate::RegexOptions {
        syntax,
        case_sensitive,
        newline,
        expanded,
    }
}

fn invalid_pattern(pattern: &str, syntax: char, expanded: bool) -> bool {
    matches!(
        candidate::find(
            pattern,
            "",
            0,
            test_options(test_syntax(syntax), true, true, false, expanded)
        ),
        candidate::MatchOutcome::InvalidPattern
    )
}

#[test]
fn noncapturing_literal_groups_compare_all_branches() {
    assert!(matches!(
        candidate::find(
            "a(?:b|bc)c",
            "abcc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
}

#[test]
fn multiple_optional_literal_groups_search_all_participation_choices() {
    for (subject, end) in [("xabcdey", 6), ("xacdey", 5), ("xabcey", 5), ("xacey", 4)] {
        assert!(matches!(
            candidate::find("a(b)?c(d)?e", subject, 0, test_options(candidate::Syntax::Advanced, true, true, false, false)),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: actual_end })
                if actual_end == end
        ));
    }
    assert!(matches!(
        candidate::find(
            "(ab)?(cd)?e",
            "e",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
}

#[test]
fn lookbehind_respects_anchors_and_expanded_patterns() {
    assert!(matches!(
        candidate::find(
            "(?<=^a)b",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "(?<!\n)b",
            "b",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, true)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "(?<=a|a\n)b",
            "a\nb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 3 })
    ));
}

#[test]
fn anchor_or_lookbehind_respects_expanded_whitespace() {
    assert!(matches!(
        candidate::find(
            "(^|(?<=\n))b",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, false, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "(^|(?<=\n))b",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, false, false, true)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
}

#[test]
fn chained_single_character_assertions_match_with_literal_repetition() {
    assert!(matches!(
        candidate::find(
            "a(?=b)b*(?=c)c*",
            "abc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find(
            "(?<=a)b*(?<=b)c*",
            "abc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
}

#[test]
fn optional_capture_backreference_matches_participating_group() {
    assert!(matches!(
        candidate::find(
            "(a)?b\\1",
            "zabay",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn backreferences_match_classes_and_repeated_groups() {
    assert!(matches!(
        candidate::find(
            "([ab])\\1",
            "zaabb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
    assert!(matches!(
        candidate::find(
            "([ab]+)c\\1",
            "abcab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(matches!(
        candidate::find(
            "a(b*)c\\1",
            "ac",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "([[:digit:]])x\\1",
            "z3x3y",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn repeated_class_backreferences_use_the_captured_character() {
    assert!(matches!(
        candidate::find(
            "a([bc])\\1*",
            "abbb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "a([bc])\\1{3,4}",
            "abbb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "^([bc])\\1*$",
            "bbb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find(
            "^([bc])\\1*$",
            "bcb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "^([bc])\\1*$",
            "x\nbbb\ny",
            0,
            test_options(candidate::Syntax::Advanced, true, true, true, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 5 })
    ));
}

#[test]
fn capture_program_reuses_the_first_capture_across_repeated_groups() {
    for pattern in ["^(\\w+)( \\1)+$", "^(.+)( \\1)+$"] {
        assert!(matches!(
            candidate::find(
                pattern,
                "abc abc abc",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 11 })
        ));
        assert!(matches!(
            candidate::find(
                pattern,
                "abc abd abc",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::NoMatch
        ));
    }

    for pattern in ["^(\\w+)( \\1)*$", "^(\\w+)( \\1)+"] {
        assert!(matches!(
            candidate::find(
                pattern,
                "abc abc",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 7 })
        ));
    }

    assert!(matches!(
        candidate::find(
            "((.))(\\2)",
            "xyy",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));

    assert!(matches!(
        candidate::find(
            "a(bc*).*\\1",
            "abccbccb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 8 })
    ));
    for pattern in ["a(?:(b))c", "a((?:b))c", "a(?:(?:b))c"] {
        assert!(matches!(
            candidate::find(
                pattern,
                "xabc",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
        ));
    }

    assert!(matches!(
        candidate::find(
            "a(?:(b|c))d",
            "xacd",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));

    assert!(matches!(
        candidate::find(
            "a(b.[bc]*)+",
            "abxbcy",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));

    for pattern in ["a([bc])\\1+", "a([bc])\\1*"] {
        assert!(matches!(
            candidate::find(
                pattern,
                "abbb",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
        ));
    }
    assert!(matches!(
        candidate::find(
            "a([bc])\\1*",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));

    assert!(matches!(
        candidate::find(
            "(a)(a)(a)(a)\\1",
            "aaaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(matches!(
        candidate::find(
            "(a)(a)(a)(a)\\1",
            "aaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
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
        assert!(matches!(
            candidate::find(
                &pattern,
                &subject,
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 13 })
        ));
    }
}

#[test]
fn choice_capture_repeats_the_chosen_literal() {
    assert!(matches!(
        candidate::find(
            "(a|aa)\\1",
            "zaaaay",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
    assert!(matches!(
        candidate::find(
            "(a|b)c\\1",
            "zbcby",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "((a|ab))\\2",
            "abab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
}

#[test]
fn two_choice_backrefs_compare_all_literal_alternatives() {
    assert!(matches!(
        candidate::find(
            "(a|aa)(a|aa)\\2\\1",
            "aaaaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find(
            "(a|ab)(b|)\\1",
            "abbab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
}

#[test]
fn repeated_choice_explores_literal_alternatives() {
    assert!(matches!(
        candidate::find(
            "(a|ab)*b",
            "zaabb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
    assert!(matches!(
        candidate::find(
            "(a|ab){1,2}b",
            "aabb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "(a|aa){2}\\1",
            "aaaaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find(
            "(a|aa){2}\\1",
            "aaaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "(ab){1,2}\\1",
            "ababab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find(
            "((a|aa){1,2})\\2",
            "aaaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "(ab|a)+?c",
            "ababc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
}

#[test]
fn invalid_grouping_patterns_are_rejected() {
    assert!(invalid_pattern("a(b", 'a', false));
    assert!(invalid_pattern("a)b", 'a', false));
    assert!(invalid_pattern("a[b", 'a', false));
    assert!(invalid_pattern("a\\", 'a', false));
    assert!(invalid_pattern("a\\(b", 'b', false));
    assert!(!invalid_pattern("a\\)b", 'a', false));
    assert!(!invalid_pattern("a(b)c", 'a', false));
    assert!(!invalid_pattern("a(b", 'l', false));
}

#[test]
fn invalid_repeat_patterns_are_rejected() {
    for pattern in ["*", "a**", "a*+", "a?*", "(*)", "^*", "$*", "\\A*", "\\y*"] {
        assert!(invalid_pattern(pattern, 'a', false));
    }
    for pattern in ["\\<*", "\\>*"] {
        assert!(invalid_pattern(pattern, 'b', false));
    }
    assert!(!invalid_pattern("^*", 'b', false));
    assert!(!invalid_pattern("(?=a)b", 'a', false));
    assert!(!invalid_pattern("***=a*b", 'a', false));
    assert!(!invalid_pattern("a+", 'b', false));
}

#[test]
fn invalid_bound_patterns_are_rejected() {
    for pattern in ["a{1,0}", "a{2,", "a{256}", "a{1,2,3}"] {
        assert!(invalid_pattern(pattern, 'a', false));
    }
    assert!(invalid_pattern("a\\{3,1\\}", 'b', false));
    assert!(!invalid_pattern("a{2,3}", 'a', false));
    assert!(!invalid_pattern("a\\{2,3\\}", 'b', false));
}

#[test]
fn invalid_posix_class_patterns_are_rejected() {
    assert!(invalid_pattern("[[:unknown:]]", 'a', false));
    assert!(invalid_pattern("[[:woopsie:]]", 'b', false));
    assert!(!invalid_pattern("[[:digit:]]", 'a', false));
    assert!(!invalid_pattern("[[:xdigit:]]", 'a', false));
}

#[test]
fn invalid_bracket_range_patterns_are_rejected() {
    for pattern in [
        "a[c-b]",
        "a[a-b-c]",
        "[\\w-~]*",
        "[[:alnum:]-~]*",
        "a[0-[=x=]]",
    ] {
        assert!(invalid_pattern(pattern, 'a', false));
    }
    for pattern in ["a[--?]b", "a[---]b", "a[0-[.9.]]", "a[[.zero.]-9]"] {
        assert!(!invalid_pattern(pattern, 'a', false));
    }
}

#[test]
fn invalid_bracket_construct_patterns_are_rejected() {
    for (pattern, syntax) in [
        ("a[[..]]b", 'a'),
        ("a[[..]]b", 'b'),
        ("a[[==]]b", 'a'),
        ("a[[==]]b", 'b'),
        ("[[:<:]]*", 'a'),
        ("[[:>:]]*", 'a'),
        ("a[\\Z]b", 'a'),
    ] {
        assert!(invalid_pattern(pattern, syntax, false));
    }
    for pattern in ["a[[.-.]]", "a[[=Y=]]", "[[:<:]]a", "a[\\]]b"] {
        assert!(!invalid_pattern(pattern, 'a', false));
    }
}

#[test]
fn invalid_inline_option_patterns_are_rejected() {
    assert!(invalid_pattern("(?z)ab", 'a', false));
    assert!(invalid_pattern("(?i)(?q)a+", 'a', false));
    assert!(!invalid_pattern("(?ici)a+", 'a', false));
    assert!(!invalid_pattern("(?i)(?=a)a", 'a', false));
}

#[test]
fn named_character_classes_match_word_hex_and_control_characters() {
    assert!(matches!(
        candidate::find(
            "[[:word:]]+",
            "x_*",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "[[:xdigit:]]+",
            "xa9Z",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
    assert!(matches!(
        candidate::find(
            "[[:cntrl:]]+",
            "x\u{007f}",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
}

#[test]
fn invalid_backreference_patterns_are_rejected() {
    assert!(invalid_pattern("\\1", 'b', false));
    assert!(invalid_pattern("a\\12b", 'b', false));
    assert!(invalid_pattern("a(b)c\\2", 'a', false));
    assert!(invalid_pattern("a((b)\\1)", 'a', false));
    assert!(invalid_pattern("a((((((((((b\\10))))))))))c", 'a', false));
    assert!(invalid_pattern("x(\\w)(?=(\\1))", 'a', false));
    assert!(!invalid_pattern("(a)\\1", 'a', false));
    assert!(!invalid_pattern("(a(b)\\2)", 'a', false));
}

#[test]
fn escaped_space_survives_expanded_patterns() {
    assert!(matches!(
        candidate::find(
            "a\\ b",
            "xa by",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, true)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn unmatched_extended_closing_group_is_literal() {
    assert!(matches!(
        candidate::find(
            "ab)",
            "xab)y",
            0,
            test_options(candidate::Syntax::Extended, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn inline_flags_select_regex_syntax() {
    assert!(matches!(
        candidate::find(
            "(?b)a+b",
            "xa+by",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "(?e)a+b",
            "xaaaby",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
    assert!(matches!(
        candidate::find(
            "(?q)a+b",
            "xa+by",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn lookahead_checks_nested_groups_after_a_prefix() {
    assert!(matches!(
        candidate::find(
            "a(?=((bc)))bc",
            "zabc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
}

#[test]
fn middle_lookbehind_checks_the_character_before_the_assertion() {
    assert!(matches!(
        candidate::find(
            "a(?<!b)b*",
            "a",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find(
            "a(?<!a)b*",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "a(?<=a)b*",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
}

#[test]
fn zero_repetition_of_a_noncapturing_group_consumes_nothing() {
    assert!(matches!(
        candidate::find(
            "a(?:[bc]){0}d",
            "xad",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 3 })
    ));
}

#[test]
fn noncapturing_choices_can_include_word_classes() {
    assert!(matches!(
        candidate::find(
            "abc(?:\\w|z)",
            "!abc8",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 5 })
    ));
}

#[test]
fn zero_repetition_leaves_captures_unset() {
    assert!(matches!(
        candidate::find(
            "(.){0}(\\1)",
            "a",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));

    assert!(matches!(
        candidate::find(
            "((.))(\\2){0}",
            "a",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
}

#[test]
fn starred_capture_backreference_uses_the_last_iteration() {
    assert!(matches!(
        candidate::find(
            "a([bc])*\\1",
            "abc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "a([bc])*\\1",
            "abb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn capture_can_contain_a_starred_backreference() {
    assert!(matches!(
        candidate::find(
            "a([bc])(\\1*)",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "a([bc])(\\1*)",
            "abb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn top_level_choice_keeps_branch_specific_captures() {
    assert!(matches!(
        candidate::find(
            "^(.)\\1|\\1.",
            "ab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "^(.)\\1|\\1.",
            "aa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
}

#[test]
fn zero_width_groups_preserve_anchor_and_boundary_logic() {
    assert!(matches!(
        candidate::find(
            "(^(?!aa)(?!bb))+",
            "aa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
    assert!(matches!(
        candidate::find(
            "(^(?!aa)(?!bb))+",
            "cc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 0 })
    ));
    assert!(matches!(
        candidate::find(
            "(\\Y)+",
            "foo",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 1 })
    ));
}

#[test]
fn repeated_boundaries_between_literals_do_not_consume_text() {
    assert!(matches!(
        candidate::find(
            "abc(\\Y\\Y)+d",
            "abcd",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "abc(\\m)+d",
            "abcd",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn middle_lookahead_offset_excludes_word_boundaries() {
    assert!(matches!(
        candidate::find(
            "a\\Y(?=45)",
            "a45",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find(
            "a\\Y(?=45)",
            "a 45",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn chained_lookaheads_share_wildcard_and_word_semantics() {
    assert!(matches!(
        candidate::find(
            "a(?=\\w)\\w*(?=.).*",
            "az3%",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "a(?=.).*(?=3)3*",
            "a\n3",
            0,
            test_options(candidate::Syntax::Advanced, true, false, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn unicode_ranges_backtrack_before_numeric_literals() {
    assert!(matches!(
        candidate::find(
            "a[\\u1234-\\u25ff]+\\u1236\\u1236x",
            "aሴሶሶx",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 5 })
    ));
    assert!(matches!(
        candidate::find(
            "[[:alnum:]]*[[:upper:]]*[\\u1000-\\u2000]*\\u1237",
            "Aሹ",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn a_nested_starred_literal_has_the_same_span_as_one_star() {
    assert!(matches!(
        candidate::find(
            "(a*)*",
            "aaab",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find(
            "(a*)*",
            "bc",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 0 })
    ));
}

#[test]
fn captured_word_run_can_be_referenced_after_assertions() {
    for pattern in ["(^\\w+).*\\1", "(^\\w+\\M).*\\1", "(\\w+(?= )).*\\1"] {
        assert!(matches!(
            candidate::find(
                pattern,
                "abc abcd",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 7 })
        ));
    }
    assert!(matches!(
        candidate::find(
            "(^\\w+\\M).*\\1",
            "abc abd",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn repeated_noncapturing_word_end_is_one_assertion() {
    assert!(matches!(
        candidate::find(
            "x|(?:\\M)+",
            "x",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find(
            "x|(?:\\M)+",
            "a ",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 1 })
    ));
}

#[test]
fn inline_line_mode_checks_negative_class_at_each_line_start() {
    let pattern = "(?n)^(?![t#])\\S+";

    assert!(matches!(
        candidate::find(
            pattern,
            "tk\n\n#\nit0",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 6, end: 9 })
    ));
    assert!(matches!(
        candidate::find(
            pattern,
            "T\nX",
            0,
            test_options(candidate::Syntax::Advanced, false, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 3 })
    ));
}

#[test]
fn nested_capture_choices_deduplicate_empty_cycles() {
    assert!(matches!(
        candidate::find(
            "a((b|c)d+)+",
            "abacdbd",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 7 })
    ));

    assert!(matches!(
        candidate::find(
            "((a|)+)+",
            "aaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn anchored_optional_paths_keep_capture_backreferences() {
    let ordinary = "^([^/]+?)(?:/([^/]+?))(?:/([^/]+?))?$";

    assert!(matches!(
        candidate::find(
            ordinary,
            "foo/bar/baz",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 11 })
    ));
    let referenced = "^(.+?)(?:/(.+?))(?:/(.+?)\\3)?$";

    assert!(matches!(
        candidate::find(
            referenced,
            "foo/bar/baz/quux",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 16 })
    ));
}

#[test]
fn repeated_anchor_or_newline_choices_advance_without_zero_loops() {
    assert!(matches!(
        candidate::find(
            "(^|\\n)+\\.*b",
            "\n.b",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));

    assert!(matches!(
        candidate::find(
            "(^|[\\n\\r]+)\\.*\\?<.*?(\\n|\\r)+",
            "TQ\r\n.?<5000267>Test already stopped\r\n",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 2, end: 37 })
    ));
}

#[test]
fn minimum_width_rejection_respects_empty_arms_and_invalid_syntax() {
    assert!(matches!(
        candidate::find(
            "^(ab|c)d{2,3}$",
            "x",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn repetition_without_starting_literal_returns_no_match() {
    assert!(matches!(
        candidate::find(
            "a(b)*c",
            &"b".repeat(300),
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn basic_punctuation_preserves_literal_meaning() {
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
        assert!(matches!(
            candidate::find(pattern, subject, 0, test_options(candidate::Syntax::Basic, true, true, false, false)),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: actual }) if actual == end
        ));
    }
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
        assert!(matches!(
            candidate::find(pattern, subject, 0, test_options(candidate::Syntax::Advanced, true, true, false, false)),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: actual }) if actual == end
        ));
    }
}

#[test]
fn invalid_numeric_escape_patterns_are_rejected() {
    for pattern in ["a\\u008x", "a\\U0000008x", "a\\xq", "a\\z", "a\\U0001234x"] {
        assert!(invalid_pattern(pattern, 'a', false));
    }
    for pattern in ["a\\u0008x", "a\\U00001234x", "a\\x08x", "a\\\\z"] {
        assert!(!invalid_pattern(pattern, 'a', false));
    }
}

#[test]
fn collating_names_match_character_class_members() {
    for (pattern, subject) in [
        ("a[[.-.]]", "a-"),
        ("a[[.zero.]]", "a0"),
        ("a[[.zero.]-9]", "a2"),
        ("a[0-[.9.]]", "a2"),
    ] {
        assert!(matches!(
            candidate::find(
                pattern,
                subject,
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
        ));
    }

    assert!(matches!(
        candidate::find(
            "a[[=Y=]]",
            "ay",
            0,
            test_options(candidate::Syntax::Advanced, false, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "a[[=Y=]]",
            "ay",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn hyphen_can_start_a_bracket_range() {
    for (pattern, subject) in [("a[--?]b", "a?b"), ("a[---]b", "a-b")] {
        assert!(matches!(
            candidate::find(
                pattern,
                subject,
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
        ));
        assert!(matches!(
            candidate::find(
                pattern,
                subject,
                0,
                test_options(candidate::Syntax::Basic, true, true, false, false)
            ),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
        ));
    }
}

#[test]
fn advanced_brackets_accept_escaped_closing_and_opening_punctuation() {
    for (pattern, subject) in [("a[\\]]b", "a]b"), ("a[\\\\]b", "a\\b"), ("a[[b]c", "a[c")] {
        assert!(matches!(
            candidate::find(
                pattern,
                subject,
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
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
        assert!(matches!(
            candidate::find(pattern, subject, 0, test_options(candidate::Syntax::Basic, true, true, false, false)),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: actual_start, end: actual_end })
                if actual_start == start && actual_end == end
        ));
    }
    assert!(matches!(
        candidate::find(
            "a[\\]]b",
            "a]b",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn basic_letter_escapes_can_mix_with_literal_punctuation() {
    assert!(matches!(
        candidate::find(
            "(?b)\\w+",
            "(?b)w+",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find(
            "(?b)\\w+",
            "",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn basic_repeated_capture_uses_the_captured_phrase() {
    assert!(matches!(
        candidate::find(
            "a\\(b*\\)c\\1",
            "abbcbb",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
    assert!(matches!(
        candidate::find(
            "a\\(b*\\)c\\1",
            "abbcb",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn basic_groups_without_backreferences_match_their_contents() {
    for (pattern, subject, expected) in [
        ("\\(a\\)b", "ab", 2),
        ("\\(*\\)", "*", 1),
        ("\\(x$\\)", "x", 1),
    ] {
        assert!(matches!(
            candidate::find(pattern, subject, 0, test_options(candidate::Syntax::Basic, true, true, false, false)),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end }) if end == expected
        ));
    }

    assert!(matches!(
        candidate::find(
            "\\(^b\\)",
            "^b",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn quoted_regex_prefix_matches_literal_text() {
    assert!(matches!(
        candidate::find(
            "***=a*b",
            "za*b",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
    assert!(matches!(
        candidate::find(
            "***=A*B",
            "za*b",
            0,
            test_options(candidate::Syntax::Advanced, false, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 4 })
    ));
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
        assert!(matches!(
            candidate::find(pattern, subject, 0, test_options(candidate::Syntax::Advanced, true, true, false, false)),
            candidate::MatchOutcome::Found(candidate::MatchSpan { start: actual_start, end: actual_end })
                if actual_start == start && actual_end == end
        ));
    }
    assert!(matches!(
        candidate::find(
            "(?m)a.b",
            "a\nb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn bracket_word_boundaries_match_postgres_spelling() {
    assert!(matches!(
        candidate::find(
            "[[:<:]]a",
            " a",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 1, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "a[[:>:]]",
            "a!",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
}

#[test]
fn two_capture_backrefs_preserve_empty_participating_groups() {
    assert!(matches!(
        candidate::find(
            "(a?)(b)\\1",
            "bb",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find(
            "(a*)(a*)\\2\\1",
            "aaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        candidate::find(
            "(a*?)(a+)\\1",
            "aaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 1 })
    ));
    assert!(matches!(
        candidate::find(
            "(a+?)(a+)\\1",
            "aaaa",
            0,
            test_options(candidate::Syntax::Advanced, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
}

#[test]
fn basic_bounded_group_preserves_last_backreference() {
    assert!(matches!(
        candidate::find(
            "\\(ab\\)\\{1,2\\}\\1",
            "ababab",
            0,
            test_options(candidate::Syntax::Basic, true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 6 })
    ));
}

#[test]
fn angle_word_escapes_follow_the_selected_syntax() {
    assert!(matches!(
        candidate::find(
            "a\\<b",
            "a<b",
            0,
            test_options(test_syntax('a'), true, true, false, false)
        ),
        candidate::MatchOutcome::Found(candidate::MatchSpan { start: 0, end: 3 })
    ));
    assert!(matches!(
        candidate::find(
            "a\\<b",
            "a<b",
            0,
            test_options(test_syntax('b'), true, true, false, false)
        ),
        candidate::MatchOutcome::NoMatch
    ));
}

#[test]
fn capture_compiler_rejects_invalid_collating_elements_and_equivalence_ranges() {
    for pattern in [
        "[[..]]",
        "[[==]]",
        "[[.missing.]]",
        "[[=missing=]]",
        "[[.Zero.]]",
        "[[.ab.]]",
        "[[.a=]]",
        "[[.a.]",
        "[[=a=]-z]",
        "[a-[=z=]]",
        "[[=a=]-[=z=]]",
        "[[.z.]-[.a.]]",
    ] {
        assert!(
            matches!(
                candidate::find(
                    pattern,
                    "az",
                    0,
                    test_options(candidate::Syntax::Advanced, true, true, false, false)
                ),
                candidate::MatchOutcome::InvalidPattern
            ),
            "{pattern}"
        );
    }
}

#[test]
fn invalid_inline_flags_and_assertion_backreferences_are_rejected() {
    for pattern in ["(?z)a", "(a)(?=\\1)"] {
        assert!(matches!(
            candidate::find(
                pattern,
                "aaaa",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::InvalidPattern
        ));
    }
}

#[test]
fn capture_compiler_obeys_syntax_switch_restrictions() {
    for pattern in [
        "(?e)a+?",
        "(?e)(?:a)",
        "(?e)(?=a)",
        "(?b)\\(a",
        "(?b)a\\{2,1\\}",
        "(?b)a\\1",
        "(?b)\\(a\\1\\)",
        "(?e)[z-a]",
    ] {
        assert!(matches!(
            candidate::find(
                pattern,
                "aaaa",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::InvalidPattern
        ));
    }
}

#[test]
fn capture_compiler_rejects_invalid_escapes_and_quantified_assertions() {
    for pattern in [
        r"\x",
        r"\u006",
        r"\U0000000",
        r"\c",
        r"\U80000000",
        r"\x80000061",
        r"(?x)\u00 61",
        r"\A*",
        r"\y+",
        r"[\A]",
        r"[\1]",
        r"()()()()()()()()()()()()[\12]",
    ] {
        assert!(matches!(
            candidate::find(
                pattern,
                "aaaa",
                0,
                test_options(candidate::Syntax::Advanced, true, true, false, false)
            ),
            candidate::MatchOutcome::InvalidPattern
        ));
    }
}

#[test]
fn unified_operations_preserve_uncertainty_at_resource_limits() {
    let options = candidate::RegexOptions {
        syntax: candidate::Syntax::Advanced,
        newline: candidate::NewlineMode::Ordinary,
        case_sensitive: true,
        expanded: false,
    };
    for pattern in [
        "(a{255}){255}".to_owned(),
        format!("{}a{}", "(?=".repeat(65), ")".repeat(65)),
    ] {
        assert!(matches!(
            candidate::find(&pattern, "a", 0, options),
            candidate::MatchOutcome::Uncertain
        ));
        assert!(matches!(
            candidate::count(&pattern, "a", 0, options),
            candidate::CountOutcome::Uncertain
        ));
    }
    let subject = "a".repeat(250000);
    assert!(matches!(
        candidate::find("(?=a)(?=a)", &subject, 0, options),
        candidate::MatchOutcome::Found(_)
    ));
    assert!(matches!(
        candidate::count("(?=a)(?=a)", &subject, 0, options),
        candidate::CountOutcome::Uncertain
    ));
    assert!(matches!(
        candidate::count("[", "", 100, options),
        candidate::CountOutcome::InvalidPattern
    ));
    assert!(matches!(
        candidate::find("[", "", 100, options),
        candidate::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn unified_operations_match_every_postgres_fixture() {
    let mut finds = 0;
    let mut counts = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
        include_str!("../conformance/targeted-postgres-fixtures.json"),
        include_str!("../conformance/stress-position-fixtures.json"),
        include_str!("../conformance/stress-boundary-fixtures.json"),
        include_str!("../conformance/stress-classification-fixtures.json"),
    ] {
        let document: Value = serde_json::from_str(source).unwrap();
        for fixture in document["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let options = &input["options"];
            let syntax = match options["syntax"].as_str().unwrap() {
                "advanced" => candidate::Syntax::Advanced,
                "basic" => candidate::Syntax::Basic,
                "extended" => candidate::Syntax::Extended,
                "literal" => candidate::Syntax::Literal,
                other => panic!("unexpected syntax: {other}"),
            };
            let newline = match options["newline"].as_str().unwrap() {
                "ordinary" => candidate::NewlineMode::Ordinary,
                "sensitive" => candidate::NewlineMode::Sensitive,
                "stop" => candidate::NewlineMode::Stop,
                "anchors" => candidate::NewlineMode::Anchors,
                other => panic!("unexpected newline mode: {other}"),
            };
            let options = candidate::RegexOptions {
                syntax,
                newline,
                case_sensitive: options["caseSensitive"].as_bool().unwrap(),
                expanded: options["expanded"].as_bool().unwrap(),
            };
            let pattern = input["pattern"].as_str().unwrap();
            let subject = input["subject"].as_str().unwrap();
            let from = input["start"].as_u64().unwrap_or(1) as usize - 1;
            let actual = if fixture["operation"] == "count" {
                counts += 1;
                match candidate::count(pattern, subject, from, options) {
                    candidate::CountOutcome::Count(value) => json!({"kind":"Count", "value":value}),
                    candidate::CountOutcome::InvalidPattern => {
                        json!({"kind":"InvalidPattern", "sqlstate":"2201B"})
                    }
                    candidate::CountOutcome::Uncertain => json!({"kind":"Uncertain"}),
                }
            } else {
                assert!(fixture["operation"].is_null() || fixture["operation"] == "find");
                finds += 1;
                match candidate::find(pattern, subject, from, options) {
                    candidate::MatchOutcome::Found(span) => {
                        json!({"kind":"Found", "value":{"start":span.start,"end":span.end}})
                    }
                    candidate::MatchOutcome::NoMatch => json!({"kind":"NoMatch"}),
                    candidate::MatchOutcome::InvalidPattern => {
                        json!({"kind":"InvalidPattern", "sqlstate":"2201B"})
                    }
                    candidate::MatchOutcome::Uncertain => json!({"kind":"Uncertain"}),
                }
            };
            assert_eq!(actual, fixture["expected"], "unified operation: {input}");
        }
    }
    assert!(finds > 0 && counts > 0);
    eprintln!("unified operations: {finds} find and {counts} count PostgreSQL fixtures");
}
