package transpiler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/format"
	"io"
	"strings"
)

type node struct {
	Kind          string      `json:"kind"`
	Name          string      `json:"name"`
	Visibility    string      `json:"visibility"`
	Derives       []string    `json:"derives"`
	Type          *node       `json:"type"`
	ReturnType    *node       `json:"returnType"`
	Inner         *node       `json:"inner"`
	Value         *node       `json:"value"`
	Digits        string      `json:"digits"`
	Left          *node       `json:"left"`
	Right         *node       `json:"right"`
	Base          *node       `json:"base"`
	Index         *node       `json:"index"`
	Receiver      *node       `json:"receiver"`
	Callee        *node       `json:"callee"`
	Condition     *node       `json:"condition"`
	Initializer   *node       `json:"initializer"`
	Payload       *node       `json:"payload"`
	TypeArguments []*node     `json:"typeArguments"`
	Fields        []field     `json:"fields"`
	Variants      []variant   `json:"variants"`
	Parameters    []parameter `json:"parameters"`
	Body          []*node     `json:"body"`
	Arguments     []*node     `json:"arguments"`
	Segments      []string    `json:"segments"`
	Path          []string    `json:"path"`
	Operator      string      `json:"operator"`
	Member        string      `json:"member"`
	Method        string      `json:"method"`
	Semicolon     bool        `json:"semicolon"`
	Binding       binding     `json:"binding"`
	Mutable       bool        `json:"mutable"`
}

type field struct {
	Name       string `json:"name"`
	Visibility string `json:"visibility"`
	Type       *node  `json:"type"`
	Value      *node  `json:"value"`
}

type variant struct {
	Name    string `json:"name"`
	Payload *node  `json:"payload"`
}

type parameter struct {
	Name    string `json:"name"`
	Mutable bool   `json:"mutable"`
	Type    *node  `json:"type"`
}

type binding struct {
	Name    string `json:"name"`
	Mutable bool   `json:"mutable"`
}

type document struct {
	SchemaVersion int     `json:"schemaVersion"`
	Items         []*node `json:"items"`
}

type contractError string

func reject(message string) {
	panic(contractError(message))
}

type writer struct {
	text   strings.Builder
	indent int
}

func (w *writer) line(value string) {
	w.text.WriteString(strings.Repeat("\t", w.indent))
	w.text.WriteString(value)
	w.text.WriteByte('\n')
}

type generator struct {
	writer writer
	enums  map[string][]variant
	types  map[string]bool
}

func path(value *node) string {
	if value == nil {
		reject("missing node")
	}
	if value.Kind != "path" {
		reject("expected path")
	}
	return strings.Join(value.Segments, "::")
}

func (g *generator) typeName(value *node) string {
	if value == nil {
		reject("missing type")
	}
	if value.Kind == "reference" {
		if path(value.Inner) != "str" {
			reject("unsupported reference type")
		}
		return "string"
	}
	if value.Kind != "path" {
		reject("unsupported type kind " + value.Kind)
	}
	name := path(value)
	if len(value.TypeArguments) != 0 {
		if name != "Vec" || len(value.TypeArguments) != 1 || path(value.TypeArguments[0]) != "char" {
			reject("unsupported generic type")
		}
		return "[]rune"
	}
	switch name {
	case "usize", "u32", "i32":
		return "int"
	case "bool":
		return "bool"
	case "char":
		return "rune"
	case "str":
		return "string"
	default:
		if g.types[name] {
			return name
		}
		reject("unsupported type " + name)
		return ""
	}
}

func (g *generator) detach(value string, valueType *node) string {
	if valueType.Kind == "reference" {
		return "checkedString(" + value + ")"
	}
	name := path(valueType)
	switch name {
	case "usize", "u32":
		return "checkedIndex(" + value + ")"
	case "i32":
		return "checkedI32(" + value + ")"
	case "char":
		return "checkedChar(" + value + ")"
	}
	if name == "Vec" {
		return "checkedChars(" + value + ")"
	}
	if g.types[name] {
		return "copy" + name + "(" + value + ")"
	}
	return value
}

