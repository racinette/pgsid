package generated

import "unicode/utf8"

func checkedOpaqueBorrow[T any](value *T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	return value
}

func checkedBorrowed[T any](value *T, copyValue func(T) T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	copied := copyValue(*value)
	return &copied
}

const maxSharedIndex = 2147483647

func checkedIndex(value int) int {
	if value < 0 || value > maxSharedIndex {
		panic("index outside shared numeric range")
	}
	return value
}

func checkedI32(value int) int {
	if value < -2147483648 || value > maxSharedIndex {
		panic("signed integer outside shared numeric range")
	}
	return value
}

func checkedAdd(left int, right int) int {
	checkedIndex(left)
	checkedIndex(right)
	if right > maxSharedIndex-left {
		panic("shared numeric overflow")
	}
	return left + right
}

func checkedSubtract(left int, right int) int {
	checkedIndex(left)
	checkedIndex(right)
	if right > left {
		panic("shared numeric underflow")
	}
	return left - right
}

func checkedChar(value rune) rune {
	if value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) {
		panic("invalid Unicode scalar")
	}
	return value
}

func asciiLowercase(value rune) rune {
	checkedChar(value)
	if value >= 'A' && value <= 'Z' {
		return value + ('a' - 'A')
	}
	return value
}

func checkedString(value string) string {
	if len(value) > maxSharedIndex || !utf8.ValidString(value) {
		panic("invalid or oversized string")
	}
	return value
}

func checkedChars(value []rune) []rune {
	if len(value) > maxSharedIndex {
		panic("vector outside shared numeric range")
	}
	result := make([]rune, len(value))
	for index, character := range value {
		result[index] = checkedChar(character)
	}
	return result
}

func checkedIndices(value []int) []int {
	if len(value) > maxSharedIndex {
		panic("vector outside shared numeric range")
	}
	result := make([]int, len(value))
	for index, position := range value {
		result[index] = checkedIndex(position)
	}
	return result
}

func checkedStructs[T any](value []T, copyValue func(T) T) []T {
	checkedIndex(len(value))
	result := make([]T, len(value))
	for index, entry := range value {
		result[index] = copyValue(entry)
	}
	return result
}

const maxCaptureWork = 2000000
const vmLiteral = 1
const vmAny = 2
const vmWord = 3
const vmOpen = 4
const vmClose = 5
const vmBackref = 6
const vmSplit = 7
const vmBegin = 8
const vmEnd = 9
const vmAccept = 10
const vmJump = 11
const vmClass = 12
const vmNumeric = 13
const vmWordEnd = 14
const vmWordBegin = 26
const vmAbsoluteBegin = 27
const vmAbsoluteEnd = 28
const vmBoundary = 29
const vmNotBoundary = 30
const captureClassRange = 15
const nodeSequence = 16
const nodeAlternative = 17
const nodeGroup = 18
const nodeRepeat = 19
const nodeEmpty = 20
const vmClear = 21
const maxCaptureInstructions = 100000
const nodeLookahead = 22
const nodeNotLookahead = 23
const nodeLookbehind = 24
const nodeNotLookbehind = 25
const dissectEnter = 0
const dissectLeft = 1
const dissectRight = 2
const dissectGroup = 3
const dissectAlternative = 4
const dissectLastAlternative = 5
const dissectPrefix = 6
const dissectLastRepeat = 7
const dissectIteration = 8
const dissectIterationResult = 9
const dissectIterationAdvance = 10
const dissectAssertion = 11

type SyntaxKind uint8

const (
	SyntaxAdvanced SyntaxKind = iota
	SyntaxBasic
	SyntaxExtended
	SyntaxLiteral
)

type Syntax struct {
	Kind SyntaxKind
}

func copySyntax(value Syntax) Syntax {
	switch value.Kind {
	case SyntaxAdvanced:
		return Syntax{Kind: SyntaxAdvanced}
	case SyntaxBasic:
		return Syntax{Kind: SyntaxBasic}
	case SyntaxExtended:
		return Syntax{Kind: SyntaxExtended}
	case SyntaxLiteral:
		return Syntax{Kind: SyntaxLiteral}
	}
	panic("unknown enum variant")
}

type NewlineModeKind uint8

const (
	NewlineModeOrdinary NewlineModeKind = iota
	NewlineModeSensitive
	NewlineModeStop
	NewlineModeAnchors
)

type NewlineMode struct {
	Kind NewlineModeKind
}

func copyNewlineMode(value NewlineMode) NewlineMode {
	switch value.Kind {
	case NewlineModeOrdinary:
		return NewlineMode{Kind: NewlineModeOrdinary}
	case NewlineModeSensitive:
		return NewlineMode{Kind: NewlineModeSensitive}
	case NewlineModeStop:
		return NewlineMode{Kind: NewlineModeStop}
	case NewlineModeAnchors:
		return NewlineMode{Kind: NewlineModeAnchors}
	}
	panic("unknown enum variant")
}

type RegexOptions struct {
	Syntax        Syntax
	CaseSensitive bool
	Expanded      bool
	Newline       NewlineMode
}

func copyRegexOptions(value RegexOptions) RegexOptions {
	return RegexOptions{Syntax: copySyntax(value.Syntax), CaseSensitive: value.CaseSensitive, Expanded: value.Expanded, Newline: copyNewlineMode(value.Newline)}
}
func Find(pattern string, subject string, from int, options RegexOptions) MatchOutcome {
	pattern = checkedString(pattern)
	subject = checkedString(subject)
	from = checkedIndex(from)
	options = copyRegexOptions(options)
	return captureMatchOutcome(executePattern(pattern, subject, from, options, false, false, false))
}
func Count(pattern string, subject string, from int, options RegexOptions) CountOutcome {
	pattern = checkedString(pattern)
	subject = checkedString(subject)
	from = checkedIndex(from)
	options = copyRegexOptions(options)
	result := executePattern(pattern, subject, from, options, true, false, false)
	if result.kind == 2 {
		return CountOutcome{Kind: CountOutcomeUncertain}
	}
	if result.kind == 3 {
		return CountOutcome{Kind: CountOutcomeInvalidPattern}
	}
	return CountOutcome{Kind: CountOutcomeCount, Count: result.count}
}

type MatchListOutcomeKind uint8

const (
	MatchListOutcomeMatches MatchListOutcomeKind = iota
	MatchListOutcomeInvalidPattern
	MatchListOutcomeUncertain
)

type MatchListOutcome struct {
	Kind    MatchListOutcomeKind
	Matches []MatchSpan
}

func copyMatchListOutcome(value MatchListOutcome) MatchListOutcome {
	switch value.Kind {
	case MatchListOutcomeMatches:
		return MatchListOutcome{Kind: MatchListOutcomeMatches, Matches: checkedStructs(value.Matches, copyMatchSpan)}
	case MatchListOutcomeInvalidPattern:
		return MatchListOutcome{Kind: MatchListOutcomeInvalidPattern}
	case MatchListOutcomeUncertain:
		return MatchListOutcome{Kind: MatchListOutcomeUncertain}
	}
	panic("unknown enum variant")
}
func FindAll(pattern string, subject string, from int, options RegexOptions) MatchListOutcome {
	pattern = checkedString(pattern)
	subject = checkedString(subject)
	from = checkedIndex(from)
	options = copyRegexOptions(options)
	result := executePattern(pattern, subject, from, options, true, false, true)
	if result.kind == 2 {
		return MatchListOutcome{Kind: MatchListOutcomeUncertain}
	}
	if result.kind == 3 {
		return MatchListOutcome{Kind: MatchListOutcomeInvalidPattern}
	}
	return MatchListOutcome{Kind: MatchListOutcomeMatches, Matches: result.matches}
}

type CompileOutcomeKind uint8

const (
	CompileOutcomeCompiled CompileOutcomeKind = iota
	CompileOutcomeInvalidPattern
	CompileOutcomeUncertain
)

type CompileOutcome struct {
	Kind     CompileOutcomeKind
	Compiled CompiledRegex
}

func copyCompileOutcome(value CompileOutcome) CompileOutcome {
	switch value.Kind {
	case CompileOutcomeCompiled:
		return CompileOutcome{Kind: CompileOutcomeCompiled, Compiled: copyCompiledRegex(value.Compiled)}
	case CompileOutcomeInvalidPattern:
		return CompileOutcome{Kind: CompileOutcomeInvalidPattern}
	case CompileOutcomeUncertain:
		return CompileOutcome{Kind: CompileOutcomeUncertain}
	}
	panic("unknown enum variant")
}
func Compile(pattern string, options RegexOptions) CompileOutcome {
	pattern = checkedString(pattern)
	options = copyRegexOptions(options)
	if options.Syntax == (Syntax{Kind: SyntaxLiteral}) && (options.Expanded || options.Newline != (NewlineMode{Kind: NewlineModeOrdinary})) {
		return CompileOutcome{Kind: CompileOutcomeInvalidPattern}
	}
	program := compilePatternSource(pattern, options, true)
	if program.limited {
		return CompileOutcome{Kind: CompileOutcomeUncertain}
	}
	if program.valid == false {
		return CompileOutcome{Kind: CompileOutcomeInvalidPattern}
	}
	return CompileOutcome{Kind: CompileOutcomeCompiled, Compiled: program}
}
func FindCompiled(program *CompiledRegex, subject string, from int) MatchOutcome {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	return captureMatchOutcome(executeCompiledPattern(program, subject, from, false, false, false))
}
func CountCompiled(program *CompiledRegex, subject string, from int) CountOutcome {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	result := executeCompiledPattern(program, subject, from, true, false, false)
	if result.kind == 2 {
		return CountOutcome{Kind: CountOutcomeUncertain}
	}
	if result.kind == 3 {
		return CountOutcome{Kind: CountOutcomeInvalidPattern}
	}
	return CountOutcome{Kind: CountOutcomeCount, Count: result.count}
}
func FindAllCompiled(program *CompiledRegex, subject string, from int) MatchListOutcome {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	result := executeCompiledPattern(program, subject, from, true, false, true)
	if result.kind == 2 {
		return MatchListOutcome{Kind: MatchListOutcomeUncertain}
	}
	if result.kind == 3 {
		return MatchListOutcome{Kind: MatchListOutcomeInvalidPattern}
	}
	return MatchListOutcome{Kind: MatchListOutcomeMatches, Matches: result.matches}
}
func CapturesCompiled(program *CompiledRegex, subject string, from int) CaptureOutcome {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	result := executeCompiledPattern(program, subject, from, false, true, false)
	if result.kind == 2 {
		return CaptureOutcome{Kind: CaptureOutcomeUncertain}
	}
	if result.kind == 3 {
		return CaptureOutcome{Kind: CaptureOutcomeInvalidPattern}
	}
	if result.kind == 1 {
		return CaptureOutcome{Kind: CaptureOutcomeNoMatch}
	}
	return CaptureOutcome{Kind: CaptureOutcomeFound, Found: result.groups}
}

type CaptureBatch struct {
	GroupsPerMatch int
	Groups         []CaptureSpan
}

func copyCaptureBatch(value CaptureBatch) CaptureBatch {
	return CaptureBatch{GroupsPerMatch: checkedIndex(value.GroupsPerMatch), Groups: checkedStructs(value.Groups, copyCaptureSpan)}
}

type CaptureListOutcomeKind uint8

const (
	CaptureListOutcomeMatches CaptureListOutcomeKind = iota
	CaptureListOutcomeInvalidPattern
	CaptureListOutcomeUncertain
)

type CaptureListOutcome struct {
	Kind    CaptureListOutcomeKind
	Matches CaptureBatch
}

func copyCaptureListOutcome(value CaptureListOutcome) CaptureListOutcome {
	switch value.Kind {
	case CaptureListOutcomeMatches:
		return CaptureListOutcome{Kind: CaptureListOutcomeMatches, Matches: copyCaptureBatch(value.Matches)}
	case CaptureListOutcomeInvalidPattern:
		return CaptureListOutcome{Kind: CaptureListOutcomeInvalidPattern}
	case CaptureListOutcomeUncertain:
		return CaptureListOutcome{Kind: CaptureListOutcomeUncertain}
	}
	panic("unknown enum variant")
}
func CapturesAllCompiled(program *CompiledRegex, subject string, from int) CaptureListOutcome {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	return captureListOutcome(executeCompiledPattern(program, subject, from, true, true, true))
}

type CaptureSpan struct {
	Matched bool
	Start   int
	End     int
}

func copyCaptureSpan(value CaptureSpan) CaptureSpan {
	return CaptureSpan{Matched: value.Matched, Start: checkedIndex(value.Start), End: checkedIndex(value.End)}
}

type CaptureOutcomeKind uint8

const (
	CaptureOutcomeFound CaptureOutcomeKind = iota
	CaptureOutcomeInvalidPattern
	CaptureOutcomeNoMatch
	CaptureOutcomeUncertain
)

type CaptureOutcome struct {
	Kind  CaptureOutcomeKind
	Found []CaptureSpan
}

func copyCaptureOutcome(value CaptureOutcome) CaptureOutcome {
	switch value.Kind {
	case CaptureOutcomeFound:
		return CaptureOutcome{Kind: CaptureOutcomeFound, Found: checkedStructs(value.Found, copyCaptureSpan)}
	case CaptureOutcomeInvalidPattern:
		return CaptureOutcome{Kind: CaptureOutcomeInvalidPattern}
	case CaptureOutcomeNoMatch:
		return CaptureOutcome{Kind: CaptureOutcomeNoMatch}
	case CaptureOutcomeUncertain:
		return CaptureOutcome{Kind: CaptureOutcomeUncertain}
	}
	panic("unknown enum variant")
}
func Captures(pattern string, subject string, from int, options RegexOptions) CaptureOutcome {
	pattern = checkedString(pattern)
	subject = checkedString(subject)
	from = checkedIndex(from)
	options = copyRegexOptions(options)
	result := executePattern(pattern, subject, from, options, false, true, false)
	if result.kind == 2 {
		return CaptureOutcome{Kind: CaptureOutcomeUncertain}
	}
	if result.kind == 3 {
		return CaptureOutcome{Kind: CaptureOutcomeInvalidPattern}
	}
	if result.kind == 1 {
		return CaptureOutcome{Kind: CaptureOutcomeNoMatch}
	}
	return CaptureOutcome{Kind: CaptureOutcomeFound, Found: result.groups}
}
func CapturesAll(pattern string, subject string, from int, options RegexOptions) CaptureListOutcome {
	pattern = checkedString(pattern)
	subject = checkedString(subject)
	from = checkedIndex(from)
	options = copyRegexOptions(options)
	return captureListOutcome(executePattern(pattern, subject, from, options, true, true, true))
}
func captureListOutcome(result captureRunResult) CaptureListOutcome {
	result = copycaptureRunResult(result)
	if result.kind == 2 {
		return CaptureListOutcome{Kind: CaptureListOutcomeUncertain}
	}
	if result.kind == 3 {
		return CaptureListOutcome{Kind: CaptureListOutcomeInvalidPattern}
	}
	return CaptureListOutcome{Kind: CaptureListOutcomeMatches, Matches: CaptureBatch{GroupsPerMatch: result.groupWidth, Groups: result.groups}}
}

type captureRunResult struct {
	kind       int
	start      int
	end        int
	count      int
	groups     []CaptureSpan
	matches    []MatchSpan
	groupWidth int
	work       int
}

func copycaptureRunResult(value captureRunResult) captureRunResult {
	return captureRunResult{kind: checkedIndex(value.kind), start: checkedIndex(value.start), end: checkedIndex(value.end), count: checkedIndex(value.count), groups: checkedStructs(value.groups, copyCaptureSpan), matches: checkedStructs(value.matches, copyMatchSpan), groupWidth: checkedIndex(value.groupWidth), work: checkedIndex(value.work)}
}
func makeCaptureRunResult(kind int, start int, end int, count int) captureRunResult {
	kind = checkedIndex(kind)
	start = checkedIndex(start)
	end = checkedIndex(end)
	count = checkedIndex(count)
	groups := []CaptureSpan{}
	matches := []MatchSpan{}
	return captureRunResult{kind: kind, start: start, end: end, count: count, groups: groups, matches: matches, groupWidth: 0, work: 0}
}
func completeSearchResult(count int, groups []CaptureSpan, matches []MatchSpan, work int) captureRunResult {
	count = checkedIndex(count)
	groups = checkedStructs(groups, copyCaptureSpan)
	matches = checkedStructs(matches, copyMatchSpan)
	work = checkedIndex(work)
	return captureRunResult{kind: 1, start: 0, end: 0, count: count, groups: groups, matches: matches, groupWidth: 0, work: work}
}
func captureTreeResult(kind int, count int, work int) captureRunResult {
	kind = checkedIndex(kind)
	count = checkedIndex(count)
	work = checkedIndex(work)
	groups := []CaptureSpan{}
	matches := []MatchSpan{}
	return captureRunResult{kind: kind, start: 0, end: 0, count: count, groups: groups, matches: matches, groupWidth: 0, work: work}
}
func captureMatchOutcome(result captureRunResult) MatchOutcome {
	result = copycaptureRunResult(result)
	if result.kind == 2 {
		return MatchOutcome{Kind: MatchOutcomeUncertain}
	}
	if result.kind == 3 {
		return MatchOutcome{Kind: MatchOutcomeInvalidPattern}
	}
	if result.kind == 1 {
		return MatchOutcome{Kind: MatchOutcomeNoMatch}
	}
	return MatchOutcome{Kind: MatchOutcomeFound, Found: MatchSpan{Start: result.start, End: result.end}}
}
func executePattern(pattern string, subject string, from int, options RegexOptions, counting bool, capturing bool, collecting bool) captureRunResult {
	pattern = checkedString(pattern)
	subject = checkedString(subject)
	from = checkedIndex(from)
	options = copyRegexOptions(options)
	if options.Syntax == (Syntax{Kind: SyntaxLiteral}) && (options.Expanded || options.Newline != (NewlineMode{Kind: NewlineModeOrdinary})) {
		return makeCaptureRunResult(3, 0, 0, 0)
	}
	program := compilePatternSource(pattern, options, capturing)
	if program.limited {
		return makeCaptureRunResult(2, 0, 0, 0)
	}
	if program.valid == false {
		return makeCaptureRunResult(3, 0, 0, 0)
	}
	return executeCompiledPattern(&program, subject, from, counting, capturing, collecting)
}
func executeCompiledPattern(program *CompiledRegex, subject string, from int, counting bool, capturing bool, collecting bool) captureRunResult {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	if program.valid == false {
		return makeCaptureRunResult(3, 0, 0, 0)
	}
	result := executeCaptureProgram(program, subject, from, program.caseSensitive, program.dotCrossesNewline, program.lineAnchors, counting, capturing, collecting)
	if capturing && collecting {
		return captureRunResult{kind: result.kind, start: result.start, end: result.end, count: result.count, groups: result.groups, matches: result.matches, groupWidth: checkedAdd(program.captures, 1), work: result.work}
	}
	return result
}
func compilePatternSource(pattern string, options RegexOptions, capturing bool) CompiledRegex {
	pattern = checkedString(pattern)
	options = copyRegexOptions(options)
	syntax := 'a'
	if options.Syntax == (Syntax{Kind: SyntaxBasic}) {
		syntax = checkedChar('b')
	} else {
		if options.Syntax == (Syntax{Kind: SyntaxExtended}) {
			syntax = checkedChar('e')
		} else {
			if options.Syntax == (Syntax{Kind: SyntaxLiteral}) {
				syntax = checkedChar('q')
			}
		}
	}
	parsed := capturePatternSource(pattern, syntax, options.Expanded)
	return compileCaptureProgramAtoms(parsed.atoms, parsed.tokenEnds, parsed.syntax, parsed.valid, parsed.caseMode, parsed.newlineMode, capturing, options.CaseSensitive, options.Newline == (NewlineMode{Kind: NewlineModeOrdinary}) || options.Newline == (NewlineMode{Kind: NewlineModeAnchors}), options.Newline == (NewlineMode{Kind: NewlineModeSensitive}) || options.Newline == (NewlineMode{Kind: NewlineModeAnchors}))
}

