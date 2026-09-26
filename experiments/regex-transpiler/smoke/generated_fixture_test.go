package generated

import (
	"encoding/json"
	"os"
	"strings"
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
	Kind  string          `json:"kind"`
	Value json.RawMessage `json:"value"`
}

type fixture struct {
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
	literal := 0
	insensitive := 0
	advanced := 0
	expandedAdvanced := 0
	countSupported := 0
	dot := 0
	mixed := 0
	anchored := 0
	escaped := 0
	classes := 0
	negatedClasses := 0
	rangeClasses := 0
	edgePunctuation := 0
	absoluteAnchors := 0
	positioned := 0
	newlineModes := map[string]bool{}
	for _, path := range []string{"postgres-fixtures.json", "stress-fixtures.json", "targeted-postgres-fixtures.json", "stress-position-fixtures.json", "stress-boundary-fixtures.json"} {
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
		checked := 0
		for index, fixture := range document.Fixtures {
			if fixture.Operation == "count" {
				input := fixture.Input
				if input.Options.Syntax == "advanced" && ((!input.Options.Expanded && SupportsSimpleAdvanced(input.Pattern)) || (input.Options.Expanded && SupportsExpandedAdvanced(input.Pattern))) {
					from := input.Start - 1
					crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
					lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
					var actual CountOutcome
					if input.Options.Expanded {
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
				continue
			}
			if fixture.Operation != "" && fixture.Operation != "find" {
				continue
			}
			input := fixture.Input
			from := 0
			if input.Start != 0 {
				from = input.Start - 1
			}
			var actual MatchOutcome
			if input.Options.Syntax == "literal" && !input.Options.Expanded && input.Options.Newline == "ordinary" {
				actual = FindLiteral(input.Pattern, input.Subject, from, input.Options.CaseSensitive)
				literal++
				if !input.Options.CaseSensitive {
					insensitive++
				}
			} else if input.Options.Syntax == "advanced" && ((!input.Options.Expanded && SupportsSimpleAdvanced(input.Pattern)) || (input.Options.Expanded && SupportsExpandedAdvanced(input.Pattern))) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				if input.Options.Expanded {
					actual = FindExpandedAdvanced(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors)
					expandedAdvanced++
				} else {
					actual = FindSimpleAdvanced(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors)
				}
				advanced++
				if input.Pattern == "." {
					dot++
				}
				if input.Pattern != "." && strings.Contains(input.Pattern, ".") {
					mixed++
				}
				if strings.ContainsAny(input.Pattern, "^$") {
					anchored++
				}
				if strings.Contains(input.Pattern, "\\") {
					escaped++
				}
				if strings.Contains(input.Pattern, "[") {
					classes++
				}
				if strings.Contains(input.Pattern, "[^") {
					negatedClasses++
				}
				if strings.Contains(input.Pattern, "[") && strings.Contains(input.Pattern, "-") {
					rangeClasses++
				}
				if strings.Contains(input.Pattern, "[-") || strings.Contains(input.Pattern, "-]") || strings.Contains(input.Pattern, "[]") || strings.Contains(input.Pattern, "[^]") {
					edgePunctuation++
				}
				if strings.Contains(input.Pattern, "\\A") || strings.Contains(input.Pattern, "\\Z") {
					absoluteAnchors++
				}
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
				var span struct {
					Start int `json:"start"`
					End   int `json:"end"`
				}
				if err := json.Unmarshal(fixture.Expected.Value, &span); err != nil {
					t.Fatal(err)
				}
				expected = MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: span.Start, End: span.End}}
			case "NoMatch":
				expected = MatchOutcome{Kind: MatchOutcomeNoMatch}
			default:
				t.Fatalf("unsupported expected outcome in %s fixture %d: %s", path, index, fixture.Expected.Kind)
			}
			if actual != expected {
				t.Errorf("%s fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
			}
			checked++
			if input.Options.Syntax == "advanced" && input.Pattern == "." {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				if found := FindAnyCharacter(input.Subject, from, crossesNewline); found != expected {
					t.Errorf("%s fixture %d: dot atom expected=%+v, actual=%+v", path, index, expected, found)
				}
			}
		}
		if path == "targeted-postgres-fixtures.json" && checked != len(document.Fixtures) {
			t.Errorf("targeted fixtures checked %d of %d", checked, len(document.Fixtures))
		}
	}
	if literal < 40 || insensitive < 7 || advanced < 100 || dot < 20 || mixed < 50 || anchored < 20 || escaped < 40 || classes < 50 || negatedClasses < 40 || rangeClasses < 50 || edgePunctuation < 80 || absoluteAnchors < 50 || positioned < 6 || len(newlineModes) != 4 {
		t.Fatalf("fixture coverage: literal=%d insensitive=%d advanced=%d dot=%d mixed=%d anchored=%d escaped=%d classes=%d negatedClasses=%d rangeClasses=%d edgePunctuation=%d absoluteAnchors=%d positioned=%d newline=%v", literal, insensitive, advanced, dot, mixed, anchored, escaped, classes, negatedClasses, rangeClasses, edgePunctuation, absoluteAnchors, positioned, newlineModes)
	}
	if countSupported < 100 || expandedAdvanced < 200 {
		t.Fatalf("supported count=%d expanded=%d", countSupported, expandedAdvanced)
	}
}
