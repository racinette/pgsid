#[path = "../regex_engine_transpilable.rs"]
mod engine;

use serde_json::{json, Value};
use std::collections::{BTreeMap, HashSet};

fn default_options() -> engine::RegexOptions {
    engine::RegexOptions {
        syntax: engine::Syntax::Advanced,
        case_sensitive: true,
        expanded: false,
        newline: engine::NewlineMode::Ordinary,
    }
}

fn evaluate_count(input: &Value) -> Value {
    let from = input["start"].as_u64().unwrap_or(1) as usize - 1;
    match engine::count(
        input["pattern"].as_str().unwrap(),
        input["subject"].as_str().unwrap(),
        from,
        options(input),
    ) {
        engine::CountOutcome::Count(value) => json!({"kind":"Count", "value":value}),
        engine::CountOutcome::InvalidPattern => {
            json!({"kind":"InvalidPattern", "sqlstate":"2201B"})
        }
        engine::CountOutcome::Uncertain => json!({"kind":"Uncertain"}),
    }
}

impl std::fmt::Debug for engine::MatchOutcome {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Found(span) => f
                .debug_struct("Found")
                .field("start", &span.start)
                .field("end", &span.end)
                .finish(),
            Self::NoMatch => f.write_str("NoMatch"),
            Self::InvalidPattern => f.write_str("InvalidPattern"),
            Self::Uncertain => f.write_str("Uncertain"),
        }
    }
}

impl std::fmt::Debug for engine::Syntax {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Advanced => "Advanced",
            Self::Basic => "Basic",
            Self::Extended => "Extended",
            Self::Literal => "Literal",
        })
    }
}

impl std::fmt::Debug for engine::NewlineMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Ordinary => "Ordinary",
            Self::Sensitive => "Sensitive",
            Self::Stop => "Stop",
            Self::Anchors => "Anchors",
        })
    }
}

fn options(input: &Value) -> engine::RegexOptions {
    let options = &input["options"];
    engine::RegexOptions {
        syntax: match options["syntax"].as_str().unwrap() {
            "advanced" => engine::Syntax::Advanced,
            "extended" => engine::Syntax::Extended,
            "basic" => engine::Syntax::Basic,
            "literal" => engine::Syntax::Literal,
            other => panic!("unknown syntax {other}"),
        },
        case_sensitive: options["caseSensitive"].as_bool().unwrap(),
        expanded: options["expanded"].as_bool().unwrap(),
        newline: match options["newline"].as_str().unwrap() {
            "ordinary" => engine::NewlineMode::Ordinary,
            "sensitive" => engine::NewlineMode::Sensitive,
            "stop" => engine::NewlineMode::Stop,
            "anchors" => engine::NewlineMode::Anchors,
            other => panic!("unknown newline mode {other}"),
        },
    }
}

fn evaluate(input: &Value) -> Option<Value> {
    let pattern = input["pattern"].as_str().unwrap();
    let subject = input["subject"].as_str().unwrap();
    let from = input["start"].as_u64().unwrap_or(1) as usize - 1;
    match engine::find(pattern, subject, from, options(input)) {
        engine::MatchOutcome::Found(span) => {
            Some(json!({"kind":"Found", "value":{"start":span.start,"end":span.end}}))
        }
        engine::MatchOutcome::NoMatch => Some(json!({"kind":"NoMatch"})),
        engine::MatchOutcome::InvalidPattern => {
            Some(json!({"kind":"InvalidPattern", "sqlstate":"2201B"}))
        }
        engine::MatchOutcome::Uncertain => None,
    }
}

#[test]
fn rust_definite_results_match_postgres() {
    let fixtures: Value =
        serde_json::from_str(include_str!("../conformance/postgres-fixtures.json")).unwrap();
    let cases = fixtures["fixtures"].as_array().unwrap();
    let mut definite = 0;
    let mut uncertain = 0;
    let mut mismatches = Vec::new();

    for (index, fixture) in cases.iter().enumerate() {
        let input = &fixture["input"];
        let pattern = input["pattern"].as_str().unwrap();
        let subject = input["subject"].as_str().unwrap();
        let expected = &fixture["expected"];
        let Some(actual) = evaluate(input) else {
            uncertain += 1;
            continue;
        };
        definite += 1;
        if actual != *expected {
            mismatches.push(format!(
                "fixture {index}: pattern={pattern:?}, subject={subject:?}, options={}, expected={expected}, actual={actual}",
                input["options"]
            ));
        }
    }

    eprintln!("Rust regex: {definite} definite, {uncertain} uncertain");
    assert!(cases.len() >= 617, "PostgreSQL fixture coverage shrank");
    assert_eq!(definite, cases.len(), "Rust engine lost definite coverage");
    assert_eq!(uncertain, 0, "Rust engine left a fixture uncertain");
    assert!(mismatches.is_empty(), "{}", mismatches.join("\n"));
}

