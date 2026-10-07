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
	"reflect"
	"strings"
	"unicode"
	"unicode/utf8"
)

type node struct {
	Kind           string      `json:"kind"`
	Module         string      `json:"module,omitempty"`
	SourceFile     string      `json:"sourceFile,omitempty"`
	Name           string      `json:"name"`
	Visibility     string      `json:"visibility"`
	Derives        []string    `json:"derives"`
	Type           *node       `json:"type"`
	ReturnType     *node       `json:"returnType"`
	TargetType     *node       `json:"targetType"`
	Inner          *node       `json:"inner"`
	Value          *node       `json:"value"`
	Fallback       *node       `json:"fallback"`
	IntegerType    string      `json:"integerType"`
	Digits         string      `json:"digits"`
	Scalar         string      `json:"scalar"`
	Text           string      `json:"text"`
	Boolean        bool        `json:"state"`
	Left           *node       `json:"left"`
	Right          *node       `json:"right"`
	Base           *node       `json:"base"`
	Index          *node       `json:"index"`
	Receiver       *node       `json:"receiver"`
	Callee         *node       `json:"callee"`
	Condition      *node       `json:"condition"`
	Source         *node       `json:"source"`
	EnumName       string      `json:"enumName"`
	Variant        string      `json:"variant"`
	PayloadBinding *string     `json:"payloadBinding"`
	Initializer    *node       `json:"initializer"`
	Payload        *node       `json:"payload"`
	TypeArguments  []*node     `json:"typeArguments"`
	Fields         []field     `json:"fields"`
	Variants       []variant   `json:"variants"`
	Parameters     []parameter `json:"parameters"`
	Body           []*node     `json:"body"`
	ElseBody       []*node     `json:"elseBody"`
	Elements       []*node     `json:"elements"`
	Arguments      []*node     `json:"arguments"`
	Segments       []string    `json:"segments"`
	Path           []string    `json:"path"`
	Operator       string      `json:"operator"`
	Member         string      `json:"member"`
	Method         string      `json:"method"`
	Semicolon      bool        `json:"semicolon"`
	Binding        binding     `json:"binding"`
	Mutable        bool        `json:"mutable"`
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
	SchemaVersion int            `json:"schemaVersion"`
	Items         []*node        `json:"items"`
	Modules       []sourceModule `json:"modules,omitempty"`
}

type sourceModule struct {
	Name         string   `json:"name"`
	Dependencies []string `json:"dependencies"`
}

type Options struct {
	ImmutableValueTypes []string `json:"immutableValueTypes"`
	Split               bool     `json:"split,omitempty"`
	SchemaImportPath    string   `json:"schemaImportPath,omitempty"`
}

type configuredInput struct {
	AST     json.RawMessage `json:"ast"`
	Options Options         `json:"options"`
}

func TranspileConfigured(input []byte) ([]byte, error) {
	decoder := json.NewDecoder(bytes.NewReader(input))
	decoder.DisallowUnknownFields()
	var configured configuredInput
	if err := decoder.Decode(&configured); err != nil {
		return nil, err
	}
	if len(configured.AST) == 0 {
		return nil, fmt.Errorf("missing configured AST")
	}
	return TranspileWithOptions(configured.AST, configured.Options)
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
	immutable  map[string]bool
	locals     map[string]string
	localTypes map[string]*node
}

func schemaFunctionName(name string) string {
	const prefix = "sql__pg_catalog__"
	if strings.HasPrefix(name, "sql__") && !strings.HasPrefix(name, prefix) {
		reject("unsupported CHECK operation schema in " + name)
	}
	if !strings.HasPrefix(name, prefix) {
		return name
	}
	return strings.TrimPrefix(name, prefix)
}

