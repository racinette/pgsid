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
	Kind     string          `json:"kind"`
	Value    json.RawMessage `json:"value"`
	Sqlstate string          `json:"sqlstate"`
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
	quotedLiteral := 0
	insensitive := 0
	advanced := 0
	grouped := 0
	groupChoice := 0
	optionalGroup := 0
	multiOptionalGroup := 0
	lookbehind := 0
	lookahead := 0
	backref := 0
	singleCapture := 0
	repeatedBackref := 0
	captureProgram := 0
	choiceCapture := 0
	twoCapture := 0
	inline := 0
	inlineOptions := 0
	middleLookahead := 0
	chainedAssertions := 0
	boundedGroup := 0
	expandedAdvanced := 0
	extended := 0
	extendedLiteralClose := 0
	extendedGroup := 0
	repeatedChoice := 0
	extendedEscape := 0
	numericLiteral := 0
	basic := 0
	basicPunctuation := 0
	basicEscape := 0
	basicBound := 0
	basicBackref := 0
	bracketWord := 0
	collatingBracket := 0
	basicTransparentGroup := 0
	basicSpecialBracket := 0
	basicLiteralEscapedLetter := 0
	basicRepeatedCapture := 0
	invalidGrouping := 0
	invalidRepeat := 0
	invalidBound := 0
	invalidPosixClass := 0
	invalidRange := 0
	invalidBracketConstruct := 0
	invalidNumeric := 0
	invalidBackreference := 0
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
	posixNames := map[string]bool{}
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
				continue
			}
			if fixture.Operation != "" && fixture.Operation != "find" {
				continue
			}
			input := fixture.Input
			if input.Options.Syntax != "literal" && (DefinitelyInvalidGrouping(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) || DefinitelyInvalidInlineOptions(input.Pattern, rune(input.Options.Syntax[0]))) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidGrouping++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidSimpleRepeat(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidRepeat++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidBound(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidBound++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidPosixClass(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidPosixClass++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidBracketRange(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidRange++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidBracketConstruct(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidBracketConstruct++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidNumericEscape(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidNumeric++
				checked++
				continue
			}
			if input.Options.Syntax != "literal" && DefinitelyInvalidBackreference(input.Pattern, rune(input.Options.Syntax[0]), input.Options.Expanded) {
				if fixture.Expected.Kind != "InvalidPattern" || fixture.Expected.Sqlstate != "2201B" {
					t.Errorf("%s fixture %d: input=%+v, expected invalid pattern, got %+v", path, index, input, fixture.Expected)
				}
				invalidBackreference++
				checked++
				continue
			}
			from := 0
			if input.Start != 0 {
				from = input.Start - 1
			}
			var actual MatchOutcome
			if (input.Options.Syntax == "advanced" || input.Options.Syntax == "basic") && SupportsQuotedLiteral(input.Pattern) {
				actual = FindQuotedLiteral(input.Pattern, input.Subject, from, input.Options.CaseSensitive)
				quotedLiteral++
			} else if input.Options.Syntax == "literal" && !input.Options.Expanded && input.Options.Newline == "ordinary" {
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
				if strings.HasPrefix(input.Pattern, "[[:") && strings.HasSuffix(input.Pattern, ":]]+") {
					posixNames[input.Pattern] = true
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
			} else if input.Options.Syntax == "advanced" && SupportsFlatGroups(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindFlatGroups(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				grouped++
			} else if input.Options.Syntax == "advanced" && SupportsGroupChoice(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindGroupChoice(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				groupChoice++
			} else if input.Options.Syntax == "advanced" && SupportsNoncaptureLiteral(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindNoncaptureLiteral(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				grouped++
			} else if input.Options.Syntax == "advanced" && SupportsOptionalGroup(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindOptionalGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				optionalGroup++
			} else if input.Options.Syntax == "advanced" && SupportsMultiOptionalGroup(input.Pattern, input.Options.Expanded) {
				actual = FindMultiOptionalGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				multiOptionalGroup++
			} else if input.Options.Syntax == "advanced" && SupportsFixedLookbehind(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindFixedLookbehind(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				lookbehind++
			} else if input.Options.Syntax == "advanced" && SupportsAnchorLookbehind(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindAnchorLookbehind(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				lookbehind++
			} else if input.Options.Syntax == "advanced" && SupportsLeadingLookahead(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindLeadingLookahead(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				lookahead++
			} else if input.Options.Syntax == "advanced" && SupportsFixedBackref(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindFixedBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				backref++
			} else if input.Options.Syntax == "advanced" && SupportsSingleCaptureBackref(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindSingleCaptureBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				singleCapture++
			} else if input.Options.Syntax == "advanced" && SupportsRepeatedBackref(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindRepeatedBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				repeatedBackref++
			} else if input.Options.Syntax == "advanced" && SupportsCaptureProgram(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindCaptureProgram(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				captureProgram++
			} else if input.Options.Syntax == "advanced" && SupportsChoiceCaptureBackref(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindChoiceCaptureBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				choiceCapture++
			} else if input.Options.Syntax == "advanced" && SupportsTwoChoiceBackref(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindTwoChoiceBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				choiceCapture++
			} else if input.Options.Syntax == "advanced" && SupportsTwoCaptureBackref(input.Pattern, input.Options.Expanded) {
				actual = FindTwoCaptureBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				twoCapture++
			} else if input.Options.Syntax == "advanced" && SupportsInlineAdvanced(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindInlineAdvanced(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				inline++
			} else if (input.Options.Syntax == "advanced" || input.Options.Syntax == "basic" && strings.HasPrefix(input.Pattern, "***:")) && SupportsInlineOptions(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindInlineOptions(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				inlineOptions++
			} else if input.Options.Syntax == "advanced" && SupportsMiddleLookahead(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindMiddleLookahead(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				middleLookahead++
			} else if input.Options.Syntax == "advanced" && SupportsMiddleLookbehind(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindMiddleLookbehind(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				lookbehind++
			} else if input.Options.Syntax == "advanced" && SupportsChainedAssertions(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				actual = FindChainedAssertions(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, input.Options.Expanded)
				chainedAssertions++
			} else if input.Options.Syntax == "advanced" && SupportsBoundedGroup(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBoundedGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				boundedGroup++
			} else if input.Options.Syntax == "extended" && SupportsExtendedCompatible(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindExtendedCompatible(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				extended++
			} else if input.Options.Syntax == "extended" && SupportsExtendedLiteralClosingGroup(input.Pattern, input.Options.Expanded) {
				actual = FindExtendedLiteralClosingGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive)
				extendedLiteralClose++
			} else if input.Options.Syntax == "extended" && SupportsExtendedGroup(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindExtendedGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				extendedGroup++
			} else if (input.Options.Syntax == "advanced" || input.Options.Syntax == "extended") && SupportsRepeatedChoice(input.Pattern, input.Options.Expanded) {
				actual = FindRepeatedChoice(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				repeatedChoice++
			} else if input.Options.Syntax == "extended" && SupportsExtendedLiteralEscape(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindExtendedLiteralEscape(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				extendedEscape++
			} else if input.Options.Syntax == "advanced" && SupportsNumericLiteralEscape(input.Pattern, input.Options.Expanded) {
				actual = FindNumericLiteralEscape(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				numericLiteral++
			} else if (input.Options.Syntax == "advanced" || input.Options.Syntax == "basic") && SupportsCollatingBracket(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindCollatingBracket(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				collatingBracket++
			} else if input.Options.Syntax == "basic" && SupportsBasicTransparentGroup(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicTransparentGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicTransparentGroup++
			} else if input.Options.Syntax == "basic" && SupportsBasicSpecialBracket(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicSpecialBracket(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicSpecialBracket++
			} else if input.Options.Syntax == "basic" && SupportsBasicLiteralEscapedLetter(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicLiteralEscapedLetter(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicLiteralEscapedLetter++
			} else if input.Options.Syntax == "basic" && SupportsBasicRepeatedCapture(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicRepeatedCapture(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicRepeatedCapture++
			} else if input.Options.Syntax == "basic" && SupportsBasicCompatible(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicCompatible(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basic++
			} else if input.Options.Syntax == "basic" && SupportsBasicLiteralPunctuation(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicLiteralPunctuation(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicPunctuation++
			} else if input.Options.Syntax == "basic" && SupportsBasicLetterEscape(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicLetterEscape(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicEscape++
			} else if input.Options.Syntax == "basic" && SupportsBasicEscapedBound(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicEscapedBound(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicBound++
			} else if input.Options.Syntax == "basic" && SupportsBasicFixedBackref(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBasicFixedBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				basicBackref++
			} else if input.Options.Syntax == "basic" && SupportsBasicBoundedBackref(input.Pattern, input.Options.Expanded) {
				actual = FindBasicBoundedBackref(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				basicBackref++
			} else if (input.Options.Syntax == "advanced" || input.Options.Syntax == "basic") && SupportsBracketWordBoundary(input.Pattern, input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindBracketWordBoundary(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, input.Options.Expanded)
				bracketWord++
			} else if (input.Options.Syntax == "advanced" || input.Options.Syntax == "basic") && SupportsAngleWord(input.Pattern, []rune(input.Options.Syntax)[0], input.Options.Expanded) {
				crossesNewline := input.Options.Newline == "ordinary" || input.Options.Newline == "anchors"
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindAngleWord(input.Pattern, input.Subject, from, input.Options.CaseSensitive, crossesNewline, lineAnchors, []rune(input.Options.Syntax)[0], input.Options.Expanded)
				bracketWord++
			} else if input.Options.Syntax == "advanced" && SupportsZeroWidthAssertions(input.Pattern, input.Options.Expanded) {
				lineAnchors := input.Options.Newline == "sensitive" || input.Options.Newline == "anchors"
				actual = FindZeroWidthAssertions(input.Pattern, input.Subject, from, input.Options.CaseSensitive, lineAnchors, input.Options.Expanded)
				advanced++
			} else if input.Options.Syntax == "advanced" && SupportsLiteralZeroWidthGroup(input.Pattern, input.Options.Expanded) {
				actual = FindLiteralZeroWidthGroup(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				advanced++
			} else if input.Options.Syntax == "advanced" && SupportsUnicodeSimple(input.Pattern, input.Options.Expanded) {
				actual = FindUnicodeSimple(input.Pattern, input.Subject, from, input.Options.CaseSensitive, input.Options.Expanded)
				advanced++
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
	if literal < 40 || quotedLiteral < 2 || insensitive < 7 || advanced < 100 || grouped < 20 || groupChoice < 20 || optionalGroup < 50 || multiOptionalGroup < 4 || lookbehind < 20 || lookahead < 20 || backref < 20 || singleCapture < 50 || repeatedBackref < 8 || captureProgram < 12 || choiceCapture < 10 || twoCapture < 30 || inline < 20 || inlineOptions < 10 || middleLookahead < 20 || chainedAssertions < 4 || boundedGroup < 20 || extended < 50 || extendedLiteralClose < 10 || extendedGroup < 20 || repeatedChoice < 20 || extendedEscape < 20 || numericLiteral < 10 || basic < 50 || basicPunctuation < 20 || basicEscape < 20 || basicBound < 20 || basicBackref < 20 || bracketWord < 10 || collatingBracket < 10 || basicTransparentGroup < 4 || basicSpecialBracket < 4 || basicLiteralEscapedLetter < 2 || basicRepeatedCapture < 1 || invalidGrouping < 40 || invalidRepeat < 20 || invalidBound < 20 || invalidPosixClass < 20 || invalidRange < 10 || invalidBracketConstruct < 7 || invalidNumeric < 5 || invalidBackreference < 10 || dot < 20 || mixed < 50 || anchored < 20 || escaped < 40 || classes < 50 || negatedClasses < 40 || rangeClasses < 50 || edgePunctuation < 80 || absoluteAnchors < 50 || positioned < 6 || len(newlineModes) != 4 {
		t.Fatalf("fixture coverage: literal=%d insensitive=%d advanced=%d dot=%d mixed=%d anchored=%d escaped=%d classes=%d negatedClasses=%d rangeClasses=%d edgePunctuation=%d absoluteAnchors=%d positioned=%d newline=%v", literal, insensitive, advanced, dot, mixed, anchored, escaped, classes, negatedClasses, rangeClasses, edgePunctuation, absoluteAnchors, positioned, newlineModes)
	}
	if countSupported != 180 || expandedAdvanced < 200 {
		t.Fatalf("supported count=%d expanded=%d", countSupported, expandedAdvanced)
	}
	if len(posixNames) != 14 {
		t.Fatalf("supported POSIX classes=%d", len(posixNames))
	}
}