#[test]
fn rust_stress_results_match_postgres() {
    let extracted: Value =
        serde_json::from_str(include_str!("../conformance/postgres-fixtures.json")).unwrap();
    let stress: Value =
        serde_json::from_str(include_str!("../conformance/stress-fixtures.json")).unwrap();
    assert_eq!(stress["schemaVersion"], 1);
    assert_eq!(stress["oracle"]["collation"], "C");
    assert_eq!(stress["generatorSeed"], 99540248);
    assert_eq!(
        stress["oracle"]["serverVersion"],
        extracted["oracle"]["serverVersion"]
    );
    let mut tuples: HashSet<String> = extracted["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .map(|fixture| serde_json::to_string(&fixture["input"]).unwrap())
        .collect();
    let original_count = tuples.len();
    let cases = stress["fixtures"].as_array().unwrap();
    let mut ids = HashSet::new();
    let mut family = BTreeMap::new();
    let mut syntax = BTreeMap::new();
    let mut newline = BTreeMap::new();
    let mut case_sensitive = BTreeMap::new();
    let mut expanded = BTreeMap::new();
    let mut expanded_newline = BTreeMap::new();
    let mut outcome = BTreeMap::new();
    let mut family_outcome = BTreeMap::new();
    let mut mismatches = Vec::new();

    for fixture in cases {
        let id = fixture["id"].as_str().unwrap();
        let label = fixture["family"].as_str().unwrap();
        let input = &fixture["input"];
        let expected = &fixture["expected"];
        assert!(ids.insert(id), "duplicate stress id {id}");
        assert!(
            tuples.insert(serde_json::to_string(input).unwrap()),
            "stress input {id} duplicates another input"
        );
        *family.entry(label.to_string()).or_insert(0usize) += 1;
        *syntax
            .entry(input["options"]["syntax"].as_str().unwrap().to_string())
            .or_insert(0usize) += 1;
        *newline
            .entry(input["options"]["newline"].as_str().unwrap().to_string())
            .or_insert(0usize) += 1;
        *case_sensitive
            .entry(input["options"]["caseSensitive"].as_bool().unwrap())
            .or_insert(0usize) += 1;
        *expanded
            .entry(input["options"]["expanded"].as_bool().unwrap())
            .or_insert(0usize) += 1;
        *expanded_newline
            .entry((
                input["options"]["expanded"].as_bool().unwrap(),
                input["options"]["newline"].as_str().unwrap().to_string(),
            ))
            .or_insert(0usize) += 1;
        *outcome
            .entry(expected["kind"].as_str().unwrap().to_string())
            .or_insert(0usize) += 1;
        *family_outcome
            .entry((
                label.to_string(),
                expected["kind"].as_str().unwrap().to_string(),
            ))
            .or_insert(0usize) += 1;
        match evaluate(input) {
            Some(actual) if actual == *expected => {}
            actual => mismatches.push(format!(
                "{id} ({label}): input={input}, expected={expected}, actual={actual:?}"
            )),
        }
    }
    assert!(cases.len() >= 1000, "stress corpus shrank");
    assert_eq!(tuples.len() - original_count, cases.len());
    assert!(family.values().all(|count| *count < cases.len() / 2));
    assert_eq!(family.len(), 21);
    for name in [
        "precedence",
        "repetition",
        "zero_width",
        "captures_backrefs",
        "lookaround",
        "brackets_classes",
        "escaped_bounds",
        "basic",
        "extended",
        "inline",
        "unicode",
        "invalid",
        "literal",
        "backref_unicode",
        "lookaround_newline",
        "expanded_interactions",
        "basic_interactions",
        "extended_interactions",
        "basic_mutations",
        "extended_mutations",
        "capture_ambiguity",
    ] {
        let minimum = if name == "literal" {
            20
        } else if name == "capture_ambiguity" {
            100
        } else if name.ends_with("_interactions")
            || name.ends_with("_mutations")
            || name == "backref_unicode"
            || name == "lookaround_newline"
            || name == "capture_ambiguity"
        {
            90
        } else {
            70
        };
        assert!(
            family.get(name).copied().unwrap_or(0) >= minimum,
            "{name} family coverage shrank"
        );
    }
    for (kind, minimum) in [("Found", 400), ("NoMatch", 300), ("InvalidPattern", 80)] {
        assert!(
            outcome.get(kind).copied().unwrap_or(0) >= minimum,
            "{kind} outcomes shrank"
        );
    }
    assert!(
        family_outcome
            .get(&("basic_mutations".to_string(), "InvalidPattern".to_string()))
            .copied()
            .unwrap_or(0)
            >= 90
    );
    assert!(
        family_outcome
            .get(&(
                "extended_mutations".to_string(),
                "InvalidPattern".to_string()
            ))
            .copied()
            .unwrap_or(0)
            >= 70
    );
    for kind in ["Found", "NoMatch"] {
        assert!(
            family_outcome
                .get(&("extended_mutations".to_string(), kind.to_string()))
                .copied()
                .unwrap_or(0)
                > 0,
            "Extended mutation oracle lost {kind} outcomes"
        );
    }
    for (mode, minimum) in [
        ("ordinary", 300),
        ("sensitive", 150),
        ("stop", 100),
        ("anchors", 150),
    ] {
        assert!(
            newline.get(mode).copied().unwrap_or(0) >= minimum,
            "{mode} newline coverage shrank"
        );
    }
    for (mode, minimum) in [
        ("advanced", 700),
        ("basic", 70),
        ("extended", 70),
        ("literal", 20),
    ] {
        assert!(
            syntax.get(mode).copied().unwrap_or(0) >= minimum,
            "{mode} syntax coverage shrank"
        );
    }
    assert!(case_sensitive.get(&false).copied().unwrap_or(0) >= 300);
    assert!(expanded.get(&true).copied().unwrap_or(0) >= 300);
    assert!(
        expanded_newline
            .get(&(true, "stop".to_string()))
            .copied()
            .unwrap_or(0)
            >= 80
    );
    eprintln!("stress coverage: family={family:?}, syntax={syntax:?}, newline={newline:?}, caseSensitive={case_sensitive:?}, expanded={expanded:?}, outcome={outcome:?}");
    assert!(
        mismatches.is_empty(),
        "{} stress mismatches:\n{}",
        mismatches.len(),
        mismatches.join("\n")
    );
}

#[test]
fn repeated_capture_backreferences_follow_postgres_path_preference() {
    for (pattern, subject, end) in [
        (r"(a|aa){2}\1", "aaaaa", 4),
        (r"(a|aa){2}\1", "aaaaaa", 6),
        (r"((a|aa){1,2})\2", "aaaaa", 4),
        (r"((a|aa)+)\2", "aaaaa", 5),
    ] {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end }),
            "{pattern:?} on {subject:?}"
        );
    }
}

