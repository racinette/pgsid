package generated

import "testing"

func TestTranspilerSmoke(t *testing.T) {
	wrappedText := WrapText("value")
	if !SameText(wrappedText, "value") || SameText(wrappedText, "other") {
		t.Fatal("borrowed text wrapper changed its contents")
	}
	if !SameWrappedText(MakeWrappedText("value"), "value") || SameWrappedText(MakeWrappedText("value"), "other") || SameWrappedText(WrappedText{Kind: WrappedTextMissing}, "value") {
		t.Fatal("enum payload destructuring changed its contents")
	}
	if !WrappedTextIsValue(MakeWrappedText("value")) || WrappedTextIsValue(WrappedText{Kind: WrappedTextMissing}) {
		t.Fatal("unused destructured payload changed the variant test")
	}
	wrappedSpanInput := Span{Start: 2, End: 4}
	if ShiftWrappedSpan(MakeWrappedSpan(wrappedSpanInput), 3) != 5 || wrappedSpanInput != (Span{Start: 2, End: 4}) {
		t.Fatal("destructured struct payload shared caller storage")
	}
	input := Span{Start: 1, End: 3}
	actual := ShiftSpan(input, 2)
	expected := Span{Start: 3, End: 5}
	if !SameSpan(actual, expected) || input != (Span{Start: 1, End: 3}) {
		t.Errorf("ShiftSpan(%+v, 2) = %+v", input, actual)
	}
	if SpanStart(&input) != 1 || BorrowedSpanStart(input) != 1 {
		t.Fatal("borrowed struct read differed")
	}
	expectPanic(t, func() { SpanStart(&Span{Start: -1, End: 2}) })
	token := MakeToken(7)
	if TokenValue(&token) != 7 {
		t.Fatal("opaque borrowed struct differed")
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
	forwarded := ForwardedChars(characters)
	forwarded[0] = 'b'
	if characters[0] != 'a' {
		t.Errorf("forwarded_chars shared backing storage with its input")
	}
	if ForwardedSpan(input, 2) != expected || input != (Span{Start: 1, End: 3}) {
		t.Errorf("forwarded_span changed value semantics")
	}
	if built := CharStack('😀'); len(built) != 1 || built[0] != 'b' {
		t.Errorf("char stack changed its contents: %+v", built)
	}
	if !EchoBool(true) || EchoBool(false) {
		t.Error("boolean argument changed value")
	}
	if built := SpanStack(Span{Start: 1, End: 2}); len(built) != 1 || built[0] != (Span{Start: 2, End: 2}) {
		t.Errorf("span stack changed its contents: %+v", built)
	}
	spanStack := []Span{{Start: 1, End: 2}}
	shiftedSpanStack := ShiftSpanStack(spanStack, 0, 2)
	if spanStack[0].Start != 1 || shiftedSpanStack[0] != (Span{Start: 3, End: 2}) || SpanStackAt(shiftedSpanStack, 0) != shiftedSpanStack[0] {
		t.Error("span stack failed to detach its input")
	}
	spanStack[0].Start = 9
	if shiftedSpanStack[0].Start != 3 {
		t.Error("span stack shares caller storage")
	}
	expectPanic(t, func() { SpanStackAt(shiftedSpanStack, 1) })
	expectPanic(t, func() { ShiftSpanStack([]Span{{Start: -1, End: 2}}, 0, 2) })
	expectPanic(t, func() { CharStack(0xd800) })
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
	if SignedAdd(-2, 5) != 3 || SignedSubtract(-2, 5) != -7 || SignedNegate(-5) != 5 || SignedMinimum() != -2147483648 {
		t.Error("signed arithmetic changed its result")
	}
	if SignedAdd(-2147483648, 1) != -2147483647 || SignedSubtract(2147483647, 1) != 2147483646 {
		t.Error("signed arithmetic boundary changed its result")
	}
	expectPanic(t, func() { SignedAdd(2147483647, 1) })
	expectPanic(t, func() { SignedAdd(-2147483648, -1) })
	expectPanic(t, func() { SignedSubtract(-2147483648, 1) })
	expectPanic(t, func() { SignedSubtract(2147483647, -1) })
	expectPanic(t, func() { SignedNegate(-2147483648) })
	expectPanic(t, func() { EchoChars([]rune{0xd800}) })
	if !IsBeforeFirst(-1) || CharCount("😀") != 1 {
		t.Error("numeric or Unicode input changed its result")
	}
	if CharCodepoint('😀') != 128512 {
		t.Error("Unicode scalar cast changed value")
	}
	if !MatchesLiteral("a\"b\\c\n😀\x00") || MatchesLiteral("housed") {
		t.Error("string literal changed its value")
	}
	if !MatchesEmpty("") || MatchesEmpty("a") {
		t.Error("empty string literal changed its value")
	}
	if IndexFromCodepoint('😀') != 128512 {
		t.Error("checked unsigned cast changed value")
	}
	if IndexFromU32(2147483647) != 2147483647 {
		t.Error("checked unsigned cast changed shared maximum")
	}
	expectPanic(t, func() { IndexFromU32(2147483648) })
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

func TestCompositeLiteralsInConditions(t *testing.T) {
	if ConditionLiterals(ConditionMode{Kind: ConditionModeRun}) != 1 || ConditionLiterals(ConditionMode{Kind: ConditionModeStop}) != 0 {
		t.Fatal("enum literal comparison changed branch or loop behavior")
	}
	if SelectConditionMode(ConditionMode{Kind: ConditionModeRun}, true).Kind != ConditionModeStop ||
		SelectConditionMode(ConditionMode{Kind: ConditionModeRun}, false).Kind != ConditionModeRun {
		t.Fatal("Copy enum assignment changed branch behavior")
	}
}
