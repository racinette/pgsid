package pgsidsql

import (
	"bytes"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

type SqlJsonPair struct {
	Key   string
	Value SqlJsonNode
}

type SqlJsonNode struct {
	Kind     string
	Raw      string
	Bool     bool
	Number   SqlDecimal
	String   string
	Elements []SqlJsonNode
	Pairs    []SqlJsonPair
}

type SqlJson struct {
	Text  string
	Node  SqlJsonNode
	Valid bool
	Error string
}

type SqlJsonb struct {
	Node  SqlJsonNode
	Valid bool
	Error string
}

type jsonParser struct {
	input    string
	index    int
	forJsonb bool
	err      string
}

func jsonFail(code string) SqlJson {
	return SqlJson{Error: code}
}

func jsonbFail(code string) SqlJsonb {
	return SqlJsonb{Error: code}
}

func jsonParserSkip(parser *jsonParser) {
	for parser.index < len(parser.input) {
		switch parser.input[parser.index] {
		case ' ', '\t', '\n', '\r':
			parser.index++
		default:
			return
		}
	}
}

func jsonParserFail(parser *jsonParser, code string) {
	if parser.err == "" {
		parser.err = code
	}
}

func jsonParserIdentEnd(parser *jsonParser, offset int) bool {
	if parser.index+offset >= len(parser.input) {
		return true
	}
	char := parser.input[parser.index+offset]
	return (char < '0' || char > '9') && (char < 'A' || char > 'Z') && (char < 'a' || char > 'z') && char != '_'
}

func jsonHex(value byte) (int, bool) {
	switch {
	case value >= '0' && value <= '9':
		return int(value - '0'), true
	case value >= 'a' && value <= 'f':
		return int(value - 'a' + 10), true
	case value >= 'A' && value <= 'F':
		return int(value - 'A' + 10), true
	default:
		return 0, false
	}
}

func jsonParseString(parser *jsonParser) (string, bool) {
	if parser.index >= len(parser.input) || parser.input[parser.index] != '"' {
		jsonParserFail(parser, "22P02")
		return "", false
	}
	parser.index++
	var builder strings.Builder
	for parser.index < len(parser.input) {
		char := parser.input[parser.index]
		if char == '"' {
			parser.index++
			value := builder.String()
			if parser.forJsonb {
				if strings.ContainsRune(value, 0) {
					jsonParserFail(parser, "22P05")
					return "", false
				}
				if !utf8.ValidString(value) {
					jsonParserFail(parser, "22P02")
					return "", false
				}
			}
			return value, true
		}
		if char == '\\' {
			parser.index++
			if parser.index >= len(parser.input) {
				jsonParserFail(parser, "22P02")
				return "", false
			}
			escape := parser.input[parser.index]
			parser.index++
			switch escape {
			case '"', '\\', '/':
				builder.WriteByte(escape)
			case 'b':
				builder.WriteByte('\b')
			case 'f':
				builder.WriteByte('\f')
			case 'n':
				builder.WriteByte('\n')
			case 'r':
				builder.WriteByte('\r')
			case 't':
				builder.WriteByte('\t')
			case 'u':
				if parser.index+3 >= len(parser.input) {
					jsonParserFail(parser, "22P02")
					return "", false
				}
				code := 0
				for offset := 0; offset < 4; offset++ {
					digit, ok := jsonHex(parser.input[parser.index+offset])
					if !ok {
						jsonParserFail(parser, "22P02")
						return "", false
					}
					code = code<<4 | digit
				}
				parser.index += 4
				if code >= 0xd800 && code <= 0xdbff && parser.index+5 < len(parser.input) && parser.input[parser.index] == '\\' && parser.input[parser.index+1] == 'u' {
					low := 0
					ok := true
					for offset := 0; offset < 4; offset++ {
						digit, hexOk := jsonHex(parser.input[parser.index+2+offset])
						if !hexOk {
							ok = false
							break
						}
						low = low<<4 | digit
					}
					if ok && low >= 0xdc00 && low <= 0xdfff {
						parser.index += 6
						builder.WriteRune(rune(((code - 0xd800) << 10) + (low - 0xdc00) + 0x10000))
						continue
					}
				}
				if parser.forJsonb && code >= 0xd800 && code <= 0xdfff {
					jsonParserFail(parser, "22P02")
					return "", false
				}
				builder.WriteRune(rune(code))
			default:
				jsonParserFail(parser, "22P02")
				return "", false
			}
			continue
		}
		if char < 32 {
			jsonParserFail(parser, "22P02")
			return "", false
		}
		parser.index++
		builder.WriteByte(char)
	}
	jsonParserFail(parser, "22P02")
	return "", false
}

func jsonParseNumber(parser *jsonParser) string {
	start := parser.index
	if parser.index < len(parser.input) && parser.input[parser.index] == '-' {
		parser.index++
	}
	if parser.index >= len(parser.input) {
		jsonParserFail(parser, "22P02")
		return ""
	}
	if parser.input[parser.index] == '0' {
		parser.index++
	} else if parser.input[parser.index] >= '1' && parser.input[parser.index] <= '9' {
		parser.index++
		for parser.index < len(parser.input) && parser.input[parser.index] >= '0' && parser.input[parser.index] <= '9' {
			parser.index++
		}
	} else {
		jsonParserFail(parser, "22P02")
		return ""
	}
	if parser.index < len(parser.input) && parser.input[parser.index] == '.' {
		parser.index++
		if parser.index >= len(parser.input) || parser.input[parser.index] < '0' || parser.input[parser.index] > '9' {
			jsonParserFail(parser, "22P02")
			return ""
		}
		for parser.index < len(parser.input) && parser.input[parser.index] >= '0' && parser.input[parser.index] <= '9' {
			parser.index++
		}
	}
	if parser.index < len(parser.input) && (parser.input[parser.index] == 'e' || parser.input[parser.index] == 'E') {
		parser.index++
		if parser.index < len(parser.input) && (parser.input[parser.index] == '+' || parser.input[parser.index] == '-') {
			parser.index++
		}
		if parser.index >= len(parser.input) || parser.input[parser.index] < '0' || parser.input[parser.index] > '9' {
			jsonParserFail(parser, "22P02")
			return ""
		}
		for parser.index < len(parser.input) && parser.input[parser.index] >= '0' && parser.input[parser.index] <= '9' {
			parser.index++
		}
	}
	return parser.input[start:parser.index]
}

func jsonParseValue(parser *jsonParser) SqlJsonNode {
	jsonParserSkip(parser)
	start := parser.index
	if strings.HasPrefix(parser.input[parser.index:], "null") && jsonParserIdentEnd(parser, 4) {
		parser.index += 4
		return SqlJsonNode{Kind: "null", Raw: parser.input[start:parser.index]}
	}
	if strings.HasPrefix(parser.input[parser.index:], "true") && jsonParserIdentEnd(parser, 4) {
		parser.index += 4
		return SqlJsonNode{Kind: "bool", Raw: parser.input[start:parser.index], Bool: true}
	}
	if strings.HasPrefix(parser.input[parser.index:], "false") && jsonParserIdentEnd(parser, 5) {
		parser.index += 5
		return SqlJsonNode{Kind: "bool", Raw: parser.input[start:parser.index], Bool: false}
	}
	if parser.index < len(parser.input) && parser.input[parser.index] == '"' {
		value, ok := jsonParseString(parser)
		if !ok {
			return SqlJsonNode{}
		}
		return SqlJsonNode{Kind: "string", Raw: parser.input[start:parser.index], String: value}
	}
	if parser.index < len(parser.input) && (parser.input[parser.index] == '-' || parser.input[parser.index] >= '0' && parser.input[parser.index] <= '9') {
		raw := jsonParseNumber(parser)
		if parser.err != "" {
			return SqlJsonNode{}
		}
		number := decimalInput(raw)
		if number.Error != "" {
			jsonParserFail(parser, number.Error)
			return SqlJsonNode{}
		}
		if number.Value.IsZero() && strings.HasPrefix(raw, "-") {
			number = decimalInput(strings.TrimPrefix(raw, "-"))
		}
		return SqlJsonNode{Kind: "number", Raw: raw, Number: number}
	}
	if parser.index < len(parser.input) && parser.input[parser.index] == '[' {
		parser.index++
		jsonParserSkip(parser)
		elements := []SqlJsonNode{}
		if parser.index >= len(parser.input) || parser.input[parser.index] != ']' {
			for {
				elements = append(elements, jsonParseValue(parser))
				if parser.err != "" {
					return SqlJsonNode{}
				}
				jsonParserSkip(parser)
				if parser.index < len(parser.input) && parser.input[parser.index] == ',' {
					parser.index++
					continue
				}
				break
			}
		}
		if parser.index >= len(parser.input) || parser.input[parser.index] != ']' {
			jsonParserFail(parser, "22P02")
			return SqlJsonNode{}
		}
		parser.index++
		return SqlJsonNode{Kind: "array", Raw: parser.input[start:parser.index], Elements: elements}
	}
	if parser.index < len(parser.input) && parser.input[parser.index] == '{' {
		parser.index++
		jsonParserSkip(parser)
		pairs := []SqlJsonPair{}
		if parser.index >= len(parser.input) || parser.input[parser.index] != '}' {
			for {
				jsonParserSkip(parser)
				key, ok := jsonParseString(parser)
				if !ok {
					return SqlJsonNode{}
				}
				jsonParserSkip(parser)
				if parser.index >= len(parser.input) || parser.input[parser.index] != ':' {
					jsonParserFail(parser, "22P02")
					return SqlJsonNode{}
				}
				parser.index++
				pairs = append(pairs, SqlJsonPair{Key: key, Value: jsonParseValue(parser)})
				if parser.err != "" {
					return SqlJsonNode{}
				}
				jsonParserSkip(parser)
				if parser.index < len(parser.input) && parser.input[parser.index] == ',' {
					parser.index++
					continue
				}
				break
			}
		}
		if parser.index >= len(parser.input) || parser.input[parser.index] != '}' {
			jsonParserFail(parser, "22P02")
			return SqlJsonNode{}
		}
		parser.index++
		return SqlJsonNode{Kind: "object", Raw: parser.input[start:parser.index], Pairs: pairs}
	}
	jsonParserFail(parser, "22P02")
	return SqlJsonNode{}
}

func jsonParse(input string, forJsonb bool) (SqlJsonNode, string) {
	parser := jsonParser{input: input, forJsonb: forJsonb}
	node := jsonParseValue(&parser)
	if parser.err != "" {
		return SqlJsonNode{}, parser.err
	}
	jsonParserSkip(&parser)
	if parser.index != len(parser.input) {
		return SqlJsonNode{}, "22P02"
	}
	return node, ""
}

func jsonbKeyCompare(left, right string) int {
	if len(left) != len(right) {
		if len(left) > len(right) {
			return 1
		}
		return -1
	}
	return jsonStringCompare(left, right)
}

func jsonStringCompare(left, right string) int {
	limit := len(left)
	if len(right) < limit {
		limit = len(right)
	}
	for index := 0; index < limit; index++ {
		if left[index] != right[index] {
			return int(left[index]) - int(right[index])
		}
	}
	if len(left) == len(right) {
		return 0
	}
	if len(left) < len(right) {
		return -1
	}
	return 1
}

func jsonbCanonicalize(node SqlJsonNode) SqlJsonNode {
	if node.Kind == "array" {
		elements := make([]SqlJsonNode, len(node.Elements))
		for index, element := range node.Elements {
			elements[index] = jsonbCanonicalize(element)
		}
		return SqlJsonNode{Kind: "array", Elements: elements}
	}
	if node.Kind == "object" {
		last := map[string]SqlJsonNode{}
		order := []string{}
		for _, pair := range node.Pairs {
			if _, exists := last[pair.Key]; !exists {
				order = append(order, pair.Key)
			}
			last[pair.Key] = jsonbCanonicalize(pair.Value)
		}
		sort.SliceStable(order, func(i, j int) bool { return jsonbKeyCompare(order[i], order[j]) < 0 })
		pairs := make([]SqlJsonPair, len(order))
		for index, key := range order {
			pairs[index] = SqlJsonPair{Key: key, Value: last[key]}
		}
		return SqlJsonNode{Kind: "object", Pairs: pairs}
	}
	return node
}

func jsonbEscape(value string) string {
	var builder strings.Builder
	builder.WriteByte('"')
	for _, char := range value {
		switch char {
		case '"':
			builder.WriteString(`\"`)
		case '\\':
			builder.WriteString(`\\`)
		case '\b':
			builder.WriteString(`\b`)
		case '\f':
			builder.WriteString(`\f`)
		case '\n':
			builder.WriteString(`\n`)
		case '\r':
			builder.WriteString(`\r`)
		case '\t':
			builder.WriteString(`\t`)
		default:
			if char < 32 {
				hex := strconv.FormatInt(int64(char), 16)
				builder.WriteString(`\u`)
				builder.WriteString(strings.Repeat("0", 4-len(hex)))
				builder.WriteString(hex)
			} else {
				builder.WriteRune(char)
			}
		}
	}
	builder.WriteByte('"')
	return builder.String()
}

func jsonbFormat(node SqlJsonNode) string {
	switch node.Kind {
	case "null":
		return "null"
	case "bool":
		if node.Bool {
			return "true"
		}
		return "false"
	case "number":
		return sqlDecimalText(node.Number)
	case "string":
		return jsonbEscape(node.String)
	case "array":
		parts := make([]string, len(node.Elements))
		for index, element := range node.Elements {
			parts[index] = jsonbFormat(element)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	default:
		parts := make([]string, len(node.Pairs))
		for index, pair := range node.Pairs {
			parts[index] = jsonbEscape(pair.Key) + ": " + jsonbFormat(pair.Value)
		}
		return "{" + strings.Join(parts, ", ") + "}"
	}
}

func jsonInput(value string) SqlJson {
	node, err := jsonParse(value, false)
	if err != "" {
		return jsonFail(err)
	}
	return SqlJson{Text: value, Node: node, Valid: true}
}

func jsonbInput(value string) SqlJsonb {
	node, err := jsonParse(value, true)
	if err != "" {
		return jsonbFail(err)
	}
	return SqlJsonb{Node: jsonbCanonicalize(node), Valid: true}
}

func jsonFromText(value SqlText) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if !value.Valid {
		return SqlJson{}
	}
	return jsonInput(value.Value)
}

func jsonbFromText(value SqlText) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if !value.Valid {
		return SqlJsonb{}
	}
	return jsonbInput(value.Value)
}