#[test]
fn expanded_basic_and_extended_patterns_are_definite() {
    for (syntax, pattern, subject, expected) in [
        (
            engine::Syntax::Basic,
            r"a\{2,3\}b",
            "aaab",
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 4 }),
        ),
        (
            engine::Syntax::Extended,
            r"a\wb",
            "awb",
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 }),
        ),
    ] {
        let options = engine::RegexOptions {
            syntax,
            expanded: true,
            ..default_options()
        };

        assert_eq!(engine::find(pattern, subject, 0, options), expected);
    }
    let options = engine::RegexOptions {
        expanded: true,
        ..default_options()
    };
    assert!(matches!(
        engine::find("[a-", "", 0, options),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn rust_position_results_match_postgres() {
    let document: Value =
        serde_json::from_str(include_str!("../conformance/stress-position-fixtures.json")).unwrap();
    assert_eq!(document["schemaVersion"], 1);
    assert_eq!(document["oracle"]["collation"], "C");
    let cases = document["fixtures"].as_array().unwrap();
    let mut ids = HashSet::new();
    let mut inputs = HashSet::new();
    let mut operation_counts = BTreeMap::new();
    let mut mismatches = Vec::new();
    for fixture in cases {
        let id = fixture["id"].as_str().unwrap();
        let operation = fixture["operation"].as_str().unwrap();
        let input = &fixture["input"];
        assert!(ids.insert(id));
        assert!(inputs.insert(format!(
            "{operation}:{}",
            serde_json::to_string(input).unwrap()
        )));
        *operation_counts.entry(operation).or_insert(0usize) += 1;
        let actual = match operation {
            "find" => evaluate(input),
            "count" => Some(evaluate_count(input)),
            other => panic!("unknown operation {other}"),
        };
        if actual.as_ref() != Some(&fixture["expected"]) {
            mismatches.push(format!(
                "{id} ({operation}): input={input}, expected={}, actual={actual:?}",
                fixture["expected"]
            ));
        }
    }
    assert_eq!(cases.len(), 360);
    assert_eq!(operation_counts.get("find"), Some(&180));
    assert_eq!(operation_counts.get("count"), Some(&180));
    assert!(
        mismatches.is_empty(),
        "{} position mismatches:\n{}",
        mismatches.len(),
        mismatches.join("\n")
    );
}

#[test]
fn rust_boundary_results_match_postgres() {
    let document: Value =
        serde_json::from_str(include_str!("../conformance/stress-boundary-fixtures.json")).unwrap();
    assert_eq!(document["schemaVersion"], 1);
    assert_eq!(document["oracle"]["collation"], "C");
    let cases = document["fixtures"].as_array().unwrap();
    let mut ids = HashSet::new();
    let mut boundaries = BTreeMap::new();
    let mut mismatches = Vec::new();
    for fixture in cases {
        let id = fixture["id"].as_str().unwrap();
        let boundary = fixture["boundary"].as_str().unwrap();
        let side = fixture["side"].as_str().unwrap();
        let input = &fixture["input"];
        assert!(ids.insert(id));
        *boundaries.entry(boundary).or_insert(0usize) += 1;
        let pattern = input["pattern"].as_str().unwrap();
        let subject = input["subject"].as_str().unwrap();
        let increment = if side == "at" { 0 } else { 1 };
        match boundary {
            "pattern_scalars" | "pattern_unicode_scalars" => {
                assert_eq!(pattern.chars().count(), 3072 + increment);
            }
            "subject_scalars" | "subject_unicode_scalars" | "backreference_subject_scalars" => {
                assert_eq!(subject.chars().count(), 4096 + increment);
            }
            "lookbehind_subject_scalars" => {
                assert_eq!(subject.chars().count(), 256 + increment);
            }
            "capture_groups" | "backreference_capture_groups" => {
                assert_eq!(pattern.matches("(a)").count(), 128 + increment);
            }
            "group_depth" => {
                assert_eq!(
                    pattern
                        .chars()
                        .filter(|character| *character == '(')
                        .count(),
                    64 + increment
                );
            }
            "group_depth_wide" => {
                assert_eq!(
                    pattern
                        .chars()
                        .filter(|character| *character == '(')
                        .count(),
                    512 + increment
                );
            }
            "bound_value" => {
                assert_eq!(pattern, format!("a{{{}}}", 255 + increment));
            }
            other => panic!("unknown boundary {other}"),
        }
        let actual = evaluate(input);
        if actual.as_ref() != Some(&fixture["expected"]) {
            mismatches.push(format!(
                "{id}: expected={}, actual={actual:?}",
                fixture["expected"]
            ));
        }
    }
    assert_eq!(boundaries.len(), 11);
    assert!(boundaries.values().all(|count| *count == 2));
    assert!(
        mismatches.is_empty(),
        "{} boundary mismatches:\n{}",
        mismatches.len(),
        mismatches.join("\n")
    );
}

#[test]
fn rust_classification_results_match_postgres() {
    let document: Value = serde_json::from_str(include_str!(
        "../conformance/stress-classification-fixtures.json"
    ))
    .unwrap();
    assert_eq!(document["schemaVersion"], 1);
    assert_eq!(document["oracle"]["collation"], "C");
    let cases = document["fixtures"].as_array().unwrap();
    assert!(cases.len() >= 100, "classification coverage shrank");
    let mut ids = HashSet::new();
    let mut mismatches = Vec::new();
    for fixture in cases {
        let id = fixture["id"].as_str().unwrap();
        assert!(ids.insert(id), "duplicate classification id {id}");
        let actual = evaluate(&fixture["input"]);
        if actual.as_ref() != Some(&fixture["expected"]) {
            mismatches.push(format!(
                "{id}: expected={}, actual={actual:?}",
                fixture["expected"]
            ));
        }
    }
    assert!(
        mismatches.is_empty(),
        "{} classification mismatches:\n{}",
        mismatches.len(),
        mismatches.join("\n")
    );
}

#[test]
fn absolute_anchors_ignore_newline_mode_and_search_offset() {
    for newline in [
        engine::NewlineMode::Ordinary,
        engine::NewlineMode::Sensitive,
        engine::NewlineMode::Stop,
        engine::NewlineMode::Anchors,
    ] {
        let options = engine::RegexOptions {
            newline,
            ..default_options()
        };

        assert_eq!(
            engine::find("\\A", "a\nb", 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 0 })
        );
        assert_eq!(
            engine::find("\\A", "a\nb", 1, options),
            engine::MatchOutcome::NoMatch
        );

        assert_eq!(
            engine::find("\\Z", "a\nb", 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 3, end: 3 })
        );
        assert_eq!(
            engine::find("\\Z", "a\nb", 2, options),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 3, end: 3 })
        );
    }
    for pattern in ["\\A*", "\\Z+", "\\A{2}", "\\Z?"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "bare absolute-anchor repetition {pattern:?}"
        );
    }
}

