package transpiler

import (
	"go/ast"
	"go/token"
	"strconv"
	"strings"
)

func goIdent(name string) *ast.Ident { return ast.NewIdent(name) }

func goCall(name string, arguments ...ast.Expr) ast.Expr {
	return &ast.CallExpr{Fun: goIdent(name), Args: arguments}
}

func goSelect(base ast.Expr, member string) ast.Expr {
	return &ast.SelectorExpr{X: base, Sel: goIdent(member)}
}

func goKey(name string, value ast.Expr) ast.Expr {
	return &ast.KeyValueExpr{Key: goIdent(name), Value: value}
}

func goComposite(name string, fields ...ast.Expr) ast.Expr {
	return &ast.CompositeLit{Type: goIdent(name), Elts: fields}
}

func goInteger(value string) ast.Expr {
	return &ast.BasicLit{Kind: token.INT, Value: value}
}

func goString(value string) ast.Expr {
	return &ast.BasicLit{Kind: token.STRING, Value: strconv.Quote(value)}
}

func goAssign(left ast.Expr, right ast.Expr, operation token.Token) ast.Stmt {
	return &ast.AssignStmt{Lhs: []ast.Expr{left}, Tok: operation, Rhs: []ast.Expr{right}}
}

func goFunction(name string, parameters []*ast.Field, result ast.Expr, statements []ast.Stmt) ast.Decl {
	return &ast.FuncDecl{
		Name: goIdent(name),
		Type: &ast.FuncType{Params: &ast.FieldList{List: parameters}, Results: &ast.FieldList{List: []*ast.Field{{Type: result}}}},
		Body: &ast.BlockStmt{List: statements},
	}
}

func (g *generator) goType(value *node) ast.Expr {
	if value == nil {
		reject("missing type")
	}
	if value.Kind == "reference" {
		if path(value.Inner) != "str" {
			reject("unsupported reference type")
		}
		return goIdent("string")
	}
	if value.Kind != "path" {
		reject("unsupported type kind " + value.Kind)
	}
	name := path(value)
	if len(value.TypeArguments) != 0 {
		if name != "Vec" || len(value.TypeArguments) != 1 {
			reject("unsupported generic type")
		}
		switch path(value.TypeArguments[0]) {
		case "char":
			return &ast.ArrayType{Elt: goIdent("rune")}
		case "usize":
			return &ast.ArrayType{Elt: goIdent("int")}
		default:
			if g.types[path(value.TypeArguments[0])] {
				return &ast.ArrayType{Elt: g.goType(value.TypeArguments[0])}
			}
			reject("unsupported vector element type")
			return nil
		}
	}
	switch name {
	case "usize", "u32", "i32":
		return goIdent("int")
	case "bool":
		return goIdent("bool")
	case "char":
		return goIdent("rune")
	case "str":
		return goIdent("string")
	default:
		if g.types[name] {
			return goIdent(g.name(name))
		}
		reject("unsupported type " + name)
		return nil
	}
}

func (g *generator) goDetach(value ast.Expr, valueType *node) ast.Expr {
	if valueType.Kind == "reference" {
		return goCall("checkedString", value)
	}
	name := path(valueType)
	switch name {
	case "usize", "u32":
		return goCall("checkedIndex", value)
	case "i32":
		return goCall("checkedI32", value)
	case "char":
		return goCall("checkedChar", value)
	case "Vec":
		if len(valueType.TypeArguments) == 1 && path(valueType.TypeArguments[0]) == "usize" {
			return goCall("checkedIndices", value)
		}
		if len(valueType.TypeArguments) == 1 && path(valueType.TypeArguments[0]) == "char" {
			return goCall("checkedChars", value)
		}
		if len(valueType.TypeArguments) == 1 && g.types[path(valueType.TypeArguments[0])] {
			return goCall("checkedStructs", value, goIdent("copy"+g.name(path(valueType.TypeArguments[0]))))
		}
		reject("unsupported vector element type")
		return nil
	default:
		if g.types[name] {
			return goCall("copy"+g.name(name), value)
		}
		return value
	}
}