// qualifyModuleReferences replaces expression identifiers with selectors while
// leaving declaration names, field names, and local bindings untouched.
func qualifyModuleReferences(value reflect.Value, owned map[*ast.Object]bool, module string) {
	if !value.IsValid() {
		return
	}
	switch value.Kind() {
	case reflect.Interface:
		if value.IsNil() {
			return
		}
		if value.CanSet() {
			if identifier, ok := value.Interface().(*ast.Ident); ok && owned[identifier.Obj] {
				value.Set(reflect.ValueOf(&ast.SelectorExpr{
					X:   &ast.Ident{Name: module, NamePos: identifier.NamePos},
					Sel: identifier,
				}))
				return
			}
		}
		qualifyModuleReferences(value.Elem(), owned, module)
	case reflect.Pointer:
		if !value.IsNil() {
			if _, ok := value.Interface().(*ast.Ident); ok {
				return
			}
			if pair, ok := value.Interface().(*ast.KeyValueExpr); ok {
				qualifyModuleReferences(reflect.ValueOf(pair).Elem().FieldByName("Value"), owned, module)
				return
			}
			qualifyModuleReferences(value.Elem(), owned, module)
		}
	case reflect.Struct:
		for index := 0; index < value.NumField(); index++ {
			field := value.Field(index)
			if field.CanInterface() {
				qualifyModuleReferences(field, owned, module)
			}
		}
	case reflect.Slice:
		for index := 0; index < value.Len(); index++ {
			qualifyModuleReferences(value.Index(index), owned, module)
		}
	}
}

func inspectModuleIdentifiers(node ast.Node, visit func(*ast.Ident)) {
	ast.Inspect(node, func(node ast.Node) bool {
		switch value := node.(type) {
		case *ast.KeyValueExpr:
			inspectModuleIdentifiers(value.Value, visit)
			return false
		case *ast.SelectorExpr:
			inspectModuleIdentifiers(value.X, visit)
			return false
		case *ast.Ident:
			visit(value)
		}
		return true
	})
}