#[test]
fn long_patterns_remain_definite() {
    let default_options = default_options();
    for length in [3072, 3073] {
        assert_eq!(
            engine::find(&"a".repeat(length), "", 0, default_options),
            engine::MatchOutcome::NoMatch
        );
    }

    let fixtures: Value =
        serde_json::from_str(include_str!("../conformance/postgres-fixtures.json")).unwrap();
    let oversized: Vec<&Value> = fixtures["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|fixture| {
            fixture["input"]["pattern"]
                .as_str()
                .unwrap()
                .chars()
                .count()
                > 1024
        })
        .collect();
    assert_eq!(oversized.len(), 2);
    assert!(oversized.iter().any(|fixture| {
        fixture["input"]["pattern"]
            .as_str()
            .unwrap()
            .chars()
            .count()
            > 2048
    }));
    for fixture in oversized {
        let pattern = fixture["input"]["pattern"].as_str().unwrap();

        assert_eq!(
            engine::find(pattern, "", 0, options(&fixture["input"])),
            engine::MatchOutcome::NoMatch
        );
    }
}

#[test]
fn sequential_captures_without_backreferences_remain_definite() {
    let options = default_options();
    for length in [128, 129] {
        assert_eq!(
            engine::find(&"(a)".repeat(length), "", 0, options),
            engine::MatchOutcome::NoMatch
        );
    }
}

#[test]
fn deeply_nested_groups_parse_and_match_without_recursion() {
    let advanced = format!("{}a{}", "(".repeat(512), ")".repeat(512));

    assert_eq!(
        engine::find(&advanced, "a", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
    );

    let basic = format!("{}a{}", "\\(".repeat(512), "\\)".repeat(512));
    let options = engine::RegexOptions {
        syntax: engine::Syntax::Basic,
        ..default_options()
    };

    assert_eq!(
        engine::find(&basic, "a", 0, options),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
    );

    assert!(matches!(
        engine::find(&"(".repeat(8192), "", 0, default_options()),
        engine::MatchOutcome::InvalidPattern
    ));
    assert!(matches!(
        engine::find(
            &format!("{}a{}[", "(".repeat(8192), ")".repeat(8192)),
            "",
            0,
            default_options()
        ),
        engine::MatchOutcome::InvalidPattern
    ));
    assert!(matches!(
        engine::find(
            &format!("{}a{}\\1", "(".repeat(65), ")".repeat(65)),
            "aa",
            0,
            default_options()
        ),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 2 })
    ));
    assert!(matches!(
        engine::find(
            &format!("{}a{}", "(?=".repeat(65), ")".repeat(65)),
            "",
            0,
            default_options()
        ),
        engine::MatchOutcome::Uncertain
    ));
}

#[test]
fn nested_bounds_that_expand_beyond_the_automaton_budget_are_uncertain() {
    assert!(matches!(
        engine::find("((a{255}){255}){255}", "", 0, default_options()),
        engine::MatchOutcome::Uncertain
    ));
}

#[test]
fn bracket_leading_punctuation_and_missing_closure_follow_postgres() {
    for syntax in [engine::Syntax::Advanced, engine::Syntax::Basic] {
        let options = engine::RegexOptions {
            syntax,
            ..default_options()
        };
        for (pattern, subject) in [("a[--?]b", "a?b"), ("a[---]b", "a-b"), ("a[]b]c", "a]c")] {
            assert_eq!(
                engine::find(pattern, subject, 0, options),
                engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 }),
                "{pattern:?} in {syntax:?}"
            );
        }
        for pattern in ["a[", "a[b", "a[b-", "a[b-c", "a[a-b-c]"] {
            assert!(
                matches!(
                    engine::find(pattern, "", 0, options),
                    engine::MatchOutcome::InvalidPattern
                ),
                "malformed bracket {pattern:?} in {syntax:?}"
            );
        }
    }
}

#[test]
fn c_collation_collating_elements_and_equivalence_classes() {
    for syntax in [engine::Syntax::Advanced, engine::Syntax::Basic] {
        let options = engine::RegexOptions {
            syntax,
            ..default_options()
        };
        for (pattern, subject) in [
            ("a[[.-.]]", "a-"),
            ("a[[.zero.]]", "a0"),
            ("a[[.zero.]-9]", "a5"),
            ("a[0-[.9.]]", "a5"),
            ("a[[b]c", "a[c"),
        ] {
            assert_eq!(
                engine::find(pattern, subject, 0, options),
                engine::MatchOutcome::Found(engine::MatchSpan {
                    start: 0,
                    end: subject.chars().count(),
                }),
                "{pattern:?} in {syntax:?}"
            );
        }
        for case_sensitive in [true, false] {
            let options = engine::RegexOptions {
                case_sensitive,
                ..options
            };

            assert_eq!(
                engine::find("a[[=Y=]]", "ay", 0, options),
                if case_sensitive {
                    engine::MatchOutcome::NoMatch
                } else {
                    engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 2 })
                }
            );
        }
        for pattern in [
            "a[[..]]b",
            "a[[==]]b",
            "a[[::]]b",
            "a[[.a",
            "a[[=a",
            "a[0-[=x=]]",
        ] {
            assert!(
                matches!(
                    engine::find(pattern, "", 0, options),
                    engine::MatchOutcome::InvalidPattern
                ),
                "malformed collating element {pattern:?} in {syntax:?}"
            );
        }
    }
    assert!(matches!(
        engine::find("[[.unknown-name.]]", "", 0, default_options()),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn bracket_backslashes_follow_syntax_mode() {
    let advanced = default_options();
    let basic = engine::RegexOptions {
        syntax: engine::Syntax::Basic,
        ..advanced
    };

    assert_eq!(
        engine::find(r"a[\]]b", "a]b", 0, advanced),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 })
    );

    assert_eq!(
        engine::find(r"a[\]]b", "a\\]b", 0, basic),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 4 })
    );

    assert_eq!(
        engine::find(r"[\cH]", "\u{0008}", 0, advanced),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
    );
    assert!(matches!(
        engine::find(r"a[\Z]b", "", 0, advanced),
        engine::MatchOutcome::InvalidPattern
    ));
    assert!(matches!(
        engine::find(r"[\D-a]", "", 0, advanced),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn literal_syntax_keeps_a_pattern_prefix_literal() {
    let options = engine::RegexOptions {
        syntax: engine::Syntax::Literal,
        ..default_options()
    };

    assert_eq!(
        engine::find("***=a*b", "***=a*b", 0, options),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 7 })
    );
}

