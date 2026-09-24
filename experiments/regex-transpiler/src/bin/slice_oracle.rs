#[path = "../../regex_engine_transpilable.rs"]
mod candidate;

use serde_json::{json, Value};

fn match_outcome(outcome: candidate::MatchOutcome) -> Value {
    match outcome {
        candidate::MatchOutcome::Found(span) => {
            json!({ "kind": "Found", "value": { "start": span.start, "end": span.end } })
        }
        candidate::MatchOutcome::NoMatch => json!({ "kind": "NoMatch" }),
        candidate::MatchOutcome::Uncertain => json!({ "kind": "Uncertain" }),
    }
}

fn work_outcome(outcome: candidate::WorkOutcome) -> Value {
    match outcome {
        candidate::WorkOutcome::Ready(value) => json!({ "kind": "Ready", "value": value }),
        candidate::WorkOutcome::Uncertain => json!({ "kind": "Uncertain" }),
    }
}

fn main() {
    let mut cases = Vec::new();
    let subjects = [
        "", "a", "A", "ba", "aaa", "AaA", "a😀a", "😀", "\n", "\na", "a\n", "Åå", "Kk", "KK",
        "a\0a", "😀\nβ", "a.b", "a+b", "^a", "a$", "a\\b", "(a)", "[a]", "zabd", "zacd", "zaed",
        "ba", ".", "^", "β", "c", "a\nc", "abc", "zac",
    ];
    for pattern in [
        "", "a", "A", "aa", "aA", "😀", "Å", "å", "K", "K", "\n", ".", "\0", "Z", "z",
    ] {
        for subject in subjects {
            for from in 0..=subject.chars().count() + 2 {
                for case_sensitive in [true, false] {
                    cases.push(json!({
                        "operation": "find_literal",
                        "pattern": pattern,
                        "subject": subject,
                        "from": from,
                        "caseSensitive": case_sensitive,
                        "expected": match_outcome(candidate::find_literal(
                            pattern,
                            subject,
                            from,
                            case_sensitive,
                        )),
                    }));
                }
            }
        }
    }
    for subject in subjects {
        for from in 0..=subject.chars().count() + 2 {
            for dot_crosses_newline in [true, false] {
                cases.push(json!({
                    "operation": "find_any_character",
                    "subject": subject,
                    "from": from,
                    "dotCrossesNewline": dot_crosses_newline,
                    "expected": match_outcome(candidate::find_any_character(
                        subject,
                        from,
                        dot_crosses_newline,
                    )),
                }));
            }
        }
    }
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
        "a*",
        "a|b",
        "a\\+b",
        "a\\.b",
        "\\^a",
        "a\\$",
        "a\\\\b",
        "\\(a\\)",
        "\\[a\\]",
        "a\\nb",
        "a\\",
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
        "[^a-z]",
        "[^]",
        "[]",
        "[a",
    ] {
        cases.push(json!({
            "operation": "supports_simple_advanced",
            "pattern": pattern,
            "expected": candidate::supports_simple_advanced(pattern),
        }));
        for subject in subjects {
            for from in 0..=subject.chars().count() + 2 {
                for case_sensitive in [true, false] {
                    for dot_crosses_newline in [true, false] {
                        for line_anchors in [true, false] {
                            cases.push(json!({
                                "operation": "find_simple_advanced",
                                "pattern": pattern,
                                "subject": subject,
                                "from": from,
                                "caseSensitive": case_sensitive,
                                "dotCrossesNewline": dot_crosses_newline,
                                "lineAnchors": line_anchors,
                                "expected": match_outcome(candidate::find_simple_advanced(
                                    pattern,
                                    subject,
                                    from,
                                    case_sensitive,
                                    dot_crosses_newline,
                                    line_anchors,
                                )),
                            }));
                        }
                    }
                }
            }
        }
    }
    for current in [0, 1, 1999999, 2000000, 2000001, 2147483647] {
        for amount in [0, 1, 1999999, 2000000, 2000001, 2147483647] {
            cases.push(json!({
                "operation": "charge_work",
                "current": current,
                "amount": amount,
                "expected": work_outcome(candidate::charge_work(current, amount)),
            }));
        }
    }
    serde_json::to_writer(
        std::io::stdout(),
        &json!({ "schemaVersion": 1, "cases": cases }),
    )
    .unwrap();
}