func (g *generator) expression(value *node) string {
	if value == nil {
		reject("missing expression")
	}
	switch value.Kind {
	case "path":
		if len(value.Segments) == 1 {
			return value.Segments[0]
		}
		if len(value.Segments) == 2 {
			name, variantName := value.Segments[0], value.Segments[1]
			for _, variant := range g.enums[name] {
				if variant.Name == variantName && variant.Payload == nil {
					return fmt.Sprintf("%s{kind: %s%s}", name, name, variantName)
				}
			}
		}
		reject("unknown path " + strings.Join(value.Segments, "::"))
	case "integer":
		return value.Digits
	case "parenthesized":
		return "(" + g.expression(value.Inner) + ")"
	case "binary":
		left, right := g.expression(value.Left), g.expression(value.Right)
		switch value.Operator {
		case "add":
			return "checkedAdd(" + left + ", " + right + ")"
		case "subtract":
			return "checkedSubtract(" + left + ", " + right + ")"
		case "add-assign":
			return left + " = checkedAdd(" + left + ", " + right + ")"
		}
		operators := map[string]string{
			"less-than": "<", "less-or-equal": "<=",
			"greater-than": ">", "greater-or-equal": ">=", "equal": "==",
			"not-equal": "!=", "and": "&&", "or": "||",
		}
		operator, ok := operators[value.Operator]
		if !ok {
			reject("unknown operator " + value.Operator)
		}
		return left + " " + operator + " " + right
	case "field":
		return g.expression(value.Base) + "." + value.Member
	case "index":
		return g.expression(value.Base) + "[" + g.expression(value.Index) + "]"
	case "method-call":
		if value.Method == "len" && len(value.Arguments) == 0 {
			return "len(" + g.expression(value.Receiver) + ")"
		}
		if value.Method == "to_ascii_lowercase" && len(value.Arguments) == 0 {
			return "asciiLowercase(" + g.expression(value.Receiver) + ")"
		}
		if value.Method == "collect" && len(value.Arguments) == 0 && value.Receiver != nil && value.Receiver.Kind == "method-call" && value.Receiver.Method == "chars" && len(value.Receiver.Arguments) == 0 {
			return "[]rune(" + g.expression(value.Receiver.Receiver) + ")"
		}
		reject("unsupported method " + value.Method)
	case "struct-literal":
		fields := make([]string, 0, len(value.Fields))
		for _, field := range value.Fields {
			fields = append(fields, field.Name+": "+g.expression(field.Value))
		}
		return strings.Join(value.Path, "::") + "{" + strings.Join(fields, ", ") + "}"
	case "call":
		if value.Callee == nil || value.Callee.Kind != "path" || len(value.Callee.Segments) != 2 || len(value.Arguments) != 1 {
			reject("unsupported call")
		}
		name, variantName := value.Callee.Segments[0], value.Callee.Segments[1]
		for _, variant := range g.enums[name] {
			if variant.Name == variantName && variant.Payload != nil {
				return fmt.Sprintf("%s{kind: %s%s, %s: %s}", name, name, variantName, strings.ToLower(variantName), g.expression(value.Arguments[0]))
			}
		}
		reject("unknown payload variant " + name + "::" + variantName)
	default:
		reject("expression needs statement lowering: " + value.Kind)
	}
	return ""
}

func (g *generator) statements(statements []*node) {
	for index, statement := range statements {
		if statement == nil {
			reject("missing statement")
		}
		if statement.Kind == "local" {
			g.writer.line(statement.Binding.Name + " := " + g.expression(statement.Initializer))
			continue
		}
		if statement.Kind != "expression" || statement.Value == nil {
			reject("unsupported statement")
		}
		value := statement.Value
		switch value.Kind {
		case "return":
			g.writer.line("return " + g.expression(value.Value))
		case "break":
			g.writer.line("break")
		case "if", "while":
			condition := g.expression(value.Condition)
			if value.Kind == "if" {
				g.writer.line("if " + condition + " {")
			} else {
				g.writer.line("for " + condition + " {")
			}
			g.writer.indent++
			g.statements(value.Body)
			g.writer.indent--
			g.writer.line("}")
		default:
			result := g.expression(value)
			if index == len(statements)-1 && !statement.Semicolon {
				g.writer.line("return " + result)
			} else {
				g.writer.line(result)
			}
		}
	}
}

