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
fn fixed_lookbehind_gate_requires_literal_prefix() {
    assert!(candidate::supports_fixed_lookbehind("(?<=ab)c", false));
    for pattern in ["(?<=a|b)c", "(?<=a+)c", "(?<=a\\n)b", "(?=a)b"] {
        assert!(!candidate::supports_fixed_lookbehind(pattern, false));
    }
}

#[test]
fn leading_lookahead_gate_rejects_nested_assertions() {
    assert!(candidate::supports_leading_lookahead("(?=ab)a.", false));
    for pattern in ["(?=(ab))a", "(?=[ab])a", "a(?=b)b", "(?=a\\nb)a"] {
        assert!(!candidate::supports_leading_lookahead(pattern, false));
    }
}

#[test]
fn fixed_backref_gate_requires_literal_capture() {
    assert!(candidate::supports_fixed_backref("(ab)c\\1", false));
    for pattern in ["([ab])\\1", "(a+)\\1", "(a)\\2", "(a)|(b)\\1", "(a)*\\1"] {
        assert!(!candidate::supports_fixed_backref(pattern, false));
    }
}

#[test]
fn inline_gate_accepts_supported_prefix_flags() {
    for pattern in ["(?i)ab", "(?n)^b", "(?x)a b", "(?t)a b"] {
        assert!(candidate::supports_inline_advanced(pattern, false));
    }
    for pattern in ["(?b)a+b", "(?e)a+b", "a(?i)b", "(?z)ab"] {
        assert!(!candidate::supports_inline_advanced(pattern, false));
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
fn supported_search_matches_pglite_fixtures() {
    let mut literal = 0;
    let mut insensitive = 0;
    let mut advanced = 0;
    let mut grouped = 0;
    let mut group_choice = 0;
    let mut lookbehind = 0;
    let mut lookahead = 0;
    let mut backref = 0;
    let mut inline = 0;
    let mut expanded_advanced = 0;
    let mut extended = 0;
    let mut basic = 0;
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
            let actual = if options["syntax"] == "literal"
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
    assert!(insensitive >= 7);
    assert!(advanced >= 100);
    assert!(grouped >= 20);
    assert!(group_choice >= 20);
    assert!(lookbehind >= 20);
    assert!(lookahead >= 20);
    assert!(backref >= 20);
    assert!(inline >= 20);
    assert!(expanded_advanced >= 200);
    assert!(extended >= 50);
    assert!(basic >= 50);
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
        "[z-a]", "[a-b-c]", "[A-z]", "[--a]", "[a--]", "[---]", "[^]", "[]", "[a", "[\\d-~]",
        "[a-\\d]", "[\\q]", "(ab)", "a{256}", "a{3,1}", "a{2,", "a*{foo}", "a{2}{3}", "a\\", "a**",
        "a*??", "^*", "\\m+", "{2}",
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
