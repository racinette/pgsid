package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"strconv"
	"unsafe"
)

type wireFile struct {
	Package      string       `json:"package"`
	Source       string       `json:"source,omitempty"`
	Imports      []wireImport `json:"imports"`
	Declarations []wireNode   `json:"declarations"`
}

type wireImport struct {
	Alias string `json:"alias,omitempty"`
	Path  string `json:"path"`
}

type wireField struct {
	Names []string `json:"names,omitempty"`
	Type  wireNode `json:"type"`
	Tag   string   `json:"tag,omitempty"`
}

type wireNode struct {
	Kind        string      `json:"kind"`
	Name        string      `json:"name,omitempty"`
	Value       string      `json:"value,omitempty"`
	Type        *wireNode   `json:"type,omitempty"`
	Left        *wireNode   `json:"left,omitempty"`
	Right       *wireNode   `json:"right,omitempty"`
	Expression  *wireNode   `json:"expression,omitempty"`
	Fields      []wireField `json:"fields,omitempty"`
	Parameters  []wireField `json:"parameters,omitempty"`
	Results     []wireField `json:"results,omitempty"`
	Receiver    []wireField `json:"receiver,omitempty"`
	Body        []wireNode  `json:"body,omitempty"`
	Arguments   []wireNode  `json:"arguments,omitempty"`
	Elements    []wireNode  `json:"elements,omitempty"`
	Targets     []wireNode  `json:"targets,omitempty"`
	Expressions []wireNode  `json:"expressions,omitempty"`
	Operator    string      `json:"operator,omitempty"`
	Condition   *wireNode   `json:"condition,omitempty"`
	Init        *wireNode   `json:"init,omitempty"`
}

var input, output []byte

//go:wasmexport alloc
func alloc(size uint32) uint32 {
	if size == 0 {
		input = nil
		return 0
	}
	input = make([]byte, size)
	return uint32(uintptr(unsafe.Pointer(&input[0])))
}

//go:wasmexport render
func render() uint32 {
	var err error
	output, err = renderFile(input)
	if err != nil {
		output = []byte(err.Error())
		return 1
	}
	return 0
}

//go:wasmexport output_ptr
func outputPtr() uint32 {
	if len(output) == 0 {
		return 0
	}
	return uint32(uintptr(unsafe.Pointer(&output[0])))
}

//go:wasmexport output_len
func outputLen() uint32 {
	return uint32(len(output))
}

//go:wasmexport dispose
func dispose() {
	input = nil
	output = nil
}

func main() {}

func renderFile(input []byte) ([]byte, error) {
	var source wireFile
	if err := json.Unmarshal(input, &source); err != nil {
		return nil, fmt.Errorf("decode AST: %w", err)
	}
	if !token.IsIdentifier(source.Package) {
		return nil, fmt.Errorf("invalid package identifier %q", source.Package)
	}

	file := &ast.File{Name: ast.NewIdent(source.Package)}
	var runtimeDecls []ast.Decl
	if source.Source != "" {
		parsed, err := parser.ParseFile(token.NewFileSet(), "runtime.go", source.Source, 0)
		if err != nil {
			return nil, fmt.Errorf("parse runtime: %w", err)
		}
		if parsed.Name.Name != source.Package {
			return nil, fmt.Errorf("runtime package does not match %q", source.Package)
		}
		for _, decl := range parsed.Decls {
			if gen, ok := decl.(*ast.GenDecl); ok && gen.Tok == token.IMPORT {
				for _, spec := range gen.Specs {
					imp := spec.(*ast.ImportSpec)
					path, err := strconv.Unquote(imp.Path.Value)
					if err != nil {
						return nil, err
					}
					alias := ""
					if imp.Name != nil {
						alias = imp.Name.Name
					}
					source.Imports = append(source.Imports, wireImport{Path: path, Alias: alias})
				}
			} else {
				runtimeDecls = append(runtimeDecls, decl)
			}
		}
	}
	if len(source.Imports) > 0 {
		specs := make([]ast.Spec, 0, len(source.Imports))
		seenImports := make(map[string]string)
		for _, item := range source.Imports {
			if alias, ok := seenImports[item.Path]; ok {
				if alias != item.Alias {
					return nil, fmt.Errorf("conflicting aliases for import %q", item.Path)
				}
				continue
			}
			seenImports[item.Path] = item.Alias
			spec := &ast.ImportSpec{Path: &ast.BasicLit{Kind: token.STRING, Value: strconv.Quote(item.Path)}}
			if item.Alias != "" {
				if !token.IsIdentifier(item.Alias) {
					return nil, fmt.Errorf("invalid import alias %q", item.Alias)
				}
				spec.Name = ast.NewIdent(item.Alias)
			}
			specs = append(specs, spec)
		}
		file.Decls = append(file.Decls, &ast.GenDecl{Tok: token.IMPORT, Specs: specs})
	}
	file.Decls = append(file.Decls, runtimeDecls...)
	for index := range source.Declarations {
		declaration, err := declaration(&source.Declarations[index])
		if err != nil {
			return nil, fmt.Errorf("declaration %d: %w", index, err)
		}
		file.Decls = append(file.Decls, declaration)
	}

	var result bytes.Buffer
	if err := format.Node(&result, token.NewFileSet(), file); err != nil {
		return nil, fmt.Errorf("format AST: %w", err)
	}
	return result.Bytes(), nil
}

