package generated

import "testing"

func TestTranspilerSmoke(t *testing.T) {
	input := Span{start: 1, end: 3}
	actual := shift_span(input, 2)
	expected := Span{start: 3, end: 5}
	if !same_span(actual, expected) || input != (Span{start: 1, end: 3}) {
		t.Errorf("shift_span(%+v, 2) = %+v", input, actual)
	}
	parameter := Span{start: 1, end: 3}
	if shifted := shift_parameter(parameter, 2); shifted != (Span{start: 3, end: 3}) || parameter != (Span{start: 1, end: 3}) {
		t.Errorf("shift_parameter(%+v, 2) = %+v", parameter, shifted)
	}
	snapshotInput := Span{start: 1, end: 3}
	if snapshot := snapshot_before_shift(snapshotInput, 2); snapshot != (Snapshot{before: Span{start: 1, end: 3}, after: Span{start: 3, end: 3}}) || snapshotInput != (Span{start: 1, end: 3}) {
		t.Errorf("snapshot_before_shift(%+v, 2) = %+v", snapshotInput, snapshot)
	}
	characters := []rune{'a'}
	echoed := echo_chars(characters)
	echoed[0] = 'b'
	if characters[0] != 'a' {
		t.Errorf("echo_chars shared backing storage with its input")
	}
	bag := CharBag{characters: []rune{'a'}}
	echoedBag := echo_bag(bag)
	echoedBag.characters[0] = 'b'
	if bag.characters[0] != 'a' {
		t.Errorf("echo_bag shared backing storage with its input")
	}
	if character := char_at([]rune{'a'}, 0); character != 'a' {
		t.Errorf("char_at returned %q", character)
	}
	if add_positions(2, 3) != 5 || subtract_positions(5, 3) != 2 {
		t.Error("position arithmetic changed its result")
	}
	expectPanic(t, func() { add_positions(2147483647, 1) })
	expectPanic(t, func() { subtract_positions(0, 1) })
	expectPanic(t, func() { echo_chars([]rune{0xd800}) })
	if !is_before_first(-1) || char_count("😀") != 1 {
		t.Error("numeric or Unicode input changed its result")
	}
	expectPanic(t, func() { char_count(string([]byte{0xff})) })
}

func expectPanic(t *testing.T, run func()) {
	t.Helper()
	defer func() {
		if recover() == nil {
			t.Error("expected an out-of-domain input to fail")
		}
	}()
	run()
}
