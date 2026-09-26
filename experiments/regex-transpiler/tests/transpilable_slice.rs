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
                && options["expanded"] == false
                && candidate::supports_simple_advanced(pattern)
            {
                advanced += 1;
                let newline = options["newline"].as_str().unwrap();
                newline_modes.insert(newline.to_string());
                let crosses_newline = newline == "ordinary" || newline == "anchors";
                let line_anchors = newline == "sensitive" || newline == "anchors";
                let actual = candidate::find_simple_advanced(
                    pattern,
                    subject,
                    from,
                    options["caseSensitive"].as_bool().unwrap(),
                    crosses_newline,
                    line_anchors,
                );
                if pattern == "." {
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
                    "\r", "\u{000b}", "a.b", "a+b", "^a", "a$", "a\\b", "(a)", "[a]", "zabd",
                    "zacd", "zaed", "ba", ".", "^", "β", "\n", "c", "a\nc", "abc", "zac", "B", "5",
                    "y", "m", "a2b", "-", "]", "za]", "a😀", "a😀\n", "a-", "ab", "éa", "_a", "-a",
                    "5_", "😀a",
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
        "a*", "a|b", "a\\nb", "[z-a]", "[a-b-c]", "[A-z]", "[--a]", "[a--]", "[---]", "[^]", "[]",
        "[a", "(ab)", "a{2}", "a?", "a\\", "\\B",
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
        "a|b",
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
        "[--a]",
        "[a--]",
        "[---]",
        "[^]",
        "[]",
        "[a",
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
