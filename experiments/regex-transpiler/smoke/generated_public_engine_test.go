package generated_test

import (
	generated "pgsid-regex-generated-smoke"
	"strings"
	"testing"
)

func TestExportedEngineSurface(t *testing.T) {
	result := generated.Find("a", "a", 0, generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxLiteral}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}})
	if result.Kind != generated.MatchOutcomeFound || result.Found.Start != 0 || result.Found.End != 1 {
		t.Fatalf("unexpected exported match result: %+v", result)
	}
	count := generated.Count("a", "aa", 0, generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxAdvanced}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}})
	if count.Kind != generated.CountOutcomeCount || count.Count != 2 {
		t.Fatalf("unexpected exported count result: %+v", count)
	}
}

func TestEarlyLiteralMatch(t *testing.T) {
	options := generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxAdvanced}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}}
	result := generated.Find("a", strings.Repeat("a", 500000), 0, options)
	if result.Kind != generated.MatchOutcomeFound || result.Found.Start != 0 || result.Found.End != 1 {
		t.Fatalf("unexpected long-subject match: %+v", result)
	}
}

func TestExportedCaptures(t *testing.T) {
	options := generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxAdvanced}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}}
	result := generated.Captures("(a)?()", "😀", 1, options)
	if result.Kind != generated.CaptureOutcomeFound || len(result.Found) != 3 {
		t.Fatalf("unexpected exported captures: %+v", result)
	}
	if result.Found[0] != (generated.CaptureSpan{Matched: true, Start: 1, End: 1}) || result.Found[1] != (generated.CaptureSpan{}) || result.Found[2] != result.Found[0] {
		t.Fatalf("unmatched and empty groups differ: %+v", result)
	}
	result.Found[0].End = 99
	if result.Found[2].End != 1 || generated.Captures("(a)?()", "😀", 1, options).Found[0].End != 1 {
		t.Fatal("capture results share mutable storage")
	}
	if generated.Captures("(", "", 100, options).Kind != generated.CaptureOutcomeInvalidPattern {
		t.Fatal("invalid pattern lost its status")
	}
	if generated.Captures("a", "", 100, options).Kind != generated.CaptureOutcomeNoMatch {
		t.Fatal("search beyond subject should not match")
	}
	if generated.Captures(strings.Repeat("(?=", 65)+"a"+strings.Repeat(")", 65), "a", 0, options).Kind != generated.CaptureOutcomeUncertain {
		t.Fatal("lookaround depth must respect the work limit")
	}
}

func TestExportedFindAll(t *testing.T) {
	options := generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxAdvanced}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}}
	result := generated.FindAll("a", "aba", 0, options)
	if result.Kind != generated.MatchListOutcomeMatches || len(result.Matches) != 2 || result.Matches[0] != (generated.MatchSpan{Start: 0, End: 1}) || result.Matches[1] != (generated.MatchSpan{Start: 2, End: 3}) {
		t.Fatalf("unexpected exported match list: %+v", result)
	}
	result.Matches[0].End = 99
	if result.Matches[1].End != 3 || generated.FindAll("a", "aba", 0, options).Matches[0].End != 1 {
		t.Fatal("match list results share mutable storage")
	}
	if generated.FindAll("[", "", 100, options).Kind != generated.MatchListOutcomeInvalidPattern {
		t.Fatal("invalid pattern lost its status")
	}
	if generated.FindAll(strings.Repeat("(?=", 65)+"a"+strings.Repeat(")", 65), "a", 0, options).Kind != generated.MatchListOutcomeUncertain {
		t.Fatal("lookaround depth must respect the work limit")
	}
}
