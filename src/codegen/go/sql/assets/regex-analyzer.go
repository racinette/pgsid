package pgsidsql

type regexOperation struct {
	Kind       string
	Characters string
	Source     string
	Flag       string
	Prefix     string
	Suffix     string
}

type regexDecision struct {
	Kind     string
	Source   string
	Flags    []string
	Features []string
	Error    string
	Position int
}

type regexRange struct{ From, To int }

type regexNode struct {
	Kind, Value, Assertion                                         string
	Children                                                       []*regexNode
	Ranges                                                         []regexRange
	Minimum, Maximum                                               int
	Preference                                                     string
	Capturing, Negated, ExcludesNewline, IncludesNewline, Positive bool
	Direction                                                      string
	Capture                                                        int
}

type regexAtom struct {
	Expression   *regexNode
	Quantifiable bool
}

type regexClassItem struct {
	Ranges        []regexRange
	RangeEndpoint bool
}

type regexParseFailure struct {
	Error    string
	Position int
}

type regexParser struct {
	Pattern                             []rune
	Position, Captures, LookaroundDepth int
	ClosedCaptures                      map[int]bool
	Syntax, Newline                     string
	CaseSensitive, Expanded             bool
}

func regexLiteral(value string) *regexNode {
	if value == "" {
		return &regexNode{Kind: "empty"}
	}
	return &regexNode{Kind: "literal", Value: value}
}

func regexImpossible() *regexNode { return &regexNode{Kind: "impossible"} }

func regexConcatenate(nodes []*regexNode) *regexNode {
	flattened := []*regexNode{}
	for _, node := range nodes {
		if node.Kind == "impossible" {
			return regexImpossible()
		}
		if node.Kind == "empty" {
			continue
		}
		if node.Kind == "concatenation" {
			flattened = append(flattened, node.Children...)
		} else {
			flattened = append(flattened, node)
		}
	}
	merged := []*regexNode{}
	for _, node := range flattened {
		if len(merged) > 0 && merged[len(merged)-1].Kind == "literal" && node.Kind == "literal" {
			merged[len(merged)-1] = regexLiteral(merged[len(merged)-1].Value + node.Value)
		} else {
			merged = append(merged, node)
		}
	}
	if len(merged) == 0 {
		return &regexNode{Kind: "empty"}
	}
	if len(merged) == 1 {
		return merged[0]
	}
	return &regexNode{Kind: "concatenation", Children: merged}
}

func regexAlternate(nodes []*regexNode) *regexNode {
	flattened := []*regexNode{}
	for _, node := range nodes {
		if node.Kind == "alternation" {
			flattened = append(flattened, node.Children...)
		} else {
			flattened = append(flattened, node)
		}
	}
	if len(flattened) == 1 {
		return flattened[0]
	}
	return &regexNode{Kind: "alternation", Children: flattened}
}

