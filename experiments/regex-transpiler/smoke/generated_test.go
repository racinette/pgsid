package generated

import "testing"

func TestTranspilerSmoke(t *testing.T) {
	input := Span{start: 1, end: 3}
	actual := shift_span(input, 2)
	expected := Span{start: 3, end: 5}
	if !same_span(actual, expected) || input != (Span{start: 1, end: 3}) {
		t.Errorf("shift_span(%+v, 2) = %+v", input, actual)
	}
}
