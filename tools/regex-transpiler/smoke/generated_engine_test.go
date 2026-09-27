package generated

import (
	"strings"
	"testing"
)

func testOptions(syntax Syntax, caseSensitive bool, crosses bool, anchors bool, expanded bool) RegexOptions {
	newline := NewlineMode{Kind: NewlineModeOrdinary}
	if anchors {
		newline = NewlineMode{Kind: NewlineModeAnchors}
	}
	if !crosses {
		newline = NewlineMode{Kind: NewlineModeStop}
		if anchors {
			newline = NewlineMode{Kind: NewlineModeSensitive}
		}
	}
	return RegexOptions{Syntax: syntax, CaseSensitive: caseSensitive, Newline: newline, Expanded: expanded}
}

func TestLiteralSlice(t *testing.T) {
	found := Find("😀", "a😀a", 0, testOptions(Syntax{Kind: SyntaxLiteral}, true, true, false, false))
	if found != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Errorf("literal match = %+v", found)
	}
	empty := Find("", "a😀a", 3, testOptions(Syntax{Kind: SyntaxLiteral}, true, true, false, false))
	if empty != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 3, End: 3}}) {
		t.Errorf("empty literal match = %+v", empty)
	}
	if Find("a", "a😀a", 4, testOptions(Syntax{Kind: SyntaxLiteral}, true, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("out-of-range start matched")
	}
	if Find("a", "bA", 0, testOptions(Syntax{Kind: SyntaxLiteral}, false, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("ASCII case folding missed match")
	}
	if Find("Z", "z", 0, testOptions(Syntax{Kind: SyntaxLiteral}, false, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("ASCII case folding missed range endpoint")
	}
	if Find("a", "A", 0, testOptions(Syntax{Kind: SyntaxLiteral}, true, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("case sensitive search matched different case")
	}
	if Find("Å", "å", 0, testOptions(Syntax{Kind: SyntaxLiteral}, false, true, false, false)).Kind != MatchOutcomeNoMatch || Find("K", "K", 0, testOptions(Syntax{Kind: SyntaxLiteral}, false, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("non-ASCII case folding changed match")
	}
	if Find(".", "\n😀", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("ordinary dot skipped newline")
	}
	if Find(".", "\n😀", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, false, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("newline-sensitive dot missed Unicode scalar")
	}
	if Find(".", "\n", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, false, false, false)).Kind != MatchOutcomeNoMatch || Find(".", "😀", 1, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("dot matched outside the allowed position range")
	}
	if Find("a.b", "za😀b", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("simple sequence missed Unicode wildcard")
	}
	if Find("a.b", "a\nb", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, false, true, false)).Kind != MatchOutcomeNoMatch {
		t.Error("simple sequence crossed excluded newline")
	}
	if Find("a*", "aaa", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 3}}) {
		t.Error("zero-or-more missed the longest endpoint")
	}
	if Find("a+b", "zaaab", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 5}}) {
		t.Error("one-or-more missed repeated prefix")
	}
	if Find("[ab]*c", "abbc", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 4}}) {
		t.Error("class repetition missed sequence")
	}
	if Find("a|ab", "ab", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 2}}) {
		t.Error("alternation missed longest endpoint")
	}
	if Find("a|b", "ba", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("alternation missed earliest start")
	}
	if Find("a*?", "aaa", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 0}}) {
		t.Error("lazy zero-or-more missed shortest endpoint")
	}
	if Find("a+?", "aaa", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("lazy one-or-more missed shortest endpoint")
	}
	if Find("a{2,4}b", "aaaab", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 5}}) {
		t.Error("bounded repeat missed its upper endpoint")
	}
	if Find("a{0}", "bbb", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 0}}) {
		t.Error("zero fixed repeat missed empty match")
	}

	if Find("a{foo}", "za{foo}", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 7}}) {
		t.Error("nonnumeric braces lost their literal meaning")
	}
	if Count("a*", "baa", 0, RegexOptions{Syntax: Syntax{Kind: SyntaxAdvanced}, Newline: NewlineMode{Kind: NewlineModeOrdinary}, CaseSensitive: true}) != (CountOutcome{Kind: CountOutcomeCount, Count: 3}) {
		t.Error("count missed empty matches or nonoverlapping advance")
	}
	if Count("a*?", "aaa", 0, RegexOptions{Syntax: Syntax{Kind: SyntaxAdvanced}, Newline: NewlineMode{Kind: NewlineModeOrdinary}, CaseSensitive: true}) != (CountOutcome{Kind: CountOutcomeCount, Count: 4}) {
		t.Error("lazy count missed empty matches")
	}
	if Find("a # comment\nb", "ab", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, true)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 2}}) {
		t.Error("expanded comment was not removed")
	}
	if Find("a[ #]b", "za#b", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, true)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("expanded bracket characters were removed")
	}
	if Count("a *", "baa", 0, RegexOptions{Syntax: Syntax{Kind: SyntaxAdvanced}, Newline: NewlineMode{Kind: NewlineModeOrdinary}, CaseSensitive: true, Expanded: true}) != (CountOutcome{Kind: CountOutcomeCount, Count: 3}) {
		t.Error("expanded count missed empty matches")
	}
	if Find("^a$", "\na\n", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, false, true, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("line anchors missed interior line")
	}
	if Find("^a$", "\na\n", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("ordinary anchors matched interior line")
	}

	if Find("a\\.b", "za.b", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("escaped dot missed literal match")
	}
	if Find("\\^a", "z^a", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 3}}) {
		t.Error("escaped anchor changed position")
	}

	if Find("a[bc]d", "zacd", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("literal class missed sequence match")
	}
	if Find("[A]", "a", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, false, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("literal class missed ASCII case fold")
	}

	if Find("[^a]", "\n", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, false, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("newline-sensitive negated class matched newline")
	}
	if Find("[^a]", "\n", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("ordinary negated class missed newline")
	}

	if Find("[A-C]", "b", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, false, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("case insensitive range missed ASCII letter")
	}
	if Find("[0-9]", "😀", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("ASCII range matched supplementary Unicode scalar")
	}

	if Find("[-a]", "-", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("leading hyphen missed literal match")
	}
	if Find("[]a]", "z]", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("leading closing bracket missed literal match")
	}

	if Find("\\Aa", "\na", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, true, false)).Kind != MatchOutcomeNoMatch {
		t.Error("absolute start anchor matched after newline")
	}
	if Find("\\Z", "a\n", 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 2, End: 2}}) {
		t.Error("absolute end anchor matched before final newline")
	}
	if Find("\\A", "a", 1, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false)).Kind != MatchOutcomeNoMatch {
		t.Error("absolute start anchor ignored search offset")
	}

}

