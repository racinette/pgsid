package generated_test

import (
	generated "pgsid-regex-generated-smoke"
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