#[test]
fn grouped_anchor_can_be_repeated() {
    assert_eq!(
        engine::find("(^)+^", "x", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 0 })
    );
}

#[test]
fn noncapturing_groups_and_lookahead_preserve_constraint_position() {
    let cases = [
        ("a(?:)b", "ab", Some((0, 2))),
        ("a(?:b|c)c", "acc", Some((0, 3))),
        ("a(?=b)b*", "abbb", Some((0, 4))),
        ("a(?=b)b*", "a", None),
        ("a(?!b)b*", "a", Some((0, 1))),
        ("a(?!b)b*", "ab", None),
        ("(?=a|ab)ab", "ab", Some((0, 2))),
        ("((?=a))*a", "a", Some((0, 1))),
    ];
    for (pattern, subject, span) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            match span {
                Some((start, end)) => {
                    engine::MatchOutcome::Found(engine::MatchSpan { start, end })
                }
                None => engine::MatchOutcome::NoMatch,
            },
            "group or lookahead {pattern:?}"
        );
    }

    for pattern in ["(?=a)*", "(?=a)?", "(?=a){0}", "(?!a)+"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "bare lookahead repetition {pattern:?}"
        );
    }
}

#[test]
fn lookbehind_uses_prior_positions_without_losing_subject_context() {
    let cases = [
        ("(?<=a+)b", "aaab", Some((3, 4))),
        ("(?<=a|aa)b", "aab", Some((2, 3))),
        ("(?<=)a", "a", Some((0, 1))),
        ("(?<!)a", "a", None),
        ("(?<!a*)b", "b", None),
        ("(?<!a)b", "b", Some((0, 1))),
        ("(?<=^ab)c", "abc", Some((2, 3))),
        ("(?<=^b)c", "abc", None),
        ("a(?<=a)b", "ab", Some((0, 2))),
        ("(?<=a$)b", "ab", None),
        ("(?<=(?=a)a)b", "ab", Some((1, 2))),
        ("((?<=a))*b", "ab", Some((1, 2))),
    ];
    for (pattern, subject, span) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            match span {
                Some((start, end)) => {
                    engine::MatchOutcome::Found(engine::MatchSpan { start, end })
                }
                None => engine::MatchOutcome::NoMatch,
            },
            "lookbehind {pattern:?} on {subject:?}"
        );
    }

    for pattern in ["(?<=a)*b", "(?<=(a))\\1", "(a)(?<=\\1)b"] {
        assert!(matches!(
            engine::find(pattern, "", 0, default_options()),
            engine::MatchOutcome::InvalidPattern
        ));
    }

    let long_subject = "a".repeat(256) + "b";
    assert_eq!(
        engine::find("(?<=a)b", &long_subject, 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan {
            start: 256,
            end: 257,
        })
    );
    assert!(
        matches!(engine::count("(?<=a)b", &long_subject, 0, default_options()), engine::CountOutcome::Count(value) if value == 1)
    );

    let longer_subject = "a".repeat(8192) + "b";
    assert_eq!(
        engine::find("(?<=a)b", &longer_subject, 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan {
            start: 8192,
            end: 8193,
        })
    );
    assert!(
        matches!(engine::count("(?<=a)b", &longer_subject, 0, default_options()), engine::CountOutcome::Count(value) if value == 1)
    );

    assert_eq!(
        engine::find("(?<=(?<=a)b)c", "abc", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 2, end: 3 })
    );
}

#[test]
fn count_handles_many_matches() {
    assert!(
        matches!(engine::count("a", &"a".repeat(8192), 0, default_options()), engine::CountOutcome::Count(value) if value == 8192)
    );
}

#[test]
fn capture_paths_and_backreferences_match_postgres() {
    let cases = [
        (r"(a*)\1", "aaaaa", Some((0, 4)), 3),
        (r"(a|aa)\1", "aaaaa", Some((0, 4)), 1),
        (r"(a?)\1", "a", Some((0, 0)), 2),
        (r"(a*)\1b", "aaaab", Some((0, 5)), 1),
        (r"((a)|b)\2", "bb", None, 0),
        (r"((a)|b)\2", "aa", Some((0, 2)), 1),
        (r"(a)*\1", "", None, 0),
        (r"(a?)*\1", "", Some((0, 0)), 1),
        (r"((a)?)*\2", "a", None, 0),
        (r"(a|ab)\1", "abab", Some((0, 4)), 1),
        (r"((a)?b)*\2", "bab", None, 0),
        (r"((a)?b)*\2", "abbab", None, 0),
        (r"(?:(a)?b)*\1", "abbab", None, 0),
        (r"(?:(a)?b)*\1", "aba", Some((0, 3)), 1),
        (r"(?:(a)|b)*\1", "aba", None, 0),
        (r"(?:(a)|b)*\1", "abba", None, 0),
        (r"(?:(a)|\1b)*", "aab", Some((0, 2)), 3),
        (r"(?:(a)?b)*\1", "ababaa", Some((0, 5)), 1),
        (r"((a)?b)*\2", "ababaa", Some((0, 5)), 1),
    ];
    for (pattern, subject, span, count) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            match span {
                Some((start, end)) => {
                    engine::MatchOutcome::Found(engine::MatchSpan { start, end })
                }
                None => engine::MatchOutcome::NoMatch,
            },
            "backreference {pattern:?} on {subject:?}"
        );
        assert!(
            matches!(engine::count(pattern, subject, 0, default_options()), engine::CountOutcome::Count(value) if value == count),
            "backreference count {pattern:?} on {subject:?}"
        );
    }

    let options = engine::RegexOptions {
        case_sensitive: false,
        ..default_options()
    };

    assert_eq!(
        engine::find(r"(A)\1", "Aa", 0, options),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 2 })
    );
}

