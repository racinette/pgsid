package generated

import (
	"encoding/json"
	"os"
	"testing"
)

type fixtureOptions struct {
	Syntax        string `json:"syntax"`
	CaseSensitive bool   `json:"caseSensitive"`
	Expanded      bool   `json:"expanded"`
	Newline       string `json:"newline"`
}

type fixtureInput struct {
	Pattern string         `json:"pattern"`
	Subject string         `json:"subject"`
	Start   int            `json:"start"`
	Options fixtureOptions `json:"options"`
}

type fixtureExpected struct {
	Kind  string `json:"kind"`
	Value struct {
		Start int `json:"start"`
		End   int `json:"end"`
	} `json:"value"`
}

type fixture struct {
	Input    fixtureInput    `json:"input"`
	Expected fixtureExpected `json:"expected"`
}

type fixtureDocument struct {
	SchemaVersion int `json:"schemaVersion"`
	Oracle        struct {
		Database string `json:"database"`
	} `json:"oracle"`
	Fixtures []fixture `json:"fixtures"`
}

func TestGeneratedEngineAgainstPGliteFixtures(t *testing.T) {
	literal := 0
	insensitive := 0
	dot := 0
	positioned := 0
	newlineModes := map[string]bool{}
	for _, path := range []string{"postgres-fixtures.json", "stress-fixtures.json", "targeted-postgres-fixtures.json"} {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		var document fixtureDocument
		if err := json.Unmarshal(data, &document); err != nil {
			t.Fatal(err)
		}
		if document.SchemaVersion != 1 || document.Oracle.Database != "PostgreSQL via PGlite" {
			t.Fatalf("unexpected fixture document: %s", path)
		}
		for index, fixture := range document.Fixtures {
			input := fixture.Input
			from := 0
			if input.Start != 0 {
				from = input.Start - 1
			}
			var actual MatchOutcome
			if input.Options.Syntax == "literal" && !input.Options.Expanded && input.Options.Newline == "ordinary" {
				actual = find_literal(input.Pattern, input.Subject, from, input.Options.CaseSensitive)
				literal++
				if !input.Options.CaseSensitive {
					insensitive++
				}
			} else if input.Pattern == "." && input.Options.Syntax == "advanced" && !input.Options.Expanded {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				actual = find_any_character(input.Subject, from, crossesNewline)
				dot++
				newlineModes[input.Options.Newline] = true
			} else {
				continue
			}
			if from > 0 {
				positioned++
			}
			var expected MatchOutcome
			switch fixture.Expected.Kind {
			case "Found":
				expected = MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: fixture.Expected.Value.Start, end: fixture.Expected.Value.End}}
			case "NoMatch":
				expected = MatchOutcome{kind: MatchOutcomeNoMatch}
			default:
				t.Fatalf("unsupported expected outcome in %s fixture %d: %s", path, index, fixture.Expected.Kind)
			}
			if actual != expected {
				t.Errorf("%s fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
			}
		}
	}
	if literal < 40 || insensitive < 7 || dot < 20 || positioned < 6 || len(newlineModes) != 4 {
		t.Fatalf("fixture coverage: literal=%d insensitive=%d dot=%d positioned=%d newline=%v", literal, insensitive, dot, positioned, newlineModes)
	}
}
