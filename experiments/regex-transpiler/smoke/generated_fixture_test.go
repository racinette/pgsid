package generated

import (
	"encoding/json"
	"os"
	"reflect"
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

func checkCompiledResult(t *testing.T, operation string, input fixtureInput, from int, options RegexOptions, direct any) {
	t.Helper()
	compiled := Compile(input.Pattern, options)
	var actual any
	switch compiled.Kind {
	case CompileOutcomeCompiled:
		switch operation {
		case "count":
			actual = CountCompiled(&compiled.Compiled, input.Subject, from)
		case "captures":
			actual = CapturesCompiled(&compiled.Compiled, input.Subject, from)
		case "find_all":
			actual = FindAllCompiled(&compiled.Compiled, input.Subject, from)
		default:
			actual = FindCompiled(&compiled.Compiled, input.Subject, from)
		}
	case CompileOutcomeInvalidPattern:
		switch operation {
		case "count":
			actual = CountOutcome{Kind: CountOutcomeInvalidPattern}
		case "captures":
			actual = CaptureOutcome{Kind: CaptureOutcomeInvalidPattern}
		case "find_all":
			actual = MatchListOutcome{Kind: MatchListOutcomeInvalidPattern}
		default:
			actual = MatchOutcome{Kind: MatchOutcomeInvalidPattern}
		}
	case CompileOutcomeUncertain:
		switch operation {
		case "count":
			actual = CountOutcome{Kind: CountOutcomeUncertain}
		case "captures":
			actual = CaptureOutcome{Kind: CaptureOutcomeUncertain}
		case "find_all":
			actual = MatchListOutcome{Kind: MatchListOutcomeUncertain}
		default:
			actual = MatchOutcome{Kind: MatchOutcomeUncertain}
		}
	default:
		t.Fatalf("unexpected compile result: %+v", compiled)
	}
	if !reflect.DeepEqual(actual, direct) {
		t.Errorf("compiled %s differs from one-shot result: input=%+v, compiled=%+v, direct=%+v", operation, input, actual, direct)
	}
}

func TestGeneratedEngineAgainstPGliteFixtures(t *testing.T) {
	findFixtures := 0
	countFixtures := 0
	captureFixtures := 0
	listFixtures := 0
	syntaxKinds := map[string]Syntax{
		"advanced": {Kind: SyntaxAdvanced}, "basic": {Kind: SyntaxBasic},
		"extended": {Kind: SyntaxExtended}, "literal": {Kind: SyntaxLiteral},
	}
	newlineKinds := map[string]NewlineMode{
		"ordinary": {Kind: NewlineModeOrdinary}, "sensitive": {Kind: NewlineModeSensitive},
		"stop": {Kind: NewlineModeStop}, "anchors": {Kind: NewlineModeAnchors},
	}
	for _, path := range []string{"postgres-fixtures.json", "stress-fixtures.json", "targeted-postgres-fixtures.json", "stress-position-fixtures.json", "stress-boundary-fixtures.json", "stress-classification-fixtures.json"} {
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
			if fixture.Operation != "" && fixture.Operation != "find" && fixture.Operation != "count" && fixture.Operation != "captures" && fixture.Operation != "find_all" {
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
			options := RegexOptions{Syntax: syntax, Newline: newline, CaseSensitive: input.Options.CaseSensitive, Expanded: input.Options.Expanded}
			if fixture.Operation == "find_all" {
				actual := FindAll(input.Pattern, input.Subject, from, options)
				var expected MatchListOutcome
				switch fixture.Expected.Kind {
				case "Matches":
					var spans []MatchSpan
					if err := json.Unmarshal(fixture.Expected.Value, &spans); err != nil {
						t.Fatal(err)
					}
					if spans == nil {
						spans = []MatchSpan{}
					}
					expected = MatchListOutcome{Kind: MatchListOutcomeMatches, Matches: spans}
				case "InvalidPattern":
					if fixture.Expected.Sqlstate != "2201B" {
						t.Fatalf("unexpected SQLSTATE: %s", fixture.Expected.Sqlstate)
					}
					expected = MatchListOutcome{Kind: MatchListOutcomeInvalidPattern}
				default:
					t.Fatalf("unexpected find-all outcome: %s", fixture.Expected.Kind)
				}
				if !reflect.DeepEqual(actual, expected) {
					t.Errorf("%s find-all fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
				}
				checkCompiledResult(t, fixture.Operation, input, from, options, actual)
				listFixtures++
				continue
			}
			if fixture.Operation == "count" {
				actual := Count(input.Pattern, input.Subject, from, options)
				var expected CountOutcome
				switch fixture.Expected.Kind {
				case "Count":
					var count int
					if err := json.Unmarshal(fixture.Expected.Value, &count); err != nil {
						t.Fatal(err)
					}
					expected = CountOutcome{Kind: CountOutcomeCount, Count: count}
				case "InvalidPattern":
					if fixture.Expected.Sqlstate != "2201B" {
						t.Fatalf("unexpected SQLSTATE: %s", fixture.Expected.Sqlstate)
					}
					expected = CountOutcome{Kind: CountOutcomeInvalidPattern}
				default:
					t.Fatalf("unexpected count outcome: %s", fixture.Expected.Kind)
				}
				if actual != expected {
					t.Errorf("%s count fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
				}
				checkCompiledResult(t, fixture.Operation, input, from, options, actual)
				countFixtures++
				continue
			}
			if fixture.Operation == "captures" {
				actual := Captures(input.Pattern, input.Subject, from, options)
				var expected CaptureOutcome
				switch fixture.Expected.Kind {
				case "Found":
					var spans []CaptureSpan
					if err := json.Unmarshal(fixture.Expected.Value, &spans); err != nil {
						t.Fatal(err)
					}
					expected = CaptureOutcome{Kind: CaptureOutcomeFound, Found: spans}
				case "NoMatch":
					expected = CaptureOutcome{Kind: CaptureOutcomeNoMatch}
				case "InvalidPattern":
					if fixture.Expected.Sqlstate != "2201B" {
						t.Fatalf("unexpected SQLSTATE: %s", fixture.Expected.Sqlstate)
					}
					expected = CaptureOutcome{Kind: CaptureOutcomeInvalidPattern}
				default:
					t.Fatalf("unexpected capture outcome: %s", fixture.Expected.Kind)
				}
				if !reflect.DeepEqual(actual, expected) {
					t.Errorf("%s capture fixture %d: input=%+v, expected=%+v, actual=%+v", path, index, input, expected, actual)
				}
				checkCompiledResult(t, fixture.Operation, input, from, options, actual)
				captureFixtures++
				continue
			}
			actual := Find(input.Pattern, input.Subject, from, options)
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
			checkCompiledResult(t, fixture.Operation, input, from, options, actual)
			findFixtures++
		}
	}
	t.Logf("unified operations: %d find and %d count and %d capture and %d find-all PostgreSQL fixtures; zero skipped", findFixtures, countFixtures, captureFixtures, listFixtures)
}