func (g *generator) prelude() {
	g.writer.line("const maxSharedIndex = 2147483647")
	g.writer.line("func checkedIndex(value int) int {")
	g.writer.indent++
	g.writer.line("if value < 0 || value > maxSharedIndex { panic(\"index outside shared numeric range\") }")
	g.writer.line("return value")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func checkedI32(value int) int {")
	g.writer.indent++
	g.writer.line("if value < -2147483648 || value > maxSharedIndex { panic(\"signed integer outside shared numeric range\") }")
	g.writer.line("return value")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func checkedAdd(left int, right int) int {")
	g.writer.indent++
	g.writer.line("checkedIndex(left); checkedIndex(right)")
	g.writer.line("if right > maxSharedIndex-left { panic(\"shared numeric overflow\") }")
	g.writer.line("return left + right")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func checkedSubtract(left int, right int) int {")
	g.writer.indent++
	g.writer.line("checkedIndex(left); checkedIndex(right)")
	g.writer.line("if right > left { panic(\"shared numeric underflow\") }")
	g.writer.line("return left - right")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func checkedChar(value rune) rune {")
	g.writer.indent++
	g.writer.line("if value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) { panic(\"invalid Unicode scalar\") }")
	g.writer.line("return value")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func asciiLowercase(value rune) rune {")
	g.writer.indent++
	g.writer.line("checkedChar(value)")
	g.writer.line("if value >= 'A' && value <= 'Z' { return value + ('a' - 'A') }")
	g.writer.line("return value")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func checkedString(value string) string {")
	g.writer.indent++
	g.writer.line("if len(value) > maxSharedIndex || !utf8.ValidString(value) { panic(\"invalid or oversized string\") }")
	g.writer.line("return value")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("func checkedChars(value []rune) []rune {")
	g.writer.indent++
	g.writer.line("if len(value) > maxSharedIndex { panic(\"vector outside shared numeric range\") }")
	g.writer.line("result := make([]rune, len(value))")
	g.writer.line("for index, character := range value { result[index] = checkedChar(character) }")
	g.writer.line("return result")
	g.writer.indent--
	g.writer.line("}")
	g.writer.line("")
}

func (g *generator) item(value *node) {
	if value == nil {
		reject("missing item")
	}
	switch value.Kind {
	case "constant":
		g.writer.line("const " + value.Name + " = " + g.expression(value.Value))
	case "struct":
		g.writer.line("type " + value.Name + " struct {")
		g.writer.indent++
		for _, field := range value.Fields {
			g.writer.line(field.Name + " " + g.typeName(field.Type))
		}
		g.writer.indent--
		g.writer.line("}")
		g.writer.line("func copy" + value.Name + "(value " + value.Name + ") " + value.Name + " {")
		g.writer.indent++
		fields := make([]string, 0, len(value.Fields))
		for _, field := range value.Fields {
			fields = append(fields, field.Name+": "+g.detach("value."+field.Name, field.Type))
		}
		g.writer.line("return " + value.Name + "{" + strings.Join(fields, ", ") + "}")
		g.writer.indent--
		g.writer.line("}")
	case "enum":
		g.enums[value.Name] = value.Variants
		g.writer.line("type " + value.Name + "Kind uint8")
		g.writer.line("const (")
		g.writer.indent++
		for index, variant := range value.Variants {
			line := value.Name + variant.Name
			if index == 0 {
				line += " " + value.Name + "Kind = iota"
			}
			g.writer.line(line)
		}
		g.writer.indent--
		g.writer.line(")")
		g.writer.line("type " + value.Name + " struct {")
		g.writer.indent++
		g.writer.line("kind " + value.Name + "Kind")
		for _, variant := range value.Variants {
			if variant.Payload != nil {
				g.writer.line(strings.ToLower(variant.Name) + " " + g.typeName(variant.Payload))
			}
		}
		g.writer.indent--
		g.writer.line("}")
		g.writer.line("func copy" + value.Name + "(value " + value.Name + ") " + value.Name + " {")
		g.writer.indent++
		g.writer.line("switch value.kind {")
		g.writer.indent++
		for _, variant := range value.Variants {
			fields := "kind: " + value.Name + variant.Name
			if variant.Payload != nil {
				name := strings.ToLower(variant.Name)
				fields += ", " + name + ": " + g.detach("value."+name, variant.Payload)
			}
			g.writer.line("case " + value.Name + variant.Name + ": return " + value.Name + "{" + fields + "}")
		}
		g.writer.indent--
		g.writer.line("}")
		g.writer.line("panic(\"unknown enum variant\")")
		g.writer.indent--
		g.writer.line("}")
	case "function":
		parameters := make([]string, 0, len(value.Parameters))
		for _, parameter := range value.Parameters {
			parameters = append(parameters, parameter.Name+" "+g.typeName(parameter.Type))
		}
		g.writer.line(fmt.Sprintf("func %s(%s) %s {", value.Name, strings.Join(parameters, ", "), g.typeName(value.ReturnType)))
		g.writer.indent++
		for _, parameter := range value.Parameters {
			if detached := g.detach(parameter.Name, parameter.Type); detached != parameter.Name {
				g.writer.line(parameter.Name + " = " + detached)
			}
		}
		g.statements(value.Body)
		g.writer.indent--
		g.writer.line("}")
	default:
		reject("unknown item kind " + value.Kind)
	}
	g.writer.line("")
}

func Transpile(input []byte) (output []byte, err error) {
	defer func() {
		if value := recover(); value != nil {
			if contract, ok := value.(contractError); ok {
				err = fmt.Errorf("AST contract violation: %s", contract)
				output = nil
			} else {
				panic(value)
			}
		}
	}()
	decoder := json.NewDecoder(bytes.NewReader(input))
	decoder.DisallowUnknownFields()
	var document document
	if err := decoder.Decode(&document); err != nil {
		return nil, err
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return nil, fmt.Errorf("trailing JSON: %v", err)
	}
	if document.SchemaVersion != 1 {
		return nil, fmt.Errorf("unsupported AST version %d", document.SchemaVersion)
	}
	generator := generator{enums: make(map[string][]variant), types: make(map[string]bool)}
	generator.writer.line("package generated")
	generator.writer.line("")
	generator.writer.line("import \"unicode/utf8\"")
	generator.writer.line("")
	generator.prelude()
	for _, item := range document.Items {
		if item != nil && item.Kind == "enum" {
			generator.enums[item.Name] = item.Variants
		}
		if item != nil && (item.Kind == "enum" || item.Kind == "struct") {
			generator.types[item.Name] = true
		}
	}
	for _, item := range document.Items {
		generator.item(item)
	}
	return format.Source([]byte(generator.writer.text.String()))
}
