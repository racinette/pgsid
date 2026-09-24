#[path = "../regex_engine_transpilable.rs"]
mod candidate;

use serde_json::{json, Value};
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
fn literal_search_matches_postgres_fixtures() {
    let mut examined = 0;
    for source in [
        include_str!("../conformance/postgres-fixtures.json"),
        include_str!("../conformance/stress-fixtures.json"),
    ] {
        let fixtures: Value = serde_json::from_str(source).unwrap();
        for fixture in fixtures["fixtures"].as_array().unwrap() {
            let input = &fixture["input"];
            let options = &input["options"];
            if options["syntax"] != "literal"
                || options["caseSensitive"] != true
                || options["expanded"] != false
                || options["newline"] != "ordinary"
            {
                continue;
            }
            examined += 1;
            let actual = match candidate::find_literal(
                input["pattern"].as_str().unwrap(),
                input["subject"].as_str().unwrap(),
                0,
                true,
            ) {
                candidate::MatchOutcome::Found(span) => {
                    json!({ "kind": "Found", "value": { "start": span.start, "end": span.end } })
                }
                candidate::MatchOutcome::NoMatch => json!({ "kind": "NoMatch" }),
            };
            assert_eq!(actual, fixture["expected"], "input={input}");
        }
    }
    assert!(examined >= 20);
}
