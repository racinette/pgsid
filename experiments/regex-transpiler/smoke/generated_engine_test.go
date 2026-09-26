package generated

import "testing"

func TestLiteralSlice(t *testing.T) {
	if !SupportsFlatGroups("a((b)c)", false) {
		t.Error("plain nested capture groups were rejected")
	}
	for _, pattern := range []string{"(a|b)c", "(ab)+", "(a)\\1", "(?=a)a", "(ab"} {
		if SupportsFlatGroups(pattern, false) {
			t.Errorf("group with changed semantics was accepted: %q", pattern)
		}
	}
	if !SupportsGroupChoice("a(b|bc)", false) {
		t.Error("single group choice was rejected")
	}
	for _, pattern := range []string{"(a|b)+", "((a|b))", "(a|b)\\1", "(?=a|b)c", "a|b(c|d)"} {
		if SupportsGroupChoice(pattern, false) {
			t.Errorf("unsupported group choice was accepted: %q", pattern)
		}
	}
	if !SupportsFixedLookbehind("(?<=ab)c", false) {
		t.Error("fixed lookbehind was rejected")
	}
	for _, pattern := range []string{"(?<=a|b)c", "(?<=a+)c", "(?<=a\\n)b", "(?=a)b"} {
		if SupportsFixedLookbehind(pattern, false) {
			t.Errorf("unsupported lookbehind was accepted: %q", pattern)
		}
	}
	if !SupportsLeadingLookahead("(?=ab)a.", false) {
		t.Error("leading lookahead was rejected")
	}
	for _, pattern := range []string{"(?=(ab))a", "(?=[ab])a", "a(?=b)b", "(?=a\\n)b"} {
		if SupportsLeadingLookahead(pattern, false) {
			t.Errorf("unsupported lookahead was accepted: %q", pattern)
		}
	}
	if !SupportsFixedBackref("(ab)c\\1", false) {
		t.Error("fixed backreference was rejected")
	}
	for _, pattern := range []string{"([ab])\\1", "(a+)\\1", "(a)\\2", "(a)|(b)\\1", "(a)*\\1"} {
		if SupportsFixedBackref(pattern, false) {
			t.Errorf("unsupported backreference was accepted: %q", pattern)
		}
	}
	for _, pattern := range []string{"(?i)ab", "(?n)^b", "(?x)a b", "(?t)a b"} {
		if !SupportsInlineAdvanced(pattern, false) {
			t.Errorf("supported inline flag was rejected: %q", pattern)
		}
	}
	for _, pattern := range []string{"(?b)a+b", "(?e)a+b", "a(?i)b", "(?z)ab"} {
		if SupportsInlineAdvanced(pattern, false) {
			t.Errorf("unsupported inline flag was accepted: %q", pattern)
		}
	}
	found := FindLiteral("😀", "a😀a", 0, true)
	if found != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Errorf("literal match = %+v", found)
	}
	empty := FindLiteral("", "a😀a", 3, true)
	if empty != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 3, End: 3}}) {
		t.Errorf("empty literal match = %+v", empty)
	}
	if FindLiteral("a", "a😀a", 4, true).Kind != MatchOutcomeNoMatch {
		t.Error("out-of-range start matched")
	}
	if FindLiteral("a", "bA", 0, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("ASCII case folding missed match")
	}
	if FindLiteral("Z", "z", 0, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("ASCII case folding missed range endpoint")
	}
	if FindLiteral("a", "A", 0, true).Kind != MatchOutcomeNoMatch {
		t.Error("case sensitive search matched different case")
	}
	if FindLiteral("Å", "å", 0, false).Kind != MatchOutcomeNoMatch || FindLiteral("K", "K", 0, false).Kind != MatchOutcomeNoMatch {
		t.Error("non-ASCII case folding changed match")
	}
	if FindAnyCharacter("\n😀", 0, true) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("ordinary dot skipped newline")
	}
	if FindAnyCharacter("\n😀", 0, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("newline-sensitive dot missed Unicode scalar")
	}
	if FindAnyCharacter("\n", 0, false).Kind != MatchOutcomeNoMatch || FindAnyCharacter("😀", 1, true).Kind != MatchOutcomeNoMatch {
		t.Error("dot matched outside the allowed position range")
	}
	if FindSimpleAdvanced("a.b", "za😀b", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("simple sequence missed Unicode wildcard")
	}
	if FindSimpleAdvanced("a.b", "a\nb", 0, true, false, true).Kind != MatchOutcomeNoMatch {
		t.Error("simple sequence crossed excluded newline")
	}
	if FindSimpleAdvanced("a*", "aaa", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 3}}) {
		t.Error("zero-or-more missed the longest endpoint")
	}
	if FindSimpleAdvanced("a+b", "zaaab", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 5}}) {
		t.Error("one-or-more missed repeated prefix")
	}
	if FindSimpleAdvanced("[ab]*c", "abbc", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 4}}) {
		t.Error("class repetition missed sequence")
	}
	if FindSimpleAdvanced("a|ab", "ab", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 2}}) {
		t.Error("alternation missed longest endpoint")
	}
	if FindSimpleAdvanced("a|b", "ba", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("alternation missed earliest start")
	}
	if FindSimpleAdvanced("a*?", "aaa", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 0}}) {
		t.Error("lazy zero-or-more missed shortest endpoint")
	}
	if FindSimpleAdvanced("a+?", "aaa", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("lazy one-or-more missed shortest endpoint")
	}
	if FindSimpleAdvanced("a{2,4}b", "aaaab", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 5}}) {
		t.Error("bounded repeat missed its upper endpoint")
	}
	if FindSimpleAdvanced("a{0}", "bbb", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 0}}) {
		t.Error("zero fixed repeat missed empty match")
	}
	if SupportsSimpleAdvanced("a{256}") {
		t.Error("out-of-range bound was accepted")
	}
	if FindSimpleAdvanced("a{foo}", "za{foo}", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 7}}) {
		t.Error("nonnumeric braces lost their literal meaning")
	}
	if CountSimpleAdvanced("a*", "baa", 0, true, true, false) != (CountOutcome{Kind: CountOutcomeCount, Count: 3}) {
		t.Error("count missed empty matches or nonoverlapping advance")
	}
	if CountSimpleAdvanced("a*?", "aaa", 0, true, true, false) != (CountOutcome{Kind: CountOutcomeCount, Count: 4}) {
		t.Error("lazy count missed empty matches")
	}
	if !SupportsExpandedAdvanced("a # comment\nb") || FindExpandedAdvanced("a # comment\nb", "ab", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 2}}) {
		t.Error("expanded comment was not removed")
	}
	if FindExpandedAdvanced("a[ #]b", "za#b", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("expanded bracket characters were removed")
	}
	if CountExpandedAdvanced("a *", "baa", 0, true, true, false) != (CountOutcome{Kind: CountOutcomeCount, Count: 3}) {
		t.Error("expanded count missed empty matches")
	}
	if FindSimpleAdvanced("^a$", "\na\n", 0, true, false, true) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("line anchors missed interior line")
	}
	if FindSimpleAdvanced("^a$", "\na\n", 0, true, true, false).Kind != MatchOutcomeNoMatch {
		t.Error("ordinary anchors matched interior line")
	}
	if !SupportsSimpleAdvanced("a\\.b") || !SupportsSimpleAdvanced("a\\nb") {
		t.Error("escaped punctuation or control support classification changed")
	}
	if FindSimpleAdvanced("a\\.b", "za.b", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("escaped dot missed literal match")
	}
	if FindSimpleAdvanced("\\^a", "z^a", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 3}}) {
		t.Error("escaped anchor changed position")
	}
	if !SupportsSimpleAdvanced("a[bc]d") || !SupportsSimpleAdvanced("a[b-d]") {
		t.Error("literal class support classification changed")
	}
	if FindSimpleAdvanced("a[bc]d", "zacd", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 4}}) {
		t.Error("literal class missed sequence match")
	}
	if FindSimpleAdvanced("[A]", "a", 0, false, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("literal class missed ASCII case fold")
	}
	if !SupportsSimpleAdvanced("[^ab]") || !SupportsSimpleAdvanced("[^a-z]") {
		t.Error("negated class support classification changed")
	}
	if FindSimpleAdvanced("[^a]", "\n", 0, true, false, false).Kind != MatchOutcomeNoMatch {
		t.Error("newline-sensitive negated class matched newline")
	}
	if FindSimpleAdvanced("[^a]", "\n", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("ordinary negated class missed newline")
	}
	if !SupportsSimpleAdvanced("[a-c]") || SupportsSimpleAdvanced("[z-a]") {
		t.Error("range support classification changed")
	}
	if FindSimpleAdvanced("[A-C]", "b", 0, false, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("case insensitive range missed ASCII letter")
	}
	if FindSimpleAdvanced("[0-9]", "😀", 0, true, true, false).Kind != MatchOutcomeNoMatch {
		t.Error("ASCII range matched supplementary Unicode scalar")
	}
	if !SupportsSimpleAdvanced("[-a]") || !SupportsSimpleAdvanced("[]a]") || SupportsSimpleAdvanced("[--a]") {
		t.Error("class edge punctuation support classification changed")
	}
	if FindSimpleAdvanced("[-a]", "-", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 0, End: 1}}) {
		t.Error("leading hyphen missed literal match")
	}
	if FindSimpleAdvanced("[]a]", "z]", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 1, End: 2}}) {
		t.Error("leading closing bracket missed literal match")
	}
	if !SupportsSimpleAdvanced("\\A😀\\Z") {
		t.Error("absolute anchors were rejected")
	}
	if FindSimpleAdvanced("\\Aa", "\na", 0, true, true, true).Kind != MatchOutcomeNoMatch {
		t.Error("absolute start anchor matched after newline")
	}
	if FindSimpleAdvanced("\\Z", "a\n", 0, true, true, false) != (MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: 2, End: 2}}) {
		t.Error("absolute end anchor matched before final newline")
	}
	if FindSimpleAdvanced("\\A", "a", 1, true, true, false).Kind != MatchOutcomeNoMatch {
		t.Error("absolute start anchor ignored search offset")
	}
	if ChargeWork(1999999, 1) != (WorkOutcome{Kind: WorkOutcomeReady, Ready: 2000000}) {
		t.Error("work charge at budget changed result")
	}
	if ChargeWork(2000000, 1).Kind != WorkOutcomeUncertain {
		t.Error("work charge over budget stayed definite")
	}
}