func (g *generator) goExpression(value *node) ast.Expr {
	if value == nil {
		reject("missing expression")
	}
	switch value.Kind {
	case "path":
		if len(value.Segments) == 1 {
			name := value.Segments[0]
			if generated, ok := g.locals[name]; ok {
				return goIdent(generated)
			}
			return goIdent(g.name(name))
		}
		if len(value.Segments) == 2 {
			name, variantName := value.Segments[0], value.Segments[1]
			for _, variant := range g.enums[name] {
				if variant.Name == variantName && variant.Payload == nil {
					return goComposite(g.name(name), goKey(g.enumKindField(name), goIdent(g.name(name)+variantName)))
				}
			}
		}
		reject("unknown path " + strings.Join(value.Segments, "::"))
	case "integer":
		return goInteger(value.Digits)
	case "character":
		characters := []rune(value.Scalar)
		if len(characters) != 1 {
			reject("character literal must be one Unicode scalar")
		}
		return &ast.BasicLit{Kind: token.CHAR, Value: strconv.QuoteRune(characters[0])}
	case "boolean":
		if value.Boolean {
			return goIdent("true")
		}
		return goIdent("false")
	case "parenthesized":
		return &ast.ParenExpr{X: g.goExpression(value.Inner)}
	case "cast":
		switch path(value.TargetType) {
		case "u32":
			return goCall("int", goCall("checkedChar", g.goExpression(value.Value)))
		case "usize":
			return goCall("checkedIndex", g.goExpression(value.Value))
		default:
			reject("unsupported cast target")
		}
	case "binary":
		left, right := g.goExpression(value.Left), g.goExpression(value.Right)
		switch value.Operator {
		case "add":
			return goCall("checkedAdd", left, right)
		case "subtract":
			return goCall("checkedSubtract", left, right)
		}
		operators := map[string]token.Token{
			"less-than": token.LSS, "less-or-equal": token.LEQ,
			"greater-than": token.GTR, "greater-or-equal": token.GEQ,
			"equal": token.EQL, "not-equal": token.NEQ,
			"and": token.LAND, "or": token.LOR,
		}
		operator, ok := operators[value.Operator]
		if !ok {
			reject("expression operator needs statement lowering: " + value.Operator)
		}
		if _, composite := left.(*ast.CompositeLit); composite {
			left = &ast.ParenExpr{X: left}
		}
		if _, composite := right.(*ast.CompositeLit); composite {
			right = &ast.ParenExpr{X: right}
		}
		return &ast.BinaryExpr{X: left, Op: operator, Y: right}
	case "field":
		return goSelect(g.goExpression(value.Base), g.fieldName(g.fieldOwner(value.Base), value.Member))
	case "index":
		return &ast.IndexExpr{X: g.goExpression(value.Base), Index: g.goExpression(value.Index)}
	case "method-call":
		switch {
		case value.Method == "len" && len(value.Arguments) == 0:
			return goCall("len", g.goExpression(value.Receiver))
		case value.Method == "to_ascii_lowercase" && len(value.Arguments) == 0:
			return goCall("asciiLowercase", g.goExpression(value.Receiver))
		case value.Method == "collect" && len(value.Arguments) == 0 && value.Receiver != nil && value.Receiver.Kind == "method-call" && value.Receiver.Method == "chars" && len(value.Receiver.Arguments) == 0:
			return &ast.CallExpr{Fun: &ast.ArrayType{Elt: goIdent("rune")}, Args: []ast.Expr{g.goExpression(value.Receiver.Receiver)}}
		}
		reject("unsupported method " + value.Method)
	case "struct-literal":
		name := strings.Join(value.Path, "::")
		fields := make([]ast.Expr, 0, len(value.Fields))
		for _, field := range value.Fields {
			fields = append(fields, goKey(g.fieldName(name, field.Name), g.goExpression(field.Value)))
		}
		return goComposite(g.name(name), fields...)
	case "call":
		if value.Callee != nil && len(value.Callee.Segments) == 2 && value.Callee.Segments[0] == "Vec" && value.Callee.Segments[1] == "new" && len(value.Arguments) == 0 {
			return &ast.CompositeLit{Type: &ast.ArrayType{Elt: goIdent("int")}}
		}
		if value.Callee != nil && value.Callee.Kind == "path" && len(value.Callee.Segments) == 1 {
			name := value.Callee.Segments[0]
			function := g.functions[name]
			if function == nil || len(function.Parameters) != len(value.Arguments) {
				reject("unknown function or wrong argument count " + name)
			}
			arguments := make([]ast.Expr, 0, len(value.Arguments))
			for _, argument := range value.Arguments {
				arguments = append(arguments, g.goExpression(argument))
			}
			return goCall(g.name(name), arguments...)
		}
		if value.Callee == nil || value.Callee.Kind != "path" || len(value.Callee.Segments) != 2 || len(value.Arguments) != 1 {
			reject("unsupported call")
		}
		name, variantName := value.Callee.Segments[0], value.Callee.Segments[1]
		for _, variant := range g.enums[name] {
			if variant.Name == variantName && variant.Payload != nil {
				return goComposite(g.name(name),
					goKey(g.enumKindField(name), goIdent(g.name(name)+variantName)),
					goKey(g.enumPayloadField(name, variantName), g.goExpression(value.Arguments[0])))
			}
		}
		reject("unknown payload variant " + name + "::" + variantName)
	default:
		reject("expression needs statement lowering: " + value.Kind)
	}
	return nil
}