func jsonText(value SqlJson) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: value.Text, Valid: true}
}

func jsonbText(value SqlJsonb) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: jsonbFormat(value.Node), Valid: true}
}

func jsonToJsonb(value SqlJson) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if !value.Valid {
		return SqlJsonb{}
	}
	return jsonbInput(value.Text)
}

func jsonbToJson(value SqlJsonb) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if !value.Valid {
		return SqlJson{}
	}
	text := jsonbFormat(value.Node)
	return SqlJson{Text: text, Node: value.Node, Valid: true}
}

func jsonTypeName(kind string) string {
	if kind == "bool" {
		return "boolean"
	}
	return kind
}

func jsonTypeof(value SqlJson) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: jsonTypeName(value.Node.Kind), Valid: true}
}

func jsonbTypeof(value SqlJsonb) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: jsonTypeName(value.Node.Kind), Valid: true}
}

func jsonArrayLength(value SqlJson) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	if value.Node.Kind != "array" {
		return SqlInteger{Error: "22023"}
	}
	return SqlInteger{Value: int64(len(value.Node.Elements)), Valid: true}
}

func jsonbArrayLength(value SqlJsonb) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	if value.Node.Kind != "array" {
		return SqlInteger{Error: "22023"}
	}
	return SqlInteger{Value: int64(len(value.Node.Elements)), Valid: true}
}

func jsonField(node SqlJsonNode, key string) (SqlJsonNode, bool) {
	if node.Kind != "object" {
		return SqlJsonNode{}, false
	}
	for index := len(node.Pairs) - 1; index >= 0; index-- {
		if node.Pairs[index].Key == key {
			return node.Pairs[index].Value, true
		}
	}
	return SqlJsonNode{}, false
}

func jsonIndex(node SqlJsonNode, index int64, rawScalar bool) (SqlJsonNode, bool) {
	var elements []SqlJsonNode
	if node.Kind == "array" {
		elements = node.Elements
	} else if rawScalar && node.Kind != "object" {
		elements = []SqlJsonNode{node}
	} else {
		return SqlJsonNode{}, false
	}
	if index < 0 {
		index += int64(len(elements))
	}
	if index < 0 || index >= int64(len(elements)) {
		return SqlJsonNode{}, false
	}
	return elements[index], true
}