func opaqueStruct(value *node) bool {
	if value == nil || value.Kind != "struct" || value.Visibility != "public" || len(value.Fields) == 0 {
		return false
	}
	for _, field := range value.Fields {
		if field.Visibility != "private" {
			return false
		}
	}
	return true
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
	case "borrow":
		return &node{Kind: "reference", Inner: g.inferType(value.Value)}
	case "struct-literal":
		return namedType(strings.Join(value.Path, "::"))
	case "field":
		base := g.inferType(value.Base)
		if base != nil && base.Kind == "reference" {
			base = base.Inner
		}
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
		if value.IntegerType == "i64" {
			return namedType("i64")
		}
		return namedType("usize")
	case "unary":
		if value.Operator == "negate" {
			return namedType("i32")
		}
	case "character", "character-from-codepoint":
		return namedType("char")
	case "boolean":
		return namedType("bool")
	case "string":
		return &node{Kind: "reference", Inner: namedType("str")}
	case "cast":
		return value.TargetType
	case "binary":
		if value.Operator == "add" || value.Operator == "subtract" || value.Operator == "multiply" || value.Operator == "divide" || value.Operator == "remainder" {
			if path(g.inferType(value.Left)) == "i32" || path(g.inferType(value.Right)) == "i32" {
				return namedType("i32")
			}
			return g.inferType(value.Left)
		}
		return namedType("bool")
	case "index":
		base := g.inferType(value.Base)
		if base != nil && base.Kind == "reference" && base.Inner.Kind == "slice" {
			return base.Inner.Inner
		}
		if base != nil && path(base) == "Vec" && len(base.TypeArguments) == 1 {
			return base.TypeArguments[0]
		}
		return nil
	case "method-call":
		switch value.Method {
		case "len":
			return namedType("usize")
		case "to_ascii_lowercase":
			return namedType("char")
		case "to_owned":
			return namedType("String")
		case "as_str":
			return &node{Kind: "reference", Inner: namedType("str")}
		case "clone":
			return g.inferType(value.Receiver)
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
	if valueType != nil && valueType.Kind == "reference" {
		valueType = valueType.Inner
	}
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

func Transpile(input []byte) ([]byte, error) {
	return TranspileWithOptions(input, Options{})
}

func TranspileWithOptions(input []byte, options Options) (output []byte, err error) {
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
		immutable:  make(map[string]bool),
	}
	for _, item := range document.Items {
		if item == nil {
			continue
		}
		generatedName := item.Name
		if options.Split && item.Module != "regex_engine" {
			generatedName = schemaFunctionName(generatedName)
		}
		exported := item.Visibility == "public" && !(options.Split && item.Module == "regex_engine" && item.Kind == "function")
		if options.Split && strings.HasPrefix(item.Name, "sql__pg_catalog__") {
			exported = true
		}
		generator.names[item.Name] = casedName(generatedName, exported)
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
	for _, name := range options.ImmutableValueTypes {
		generator.immutable[name] = true
	}
	for name := range generator.immutable {
		item := generator.structs[name]
		if item == nil {
			for _, candidate := range document.Items {
				if candidate != nil && candidate.Kind == "enum" && candidate.Name == name {
					item = candidate
					break
				}
			}
		}
		if item == nil || !hasDerive(item, "Clone") || opaqueStruct(item) {
			return nil, fmt.Errorf("immutable value type must be a nonopaque Clone type: %s", name)
		}
		if item.Kind == "struct" {
			for _, field := range item.Fields {
				if !generator.immutableField(field.Type) {
					return nil, fmt.Errorf("immutable value type has an unsupported field: %s", name)
				}
			}
		} else {
			for _, variant := range item.Variants {
				if variant.Payload != nil && !generator.immutableField(variant.Payload) {
					return nil, fmt.Errorf("immutable value type has an unsupported field: %s", name)
				}
			}
		}
	}
	fset := token.NewFileSet()
	runtime, parseError := parser.ParseFile(fset, "runtime/prelude.go", runtimeSource, 0)
	if parseError != nil {
		return nil, parseError
	}
	file := &ast.File{Name: ast.NewIdent("generated"), Decls: append([]ast.Decl(nil), runtime.Decls...)}
	if !options.Split {
		for _, item := range document.Items {
			file.Decls = append(file.Decls, generator.goItem(item)...)
		}
		var outputBuffer bytes.Buffer
		if formatError := format.Node(&outputBuffer, fset, file); formatError != nil {
			return nil, formatError
		}
		return outputBuffer.Bytes(), nil
	}
	if options.SchemaImportPath == "" {
		return nil, fmt.Errorf("split CHECK output requires schema import path")
	}
	rootPath := strings.TrimSuffix(options.SchemaImportPath, "/pg_catalog")
	moduleOrder := []string{"langruntime", "checkruntime", "regex_engine", "pg_catalog", "checks"}
	packages := map[string]string{
		"langruntime": "langruntime", "checkruntime": "checkruntime",
		"regex_engine": "regexengine", "pg_catalog": "pg_catalog", "checks": "generated",
	}
	keys := map[string]string{
		"langruntime": "language", "checkruntime": "runtime", "regex_engine": "regex",
		"pg_catalog": "operations", "checks": "checks",
	}
	files := make(map[string]*ast.File)
	owned := make(map[string]map[string]bool)
	for _, module := range moduleOrder {
		files[module] = &ast.File{Name: ast.NewIdent(packages[module])}
		owned[module] = make(map[string]bool)
	}
	files["langruntime"].Decls = runtime.Decls
	collectDeclarationNames(runtime.Decls, owned["langruntime"])
	for _, item := range document.Items {
		file := files[item.Module]
		if file == nil || item.Module == "langruntime" {
			return nil, fmt.Errorf("CHECK item has no supported module: %s", item.Name)
		}
		declarations := generator.goItem(item)
		file.Decls = append(file.Decls, declarations...)
		collectDeclarationNames(declarations, owned[item.Module])
	}
	var flat bytes.Buffer
	var declarations []ast.Decl
	for _, module := range moduleOrder {
		declarations = append(declarations, files[module].Decls...)
	}
	if err := format.Node(&flat, fset, &ast.File{Name: goIdent("generated"), Decls: declarations}); err != nil {
		return nil, err
	}
	bound, err := parser.ParseFile(fset, "bindings.go", flat.Bytes(), 0)
	if err != nil {
		return nil, err
	}
	objects := make(map[string]map[*ast.Object]bool)
	offset := 0
	for _, module := range moduleOrder {
		length := len(files[module].Decls)
		files[module].Decls = bound.Decls[offset : offset+length]
		offset += length
		objects[module] = make(map[*ast.Object]bool)
		for name := range owned[module] {
			if object := bound.Scope.Objects[name]; object != nil {
				objects[module][object] = true
			}
		}
	}
	dependencies := make(map[string]map[string]bool)
	for _, module := range moduleOrder {
		dependencies[module] = make(map[string]bool)
		for _, owner := range moduleOrder {
			if owner == module {
				continue
			}
			used := make(map[string]bool)
			for _, declaration := range files[module].Decls {
				inspectModuleIdentifiers(declaration, func(identifier *ast.Ident) {
					if objects[owner][identifier.Obj] {
						used[identifier.Name] = true
					}
				})
			}
			if len(used) == 0 {
				continue
			}
			dependencies[module][owner] = true
			for name := range used {
				object := bound.Scope.Objects[name]
				exported := casedName(name, true)
				if exported == name {
					continue
				}
				for _, file := range files {
					for _, declaration := range file.Decls {
						inspectModuleIdentifiers(declaration, func(identifier *ast.Ident) {
							if identifier.Obj == object {
								identifier.Name = exported
							}
						})
					}
				}
				delete(owned[owner], name)
				owned[owner][exported] = true
			}
		}
	}
	result := make(map[string]string)
	for _, module := range moduleOrder {
		file := files[module]
		if len(file.Decls) == 0 {
			result[keys[module]] = ""
			continue
		}
		var imports []ast.Spec
		for _, owner := range moduleOrder {
			if !dependencies[module][owner] {
				continue
			}
			for _, declaration := range file.Decls {
				qualifyModuleReferences(reflect.ValueOf(declaration), objects[owner], packages[owner])
			}
			path := rootPath + "/" + packages[owner]
			if owner == "checks" {
				path = rootPath
			}
			imports = append(imports, &ast.ImportSpec{
				Name: ast.NewIdent(packages[owner]),
				Path: &ast.BasicLit{Kind: token.STRING, Value: fmt.Sprintf("%q", path)},
			})
		}
		if len(imports) > 0 {
			file.Decls = append([]ast.Decl{&ast.GenDecl{Tok: token.IMPORT, Specs: imports}}, file.Decls...)
		}
		var output bytes.Buffer
		if err := format.Node(&output, fset, file); err != nil {
			return nil, err
		}
		result[keys[module]] = output.String()
	}
	return json.Marshal(result)
}

func collectDeclarationNames(declarations []ast.Decl, names map[string]bool) {
	for _, declaration := range declarations {
		switch declaration := declaration.(type) {
		case *ast.FuncDecl:
			names[declaration.Name.Name] = true
		case *ast.GenDecl:
			for _, specification := range declaration.Specs {
				switch specification := specification.(type) {
				case *ast.TypeSpec:
					names[specification.Name.Name] = true
				case *ast.ValueSpec:
					for _, name := range specification.Names {
						names[name.Name] = true
					}
				}
			}
		}
	}
}

func hasDerive(item *node, name string) bool {
	for _, derive := range item.Derives {
		if derive == name {
			return true
		}
	}
	return false
}

func (g *generator) immutableField(value *node) bool {
	if value == nil {
		return false
	}
	if value.Kind == "reference" {
		return path(value.Inner) == "str"
	}
	switch path(value) {
	case "usize", "u32", "i32", "i64", "bool", "char", "String":
		return true
	default:
		return g.immutable[path(value)]
	}
}
