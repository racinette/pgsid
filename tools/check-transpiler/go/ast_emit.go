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
		if value.Inner.Kind == "slice" {
			return &ast.ArrayType{Elt: g.goType(value.Inner.Inner)}
		}
		if path(value.Inner) == "str" {
			return goIdent("string")
		}
		if g.structs[path(value.Inner)] != nil {
			return &ast.StarExpr{X: g.goType(value.Inner)}
		}
		reject("unsupported reference type")
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
	case "u16":
		return goIdent("uint16")
	case "usize", "u32", "i32":
		return goIdent("int")
	case "i64":
		return goIdent("int64")
	case "f64":
		return goIdent("float64")
	case "bool":
		return goIdent("bool")
	case "char":
		return goIdent("rune")
	case "str", "String":
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
		name := path(valueType.Inner)
		if name == "str" {
			return goCall("checkedString", value)
		}
		structure := g.structs[name]
		if structure == nil {
			reject("unsupported borrowed type")
		}
		if opaqueStruct(structure) {
			return goCall("checkedOpaqueBorrow", value)
		}
		return goCall("checkedBorrowed", value, goIdent("copy"+g.name(name)))
	}
	name := path(valueType)
	if g.immutable[name] {
		return value
	}
	switch name {
	case "usize", "u32":
		return goCall("checkedIndex", value)
	case "i32":
		return goCall("checkedI32", value)
	case "i64":
		return value
	case "String":
		return goCall("checkedString", value)
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
	case "float-from-text":
		return goCall("f64FromText", g.goExpression(value.Value), g.goExpression(value.Fallback))
	case "float":
		parsed, err := strconv.ParseFloat(value.Digits, 64)
		if err != nil {
			reject("invalid f64 literal")
		}
		if parsed == 0 && strings.HasPrefix(value.Digits, "-") {
			return goCall("f64Negate", goCall("float64", &ast.BasicLit{Kind: token.FLOAT, Value: strings.TrimPrefix(value.Digits, "-")}))
		}
		return goCall("float64", &ast.BasicLit{Kind: token.FLOAT, Value: value.Digits})
	case "integer":
		if value.IntegerType == "i64" {
			return goCall("int64", goInteger(value.Digits))
		}
		return goInteger(value.Digits)
	case "character-from-codepoint":
		return goCall("characterFromI32", g.goExpression(value.Value), g.goExpression(value.Fallback))
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
	case "string":
		return &ast.BasicLit{Kind: token.STRING, Value: strconv.Quote(value.Text)}
	case "parenthesized":
		return &ast.ParenExpr{X: g.goExpression(value.Inner)}
	case "borrow":
		return &ast.UnaryExpr{Op: token.AND, X: g.goExpression(value.Value)}
	case "unary":
		if value.Operator != "negate" {
			reject("unsupported unary operator")
		}
		if path(g.inferType(value.Value)) == "f64" {
			return goCall("f64Negate", g.goExpression(value.Value))
		}
		return goCall("checkedSignedNegate", g.goExpression(value.Value))
	case "cast":
		switch path(value.TargetType) {
		case "f64":
			return goCall("float64", g.goExpression(value.Value))
		case "i32":
			if path(g.inferType(value.Value)) == "f64" {
				return goCall("f64ToI32", g.goExpression(value.Value))
			}
			if path(g.inferType(value.Value)) == "char" {
				return goCall("int", goCall("checkedChar", g.goExpression(value.Value)))
			}
			return goCall("int", goCall("int32", g.goExpression(value.Value)))
		case "i64":
			return goCall("int64", goCall("checkedI32", g.goExpression(value.Value)))
		case "u32":
			return goCall("int", goCall("checkedChar", g.goExpression(value.Value)))
		case "usize":
			if path(g.inferType(value.Value)) == "u16" {
				return goCall("checkedIndex", goCall("int", g.goExpression(value.Value)))
			}
			return goCall("checkedIndex", g.goExpression(value.Value))
		default:
			reject("unsupported cast target")
		}
	case "binary":
		left, right := g.goExpression(value.Left), g.goExpression(value.Right)
		if (value.Operator == "add" || value.Operator == "subtract" || value.Operator == "multiply" || value.Operator == "divide") && path(g.inferType(value.Left)) == "f64" {
			helpers := map[string]string{"add": "f64Add", "subtract": "f64Subtract", "multiply": "f64Multiply", "divide": "f64Divide"}
			if helper, ok := helpers[value.Operator]; ok {
				return goCall(helper, left, right)
			}
		}
		if (value.Operator == "multiply" || value.Operator == "add" || value.Operator == "subtract" || value.Operator == "divide" || value.Operator == "remainder") && path(g.inferType(value.Left)) == "i64" {
			switch value.Operator {
			case "multiply":
				return goCall("checkedI64Multiply", left, right)
			case "add":
				return goCall("checkedI64Add", left, right)
			case "subtract":
				return goCall("checkedI64Subtract", left, right)
			case "divide":
				return goCall("checkedI64Divide", left, right)
			case "remainder":
				return goCall("checkedI64Remainder", left, right)
			}
		}
		switch value.Operator {
		case "multiply":
			return goCall("checkedSignedMultiply", left, right)
		case "divide":
			return goCall("checkedSignedDivide", left, right)
		case "remainder":
			return goCall("checkedSignedRemainder", left, right)
		case "add":
			signed := path(g.inferType(value.Left)) == "i32" || path(g.inferType(value.Right)) == "i32"
			if signed {
				return goCall("checkedSignedAdd", left, right)
			}
			return goCall("checkedAdd", left, right)
		case "subtract":
			signed := path(g.inferType(value.Left)) == "i32" || path(g.inferType(value.Right)) == "i32"
			if signed {
				return goCall("checkedSignedSubtract", left, right)
			}
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
		case value.Method == "abs" && len(value.Arguments) == 0:
			return goCall("f64Abs", g.goExpression(value.Receiver))
		case value.Method == "ln" && len(value.Arguments) == 0:
			return goCall("f64Ln", g.goExpression(value.Receiver))
		case value.Method == "log10" && len(value.Arguments) == 0:
			return goCall("f64Log10", g.goExpression(value.Receiver))
		case value.Method == "clone":
			return g.goDetach(g.goExpression(value.Receiver), g.inferType(value.Receiver))
		case value.Method == "to_owned" || value.Method == "as_str":
			return g.goExpression(value.Receiver)
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
		if value.Callee != nil && len(value.Callee.Segments) == 2 && value.Callee.Segments[0] == "String" && value.Callee.Segments[1] == "new" && len(value.Arguments) == 0 {
			return &ast.BasicLit{Kind: token.STRING, Value: "\"\""}
		}
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
			if (value.Method == "push" || value.Method == "push_str") && path(g.inferType(value.Receiver)) == "String" {
				receiver := g.goExpression(value.Receiver)
				argument := g.goExpression(value.Arguments[0])
				if value.Method == "push" {
					argument = goCall("string", goCall("checkedChar", argument))
				}
				result = append(result, goAssign(receiver, &ast.BinaryExpr{X: receiver, Op: token.ADD, Y: argument}, token.ASSIGN))
				continue
			}
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
		case "if-let":
			if value.Source == nil || value.Source.Kind != "path" || len(value.Source.Segments) != 1 || value.ElseBody != nil {
				reject("if-let source or else branch is outside the AST contract")
			}
			var payload *node
			for _, variant := range g.enums[value.EnumName] {
				if variant.Name == value.Variant {
					payload = variant.Payload
				}
			}
			if payload == nil || (value.PayloadBinding != nil && *value.PayloadBinding == "") || path(g.inferType(value.Source)) != value.EnumName {
				reject("if-let pattern is not a matching payload enum variant")
			}
			source := g.goExpression(value.Source)
			condition := &ast.BinaryExpr{
				X:  goSelect(source, g.enumKindField(value.EnumName)),
				Op: token.EQL,
				Y:  goIdent(g.name(value.EnumName) + value.Variant),
			}
			originalLocals, originalTypes := g.locals, g.localTypes
			g.locals, g.localTypes = cloneLocals(originalLocals), cloneTypes(originalTypes)
			var body []ast.Stmt
			if value.PayloadBinding != nil {
				binding := *value.PayloadBinding
				generated := casedName(binding, false)
				g.locals[binding] = generated
				g.localTypes[binding] = payload
				body = append(body, goAssign(goIdent(generated), g.goDetach(goSelect(source, g.enumPayloadField(value.EnumName, value.Variant)), payload), token.DEFINE))
				if strings.HasPrefix(binding, "_") {
					body = append(body, goAssign(goIdent("_"), goIdent(generated), token.ASSIGN))
				}
			}
			body = append(body, g.goStatements(value.Body)...)
			g.locals, g.localTypes = originalLocals, originalTypes
			result = append(result, &ast.IfStmt{Cond: condition, Body: &ast.BlockStmt{List: body}})
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
				alternate := g.goStatements(value.ElseBody)
				if len(alternate) == 1 {
					if continuation, ok := alternate[0].(*ast.IfStmt); ok {
						branch.Else = continuation
					}
				}
				if branch.Else == nil {
					branch.Else = &ast.BlockStmt{List: alternate}
				}
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
		if value.Type.Kind == "reference" && value.Type.Inner.Kind == "slice" {
			literal := value.Value.Value
			elements := make([]ast.Expr, 0, len(literal.Elements))
			for _, element := range literal.Elements {
				if element.Kind == "unary" && element.Value.Kind == "integer" {
					elements = append(elements, &ast.UnaryExpr{Op: token.SUB, X: g.goExpression(element.Value)})
				} else {
					elements = append(elements, g.goExpression(element))
				}
			}
			return []ast.Decl{&ast.GenDecl{Tok: token.VAR, Specs: []ast.Spec{&ast.ValueSpec{
				Names: []*ast.Ident{goIdent(g.name(value.Name))}, Values: []ast.Expr{&ast.CompositeLit{Type: g.goType(value.Type), Elts: elements}},
			}}}}
		}
		declarationToken := token.CONST
		if value.Type.Kind == "path" && path(value.Type) == "f64" {
			declarationToken = token.VAR
		}
		return []ast.Decl{&ast.GenDecl{Tok: declarationToken, Specs: []ast.Spec{&ast.ValueSpec{
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
		if g.immutable[value.Name] {
			return []ast.Decl{structure}
		}
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
		if g.immutable[value.Name] {
			return []ast.Decl{kindType, constants, structure}
		}
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