#[test]
fn count_uses_scalar_offsets() {
    let options = default_options();
    assert!(
        matches!(engine::count("a", "aaa", 0, options), engine::CountOutcome::Count(value) if value == 3)
    );
    assert!(
        matches!(engine::count("a", "aaa", 1, options), engine::CountOutcome::Count(value) if value == 2)
    );
    assert!(
        matches!(engine::count("a", "aaa", 4, options), engine::CountOutcome::Count(value) if value == 0)
    );
}

#[test]
fn ascii_class_ranges_and_shorthand_match() {
    assert_eq!(
        engine::find("[a-c]+", "zabc", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 1, end: 4 })
    );

    assert_eq!(
        engine::find(r"\w+\s\d", "éA_ 3", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 1, end: 5 })
    );
}

#[test]
fn newline_modes_control_dot_and_line_anchors_independently() {
    let cases = [
        (engine::NewlineMode::Ordinary, true, false),
        (engine::NewlineMode::Sensitive, false, true),
        (engine::NewlineMode::Stop, false, false),
        (engine::NewlineMode::Anchors, true, true),
    ];
    for (newline, dot_crosses_newline, anchors_match_lines) in cases {
        let options = engine::RegexOptions {
            newline,
            ..default_options()
        };

        assert_eq!(
            engine::find("a.b", "a\nb", 0, options),
            if dot_crosses_newline {
                engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 })
            } else {
                engine::MatchOutcome::NoMatch
            },
            "dot behavior for {newline:?}"
        );

        assert_eq!(
            engine::find("^b", "a\nb", 0, options),
            if anchors_match_lines {
                engine::MatchOutcome::Found(engine::MatchSpan { start: 2, end: 3 })
            } else {
                engine::MatchOutcome::NoMatch
            },
            "beginning anchor behavior for {newline:?}"
        );

        assert_eq!(
            engine::find("a$", "a\nb", 0, options),
            if anchors_match_lines {
                engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
            } else {
                engine::MatchOutcome::NoMatch
            },
            "end anchor behavior for {newline:?}"
        );
    }
}

#[test]
fn newline_stop_excludes_negated_brackets_but_not_complement_shorthand() {
    let options = engine::RegexOptions {
        newline: engine::NewlineMode::Stop,
        ..default_options()
    };

    assert_eq!(
        engine::find("[^0-9]", "\n", 0, options),
        engine::MatchOutcome::NoMatch
    );

    assert_eq!(
        engine::find(r"\D", "\n", 0, options),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
    );
}

#[test]
fn bracket_shorthands_union_before_outer_negation() {
    let cases = [
        (r"[1\D7]", "0123x", 1, 2),
        (r"[^1\D7]", "x0123", 1, 2),
        (r"[\s\S]+", "a\nb", 0, 3),
    ];
    for (pattern, subject, start, end) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan { start, end }),
            "bracket shorthand {pattern:?}"
        );
    }

    let options = engine::RegexOptions {
        newline: engine::NewlineMode::Stop,
        ..default_options()
    };

    assert_eq!(
        engine::find(r"[^\d]", "\n", 0, options),
        engine::MatchOutcome::NoMatch
    );

    assert!(matches!(
        engine::find(r"[\w-~]", "", 0, default_options()),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn literal_pattern_prefix_resets_newline_mode() {
    let options = engine::RegexOptions {
        newline: engine::NewlineMode::Sensitive,
        ..default_options()
    };

    assert_eq!(
        engine::find("***=a.b", "a.b", 0, options),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 })
    );
}

#[test]
fn advanced_control_escapes_match_postgres_characters() {
    let cases = [
        (r"\a", '\u{0007}'),
        (r"\b", '\u{0008}'),
        (r"\B", '\\'),
        (r"\cH", '\u{0008}'),
        (r"\ch", '\u{0008}'),
        (r"\e", '\u{001b}'),
        (r"\f", '\u{000c}'),
        (r"\n", '\n'),
        (r"\r", '\r'),
        (r"\t", '\t'),
        (r"\v", '\u{000b}'),
    ];
    for (pattern, character) in cases {
        assert_eq!(
            engine::find(pattern, &character.to_string(), 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 }),
            "control escape {pattern:?}"
        );
    }
}

#[test]
fn advanced_escape_and_group_errors_match_postgres() {
    for pattern in ["a\\", r"a\z", r"\c", "(?i)(?q)a+", "a(?q)b"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "invalid advanced pattern {pattern:?}"
        );
    }
}

#[test]
fn advanced_inline_comments_skip_through_the_first_closing_parenthesis() {
    for (pattern, options, subject, end) in [
        ("a(?#skip)b", default_options(), "ab", 2),
        ("a(?#skip", default_options(), "ab", 1),
        (
            "a(?# space # inside)b",
            engine::RegexOptions {
                expanded: true,
                ..default_options()
            },
            "ab",
            2,
        ),
    ] {
        assert_eq!(
            engine::find(pattern, subject, 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end }),
            "inline comment {pattern:?}"
        );
    }
}