func (g *generator) goStatements(statements []*node) []ast.Stmt {
	result := make([]ast.Stmt, 0, len(statements))
	for index, statement := range statements {
		if statement == nil {
			reject("missing statement")
		}
		if statement.Kind == "local" {
			generated := casedName(statement.Binding.Name, false)
			value := g.goExpression(statement.Initializer)
			if statement.Type != nil && path(statement.Type) == "Vec" && len(statement.Type.TypeArguments) == 1 && statement.Initializer.Kind == "call" && statement.Initializer.Callee != nil && len(statement.Initializer.Callee.Segments) == 2 && statement.Initializer.Callee.Segments[0] == "Vec" && statement.Initializer.Callee.Segments[1] == "new" {
				value = &ast.CompositeLit{Type: g.goType(statement.Type)}
			}
			if statement.Type != nil {
				g.localTypes[statement.Binding.Name] = statement.Type
			} else {
				g.localTypes[statement.Binding.Name] = g.inferType(statement.Initializer)
			}
			g.locals[statement.Binding.Name] = generated
			result = append(result, goAssign(goIdent(generated), value, token.DEFINE))
			continue
		}
		if statement.Kind != "expression" || statement.Value == nil {
			reject("unsupported statement")
		}
		value := statement.Value
		switch value.Kind {
		case "return":
			result = append(result, &ast.ReturnStmt{Results: []ast.Expr{g.goExpression(value.Value)}})
		case "break":
			result = append(result, &ast.BranchStmt{Tok: token.BREAK})
		case "assign":
			result = append(result, goAssign(g.goExpression(value.Left), g.goDetach(g.goExpression(value.Right), g.inferType(value.Left)), token.ASSIGN))
		case "method-call":
			if value.Method == "push" && len(value.Arguments) == 1 {
				receiver := g.goExpression(value.Receiver)
				result = append(result, &ast.ExprStmt{X: goCall("checkedAdd", goCall("len", receiver), goInteger("1"))})
				receiverType := g.inferType(value.Receiver)
				if receiverType == nil || path(receiverType) != "Vec" || len(receiverType.TypeArguments) != 1 {
					reject("push receiver is not a vector")
				}
				element := receiverType.TypeArguments[0]
				result = append(result, goAssign(receiver, goCall("append", receiver, g.goDetach(g.goExpression(value.Arguments[0]), element)), token.ASSIGN))
				continue
			}
			generated := g.goExpression(value)
			if index == len(statements)-1 && !statement.Semicolon {
				result = append(result, &ast.ReturnStmt{Results: []ast.Expr{generated}})
			} else {
				result = append(result, &ast.ExprStmt{X: generated})
			}
		case "if", "while":
			condition := g.goExpression(value.Condition)
			originalLocals, originalTypes := g.locals, g.localTypes
			g.locals, g.localTypes = cloneLocals(originalLocals), cloneTypes(originalTypes)
			body := g.goStatements(value.Body)
			g.locals, g.localTypes = originalLocals, originalTypes
			if value.Kind == "while" {
				result = append(result, &ast.ForStmt{Cond: condition, Body: &ast.BlockStmt{List: body}})
				continue
			}
			branch := &ast.IfStmt{Cond: condition, Body: &ast.BlockStmt{List: body}}
			if value.ElseBody != nil {
				g.locals, g.localTypes = cloneLocals(originalLocals), cloneTypes(originalTypes)
				branch.Else = &ast.BlockStmt{List: g.goStatements(value.ElseBody)}
				g.locals, g.localTypes = originalLocals, originalTypes
			}
			result = append(result, branch)
		case "binary":
			if value.Operator == "add-assign" {
				left := g.goExpression(value.Left)
				result = append(result, goAssign(left, goCall("checkedAdd", left, g.goExpression(value.Right)), token.ASSIGN))
				continue
			}
			fallthrough
		default:
			generated := g.goExpression(value)
			if index == len(statements)-1 && !statement.Semicolon {
				result = append(result, &ast.ReturnStmt{Results: []ast.Expr{generated}})
			} else {
				result = append(result, &ast.ExprStmt{X: generated})
			}
		}
	}
	return result
}

