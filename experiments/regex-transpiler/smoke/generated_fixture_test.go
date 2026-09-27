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
	Kind     string          `json:"kind"`
	Value    json.RawMessage `json:"value"`
	Sqlstate string          `json:"sqlstate"`
}

type fixture struct {
	Family    string          `json:"family"`
	Operation string          `json:"operation"`
	Input     fixtureInput    `json:"input"`
	Expected  fixtureExpected `json:"expected"`
}

type fixtureDocument struct {
	SchemaVersion int `json:"schemaVersion"`
	Oracle        struct {
		Database string `json:"database"`
	} `json:"oracle"`
	Fixtures []fixture `json:"fixtures"`
}

func TestGeneratedEngineAgainstPGliteFixtures(t *testing.T) {
	findFixtures := 0
	countFixtures := 0
	countSupported := 0
	syntaxKinds := map[string]Syntax{
		"advanced": {Kind: SyntaxAdvanced}, "basic": {Kind: SyntaxBasic},
		"extended": {Kind: SyntaxExtended}, "literal": {Kind: SyntaxLiteral},
	}
	newlineKinds := map[string]NewlineMode{
		"ordinary": {Kind: NewlineModeOrdinary}, "sensitive": {Kind: NewlineModeSensitive},
		"stop": {Kind: NewlineModeStop}, "anchors": {Kind: NewlineModeAnchors},
	}
	for _, path := range []string{"postgres-fixtures.json", "stress-fixtures.json", "targeted-postgres-fixtures.json", "stress-position-fixtures.json", "stress-boundary-fixtures.json"} {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		var document fixtureDocument
		if err := json.Unmarshal(data, &document); err != nil {
			t.Fatal(err)
		}
		if document.SchemaVersion != 1 || document.Oracle.Database != "PostgreSQL via PGlite" || len(document.Fixtures) == 0 {
			t.Fatalf("unexpected fixture document: %s", path)
		}
		for index, fixture := range document.Fixtures {
			if fixture.Operation == "count" {
				countFixtures++
				input := fixture.Input
				simple := (!input.Options.Expanded && SupportsSimpleAdvanced(input.Pattern)) || (input.Options.Expanded && SupportsExpandedAdvanced(input.Pattern))
				choice := SupportsGroupChoice(input.Pattern, input.Options.Expanded)
				lookbehind := SupportsFixedLookbehind(input.Pattern, input.Options.Expanded)
				lookahead := SupportsLeadingLookahead(input.Pattern, input.Options.Expanded)
				backrefCount := SupportsFixedBackref(input.Pattern, input.Options.Expanded)
				if input.Options.Syntax == "advanced" && (simple || choice || lookbehind || lookahead || backrefCount) {
					from := input.Start - 1
					crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
					lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
					var actual CountOutcome
					if backrefCount {
						actual = CountFixedBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
					} else if lookahead {
						actual = CountLeadingLookahead(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
					} else if lookbehind {
						actual = CountFixedLookbehind(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
					} else if choice {
						actual = CountGroupChoice(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
					} else if input.Options.Expanded {
						actual = CountExpandedAdvanced(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors)
					} else {
						actual = CountSimpleAdvanced(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors)
					}
					var count int
					if err := json.Unmarshal(fixture.Expected.Value, &count); err != nil {
						t.Fatal(err)
					}
					expected := CountOutcome{Kind: CountOutcomeCount, Count: count}
					if actual != expected {
						t.Errorf("%s count fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
					}
					countSupported++
				}
				if countSupported != countFixtures {
					t.Fatalf("unsupported count fixture: %+v", input)
				}
				continue
			}
			if fixture.Operation != "" && fixture.Operation != "find" {
				t.Fatalf("unknown operation: %s", fixture.Operation)
			}
			input := fixture.Input
			syntax, ok := syntaxKinds[input.Options.Syntax]
			if !ok {
				t.Fatalf("unknown syntax: %s", input.Options.Syntax)
			}
			newline, ok := newlineKinds[input.Options.Newline]
			if !ok {
				t.Fatalf("unknown newline: %s", input.Options.Newline)
			}
			from := 0
			if input.Start > 0 {
				from = input.Start - 1
			}
			actual := Find(input.Pattern, input.Subject, from, RegexOptions{
				Syntax: syntax, Newline: newline,
				CaseSensitive: input.Options.CaseSensitive, Expanded: input.Options.Expanded,
			})
			var expected MatchOutcome
			switch fixture.Expected.Kind {
			case "Found":
				var span MatchSpan
				if err := json.Unmarshal(fixture.Expected.Value, &span); err != nil {
					t.Fatal(err)
				}
				expected = MatchOutcome{Kind: MatchOutcomeFound, Found: span}
			case "NoMatch":
				expected = MatchOutcome{Kind: MatchOutcomeNoMatch}
			case "InvalidPattern":
				if fixture.Expected.Sqlstate != "2201B" {
					t.Fatalf("unexpected SQLSTATE: %s", fixture.Expected.Sqlstate)
				}
				expected = MatchOutcome{Kind: MatchOutcomeInvalidPattern}
			default:
				t.Fatalf("unexpected fixture outcome: %s", fixture.Expected.Kind)
			}
			if actual != expected {
				t.Errorf("%s fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
			}
			findFixtures++
		}
	}
	if countSupported != countFixtures {
		t.Fatalf("count fixtures: %d/%d", countSupported, countFixtures)
	}
	t.Logf("unified find: %d PostgreSQL fixtures; count: %d/%d; zero skipped", findFixtures, countSupported, countFixtures)
}
