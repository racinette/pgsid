package generated

import "testing"

func TestLiteralSlice(t *testing.T) {
	found := find_literal("😀", "a😀a", 0)
	if found != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 1, end: 2}}) {
		t.Errorf("literal match = %+v", found)
	}
	empty := find_literal("", "a😀a", 3)
	if empty != (MatchOutcome{kind: MatchOutcomeFound, found: MatchSpan{start: 3, end: 3}}) {
		t.Errorf("empty literal match = %+v", empty)
	}
	if find_literal("a", "a😀a", 4).kind != MatchOutcomeNoMatch {
		t.Error("out-of-range start matched")
	}
	if charge_work(1999999, 1) != (WorkOutcome{kind: WorkOutcomeReady, ready: 2000000}) {
		t.Error("work charge at budget changed result")
	}
	if charge_work(2000000, 1).kind != WorkOutcomeUncertain {
		t.Error("work charge over budget stayed definite")
	}
}