func jsonAsText(node SqlJsonNode, jsonb bool) (string, bool) {
	if node.Kind == "null" {
		return "", false
	}
	if node.Kind == "string" {
		return node.String, true
	}
	if node.Kind == "bool" {
		if node.Bool {
			return "true", true
		}
		return "false", true
	}
	if node.Kind == "number" {
		if jsonb {
			return sqlDecimalText(node.Number), true
		}
		return node.Raw, true
	}
	if jsonb {
		return jsonbFormat(node), true
	}
	return node.Raw, true
}

func jsonObjectField(value SqlJson, key SqlText) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if key.Error != "" {
		return jsonFail(key.Error)
	}
	if !value.Valid || !key.Valid {
		return SqlJson{}
	}
	node, ok := jsonField(value.Node, key.Value)
	if !ok {
		return SqlJson{}
	}
	return SqlJson{Text: node.Raw, Node: node, Valid: true}
}

func jsonObjectFieldText(value SqlJson, key SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if key.Error != "" {
		return SqlText{Error: key.Error}
	}
	if !value.Valid || !key.Valid {
		return SqlText{}
	}
	node, ok := jsonField(value.Node, key.Value)
	if !ok {
		return SqlText{}
	}
	text, present := jsonAsText(node, false)
	if !present {
		return SqlText{}
	}
	return SqlText{Value: text, Valid: true}
}

func jsonbObjectField(value SqlJsonb, key SqlText) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if key.Error != "" {
		return jsonbFail(key.Error)
	}
	if !value.Valid || !key.Valid {
		return SqlJsonb{}
	}
	node, ok := jsonField(value.Node, key.Value)
	if !ok {
		return SqlJsonb{}
	}
	return SqlJsonb{Node: node, Valid: true}
}

func jsonbObjectFieldText(value SqlJsonb, key SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if key.Error != "" {
		return SqlText{Error: key.Error}
	}
	if !value.Valid || !key.Valid {
		return SqlText{}
	}
	node, ok := jsonField(value.Node, key.Value)
	if !ok {
		return SqlText{}
	}
	text, present := jsonAsText(node, true)
	if !present {
		return SqlText{}
	}
	return SqlText{Value: text, Valid: true}
}

func jsonArrayElement(value SqlJson, index SqlInteger) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if index.Error != "" {
		return jsonFail(index.Error)
	}
	if !value.Valid || !index.Valid {
		return SqlJson{}
	}
	node, ok := jsonIndex(value.Node, index.Value, false)
	if !ok {
		return SqlJson{}
	}
	return SqlJson{Text: node.Raw, Node: node, Valid: true}
}

func jsonArrayElementText(value SqlJson, index SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if index.Error != "" {
		return SqlText{Error: index.Error}
	}
	if !value.Valid || !index.Valid {
		return SqlText{}
	}
	node, ok := jsonIndex(value.Node, index.Value, false)
	if !ok {
		return SqlText{}
	}
	text, present := jsonAsText(node, false)
	if !present {
		return SqlText{}
	}
	return SqlText{Value: text, Valid: true}
}

func jsonbArrayElement(value SqlJsonb, index SqlInteger) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if index.Error != "" {
		return jsonbFail(index.Error)
	}
	if !value.Valid || !index.Valid {
		return SqlJsonb{}
	}
	node, ok := jsonIndex(value.Node, index.Value, true)
	if !ok {
		return SqlJsonb{}
	}
	return SqlJsonb{Node: node, Valid: true}
}

func jsonbArrayElementText(value SqlJsonb, index SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if index.Error != "" {
		return SqlText{Error: index.Error}
	}
	if !value.Valid || !index.Valid {
		return SqlText{}
	}
	node, ok := jsonIndex(value.Node, index.Value, true)
	if !ok {
		return SqlText{}
	}
	text, present := jsonAsText(node, true)
	if !present {
		return SqlText{}
	}
	return SqlText{Value: text, Valid: true}
}

func jsonPathIndex(value string) (int64, bool) {
	trimmed := strings.TrimLeft(value, " \t\n\r\v\f")
	number, err := strconv.ParseInt(trimmed, 10, 32)
	if err != nil || number < -2147483647 || number > 2147483647 {
		return 0, false
	}
	return number, true
}

func jsonPathKeys(path SqlArray) ([]*string, string, bool) {
	if path.Error != "" {
		return nil, path.Error, false
	}
	if !path.Valid {
		return nil, "", false
	}
	keys := make([]*string, len(path.Elements))
	for index, element := range path.Elements {
		if element.Error != "" {
			return nil, element.Error, false
		}
		if !element.Valid {
			continue
		}
		text := element.Value.(SqlText)
		if text.Error != "" {
			return nil, text.Error, false
		}
		if !text.Valid {
			continue
		}
		value := text.Value
		keys[index] = &value
	}
	return keys, "", true
}

func jsonExtract(node SqlJsonNode, path []*string, rawScalar bool) (SqlJsonNode, bool) {
	current := node
	ok := true
	for _, step := range path {
		if step == nil {
			return SqlJsonNode{}, false
		}
		if !ok {
			return SqlJsonNode{}, false
		}
		if current.Kind == "object" {
			current, ok = jsonField(current, *step)
			continue
		}
		if current.Kind == "array" || rawScalar && current.Kind != "object" {
			index, parsed := jsonPathIndex(*step)
			if !parsed {
				return SqlJsonNode{}, false
			}
			current, ok = jsonIndex(current, index, rawScalar && current.Kind != "array")
			continue
		}
		return SqlJsonNode{}, false
	}
	return current, ok
}

func jsonExtractPath(value SqlJson, path SqlArray) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	keys, err, valid := jsonPathKeys(path)
	if err != "" {
		return jsonFail(err)
	}
	if !value.Valid || !valid {
		return SqlJson{}
	}
	node, ok := jsonExtract(value.Node, keys, false)
	if !ok {
		return SqlJson{}
	}
	return SqlJson{Text: node.Raw, Node: node, Valid: true}
}

func jsonExtractPathText(value SqlJson, path SqlArray) SqlText {
	extracted := jsonExtractPath(value, path)
	if extracted.Error != "" {
		return SqlText{Error: extracted.Error}
	}
	if !extracted.Valid {
		return SqlText{}
	}
	text, present := jsonAsText(extracted.Node, false)
	if !present {
		return SqlText{}
	}
	return SqlText{Value: text, Valid: true}
}

func jsonbExtractPath(value SqlJsonb, path SqlArray) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	keys, err, valid := jsonPathKeys(path)
	if err != "" {
		return jsonbFail(err)
	}
	if !value.Valid || !valid {
		return SqlJsonb{}
	}
	node, ok := jsonExtract(value.Node, keys, false)
	if !ok {
		return SqlJsonb{}
	}
	return SqlJsonb{Node: node, Valid: true}
}

func jsonbExtractPathText(value SqlJsonb, path SqlArray) SqlText {
	extracted := jsonbExtractPath(value, path)
	if extracted.Error != "" {
		return SqlText{Error: extracted.Error}
	}
	if !extracted.Valid {
		return SqlText{}
	}
	text, present := jsonAsText(extracted.Node, true)
	if !present {
		return SqlText{}
	}
	return SqlText{Value: text, Valid: true}
}

func jsonbTypeRank(kind string) int {
	switch kind {
	case "null":
		return 0
	case "string":
		return 1
	case "number":
		return 2
	case "bool":
		return 3
	case "array":
		return 16
	default:
		return 17
	}
}

func jsonbScalarCompare(left, right SqlJsonNode) int {
	switch left.Kind {
	case "null":
		return 0
	case "bool":
		if left.Bool == right.Bool {
			return 0
		}
		if left.Bool {
			return 1
		}
		return -1
	case "number":
		return int(sqlDecimalCompare(left.Number, right.Number).Value)
	default:
		return jsonStringCompare(left.String, right.String)
	}
}

type jsonCmpToken struct {
	kind      string
	rawScalar bool
	count     int
	key       string
	node      SqlJsonNode
}

func jsonWalk(node SqlJsonNode, root bool) []jsonCmpToken {
	if root && node.Kind != "array" && node.Kind != "object" {
		return []jsonCmpToken{
			{kind: "array", rawScalar: true, count: 1},
			{kind: "scalar", node: node},
			{kind: "end"},
		}
	}
	if node.Kind == "array" {
		tokens := []jsonCmpToken{{kind: "array", count: len(node.Elements)}}
		for _, element := range node.Elements {
			if element.Kind == "array" || element.Kind == "object" {
				tokens = append(tokens, jsonWalk(element, false)...)
			} else {
				tokens = append(tokens, jsonCmpToken{kind: "scalar", node: element})
			}
		}
		return append(tokens, jsonCmpToken{kind: "end"})
	}
	if node.Kind == "object" {
		tokens := []jsonCmpToken{{kind: "object", count: len(node.Pairs)}}
		for _, pair := range node.Pairs {
			tokens = append(tokens, jsonCmpToken{kind: "key", key: pair.Key})
			if pair.Value.Kind == "array" || pair.Value.Kind == "object" {
				tokens = append(tokens, jsonWalk(pair.Value, false)...)
			} else {
				tokens = append(tokens, jsonCmpToken{kind: "scalar", node: pair.Value})
			}
		}
		return append(tokens, jsonCmpToken{kind: "end"})
	}
	return []jsonCmpToken{{kind: "scalar", node: node}}
}