func declaration(node *wireNode) (ast.Decl, error) {
	if !token.IsIdentifier(node.Name) {
		return nil, fmt.Errorf("invalid declaration identifier %q", node.Name)
	}
	switch node.Kind {
	case "function":
		parameters, err := fieldList(node.Parameters)
		if err != nil {
			return nil, err
		}
		results, err := fieldList(node.Results)
		if err != nil {
			return nil, err
		}
		body, err := block(node.Body)
		if err != nil {
			return nil, err
		}
		result := &ast.FuncDecl{Name: ast.NewIdent(node.Name), Type: &ast.FuncType{Params: parameters, Results: results}, Body: body}
		if len(node.Receiver) > 0 {
			result.Recv, err = fieldList(node.Receiver)
			if err != nil {
				return nil, err
			}
		}
		return result, nil
	case "const":
		value, err := expression(node.Expression)
		if err != nil {
			return nil, err
		}
		spec := &ast.ValueSpec{Names: []*ast.Ident{ast.NewIdent(node.Name)}, Values: []ast.Expr{value}}
		if node.Type != nil {
			spec.Type, err = expression(node.Type)
			if err != nil {
				return nil, err
			}
		}
		return &ast.GenDecl{Tok: token.CONST, Specs: []ast.Spec{spec}}, nil
	case "type":
		value, err := expression(node.Type)
		if err != nil {
			return nil, err
		}
		return &ast.GenDecl{Tok: token.TYPE, Specs: []ast.Spec{&ast.TypeSpec{Name: ast.NewIdent(node.Name), Type: value}}}, nil
	default:
		return nil, fmt.Errorf("unsupported declaration kind %q", node.Kind)
	}
}

func expression(node *wireNode) (ast.Expr, error) {
	if node == nil {
		return nil, fmt.Errorf("missing expression")
	}
	switch node.Kind {
	case "ident":
		if !token.IsIdentifier(node.Name) {
			return nil, fmt.Errorf("invalid identifier %q", node.Name)
		}
		return ast.NewIdent(node.Name), nil
	case "parsed":
		value, err := parser.ParseExpr(node.Value)
		if err != nil {
			return nil, fmt.Errorf("parse expression %q: %w", node.Value, err)
		}
		return value, nil
	case "string":
		return &ast.BasicLit{Kind: token.STRING, Value: strconv.Quote(node.Value)}, nil
	case "selector":
		left, err := expression(node.Left)
		if err != nil {
			return nil, err
		}
		if !token.IsIdentifier(node.Name) {
			return nil, fmt.Errorf("invalid selector %q", node.Name)
		}
		return &ast.SelectorExpr{X: left, Sel: ast.NewIdent(node.Name)}, nil
	case "index":
		left, err := expression(node.Left)
		if err != nil {
			return nil, err
		}
		right, err := expression(node.Right)
		if err != nil {
			return nil, err
		}
		return &ast.IndexExpr{X: left, Index: right}, nil
	case "pointer":
		value, err := expression(node.Type)
		if err != nil {
			return nil, err
		}
		return &ast.StarExpr{X: value}, nil
	case "slice":
		value, err := expression(node.Type)
		if err != nil {
			return nil, err
		}
		return &ast.ArrayType{Elt: value}, nil
	case "map":
		key, err := expression(node.Left)
		if err != nil {
			return nil, err
		}
		value, err := expression(node.Right)
		if err != nil {
			return nil, err
		}
		return &ast.MapType{Key: key, Value: value}, nil
	case "struct":
		fields, err := fieldList(node.Fields)
		if err != nil {
			return nil, err
		}
		return &ast.StructType{Fields: fields}, nil
	case "interface":
		fields, err := fieldList(node.Fields)
		if err != nil {
			return nil, err
		}
		return &ast.InterfaceType{Methods: fields}, nil
	case "function-type":
		parameters, err := fieldList(node.Parameters)
		if err != nil {
			return nil, err
		}
		results, err := fieldList(node.Results)
		if err != nil {
			return nil, err
		}
		return &ast.FuncType{Params: parameters, Results: results}, nil
	case "ellipsis":
		value, err := expression(node.Type)
		if err != nil {
			return nil, err
		}
		return &ast.Ellipsis{Elt: value}, nil
	case "number":
		if _, err := strconv.ParseInt(node.Value, 10, 64); err != nil {
			return nil, fmt.Errorf("invalid integer %q", node.Value)
		}
		return &ast.BasicLit{Kind: token.INT, Value: node.Value}, nil
	case "call":
		function, err := expression(node.Expression)
		if err != nil {
			return nil, err
		}
		arguments, err := expressionList(node.Arguments)
		if err != nil {
			return nil, err
		}
		return &ast.CallExpr{Fun: function, Args: arguments}, nil
	case "unary":
		value, err := expression(node.Expression)
		if err != nil {
			return nil, err
		}
		if node.Operator == "*" {
			return &ast.StarExpr{X: value}, nil
		}
		if node.Operator != "&" {
			return nil, fmt.Errorf("unsupported unary operator %q", node.Operator)
		}
		return &ast.UnaryExpr{Op: token.AND, X: value}, nil
	case "binary", "key-value":
		left, err := expression(node.Left)
		if err != nil {
			return nil, err
		}
		right, err := expression(node.Right)
		if err != nil {
			return nil, err
		}
		if node.Kind == "key-value" {
			return &ast.KeyValueExpr{Key: left, Value: right}, nil
		}
		if node.Operator != "!=" {
			return nil, fmt.Errorf("unsupported binary operator %q", node.Operator)
		}
		return &ast.BinaryExpr{X: left, Op: token.NEQ, Y: right}, nil
	case "composite":
		value, err := expression(node.Type)
		if err != nil {
			return nil, err
		}
		elements, err := expressionList(node.Elements)
		if err != nil {
			return nil, err
		}
		return &ast.CompositeLit{Type: value, Elts: elements}, nil
	default:
		return nil, fmt.Errorf("unsupported expression kind %q", node.Kind)
	}
}