type MatchSpan struct {
	Start int
	End   int
}

func copyMatchSpan(value MatchSpan) MatchSpan {
	return MatchSpan{Start: checkedIndex(value.Start), End: checkedIndex(value.End)}
}

type MatchOutcomeKind uint8

const (
	MatchOutcomeFound MatchOutcomeKind = iota
	MatchOutcomeInvalidPattern
	MatchOutcomeNoMatch
	MatchOutcomeUncertain
)

type MatchOutcome struct {
	Kind  MatchOutcomeKind
	Found MatchSpan
}

func copyMatchOutcome(value MatchOutcome) MatchOutcome {
	switch value.Kind {
	case MatchOutcomeFound:
		return MatchOutcome{Kind: MatchOutcomeFound, Found: copyMatchSpan(value.Found)}
	case MatchOutcomeInvalidPattern:
		return MatchOutcome{Kind: MatchOutcomeInvalidPattern}
	case MatchOutcomeNoMatch:
		return MatchOutcome{Kind: MatchOutcomeNoMatch}
	case MatchOutcomeUncertain:
		return MatchOutcome{Kind: MatchOutcomeUncertain}
	}
	panic("unknown enum variant")
}

type CountOutcomeKind uint8

const (
	CountOutcomeCount CountOutcomeKind = iota
	CountOutcomeInvalidPattern
	CountOutcomeUncertain
)

type CountOutcome struct {
	Kind  CountOutcomeKind
	Count int
}

func copyCountOutcome(value CountOutcome) CountOutcome {
	switch value.Kind {
	case CountOutcomeCount:
		return CountOutcome{Kind: CountOutcomeCount, Count: checkedIndex(value.Count)}
	case CountOutcomeInvalidPattern:
		return CountOutcome{Kind: CountOutcomeInvalidPattern}
	case CountOutcomeUncertain:
		return CountOutcome{Kind: CountOutcomeUncertain}
	}
	panic("unknown enum variant")
}

type patternWorkState struct {
	pattern int
	subject int
}

func copypatternWorkState(value patternWorkState) patternWorkState {
	return patternWorkState{pattern: checkedIndex(value.pattern), subject: checkedIndex(value.subject)}
}

type captureInstruction struct {
	operation int
	target    int
	alternate int
	group     int
	atom      rune
}

func copycaptureInstruction(value captureInstruction) captureInstruction {
	return captureInstruction{operation: checkedIndex(value.operation), target: checkedIndex(value.target), alternate: checkedIndex(value.alternate), group: checkedIndex(value.group), atom: checkedChar(value.atom)}
}

type CompiledRegex struct {
	valid             bool
	limited           bool
	nodes             []captureNode
	root              int
	references        []int
	minimums          []int
	maximums          []int
	firstLiterals     []int
	lastLiterals      []int
	interpreted       bool
	regular           bool
	prefilter         bool
	instructions      []captureInstruction
	classMembers      []captureClassMember
	caseMode          rune
	newlineMode       rune
	shortest          bool
	captures          int
	backreferences    bool
	caseSensitive     bool
	dotCrossesNewline bool
	lineAnchors       bool
}

func copyCompiledRegex(value CompiledRegex) CompiledRegex {
	return CompiledRegex{valid: value.valid, limited: value.limited, nodes: checkedStructs(value.nodes, copycaptureNode), root: checkedIndex(value.root), references: checkedIndices(value.references), minimums: checkedIndices(value.minimums), maximums: checkedIndices(value.maximums), firstLiterals: checkedIndices(value.firstLiterals), lastLiterals: checkedIndices(value.lastLiterals), interpreted: value.interpreted, regular: value.regular, prefilter: value.prefilter, instructions: checkedStructs(value.instructions, copycaptureInstruction), classMembers: checkedStructs(value.classMembers, copycaptureClassMember), caseMode: checkedChar(value.caseMode), newlineMode: checkedChar(value.newlineMode), shortest: value.shortest, captures: checkedIndex(value.captures), backreferences: value.backreferences, caseSensitive: value.caseSensitive, dotCrossesNewline: value.dotCrossesNewline, lineAnchors: value.lineAnchors}
}

type captureNode struct {
	operation  int
	left       int
	right      int
	group      int
	atom       rune
	lower      int
	upper      int
	unbounded  bool
	preference int
	first      int
	last       int
}

func copycaptureNode(value captureNode) captureNode {
	return captureNode{operation: checkedIndex(value.operation), left: checkedIndex(value.left), right: checkedIndex(value.right), group: checkedIndex(value.group), atom: checkedChar(value.atom), lower: checkedIndex(value.lower), upper: checkedIndex(value.upper), unbounded: value.unbounded, preference: checkedIndex(value.preference), first: checkedIndex(value.first), last: checkedIndex(value.last)}
}

type captureFrame struct {
	operation   int
	sequence    int
	alternative int
	group       int
	first       int
	branched    bool
}

func copycaptureFrame(value captureFrame) captureFrame {
	return captureFrame{operation: checkedIndex(value.operation), sequence: checkedIndex(value.sequence), alternative: checkedIndex(value.alternative), group: checkedIndex(value.group), first: checkedIndex(value.first), branched: value.branched}
}

type captureBuildTask struct {
	node  int
	entry int
	exit  int
}

func copycaptureBuildTask(value captureBuildTask) captureBuildTask {
	return captureBuildTask{node: checkedIndex(value.node), entry: checkedIndex(value.entry), exit: checkedIndex(value.exit)}
}

type captureRegister struct {
	start  int
	end    int
	status int
}

func copycaptureRegister(value captureRegister) captureRegister {
	return captureRegister{start: checkedIndex(value.start), end: checkedIndex(value.end), status: checkedIndex(value.status)}
}

type captureDissectFrame struct {
	node    int
	begin   int
	end     int
	capture int
	phase   int
	cursor  int
	path    int
	prefix  bool
}

func copycaptureDissectFrame(value captureDissectFrame) captureDissectFrame {
	return captureDissectFrame{node: checkedIndex(value.node), begin: checkedIndex(value.begin), end: checkedIndex(value.end), capture: checkedIndex(value.capture), phase: checkedIndex(value.phase), cursor: checkedIndex(value.cursor), path: checkedIndex(value.path), prefix: value.prefix}
}

type captureRepeatPath struct {
	begin    int
	cursor   int
	capture  int
	count    int
	previous int
}

func copycaptureRepeatPath(value captureRepeatPath) captureRepeatPath {
	return captureRepeatPath{begin: checkedIndex(value.begin), cursor: checkedIndex(value.cursor), capture: checkedIndex(value.capture), count: checkedIndex(value.count), previous: checkedIndex(value.previous)}
}
func posixClassKind(first rune, second rune, third rune, fourth rune, fifth rune, sixth rune) int {
	first = checkedChar(first)
	second = checkedChar(second)
	third = checkedChar(third)
	fourth = checkedChar(fourth)
	fifth = checkedChar(fifth)
	sixth = checkedChar(sixth)
	if first == 'd' && second == 'i' && third == 'g' && fourth == 'i' && fifth == 't' && sixth == ':' {
		return 1
	}
	if first == 'a' && second == 'l' && third == 'p' && fourth == 'h' && fifth == 'a' && sixth == ':' {
		return 2
	}
	if first == 'u' && second == 'p' && third == 'p' && fourth == 'e' && fifth == 'r' && sixth == ':' {
		return 3
	}
	if first == 's' && second == 'p' && third == 'a' && fourth == 'c' && fifth == 'e' && sixth == ':' {
		return 4
	}
	if first == 'a' && second == 'l' && third == 'n' && fourth == 'u' && fifth == 'm' && sixth == ':' {
		return 5
	}
	if first == 'a' && second == 's' && third == 'c' && fourth == 'i' && fifth == 'i' && sixth == ':' {
		return 6
	}
	if first == 'b' && second == 'l' && third == 'a' && fourth == 'n' && fifth == 'k' && sixth == ':' {
		return 7
	}
	if first == 'c' && second == 'n' && third == 't' && fourth == 'r' && fifth == 'l' && sixth == ':' {
		return 8
	}
	if first == 'g' && second == 'r' && third == 'a' && fourth == 'p' && fifth == 'h' && sixth == ':' {
		return 9
	}
	if first == 'l' && second == 'o' && third == 'w' && fourth == 'e' && fifth == 'r' && sixth == ':' {
		return 10
	}
	if first == 'p' && second == 'r' && third == 'i' && fourth == 'n' && fifth == 't' && sixth == ':' {
		return 11
	}
	if first == 'p' && second == 'u' && third == 'n' && fourth == 'c' && fifth == 't' && sixth == ':' {
		return 12
	}
	if first == 'x' && second == 'd' && third == 'i' && fourth == 'g' && fifth == 'i' && sixth == 't' {
		return 13
	}
	if first == 'w' && second == 'o' && third == 'r' && fourth == 'd' && fifth == ':' {
		return 14
	}
	return 0
}
func posixClassWidth(kind int) int {
	kind = checkedIndex(kind)
	if kind == 14 {
		return 10
	}
	if kind == 13 {
		return 12
	}
	return 11
}
func zeroWidthWord(atom rune) bool {
	atom = checkedChar(atom)
	codepoint := int(checkedChar(atom))
	lower := int(checkedChar(asciiLowercase(atom)))
	return (codepoint >= 48 && codepoint <= 57) || (lower >= 97 && lower <= 122) || atom == '_'
}
func makeCaptureStep(operation int, target int, alternate int, group int, atom rune) captureInstruction {
	operation = checkedIndex(operation)
	target = checkedIndex(target)
	alternate = checkedIndex(alternate)
	group = checkedIndex(group)
	atom = checkedChar(atom)
	return captureInstruction{operation: operation, target: target, alternate: alternate, group: group, atom: atom}
}
func makeCaptureNode(operation int, left int, right int, group int, atom rune, preference int, first int, last int) captureNode {
	operation = checkedIndex(operation)
	left = checkedIndex(left)
	right = checkedIndex(right)
	group = checkedIndex(group)
	atom = checkedChar(atom)
	preference = checkedIndex(preference)
	first = checkedIndex(first)
	last = checkedIndex(last)
	return captureNode{operation: operation, left: left, right: right, group: group, atom: atom, lower: 0, upper: 0, unbounded: false, preference: preference, first: first, last: last}
}
func captureWidthSum(left int, right int) int {
	left = checkedIndex(left)
	right = checkedIndex(right)
	if left > checkedSubtract(maxCaptureWork, right) {
		return maxCaptureWork
	}
	return checkedAdd(left, right)
}
func captureWidthRepeat(width int, count int) int {
	width = checkedIndex(width)
	count = checkedIndex(count)
	result := 0
	index := 0
	for index < count {
		result = checkedIndex(captureWidthSum(result, width))
		index = checkedAdd(index, 1)
	}
	return result
}

type captureClassMember struct {
	kind       int
	lower      int
	upper      int
	complement bool
}

func copycaptureClassMember(value captureClassMember) captureClassMember {
	return captureClassMember{kind: checkedIndex(value.kind), lower: checkedIndex(value.lower), upper: checkedIndex(value.upper), complement: value.complement}
}

type captureClass struct {
	valid   bool
	negated bool
	members []captureClassMember
}

func copycaptureClass(value captureClass) captureClass {
	return captureClass{valid: value.valid, negated: value.negated, members: checkedStructs(value.members, copycaptureClassMember)}
}

type captureClassAtom struct {
	valid         bool
	rangeEndpoint bool
	end           int
	kind          int
	value         int
	complement    bool
}

func copycaptureClassAtom(value captureClassAtom) captureClassAtom {
	return captureClassAtom{valid: value.valid, rangeEndpoint: value.rangeEndpoint, end: checkedIndex(value.end), kind: checkedIndex(value.kind), value: checkedIndex(value.value), complement: value.complement}
}

type captureSource struct {
	valid       bool
	syntax      rune
	caseMode    rune
	newlineMode rune
	atoms       []rune
	tokenEnds   []int
}

func copycaptureSource(value captureSource) captureSource {
	return captureSource{valid: value.valid, syntax: checkedChar(value.syntax), caseMode: checkedChar(value.caseMode), newlineMode: checkedChar(value.newlineMode), atoms: checkedChars(value.atoms), tokenEnds: checkedIndices(value.tokenEnds)}
}

type captureNumeric struct {
	valid         bool
	backreference bool
	value         int
	end           int
}

func copycaptureNumeric(value captureNumeric) captureNumeric {
	return captureNumeric{valid: value.valid, backreference: value.backreference, value: checkedIndex(value.value), end: checkedIndex(value.end)}
}
func captureDigitValue(atom rune) int {
	atom = checkedChar(atom)
	value := int(checkedChar(atom))
	if value >= 48 && value <= 57 {
		return checkedSubtract(value, 48)
	}
	if value >= 65 && value <= 70 {
		return checkedSubtract(value, 55)
	}
	if value >= 97 && value <= 102 {
		return checkedSubtract(value, 87)
	}
	return 16
}

type captureInteger struct {
	value int
	high  bool
}