func jsonTokenType(token jsonCmpToken) int {
	switch token.kind {
	case "array":
		return 16
	case "object":
		return 17
	case "key":
		return 1
	case "scalar":
		return jsonbTypeRank(token.node.Kind)
	default:
		return 0
	}
}

func jsonbCompare(left, right SqlJsonb) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	a := jsonWalk(left.Node, true)
	b := jsonWalk(right.Node, true)
	limit := len(a)
	if len(b) < limit {
		limit = len(b)
	}
	for index := 0; index < limit; index++ {
		va, vb := a[index], b[index]
		if va.kind == vb.kind {
			if va.kind == "end" {
				continue
			}
			if va.kind == "array" {
				result := 0
				if va.rawScalar != vb.rawScalar {
					if va.rawScalar {
						result = -1
					} else {
						result = 1
					}
				}
				if va.count != vb.count {
					if va.count > vb.count {
						result = 1
					} else {
						result = -1
					}
				}
				if result != 0 {
					return SqlInteger{Value: int64(result), Valid: true}
				}
				continue
			}
			if va.kind == "object" {
				if va.count != vb.count {
					if va.count > vb.count {
						return SqlInteger{Value: 1, Valid: true}
					}
					return SqlInteger{Value: -1, Valid: true}
				}
				continue
			}
			if va.kind == "key" {
				result := jsonStringCompare(va.key, vb.key)
				if result != 0 {
					return SqlInteger{Value: int64(result), Valid: true}
				}
				continue
			}
			if va.node.Kind == vb.node.Kind {
				result := jsonbScalarCompare(va.node, vb.node)
				if result != 0 {
					return SqlInteger{Value: int64(result), Valid: true}
				}
			} else if jsonbTypeRank(va.node.Kind) > jsonbTypeRank(vb.node.Kind) {
				return SqlInteger{Value: 1, Valid: true}
			} else {
				return SqlInteger{Value: -1, Valid: true}
			}
		} else if jsonTokenType(va) > jsonTokenType(vb) {
			return SqlInteger{Value: 1, Valid: true}
		} else {
			return SqlInteger{Value: -1, Valid: true}
		}
	}
	return SqlInteger{Valid: true}
}