#[test]
fn numeric_escapes_follow_postgres_digit_consumption() {
    let cases = [
        (r"a\u00088x", "a\u{0008}8x"),
        (r"a\U000012345x", "a\u{1234}5x"),
        (r"a\x41b", "a\u{041b}"),
        (r"a\0777b", "a?7b"),
        (r"\777", "?7"),
        (r"a[\u00fe-\u0507]b", "aĂb"),
    ];
    for (pattern, subject) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan {
                start: 0,
                end: subject.chars().count(),
            }),
            "numeric escape {pattern:?}"
        );
    }

    for pattern in [r"\u008x", r"\U0001234x", r"\xq"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "short or malformed numeric escape {pattern:?}"
        );
    }

    assert_eq!(
        engine::find(r"\uD800", "x", 0, default_options()),
        engine::MatchOutcome::NoMatch
    );
    assert!(matches!(
        engine::find(r"\1", "", 0, default_options()),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn bounded_repetition_covers_exact_ranged_and_open_bounds() {
    let cases = [
        ("(ab){2}", "zabab", 1, 5),
        ("a{2,3}b", "aaaab", 1, 5),
        ("a{0}b", "ab", 1, 2),
        ("a{0,}b", "aaab", 0, 4),
        ("a{1,100}b", "aaab", 0, 4),
    ];
    for (pattern, subject, start, end) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan { start, end }),
            "bounded pattern {pattern:?}"
        );
    }
}

#[test]
fn non_greedy_quantifiers_follow_postgres_match_preference() {
    let cases = [
        ("ab+?", "abb", 2),
        ("ab*?", "abb", 1),
        ("ab??", "ab", 1),
        ("ab{2,4}?", "abbbb", 3),
        ("ab*?c", "abbc", 4),
        ("a*?b+", "aaabbb", 4),
        ("a*b+?", "aaabbb", 6),
        ("(a*?){1}", "aaa", 0),
        ("(a*?){1,1}", "aaa", 3),
        ("(a*?){1,1}?", "aaa", 0),
        ("a*?|abbb", "abbb", 4),
        ("(a*?)b*", "aaabbb", 0),
        ("a*?a*", "aaa", 0),
        ("a*a*?", "aaa", 3),
    ];
    for (pattern, subject, end) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end }),
            "non-greedy pattern {pattern:?}"
        );
    }

    assert!(
        matches!(engine::count("a*?", "aa", 0, default_options()), engine::CountOutcome::Count(value) if value == 3)
    );
}

#[test]
fn malformed_bounds_are_invalid_and_non_numeric_braces_are_literal() {
    for pattern in ["a{1", "a{1n}", "a{1,0}", "a{1,2,3}", "a{256}"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "malformed bound {pattern:?}"
        );
    }

    assert_eq!(
        engine::find("a{b}", "a{b}", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 4 })
    );
}

#[test]
fn c_collation_posix_classes_match_their_defined_ranges() {
    let cases = [
        ("alnum", '7', '-'),
        ("alpha", 'Z', '7'),
        ("ascii", '\u{007f}', 'é'),
        ("blank", '\t', '\n'),
        ("cntrl", '\u{0085}', 'x'),
        ("digit", '7', 'A'),
        ("graph", '~', 'é'),
        ("lower", 'z', 'Z'),
        ("print", ' ', 'é'),
        ("punct", '_', 'A'),
        ("space", '\n', 'é'),
        ("upper", 'Z', 'z'),
        ("word", '_', '-'),
        ("xdigit", 'f', 'g'),
    ];
    for (name, matching, nonmatching) in cases {
        let pattern = format!("^[[:{name}:]]$");

        assert_eq!(
            engine::find(&pattern, &matching.to_string(), 0, default_options()),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 }),
            "POSIX class {name:?} matching character"
        );
        assert_eq!(
            engine::find(&pattern, &nonmatching.to_string(), 0, default_options()),
            engine::MatchOutcome::NoMatch,
            "POSIX class {name:?} nonmatching character"
        );
    }
}

#[test]
fn malformed_posix_classes_are_invalid() {
    for pattern in ["[[:woopsie:]]", "[[:a", "[[:alnum:]-~]", "[0-[:digit:]]"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "malformed POSIX class {pattern:?}"
        );
    }
}

#[test]
fn basic_syntax_uses_escaped_groups_bounds_and_contextual_anchors() {
    let options = engine::RegexOptions {
        syntax: engine::Syntax::Basic,
        ..default_options()
    };
    let cases = [
        (r"\(ab\)\{2\}", "zabab", 1, 5),
        (r"a\{0,1\}b", "ab", 0, 2),
        ("^*", "*", 0, 1),
        ("^^", "^", 0, 1),
        ("x$y", "x$y", 0, 3),
        (r"a\wb", "awb", 0, 3),
        ("a+b|c", "a+b|c", 0, 5),
    ];
    for (pattern, subject, start, end) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan { start, end }),
            "basic pattern {pattern:?}"
        );
    }
    for pattern in [r"a\(b", r"a\)b", r"a\{0,1", "a**", "***", "a\\"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, options),
                engine::MatchOutcome::InvalidPattern
            ),
            "invalid basic pattern {pattern:?}"
        );
    }
    assert!(matches!(
        engine::find(r"a\1", "", 0, options),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn extended_syntax_keeps_escapes_literal() {
    let options = engine::RegexOptions {
        syntax: engine::Syntax::Extended,
        ..default_options()
    };
    for (pattern, subject, end) in [
        (r"a\wb", "awb", 3),
        (r"a\12b", "a12b", 4),
        (r"a\<b", "a<b", 3),
        ("a)b", "a)b", 3),
    ] {
        assert_eq!(
            engine::find(pattern, subject, 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end })
        );
    }
    assert!(matches!(
        engine::find("a(?:b)c", "", 0, options),
        engine::MatchOutcome::InvalidPattern
    ));

    assert_eq!(
        engine::find("(?e)a+", "aaa", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 })
    );
}