func (g *generator) goItem(value *node) []ast.Decl {
	if value == nil {
		reject("missing item")
	}
	switch value.Kind {
	case "constant":
		return []ast.Decl{&ast.GenDecl{Tok: token.CONST, Specs: []ast.Spec{&ast.ValueSpec{
			Names: []*ast.Ident{goIdent(g.name(value.Name))}, Values: []ast.Expr{g.goExpression(value.Value)},
		}}}}
	case "struct":
		generated := g.name(value.Name)
		fields := make([]*ast.Field, 0, len(value.Fields))
		copyFields := make([]ast.Expr, 0, len(value.Fields))
		for _, field := range value.Fields {
			name := g.fieldName(value.Name, field.Name)
			fields = append(fields, &ast.Field{Names: []*ast.Ident{goIdent(name)}, Type: g.goType(field.Type)})
			copyFields = append(copyFields, goKey(name, g.goDetach(goSelect(goIdent("value"), name), field.Type)))
		}
		structure := &ast.GenDecl{Tok: token.TYPE, Specs: []ast.Spec{&ast.TypeSpec{Name: goIdent(generated), Type: &ast.StructType{Fields: &ast.FieldList{List: fields}}}}}
		copy := goFunction("copy"+generated, []*ast.Field{{Names: []*ast.Ident{goIdent("value")}, Type: goIdent(generated)}}, goIdent(generated), []ast.Stmt{
			&ast.ReturnStmt{Results: []ast.Expr{goComposite(generated, copyFields...)}},
		})
		return []ast.Decl{structure, copy}
	case "enum":
		generated := g.name(value.Name)
		kindField := g.enumKindField(value.Name)
		kindType := &ast.GenDecl{Tok: token.TYPE, Specs: []ast.Spec{&ast.TypeSpec{Name: goIdent(generated + "Kind"), Type: goIdent("uint8")}}}
		variants := make([]ast.Spec, 0, len(value.Variants))
		fields := []*ast.Field{{Names: []*ast.Ident{goIdent(kindField)}, Type: goIdent(generated + "Kind")}}
		cases := make([]ast.Stmt, 0, len(value.Variants))
		for index, variant := range value.Variants {
			variantName := generated + variant.Name
			spec := &ast.ValueSpec{Names: []*ast.Ident{goIdent(variantName)}}
			if index == 0 {
				spec.Type = goIdent(generated + "Kind")
				spec.Values = []ast.Expr{goIdent("iota")}
			}
			variants = append(variants, spec)
			values := []ast.Expr{goKey(kindField, goIdent(variantName))}
			if variant.Payload != nil {
				name := g.enumPayloadField(value.Name, variant.Name)
				fields = append(fields, &ast.Field{Names: []*ast.Ident{goIdent(name)}, Type: g.goType(variant.Payload)})
				values = append(values, goKey(name, g.goDetach(goSelect(goIdent("value"), name), variant.Payload)))
			}
			cases = append(cases, &ast.CaseClause{List: []ast.Expr{goIdent(variantName)}, Body: []ast.Stmt{
				&ast.ReturnStmt{Results: []ast.Expr{goComposite(generated, values...)}},
			}})
		}
		constants := &ast.GenDecl{Tok: token.CONST, Lparen: token.Pos(1), Specs: variants}
		structure := &ast.GenDecl{Tok: token.TYPE, Specs: []ast.Spec{&ast.TypeSpec{Name: goIdent(generated), Type: &ast.StructType{Fields: &ast.FieldList{List: fields}}}}}
		copy := goFunction("copy"+generated, []*ast.Field{{Names: []*ast.Ident{goIdent("value")}, Type: goIdent(generated)}}, goIdent(generated), []ast.Stmt{
			&ast.SwitchStmt{Tag: goSelect(goIdent("value"), kindField), Body: &ast.BlockStmt{List: cases}},
			&ast.ExprStmt{X: goCall("panic", goString("unknown enum variant"))},
		})
		return []ast.Decl{kindType, constants, structure, copy}
	case "function":
		g.locals, g.localTypes = make(map[string]string), make(map[string]*node)
		parameters := make([]*ast.Field, 0, len(value.Parameters))
		body := make([]ast.Stmt, 0, len(value.Body)+len(value.Parameters))
		for _, parameter := range value.Parameters {
			name := casedName(parameter.Name, false)
			g.locals[parameter.Name], g.localTypes[parameter.Name] = name, parameter.Type
			parameters = append(parameters, &ast.Field{Names: []*ast.Ident{goIdent(name)}, Type: g.goType(parameter.Type)})
		}
		for _, parameter := range value.Parameters {
			name := g.locals[parameter.Name]
			checked := g.goDetach(goIdent(name), parameter.Type)
			if _, same := checked.(*ast.Ident); !same {
				body = append(body, goAssign(goIdent(name), checked, token.ASSIGN))
			}
		}
		body = append(body, g.goStatements(value.Body)...)
		g.locals, g.localTypes = nil, nil
		return []ast.Decl{goFunction(g.name(value.Name), parameters, g.goType(value.ReturnType), body)}
	default:
		reject("unknown item kind " + value.Kind)
		return nil
	}
}