func copycaptureInteger(value captureInteger) captureInteger {
	return captureInteger{value: checkedIndex(value.value), high: value.high}
}
func captureWrappingDigit(value int, base int, digit int) captureInteger {
	value = checkedIndex(value)
	base = checkedIndex(base)
	digit = checkedIndex(digit)
	maximum := 2147483647
	result := 0
	high := false
	count := 0
	for count < base {
		if value > checkedSubtract(maximum, result) {
			result = checkedIndex(checkedSubtract(checkedSubtract(value, (checkedSubtract(maximum, result))), 1))
			high = high == false
		} else {
			result = checkedAdd(result, value)
		}
		count = checkedAdd(count, 1)
	}
	if digit > checkedSubtract(maximum, result) {
		result = checkedIndex(checkedSubtract(checkedSubtract(digit, (checkedSubtract(maximum, result))), 1))
		high = high == false
	} else {
		result = checkedAdd(result, digit)
	}
	return captureInteger{value: result, high: high}
}
func parseCaptureNumeric(source []rune, groups int, basic bool) captureNumeric {
	source = checkedChars(source)
	groups = checkedIndex(groups)
	marker := source[1]
	value := 0
	high := false
	end := 2
	valid := len(source) > 2
	backreference := false
	if marker == 'c' {
		if valid {
			value = checkedIndex(int(checkedChar(source[2])))
			for value >= 32 {
				chunk := 32
				for checkedAdd(chunk, chunk) <= value {
					chunk = checkedAdd(chunk, chunk)
				}
				value = checkedIndex(checkedSubtract(value, chunk))
			}
			end = checkedIndex(3)
		}
	} else {
		if marker == 'x' || marker == 'u' || marker == 'U' {
			digits := 0
			limit := 255
			if marker == 'u' {
				limit = checkedIndex(4)
			} else {
				if marker == 'U' {
					limit = checkedIndex(8)
				}
			}
			for end < len(source) && digits < limit {
				digit := captureDigitValue(source[end])
				if digit == 16 {
					break
				}
				number := captureWrappingDigit(value, 16, digit)
				value = checkedIndex(number.value)
				high = number.high
				end = checkedAdd(end, 1)
				digits = checkedAdd(digits, 1)
			}
			valid = high == false && value <= 2147483646 && digits > 0 && (marker == 'x' || digits == limit)
		} else {
			digits := 0
			end = checkedIndex(1)
			if marker != '0' {
				for end < len(source) && digits < 255 {
					digit := captureDigitValue(source[end])
					if digit > 9 || (basic && digits == 1) {
						break
					}
					number := captureWrappingDigit(value, 10, digit)
					value = checkedIndex(number.value)
					high = number.high
					end = checkedAdd(end, 1)
					digits = checkedAdd(digits, 1)
				}
				backreference = digits == 1 || (high == false && value > 0 && value <= 2147483646 && (checkedIndex(value)) <= groups)
			}
			if backreference {
				valid = high == false && value > 0 && value <= 2147483646 && (checkedIndex(value)) <= groups
			} else {
				end = checkedIndex(1)
				digits = checkedIndex(0)
				value = checkedIndex(0)
				for end < len(source) && digits < 3 {
					digit := captureDigitValue(source[end])
					if digit > 7 {
						break
					}
					candidate := captureWrappingDigit(value, 8, digit).value
					if candidate > 255 {
						break
					}
					value = checkedIndex(candidate)
					end = checkedAdd(end, 1)
					digits = checkedAdd(digits, 1)
				}
				valid = digits > 0
			}
		}
	}
	return captureNumeric{valid: valid, backreference: backreference, value: value, end: end}
}
func captureAssertion(operation int) bool {
	operation = checkedIndex(operation)
	return operation == vmBegin || operation == vmEnd || operation == vmWordBegin || operation == vmWordEnd || operation == vmAbsoluteBegin || operation == vmAbsoluteEnd || operation == vmBoundary || operation == vmNotBoundary
}
func captureAssertionMatches(operation int, position int, length int, before bool, after bool, previousNewline bool, nextNewline bool, lineAnchors bool) bool {
	operation = checkedIndex(operation)
	position = checkedIndex(position)
	length = checkedIndex(length)
	return (operation == vmBegin && (position == 0 || (lineAnchors && previousNewline))) || (operation == vmEnd && (position == length || (lineAnchors && nextNewline))) || (operation == vmAbsoluteBegin && position == 0) || (operation == vmAbsoluteEnd && position == length) || (operation == vmWordBegin && before == false && after) || (operation == vmWordEnd && before && after == false) || (operation == vmBoundary && before != after) || (operation == vmNotBoundary && before == after)
}
func captureCollatingValue(name []rune) int {
	name = checkedChars(name)
	if len(name) == 1 {
		return int(checkedChar(name[0]))
	}
	if len(name) == 3 && name[0] == 'N' && name[1] == 'U' && name[2] == 'L' {
		return 0
	}
	if len(name) == 3 && name[0] == 'S' && name[1] == 'O' && name[2] == 'H' {
		return 1
	}
	if len(name) == 3 && name[0] == 'S' && name[1] == 'T' && name[2] == 'X' {
		return 2
	}
	if len(name) == 3 && name[0] == 'E' && name[1] == 'T' && name[2] == 'X' {
		return 3
	}
	if len(name) == 3 && name[0] == 'E' && name[1] == 'O' && name[2] == 'T' {
		return 4
	}
	if len(name) == 3 && name[0] == 'E' && name[1] == 'N' && name[2] == 'Q' {
		return 5
	}
	if len(name) == 3 && name[0] == 'A' && name[1] == 'C' && name[2] == 'K' {
		return 6
	}
	if len(name) == 3 && name[0] == 'B' && name[1] == 'E' && name[2] == 'L' {
		return 7
	}
	if len(name) == 5 && name[0] == 'a' && name[1] == 'l' && name[2] == 'e' && name[3] == 'r' && name[4] == 't' {
		return 7
	}
	if len(name) == 2 && name[0] == 'B' && name[1] == 'S' {
		return 8
	}
	if len(name) == 9 && name[0] == 'b' && name[1] == 'a' && name[2] == 'c' && name[3] == 'k' && name[4] == 's' && name[5] == 'p' && name[6] == 'a' && name[7] == 'c' && name[8] == 'e' {
		return 8
	}
	if len(name) == 2 && name[0] == 'H' && name[1] == 'T' {
		return 9
	}
	if len(name) == 3 && name[0] == 't' && name[1] == 'a' && name[2] == 'b' {
		return 9
	}
	if len(name) == 2 && name[0] == 'L' && name[1] == 'F' {
		return 10
	}
	if len(name) == 7 && name[0] == 'n' && name[1] == 'e' && name[2] == 'w' && name[3] == 'l' && name[4] == 'i' && name[5] == 'n' && name[6] == 'e' {
		return 10
	}
	if len(name) == 2 && name[0] == 'V' && name[1] == 'T' {
		return 11
	}
	if len(name) == 12 && name[0] == 'v' && name[1] == 'e' && name[2] == 'r' && name[3] == 't' && name[4] == 'i' && name[5] == 'c' && name[6] == 'a' && name[7] == 'l' && name[8] == '-' && name[9] == 't' && name[10] == 'a' && name[11] == 'b' {
		return 11
	}
	if len(name) == 2 && name[0] == 'F' && name[1] == 'F' {
		return 12
	}
	if len(name) == 9 && name[0] == 'f' && name[1] == 'o' && name[2] == 'r' && name[3] == 'm' && name[4] == '-' && name[5] == 'f' && name[6] == 'e' && name[7] == 'e' && name[8] == 'd' {
		return 12
	}
	if len(name) == 2 && name[0] == 'C' && name[1] == 'R' {
		return 13
	}
	if len(name) == 15 && name[0] == 'c' && name[1] == 'a' && name[2] == 'r' && name[3] == 'r' && name[4] == 'i' && name[5] == 'a' && name[6] == 'g' && name[7] == 'e' && name[8] == '-' && name[9] == 'r' && name[10] == 'e' && name[11] == 't' && name[12] == 'u' && name[13] == 'r' && name[14] == 'n' {
		return 13
	}
	if len(name) == 2 && name[0] == 'S' && name[1] == 'O' {
		return 14
	}
	if len(name) == 2 && name[0] == 'S' && name[1] == 'I' {
		return 15
	}
	if len(name) == 3 && name[0] == 'D' && name[1] == 'L' && name[2] == 'E' {
		return 16
	}
	if len(name) == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '1' {
		return 17
	}
	if len(name) == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '2' {
		return 18
	}
	if len(name) == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '3' {
		return 19
	}
	if len(name) == 3 && name[0] == 'D' && name[1] == 'C' && name[2] == '4' {
		return 20
	}
	if len(name) == 3 && name[0] == 'N' && name[1] == 'A' && name[2] == 'K' {
		return 21
	}
	if len(name) == 3 && name[0] == 'S' && name[1] == 'Y' && name[2] == 'N' {
		return 22
	}
	if len(name) == 3 && name[0] == 'E' && name[1] == 'T' && name[2] == 'B' {
		return 23
	}
	if len(name) == 3 && name[0] == 'C' && name[1] == 'A' && name[2] == 'N' {
		return 24
	}
	if len(name) == 2 && name[0] == 'E' && name[1] == 'M' {
		return 25
	}
	if len(name) == 3 && name[0] == 'S' && name[1] == 'U' && name[2] == 'B' {
		return 26
	}
	if len(name) == 3 && name[0] == 'E' && name[1] == 'S' && name[2] == 'C' {
		return 27
	}
	if len(name) == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '4' {
		return 28
	}
	if len(name) == 2 && name[0] == 'F' && name[1] == 'S' {
		return 28
	}
	if len(name) == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '3' {
		return 29
	}
	if len(name) == 2 && name[0] == 'G' && name[1] == 'S' {
		return 29
	}
	if len(name) == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '2' {
		return 30
	}
	if len(name) == 2 && name[0] == 'R' && name[1] == 'S' {
		return 30
	}
	if len(name) == 3 && name[0] == 'I' && name[1] == 'S' && name[2] == '1' {
		return 31
	}
	if len(name) == 2 && name[0] == 'U' && name[1] == 'S' {
		return 31
	}
	if len(name) == 5 && name[0] == 's' && name[1] == 'p' && name[2] == 'a' && name[3] == 'c' && name[4] == 'e' {
		return 32
	}
	if len(name) == 16 && name[0] == 'e' && name[1] == 'x' && name[2] == 'c' && name[3] == 'l' && name[4] == 'a' && name[5] == 'm' && name[6] == 'a' && name[7] == 't' && name[8] == 'i' && name[9] == 'o' && name[10] == 'n' && name[11] == '-' && name[12] == 'm' && name[13] == 'a' && name[14] == 'r' && name[15] == 'k' {
		return 33
	}
	if len(name) == 14 && name[0] == 'q' && name[1] == 'u' && name[2] == 'o' && name[3] == 't' && name[4] == 'a' && name[5] == 't' && name[6] == 'i' && name[7] == 'o' && name[8] == 'n' && name[9] == '-' && name[10] == 'm' && name[11] == 'a' && name[12] == 'r' && name[13] == 'k' {
		return 34
	}
	if len(name) == 11 && name[0] == 'n' && name[1] == 'u' && name[2] == 'm' && name[3] == 'b' && name[4] == 'e' && name[5] == 'r' && name[6] == '-' && name[7] == 's' && name[8] == 'i' && name[9] == 'g' && name[10] == 'n' {
		return 35
	}
	if len(name) == 11 && name[0] == 'd' && name[1] == 'o' && name[2] == 'l' && name[3] == 'l' && name[4] == 'a' && name[5] == 'r' && name[6] == '-' && name[7] == 's' && name[8] == 'i' && name[9] == 'g' && name[10] == 'n' {
		return 36
	}
	if len(name) == 12 && name[0] == 'p' && name[1] == 'e' && name[2] == 'r' && name[3] == 'c' && name[4] == 'e' && name[5] == 'n' && name[6] == 't' && name[7] == '-' && name[8] == 's' && name[9] == 'i' && name[10] == 'g' && name[11] == 'n' {
		return 37
	}
	if len(name) == 9 && name[0] == 'a' && name[1] == 'm' && name[2] == 'p' && name[3] == 'e' && name[4] == 'r' && name[5] == 's' && name[6] == 'a' && name[7] == 'n' && name[8] == 'd' {
		return 38
	}
	if len(name) == 10 && name[0] == 'a' && name[1] == 'p' && name[2] == 'o' && name[3] == 's' && name[4] == 't' && name[5] == 'r' && name[6] == 'o' && name[7] == 'p' && name[8] == 'h' && name[9] == 'e' {
		return 39
	}
	if len(name) == 16 && name[0] == 'l' && name[1] == 'e' && name[2] == 'f' && name[3] == 't' && name[4] == '-' && name[5] == 'p' && name[6] == 'a' && name[7] == 'r' && name[8] == 'e' && name[9] == 'n' && name[10] == 't' && name[11] == 'h' && name[12] == 'e' && name[13] == 's' && name[14] == 'i' && name[15] == 's' {
		return 40
	}
	if len(name) == 17 && name[0] == 'r' && name[1] == 'i' && name[2] == 'g' && name[3] == 'h' && name[4] == 't' && name[5] == '-' && name[6] == 'p' && name[7] == 'a' && name[8] == 'r' && name[9] == 'e' && name[10] == 'n' && name[11] == 't' && name[12] == 'h' && name[13] == 'e' && name[14] == 's' && name[15] == 'i' && name[16] == 's' {
		return 41
	}
	if len(name) == 8 && name[0] == 'a' && name[1] == 's' && name[2] == 't' && name[3] == 'e' && name[4] == 'r' && name[5] == 'i' && name[6] == 's' && name[7] == 'k' {
		return 42
	}
	if len(name) == 9 && name[0] == 'p' && name[1] == 'l' && name[2] == 'u' && name[3] == 's' && name[4] == '-' && name[5] == 's' && name[6] == 'i' && name[7] == 'g' && name[8] == 'n' {
		return 43
	}
	if len(name) == 5 && name[0] == 'c' && name[1] == 'o' && name[2] == 'm' && name[3] == 'm' && name[4] == 'a' {
		return 44
	}
	if len(name) == 6 && name[0] == 'h' && name[1] == 'y' && name[2] == 'p' && name[3] == 'h' && name[4] == 'e' && name[5] == 'n' {
		return 45
	}
	if len(name) == 12 && name[0] == 'h' && name[1] == 'y' && name[2] == 'p' && name[3] == 'h' && name[4] == 'e' && name[5] == 'n' && name[6] == '-' && name[7] == 'm' && name[8] == 'i' && name[9] == 'n' && name[10] == 'u' && name[11] == 's' {
		return 45
	}
	if len(name) == 6 && name[0] == 'p' && name[1] == 'e' && name[2] == 'r' && name[3] == 'i' && name[4] == 'o' && name[5] == 'd' {
		return 46
	}
	if len(name) == 9 && name[0] == 'f' && name[1] == 'u' && name[2] == 'l' && name[3] == 'l' && name[4] == '-' && name[5] == 's' && name[6] == 't' && name[7] == 'o' && name[8] == 'p' {
		return 46
	}
	if len(name) == 5 && name[0] == 's' && name[1] == 'l' && name[2] == 'a' && name[3] == 's' && name[4] == 'h' {
		return 47
	}
	if len(name) == 7 && name[0] == 's' && name[1] == 'o' && name[2] == 'l' && name[3] == 'i' && name[4] == 'd' && name[5] == 'u' && name[6] == 's' {
		return 47
	}
	if len(name) == 4 && name[0] == 'z' && name[1] == 'e' && name[2] == 'r' && name[3] == 'o' {
		return 48
	}
	if len(name) == 3 && name[0] == 'o' && name[1] == 'n' && name[2] == 'e' {
		return 49
	}
	if len(name) == 3 && name[0] == 't' && name[1] == 'w' && name[2] == 'o' {
		return 50
	}
	if len(name) == 5 && name[0] == 't' && name[1] == 'h' && name[2] == 'r' && name[3] == 'e' && name[4] == 'e' {
		return 51
	}
	if len(name) == 4 && name[0] == 'f' && name[1] == 'o' && name[2] == 'u' && name[3] == 'r' {
		return 52
	}
	if len(name) == 4 && name[0] == 'f' && name[1] == 'i' && name[2] == 'v' && name[3] == 'e' {
		return 53
	}
	if len(name) == 3 && name[0] == 's' && name[1] == 'i' && name[2] == 'x' {
		return 54
	}
	if len(name) == 5 && name[0] == 's' && name[1] == 'e' && name[2] == 'v' && name[3] == 'e' && name[4] == 'n' {
		return 55
	}
	if len(name) == 5 && name[0] == 'e' && name[1] == 'i' && name[2] == 'g' && name[3] == 'h' && name[4] == 't' {
		return 56
	}
	if len(name) == 4 && name[0] == 'n' && name[1] == 'i' && name[2] == 'n' && name[3] == 'e' {
		return 57
	}
	if len(name) == 5 && name[0] == 'c' && name[1] == 'o' && name[2] == 'l' && name[3] == 'o' && name[4] == 'n' {
		return 58
	}
	if len(name) == 9 && name[0] == 's' && name[1] == 'e' && name[2] == 'm' && name[3] == 'i' && name[4] == 'c' && name[5] == 'o' && name[6] == 'l' && name[7] == 'o' && name[8] == 'n' {
		return 59
	}
	if len(name) == 14 && name[0] == 'l' && name[1] == 'e' && name[2] == 's' && name[3] == 's' && name[4] == '-' && name[5] == 't' && name[6] == 'h' && name[7] == 'a' && name[8] == 'n' && name[9] == '-' && name[10] == 's' && name[11] == 'i' && name[12] == 'g' && name[13] == 'n' {
		return 60
	}
	if len(name) == 11 && name[0] == 'e' && name[1] == 'q' && name[2] == 'u' && name[3] == 'a' && name[4] == 'l' && name[5] == 's' && name[6] == '-' && name[7] == 's' && name[8] == 'i' && name[9] == 'g' && name[10] == 'n' {
		return 61
	}
	if len(name) == 17 && name[0] == 'g' && name[1] == 'r' && name[2] == 'e' && name[3] == 'a' && name[4] == 't' && name[5] == 'e' && name[6] == 'r' && name[7] == '-' && name[8] == 't' && name[9] == 'h' && name[10] == 'a' && name[11] == 'n' && name[12] == '-' && name[13] == 's' && name[14] == 'i' && name[15] == 'g' && name[16] == 'n' {
		return 62
	}
	if len(name) == 13 && name[0] == 'q' && name[1] == 'u' && name[2] == 'e' && name[3] == 's' && name[4] == 't' && name[5] == 'i' && name[6] == 'o' && name[7] == 'n' && name[8] == '-' && name[9] == 'm' && name[10] == 'a' && name[11] == 'r' && name[12] == 'k' {
		return 63
	}
	if len(name) == 13 && name[0] == 'c' && name[1] == 'o' && name[2] == 'm' && name[3] == 'm' && name[4] == 'e' && name[5] == 'r' && name[6] == 'c' && name[7] == 'i' && name[8] == 'a' && name[9] == 'l' && name[10] == '-' && name[11] == 'a' && name[12] == 't' {
		return 64
	}
	if len(name) == 19 && name[0] == 'l' && name[1] == 'e' && name[2] == 'f' && name[3] == 't' && name[4] == '-' && name[5] == 's' && name[6] == 'q' && name[7] == 'u' && name[8] == 'a' && name[9] == 'r' && name[10] == 'e' && name[11] == '-' && name[12] == 'b' && name[13] == 'r' && name[14] == 'a' && name[15] == 'c' && name[16] == 'k' && name[17] == 'e' && name[18] == 't' {
		return 91
	}
	if len(name) == 9 && name[0] == 'b' && name[1] == 'a' && name[2] == 'c' && name[3] == 'k' && name[4] == 's' && name[5] == 'l' && name[6] == 'a' && name[7] == 's' && name[8] == 'h' {
		return 92
	}
	if len(name) == 15 && name[0] == 'r' && name[1] == 'e' && name[2] == 'v' && name[3] == 'e' && name[4] == 'r' && name[5] == 's' && name[6] == 'e' && name[7] == '-' && name[8] == 's' && name[9] == 'o' && name[10] == 'l' && name[11] == 'i' && name[12] == 'd' && name[13] == 'u' && name[14] == 's' {
		return 92
	}
	if len(name) == 20 && name[0] == 'r' && name[1] == 'i' && name[2] == 'g' && name[3] == 'h' && name[4] == 't' && name[5] == '-' && name[6] == 's' && name[7] == 'q' && name[8] == 'u' && name[9] == 'a' && name[10] == 'r' && name[11] == 'e' && name[12] == '-' && name[13] == 'b' && name[14] == 'r' && name[15] == 'a' && name[16] == 'c' && name[17] == 'k' && name[18] == 'e' && name[19] == 't' {
		return 93
	}
	if len(name) == 10 && name[0] == 'c' && name[1] == 'i' && name[2] == 'r' && name[3] == 'c' && name[4] == 'u' && name[5] == 'm' && name[6] == 'f' && name[7] == 'l' && name[8] == 'e' && name[9] == 'x' {
		return 94
	}
	if len(name) == 17 && name[0] == 'c' && name[1] == 'i' && name[2] == 'r' && name[3] == 'c' && name[4] == 'u' && name[5] == 'm' && name[6] == 'f' && name[7] == 'l' && name[8] == 'e' && name[9] == 'x' && name[10] == '-' && name[11] == 'a' && name[12] == 'c' && name[13] == 'c' && name[14] == 'e' && name[15] == 'n' && name[16] == 't' {
		return 94
	}
	if len(name) == 10 && name[0] == 'u' && name[1] == 'n' && name[2] == 'd' && name[3] == 'e' && name[4] == 'r' && name[5] == 's' && name[6] == 'c' && name[7] == 'o' && name[8] == 'r' && name[9] == 'e' {
		return 95
	}
	if len(name) == 8 && name[0] == 'l' && name[1] == 'o' && name[2] == 'w' && name[3] == '-' && name[4] == 'l' && name[5] == 'i' && name[6] == 'n' && name[7] == 'e' {
		return 95
	}
	if len(name) == 12 && name[0] == 'g' && name[1] == 'r' && name[2] == 'a' && name[3] == 'v' && name[4] == 'e' && name[5] == '-' && name[6] == 'a' && name[7] == 'c' && name[8] == 'c' && name[9] == 'e' && name[10] == 'n' && name[11] == 't' {
		return 96
	}
	if len(name) == 10 && name[0] == 'l' && name[1] == 'e' && name[2] == 'f' && name[3] == 't' && name[4] == '-' && name[5] == 'b' && name[6] == 'r' && name[7] == 'a' && name[8] == 'c' && name[9] == 'e' {
		return 123
	}
	if len(name) == 18 && name[0] == 'l' && name[1] == 'e' && name[2] == 'f' && name[3] == 't' && name[4] == '-' && name[5] == 'c' && name[6] == 'u' && name[7] == 'r' && name[8] == 'l' && name[9] == 'y' && name[10] == '-' && name[11] == 'b' && name[12] == 'r' && name[13] == 'a' && name[14] == 'c' && name[15] == 'k' && name[16] == 'e' && name[17] == 't' {
		return 123
	}
	if len(name) == 13 && name[0] == 'v' && name[1] == 'e' && name[2] == 'r' && name[3] == 't' && name[4] == 'i' && name[5] == 'c' && name[6] == 'a' && name[7] == 'l' && name[8] == '-' && name[9] == 'l' && name[10] == 'i' && name[11] == 'n' && name[12] == 'e' {
		return 124
	}
	if len(name) == 11 && name[0] == 'r' && name[1] == 'i' && name[2] == 'g' && name[3] == 'h' && name[4] == 't' && name[5] == '-' && name[6] == 'b' && name[7] == 'r' && name[8] == 'a' && name[9] == 'c' && name[10] == 'e' {
		return 125
	}
	if len(name) == 19 && name[0] == 'r' && name[1] == 'i' && name[2] == 'g' && name[3] == 'h' && name[4] == 't' && name[5] == '-' && name[6] == 'c' && name[7] == 'u' && name[8] == 'r' && name[9] == 'l' && name[10] == 'y' && name[11] == '-' && name[12] == 'b' && name[13] == 'r' && name[14] == 'a' && name[15] == 'c' && name[16] == 'k' && name[17] == 'e' && name[18] == 't' {
		return 125
	}
	if len(name) == 5 && name[0] == 't' && name[1] == 'i' && name[2] == 'l' && name[3] == 'd' && name[4] == 'e' {
		return 126
	}
	if len(name) == 3 && name[0] == 'D' && name[1] == 'E' && name[2] == 'L' {
		return 127
	}
	return 2147483647
}
func parseCaptureClassAtom(source []rune, syntax rune, groups int) captureClassAtom {
	source = checkedChars(source)
	syntax = checkedChar(syntax)
	groups = checkedIndex(groups)
	position := 0
	rangeEndpoint := true
	valid := position < len(source)
	end := position
	kind := captureClassRange
	value := 0
	complement := false
	if valid {
		atom := source[position]
		value = checkedIndex(int(checkedChar(atom)))
		end = checkedAdd(end, 1)
		if atom == '[' && checkedSubtract(len(source), position) >= 2 && (source[checkedAdd(position, 1)] == ':' || source[checkedAdd(position, 1)] == '.' || source[checkedAdd(position, 1)] == '=') {
			valid = false
			if source[checkedAdd(position, 1)] == '.' || source[checkedAdd(position, 1)] == '=' {
				marker := source[checkedAdd(position, 1)]
				rangeEndpoint = marker == '.'
				end = checkedIndex(checkedAdd(position, 2))
				name := []rune{}
				for checkedAdd(end, 1) < len(source) && (source[end] != marker || source[checkedAdd(end, 1)] != ']') {
					checkedAdd(len(name), 1)
					name = append(name, checkedChar(source[end]))
					end = checkedAdd(end, 1)
				}
				if checkedAdd(end, 1) < len(source) && len(name) > 0 {
					value = checkedIndex(captureCollatingValue(name))
					valid = value != 2147483647
					end = checkedAdd(end, 2)
				}
			} else {
				if source[checkedAdd(position, 1)] == ':' && checkedSubtract(len(source), position) >= 8 {
					kind = checkedIndex(posixClassKind(source[checkedAdd(position, 2)], source[checkedAdd(position, 3)], source[checkedAdd(position, 4)], source[checkedAdd(position, 5)], source[checkedAdd(position, 6)], source[checkedAdd(position, 7)]))
					if kind > 0 {
						end = checkedIndex(checkedSubtract(checkedAdd(position, posixClassWidth(kind)), 2))
						valid = end <= len(source) && source[checkedSubtract(end, 2)] == ':' && source[checkedSubtract(end, 1)] == ']'
					}
				}
			}
		} else {
			if atom == '\\' && syntax == 'a' {
				valid = end < len(source)
				if valid {
					escaped := source[end]
					end = checkedAdd(end, 1)
					value = checkedIndex(int(checkedChar(escaped)))
					if escaped == 'x' || escaped == 'u' || escaped == 'U' || escaped == 'c' || (value >= 48 && value <= 57) {
						numeric := parseCaptureNumeric(source, groups, false)
						valid = numeric.valid && numeric.backreference == false
						value = checkedIndex(numeric.value)
						end = checkedIndex(numeric.end)
					} else {
						if escaped == 'd' || escaped == 'D' {
							kind = checkedIndex(1)
							complement = escaped == 'D'
						} else {
							if escaped == 's' || escaped == 'S' {
								kind = checkedIndex(4)
								complement = escaped == 'S'
							} else {
								if escaped == 'w' || escaped == 'W' {
									kind = checkedIndex(14)
									complement = escaped == 'W'
								} else {
									if escaped == 'a' {
										value = checkedIndex(7)
									} else {
										if escaped == 'b' {
											value = checkedIndex(8)
										} else {
											if escaped == 'B' {
												value = checkedIndex(92)
											} else {
												if escaped == 'e' {
													value = checkedIndex(27)
												} else {
													if escaped == 'f' {
														value = checkedIndex(12)
													} else {
														if escaped == 'n' {
															value = checkedIndex(10)
														} else {
															if escaped == 'r' {
																value = checkedIndex(13)
															} else {
																if escaped == 't' {
																	value = checkedIndex(9)
																} else {
																	if escaped == 'v' {
																		value = checkedIndex(11)
																	} else {
																		if (value >= 48 && value <= 57) || (value >= 65 && value <= 90) || (value >= 97 && value <= 122) {
																			valid = false
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	return captureClassAtom{valid: valid, rangeEndpoint: rangeEndpoint, end: end, kind: kind, value: value, complement: complement}
}
func parseCaptureClass(source []rune, syntax rune, groups int) captureClass {
	source = checkedChars(source)
	syntax = checkedChar(syntax)
	groups = checkedIndex(groups)
	position := 1
	negated := false
	if position < len(source) && source[position] == '^' {
		negated = true
		position = checkedAdd(position, 1)
	}
	first := position
	members := []captureClassMember{}
	valid := false
	for position < len(source) {
		if source[position] == ']' && position > first {
			valid = true
			break
		}
		if source[position] == '-' && position > first && checkedAdd(position, 1) < len(source) && source[checkedAdd(position, 1)] != ']' {
			break
		}
		lookahead := []rune{}
		look := position
		for look < len(source) && checkedSubtract(look, position) < 257 {
			checkedAdd(len(lookahead), 1)
			lookahead = append(lookahead, checkedChar(source[look]))
			look = checkedAdd(look, 1)
		}
		atom := parseCaptureClassAtom(lookahead, syntax, groups)
		if atom.valid == false {
			break
		}
		position = checkedAdd(position, atom.end)
		upper := atom.value
		if checkedSubtract(len(source), position) >= 2 && source[position] == '-' && source[checkedAdd(position, 1)] != ']' {
			lookahead := []rune{}
			look := checkedAdd(position, 1)
			for look < len(source) && checkedSubtract(look, position) < 258 {
				checkedAdd(len(lookahead), 1)
				lookahead = append(lookahead, checkedChar(source[look]))
				look = checkedAdd(look, 1)
			}
			bound := parseCaptureClassAtom(lookahead, syntax, groups)
			if bound.valid == false || atom.rangeEndpoint == false || bound.rangeEndpoint == false || atom.kind != captureClassRange || bound.kind != captureClassRange || bound.value < atom.value {
				break
			}
			upper = checkedIndex(bound.value)
			position = checkedAdd(position, checkedAdd(1, bound.end))
		}
		checkedAdd(len(members), 1)
		members = append(members, copycaptureClassMember(captureClassMember{kind: atom.kind, lower: atom.value, upper: upper, complement: atom.complement}))
	}
	checkedAdd(len(members), 1)
	members = append(members, copycaptureClassMember(captureClassMember{kind: 0, lower: 0, upper: 0, complement: false}))
	return captureClass{valid: valid, negated: negated, members: members}
}
func captureClassMemberMatches(member captureClassMember, actual rune, sensitive bool) bool {
	member = copycaptureClassMember(member)
	actual = checkedChar(actual)
	codepoint := int(checkedChar(actual))
	digit := codepoint >= 48 && codepoint <= 57
	upper := codepoint >= 65 && codepoint <= 90
	lower := codepoint >= 97 && codepoint <= 122
	letter := upper || lower
	space := (codepoint >= 9 && codepoint <= 13) || codepoint == 32
	kind := member.kind
	matched := (kind == 1 && digit) || (kind == 2 && letter) || (kind == 3 && (upper || (sensitive == false && lower))) || (kind == 4 && space) || (kind == 5 && (digit || letter)) || (kind == 6 && codepoint <= 127) || (kind == 7 && (codepoint == 32 || codepoint == 9)) || (kind == 8 && (codepoint <= 31 || (codepoint >= 127 && codepoint <= 159))) || (kind == 9 && codepoint >= 33 && codepoint <= 126) || (kind == 10 && (lower || (sensitive == false && upper))) || (kind == 11 && codepoint >= 32 && codepoint <= 126) || (kind == 12 && ((codepoint >= 33 && codepoint <= 47) || (codepoint >= 58 && codepoint <= 64) || (codepoint >= 91 && codepoint <= 96) || (codepoint >= 123 && codepoint <= 126))) || (kind == 13 && (digit || (codepoint >= 65 && codepoint <= 70) || (codepoint >= 97 && codepoint <= 102))) || (kind == 14 && (digit || letter || codepoint == 95))
	if kind == captureClassRange {
		matched = codepoint >= member.lower && codepoint <= member.upper
		if sensitive == false {
			alternate := codepoint
			if upper {
				alternate = checkedAdd(alternate, 32)
			} else {
				if lower {
					alternate = checkedIndex(checkedSubtract(alternate, 32))
				}
			}
			matched = matched || (alternate >= member.lower && alternate <= member.upper)
		}
	}
	return matched != member.complement
}
func capturePatternSource(pattern string, syntax rune, expanded bool) captureSource {
	pattern = checkedString(pattern)
	syntax = checkedChar(syntax)
	source := []rune(pattern)
	position := 0
	valid := true
	caseMode := ' '
	newlineMode := ' '
	effectiveExpanded := expanded
	if syntax != 'q' && len(source) >= 4 && source[0] == '*' && source[1] == '*' && source[2] == '*' && (source[3] == ':' || source[3] == '=') {
		position = checkedIndex(4)
		syntax = checkedChar('a')
		if source[3] == '=' {
			syntax = checkedChar('q')
		}
	}
	if syntax == 'a' && checkedSubtract(len(source), position) >= 3 && source[position] == '(' && source[checkedAdd(position, 1)] == '?' && (((int(checkedChar(source[checkedAdd(position, 2)]))) >= 65 && (int(checkedChar(source[checkedAdd(position, 2)]))) <= 90) || ((int(checkedChar(source[checkedAdd(position, 2)]))) >= 97 && (int(checkedChar(source[checkedAdd(position, 2)]))) <= 122)) {
		position = checkedAdd(position, 2)
		for position < len(source) && source[position] != ')' {
			option := source[position]
			if option == 'b' || option == 'e' || option == 'q' {
				syntax = checkedChar(option)
			} else {
				if option == 'i' || option == 'c' {
					caseMode = checkedChar(option)
				} else {
					if option == 'n' || option == 'm' || option == 'p' || option == 'w' || option == 's' {
						newlineMode = checkedChar(option)
					} else {
						if option == 'x' {
							effectiveExpanded = true
						} else {
							if option == 't' {
								effectiveExpanded = false
							} else {
								valid = false
								break
							}
						}
					}
				}
			}
			position = checkedAdd(position, 1)
		}
		if position == len(source) {
			valid = false
		} else {
			position = checkedAdd(position, 1)
		}
	}
	if syntax == 'q' {
		effectiveExpanded = false
		newlineMode = checkedChar('s')
	}
	atoms := []rune{}
	tokenEnds := []int{}
	for valid && position < len(source) {
		atom := source[position]
		tokenStart := len(atoms)
		if syntax == 'q' {
			checkedAdd(len(atoms), 1)
			atoms = append(atoms, checkedChar(atom))
			position = checkedAdd(position, 1)
		} else {
			if atom == '[' {
				checkedAdd(len(atoms), 1)
				atoms = append(atoms, checkedChar(atom))
				position = checkedAdd(position, 1)
				if position < len(source) && source[position] == '^' {
					checkedAdd(len(atoms), 1)
					atoms = append(atoms, checkedChar(source[position]))
					position = checkedAdd(position, 1)
				}
				first := position
				special := ' '
				for position < len(source) {
					current := source[position]
					checkedAdd(len(atoms), 1)
					atoms = append(atoms, checkedChar(current))
					position = checkedAdd(position, 1)
					if special == ' ' && syntax == 'a' && current == '\\' && position < len(source) {
						marker := source[position]
						checkedAdd(len(atoms), 1)
						atoms = append(atoms, checkedChar(marker))
						position = checkedAdd(position, 1)
						if marker == 'c' && position < len(source) {
							checkedAdd(len(atoms), 1)
							atoms = append(atoms, checkedChar(source[position]))
							position = checkedAdd(position, 1)
						}
					} else {
						if special != ' ' {
							if current == special && position < len(source) && source[position] == ']' {
								checkedAdd(len(atoms), 1)
								atoms = append(atoms, checkedChar(']'))
								position = checkedAdd(position, 1)
								special = checkedChar(' ')
							}
						} else {
							if current == '[' && position < len(source) && (source[position] == ':' || source[position] == '.' || source[position] == '=') {
								special = checkedChar(source[position])
								checkedAdd(len(atoms), 1)
								atoms = append(atoms, checkedChar(special))
								position = checkedAdd(position, 1)
							} else {
								if current == ']' && position > checkedAdd(first, 1) {
									break
								}
							}
						}
					}
				}
			} else {
				if atom == '\\' {
					checkedAdd(len(atoms), 1)
					atoms = append(atoms, checkedChar(atom))
					position = checkedAdd(position, 1)
					if position < len(source) {
						marker := source[position]
						checkedAdd(len(atoms), 1)
						atoms = append(atoms, checkedChar(marker))
						position = checkedAdd(position, 1)
						if syntax == 'a' && marker == 'c' && position < len(source) {
							checkedAdd(len(atoms), 1)
							atoms = append(atoms, checkedChar(source[position]))
							position = checkedAdd(position, 1)
						} else {
							if syntax == 'a' && (marker == 'x' || marker == 'u' || marker == 'U' || ((int(checkedChar(marker))) >= 48 && (int(checkedChar(marker))) <= 57)) {
								limit := 255
								if marker == 'u' {
									limit = checkedIndex(4)
								} else {
									if marker == 'U' {
										limit = checkedIndex(8)
									}
								}
								digits := 0
								for position < len(source) && digits < limit {
									digit := captureDigitValue(source[position])
									if digit == 16 || ((int(checkedChar(marker))) >= 48 && (int(checkedChar(marker))) <= 57 && digit > 9) {
										break
									}
									checkedAdd(len(atoms), 1)
									atoms = append(atoms, checkedChar(source[position]))
									position = checkedAdd(position, 1)
									digits = checkedAdd(digits, 1)
								}
							}
						}
					}
				} else {
					if syntax == 'a' && atom == '(' && checkedSubtract(len(source), position) >= 3 && source[checkedAdd(position, 1)] == '?' && source[checkedAdd(position, 2)] == '#' {
						position = checkedAdd(position, 3)
						for position < len(source) && source[position] != ')' {
							position = checkedAdd(position, 1)
						}
						if position < len(source) {
							position = checkedAdd(position, 1)
						}
					} else {
						if syntax == 'a' && atom == '(' {
							checkedAdd(len(atoms), 1)
							atoms = append(atoms, checkedChar(atom))
							position = checkedAdd(position, 1)
							if position < len(source) && source[position] == '?' {
								checkedAdd(len(atoms), 1)
								atoms = append(atoms, checkedChar('?'))
								position = checkedAdd(position, 1)
								if position < len(source) {
									marker := source[position]
									checkedAdd(len(atoms), 1)
									atoms = append(atoms, checkedChar(marker))
									position = checkedAdd(position, 1)
									if marker == '<' && position < len(source) {
										checkedAdd(len(atoms), 1)
										atoms = append(atoms, checkedChar(source[position]))
										position = checkedAdd(position, 1)
									}
								}
							}
						} else {
							if syntax == 'a' && (atom == '*' || atom == '+' || atom == '?') {
								checkedAdd(len(atoms), 1)
								atoms = append(atoms, checkedChar(atom))
								position = checkedAdd(position, 1)
								if position < len(source) && source[position] == '?' {
									checkedAdd(len(atoms), 1)
									atoms = append(atoms, checkedChar('?'))
									position = checkedAdd(position, 1)
								}
							} else {
								if effectiveExpanded && atom == '#' {
									for position < len(source) && source[position] != '\n' {
										position = checkedAdd(position, 1)
									}
								} else {
									if effectiveExpanded && (atom == ' ' || ((int(checkedChar(atom))) >= 9 && (int(checkedChar(atom))) <= 13)) {
										position = checkedAdd(position, 1)
									} else {
										checkedAdd(len(atoms), 1)
										atoms = append(atoms, checkedChar(atom))
										position = checkedAdd(position, 1)
									}
								}
							}
						}
					}
				}
			}
		}
		if syntax != 'q' && len(atoms) > tokenStart {
			basicBound := syntax == 'b' && checkedSubtract(len(atoms), tokenStart) == 2 && atoms[tokenStart] == '\\' && atoms[checkedAdd(tokenStart, 1)] == '{'
			if basicBound || (syntax != 'b' && atoms[tokenStart] == '{') {
				inBound := basicBound
				first := true
				for position < len(source) {
					current := source[position]
					if effectiveExpanded && (current == ' ' || ((int(checkedChar(current))) >= 9 && (int(checkedChar(current))) <= 13)) {
						position = checkedAdd(position, 1)
					} else {
						if effectiveExpanded && current == '#' {
							for position < len(source) && source[position] != '\n' {
								position = checkedAdd(position, 1)
							}
						} else {
							if first && (int(checkedChar(current))) >= 48 && (int(checkedChar(current))) <= 57 {
								inBound = true
							}
							first = false
							if inBound == false {
								break
							}
							checkedAdd(len(atoms), 1)
							atoms = append(atoms, checkedChar(current))
							position = checkedAdd(position, 1)
							if basicBound && current == '\\' {
								if position < len(source) && source[position] == '}' {
									checkedAdd(len(atoms), 1)
									atoms = append(atoms, checkedChar('}'))
									position = checkedAdd(position, 1)
								} else {
									valid = false
								}
								break
							} else {
								if basicBound == false && current == '}' {
									if syntax == 'a' && position < len(source) && source[position] == '?' {
										checkedAdd(len(atoms), 1)
										atoms = append(atoms, checkedChar('?'))
										position = checkedAdd(position, 1)
									}
									break
								} else {
									if current != ',' && ((int(checkedChar(current))) < 48 || (int(checkedChar(current))) > 57) {
										valid = false
										break
									}
								}
							}
						}
					}
				}
			}
		}
		for len(tokenEnds) < len(atoms) {
			checkedAdd(len(tokenEnds), 1)
			tokenEnds = append(tokenEnds, checkedIndex(len(atoms)))
		}
	}
	return captureSource{valid: valid, syntax: syntax, caseMode: caseMode, newlineMode: newlineMode, atoms: atoms, tokenEnds: tokenEnds}
}
func compileCaptureProgramAtoms(source []rune, tokenEnds []int, syntax rune, valid bool, caseMode rune, newlineMode rune, capturing bool, caseSensitive bool, dotCrossesNewline bool, lineAnchors bool) CompiledRegex {
	source = checkedChars(source)
	tokenEnds = checkedIndices(tokenEnds)
	syntax = checkedChar(syntax)
	caseMode = checkedChar(caseMode)
	newlineMode = checkedChar(newlineMode)
	limited := false
	classMembers := []captureClassMember{}
	nodes := []captureNode{}
	checkedAdd(len(nodes), 1)
	nodes = append(nodes, copycaptureNode(makeCaptureNode(nodeEmpty, 0, 0, 0, ' ', 0, 1, 0)))
	frames := []captureFrame{}
	checkedAdd(len(frames), 1)
	frames = append(frames, copycaptureFrame(captureFrame{operation: nodeGroup, sequence: 0, alternative: 0, group: 0, first: 1, branched: false}))
	frameCount := 1
	groups := 0
	closed := []int{}
	checkedAdd(len(closed), 1)
	closed = append(closed, checkedIndex(0))
	backreferences := false
	assertions := false
	assertionDepth := 0
	position := 0
	basicStarLiteral := true
	for position < len(source) && valid {
		atom := source[position]
		literal := syntax == 'q'
		if syntax == 'b' {
			if atom == '\\' && checkedSubtract(len(source), position) >= 2 && (source[checkedAdd(position, 1)] == '(' || source[checkedAdd(position, 1)] == ')') {
				position = checkedAdd(position, 1)
				atom = checkedChar(source[position])
			} else {
				if atom == '+' || atom == '?' || atom == '|' || atom == '(' || atom == ')' || atom == '{' || atom == '}' {
					literal = true
				} else {
					if atom == '^' && frames[checkedSubtract(frameCount, 1)].sequence > 0 {
						literal = true
					} else {
						if atom == '$' && checkedAdd(position, 1) < len(source) && (checkedSubtract(len(source), position) < 3 || source[checkedAdd(position, 1)] != '\\' || source[checkedAdd(position, 2)] != ')') {
							literal = true
						} else {
							if atom == '*' && basicStarLiteral {
								literal = true
							}
						}
					}
				}
			}
		}
		if syntax == 'e' && atom == ')' && frameCount == 1 {
			literal = true
		}
		if atom == ']' || atom == '}' || (atom == '{' && (tokenEnds[position] == checkedAdd(position, 1) || checkedSubtract(len(source), position) < 2 || (int(checkedChar(source[checkedAdd(position, 1)]))) < 48 || (int(checkedChar(source[checkedAdd(position, 1)]))) > 57)) {
			literal = true
		}
		node := 0
		hasAtom := false
		if literal {
			node = checkedIndex(len(nodes))
			checkedAdd(len(nodes), 1)
			nodes = append(nodes, copycaptureNode(makeCaptureNode(vmLiteral, 0, 0, 0, atom, 0, 1, 0)))
			position = checkedAdd(position, 1)
			hasAtom = true
		} else {
			if atom == '(' {
				basicStarLiteral = true
				group := 0
				first := checkedAdd(groups, 1)
				operation := nodeGroup
				position = checkedAdd(position, 1)
				if syntax != 'b' && position < len(source) && source[position] == '?' && tokenEnds[checkedSubtract(position, 1)] > position {
					if syntax != 'a' {
						valid = false
					}
					position = checkedAdd(position, 1)
					if position < len(source) && source[position] == ':' {
						position = checkedAdd(position, 1)
					} else {
						behind := false
						if position < len(source) && source[position] == '<' {
							behind = true
							position = checkedAdd(position, 1)
						}
						if position < len(source) && (source[position] == '=' || source[position] == '!') {
							operation = checkedIndex(nodeLookahead)
							if behind {
								operation = checkedIndex(nodeLookbehind)
							}
							if source[position] == '!' {
								operation = checkedIndex(nodeNotLookahead)
								if behind {
									operation = checkedIndex(nodeNotLookbehind)
								}
							}
							position = checkedAdd(position, 1)
							assertions = true
							assertionDepth = checkedAdd(assertionDepth, 1)
							if assertionDepth > 64 {
								limited = true
								valid = false
							}
						} else {
							valid = false
						}
					}
				} else {
					if assertionDepth == 0 {
						groups = checkedAdd(groups, 1)
						group = checkedIndex(groups)
						checkedAdd(len(closed), 1)
						closed = append(closed, checkedIndex(0))
					}
				}
				frame := captureFrame{operation: operation, sequence: 0, alternative: 0, group: group, first: first, branched: false}
				if frameCount == len(frames) {
					checkedAdd(len(frames), 1)
					frames = append(frames, copycaptureFrame(frame))
				} else {
					frames[frameCount] = copycaptureFrame(frame)
				}
				frameCount = checkedAdd(frameCount, 1)
			} else {
				if atom == '|' {
					frame := frames[checkedSubtract(frameCount, 1)]
					alternative := frame.sequence
					if frame.branched {
						alternative = checkedIndex(len(nodes))
						checkedAdd(len(nodes), 1)
						nodes = append(nodes, copycaptureNode(makeCaptureNode(nodeAlternative, frame.alternative, frame.sequence, 0, ' ', 1, frame.first, groups)))
					}
					frames[checkedSubtract(frameCount, 1)] = copycaptureFrame(captureFrame{operation: frame.operation, sequence: 0, alternative: alternative, branched: true, group: frame.group, first: frame.first})
					position = checkedAdd(position, 1)
				} else {
					if atom == ')' {
						if frameCount == 1 {
							valid = false
						} else {
							frameCount = checkedIndex(checkedSubtract(frameCount, 1))
							frame := frames[frameCount]
							inner := frame.sequence
							if frame.branched {
								inner = checkedIndex(len(nodes))
								checkedAdd(len(nodes), 1)
								nodes = append(nodes, copycaptureNode(makeCaptureNode(nodeAlternative, frame.alternative, frame.sequence, 0, ' ', 1, frame.first, groups)))
							}
							preference := nodes[inner].preference
							if frame.operation != nodeGroup {
								preference = checkedIndex(0)
								assertionDepth = checkedIndex(checkedSubtract(assertionDepth, 1))
							}
							node = checkedIndex(len(nodes))
							checkedAdd(len(nodes), 1)
							nodes = append(nodes, copycaptureNode(makeCaptureNode(frame.operation, inner, 0, frame.group, ' ', preference, frame.first, groups)))
							if frame.group > 0 {
								closed[frame.group] = checkedIndex(1)
							}
							position = checkedAdd(position, 1)
							hasAtom = true
						}
					} else {
						if atom == '^' || atom == '$' {
							operation := vmBegin
							if atom == '$' {
								operation = checkedIndex(vmEnd)
							}
							node = checkedIndex(len(nodes))
							checkedAdd(len(nodes), 1)
							nodes = append(nodes, copycaptureNode(makeCaptureNode(operation, 0, 0, 0, ' ', 0, 1, 0)))
							position = checkedAdd(position, 1)
							hasAtom = true
						} else {
							operation := 0
							member := ' '
							reference := 0
							if atom == '.' {
								operation = checkedIndex(vmAny)
								position = checkedAdd(position, 1)
							} else {
								if atom == '[' && checkedSubtract(len(source), position) >= 7 && source[checkedAdd(position, 1)] == '[' && source[checkedAdd(position, 2)] == ':' && (source[checkedAdd(position, 3)] == '<' || source[checkedAdd(position, 3)] == '>') && source[checkedAdd(position, 4)] == ':' && source[checkedAdd(position, 5)] == ']' && source[checkedAdd(position, 6)] == ']' {
									operation = checkedIndex(vmWordBegin)
									if source[checkedAdd(position, 3)] == '>' {
										operation = checkedIndex(vmWordEnd)
									}
									position = checkedAdd(position, 7)
								} else {
									if atom == '[' {
										operation = checkedIndex(vmClass)
										reference = checkedIndex(len(classMembers))
										classAtoms := []rune{}
										checkedAdd(len(classAtoms), 1)
										classAtoms = append(classAtoms, checkedChar('['))
										position = checkedAdd(position, 1)
										if position < len(source) && source[position] == '^' {
											checkedAdd(len(classAtoms), 1)
											classAtoms = append(classAtoms, checkedChar('^'))
											position = checkedAdd(position, 1)
										}
										first := position
										special := ' '
										for position < len(source) {
											current := source[position]
											checkedAdd(len(classAtoms), 1)
											classAtoms = append(classAtoms, checkedChar(current))
											position = checkedAdd(position, 1)
											if special == ' ' && syntax == 'a' && current == '\\' && position < len(source) {
												marker := source[position]
												checkedAdd(len(classAtoms), 1)
												classAtoms = append(classAtoms, checkedChar(marker))
												position = checkedAdd(position, 1)
												if marker == 'c' && position < len(source) {
													checkedAdd(len(classAtoms), 1)
													classAtoms = append(classAtoms, checkedChar(source[position]))
													position = checkedAdd(position, 1)
												}
											} else {
												if special != ' ' {
													if current == special && position < len(source) && source[position] == ']' {
														checkedAdd(len(classAtoms), 1)
														classAtoms = append(classAtoms, checkedChar(']'))
														position = checkedAdd(position, 1)
														special = checkedChar(' ')
													}
												} else {
													if current == '[' && position < len(source) && (source[position] == ':' || source[position] == '.' || source[position] == '=') {
														special = checkedChar(source[position])
														checkedAdd(len(classAtoms), 1)
														classAtoms = append(classAtoms, checkedChar(special))
														position = checkedAdd(position, 1)
													} else {
														if current == ']' && position > checkedAdd(first, 1) {
															break
														}
													}
												}
											}
										}
										parsedClass := parseCaptureClass(classAtoms, syntax, groups)
										valid = parsedClass.valid
										if parsedClass.negated {
											member = checkedChar('^')
										}
										index := 0
										for index < len(parsedClass.members) {
											checkedAdd(len(classMembers), 1)
											classMembers = append(classMembers, copycaptureClassMember(parsedClass.members[index]))
											index = checkedAdd(index, 1)
										}
									} else {
										if atom == '\\' && checkedSubtract(len(source), position) >= 2 {
											escaped := source[checkedAdd(position, 1)]
											escapeStart := position
											position = checkedAdd(position, 2)
											if syntax == 'e' || (syntax == 'b' && escaped != '<' && escaped != '>' && ((int(checkedChar(escaped))) < 49 || (int(checkedChar(escaped))) > 57)) {
												operation = checkedIndex(vmLiteral)
												member = checkedChar(escaped)
												if syntax == 'b' && escaped == '{' {
													valid = false
												}
											} else {
												if syntax == 'b' && (escaped == '<' || escaped == '>') {
													operation = checkedIndex(vmWordBegin)
													if escaped == '>' {
														operation = checkedIndex(vmWordEnd)
													}
												} else {
													if escaped == 'A' || escaped == 'Z' || escaped == 'm' || escaped == 'y' || escaped == 'Y' {
														operation = checkedIndex(vmAbsoluteBegin)
														if escaped == 'Z' {
															operation = checkedIndex(vmAbsoluteEnd)
														} else {
															if escaped == 'm' {
																operation = checkedIndex(vmWordBegin)
															} else {
																if escaped == 'y' {
																	operation = checkedIndex(vmBoundary)
																} else {
																	if escaped == 'Y' {
																		operation = checkedIndex(vmNotBoundary)
																	}
																}
															}
														}
													} else {
														if escaped == 'd' || escaped == 'D' || escaped == 's' || escaped == 'S' || escaped == 'W' {
															operation = checkedIndex(vmClass)
															reference = checkedIndex(len(classMembers))
															kind := 14
															if escaped == 'd' || escaped == 'D' {
																kind = checkedIndex(1)
															} else {
																if escaped == 's' || escaped == 'S' {
																	kind = checkedIndex(4)
																}
															}
															checkedAdd(len(classMembers), 1)
															classMembers = append(classMembers, copycaptureClassMember(captureClassMember{kind: kind, lower: 0, upper: 0, complement: escaped == 'D' || escaped == 'S' || escaped == 'W'}))
															checkedAdd(len(classMembers), 1)
															classMembers = append(classMembers, copycaptureClassMember(captureClassMember{kind: 0, lower: 0, upper: 0, complement: false}))
														} else {
															if escaped == 'a' || escaped == 'b' || escaped == 'B' || escaped == 'e' || escaped == 'f' || escaped == 't' || escaped == 'v' {
																operation = checkedIndex(vmNumeric)
																reference = checkedIndex(7)
																if escaped == 'b' {
																	reference = checkedIndex(8)
																} else {
																	if escaped == 'B' {
																		reference = checkedIndex(92)
																	} else {
																		if escaped == 'e' {
																			reference = checkedIndex(27)
																		} else {
																			if escaped == 'f' {
																				reference = checkedIndex(12)
																			} else {
																				if escaped == 't' {
																					reference = checkedIndex(9)
																				} else {
																					if escaped == 'v' {
																						reference = checkedIndex(11)
																					}
																				}
																			}
																		}
																	}
																}
															} else {
																if escaped == 'w' {
																	operation = checkedIndex(vmWord)
																} else {
																	if escaped == 'M' {
																		operation = checkedIndex(vmWordEnd)
																	} else {
																		if escaped == 'n' || escaped == 'r' || ((int(checkedChar(escaped))) < 48 || (int(checkedChar(escaped))) > 57) && ((int(checkedChar(escaped))) < 65 || (int(checkedChar(escaped))) > 90) && ((int(checkedChar(escaped))) < 97 || (int(checkedChar(escaped))) > 122) {
																			operation = checkedIndex(vmLiteral)
																			member = checkedChar(escaped)
																			if escaped == 'n' {
																				member = checkedChar('\n')
																			} else {
																				if escaped == 'r' {
																					member = checkedChar('\r')
																				}
																			}
																		} else {
																			if escaped == 'c' || escaped == 'x' || escaped == 'u' || escaped == 'U' || ((int(checkedChar(escaped))) >= 48 && (int(checkedChar(escaped))) <= 57) {
																				limit := tokenEnds[escapeStart]
																				window := []rune{}
																				next := escapeStart
																				for next < limit && checkedSubtract(next, escapeStart) < 257 {
																					checkedAdd(len(window), 1)
																					window = append(window, checkedChar(source[next]))
																					next = checkedAdd(next, 1)
																				}
																				numeric := parseCaptureNumeric(window, groups, syntax == 'b')
																				valid = numeric.valid
																				if valid {
																					reference = checkedIndex(checkedIndex(numeric.value))
																					position = checkedIndex(checkedAdd(escapeStart, numeric.end))
																					operation = checkedIndex(vmNumeric)
																					if numeric.backreference {
																						operation = checkedIndex(vmBackref)
																						valid = reference < len(closed) && closed[reference] > 0
																					}
																				}
																			} else {
																				valid = false
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										} else {
											if simpleLiteralChar(atom) {
												operation = checkedIndex(vmLiteral)
												member = checkedChar(atom)
												position = checkedAdd(position, 1)
											} else {
												valid = false
											}
										}
									}
								}
							}
							if valid == false {
								break
							}
							node = checkedIndex(len(nodes))
							checkedAdd(len(nodes), 1)
							nodes = append(nodes, copycaptureNode(makeCaptureNode(operation, 0, 0, reference, member, 0, 1, 0)))
							if operation == vmBackref {
								backreferences = true
								if assertionDepth > 0 {
									valid = false
								}
							}
							hasAtom = true
						}
					}
				}
			}
		}
		if hasAtom && valid {
			basicStarLiteral = nodes[node].operation == vmBegin
			repeated := false
			lower := 0
			upper := 0
			unbounded := false
			fixed := false
			quantifierEnd := position
			if syntax != 'q' && position < len(source) {
				basicBound := false
				if syntax == 'b' && checkedSubtract(len(source), position) >= 2 && source[position] == '\\' && source[checkedAdd(position, 1)] == '{' {
					basicBound = true
					position = checkedAdd(position, 1)
				}
				quantifierEnd = checkedIndex(tokenEnds[position])
				quantifier := source[position]
				if (quantifier == '*' && (syntax != 'b' || basicStarLiteral == false)) || (syntax != 'b' && (quantifier == '+' || quantifier == '?')) {
					repeated = true
					unbounded = quantifier != '?'
					upper = checkedIndex(1)
					if quantifier == '+' {
						lower = checkedIndex(1)
					}
					position = checkedAdd(position, 1)
				} else {
					if (syntax != 'b' || basicBound) && quantifier == '{' && quantifierEnd > checkedAdd(position, 1) && checkedSubtract(len(source), position) >= 2 && (int(checkedChar(source[checkedAdd(position, 1)]))) >= 48 && (int(checkedChar(source[checkedAdd(position, 1)]))) <= 57 {
						repeated = true
						fixed = true
						position = checkedAdd(position, 1)
						for position < len(source) && (int(checkedChar(source[position]))) >= 48 && (int(checkedChar(source[position]))) <= 57 {
							double := checkedAdd(lower, lower)
							four := checkedAdd(double, double)
							lower = checkedIndex(checkedAdd(checkedAdd(checkedAdd(four, four), double), checkedIndex((checkedSubtract((int(checkedChar(source[position]))), 48)))))
							position = checkedAdd(position, 1)
							if lower > 255 {
								valid = false
								break
							}
						}
						upper = checkedIndex(lower)
						if position < len(source) && source[position] == ',' {
							fixed = false
							position = checkedAdd(position, 1)
							upper = checkedIndex(0)
							unbounded = true
							for position < len(source) && (int(checkedChar(source[position]))) >= 48 && (int(checkedChar(source[position]))) <= 57 {
								unbounded = false
								double := checkedAdd(upper, upper)
								four := checkedAdd(double, double)
								upper = checkedIndex(checkedAdd(checkedAdd(checkedAdd(four, four), double), checkedIndex((checkedSubtract((int(checkedChar(source[position]))), 48)))))
								position = checkedAdd(position, 1)
								if upper > 255 {
									valid = false
									break
								}
							}
						}
						if basicBound && position < len(source) && source[position] == '\\' {
							position = checkedAdd(position, 1)
						} else {
							if basicBound {
								valid = false
							}
						}
						if position == len(source) || source[position] != '}' || (unbounded == false && upper < lower) {
							valid = false
						} else {
							position = checkedAdd(position, 1)
						}
					}
				}
				if basicBound && repeated == false {
					valid = false
				}
			}
			if repeated && valid {
				inner := nodes[node]
				if captureAssertion(inner.operation) || (inner.operation >= nodeLookahead && inner.operation <= nodeNotLookbehind) {
					valid = false
				}
				preference := 1
				if syntax == 'a' && position < quantifierEnd && source[position] == '?' {
					preference = checkedIndex(2)
					position = checkedAdd(position, 1)
				}
				if fixed {
					preference = checkedIndex(inner.preference)
				}
				if lower == 0 && upper == 0 && unbounded == false {
					preference = checkedIndex(0)
				}
				child := node
				node = checkedIndex(len(nodes))
				checkedAdd(len(nodes), 1)
				nodes = append(nodes, copycaptureNode(captureNode{operation: nodeRepeat, left: child, right: 0, group: 0, atom: ' ', lower: lower, upper: upper, unbounded: unbounded, preference: preference, first: inner.first, last: inner.last}))
			}
			frame := frames[checkedSubtract(frameCount, 1)]
			sequence := node
			if frame.sequence > 0 {
				preference := nodes[frame.sequence].preference
				if preference == 0 {
					preference = checkedIndex(nodes[node].preference)
				}
				sequence = checkedIndex(len(nodes))
				checkedAdd(len(nodes), 1)
				nodes = append(nodes, copycaptureNode(makeCaptureNode(nodeSequence, frame.sequence, node, 0, ' ', preference, frame.first, groups)))
			}
			frames[checkedSubtract(frameCount, 1)] = copycaptureFrame(captureFrame{operation: frame.operation, sequence: sequence, alternative: frame.alternative, branched: frame.branched, group: frame.group, first: frame.first})
		}
	}
	if frameCount != 1 {
		valid = false
	}
	rootFrame := frames[0]
	root := rootFrame.sequence
	if rootFrame.branched {
		root = checkedIndex(len(nodes))
		checkedAdd(len(nodes), 1)
		nodes = append(nodes, copycaptureNode(makeCaptureNode(nodeAlternative, rootFrame.alternative, rootFrame.sequence, 0, ' ', 1, 1, groups)))
	}
	captureMinimums := []int{}
	captureMaximums := []int{}
	captureIndex := 0
	for captureIndex <= groups {
		checkedAdd(len(captureMinimums), 1)
		captureMinimums = append(captureMinimums, checkedIndex(0))
		checkedAdd(len(captureMaximums), 1)
		captureMaximums = append(captureMaximums, checkedIndex(maxCaptureWork))
		captureIndex = checkedAdd(captureIndex, 1)
	}
	references := []int{}
	minimums := []int{}
	maximums := []int{}
	firstLiterals := []int{}
	lastLiterals := []int{}
	index := 0
	for index < len(nodes) {
		node := nodes[index]
		value := 0
		if node.operation == vmBackref {
			value = checkedIndex(1)
		}
		if node.left > 0 && references[node.left] > 0 {
			value = checkedIndex(1)
		}
		if node.right > 0 && references[node.right] > 0 {
			value = checkedIndex(1)
		}
		checkedAdd(len(references), 1)
		references = append(references, checkedIndex(value))
		minimum := 0
		maximum := 0
		firstLiteral := 0
		lastLiteral := 0
		if node.operation == vmLiteral || node.operation == vmAny || node.operation == vmWord || node.operation == vmClass || node.operation == vmNumeric {
			minimum = checkedIndex(1)
			maximum = checkedIndex(1)
			if node.operation == vmLiteral {
				firstLiteral = checkedIndex(checkedAdd((checkedIndex((int(checkedChar(node.atom))))), 1))
				lastLiteral = checkedIndex(firstLiteral)
			} else {
				if node.operation == vmNumeric {
					firstLiteral = checkedIndex(checkedAdd(node.group, 1))
					lastLiteral = checkedIndex(firstLiteral)
				}
			}
		} else {
			if node.operation == vmBackref {
				minimum = checkedIndex(captureMinimums[node.group])
				maximum = checkedIndex(captureMaximums[node.group])
			} else {
				if node.operation == nodeSequence {
					minimum = checkedIndex(captureWidthSum(minimums[node.left], minimums[node.right]))
					maximum = checkedIndex(captureWidthSum(maximums[node.left], maximums[node.right]))
					if minimums[node.left] > 0 {
						firstLiteral = checkedIndex(firstLiterals[node.left])
					}
					if minimums[node.right] > 0 {
						lastLiteral = checkedIndex(lastLiterals[node.right])
					}
				} else {
					if node.operation == nodeAlternative {
						minimum = checkedIndex(minimums[node.left])
						if minimums[node.right] < minimum {
							minimum = checkedIndex(minimums[node.right])
						}
						maximum = checkedIndex(maximums[node.left])
						if maximums[node.right] > maximum {
							maximum = checkedIndex(maximums[node.right])
						}
						if firstLiterals[node.left] == firstLiterals[node.right] {
							firstLiteral = checkedIndex(firstLiterals[node.left])
						}
						if lastLiterals[node.left] == lastLiterals[node.right] {
							lastLiteral = checkedIndex(lastLiterals[node.left])
						}
					} else {
						if node.operation == nodeGroup {
							minimum = checkedIndex(minimums[node.left])
							maximum = checkedIndex(maximums[node.left])
							firstLiteral = checkedIndex(firstLiterals[node.left])
							lastLiteral = checkedIndex(lastLiterals[node.left])
						} else {
							if node.operation == nodeRepeat {
								minimum = checkedIndex(captureWidthRepeat(minimums[node.left], node.lower))
								maximum = checkedIndex(captureWidthRepeat(maximums[node.left], node.upper))
								if node.unbounded && maximums[node.left] > 0 {
									maximum = checkedIndex(maxCaptureWork)
								}
								if node.lower > 0 && minimums[node.left] > 0 {
									firstLiteral = checkedIndex(firstLiterals[node.left])
									lastLiteral = checkedIndex(lastLiterals[node.left])
								}
							}
						}
					}
				}
			}
		}
		if node.operation == nodeGroup && node.group > 0 {
			captureMinimums[node.group] = checkedIndex(minimum)
			captureMaximums[node.group] = checkedIndex(maximum)
		}
		checkedAdd(len(minimums), 1)
		minimums = append(minimums, checkedIndex(minimum))
		checkedAdd(len(maximums), 1)
		maximums = append(maximums, checkedIndex(maximum))
		checkedAdd(len(firstLiterals), 1)
		firstLiterals = append(firstLiterals, checkedIndex(firstLiteral))
		checkedAdd(len(lastLiterals), 1)
		lastLiterals = append(lastLiterals, checkedIndex(lastLiteral))
		index = checkedAdd(index, 1)
	}
	index = checkedIndex(len(nodes))
	for index > 0 {
		index = checkedIndex(checkedSubtract(index, 1))
		for nodes[index].operation == nodeSequence && nodes[nodes[index].left].operation == nodeSequence {
			current := nodes[index]
			left := nodes[current.left]
			preference := nodes[left.right].preference
			if preference == 0 {
				preference = checkedIndex(nodes[current.right].preference)
			}
			nodes[current.left] = copycaptureNode(makeCaptureNode(nodeSequence, left.right, current.right, 0, ' ', preference, current.first, current.last))
			reference := 0
			if references[left.right] > 0 || references[current.right] > 0 {
				reference = checkedIndex(1)
			}
			references[current.left] = checkedIndex(reference)
			minimums[current.left] = checkedIndex(captureWidthSum(minimums[left.right], minimums[current.right]))
			maximums[current.left] = checkedIndex(captureWidthSum(maximums[left.right], maximums[current.right]))
			firstLiterals[current.left] = checkedIndex(0)
			if minimums[left.right] > 0 {
				firstLiterals[current.left] = checkedIndex(firstLiterals[left.right])
			}
			lastLiterals[current.left] = checkedIndex(0)
			if minimums[current.right] > 0 {
				lastLiterals[current.left] = checkedIndex(lastLiterals[current.right])
			}
			nodes[index] = copycaptureNode(makeCaptureNode(nodeSequence, left.left, current.left, 0, ' ', current.preference, current.first, current.last))
		}
	}
	shortest := nodes[root].preference == 2
	interpreted := backreferences || assertions || capturing
	regular := backreferences == false && assertions == false
	prefilter := true
	instructions := []captureInstruction{}
	checkedAdd(len(instructions), 1)
	instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, 1, 0, 0, ' ')))
	checkedAdd(len(instructions), 1)
	instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmAccept, 0, 0, 0, ' ')))
	tasks := []captureBuildTask{}
	checkedAdd(len(tasks), 1)
	tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: root, entry: 0, exit: 1}))
	head := 0
	for head < len(tasks) && valid && prefilter {
		if len(instructions) > maxCaptureInstructions {
			prefilter = false
			if regular {
				limited = true
				valid = false
			}
			break
		}
		task := tasks[head]
		head = checkedAdd(head, 1)
		node := nodes[task.node]
		if node.operation == nodeEmpty {
			instructions[task.entry] = copycaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, ' '))
		} else {
			if node.operation == nodeSequence {
				middle := len(instructions)
				checkedAdd(len(instructions), 1)
				instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, 0, 0, 0, ' ')))
				checkedAdd(len(tasks), 1)
				tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: node.left, entry: task.entry, exit: middle}))
				checkedAdd(len(tasks), 1)
				tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: node.right, entry: middle, exit: task.exit}))
			} else {
				if node.operation == nodeAlternative {
					left := len(instructions)
					checkedAdd(len(instructions), 1)
					instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, 0, 0, 0, ' ')))
					right := len(instructions)
					checkedAdd(len(instructions), 1)
					instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, 0, 0, 0, ' ')))
					instructions[task.entry] = copycaptureInstruction(makeCaptureStep(vmSplit, left, right, 0, ' '))
					checkedAdd(len(tasks), 1)
					tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: node.left, entry: left, exit: task.exit}))
					checkedAdd(len(tasks), 1)
					tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: node.right, entry: right, exit: task.exit}))
				} else {
					if node.operation == nodeGroup {
						begin := len(instructions)
						instructions[task.entry] = copycaptureInstruction(makeCaptureStep(vmJump, begin, 0, 0, ' '))
						checkedAdd(len(instructions), 1)
						instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmClear, node.first, node.last, 0, ' ')))
						if node.group > 0 {
							checkedAdd(len(instructions), 1)
							instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmOpen, 0, 0, node.group, ' ')))
						}
						inner := len(instructions)
						checkedAdd(len(instructions), 1)
						instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, 0, 0, 0, ' ')))
						end := len(instructions)
						if node.group > 0 {
							checkedAdd(len(instructions), 1)
							instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmClose, 0, 0, node.group, ' ')))
						}
						checkedAdd(len(instructions), 1)
						instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, ' ')))
						checkedAdd(len(tasks), 1)
						tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: node.left, entry: inner, exit: end}))
					} else {
						if node.operation == nodeRepeat {
							entry := task.entry
							copies := node.upper
							if node.unbounded {
								copies = checkedIndex(checkedAdd(node.lower, 1))
							}
							count := 0
							for count < copies {
								begin := len(instructions)
								checkedAdd(len(instructions), 1)
								instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmClear, node.first, node.last, 0, ' ')))
								inner := len(instructions)
								checkedAdd(len(instructions), 1)
								instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, 0, 0, 0, ' ')))
								next := len(instructions)
								checkedAdd(len(instructions), 1)
								instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, ' ')))
								if count < node.lower {
									instructions[entry] = copycaptureInstruction(makeCaptureStep(vmJump, begin, 0, 0, ' '))
								} else {
									instructions[entry] = copycaptureInstruction(makeCaptureStep(vmSplit, begin, task.exit, 0, ' '))
								}
								exit := next
								if node.unbounded && count == node.lower {
									exit = checkedIndex(entry)
								}
								checkedAdd(len(tasks), 1)
								tasks = append(tasks, copycaptureBuildTask(captureBuildTask{node: node.left, entry: inner, exit: exit}))
								entry = checkedIndex(next)
								count = checkedAdd(count, 1)
							}
							instructions[entry] = copycaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, ' '))
						} else {
							begin := len(instructions)
							instructions[task.entry] = copycaptureInstruction(makeCaptureStep(vmJump, begin, 0, 0, ' '))
							checkedAdd(len(instructions), 1)
							instructions = append(instructions, copycaptureInstruction(makeCaptureStep(node.operation, 0, 0, node.group, node.atom)))
							checkedAdd(len(instructions), 1)
							instructions = append(instructions, copycaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, ' ')))
						}
					}
				}
			}
		}
	}
	if len(instructions) > maxCaptureInstructions {
		prefilter = false
		if regular {
			limited = true
			valid = false
		}
	}
	return CompiledRegex{valid: valid, limited: limited, nodes: nodes, root: root, references: references, minimums: minimums, maximums: maximums, firstLiterals: firstLiterals, lastLiterals: lastLiterals, interpreted: interpreted, regular: regular, prefilter: prefilter, instructions: instructions, classMembers: classMembers, caseMode: caseMode, newlineMode: newlineMode, shortest: shortest, captures: groups, backreferences: backreferences, caseSensitive: caseSensitive, dotCrossesNewline: dotCrossesNewline, lineAnchors: lineAnchors}
}
func makeCaptureDissectFrame(node int, begin int, end int, capture int, prefix bool) captureDissectFrame {
	node = checkedIndex(node)
	begin = checkedIndex(begin)
	end = checkedIndex(end)
	capture = checkedIndex(capture)
	return captureDissectFrame{node: node, begin: begin, end: end, capture: capture, phase: dissectEnter, cursor: 0, path: 0, prefix: prefix}
}
func captureRepeatEndpoint(begin int, end int, minimum int, maximum int, shortest bool) int {
	begin = checkedIndex(begin)
	end = checkedIndex(end)
	minimum = checkedIndex(minimum)
	maximum = checkedIndex(maximum)
	width := maximum
	if shortest {
		width = checkedIndex(minimum)
	}
	if width > checkedSubtract(end, begin) {
		width = checkedIndex(checkedSubtract(end, begin))
	}
	return checkedAdd(begin, width)
}
func captureBoundaryMatches(expected int, actual rune, caseSensitive bool) bool {
	expected = checkedIndex(expected)
	actual = checkedChar(actual)
	if expected == 0 {
		return true
	}
	actualCode := checkedAdd((checkedIndex((int(checkedChar(actual))))), 1)
	expectedCode := expected
	if caseSensitive == false {
		if actualCode >= 66 && actualCode <= 91 {
			actualCode = checkedAdd(actualCode, 32)
		}
		if expectedCode >= 66 && expectedCode <= 91 {
			expectedCode = checkedAdd(expectedCode, 32)
		}
	}
	return actualCode == expectedCode
}
func executeCaptureTree(program *CompiledRegex, subject string, from int, exactEnd int, exactMatch bool, caseSensitive bool, dotCrossesNewline bool, lineAnchors bool, counting bool, capturing bool, collecting bool, startWork int, batch []MatchSpan, batchMode bool) captureRunResult {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	exactEnd = checkedIndex(exactEnd)
	startWork = checkedIndex(startWork)
	batch = checkedStructs(batch, copyMatchSpan)
	count := 0
	allGroups := []CaptureSpan{}
	matches := []MatchSpan{}
	haystack := []rune(subject)
	width := 0
	if program.backreferences || capturing {
		width = checkedIndex(checkedAdd(program.captures, 1))
	}
	work := startWork
	start := from
	batchIndex := 0
	if batchMode {
		if len(batch) == 0 {
			return completeSearchResult(count, allGroups, matches, work)
		}
		start = checkedIndex(batch[0].Start)
	}
	for start <= len(haystack) {
		nextStart := checkedAdd(start, 1)
		if program.minimums[program.root] > checkedSubtract(len(haystack), start) {
			if batchMode {
				return captureTreeResult(2, 0, work)
			}
			return completeSearchResult(count, allGroups, matches, work)
		}
		minimumEnd := checkedAdd(start, program.minimums[program.root])
		maximumEnd := len(haystack)
		if program.maximums[program.root] < checkedSubtract(len(haystack), start) {
			maximumEnd = checkedIndex(checkedAdd(start, program.maximums[program.root]))
		}
		if exactMatch {
			minimumEnd = checkedIndex(exactEnd)
			maximumEnd = checkedIndex(exactEnd)
		}
		if batchMode {
			minimumEnd = checkedIndex(batch[batchIndex].End)
			maximumEnd = checkedIndex(minimumEnd)
		}
		matchEnd := maximumEnd
		if program.shortest {
			matchEnd = checkedIndex(minimumEnd)
		}
		searching := true
		foundMatch := false
		for searching {
			captures := []captureRegister{}
			group := 0
			for group < width {
				checkedAdd(len(captures), 1)
				captures = append(captures, copycaptureRegister(captureRegister{start: 0, end: 0, status: 0}))
				group = checkedAdd(group, 1)
			}
			frames := []captureDissectFrame{}
			checkedAdd(len(frames), 1)
			frames = append(frames, copycaptureDissectFrame(makeCaptureDissectFrame(program.root, start, matchEnd, 0, false)))
			paths := []captureRepeatPath{}
			checkedAdd(len(paths), 1)
			paths = append(paths, copycaptureRepeatPath(captureRepeatPath{begin: 0, cursor: 0, capture: 0, count: 0, previous: 0}))
			depth := 1
			success := false
			returned := 0
			for depth > 0 {
				if work == maxCaptureWork {
					return captureTreeResult(2, 0, work)
				}
				work = checkedAdd(work, 1)
				frame := frames[checkedSubtract(depth, 1)]
				node := program.nodes[frame.node]
				phase := frame.phase
				cursor := frame.cursor
				path := frame.path
				complete := false
				child := false
				childNode := node.left
				childBegin := frame.begin
				childEnd := frame.end
				childCapture := frame.capture
				childPrefix := false
				clear := false
				advance := false
				lower := node.lower
				upper := node.upper
				if frame.prefix {
					lower = checkedIndex(checkedSubtract(lower, 1))
					if node.unbounded == false {
						upper = checkedIndex(checkedSubtract(upper, 1))
					}
					if frame.begin == frame.end && lower > 1 {
						lower = checkedIndex(1)
						upper = checkedIndex(1)
					}
				}
				repeatedReference := node.operation == nodeRepeat && program.nodes[node.left].operation == vmBackref && (node.unbounded || upper > 0)
				childShortest := program.nodes[node.left].preference == 2
				minimum := program.minimums[frame.node]
				maximum := program.maximums[frame.node]
				if frame.prefix {
					minimum = checkedIndex(captureWidthRepeat(program.minimums[node.left], lower))
					maximum = checkedIndex(captureWidthRepeat(program.maximums[node.left], upper))
					if node.unbounded && program.maximums[node.left] > 0 {
						maximum = checkedIndex(maxCaptureWork)
					}
				}
				if phase == dissectEnter && (checkedSubtract(frame.end, frame.begin) < minimum || checkedSubtract(frame.end, frame.begin) > maximum) {
					success = false
					complete = true
				} else {
					if phase == dissectEnter {
						success = false
						returned = checkedIndex(frame.capture)
						if node.operation == nodeSequence {
							span := checkedSubtract(frame.end, frame.begin)
							leftMinimum := program.minimums[node.left]
							rightMinimum := program.minimums[node.right]
							if leftMinimum > span || rightMinimum > span {
								complete = true
							} else {
								lower := checkedAdd(frame.begin, leftMinimum)
								if program.maximums[node.right] < span && checkedSubtract(frame.end, program.maximums[node.right]) > lower {
									lower = checkedIndex(checkedSubtract(frame.end, program.maximums[node.right]))
								}
								upper := checkedSubtract(frame.end, rightMinimum)
								if program.maximums[node.left] < span && checkedAdd(frame.begin, program.maximums[node.left]) < upper {
									upper = checkedIndex(checkedAdd(frame.begin, program.maximums[node.left]))
								}
								if lower > upper {
									complete = true
								} else {
									cursor = checkedIndex(upper)
									if childShortest {
										cursor = checkedIndex(lower)
									}
									phase = checkedIndex(dissectLeft)
									possible := true
									if cursor > frame.begin && captureBoundaryMatches(program.lastLiterals[node.left], haystack[checkedSubtract(cursor, 1)], caseSensitive) == false {
										possible = false
									}
									if cursor < frame.end && captureBoundaryMatches(program.firstLiterals[node.right], haystack[cursor], caseSensitive) == false {
										possible = false
									}
									if possible == false {
										advance = true
									} else {
										child = true
										childEnd = checkedIndex(cursor)
									}
								}
							}
						} else {
							if node.operation == nodeAlternative {
								child = true
								phase = checkedIndex(dissectAlternative)
							} else {
								if node.operation == nodeGroup {
									child = true
									clear = true
									phase = checkedIndex(dissectGroup)
								} else {
									if node.operation >= nodeLookahead && node.operation <= nodeNotLookbehind {
										if frame.begin != frame.end {
											complete = true
										} else {
											available := checkedSubtract(len(haystack), frame.begin)
											if node.operation >= nodeLookbehind {
												available = checkedIndex(frame.begin)
											}
											minimumWidth := program.minimums[node.left]
											maximumWidth := program.maximums[node.left]
											if maximumWidth > available {
												maximumWidth = checkedIndex(available)
											}
											if minimumWidth > available {
												success = node.operation == nodeNotLookahead || node.operation == nodeNotLookbehind
												complete = true
											} else {
												cursor = checkedIndex(checkedAdd(frame.begin, minimumWidth))
												childEnd = checkedIndex(cursor)
												if node.operation >= nodeLookbehind {
													cursor = checkedIndex(checkedSubtract(frame.begin, maximumWidth))
													childBegin = checkedIndex(cursor)
													childEnd = checkedIndex(frame.begin)
												}
												child = true
												phase = checkedIndex(dissectAssertion)
											}
										}
									} else {
										if node.operation == nodeRepeat && repeatedReference == false {
											if frame.prefix == false && lower > 0 && program.references[node.left] == 0 {
												cursor = checkedIndex(frame.end)
												if node.preference == 2 {
													cursor = checkedIndex(frame.begin)
												}
												child = true
												childNode = checkedIndex(frame.node)
												childPrefix = true
												childEnd = checkedIndex(cursor)
												phase = checkedIndex(dissectPrefix)
											} else {
												if upper == 0 && node.unbounded == false {
													success = frame.begin == frame.end
													complete = true
												} else {
													if childShortest && lower == 0 && frame.begin == frame.end {
														success = true
														complete = true
													} else {
														endpoint := captureRepeatEndpoint(frame.begin, frame.end, program.minimums[node.left], program.maximums[node.left], childShortest)
														path = checkedIndex(len(paths))
														checkedAdd(len(paths), 1)
														paths = append(paths, copycaptureRepeatPath(captureRepeatPath{begin: frame.begin, cursor: endpoint, capture: frame.capture, count: 0, previous: 0}))
														phase = checkedIndex(dissectIteration)
													}
												}
											}
										} else {
											matched := false
											end := frame.begin
											if node.operation == nodeEmpty {
												matched = true
											} else {
												if captureAssertion(node.operation) {
													before := end > 0 && zeroWidthWord(haystack[checkedSubtract(end, 1)])
													after := end < len(haystack) && zeroWidthWord(haystack[end])
													previousNewline := end > 0 && haystack[checkedSubtract(end, 1)] == '\n'
													nextNewline := end < len(haystack) && haystack[end] == '\n'
													matched = captureAssertionMatches(node.operation, end, len(haystack), before, after, previousNewline, nextNewline, lineAnchors)
												} else {
													if node.operation == vmBackref || repeatedReference {
														reference := node.group
														minimumRepeats := 1
														maximumRepeats := 1
														unboundedRepeats := false
														if repeatedReference {
															reference = checkedIndex(program.nodes[node.left].group)
															minimumRepeats = checkedIndex(lower)
															maximumRepeats = checkedIndex(upper)
															unboundedRepeats = node.unbounded
														}
														register := captures[checkedAdd(frame.capture, reference)]
														length := checkedSubtract(register.end, register.start)
														matched = register.status == 2
														if length == 0 {
															matched = matched && end == frame.end
														} else {
															repeats := 0
															for matched && end < frame.end {
																matched = length <= checkedSubtract(frame.end, end) && (unboundedRepeats || repeats < maximumRepeats)
																offset := 0
																for matched && offset < length {
																	if work == maxCaptureWork {
																		return captureTreeResult(2, 0, work)
																	}
																	work = checkedAdd(work, 1)
																	actual := haystack[checkedAdd(end, offset)]
																	expected := haystack[checkedAdd(register.start, offset)]
																	matched = actual == expected || (caseSensitive == false && asciiLowercase(actual) == asciiLowercase(expected))
																	offset = checkedAdd(offset, 1)
																}
																if matched {
																	end = checkedAdd(end, length)
																	repeats = checkedAdd(repeats, 1)
																}
															}
															matched = matched && repeats >= minimumRepeats
														}
													} else {
														if node.operation == vmClass {
															if end < len(haystack) {
																classPosition := node.group
																included := false
																for program.classMembers[classPosition].kind > 0 {
																	if work == maxCaptureWork {
																		return captureTreeResult(2, 0, work)
																	}
																	work = checkedAdd(work, 1)
																	if captureClassMemberMatches(program.classMembers[classPosition], haystack[end], caseSensitive) {
																		included = true
																	}
																	classPosition = checkedAdd(classPosition, 1)
																}
																negated := node.atom == '^'
																matched = included != negated && (negated == false || dotCrossesNewline || haystack[end] != '\n')
																if matched {
																	end = checkedAdd(end, 1)
																}
															}
														} else {
															if end < len(haystack) {
																actual := haystack[end]
																numericLower := node.group
																if numericLower >= 65 && numericLower <= 90 {
																	numericLower = checkedAdd(numericLower, 32)
																}
																matched = (node.operation == vmAny && (dotCrossesNewline || actual != '\n')) || (node.operation == vmWord && zeroWidthWord(actual)) || (node.operation == vmNumeric && ((checkedIndex((int(checkedChar(actual))))) == node.group || (caseSensitive == false && (checkedIndex((int(checkedChar(asciiLowercase(actual)))))) == numericLower))) || (node.operation == vmLiteral && (actual == node.atom || (caseSensitive == false && asciiLowercase(actual) == asciiLowercase(node.atom))))
																if matched {
																	end = checkedAdd(end, 1)
																}
															}
														}
													}
												}
											}
											success = matched && end == frame.end
											complete = true
										}
									}
								}
							}
						}
					} else {
						if phase == dissectLeft || phase == dissectPrefix {
							if success {
								child = true
								childBegin = checkedIndex(cursor)
								childCapture = checkedIndex(returned)
								childNode = checkedIndex(node.right)
								phase = checkedIndex(dissectRight)
								if node.operation == nodeRepeat {
									childNode = checkedIndex(node.left)
									phase = checkedIndex(dissectLastRepeat)
									clear = true
								}
							} else {
								advance = true
							}
						} else {
							if phase == dissectRight || phase == dissectLastRepeat {
								if success {
									complete = true
								} else {
									advance = true
								}
							} else {
								if phase == dissectGroup {
									if success && width > 0 && node.group > 0 {
										snapshot := len(captures)
										group = checkedIndex(0)
										for group < width {
											if work == maxCaptureWork {
												return captureTreeResult(2, 0, work)
											}
											work = checkedAdd(work, 1)
											if group == node.group {
												checkedAdd(len(captures), 1)
												captures = append(captures, copycaptureRegister(captureRegister{start: frame.begin, end: frame.end, status: 2}))
											} else {
												checkedAdd(len(captures), 1)
												captures = append(captures, copycaptureRegister(captures[checkedAdd(returned, group)]))
											}
											group = checkedAdd(group, 1)
										}
										returned = checkedIndex(snapshot)
									}
									complete = true
								} else {
									if phase == dissectAlternative {
										if success {
											complete = true
										} else {
											child = true
											childNode = checkedIndex(node.right)
											phase = checkedIndex(dissectLastAlternative)
										}
									} else {
										if phase == dissectLastAlternative {
											complete = true
										} else {
											if phase == dissectAssertion {
												if success {
													success = node.operation == nodeLookahead || node.operation == nodeLookbehind
													returned = checkedIndex(frame.capture)
													complete = true
												} else {
													limit := len(haystack)
													if node.operation >= nodeLookbehind {
														limit = checkedIndex(checkedSubtract(frame.begin, program.minimums[node.left]))
													} else {
														if program.maximums[node.left] < checkedSubtract(len(haystack), frame.begin) {
															limit = checkedIndex(checkedAdd(frame.begin, program.maximums[node.left]))
														}
													}
													if cursor == limit {
														success = node.operation == nodeNotLookahead || node.operation == nodeNotLookbehind
														returned = checkedIndex(frame.capture)
														complete = true
													} else {
														cursor = checkedAdd(cursor, 1)
														child = true
														if node.operation >= nodeLookbehind {
															childBegin = checkedIndex(cursor)
															childEnd = checkedIndex(frame.begin)
														} else {
															childEnd = checkedIndex(cursor)
														}
													}
												}
											} else {
												if phase == dissectIteration {
													current := paths[path]
													count := checkedAdd(current.count, 1)
													minimum := lower
													if minimum == 0 {
														minimum = checkedIndex(1)
													}
													maximum := checkedSubtract(frame.end, frame.begin)
													if node.unbounded == false && upper < maximum {
														maximum = checkedIndex(upper)
													}
													if maximum < minimum {
														maximum = checkedIndex(minimum)
													}
													if (current.cursor == current.begin && current.cursor != frame.end && (count >= minimum || checkedSubtract(minimum, count) < checkedSubtract(frame.end, current.cursor))) || (count == maximum && current.cursor != frame.end) || (current.cursor == frame.end && count < minimum) {
														phase = checkedIndex(dissectIterationAdvance)
													} else {
														child = true
														childBegin = checkedIndex(current.begin)
														childEnd = checkedIndex(current.cursor)
														childCapture = checkedIndex(current.capture)
														clear = true
														phase = checkedIndex(dissectIterationResult)
													}
												} else {
													if phase == dissectIterationResult {
														current := paths[path]
														if success && current.cursor == frame.end {
															complete = true
														} else {
															if success {
																endpoint := captureRepeatEndpoint(current.cursor, frame.end, program.minimums[node.left], program.maximums[node.left], childShortest)
																previous := path
																path = checkedIndex(len(paths))
																checkedAdd(len(paths), 1)
																paths = append(paths, copycaptureRepeatPath(captureRepeatPath{begin: current.cursor, cursor: endpoint, capture: returned, count: checkedAdd(current.count, 1), previous: previous}))
																phase = checkedIndex(dissectIteration)
															} else {
																phase = checkedIndex(dissectIterationAdvance)
															}
														}
													} else {
														if phase == dissectIterationAdvance {
															current := paths[path]
															endpoint := current.cursor
															limit := captureRepeatEndpoint(current.begin, frame.end, program.minimums[node.left], program.maximums[node.left], childShortest == false)
															if endpoint == limit {
																path = checkedIndex(current.previous)
																if path == 0 {
																	success = lower == 0 && frame.begin == frame.end
																	returned = checkedIndex(frame.capture)
																	complete = true
																}
															} else {
																if childShortest {
																	endpoint = checkedAdd(endpoint, 1)
																} else {
																	endpoint = checkedIndex(checkedSubtract(endpoint, 1))
																}
																paths[path] = copycaptureRepeatPath(captureRepeatPath{begin: current.begin, cursor: endpoint, capture: current.capture, count: current.count, previous: current.previous})
																phase = checkedIndex(dissectIteration)
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
				if advance {
					ascending := childShortest
					if node.operation == nodeRepeat {
						ascending = node.preference == 2
					}
					lower := frame.begin
					upper := frame.end
					if node.operation == nodeSequence {
						lower = checkedAdd(lower, program.minimums[node.left])
						if program.maximums[node.right] < checkedSubtract(frame.end, frame.begin) && checkedSubtract(frame.end, program.maximums[node.right]) > lower {
							lower = checkedIndex(checkedSubtract(frame.end, program.maximums[node.right]))
						}
						upper = checkedIndex(checkedSubtract(frame.end, program.minimums[node.right]))
						if program.maximums[node.left] < checkedSubtract(frame.end, frame.begin) && checkedAdd(frame.begin, program.maximums[node.left]) < upper {
							upper = checkedIndex(checkedAdd(frame.begin, program.maximums[node.left]))
						}
					}
					choosing := true
					for choosing {
						if (ascending && cursor == upper) || (ascending == false && cursor == lower) {
							success = false
							complete = true
							choosing = false
						} else {
							if work == maxCaptureWork {
								return captureTreeResult(2, 0, work)
							}
							work = checkedAdd(work, 1)
							if ascending {
								cursor = checkedAdd(cursor, 1)
							} else {
								cursor = checkedIndex(checkedSubtract(cursor, 1))
							}
							possible := true
							if node.operation == nodeSequence {
								if cursor > frame.begin && captureBoundaryMatches(program.lastLiterals[node.left], haystack[checkedSubtract(cursor, 1)], caseSensitive) == false {
									possible = false
								}
								if cursor < frame.end && captureBoundaryMatches(program.firstLiterals[node.right], haystack[cursor], caseSensitive) == false {
									possible = false
								}
							}
							if possible {
								child = true
								childEnd = checkedIndex(cursor)
								phase = checkedIndex(dissectLeft)
								if node.operation == nodeRepeat {
									childNode = checkedIndex(frame.node)
									childPrefix = true
									phase = checkedIndex(dissectPrefix)
								}
								choosing = false
							}
						}
					}
				}
				if complete {
					depth = checkedIndex(checkedSubtract(depth, 1))
				} else {
					frames[checkedSubtract(depth, 1)] = copycaptureDissectFrame(captureDissectFrame{node: frame.node, begin: frame.begin, end: frame.end, capture: frame.capture, phase: phase, cursor: cursor, path: path, prefix: frame.prefix})
					if child {
						if clear && width > 0 {
							snapshot := len(captures)
							group = checkedIndex(0)
							for group < width {
								if work == maxCaptureWork {
									return captureTreeResult(2, 0, work)
								}
								work = checkedAdd(work, 1)
								if group >= node.first && group <= node.last {
									checkedAdd(len(captures), 1)
									captures = append(captures, copycaptureRegister(captureRegister{start: 0, end: 0, status: 0}))
								} else {
									checkedAdd(len(captures), 1)
									captures = append(captures, copycaptureRegister(captures[checkedAdd(childCapture, group)]))
								}
								group = checkedAdd(group, 1)
							}
							childCapture = checkedIndex(snapshot)
						}
						next := makeCaptureDissectFrame(childNode, childBegin, childEnd, childCapture, childPrefix)
						if depth == len(frames) {
							checkedAdd(len(frames), 1)
							frames = append(frames, copycaptureDissectFrame(next))
						} else {
							frames[depth] = copycaptureDissectFrame(next)
						}
						depth = checkedAdd(depth, 1)
					}
				}
			}
			if success {
				foundMatch = true
				if capturing {
					groups := []CaptureSpan{}
					checkedAdd(len(groups), 1)
					groups = append(groups, copyCaptureSpan(CaptureSpan{Matched: true, Start: start, End: matchEnd}))
					group = checkedIndex(1)
					for group < width {
						if work == maxCaptureWork {
							return captureTreeResult(2, 0, work)
						}
						work = checkedAdd(work, 1)
						register := captures[checkedAdd(returned, group)]
						checkedAdd(len(groups), 1)
						groups = append(groups, copyCaptureSpan(CaptureSpan{Matched: register.status == 2, Start: register.start, End: register.end}))
						group = checkedAdd(group, 1)
					}
					if counting == false {
						return captureRunResult{kind: 0, start: start, end: matchEnd, count: 1, groups: groups, matches: matches, groupWidth: 0, work: work}
					}
					groupIndex := 0
					for groupIndex < len(groups) {
						if work == maxCaptureWork {
							return captureTreeResult(2, 0, work)
						}
						work = checkedAdd(work, 1)
						checkedAdd(len(allGroups), 1)
						allGroups = append(allGroups, copyCaptureSpan(groups[groupIndex]))
						groupIndex = checkedAdd(groupIndex, 1)
					}
				}
				if counting == false {
					return makeCaptureRunResult(0, start, matchEnd, 1)
				}
				count = checkedAdd(count, 1)
				if collecting && capturing == false {
					checkedAdd(len(matches), 1)
					matches = append(matches, copyMatchSpan(MatchSpan{Start: start, End: matchEnd}))
				}
				nextStart = checkedIndex(matchEnd)
				if matchEnd == start {
					if matchEnd == len(haystack) {
						return completeSearchResult(count, allGroups, matches, work)
					}
					nextStart = checkedAdd(nextStart, 1)
				}
				break
			}
			if program.shortest {
				if matchEnd == maximumEnd {
					searching = false
				} else {
					matchEnd = checkedAdd(matchEnd, 1)
				}
			} else {
				if matchEnd == minimumEnd {
					searching = false
				} else {
					matchEnd = checkedIndex(checkedSubtract(matchEnd, 1))
				}
			}
		}
		if exactMatch {
			return captureTreeResult(2, 0, work)
		}
		if batchMode {
			if foundMatch == false {
				return captureTreeResult(2, 0, work)
			}
			batchIndex = checkedAdd(batchIndex, 1)
			if batchIndex == len(batch) {
				return completeSearchResult(count, allGroups, matches, work)
			}
			start = checkedIndex(batch[batchIndex].Start)
		} else {
			start = checkedIndex(nextStart)
		}
	}
	return completeSearchResult(count, allGroups, matches, work)
}
func executeCaptureTreeSearch(program *CompiledRegex, subject string, from int, exactEnd int, exactMatch bool, caseSensitive bool, dotCrossesNewline bool, lineAnchors bool, counting bool, capturing bool, collecting bool, startWork int) captureRunResult {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	exactEnd = checkedIndex(exactEnd)
	startWork = checkedIndex(startWork)
	batch := []MatchSpan{}
	return executeCaptureTree(program, subject, from, exactEnd, exactMatch, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, startWork, batch, false)
}
func completeProgramSearch(program *CompiledRegex, subject string, caseSensitive bool, dotCrossesNewline bool, lineAnchors bool, count int, matches []MatchSpan, work int, captureAll bool) captureRunResult {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	count = checkedIndex(count)
	matches = checkedStructs(matches, copyMatchSpan)
	work = checkedIndex(work)
	if captureAll {
		return executeCaptureTree(program, subject, 0, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, true, true, true, work, matches, true)
	}
	groups := []CaptureSpan{}
	return completeSearchResult(count, groups, matches, work)
}
func executeCaptureProgram(program *CompiledRegex, subject string, from int, caseSensitive bool, dotCrossesNewline bool, lineAnchors bool, counting bool, capturing bool, collecting bool) captureRunResult {
	program = checkedOpaqueBorrow(program)
	subject = checkedString(subject)
	from = checkedIndex(from)
	if program.caseMode == 'i' {
		caseSensitive = false
	} else {
		if program.caseMode == 'c' {
			caseSensitive = true
		}
	}
	if program.newlineMode == 'm' || program.newlineMode == 'n' {
		dotCrossesNewline = false
		lineAnchors = true
	} else {
		if program.newlineMode == 'p' {
			dotCrossesNewline = false
			lineAnchors = false
		} else {
			if program.newlineMode == 'w' {
				dotCrossesNewline = true
				lineAnchors = true
			} else {
				if program.newlineMode == 's' {
					dotCrossesNewline = true
					lineAnchors = false
				}
			}
		}
	}
	if program.interpreted && program.prefilter == false {
		return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0)
	}
	count := 0
	matches := []MatchSpan{}
	work := 0
	projected := program.regular == false
	haystack := []rune(subject)
	if from > len(haystack) {
		return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting)
	}
	seenEpochs := []int{}
	seenStarts := []int{}
	instructionIndex := 0
	for instructionIndex < len(program.instructions) {
		checkedAdd(len(seenEpochs), 1)
		seenEpochs = append(seenEpochs, checkedIndex(0))
		checkedAdd(len(seenStarts), 1)
		seenStarts = append(seenStarts, checkedIndex(0))
		instructionIndex = checkedAdd(instructionIndex, 1)
	}
	searchFrom := from
	epoch := 0
	for searchFrom <= len(haystack) {
		stack := []patternWorkState{}
		stackLen := 0
		next := []patternWorkState{}
		nextLen := 0
		found := false
		bestStart := searchFrom
		bestEnd := searchFrom
		position := searchFrom
		for position <= len(haystack) {
			epoch = checkedAdd(epoch, 1)
			if found == false {
				seed := patternWorkState{pattern: 0, subject: position}
				if stackLen == len(stack) {
					checkedAdd(len(stack), 1)
					stack = append(stack, copypatternWorkState(seed))
				} else {
					stack[stackLen] = copypatternWorkState(seed)
				}
				stackLen = checkedAdd(stackLen, 1)
			}
			for stackLen > 0 {
				stackLen = checkedIndex(checkedSubtract(stackLen, 1))
				state := stack[stackLen]
				if work == maxCaptureWork {
					if projected {
						return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0)
					}
					return makeCaptureRunResult(2, 0, 0, 0)
				}
				work = checkedAdd(work, 1)
				instruction := state.pattern
				start := state.subject
				if seenEpochs[instruction] != epoch || seenStarts[instruction] > start {
					seenEpochs[instruction] = checkedIndex(epoch)
					seenStarts[instruction] = checkedIndex(start)
					step := program.instructions[instruction]
					if step.operation == vmAccept {
						if projected {
							return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0)
						}
						if found == false || start < bestStart || (start == bestStart && ((program.shortest && position < bestEnd) || (program.shortest == false && position > bestEnd))) {
							found = true
							bestStart = checkedIndex(start)
							bestEnd = checkedIndex(position)
						}
					} else {
						if projected && (step.operation == vmBackref || (step.operation >= nodeLookahead && step.operation <= nodeNotLookbehind)) {
							resumed := patternWorkState{pattern: checkedAdd(instruction, 1), subject: start}
							if stackLen == len(stack) {
								checkedAdd(len(stack), 1)
								stack = append(stack, copypatternWorkState(resumed))
							} else {
								stack[stackLen] = copypatternWorkState(resumed)
							}
							stackLen = checkedAdd(stackLen, 1)
							if step.operation == vmBackref && position < len(haystack) {
								if nextLen == len(next) {
									checkedAdd(len(next), 1)
									next = append(next, copypatternWorkState(state))
								} else {
									next[nextLen] = copypatternWorkState(state)
								}
								nextLen = checkedAdd(nextLen, 1)
							}
						} else {
							if captureAssertion(step.operation) {
								before := position > 0 && zeroWidthWord(haystack[checkedSubtract(position, 1)])
								after := position < len(haystack) && zeroWidthWord(haystack[position])
								previousNewline := position > 0 && haystack[checkedSubtract(position, 1)] == '\n'
								nextNewline := position < len(haystack) && haystack[position] == '\n'
								if captureAssertionMatches(step.operation, position, len(haystack), before, after, previousNewline, nextNewline, lineAnchors) {
									resumed := patternWorkState{pattern: checkedAdd(instruction, 1), subject: start}
									if stackLen == len(stack) {
										checkedAdd(len(stack), 1)
										stack = append(stack, copypatternWorkState(resumed))
									} else {
										stack[stackLen] = copypatternWorkState(resumed)
									}
									stackLen = checkedAdd(stackLen, 1)
								}
							} else {
								if step.operation == vmSplit {
									skipped := patternWorkState{pattern: step.alternate, subject: start}
									if stackLen == len(stack) {
										checkedAdd(len(stack), 1)
										stack = append(stack, copypatternWorkState(skipped))
									} else {
										stack[stackLen] = copypatternWorkState(skipped)
									}
									stackLen = checkedAdd(stackLen, 1)
									branch := patternWorkState{pattern: step.target, subject: start}
									if stackLen == len(stack) {
										checkedAdd(len(stack), 1)
										stack = append(stack, copypatternWorkState(branch))
									} else {
										stack[stackLen] = copypatternWorkState(branch)
									}
									stackLen = checkedAdd(stackLen, 1)
								} else {
									if step.operation == vmJump || step.operation == vmClear || step.operation == vmOpen || step.operation == vmClose {
										target := checkedAdd(instruction, 1)
										if step.operation == vmJump {
											target = checkedIndex(step.target)
										}
										resumed := patternWorkState{pattern: target, subject: start}
										if stackLen == len(stack) {
											checkedAdd(len(stack), 1)
											stack = append(stack, copypatternWorkState(resumed))
										} else {
											stack[stackLen] = copypatternWorkState(resumed)
										}
										stackLen = checkedAdd(stackLen, 1)
									} else {
										if step.operation == vmClass {
											if position < len(haystack) {
												classPosition := step.group
												included := false
												for program.classMembers[classPosition].kind > 0 {
													if work == maxCaptureWork {
														if projected {
															return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0)
														}
														return makeCaptureRunResult(2, 0, 0, 0)
													}
													work = checkedAdd(work, 1)
													if captureClassMemberMatches(program.classMembers[classPosition], haystack[position], caseSensitive) {
														included = true
													}
													classPosition = checkedAdd(classPosition, 1)
												}
												negated := step.atom == '^'
												matched := included != negated && (negated == false || dotCrossesNewline || haystack[position] != '\n')
												if matched {
													resumed := patternWorkState{pattern: checkedAdd(instruction, 1), subject: start}
													if nextLen == len(next) {
														checkedAdd(len(next), 1)
														next = append(next, copypatternWorkState(resumed))
													} else {
														next[nextLen] = copypatternWorkState(resumed)
													}
													nextLen = checkedAdd(nextLen, 1)
												}
											}
										} else {
											if position < len(haystack) {
												actual := haystack[position]
												codepoint := int(checkedChar(actual))
												lowercase := int(checkedChar(asciiLowercase(actual)))
												word := (codepoint >= 48 && codepoint <= 57) || (lowercase >= 97 && lowercase <= 122) || actual == '_'
												numericLower := step.group
												if numericLower >= 65 && numericLower <= 90 {
													numericLower = checkedAdd(numericLower, 32)
												}
												matched := (step.operation == vmAny && (dotCrossesNewline || actual != '\n')) || (step.operation == vmWord && word) || (step.operation == vmNumeric && (checkedIndex((int(checkedChar(actual)))) == step.group || (caseSensitive == false && checkedIndex((int(checkedChar(asciiLowercase(actual))))) == numericLower))) || (step.operation == vmLiteral && (actual == step.atom || (caseSensitive == false && asciiLowercase(actual) == asciiLowercase(step.atom))))
												if matched {
													resumed := patternWorkState{pattern: checkedAdd(instruction, 1), subject: start}
													if nextLen == len(next) {
														checkedAdd(len(next), 1)
														next = append(next, copypatternWorkState(resumed))
													} else {
														next[nextLen] = copypatternWorkState(resumed)
													}
													nextLen = checkedAdd(nextLen, 1)
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			keep := 0
			index := 0
			for index < nextLen {
				state := next[index]
				if found == false || state.subject < bestStart || (program.shortest == false && state.subject == bestStart) {
					next[keep] = copypatternWorkState(state)
					keep = checkedAdd(keep, 1)
				}
				index = checkedAdd(index, 1)
			}
			nextLen = checkedIndex(keep)
			if found && nextLen == 0 {
				break
			}
			if position == len(haystack) {
				break
			}
			position = checkedAdd(position, 1)
			stackLen = checkedIndex(0)
			index = checkedIndex(0)
			for index < nextLen {
				state := next[index]
				if stackLen == len(stack) {
					checkedAdd(len(stack), 1)
					stack = append(stack, copypatternWorkState(state))
				} else {
					stack[stackLen] = copypatternWorkState(state)
				}
				stackLen = checkedAdd(stackLen, 1)
				index = checkedAdd(index, 1)
			}
			nextLen = checkedIndex(0)
		}
		if found {
			if counting == false {
				if capturing {
					return executeCaptureTreeSearch(program, subject, bestStart, bestEnd, true, caseSensitive, dotCrossesNewline, lineAnchors, false, true, false, work)
				}
				return makeCaptureRunResult(0, bestStart, bestEnd, 1)
			}
			count = checkedAdd(count, 1)
			if collecting {
				checkedAdd(len(matches), 1)
				matches = append(matches, copyMatchSpan(MatchSpan{Start: bestStart, End: bestEnd}))
			}
			searchFrom = checkedIndex(bestEnd)
			if bestEnd == bestStart {
				if bestEnd == len(haystack) {
					return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting)
				}
				searchFrom = checkedAdd(searchFrom, 1)
			}
		} else {
			return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting)
		}
	}
	return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting)
}
func simpleLiteralChar(atom rune) bool {
	atom = checkedChar(atom)
	return atom != '\\' && atom != '.' && atom != '^' && atom != '$' && atom != '*' && atom != '+' && atom != '?' && atom != '{' && atom != '}' && atom != '[' && atom != ']' && atom != '(' && atom != ')' && atom != '|'
}
