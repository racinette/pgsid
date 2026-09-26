package generated

import "testing"

func TestLiteralSlice(t *testing.T) {
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
	if FindSimpleAdvanced("a*", "aaa", 0, true, true, false).Kind != MatchOutcomeUncertain {
		t.Error("unsupported regex operator stayed definite")
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
