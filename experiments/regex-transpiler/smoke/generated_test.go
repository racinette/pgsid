package generated

import "testing"

func TestTranspilerSmoke(t *testing.T) {
	input := Span{Start: 1, End: 3}
	actual := ShiftSpan(input, 2)
	expected := Span{Start: 3, End: 5}
	if !SameSpan(actual, expected) || input != (Span{Start: 1, End: 3}) {
		t.Errorf("ShiftSpan(%+v, 2) = %+v", input, actual)
	}
	parameter := Span{Start: 1, End: 3}
	if shifted := ShiftParameter(parameter, 2); shifted != (Span{Start: 3, End: 3}) || parameter != (Span{Start: 1, End: 3}) {
		t.Errorf("ShiftParameter(%+v, 2) = %+v", parameter, shifted)
	}
	snapshotInput := Span{Start: 1, End: 3}
	if snapshot := SnapshotBeforeShift(snapshotInput, 2); snapshot != (Snapshot{Before: Span{Start: 1, End: 3}, After: Span{Start: 3, End: 3}}) || snapshotInput != (Span{Start: 1, End: 3}) {
		t.Errorf("SnapshotBeforeShift(%+v, 2) = %+v", snapshotInput, snapshot)
	}
	characters := []rune{'a'}
	echoed := EchoChars(characters)
	echoed[0] = 'b'
	if characters[0] != 'a' {
		t.Errorf("echo_chars shared backing storage with its input")
	}
	bag := CharBag{Characters: []rune{'a'}}
	echoedBag := EchoBag(bag)
	echoedBag.Characters[0] = 'b'
	if bag.Characters[0] != 'a' {
		t.Errorf("echo_bag shared backing storage with its input")
	}
	if character := CharAt([]rune{'a'}, 0); character != 'a' {
		t.Errorf("char_at returned %q", character)
	}
	if AddPositions(2, 3) != 5 || SubtractPositions(5, 3) != 2 {
		t.Error("position arithmetic changed its result")
	}
	expectPanic(t, func() { AddPositions(2147483647, 1) })
	expectPanic(t, func() { SubtractPositions(0, 1) })
	expectPanic(t, func() { EchoChars([]rune{0xd800}) })
	if !IsBeforeFirst(-1) || CharCount("😀") != 1 {
		t.Error("numeric or Unicode input changed its result")
	}
	if CharCodepoint('😀') != 128512 {
		t.Error("Unicode scalar cast changed value")
	}
	if ChoosePosition(2, 3) != 2 || ChoosePosition(4, 3) != 3 {
		t.Error("else branch changed the selected position")
	}
	if ChooseWithReturns(2, 3) != 2 || ChooseWithReturns(4, 3) != 3 {
		t.Error("else branch changed the selected return")
	}
	if ClassifyPosition(2, 3) != 1 || ClassifyPosition(3, 3) != 2 || ClassifyPosition(4, 3) != 3 {
		t.Error("else-if chain changed the selected branch")
	}
	if !BelowDefaultLimit(2) || BelowDefaultLimit(3) {
		t.Error("private constant changed the default limit")
	}
	if NamedPosition(NamedSpan{FromPosition: 2}) != 2 {
		t.Error("named field changed its position")
	}
	if StackProbe(3) != 6 {
		t.Error("mutable vector stack changed its result")
	}
	positions := []int{2}
	if AppendPosition(positions, 4) != 2 || OverwritePosition(positions, 0, 4) != 4 || positions[0] != 2 {
		t.Error("mutable vector input changed its caller's storage")
	}
	expectPanic(t, func() { AppendPosition([]int{-1}, 4) })
	expectPanic(t, func() { AppendPosition(positions, 2147483648) })
	expectPanic(t, func() { OverwritePosition(positions, 1, 4) })
	expectPanic(t, func() { CharCount(string([]byte{0xff})) })
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