func TestUnifiedFindResourceLimits(t *testing.T) {
	options := RegexOptions{Syntax: Syntax{Kind: SyntaxAdvanced}, Newline: NewlineMode{Kind: NewlineModeOrdinary}, CaseSensitive: true}
	for _, pattern := range []string{"(a{255}){255}", strings.Repeat("(?=", 65) + "a" + strings.Repeat(")", 65)} {
		if actual := Find(pattern, "a", 0, options); actual.Kind != MatchOutcomeUncertain {
			t.Errorf("resource limit returned %+v", actual)
		}

		if actual := Count(pattern, "a", 0, options); actual.Kind != CountOutcomeUncertain {
			t.Errorf("count resource limit returned %+v", actual)
		}
	}
	if actual := Count("[", "", 100, options); actual.Kind != CountOutcomeInvalidPattern {
		t.Errorf("invalid count pattern returned %+v", actual)
	}
	subject := strings.Repeat("a", 250000)
	if actual := Find("(?=a)(?=a)", subject, 0, options); actual.Kind != MatchOutcomeFound {
		t.Errorf("single match returned %+v", actual)
	}
	if actual := Count("(?=a)(?=a)", subject, 0, options); actual.Kind != CountOutcomeUncertain {
		t.Errorf("cumulative count budget returned %+v", actual)
	}
	if actual := Find("[", "", 100, options); actual.Kind != MatchOutcomeInvalidPattern {
		t.Errorf("invalid pattern beyond subject returned %+v", actual)
	}
}

func TestRepetitionWithoutStartingLiteral(t *testing.T) {
	result := Find("a(b)*c", strings.Repeat("b", 300), 0, testOptions(Syntax{Kind: SyntaxAdvanced}, true, true, false, false))
	if result.Kind != MatchOutcomeNoMatch {
		t.Errorf("unexpected match: %+v", result)
	}
}