func jsonbComparison(left, right SqlJsonb, operation string) SqlBoolean {
	comparison := jsonbCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	var result bool
	switch operation {
	case "eq":
		result = comparison.Value == 0
	case "ne":
		result = comparison.Value != 0
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func jsonbEq(left, right SqlJsonb) SqlBoolean { return jsonbComparison(left, right, "eq") }
func jsonbNe(left, right SqlJsonb) SqlBoolean { return jsonbComparison(left, right, "ne") }
func jsonbLt(left, right SqlJsonb) SqlBoolean { return jsonbComparison(left, right, "lt") }
func jsonbLe(left, right SqlJsonb) SqlBoolean { return jsonbComparison(left, right, "le") }
func jsonbGt(left, right SqlJsonb) SqlBoolean { return jsonbComparison(left, right, "gt") }
func jsonbGe(left, right SqlJsonb) SqlBoolean { return jsonbComparison(left, right, "ge") }

func jsonContainer(node SqlJsonNode) bool {
	return node.Kind == "array" || node.Kind == "object"
}

func jsonbDeepContains(value, contained SqlJsonNode) bool {
	if contained.Kind == "object" {
		if value.Kind != "object" || len(value.Pairs) < len(contained.Pairs) {
			return false
		}
		for _, pair := range contained.Pairs {
			match, ok := jsonField(value, pair.Key)
			if !ok {
				return false
			}
			if !jsonContainer(match) && !jsonContainer(pair.Value) {
				if match.Kind != pair.Value.Kind || jsonbScalarCompare(match, pair.Value) != 0 {
					return false
				}
			} else if jsonContainer(match) && jsonContainer(pair.Value) {
				if !jsonbDeepContains(match, pair.Value) {
					return false
				}
			} else {
				return false
			}
		}
		return true
	}
	valueRaw := !jsonContainer(value)
	containedRaw := !jsonContainer(contained)
	if value.Kind == "object" || contained.Kind == "object" {
		return false
	}
	if valueRaw && !containedRaw {
		return false
	}
	values := []SqlJsonNode{value}
	if value.Kind == "array" {
		values = value.Elements
	}
	items := []SqlJsonNode{contained}
	if contained.Kind == "array" {
		items = contained.Elements
	}
	for _, item := range items {
		if !jsonContainer(item) {
			found := false
			for _, element := range values {
				if !jsonContainer(element) && element.Kind == item.Kind && jsonbScalarCompare(element, item) == 0 {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		} else {
			found := false
			for _, element := range values {
				if jsonContainer(element) && jsonbDeepContains(element, item) {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
	}
	return true
}

func jsonbContains(left, right SqlJsonb) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	if (left.Node.Kind == "object") != (right.Node.Kind == "object") {
		return SqlBoolean{Value: false, Valid: true}
	}
	return SqlBoolean{Value: jsonbDeepContains(left.Node, right.Node), Valid: true}
}

func jsonbContained(left, right SqlJsonb) SqlBoolean {
	return jsonbContains(right, left)
}

func jsonbExists(value SqlJsonb, key SqlText) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if key.Error != "" {
		return SqlBoolean{Error: key.Error}
	}
	if !value.Valid || !key.Valid {
		return SqlBoolean{}
	}
	if value.Node.Kind == "object" {
		_, ok := jsonField(value.Node, key.Value)
		return SqlBoolean{Value: ok, Valid: true}
	}
	if value.Node.Kind == "array" {
		for _, element := range value.Node.Elements {
			if element.Kind == "string" && element.String == key.Value {
				return SqlBoolean{Value: true, Valid: true}
			}
		}
		return SqlBoolean{Value: false, Valid: true}
	}
	return SqlBoolean{Value: value.Node.Kind == "string" && value.Node.String == key.Value, Valid: true}
}

func jsonbExistsAll(value SqlJsonb, keys SqlArray) SqlBoolean {
	path, err, valid := jsonPathKeys(keys)
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if err != "" {
		return SqlBoolean{Error: err}
	}
	if !value.Valid || !valid {
		return SqlBoolean{}
	}
	for _, key := range path {
		if key == nil {
			continue
		}
		found := jsonbExists(value, SqlText{Value: *key, Valid: true})
		if !found.Value {
			return SqlBoolean{Value: false, Valid: true}
		}
	}
	return SqlBoolean{Value: true, Valid: true}
}

func jsonbExistsAny(value SqlJsonb, keys SqlArray) SqlBoolean {
	path, err, valid := jsonPathKeys(keys)
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if err != "" {
		return SqlBoolean{Error: err}
	}
	if !value.Valid || !valid {
		return SqlBoolean{}
	}
	for _, key := range path {
		if key == nil {
			continue
		}
		found := jsonbExists(value, SqlText{Value: *key, Valid: true})
		if found.Value {
			return SqlBoolean{Value: true, Valid: true}
		}
	}
	return SqlBoolean{Value: false, Valid: true}
}

func sqlIsNullJson(value SqlJson) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullJson(value SqlJson) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseJson(otherwise func() SqlJson, conditions []func() SqlBoolean, branches []func() SqlJson) SqlJson {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return jsonFail(condition.Error)
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceJson(operands ...func() SqlJson) SqlJson {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlJson{}
}

func sqlIsNullJsonb(value SqlJsonb) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullJsonb(value SqlJsonb) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseJsonb(otherwise func() SqlJsonb, conditions []func() SqlBoolean, branches []func() SqlJsonb) SqlJsonb {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return jsonbFail(condition.Error)
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceJsonb(operands ...func() SqlJsonb) SqlJsonb {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlJsonb{}
}

func jsonbNodeCopy(node SqlJsonNode) SqlJsonNode {
	if node.Kind == "array" {
		elements := make([]SqlJsonNode, len(node.Elements))
		for index, element := range node.Elements {
			elements[index] = jsonbNodeCopy(element)
		}
		return SqlJsonNode{Kind: "array", Elements: elements}
	}
	if node.Kind == "object" {
		pairs := make([]SqlJsonPair, len(node.Pairs))
		for index, pair := range node.Pairs {
			pairs[index] = SqlJsonPair{Key: pair.Key, Value: jsonbNodeCopy(pair.Value)}
		}
		return SqlJsonNode{Kind: "object", Pairs: pairs}
	}
	return node
}

func jsonbConcat(left, right SqlJsonb) SqlJsonb {
	if left.Error != "" {
		return jsonbFail(left.Error)
	}
	if right.Error != "" {
		return jsonbFail(right.Error)
	}
	if !left.Valid || !right.Valid {
		return SqlJsonb{}
	}
	leftObject := left.Node.Kind == "object"
	rightObject := right.Node.Kind == "object"
	leftEmpty := leftObject && len(left.Node.Pairs) == 0 || left.Node.Kind == "array" && len(left.Node.Elements) == 0
	rightEmpty := rightObject && len(right.Node.Pairs) == 0 || right.Node.Kind == "array" && len(right.Node.Elements) == 0
	scalar := func(kind string) bool {
		return kind == "null" || kind == "bool" || kind == "number" || kind == "string"
	}
	if leftObject == rightObject {
		if leftEmpty && !scalar(right.Node.Kind) {
			return right
		}
		if rightEmpty && !scalar(left.Node.Kind) {
			return left
		}
	}
	if leftObject && rightObject {
		last := map[string]SqlJsonNode{}
		order := []string{}
		for _, pair := range left.Node.Pairs {
			if _, exists := last[pair.Key]; !exists {
				order = append(order, pair.Key)
			}
			last[pair.Key] = pair.Value
		}
		for _, pair := range right.Node.Pairs {
			if _, exists := last[pair.Key]; !exists {
				order = append(order, pair.Key)
			}
			last[pair.Key] = pair.Value
		}
		pairs := make([]SqlJsonPair, len(order))
		for index, key := range order {
			pairs[index] = SqlJsonPair{Key: key, Value: last[key]}
		}
		return SqlJsonb{Node: jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), Valid: true}
	}
	wrap := func(node SqlJsonNode) []SqlJsonNode {
		if node.Kind == "array" {
			elements := make([]SqlJsonNode, len(node.Elements))
			for index, element := range node.Elements {
				elements[index] = jsonbNodeCopy(element)
			}
			return elements
		}
		return []SqlJsonNode{jsonbNodeCopy(node)}
	}
	return SqlJsonb{Node: SqlJsonNode{Kind: "array", Elements: append(wrap(left.Node), wrap(right.Node)...)}, Valid: true}
}

func jsonbDeleteKey(value SqlJsonb, key SqlText) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if key.Error != "" {
		return jsonbFail(key.Error)
	}
	if !value.Valid || !key.Valid {
		return SqlJsonb{}
	}
	if value.Node.Kind != "array" && value.Node.Kind != "object" {
		return jsonbFail("22023")
	}
	if value.Node.Kind == "object" {
		if len(value.Node.Pairs) == 0 {
			return value
		}
		pairs := []SqlJsonPair{}
		for _, pair := range value.Node.Pairs {
			if pair.Key != key.Value {
				pairs = append(pairs, pair)
			}
		}
		return SqlJsonb{Node: SqlJsonNode{Kind: "object", Pairs: pairs}, Valid: true}
	}
	if len(value.Node.Elements) == 0 {
		return value
	}
	elements := []SqlJsonNode{}
	for _, element := range value.Node.Elements {
		if !(element.Kind == "string" && element.String == key.Value) {
			elements = append(elements, element)
		}
	}
	return SqlJsonb{Node: SqlJsonNode{Kind: "array", Elements: elements}, Valid: true}
}

func jsonbDeleteIndex(value SqlJsonb, index SqlInteger) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if index.Error != "" {
		return jsonbFail(index.Error)
	}
	if !value.Valid || !index.Valid {
		return SqlJsonb{}
	}
	if value.Node.Kind != "array" {
		return jsonbFail("22023")
	}
	count := int64(len(value.Node.Elements))
	if count == 0 {
		return value
	}
	idx := index.Value
	if idx < 0 {
		abs := -idx
		if idx == -2147483648 {
			abs = 2147483648
		}
		if abs > count {
			idx = count
		} else {
			idx = count + idx
		}
	}
	if idx >= count {
		return value
	}
	elements := []SqlJsonNode{}
	for position, element := range value.Node.Elements {
		if int64(position) != idx {
			elements = append(elements, element)
		}
	}
	return SqlJsonb{Node: SqlJsonNode{Kind: "array", Elements: elements}, Valid: true}
}

func jsonbDeleteKeys(value SqlJsonb, keys SqlArray) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if keys.Error != "" {
		return jsonbFail(keys.Error)
	}
	if !value.Valid || !keys.Valid {
		return SqlJsonb{}
	}
	if len(keys.Dimensions) > 1 {
		return jsonbFail("2202E")
	}
	if value.Node.Kind != "array" && value.Node.Kind != "object" {
		return jsonbFail("22023")
	}
	path, err, valid := jsonPathKeys(keys)
	if err != "" {
		return jsonbFail(err)
	}
	if !valid {
		return SqlJsonb{}
	}
	count := len(value.Node.Elements)
	if value.Node.Kind == "object" {
		count = len(value.Node.Pairs)
	}
	if count == 0 || len(path) == 0 {
		return value
	}
	result := value
	for _, key := range path {
		if key == nil {
			continue
		}
		result = jsonbDeleteKey(result, SqlText{Value: *key, Valid: true})
		if result.Error != "" {
			return result
		}
	}
	return result
}

func jsonbPathInt(value string) (int64, string) {
	trimmed := strings.TrimLeft(value, " \t\n\r\v\f")
	number, err := strconv.ParseInt(trimmed, 10, 32)
	if err != nil {
		return 0, "22P02"
	}
	return number, ""
}

func jsonbSetPath(node SqlJsonNode, path []*string, level int, next *SqlJsonNode, op string) (SqlJsonNode, string) {
	if path[level] == nil {
		return SqlJsonNode{}, "22004"
	}
	last := level == len(path)-1
	createOrInsert := op == "create" || op == "insert-before" || op == "insert-after"
	if node.Kind == "object" {
		key := *path[level]
		if len(node.Pairs) == 0 && createOrInsert && last && next != nil {
			return jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: []SqlJsonPair{{Key: key, Value: *next}}}), ""
		}
		match := -1
		for index, pair := range node.Pairs {
			if pair.Key == key {
				match = index
				break
			}
		}
		if match >= 0 {
			if last {
				if op == "insert-before" || op == "insert-after" {
					return SqlJsonNode{}, "22023"
				}
				if op == "delete" {
					pairs := []SqlJsonPair{}
					for index, pair := range node.Pairs {
						if index != match {
							pairs = append(pairs, pair)
						}
					}
					return SqlJsonNode{Kind: "object", Pairs: pairs}, ""
				}
				pairs := make([]SqlJsonPair, len(node.Pairs))
				copy(pairs, node.Pairs)
				pairs[match] = SqlJsonPair{Key: key, Value: *next}
				return jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), ""
			}
			pairs := make([]SqlJsonPair, len(node.Pairs))
			copy(pairs, node.Pairs)
			updated, err := jsonbSetPath(node.Pairs[match].Value, path, level+1, next, op)
			if err != "" {
				return SqlJsonNode{}, err
			}
			pairs[match] = SqlJsonPair{Key: key, Value: updated}
			return jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), ""
		}
		if createOrInsert && last && next != nil {
			pairs := append(append([]SqlJsonPair{}, node.Pairs...), SqlJsonPair{Key: key, Value: *next})
			return jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), ""
		}
		return node, ""
	}
	if node.Kind == "array" {
		count := int64(len(node.Elements))
		idx, err := jsonbPathInt(*path[level])
		if err != "" {
			return SqlJsonNode{}, err
		}
		if idx < 0 {
			abs := -idx
			if idx == -2147483648 {
				abs = 2147483648
			}
			if abs > count {
				idx = -2147483648
			} else {
				idx = count + idx
			}
		}
		if idx > 0 && idx > count {
			idx = count
		}
		if (idx == -2147483648 || count == 0) && last && createOrInsert && next != nil {
			return SqlJsonNode{Kind: "array", Elements: append([]SqlJsonNode{*next}, node.Elements...)}, ""
		}
		if idx >= 0 && idx < count {
			if last {
				elements := []SqlJsonNode{}
				for index, element := range node.Elements {
					if int64(index) == idx {
						if op == "insert-before" || op == "create" {
							elements = append(elements, *next)
						}
						if op == "insert-after" || op == "insert-before" {
							elements = append(elements, element)
						}
						if op == "insert-after" || op == "replace" {
							elements = append(elements, *next)
						}
					} else {
						elements = append(elements, element)
					}
				}
				return SqlJsonNode{Kind: "array", Elements: elements}, ""
			}
			updated, err := jsonbSetPath(node.Elements[idx], path, level+1, next, op)
			if err != "" {
				return SqlJsonNode{}, err
			}
			elements := make([]SqlJsonNode, len(node.Elements))
			copy(elements, node.Elements)
			elements[idx] = updated
			return SqlJsonNode{Kind: "array", Elements: elements}, ""
		}
		if createOrInsert && last && next != nil {
			return SqlJsonNode{Kind: "array", Elements: append(append([]SqlJsonNode{}, node.Elements...), *next)}, ""
		}
		return node, ""
	}
	return node, ""
}

