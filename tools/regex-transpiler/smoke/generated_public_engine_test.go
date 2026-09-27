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

func TestReusableCompiledEngine(t *testing.T) {
	options := generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxAdvanced}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}}
	compiled := generated.Compile("(a)+", options)
	if compiled.Kind != generated.CompileOutcomeCompiled {
		t.Fatalf("unexpected compilation: %+v", compiled)
	}
	program := &compiled.Compiled
	if actual := generated.FindCompiled(program, "baaa", 0); actual != (generated.MatchOutcome{Kind: generated.MatchOutcomeFound, Found: generated.MatchSpan{Start: 1, End: 4}}) {
		t.Fatalf("unexpected compiled find: %+v", actual)
	}
	if actual := generated.CountCompiled(program, "aa aa", 0); actual != (generated.CountOutcome{Kind: generated.CountOutcomeCount, Count: 2}) {
		t.Fatalf("unexpected compiled count: %+v", actual)
	}
	all := generated.FindAllCompiled(program, "aa aa", 0)
	if all.Kind != generated.MatchListOutcomeMatches || len(all.Matches) != 2 || all.Matches[0] != (generated.MatchSpan{Start: 0, End: 2}) || all.Matches[1] != (generated.MatchSpan{Start: 3, End: 5}) {
		t.Fatalf("unexpected compiled find all: %+v", all)
	}
	captures := generated.CapturesCompiled(program, "baaa", 0)
	if captures.Kind != generated.CaptureOutcomeFound || len(captures.Found) != 2 || captures.Found[1] != (generated.CaptureSpan{Matched: true, Start: 3, End: 4}) {
		t.Fatalf("unexpected compiled captures: %+v", captures)
	}
	global := generated.CapturesAllCompiled(program, "aa aa", 0)
	if global.Kind != generated.CaptureListOutcomeMatches || global.Matches.GroupsPerMatch != 2 || len(global.Matches.Groups) != 4 || global.Matches.Groups[1] != (generated.CaptureSpan{Matched: true, Start: 1, End: 2}) || global.Matches.Groups[3] != (generated.CaptureSpan{Matched: true, Start: 4, End: 5}) {
		t.Fatalf("unexpected compiled global captures: %+v", global)
	}
	many := generated.CapturesAllCompiled(program, strings.Repeat("a ", 2048), 0)
	if many.Kind != generated.CaptureListOutcomeMatches || len(many.Matches.Groups) != 4096 || many.Matches.Groups[4094] != (generated.CaptureSpan{Matched: true, Start: 4094, End: 4095}) {
		t.Fatalf("unexpected many-match capture batch: kind=%v, groups=%d", many.Kind, len(many.Matches.Groups))
	}
	if generated.FindCompiled(&generated.CompiledRegex{}, "a", 0).Kind != generated.MatchOutcomeInvalidPattern {
		t.Fatal("zero-value program should not execute")
	}
	if generated.Compile("[", options).Kind != generated.CompileOutcomeInvalidPattern {
		t.Fatal("invalid pattern should fail compilation")
	}
	if generated.Compile("(a{255}){255}", options).Kind != generated.CompileOutcomeUncertain {
		t.Fatal("compilation work limit lost its status")
	}
}

func TestExportedGlobalCapturesAreIndependent(t *testing.T) {
	options := generated.RegexOptions{Syntax: generated.Syntax{Kind: generated.SyntaxAdvanced}, CaseSensitive: true, Newline: generated.NewlineMode{Kind: generated.NewlineModeOrdinary}}
	result := generated.CapturesAll("(a)", "aa", 0, options)
	if result.Kind != generated.CaptureListOutcomeMatches || result.Matches.GroupsPerMatch != 2 || len(result.Matches.Groups) != 4 {
		t.Fatalf("unexpected global captures: %+v", result)
	}
	result.Matches.Groups[0].End = 99
	if result.Matches.Groups[2].End != 2 || generated.CapturesAll("(a)", "aa", 0, options).Matches.Groups[0].End != 1 {
		t.Fatal("global capture results share mutable storage")
	}
	if generated.CapturesAll("[", "", 100, options).Kind != generated.CaptureListOutcomeInvalidPattern {
		t.Fatal("invalid pattern lost its status")
	}
	if generated.CapturesAll("(?=a)(?=a)", strings.Repeat("a", 250000), 0, options).Kind != generated.CaptureListOutcomeUncertain {
		t.Fatal("global capture work limit lost its status")
	}
}
