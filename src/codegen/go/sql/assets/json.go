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