#[test]
fn c_collation_case_insensitive_matching_folds_ascii_only() {
    let options = engine::RegexOptions {
        case_sensitive: false,
        ..default_options()
    };
    for (pattern, subject) in [("Ab", "aB"), ("[B-D]", "c"), ("[[:upper:]]", "a")] {
        assert_eq!(
            engine::find(pattern, subject, 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan {
                start: 0,
                end: subject.chars().count()
            })
        );
    }
    for (pattern, subject) in [("[^b-d]", "C"), ("é", "É")] {
        assert_eq!(
            engine::find(pattern, subject, 0, options),
            engine::MatchOutcome::NoMatch
        );
    }
}

#[test]
fn expanded_syntax_skips_comments_but_preserves_escapes_and_brackets() {
    let options = engine::RegexOptions {
        expanded: true,
        ..default_options()
    };
    let cases = [
        ("a # skip\n b", "ab"),
        (r"a\ b\#c", "a b#c"),
        ("a [b #] c", "a#c"),
        ("ab{ 1 , 2 }c", "abc"),
    ];
    for (pattern, subject) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, options),
            engine::MatchOutcome::Found(engine::MatchSpan {
                start: 0,
                end: subject.chars().count()
            })
        );
    }
}

#[test]
fn leading_embedded_options_override_compile_options() {
    let expanded = engine::RegexOptions {
        expanded: true,
        ..default_options()
    };
    for pattern in ["(?q)a b", "(?t)a b"] {
        assert_eq!(
            engine::find(pattern, "a b", 0, expanded),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 })
        );
        assert_eq!(
            engine::find(pattern, "ab", 0, expanded),
            engine::MatchOutcome::NoMatch
        );
    }

    let insensitive = engine::RegexOptions {
        case_sensitive: false,
        ..default_options()
    };

    assert_eq!(
        engine::find("(?c)a", "A", 0, insensitive),
        engine::MatchOutcome::NoMatch
    );

    assert_eq!(
        engine::find("(?i)a", "A", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
    );

    assert_eq!(
        engine::find("(?n)^b", "a\nb", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 2, end: 3 })
    );

    assert_eq!(
        engine::find("(?b)a+b", "a+b", 0, default_options()),
        engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 3 })
    );
    assert!(matches!(
        engine::find("(?z)abc", "", 0, default_options()),
        engine::MatchOutcome::InvalidPattern
    ));
}

#[test]
fn word_assertions_follow_c_collation_word_membership() {
    let cases = [
        (r"\ma", "éa", Some((1, 2))),
        (r"\ya", "éa", Some((1, 2))),
        (r"\Ya", "éa", None),
        (r"a\M", "a-", Some((0, 1))),
        (r"a\m", "a-", None),
        (r"a\Y", "ab", Some((0, 1))),
        (r"a\Y", "a-", None),
        (r"\Y", "", Some((0, 0))),
        ("[[:<:]]a", "-a", Some((1, 2))),
        ("a[[:>:]]", "a-", Some((0, 1))),
        (r"a\<b", "a<b", Some((0, 3))),
    ];
    for (pattern, subject, expected) in cases {
        assert_eq!(
            engine::find(pattern, subject, 0, default_options()),
            match expected {
                Some((start, end)) => {
                    engine::MatchOutcome::Found(engine::MatchSpan { start, end })
                }
                None => engine::MatchOutcome::NoMatch,
            },
            "word assertion {pattern:?} on {subject:?}"
        );
    }
    for pattern in [r"\m*", r"\y*", "[[:<:]]*", "[[:>:]]*"] {
        assert!(
            matches!(
                engine::find(pattern, "", 0, default_options()),
                engine::MatchOutcome::InvalidPattern
            ),
            "repeated word assertion {pattern:?}"
        );
    }
    let basic = engine::RegexOptions {
        syntax: engine::Syntax::Basic,
        ..default_options()
    };
    for pattern in [r"\<a", "[[:<:]]a"] {
        assert_eq!(
            engine::find(pattern, "a", 0, basic),
            engine::MatchOutcome::Found(engine::MatchSpan { start: 0, end: 1 })
        );
    }
    for pattern in [r"\<*", r"\>*"] {
        assert!(matches!(
            engine::find(pattern, "", 0, basic),
            engine::MatchOutcome::InvalidPattern
        ));
    }
}

#[test]
fn rust_api_options_match_postgres() {
    let document: Value = serde_json::from_str(include_str!(
        "../conformance/targeted-postgres-fixtures.json"
    ))
    .unwrap();
    let fixtures: Vec<_> = document["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|fixture| fixture["family"] == "api")
        .collect();
    assert!(!fixtures.is_empty());
    for fixture in fixtures {
        assert_eq!(
            evaluate(&fixture["input"]).as_ref(),
            Some(&fixture["expected"]),
            "API options: {}",
            fixture["input"]
        );
    }
}

#[test]
fn rust_targeted_count_matches_postgres() {
    let document: Value = serde_json::from_str(include_str!(
        "../conformance/targeted-postgres-fixtures.json"
    ))
    .unwrap();
    let mut checked = 0;
    for fixture in document["fixtures"].as_array().unwrap() {
        if fixture["operation"] != "count" {
            continue;
        }
        let input = &fixture["input"];
        let actual = evaluate_count(input);
        assert_eq!(actual, fixture["expected"], "targeted count: {input}");
        checked += 1;
    }
    assert!(checked > 0);
}

#[test]
fn rust_composition_results_match_postgres() {
    let document: Value = serde_json::from_str(include_str!(
        "../conformance/targeted-postgres-fixtures.json"
    ))
    .unwrap();
    let mut checked = 0;
    for fixture in document["fixtures"].as_array().unwrap() {
        if fixture["family"] != "composition" {
            continue;
        }
        assert_eq!(
            evaluate(&fixture["input"]).as_ref(),
            Some(&fixture["expected"]),
            "composition: {}",
            fixture["input"]
        );
        checked += 1;
    }
    assert!(checked > 0);
}
