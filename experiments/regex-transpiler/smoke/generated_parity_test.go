package generated

import (
	"encoding/json"
	"os"
	"testing"
)

type parityCase struct {
	Operation         string          `json:"operation"`
	Pattern           string          `json:"pattern"`
	Subject           string          `json:"subject"`
	From              int             `json:"from"`
	CaseSensitive     bool            `json:"caseSensitive"`
	DotCrossesNewline bool            `json:"dotCrossesNewline"`
	LineAnchors       bool            `json:"lineAnchors"`
	Current           int             `json:"current"`
	Amount            int             `json:"amount"`
	Expected          json.RawMessage `json:"expected"`
}

func TestGeneratedEngineMatchesRust(t *testing.T) {
	data, err := os.ReadFile("slice-oracle.json")
	if err != nil {
		t.Fatal(err)
	}
	var oracle struct {
		SchemaVersion int          `json:"schemaVersion"`
		Cases         []parityCase `json:"cases"`
	}
	if err := json.Unmarshal(data, &oracle); err != nil {
		t.Fatal(err)
	}
	if oracle.SchemaVersion != 1 || len(oracle.Cases) < 1000 {
		t.Fatalf("unexpected Rust oracle shape: version=%d cases=%d", oracle.SchemaVersion, len(oracle.Cases))
	}
	for index, testCase := range oracle.Cases {
		if testCase.Operation == "supports_simple_advanced" {
			var want bool
			if err := json.Unmarshal(testCase.Expected, &want); err != nil {
				t.Fatal(err)
			}
			if actual := supports_simple_advanced(testCase.Pattern); actual != want {
				t.Errorf("Rust support case %d: pattern=%q, expected=%t, actual=%t", index, testCase.Pattern, want, actual)
			}
			continue
		}
		var expected struct {
			Kind  string          `json:"kind"`
			Value json.RawMessage `json:"value"`
		}
		if err := json.Unmarshal(testCase.Expected, &expected); err != nil {
			t.Fatal(err)
		}
		switch testCase.Operation {
		case "find_literal", "find_any_character", "find_simple_advanced":
			var actual MatchOutcome
			if testCase.Operation == "find_literal" {
				actual = find_literal(testCase.Pattern, testCase.Subject, testCase.From, testCase.CaseSensitive)
			} else if testCase.Operation == "find_any_character" {
				actual = find_any_character(testCase.Subject, testCase.From, testCase.DotCrossesNewline)
			} else {
				actual = find_simple_advanced(testCase.Pattern, testCase.Subject, testCase.From, testCase.CaseSensitive, testCase.DotCrossesNewline, testCase.LineAnchors)
			}
			var want MatchOutcome
			switch expected.Kind {
			case "Found":
				var span struct {
					Start int `json:"start"`
					End   int `json:"end"`
				}
				if err := json.Unmarshal(expected.Value, &span); err != nil {
					t.Fatal(err)
				}
				want = MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: span.Start, end: span.End}}
			case "NoMatch":
				want = MatchOutcome{kind: MatchOutcomeNoMatch}
			case "Uncertain":
				want = MatchOutcome{kind: MatchOutcomeUncertain}
			default:
				t.Fatalf("unknown Rust match outcome in case %d: %s", index, expected.Kind)
			}
			if actual != want {
				t.Errorf("Rust parity case %d: input=%+v, expected=%+v, actual=%+v", index, testCase, want, actual)
			}
		case "charge_work":
			actual := charge_work(testCase.Current, testCase.Amount)
			var want WorkOutcome
			switch expected.Kind {
			case "Ready":
				var value int
				if err := json.Unmarshal(expected.Value, &value); err != nil {
					t.Fatal(err)
				}
				want = WorkOutcome{kind: WorkOutcomeReady, ready: value}
			case "Uncertain":
				want = WorkOutcome{kind: WorkOutcomeUncertain}
			default:
				t.Fatalf("unknown Rust work outcome in case %d: %s", index, expected.Kind)
			}
			if actual != want {
				t.Errorf("Rust parity case %d: input=%+v, expected=%+v, actual=%+v", index, testCase, want, actual)
			}
		default:
			t.Fatalf("unknown Rust operation in case %d: %s", index, testCase.Operation)
		}
	}
}