func regexIsAlpha(c rune) bool { return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' }
func regexIsDigit(c rune) bool { return c >= '0' && c <= '9' }
func regexIsAlnum(c rune) bool { return regexIsAlpha(c) || regexIsDigit(c) }
func regexIsOctal(c rune) bool { return c >= '0' && c <= '7' }
func regexIsHex(c rune) bool   { return regexIsDigit(c) || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F' }
func regexIsExpandedSpace(c rune) bool {
	return c == ' ' || c == '\t' || c == '\n' || c == '\v' || c == '\f' || c == '\r'
}

func (p *regexParser) atEnd() bool { return p.Position >= len(p.Pattern) }
func (p *regexParser) peek(offset int) rune {
	index := p.Position + offset
	if index < 0 || index >= len(p.Pattern) {
		return 0
	}
	return p.Pattern[index]
}
func (p *regexParser) take() rune {
	if p.atEnd() {
		return 0
	}
	result := p.Pattern[p.Position]
	p.Position++
	return result
}
func (p *regexParser) startsWith(value string) bool {
	return strings.HasPrefix(string(p.Pattern[p.Position:]), value)
}
func (p *regexParser) fail(code string, position int) {
	if position < 0 {
		position = p.Position
	}
	panic(regexParseFailure{Error: code, Position: position})
}
func (p *regexParser) assertion(name string) *regexNode {
	return &regexNode{Kind: "assertion", Assertion: name}
}
func (p *regexParser) lineAssertion(beginning bool) *regexNode {
	sensitive := p.Newline == "sensitive" || p.Newline == "anchors"
	if beginning {
		if sensitive {
			return p.assertion("beginning-of-line")
		}
		return p.assertion("beginning-of-string")
	}
	if sensitive {
		return p.assertion("end-of-line")
	}
	return p.assertion("end-of-string")
}
func (p *regexParser) codePointExpression(value int) *regexNode {
	if value == 0 || value > 0x10ffff || value >= 0xd800 && value <= 0xdfff {
		return regexImpossible()
	}
	return regexLiteral(string(rune(value)))
}
func (p *regexParser) skipExpanded() {
	if !p.Expanded || p.Syntax == "literal" {
		return
	}
	for {
		for regexIsExpandedSpace(p.peek(0)) {
			p.Position++
		}
		if p.peek(0) != '#' {
			return
		}
		for !p.atEnd() && p.peek(0) != '\n' {
			p.Position++
		}
	}
}
func (p *regexParser) takeDigits(valid func(rune) bool, minimum, maximum int) string {
	start := p.Position
	for p.Position-start < maximum && valid(p.peek(0)) {
		p.Position++
	}
	if p.Position-start < minimum {
		return ""
	}
	return string(p.Pattern[start:p.Position])
}
func (p *regexParser) parsePrefixes() {
	if p.startsWith("***") {
		director := p.peek(3)
		if director == '=' {
			p.Syntax, p.Expanded, p.Newline = "literal", false, "ordinary"
			p.Position += 4
			return
		}
		if director != ':' {
			p.fail("invalid-quantifier-operand", -1)
		}
		p.Syntax = "advanced"
		p.Position += 4
	}
	if p.Syntax != "advanced" || p.peek(0) != '(' || p.peek(1) != '?' || !regexIsAlpha(p.peek(2)) {
		return
	}
	p.Position += 2
	for !p.atEnd() && regexIsAlpha(p.peek(0)) {
		switch p.take() {
		case 'b':
			p.Syntax = "basic"
		case 'c':
			p.CaseSensitive = true
		case 'e':
			p.Syntax = "extended"
		case 'i':
			p.CaseSensitive = false
		case 'm', 'n':
			p.Newline = "sensitive"
		case 'p':
			p.Newline = "stop"
		case 'q':
			p.Syntax = "literal"
		case 's':
			p.Newline = "ordinary"
		case 't':
			p.Expanded = false
		case 'w':
			p.Newline = "anchors"
		case 'x':
			p.Expanded = true
		default:
			p.fail("invalid-option", -1)
		}
	}
	if p.take() != ')' {
		p.fail("invalid-option", -1)
	}
	if p.Syntax == "literal" {
		p.Expanded, p.Newline = false, "ordinary"
	}
}

func (p *regexParser) parse() *regexNode {
	p.parsePrefixes()
	var expression *regexNode
	if p.Syntax == "literal" {
		expression = regexLiteral(string(p.Pattern[p.Position:]))
		p.Position = len(p.Pattern)
	} else if p.Syntax == "basic" {
		expression = p.parseBasic(false)
	} else {
		expression = p.parseAlternation(false)
	}
	p.skipExpanded()
	if !p.atEnd() {
		p.fail("unbalanced-parentheses", -1)
	}
	return expression
}

func (p *regexParser) parseAlternation(stopper bool) *regexNode {
	branches := []*regexNode{}
	for {
		branches = append(branches, p.parseSequence(stopper))
		p.skipExpanded()
		if p.peek(0) != '|' {
			break
		}
		p.Position++
	}
	if stopper && p.peek(0) != ')' {
		p.fail("unbalanced-parentheses", -1)
	}
	return regexAlternate(branches)
}

func (p *regexParser) parseSequence(stopper bool) *regexNode {
	expressions := []*regexNode{}
	for {
		p.skipExpanded()
		if p.atEnd() || p.peek(0) == '|' || stopper && p.peek(0) == ')' {
			break
		}
		if p.Syntax == "advanced" && p.startsWith("(?#") {
			p.Position += 3
			for !p.atEnd() && p.peek(0) != ')' {
				p.Position++
			}
			if !p.atEnd() {
				p.Position++
			}
			continue
		}
		atom := p.parseExtendedAtom(stopper)
		if atom.Quantifiable {
			expressions = append(expressions, p.parseExtendedQuantifier(atom.Expression))
		} else {
			expressions = append(expressions, atom.Expression)
		}
	}
	return regexConcatenate(expressions)
}

func (p *regexParser) parseExtendedAtom(stopper bool) regexAtom {
	start := p.Position
	if p.startsWith("[[:<:]]") {
		p.Position += 7
		return regexAtom{p.assertion("beginning-of-word"), false}
	}
	if p.startsWith("[[:>:]]") {
		p.Position += 7
		return regexAtom{p.assertion("end-of-word"), false}
	}
	if p.atEnd() {
		p.fail("invalid-pattern", -1)
	}
	switch character := p.take(); character {
	case '^':
		return regexAtom{p.lineAssertion(true), false}
	case '$':
		return regexAtom{p.lineAssertion(false), false}
	case '.':
		return regexAtom{&regexNode{Kind: "any-character", IncludesNewline: p.Newline == "ordinary" || p.Newline == "anchors"}, true}
	case '[':
		p.Position = start
		return regexAtom{p.parseCharacterClass(p.Syntax == "advanced"), true}
	case '\\':
		return p.parseAdvancedEscape()
	case '(':
		return p.parseGroup()
	case ')':
		if stopper {
			p.fail("invalid-pattern", -1)
		}
		if p.Syntax == "extended" {
			return regexAtom{regexLiteral(")"), true}
		}
		p.fail("unbalanced-parentheses", -1)
	case '*', '+', '?':
		p.fail("invalid-quantifier-operand", -1)
	case '{':
		p.skipExpanded()
		if regexIsDigit(p.peek(0)) {
			p.fail("invalid-quantifier-operand", -1)
		}
		return regexAtom{regexLiteral("{"), true}
	}
	return regexAtom{regexLiteral(string(p.Pattern[start:p.Position])), true}
}

func (p *regexParser) parseGroup() regexAtom {
	capturing := true
	direction := ""
	positive := false
	if p.Syntax == "advanced" && p.peek(0) == '?' {
		p.Position++
		switch p.take() {
		case ':':
			capturing = false
		case '=':
			direction, positive = "ahead", true
		case '!':
			direction, positive = "ahead", false
		case '<':
			switch p.take() {
			case '=':
				direction, positive = "behind", true
			case '!':
				direction, positive = "behind", false
			default:
				p.fail("invalid-quantifier-operand", -1)
			}
		default:
			p.fail("invalid-quantifier-operand", -1)
		}
	}
	if direction != "" {
		p.LookaroundDepth++
		expression := p.parseAlternation(true)
		p.LookaroundDepth--
		p.Position++
		return regexAtom{&regexNode{Kind: "lookaround", Direction: direction, Positive: positive, Children: []*regexNode{expression}}, false}
	}
	capture := 0
	if capturing && p.LookaroundDepth == 0 {
		p.Captures++
		capture = p.Captures
	}
	expression := p.parseAlternation(true)
	p.Position++
	if capture != 0 {
		p.ClosedCaptures[capture] = true
	}
	return regexAtom{&regexNode{Kind: "group", Capturing: capture != 0, Capture: capture, Children: []*regexNode{expression}}, true}
}

func (p *regexParser) parseAdvancedEscape() regexAtom {
	if p.atEnd() {
		p.fail("invalid-escape", -1)
	}
	character := p.take()
	if p.Syntax == "extended" || !regexIsAlnum(character) {
		return regexAtom{regexLiteral(string(character)), true}
	}
	className := ""
	switch character {
	case 'd', 'D':
		className = "digit"
	case 's', 'S':
		className = "space"
	case 'w', 'W':
		className = "word"
	}
	if className != "" {
		return regexAtom{p.characterClass(regexPosixClass(className), character == 'D' || character == 'S' || character == 'W', false), true}
	}
	assertion := ""
	switch character {
	case 'A':
		assertion = "beginning-of-string"
	case 'm':
		assertion = "beginning-of-word"
	case 'M':
		assertion = "end-of-word"
	case 'y':
		assertion = "word-boundary"
	case 'Y':
		assertion = "non-word-boundary"
	case 'Z':
		assertion = "end-of-string"
	}
	if assertion != "" {
		return regexAtom{p.assertion(assertion), false}
	}
	if regexIsDigit(character) {
		return p.parseNumericEscape(character)
	}
	value, ok := p.parseCharacterEscape(character)
	if !ok {
		p.fail("invalid-escape", -1)
	}
	return regexAtom{p.codePointExpression(value), true}
}

func (p *regexParser) parseNumericEscape(first rune) regexAtom {
	start := p.Position - 1
	if first != '0' {
		end := p.Position
		for end < len(p.Pattern) && regexIsDigit(p.Pattern[end]) && end-start < 255 {
			end++
		}
		digits := string(p.Pattern[start:end])
		capture, _ := strconv.Atoi(digits)
		if len(digits) == 1 || capture > 0 && capture <= p.Captures {
			p.Position = end
			if p.LookaroundDepth > 0 || !p.ClosedCaptures[capture] {
				p.fail("invalid-backreference", start)
			}
			return regexAtom{&regexNode{Kind: "backreference", Capture: capture}, true}
		}
	}
	p.Position = start
	digits := p.takeDigits(regexIsOctal, 1, 3)
	if digits == "" {
		p.fail("invalid-escape", start)
	}
	value, _ := strconv.ParseInt(digits, 8, 32)
	if value > 255 {
		p.Position--
		value >>= 3
	}
	return regexAtom{p.codePointExpression(int(value)), true}
}

func (p *regexParser) parseCharacterEscape(character rune) (int, bool) {
	simple := map[rune]int{'a': 7, 'b': 8, 'B': 92, 'e': 27, 'f': 12, 'n': 10, 'r': 13, 't': 9, 'v': 11}
	if value, ok := simple[character]; ok {
		return value, true
	}
	if character == 'c' {
		if p.atEnd() {
			p.fail("invalid-escape", -1)
		}
		return int(p.take()) & 31, true
	}
	if character == 'u' || character == 'U' {
		width := 4
		if character == 'U' {
			width = 8
		}
		digits := p.takeDigits(regexIsHex, width, width)
		if len(digits) != width {
			p.fail("invalid-escape", -1)
		}
		value, _ := strconv.ParseInt(digits, 16, 64)
		if value > 0x7ffffffe {
			p.fail("invalid-escape", -1)
		}
		return int(value), true
	}
	if character == 'x' {
		digits := p.takeDigits(regexIsHex, 1, 255)
		if digits == "" {
			p.fail("invalid-escape", -1)
		}
		value, error := strconv.ParseInt(digits, 16, 64)
		if error != nil || value > 0x7ffffffe {
			p.fail("invalid-escape", -1)
		}
		return int(value), true
	}
	return 0, false
}

func (p *regexParser) takeBoundNumber() int {
	start := p.Position
	digits := p.takeDigits(regexIsDigit, 1, 3)
	if regexIsDigit(p.peek(0)) {
		for regexIsDigit(p.peek(0)) {
			p.Position++
		}
		p.fail("invalid-repetition-count", start)
	}
	value, _ := strconv.Atoi(digits)
	if value > 255 {
		p.fail("invalid-repetition-count", start)
	}
	return value
}

func (p *regexParser) parseExtendedQuantifier(expression *regexNode) *regexNode {
	p.skipExpanded()
	start := p.Position
	character := p.peek(0)
	minimum, maximum, preference := 0, 0, "greedy"
	if character == '*' || character == '+' || character == '?' {
		p.Position++
		switch character {
		case '*':
			minimum, maximum = 0, -1
		case '+':
			minimum, maximum = 1, -1
		case '?':
			minimum, maximum = 0, 1
		}
		if p.Syntax == "advanced" && p.peek(0) == '?' {
			p.Position++
			preference = "nongreedy"
		}
	} else if character == '{' {
		afterBrace := p.Position + 1
		p.Position++
		p.skipExpanded()
		if !regexIsDigit(p.peek(0)) {
			p.Position = start
			return expression
		}
		minimum = p.takeBoundNumber()
		p.skipExpanded()
		if p.peek(0) == ',' {
			p.Position++
			p.skipExpanded()
			maximum = -1
			if regexIsDigit(p.peek(0)) {
				maximum = p.takeBoundNumber()
			}
			if maximum >= 0 && minimum > maximum {
				p.fail("invalid-repetition-count", start)
			}
		} else {
			maximum, preference = minimum, "inherited"
		}
		p.skipExpanded()
		if p.take() != '}' {
			p.fail("invalid-repetition-count", afterBrace)
		}
		if p.Syntax == "advanced" && p.peek(0) == '?' {
			p.Position++
			if preference != "inherited" {
				preference = "nongreedy"
			}
		}
	} else {
		return expression
	}
	return &regexNode{Kind: "repeat", Children: []*regexNode{expression}, Minimum: minimum, Maximum: maximum, Preference: preference}
}

func (p *regexParser) basicAtEnd(stopper bool) bool {
	saved := p.Position
	p.skipExpanded()
	result := p.atEnd() || stopper && p.startsWith("\\)")
	p.Position = saved
	return result
}

func (p *regexParser) parseBasic(stopper bool) *regexNode {
	expressions := []*regexNode{}
	atStart := true
	for {
		p.skipExpanded()
		if p.atEnd() {
			if stopper {
				p.fail("unbalanced-parentheses", -1)
			}
			break
		}
		if stopper && p.startsWith("\\)") {
			break
		}
		start := p.Position
		var atom regexAtom
		if p.startsWith("[[:<:]]") {
			p.Position += 7
			atom = regexAtom{p.assertion("beginning-of-word"), false}
		} else if p.startsWith("[[:>:]]") {
			p.Position += 7
			atom = regexAtom{p.assertion("end-of-word"), false}
		} else {
			character := p.take()
			switch {
			case character == '^' && atStart:
				atom = regexAtom{p.lineAssertion(true), false}
			case character == '$' && p.basicAtEnd(stopper):
				atom = regexAtom{p.lineAssertion(false), false}
			case character == '.':
				atom = regexAtom{&regexNode{Kind: "any-character", IncludesNewline: p.Newline == "ordinary" || p.Newline == "anchors"}, true}
			case character == '[':
				p.Position = start
				atom = regexAtom{p.parseCharacterClass(false), true}
			case character == '*':
				if !atStart {
					p.fail("invalid-quantifier-operand", start)
				}
				atom = regexAtom{regexLiteral("*"), true}
			case character == '\\':
				atom = p.parseBasicEscape(stopper)
			default:
				atom = regexAtom{regexLiteral(string(character)), true}
			}
		}
		if atom.Quantifiable {
			expressions = append(expressions, p.parseBasicQuantifier(atom.Expression))
		} else {
			expressions = append(expressions, atom.Expression)
		}
		if atom.Expression.Kind != "assertion" || atom.Expression.Assertion != "beginning-of-string" && atom.Expression.Assertion != "beginning-of-line" {
			atStart = false
		}
	}
	return regexConcatenate(expressions)
}

func (p *regexParser) parseBasicEscape(stopper bool) regexAtom {
	if p.atEnd() {
		p.fail("invalid-escape", -1)
	}
	character := p.take()
	if character == '(' {
		p.Captures++
		capture := p.Captures
		expression := p.parseBasic(true)
		if !p.startsWith("\\)") {
			p.fail("unbalanced-parentheses", -1)
		}
		p.Position += 2
		p.ClosedCaptures[capture] = true
		return regexAtom{&regexNode{Kind: "group", Capturing: true, Capture: capture, Children: []*regexNode{expression}}, true}
	}
	if character == ')' {
		if stopper {
			p.fail("invalid-pattern", -1)
		}
		p.fail("unbalanced-parentheses", -1)
	}
	if character == '<' {
		return regexAtom{p.assertion("beginning-of-word"), false}
	}
	if character == '>' {
		return regexAtom{p.assertion("end-of-word"), false}
	}
	if character >= '1' && character <= '9' {
		capture := int(character - '0')
		if p.LookaroundDepth > 0 || !p.ClosedCaptures[capture] {
			p.fail("invalid-backreference", -1)
		}
		return regexAtom{&regexNode{Kind: "backreference", Capture: capture}, true}
	}
	if character == '{' {
		p.fail("invalid-quantifier-operand", -1)
	}
	return regexAtom{regexLiteral(string(character)), true}
}

func (p *regexParser) parseBasicQuantifier(expression *regexNode) *regexNode {
	p.skipExpanded()
	if p.peek(0) == '*' {
		p.Position++
		return &regexNode{Kind: "repeat", Children: []*regexNode{expression}, Minimum: 0, Maximum: -1, Preference: "greedy"}
	}
	if !p.startsWith("\\{") {
		return expression
	}
	start := p.Position
	p.Position += 2
	p.skipExpanded()
	if !regexIsDigit(p.peek(0)) {
		p.fail("invalid-repetition-count", start)
	}
	minimum := p.takeBoundNumber()
	p.skipExpanded()
	maximum := minimum
	if p.peek(0) == ',' {
		p.Position++
		p.skipExpanded()
		maximum = -1
		if regexIsDigit(p.peek(0)) {
			maximum = p.takeBoundNumber()
		}
		if maximum >= 0 && minimum > maximum {
			p.fail("invalid-repetition-count", start)
		}
	}
	p.skipExpanded()
	if !p.startsWith("\\}") {
		p.fail("invalid-repetition-count", start)
	}
	p.Position += 2
	preference := "greedy"
	if minimum == maximum {
		preference = "inherited"
	}
	return &regexNode{Kind: "repeat", Children: []*regexNode{expression}, Minimum: minimum, Maximum: maximum, Preference: preference}
}

func regexNormalizeRanges(ranges []regexRange) []regexRange {
	sort.Slice(ranges, func(i, j int) bool {
		if ranges[i].From != ranges[j].From {
			return ranges[i].From < ranges[j].From
		}
		return ranges[i].To < ranges[j].To
	})
	output := []regexRange{}
	for _, current := range ranges {
		if len(output) > 0 && current.From <= output[len(output)-1].To+1 {
			if current.To > output[len(output)-1].To {
				output[len(output)-1].To = current.To
			}
		} else {
			output = append(output, current)
		}
	}
	return output
}

func regexComplementRanges(ranges []regexRange) []regexRange {
	output := []regexRange{}
	next := 0
	for _, current := range regexNormalizeRanges(ranges) {
		if next < current.From {
			output = append(output, regexRange{next, current.From - 1})
		}
		if current.To+1 > next {
			next = current.To + 1
		}
	}
	if next <= 0x10ffff {
		output = append(output, regexRange{next, 0x10ffff})
	}
	return output
}

func regexPosixClass(name string) []regexRange {
	switch name {
	case "alnum":
		return []regexRange{{48, 57}, {65, 90}, {97, 122}}
	case "alpha":
		return []regexRange{{65, 90}, {97, 122}}
	case "ascii":
		return []regexRange{{0, 127}}
	case "blank":
		return []regexRange{{9, 9}, {32, 32}}
	case "cntrl":
		return []regexRange{{0, 31}, {127, 127}}
	case "digit":
		return []regexRange{{48, 57}}
	case "graph":
		return []regexRange{{33, 126}}
	case "lower":
		return []regexRange{{97, 122}}
	case "print":
		return []regexRange{{32, 126}}
	case "punct":
		return []regexRange{{33, 47}, {58, 64}, {91, 96}, {123, 126}}
	case "space":
		return []regexRange{{9, 13}, {32, 32}}
	case "upper":
		return []regexRange{{65, 90}}
	case "xdigit":
		return []regexRange{{48, 57}, {65, 70}, {97, 102}}
	case "word":
		return []regexRange{{48, 57}, {65, 90}, {95, 95}, {97, 122}}
	}
	return nil
}

func regexCollatingElement(name string) (int, bool) {
	if len([]rune(name)) == 1 {
		return int([]rune(name)[0]), true
	}
	controls := []string{"NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "HT", "LF", "VT", "FF", "CR", "SO", "SI", "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US"}
	for index, value := range controls {
		if name == value {
			return index, true
		}
	}
	names := map[string]int{
		"alert": 7, "backspace": 8, "tab": 9, "newline": 10, "vertical-tab": 11, "form-feed": 12, "carriage-return": 13,
		"IS4": 28, "IS3": 29, "IS2": 30, "IS1": 31, "space": 32, "exclamation-mark": 33, "quotation-mark": 34,
		"number-sign": 35, "dollar-sign": 36, "percent-sign": 37, "ampersand": 38, "apostrophe": 39,
		"left-parenthesis": 40, "right-parenthesis": 41, "asterisk": 42, "plus-sign": 43, "comma": 44,
		"hyphen": 45, "hyphen-minus": 45, "period": 46, "full-stop": 46, "slash": 47, "solidus": 47,
		"zero": 48, "one": 49, "two": 50, "three": 51, "four": 52, "five": 53, "six": 54, "seven": 55,
		"eight": 56, "nine": 57, "colon": 58, "semicolon": 59, "less-than-sign": 60, "equals-sign": 61,
		"greater-than-sign": 62, "question-mark": 63, "commercial-at": 64, "left-square-bracket": 91,
		"backslash": 92, "reverse-solidus": 92, "right-square-bracket": 93, "circumflex": 94,
		"circumflex-accent": 94, "underscore": 95, "low-line": 95, "grave-accent": 96, "left-brace": 123,
		"left-curly-bracket": 123, "vertical-line": 124, "right-brace": 125, "right-curly-bracket": 125,
		"tilde": 126, "DEL": 127,
	}
	value, ok := names[name]
	return value, ok
}

func (p *regexParser) characterClass(ranges []regexRange, negated, excludesNewline bool) *regexNode {
	return &regexNode{Kind: "character-class", Ranges: regexNormalizeRanges(ranges), Negated: negated, ExcludesNewline: excludesNewline}
}

func (p *regexParser) parseCharacterClass(advancedEscapes bool) *regexNode {
	start := p.Position
	p.Position++
	negated := p.peek(0) == '^'
	if negated {
		p.Position++
	}
	ranges := []regexRange{}
	first, closed := true, false
	for !p.atEnd() {
		if p.peek(0) == ']' && !first {
			p.Position++
			closed = true
			break
		}
		if p.peek(0) == '-' && !first && p.peek(1) != ']' {
			p.fail("invalid-character-range", -1)
		}
		item := p.parseClassItem(advancedEscapes, first, false)
		first = false
		if item.RangeEndpoint && len(item.Ranges) == 1 && item.Ranges[0].From == item.Ranges[0].To && p.peek(0) == '-' && p.peek(1) != ']' {
			p.Position++
			endpoint := p.parseClassItem(advancedEscapes, false, true)
			if !endpoint.RangeEndpoint || len(endpoint.Ranges) != 1 || endpoint.Ranges[0].From != endpoint.Ranges[0].To || item.Ranges[0].From > endpoint.Ranges[0].From {
				p.fail("invalid-character-range", -1)
			}
			ranges = append(ranges, regexRange{item.Ranges[0].From, endpoint.Ranges[0].From})
		} else {
			ranges = append(ranges, item.Ranges...)
		}
	}
	if !closed {
		p.fail("unbalanced-brackets", start)
	}
	return p.characterClass(ranges, negated, negated && (p.Newline == "sensitive" || p.Newline == "stop"))
}

func (p *regexParser) parseClassItem(advancedEscapes, first, rangeEndpoint bool) regexClassItem {
	if p.atEnd() {
		p.fail("unbalanced-brackets", -1)
	}
	if p.peek(0) == ']' && first {
		p.Position++
		return regexClassItem{[]regexRange{{93, 93}}, true}
	}
	if p.peek(0) == '-' && (first || rangeEndpoint || p.peek(1) == ']') {
		p.Position++
		return regexClassItem{[]regexRange{{45, 45}}, true}
	}
	if p.peek(0) == '[' && (p.peek(1) == '.' || p.peek(1) == '=' || p.peek(1) == ':') {
		kind := p.peek(1)
		contentStart := p.Position + 2
		contentEnd := contentStart
		for contentEnd+1 < len(p.Pattern) && !(p.Pattern[contentEnd] == kind && p.Pattern[contentEnd+1] == ']') {
			contentEnd++
		}
		if contentEnd+1 >= len(p.Pattern) {
			p.fail("unbalanced-brackets", -1)
		}
		name := string(p.Pattern[contentStart:contentEnd])
		p.Position = contentEnd + 2
		if kind == ':' {
			ranges := regexPosixClass(name)
			if ranges == nil {
				p.fail("invalid-character-class", contentStart)
			}
			return regexClassItem{ranges, false}
		}
		if name == "" {
			p.fail("invalid-collating-element", contentStart)
		}
		value, ok := regexCollatingElement(name)
		if !ok {
			p.fail("invalid-collating-element", contentStart)
		}
		return regexClassItem{[]regexRange{{value, value}}, kind == '.'}
	}
	if p.peek(0) == '\\' && advancedEscapes {
		escapeStart := p.Position
		p.Position++
		if p.atEnd() {
			p.fail("invalid-escape", escapeStart)
		}
		character := p.take()
		className := ""
		switch character {
		case 'd', 'D':
			className = "digit"
		case 's', 'S':
			className = "space"
		case 'w', 'W':
			className = "word"
		}
		if className != "" {
			ranges := regexPosixClass(className)
			if character == 'D' || character == 'S' || character == 'W' {
				ranges = regexComplementRanges(ranges)
			}
			return regexClassItem{ranges, false}
		}
		if regexIsDigit(character) {
			digitStart := escapeStart + 1
			if character != '0' {
				end := p.Position
				for end < len(p.Pattern) && regexIsDigit(p.Pattern[end]) && end-digitStart < 255 {
					end++
				}
				digits := string(p.Pattern[digitStart:end])
				capture, _ := strconv.Atoi(digits)
				if len(digits) == 1 || capture > 0 && capture <= p.Captures {
					p.fail("invalid-escape", escapeStart)
				}
			}
			p.Position = digitStart
			digits := p.takeDigits(regexIsOctal, 1, 3)
			if digits == "" {
				p.fail("invalid-escape", escapeStart)
			}
			value, _ := strconv.ParseInt(digits, 8, 32)
			if value > 255 {
				p.Position--
				value >>= 3
			}
			if value > 0x10ffff {
				return regexClassItem{[]regexRange{}, true}
			}
			return regexClassItem{[]regexRange{{int(value), int(value)}}, true}
		}
		value := int(character)
		if regexIsAlnum(character) {
			var ok bool
			value, ok = p.parseCharacterEscape(character)
			if !ok {
				p.fail("invalid-escape", escapeStart)
			}
		}
		if value > 0x10ffff {
			return regexClassItem{[]regexRange{}, true}
		}
		return regexClassItem{[]regexRange{{value, value}}, true}
	}
	value := int(p.take())
	return regexClassItem{[]regexRange{{value, value}}, true}
}

func regexFeatures(root *regexNode, caseSensitive bool) []string {
	found := map[string]bool{"unicode-code-points": true, "substring-search": true}
	if caseSensitive {
		found["case-sensitive"] = true
	} else {
		found["case-insensitive"] = true
	}
	var visit func(*regexNode)
	visit = func(node *regexNode) {
		switch node.Kind {
		case "empty":
			found["empty-expression"] = true
		case "impossible":
			found["impossible-expression"] = true
		case "literal":
			found["literal"] = true
		case "concatenation", "alternation":
			found[node.Kind] = true
			for _, child := range node.Children {
				visit(child)
			}
		case "any-character":
			if node.IncludesNewline {
				found["any-character-including-newline"] = true
			} else {
				found["any-character-excluding-newline"] = true
			}
		case "character-class":
			if !node.Negated {
				found["bracket-class"] = true
			} else if node.ExcludesNewline {
				found["negated-bracket-class-excluding-newline"] = true
			} else {
				found["negated-bracket-class-including-newline"] = true
			}
			for _, current := range node.Ranges {
				if current.From != current.To {
					found["character-range"] = true
					break
				}
			}
		case "group":
			if node.Capturing {
				found["capturing-group"] = true
			} else {
				found["noncapturing-group"] = true
			}
			visit(node.Children[0])
		case "repeat":
			quantifier := "bounded-quantifier"
			if node.Minimum == 0 && node.Maximum == -1 {
				quantifier = "zero-or-more-quantifier"
			} else if node.Minimum == 1 && node.Maximum == -1 {
				quantifier = "one-or-more-quantifier"
			} else if node.Minimum == 0 && node.Maximum == 1 {
				quantifier = "zero-or-one-quantifier"
			} else if node.Minimum == node.Maximum {
				quantifier = "exact-quantifier"
			} else if node.Maximum == -1 {
				quantifier = "at-least-quantifier"
			}
			found[quantifier] = true
			if node.Preference == "greedy" {
				found["greedy-preference"] = true
			}
			if node.Preference == "nongreedy" {
				found["nongreedy-preference"] = true
			}
			visit(node.Children[0])
		case "assertion":
			found[node.Assertion] = true
		case "lookaround":
			name := "negative-look" + node.Direction
			if node.Positive {
				name = "positive-look" + node.Direction
			}
			found[name] = true
			visit(node.Children[0])
		case "backreference":
			found["backreference"] = true
		}
	}
	visit(root)
	features := []string{}
	for _, feature := range regexFeatureOrder() {
		if found[feature] {
			features = append(features, feature)
		}
	}
	return features
}

func regexLower(node *regexNode) string {
	feature := node.Kind
	if node.Kind == "empty" {
		feature = "empty-expression"
	}
	if node.Kind == "assertion" {
		feature = node.Assertion
	}
	if node.Kind == "group" {
		if node.Capturing {
			feature = "capturing-group"
		} else {
			feature = "noncapturing-group"
		}
	}
	strategy := regexProfileFeature(feature)
	if strategy == "unsupported" {
		panic("unsupported regex lowering")
	}
	var source string
	for _, operation := range regexProfileRecipe(strategy) {
		switch operation.Kind {
		case "emit-empty":
			source = ""
		case "escape-literal":
			var escaped strings.Builder
			for _, character := range node.Value {
				if strings.ContainsRune(operation.Characters, character) {
					escaped.WriteRune('\\')
				}
				escaped.WriteRune(character)
			}
			source = escaped.String()
		case "join-concatenation":
			var joined strings.Builder
			for _, child := range node.Children {
				joined.WriteString(regexLower(child))
			}
			source = joined.String()
		case "wrap-group":
			source = operation.Prefix + regexLower(node.Children[0]) + operation.Suffix
		case "emit-source":
			source = operation.Source
		default:
			panic("invalid regex expression recipe")
		}
	}
	return source
}

func regexUTF16Position(chars []rune, position int) int {
	count := 0
	for _, character := range chars[:position] {
		if character > 0xffff {
			count += 2
		} else {
			count++
		}
	}
	return count
}

func evalBoolRegexAnalyze(pattern, syntax string, caseSensitive, expanded bool, newline string) (decision regexDecision) {
	if syntax == "" {
		syntax = "advanced"
	}
	if newline == "" {
		newline = "ordinary"
	}
	p := &regexParser{Pattern: []rune(pattern), ClosedCaptures: map[int]bool{}, Syntax: syntax, Newline: newline, CaseSensitive: caseSensitive, Expanded: expanded}
	defer func() {
		if recovered := recover(); recovered != nil {
			if failure, ok := recovered.(regexParseFailure); ok {
				decision = regexDecision{Kind: "invalid", Error: failure.Error, Position: regexUTF16Position(p.Pattern, failure.Position)}
			} else {
				panic(recovered)
			}
		}
	}()
	root := p.parse()
	features := regexFeatures(root, p.CaseSensitive)
	unsupported := []string{}
	for _, feature := range features {
		if regexProfileFeature(feature) == "unsupported" {
			unsupported = append(unsupported, feature)
		}
	}
	if len(unsupported) > 0 {
		return regexDecision{Kind: "unsupported", Features: unsupported}
	}
	flags := []string{}
	for _, feature := range features {
		if feature != "case-sensitive" && feature != "case-insensitive" && feature != "unicode-code-points" && feature != "substring-search" {
			continue
		}
		for _, operation := range regexProfileRecipe(regexProfileFeature(feature)) {
			switch operation.Kind {
			case "add-flag":
				found := false
				for _, flag := range flags {
					if flag == operation.Flag {
						found = true
					}
				}
				if !found {
					flags = append(flags, operation.Flag)
				}
			case "no-op":
			default:
				panic("invalid regex-wide recipe")
			}
		}
	}
	return regexDecision{Kind: "supported", Source: regexLower(root), Flags: flags}
}