func jsonbMutatePath(value SqlJsonb, path SqlArray, next *SqlJsonb, op string) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if path.Error != "" {
		return jsonbFail(path.Error)
	}
	if next != nil && next.Error != "" {
		return jsonbFail(next.Error)
	}
	if !value.Valid || !path.Valid || (op != "delete" && (next == nil || !next.Valid)) {
		return SqlJsonb{}
	}
	if len(path.Dimensions) > 1 {
		return jsonbFail("2202E")
	}
	if value.Node.Kind != "array" && value.Node.Kind != "object" {
		return jsonbFail("22023")
	}
	keys, err, valid := jsonPathKeys(path)
	if err != "" {
		return jsonbFail(err)
	}
	if !valid {
		return SqlJsonb{}
	}
	count := len(value.Node.Elements)
	if value.Node.Kind == "object" {
		count = len(value.Node.Pairs)
	}
	if len(keys) == 0 || (count == 0 && op != "create" && op != "insert-before" && op != "insert-after") {
		return value
	}
	var nextNode *SqlJsonNode
	if next != nil {
		nextNode = &next.Node
	}
	node, err := jsonbSetPath(value.Node, keys, 0, nextNode, op)
	if err != "" {
		return jsonbFail(err)
	}
	return SqlJsonb{Node: node, Valid: true}
}

func jsonbDeletePath(value SqlJsonb, path SqlArray) SqlJsonb {
	return jsonbMutatePath(value, path, nil, "delete")
}

func jsonbSet(value SqlJsonb, path SqlArray, next SqlJsonb, create SqlBoolean) SqlJsonb {
	if create.Error != "" {
		return jsonbFail(create.Error)
	}
	if !create.Valid {
		return SqlJsonb{}
	}
	op := "replace"
	if create.Value {
		op = "create"
	}
	return jsonbMutatePath(value, path, &next, op)
}

func jsonbInsert(value SqlJsonb, path SqlArray, next SqlJsonb, after SqlBoolean) SqlJsonb {
	if after.Error != "" {
		return jsonbFail(after.Error)
	}
	if !after.Valid {
		return SqlJsonb{}
	}
	op := "insert-before"
	if after.Value {
		op = "insert-after"
	}
	return jsonbMutatePath(value, path, &next, op)
}

func jsonbSetLax(value SqlJsonb, path SqlArray, next SqlJsonb, create SqlBoolean, treatment SqlText) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if path.Error != "" {
		return jsonbFail(path.Error)
	}
	if create.Error != "" {
		return jsonbFail(create.Error)
	}
	if treatment.Error != "" {
		return jsonbFail(treatment.Error)
	}
	if !value.Valid || !path.Valid || !create.Valid {
		return SqlJsonb{}
	}
	if !treatment.Valid {
		return jsonbFail("22023")
	}
	if next.Error != "" {
		return jsonbFail(next.Error)
	}
	if next.Valid {
		return jsonbSet(value, path, next, create)
	}
	switch treatment.Value {
	case "raise_exception":
		return jsonbFail("22004")
	case "use_json_null":
		return jsonbSet(value, path, SqlJsonb{Node: SqlJsonNode{Kind: "null", Raw: "null"}, Valid: true}, create)
	case "delete_key":
		return jsonbDeletePath(value, path)
	case "return_target":
		return value
	default:
		return jsonbFail("22023")
	}
}

func jsonFormatCompact(node SqlJsonNode) string {
	switch node.Kind {
	case "null":
		return "null"
	case "bool":
		if node.Bool {
			return "true"
		}
		return "false"
	case "number":
		if node.Raw != "" {
			return node.Raw
		}
		return sqlDecimalText(node.Number)
	case "string":
		return jsonbEscape(node.String)
	case "array":
		parts := make([]string, len(node.Elements))
		for index, element := range node.Elements {
			parts[index] = jsonFormatCompact(element)
		}
		return "[" + strings.Join(parts, ",") + "]"
	default:
		parts := make([]string, len(node.Pairs))
		for index, pair := range node.Pairs {
			parts[index] = jsonbEscape(pair.Key) + ":" + jsonFormatCompact(pair.Value)
		}
		return "{" + strings.Join(parts, ",") + "}"
	}
}

func jsonStripNullsNode(node SqlJsonNode, arrays bool) SqlJsonNode {
	if node.Kind == "object" {
		pairs := []SqlJsonPair{}
		for _, pair := range node.Pairs {
			if pair.Value.Kind == "null" {
				continue
			}
			pairs = append(pairs, SqlJsonPair{Key: pair.Key, Value: jsonStripNullsNode(pair.Value, arrays)})
		}
		return SqlJsonNode{Kind: "object", Pairs: pairs}
	}
	if node.Kind == "array" {
		elements := []SqlJsonNode{}
		for _, element := range node.Elements {
			if arrays && element.Kind == "null" {
				continue
			}
			elements = append(elements, jsonStripNullsNode(element, arrays))
		}
		return SqlJsonNode{Kind: "array", Elements: elements}
	}
	return node
}

func jsonStripNulls(value SqlJson, arrays SqlBoolean) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if arrays.Error != "" {
		return jsonFail(arrays.Error)
	}
	if !value.Valid || !arrays.Valid {
		return SqlJson{}
	}
	node := jsonStripNullsNode(value.Node, arrays.Value)
	return SqlJson{Text: jsonFormatCompact(node), Node: node, Valid: true}
}

func jsonbStripNulls(value SqlJsonb, arrays SqlBoolean) SqlJsonb {
	if value.Error != "" {
		return jsonbFail(value.Error)
	}
	if arrays.Error != "" {
		return jsonbFail(arrays.Error)
	}
	if !value.Valid || !arrays.Valid {
		return SqlJsonb{}
	}
	if value.Node.Kind != "array" && value.Node.Kind != "object" {
		return value
	}
	return SqlJsonb{Node: jsonbCanonicalize(jsonStripNullsNode(value.Node, arrays.Value)), Valid: true}
}

func jsonbPretty(value SqlJsonb) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	var render func(node SqlJsonNode, level int) string
	render = func(node SqlJsonNode, level int) string {
		if node.Kind != "array" && node.Kind != "object" {
			return jsonbFormat(node)
		}
		open, close := "[", "]"
		items := []string{}
		if node.Kind == "object" {
			open, close = "{", "}"
			for _, pair := range node.Pairs {
				items = append(items, jsonbEscape(pair.Key)+": "+render(pair.Value, level+1))
			}
		} else {
			for _, element := range node.Elements {
				items = append(items, render(element, level+1))
			}
		}
		pad := strings.Repeat("    ", level)
		if len(items) == 0 {
			return open + "\n" + pad + close
		}
		inner := make([]string, len(items))
		for index, item := range items {
			inner[index] = strings.Repeat("    ", level+1) + item
		}
		return open + "\n" + strings.Join(inner, ",\n") + "\n" + pad + close
	}
	return SqlText{Value: render(value.Node, 0), Valid: true}
}

func jsonbToBool(value SqlJsonb) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if !value.Valid {
		return SqlBoolean{}
	}
	if value.Node.Kind == "null" {
		return SqlBoolean{}
	}
	if value.Node.Kind != "bool" {
		return SqlBoolean{Error: "22023"}
	}
	return SqlBoolean{Value: value.Node.Bool, Valid: true}
}

func jsonbToNumeric(value SqlJsonb) SqlDecimal {
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !value.Valid {
		return SqlDecimal{}
	}
	if value.Node.Kind == "null" {
		return SqlDecimal{}
	}
	if value.Node.Kind != "number" {
		return SqlDecimal{Error: "22023"}
	}
	return value.Node.Number
}