func fieldList(fields []wireField) (*ast.FieldList, error) {
	result := &ast.FieldList{}
	for index := range fields {
		field := &fields[index]
		value, err := expression(&field.Type)
		if err != nil {
			return nil, fmt.Errorf("field %d: %w", index, err)
		}
		item := &ast.Field{Type: value}
		for _, name := range field.Names {
			if !token.IsIdentifier(name) {
				return nil, fmt.Errorf("invalid field identifier %q", name)
			}
			item.Names = append(item.Names, ast.NewIdent(name))
		}
		if field.Tag != "" {
			item.Tag = &ast.BasicLit{Kind: token.STRING, Value: "`" + field.Tag + "`"}
		}
		result.List = append(result.List, item)
	}
	return result, nil
}

func expressionList(nodes []wireNode) ([]ast.Expr, error) {
	result := make([]ast.Expr, 0, len(nodes))
	for index := range nodes {
		value, err := expression(&nodes[index])
		if err != nil {
			return nil, err
		}
		result = append(result, value)
	}
	return result, nil
}

func block(nodes []wireNode) (*ast.BlockStmt, error) {
	result := &ast.BlockStmt{}
	for index := range nodes {
		value, err := statement(&nodes[index])
		if err != nil {
			return nil, fmt.Errorf("statement %d: %w", index, err)
		}
		result.List = append(result.List, value)
	}
	return result, nil
}

func statement(node *wireNode) (ast.Stmt, error) {
	switch node.Kind {
	case "assign":
		targets, err := expressionList(node.Targets)
		if err != nil {
			return nil, err
		}
		values, err := expressionList(node.Expressions)
		if err != nil {
			return nil, err
		}
		operator := token.ASSIGN
		if node.Operator == ":=" {
			operator = token.DEFINE
		} else if node.Operator != "=" {
			return nil, fmt.Errorf("unsupported assignment operator %q", node.Operator)
		}
		return &ast.AssignStmt{Lhs: targets, Tok: operator, Rhs: values}, nil
	case "local-type":
		copy := *node
		copy.Kind = "type"
		decl, err := declaration(&copy)
		if err != nil {
			return nil, err
		}
		return &ast.DeclStmt{Decl: decl}, nil
	case "var":
		if !token.IsIdentifier(node.Name) {
			return nil, fmt.Errorf("invalid variable identifier %q", node.Name)
		}
		value, err := expression(node.Type)
		if err != nil {
			return nil, err
		}
		return &ast.DeclStmt{Decl: &ast.GenDecl{Tok: token.VAR, Specs: []ast.Spec{&ast.ValueSpec{Names: []*ast.Ident{ast.NewIdent(node.Name)}, Type: value}}}}, nil
	case "return":
		values, err := expressionList(node.Expressions)
		if err != nil {
			return nil, err
		}
		return &ast.ReturnStmt{Results: values}, nil
	case "expression-statement", "defer":
		value, err := expression(node.Expression)
		if err != nil {
			return nil, err
		}
		if node.Kind == "expression-statement" {
			return &ast.ExprStmt{X: value}, nil
		}
		call, ok := value.(*ast.CallExpr)
		if !ok {
			return nil, fmt.Errorf("defer requires a call")
		}
		return &ast.DeferStmt{Call: call}, nil
	case "if", "for":
		condition, err := expression(node.Condition)
		if err != nil {
			return nil, err
		}
		body, err := block(node.Body)
		if err != nil {
			return nil, err
		}
		if node.Kind == "for" {
			return &ast.ForStmt{Cond: condition, Body: body}, nil
		}
		result := &ast.IfStmt{Cond: condition, Body: body}
		if node.Init != nil {
			result.Init, err = statement(node.Init)
			if err != nil {
				return nil, err
			}
		}
		return result, nil
	default:
		return nil, fmt.Errorf("unsupported statement kind %q", node.Kind)
	}
}
