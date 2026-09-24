package generated

import "testing"

func TestLiteralSlice(t *testing.T) {
	found := find_literal("😀", "a😀a", 0, true)
	if found != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 2}}) {
		t.Errorf("literal match = %+v", found)
	}
	empty := find_literal("", "a😀a", 3, true)
	if empty != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 3, end: 3}}) {
		t.Errorf("empty literal match = %+v", empty)
	}
	if find_literal("a", "a😀a", 4, true).kind != MatchOutcomeNoMatch {
		t.Error("out-of-range start matched")
	}
	if find_literal("a", "bA", 0, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 2}}) {
		t.Error("ASCII case folding missed match")
	}
	if find_literal("Z", "z", 0, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 0, end: 1}}) {
		t.Error("ASCII case folding missed range endpoint")
	}
	if find_literal("a", "A", 0, true).kind != MatchOutcomeNoMatch {
		t.Error("case sensitive search matched different case")
	}
	if find_literal("Å", "å", 0, false).kind != MatchOutcomeNoMatch || find_literal("K", "K", 0, false).kind != MatchOutcomeNoMatch {
		t.Error("non-ASCII case folding changed match")
	}
	if find_any_character("\n😀", 0, true) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 0, end: 1}}) {
		t.Error("ordinary dot skipped newline")
	}
	if find_any_character("\n😀", 0, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 2}}) {
		t.Error("newline-sensitive dot missed Unicode scalar")
	}
	if find_any_character("\n", 0, false).kind != MatchOutcomeNoMatch || find_any_character("😀", 1, true).kind != MatchOutcomeNoMatch {
		t.Error("dot matched outside the allowed position range")
	}
	if find_simple_advanced("a.b", "za😀b", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 4}}) {
		t.Error("simple sequence missed Unicode wildcard")
	}
	if find_simple_advanced("a.b", "a\nb", 0, true, false, true).kind != MatchOutcomeNoMatch {
		t.Error("simple sequence crossed excluded newline")
	}
	if find_simple_advanced("a*", "aaa", 0, true, true, false).kind != MatchOutcomeUncertain {
		t.Error("unsupported regex operator stayed definite")
	}
	if find_simple_advanced("^a$", "\na\n", 0, true, false, true) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 2}}) {
		t.Error("line anchors missed interior line")
	}
	if find_simple_advanced("^a$", "\na\n", 0, true, true, false).kind != MatchOutcomeNoMatch {
		t.Error("ordinary anchors matched interior line")
	}
	if !supports_simple_advanced("a\\.b") || supports_simple_advanced("a\\nb") {
		t.Error("escaped punctuation support classification changed")
	}
	if find_simple_advanced("a\\.b", "za.b", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 4}}) {
		t.Error("escaped dot missed literal match")
	}
	if find_simple_advanced("\\^a", "z^a", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 3}}) {
		t.Error("escaped anchor changed position")
	}
	if !supports_simple_advanced("a[bc]d") || !supports_simple_advanced("a[b-d]") {
		t.Error("literal class support classification changed")
	}
	if find_simple_advanced("a[bc]d", "zacd", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 4}}) {
		t.Error("literal class missed sequence match")
	}
	if find_simple_advanced("[A]", "a", 0, false, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 0, end: 1}}) {
		t.Error("literal class missed ASCII case fold")
	}
	if !supports_simple_advanced("[^ab]") || !supports_simple_advanced("[^a-z]") {
		t.Error("negated class support classification changed")
	}
	if find_simple_advanced("[^a]", "\n", 0, true, false, false).kind != MatchOutcomeNoMatch {
		t.Error("newline-sensitive negated class matched newline")
	}
	if find_simple_advanced("[^a]", "\n", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 0, end: 1}}) {
		t.Error("ordinary negated class missed newline")
	}
	if !supports_simple_advanced("[a-c]") || supports_simple_advanced("[z-a]") {
		t.Error("range support classification changed")
	}
	if find_simple_advanced("[A-C]", "b", 0, false, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 0, end: 1}}) {
		t.Error("case insensitive range missed ASCII letter")
	}
	if find_simple_advanced("[0-9]", "😀", 0, true, true, false).kind != MatchOutcomeNoMatch {
		t.Error("ASCII range matched supplementary Unicode scalar")
	}
	if !supports_simple_advanced("[-a]") || !supports_simple_advanced("[]a]") || supports_simple_advanced("[--a]") {
		t.Error("class edge punctuation support classification changed")
	}
	if find_simple_advanced("[-a]", "-", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 0, end: 1}}) {
		t.Error("leading hyphen missed literal match")
	}
	if find_simple_advanced("[]a]", "z]", 0, true, true, false) != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 2}}) {
		t.Error("leading closing bracket missed literal match")
	}
	if charge_work(1999999, 1) != (WorkOutcome{kind: WorkOutcomeReady, ready: 2000000}) {
		t.Error("work charge at budget changed result")
	}
	if charge_work(2000000, 1).kind != WorkOutcomeUncertain {
		t.Error("work charge over budget stayed definite")
	}
}