func jsonbToInt2(value SqlJsonb) SqlInteger { return int2FromDecimal(jsonbToNumeric(value)) }
func jsonbToInt4(value SqlJsonb) SqlInteger { return int4FromDecimal(jsonbToNumeric(value)) }
func jsonbToInt8(value SqlJsonb) SqlInteger { return int8FromDecimal(jsonbToNumeric(value)) }
func jsonbToFloat4(value SqlJsonb) SqlFloat { return float4FromDecimal(jsonbToNumeric(value)) }
func jsonbToFloat8(value SqlJsonb) SqlFloat { return float8FromDecimal(jsonbToNumeric(value)) }

func jsonArrayText(element SqlArrayElement) (*string, string) {
	if element.Error != "" {
		return nil, element.Error
	}
	if !element.Valid {
		return nil, ""
	}
	text := element.Value.(SqlText)
	if text.Error != "" {
		return nil, text.Error
	}
	if !text.Valid {
		return nil, ""
	}
	value := text.Value
	return &value, ""
}

func jsonTextPairs(keys SqlArray, values *SqlArray) ([]SqlJsonPair, string) {
	if values == nil {
		if len(keys.Dimensions) > 2 {
			return nil, "2202E"
		}
		if len(keys.Dimensions) == 2 && keys.Dimensions[1] != 2 {
			return nil, "2202E"
		}
		if len(keys.Dimensions) == 1 && len(keys.Elements)%2 != 0 {
			return nil, "2202E"
		}
		if len(keys.Dimensions) == 0 {
			return []SqlJsonPair{}, ""
		}
		pairs := []SqlJsonPair{}
		for index := 0; index < len(keys.Elements); index += 2 {
			key, err := jsonArrayText(keys.Elements[index])
			if err != "" {
				return nil, err
			}
			if key == nil {
				return nil, "22004"
			}
			value, err := jsonArrayText(keys.Elements[index+1])
			if err != "" {
				return nil, err
			}
			pair := SqlJsonPair{Key: *key, Value: SqlJsonNode{Kind: "null", Raw: "null"}}
			if value != nil {
				pair.Value = SqlJsonNode{Kind: "string", String: *value}
			}
			pairs = append(pairs, pair)
		}
		return pairs, ""
	}
	if len(keys.Dimensions) > 1 || len(keys.Dimensions) != len(values.Dimensions) {
		return nil, "2202E"
	}
	if len(keys.Dimensions) == 0 {
		return []SqlJsonPair{}, ""
	}
	if len(keys.Elements) != len(values.Elements) {
		return nil, "2202E"
	}
	pairs := make([]SqlJsonPair, len(keys.Elements))
	for index, element := range keys.Elements {
		key, err := jsonArrayText(element)
		if err != "" {
			return nil, err
		}
		if key == nil {
			return nil, "22004"
		}
		value, err := jsonArrayText(values.Elements[index])
		if err != "" {
			return nil, err
		}
		pair := SqlJsonPair{Key: *key, Value: SqlJsonNode{Kind: "null", Raw: "null"}}
		if value != nil {
			pair.Value = SqlJsonNode{Kind: "string", String: *value}
		}
		pairs[index] = pair
	}
	return pairs, ""
}

func jsonObject(keys SqlArray) SqlJson {
	if keys.Error != "" {
		return jsonFail(keys.Error)
	}
	if !keys.Valid {
		return SqlJson{}
	}
	pairs, err := jsonTextPairs(keys, nil)
	if err != "" {
		return jsonFail(err)
	}
	parts := make([]string, len(pairs))
	for index, pair := range pairs {
		value := "null"
		if pair.Value.Kind == "string" {
			value = jsonbEscape(pair.Value.String)
		}
		parts[index] = jsonbEscape(pair.Key) + " : " + value
	}
	text := "{" + strings.Join(parts, ", ") + "}"
	node, err := jsonParse(text, false)
	if err != "" {
		return jsonFail(err)
	}
	return SqlJson{Text: text, Node: node, Valid: true}
}

func jsonObjectPair(keys, values SqlArray) SqlJson {
	if keys.Error != "" {
		return jsonFail(keys.Error)
	}
	if values.Error != "" {
		return jsonFail(values.Error)
	}
	if !keys.Valid || !values.Valid {
		return SqlJson{}
	}
	pairs, err := jsonTextPairs(keys, &values)
	if err != "" {
		return jsonFail(err)
	}
	parts := make([]string, len(pairs))
	for index, pair := range pairs {
		value := "null"
		if pair.Value.Kind == "string" {
			value = jsonbEscape(pair.Value.String)
		}
		parts[index] = jsonbEscape(pair.Key) + " : " + value
	}
	text := "{" + strings.Join(parts, ", ") + "}"
	node, parseErr := jsonParse(text, false)
	if parseErr != "" {
		return jsonFail(parseErr)
	}
	return SqlJson{Text: text, Node: node, Valid: true}
}

func jsonbObject(keys SqlArray) SqlJsonb {
	if keys.Error != "" {
		return jsonbFail(keys.Error)
	}
	if !keys.Valid {
		return SqlJsonb{}
	}
	pairs, err := jsonTextPairs(keys, nil)
	if err != "" {
		return jsonbFail(err)
	}
	return SqlJsonb{Node: jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), Valid: true}
}

func jsonbObjectPair(keys, values SqlArray) SqlJsonb {
	if keys.Error != "" {
		return jsonbFail(keys.Error)
	}
	if values.Error != "" {
		return jsonbFail(values.Error)
	}
	if !keys.Valid || !values.Valid {
		return SqlJsonb{}
	}
	pairs, err := jsonTextPairs(keys, &values)
	if err != "" {
		return jsonbFail(err)
	}
	return SqlJsonb{Node: jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), Valid: true}
}

func jsonDatumError(value any) string {
	switch typed := value.(type) {
	case SqlInteger:
		return typed.Error
	case SqlFloat:
		return typed.Error
	case SqlDecimal:
		return typed.Error
	case SqlBoolean:
		return typed.Error
	case SqlText:
		return typed.Error
	case SqlUuid:
		return typed.Error
	case SqlEnum:
		return typed.Error
	case SqlJson:
		return typed.Error
	case SqlJsonb:
		return typed.Error
	case SqlArray:
		return typed.Error
	default:
		return ""
	}
}

func jsonDatumNull(value any) bool {
	switch typed := value.(type) {
	case SqlInteger:
		return !typed.Valid
	case SqlFloat:
		return !typed.Valid
	case SqlDecimal:
		return !typed.Valid
	case SqlBoolean:
		return !typed.Valid
	case SqlText:
		return !typed.Valid
	case SqlUuid:
		return !typed.Valid
	case SqlEnum:
		return !typed.Valid
	case SqlJson:
		return !typed.Valid
	case SqlJsonb:
		return !typed.Valid
	case SqlArray:
		return !typed.Valid
	case nil:
		return true
	default:
		return false
	}
}

func jsonFloatText(value float64, float4 bool) string {
	switch {
	case math.IsNaN(value):
		return "NaN"
	case math.IsInf(value, 1):
		return "Infinity"
	case math.IsInf(value, -1):
		return "-Infinity"
	case value == 0 && math.Signbit(value):
		return "-0"
	default:
		bits := 64
		if float4 {
			bits = 32
		}
		return strconv.FormatFloat(value, 'g', -1, bits)
	}
}

func jsonKeyString(typeName string, value any) (string, string) {
	if err := jsonDatumError(value); err != "" {
		return "", err
	}
	if jsonDatumNull(value) {
		return "", "22004"
	}
	switch typed := value.(type) {
	case SqlArray:
		return "", "22023"
	case SqlJson, SqlJsonb:
		return "", "22023"
	case SqlBoolean:
		if typed.Value {
			return "true", ""
		}
		return "false", ""
	case SqlInteger:
		return strconv.FormatInt(typed.Value, 10), ""
	case SqlFloat:
		return jsonFloatText(typed.Value, typeName == "pg_catalog.float4"), ""
	case SqlDecimal:
		return sqlDecimalText(typed), ""
	case SqlText:
		return typed.Value, ""
	case SqlUuid:
		return uuidText(typed).Value, ""
	case SqlEnum:
		return typed.Label, ""
	default:
		return "", "22023"
	}
}

