package transpiler

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"io"
	"strings"
	"unicode"
	"unicode/utf8"
)

type node struct {
	Kind          string      `json:"kind"`
	Name          string      `json:"name"`
	Visibility    string      `json:"visibility"`
	Derives       []string    `json:"derives"`
	Type          *node       `json:"type"`
	ReturnType    *node       `json:"returnType"`
	TargetType    *node       `json:"targetType"`
	Inner         *node       `json:"inner"`
	Value         *node       `json:"value"`
	Digits        string      `json:"digits"`
	Scalar        string      `json:"scalar"`
	Boolean       bool        `json:"state"`
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
	ElseBody      []*node     `json:"elseBody"`
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

//go:embed runtime/prelude.go
var runtimeSource string

type generator struct {
	enums      map[string][]variant
	structs    map[string]*node
	types      map[string]bool
	names      map[string]string
	constants  map[string]*node
	functions  map[string]*node
	publicEnum map[string]bool
	locals     map[string]string
	localTypes map[string]*node
}

func casedName(name string, exported bool) string {
	parts := strings.Split(name, "_")
	for index, part := range parts {
		if part != "" {
			if strings.ToUpper(part) == part {
				part = strings.ToLower(part)
			}
			first, size := utf8.DecodeRuneInString(part)
			parts[index] = string(unicode.ToUpper(first)) + part[size:]
		}
	}
	result := strings.Join(parts, "")
	if !exported && result != "" {
		first, size := utf8.DecodeRuneInString(result)
		result = string(unicode.ToLower(first)) + result[size:]
	}
	return result
}

func (g *generator) name(name string) string {
	if generated, ok := g.names[name]; ok {
		return generated
	}
	return name
}

func (g *generator) fieldName(owner, name string) string {
	structure := g.structs[owner]
	if structure != nil {
		for _, field := range structure.Fields {
			if field.Name == name {
				return casedName(name, field.Visibility == "public")
			}
		}
	}
	reject("unknown struct field " + owner + "." + name)
	return ""
}

func namedType(name string) *node {
	return &node{Kind: "path", Segments: []string{name}}
}

func (g *generator) inferType(value *node) *node {
	if value == nil {
		return nil
	}
	switch value.Kind {
	case "path":
		if len(value.Segments) == 1 {
			if local := g.localTypes[value.Segments[0]]; local != nil {
				return local
			}
			return g.constants[value.Segments[0]]
		}
		if len(value.Segments) == 2 {
			return namedType(value.Segments[0])
		}
	case "parenthesized":
		return g.inferType(value.Inner)
	case "struct-literal":
		return namedType(strings.Join(value.Path, "::"))
	case "field":
		base := g.inferType(value.Base)
		if base != nil && base.Kind == "path" {
			structure := g.structs[path(base)]
			if structure != nil {
				for _, field := range structure.Fields {
					if field.Name == value.Member {
						return field.Type
					}
				}
			}
		}
	case "integer":
		return namedType("usize")
	case "character":
		return namedType("char")
	case "boolean":
		return namedType("bool")
	case "cast":
		return value.TargetType
	case "binary":
		if value.Operator == "add" || value.Operator == "subtract" {
			return g.inferType(value.Left)
		}
		return namedType("bool")
	case "index":
		base := g.inferType(value.Base)
		if base != nil && path(base) == "Vec" && len(base.TypeArguments) == 1 && path(base.TypeArguments[0]) == "usize" {
			return namedType("usize")
		}
		return namedType("char")
	case "method-call":
		switch value.Method {
		case "len":
			return namedType("usize")
		case "to_ascii_lowercase":
			return namedType("char")
		case "collect":
			return &node{Kind: "path", Segments: []string{"Vec"}, TypeArguments: []*node{namedType("char")}}
		}
	case "call":
		if value.Callee != nil && len(value.Callee.Segments) == 1 {
			if function := g.functions[value.Callee.Segments[0]]; function != nil {
				return function.ReturnType
			}
		}
		if value.Callee != nil && len(value.Callee.Segments) == 2 && value.Callee.Segments[0] == "Vec" && value.Callee.Segments[1] == "new" {
			return &node{Kind: "path", Segments: []string{"Vec"}, TypeArguments: []*node{namedType("usize")}}
		}
		if value.Callee != nil && len(value.Callee.Segments) == 2 {
			return namedType(value.Callee.Segments[0])
		}
	}
	return nil
}

func (g *generator) fieldOwner(value *node) string {
	valueType := g.inferType(value)
	if valueType == nil || valueType.Kind != "path" {
		reject("cannot resolve struct field owner")
	}
	return path(valueType)
}

func cloneTypes(types map[string]*node) map[string]*node {
	copy := make(map[string]*node, len(types))
	for name, value := range types {
		copy[name] = value
	}
	return copy
}

func (g *generator) enumKindField(name string) string {
	if g.publicEnum[name] {
		return "Kind"
	}
	return "kind"
}

func (g *generator) enumPayloadField(name, variant string) string {
	if g.publicEnum[name] {
		return casedName(variant, true)
	}
	return casedName(variant, false)
}

func cloneLocals(locals map[string]string) map[string]string {
	copy := make(map[string]string, len(locals))
	for name, generated := range locals {
		copy[name] = generated
	}
	return copy
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
	generator := generator{
		enums: make(map[string][]variant), structs: make(map[string]*node),
		types: make(map[string]bool), names: make(map[string]string),
		constants:  make(map[string]*node),
		functions:  make(map[string]*node),
		publicEnum: make(map[string]bool),
	}
	for _, item := range document.Items {
		if item == nil {
			continue
		}
		generator.names[item.Name] = casedName(item.Name, item.Visibility == "public")
		if item.Kind == "constant" {
			generator.constants[item.Name] = item.Type
		}
		if item.Kind == "function" {
			generator.functions[item.Name] = item
		}
		if item != nil && item.Kind == "enum" {
			generator.enums[item.Name] = item.Variants
			generator.publicEnum[item.Name] = item.Visibility == "public"
		}
		if item != nil && (item.Kind == "enum" || item.Kind == "struct") {
			generator.types[item.Name] = true
		}
		if item.Kind == "struct" {
			generator.structs[item.Name] = item
		}
	}
	fset := token.NewFileSet()
	runtime, parseError := parser.ParseFile(fset, "runtime/prelude.go", runtimeSource, 0)
	if parseError != nil {
		return nil, parseError
	}
	file := &ast.File{Name: ast.NewIdent("generated"), Decls: append([]ast.Decl(nil), runtime.Decls...)}
	for _, item := range document.Items {
		file.Decls = append(file.Decls, generator.goItem(item)...)
	}
	var outputBuffer bytes.Buffer
	if formatError := format.Node(&outputBuffer, fset, file); formatError != nil {
		return nil, formatError
	}
	return outputBuffer.Bytes(), nil
}