func jsonFromValue(typeName string, value any, asKey bool) (string, SqlJsonNode, string) {
	if asKey {
		key, err := jsonKeyString(typeName, value)
		if err != "" {
			return "", SqlJsonNode{}, err
		}
		text := jsonbEscape(key)
		return text, SqlJsonNode{Kind: "string", Raw: text, String: key}, ""
	}
	if err := jsonDatumError(value); err != "" {
		return "", SqlJsonNode{}, err
	}
	if jsonDatumNull(value) {
		return "null", SqlJsonNode{Kind: "null", Raw: "null"}, ""
	}
	switch typed := value.(type) {
	case SqlBoolean:
		text := "false"
		if typed.Value {
			text = "true"
		}
		return text, SqlJsonNode{Kind: "bool", Raw: text, Bool: typed.Value}, ""
	case SqlInteger:
		text := strconv.FormatInt(typed.Value, 10)
		return text, SqlJsonNode{Kind: "number", Raw: text, Number: decimalInput(text)}, ""
	case SqlFloat:
		text := jsonFloatText(typed.Value, typeName == "pg_catalog.float4")
		if text == "NaN" || text == "Infinity" || text == "-Infinity" {
			escaped := jsonbEscape(text)
			return escaped, SqlJsonNode{Kind: "string", Raw: escaped, String: text}, ""
		}
		return text, SqlJsonNode{Kind: "number", Raw: text, Number: decimalInput(text)}, ""
	case SqlDecimal:
		text := sqlDecimalText(typed)
		if len(text) == 0 || (text[0] != '-' && (text[0] < '0' || text[0] > '9')) || (text[0] == '-' && (len(text) < 2 || text[1] < '0' || text[1] > '9')) {
			escaped := jsonbEscape(text)
			return escaped, SqlJsonNode{Kind: "string", Raw: escaped, String: text}, ""
		}
		return text, SqlJsonNode{Kind: "number", Raw: text, Number: typed}, ""
	case SqlText:
		text := jsonbEscape(typed.Value)
		return text, SqlJsonNode{Kind: "string", Raw: text, String: typed.Value}, ""
	case SqlJson:
		return typed.Text, typed.Node, ""
	case SqlJsonb:
		return jsonbFormat(typed.Node), typed.Node, ""
	case SqlUuid:
		label := uuidText(typed).Value
		text := jsonbEscape(label)
		return text, SqlJsonNode{Kind: "string", Raw: text, String: label}, ""
	case SqlEnum:
		text := jsonbEscape(typed.Label)
		return text, SqlJsonNode{Kind: "string", Raw: text, String: typed.Label}, ""
	case SqlArray:
		return jsonArrayFromSql(typed, false)
	default:
		return "", SqlJsonNode{}, "22023"
	}
}

func jsonArrayFromSql(array SqlArray, pretty bool) (string, SqlJsonNode, string) {
	if array.Error != "" {
		return "", SqlJsonNode{}, array.Error
	}
	if !array.Valid {
		return "null", SqlJsonNode{Kind: "null", Raw: "null"}, ""
	}
	if len(array.Dimensions) == 0 {
		return "[]", SqlJsonNode{Kind: "array"}, ""
	}
	offset := 0
	var walk func(dim int, usePretty bool) (string, SqlJsonNode, string)
	walk = func(dim int, usePretty bool) (string, SqlJsonNode, string) {
		n := int(array.Dimensions[dim])
		texts := make([]string, n)
		elements := make([]SqlJsonNode, n)
		sep := ","
		if usePretty {
			sep = ",\n "
		}
		for index := 0; index < n; index++ {
			if dim == len(array.Dimensions)-1 {
				element := array.Elements[offset]
				offset++
				if element.Error != "" {
					return "", SqlJsonNode{}, element.Error
				}
				if !element.Valid {
					texts[index] = "null"
					elements[index] = SqlJsonNode{Kind: "null", Raw: "null"}
					continue
				}
				text, node, err := jsonFromValue(array.ElementType, element.Value, false)
				if err != "" {
					return "", SqlJsonNode{}, err
				}
				texts[index] = text
				elements[index] = node
			} else {
				text, node, err := walk(dim+1, false)
				if err != "" {
					return "", SqlJsonNode{}, err
				}
				texts[index] = text
				elements[index] = node
			}
		}
		return "[" + strings.Join(texts, sep) + "]", SqlJsonNode{Kind: "array", Elements: elements}, ""
	}
	return walk(0, pretty)
}

func arrayToJson(value SqlArray) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if !value.Valid {
		return SqlJson{}
	}
	text, node, err := jsonArrayFromSql(value, false)
	if err != "" {
		return jsonFail(err)
	}
	return SqlJson{Text: text, Node: node, Valid: true}
}

func arrayToJsonPretty(value SqlArray, pretty SqlBoolean) SqlJson {
	if value.Error != "" {
		return jsonFail(value.Error)
	}
	if pretty.Error != "" {
		return jsonFail(pretty.Error)
	}
	if !value.Valid || !pretty.Valid {
		return SqlJson{}
	}
	if !pretty.Value {
		return arrayToJson(value)
	}
	text, node, err := jsonArrayFromSql(value, true)
	if err != "" {
		return jsonFail(err)
	}
	return SqlJson{Text: text, Node: node, Valid: true}
}

func toJson(typeName string, value any) SqlJson {
	if err := jsonDatumError(value); err != "" {
		return jsonFail(err)
	}
	if jsonDatumNull(value) {
		return SqlJson{}
	}
	text, node, err := jsonFromValue(typeName, value, false)
	if err != "" {
		return jsonFail(err)
	}
	return SqlJson{Text: text, Node: node, Valid: true}
}

func toJsonb(typeName string, value any) SqlJsonb {
	if err := jsonDatumError(value); err != "" {
		return jsonbFail(err)
	}
	if jsonDatumNull(value) {
		return SqlJsonb{}
	}
	_, node, err := jsonFromValue(typeName, value, false)
	if err != "" {
		return jsonbFail(err)
	}
	return SqlJsonb{Node: jsonbCanonicalize(node), Valid: true}
}

func jsonBuildArray(args ...any) SqlJson {
	texts := []string{}
	elements := []SqlJsonNode{}
	for index := 0; index < len(args); index += 2 {
		if err := jsonDatumError(args[index+1]); err != "" {
			return jsonFail(err)
		}
		text, node, err := jsonFromValue(args[index].(string), args[index+1], false)
		if err != "" {
			return jsonFail(err)
		}
		texts = append(texts, text)
		elements = append(elements, node)
	}
	return SqlJson{Text: "[" + strings.Join(texts, ", ") + "]", Node: SqlJsonNode{Kind: "array", Elements: elements}, Valid: true}
}

func jsonBuildObject(args ...any) SqlJson {
	if len(args)%4 != 0 {
		return jsonFail("22023")
	}
	parts := []string{}
	for index := 0; index < len(args); index += 4 {
		key, err := jsonKeyString(args[index].(string), args[index+1])
		if err != "" {
			return jsonFail(err)
		}
		text, _, err := jsonFromValue(args[index+2].(string), args[index+3], false)
		if err != "" {
			return jsonFail(err)
		}
		parts = append(parts, jsonbEscape(key)+" : "+text)
	}
	text := "{" + strings.Join(parts, ", ") + "}"
	node, err := jsonParse(text, false)
	if err != "" {
		return jsonFail(err)
	}
	return SqlJson{Text: text, Node: node, Valid: true}
}

func jsonbBuildArray(args ...any) SqlJsonb {
	elements := []SqlJsonNode{}
	for index := 0; index < len(args); index += 2 {
		if err := jsonDatumError(args[index+1]); err != "" {
			return jsonbFail(err)
		}
		_, node, err := jsonFromValue(args[index].(string), args[index+1], false)
		if err != "" {
			return jsonbFail(err)
		}
		elements = append(elements, node)
	}
	return SqlJsonb{Node: jsonbCanonicalize(SqlJsonNode{Kind: "array", Elements: elements}), Valid: true}
}

func jsonbBuildObject(args ...any) SqlJsonb {
	if len(args)%4 != 0 {
		return jsonbFail("22023")
	}
	pairs := []SqlJsonPair{}
	for index := 0; index < len(args); index += 4 {
		key, err := jsonKeyString(args[index].(string), args[index+1])
		if err != "" {
			return jsonbFail(err)
		}
		_, node, err := jsonFromValue(args[index+2].(string), args[index+3], false)
		if err != "" {
			return jsonbFail(err)
		}
		pairs = append(pairs, SqlJsonPair{Key: key, Value: node})
	}
	return SqlJsonb{Node: jsonbCanonicalize(SqlJsonNode{Kind: "object", Pairs: pairs}), Valid: true}
}
