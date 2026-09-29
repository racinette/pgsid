use std::collections::BTreeSet;

use serde_json::{json, Value};
use syn::punctuated::Punctuated;
use syn::{BinOp, Expr, Fields, FnArg, Item, Pat, ReturnType, Stmt, Type, Visibility};

use crate::{
    syntax,
    validate::{check_operations, inspect, path_name, pattern_ident, type_name, Result},
};

fn derive_names(attrs: &[syn::Attribute]) -> Result<Vec<String>> {
    let mut names = Vec::new();
    for attribute in attrs {
        let paths: Punctuated<syn::Path, syn::Token![,]> = attribute
            .parse_args_with(Punctuated::parse_terminated)
            .map_err(|error| error.to_string())?;
        names.extend(paths.iter().map(path_name));
    }
    Ok(names)
}

fn visibility(value: &Visibility) -> Result<&'static str> {
    match value {
        Visibility::Inherited => Ok("private"),
        Visibility::Public(_) => Ok("public"),
        _ => Err("restricted visibility is outside the AST contract".into()),
    }
}

fn check_type(
    value: &Type,
    declarations: &BTreeSet<String>,
    structs: &BTreeSet<String>,
    copy_structs: &BTreeSet<String>,
) -> Result<()> {
    match value {
        Type::Reference(reference) => {
            let inner = type_name(&reference.elem)?;
            if inner != "str" && !structs.contains(&inner) {
                return Err(
                    "only &str and declared struct references are in the AST contract".into(),
                );
            }
        }
        Type::Path(_) => {
            let name = type_name(value)?;
            if !matches!(
                name.as_str(),
                "usize" | "u32" | "i32" | "bool" | "char" | "Vec<char>" | "Vec<usize>"
            ) && !declarations.contains(&name)
                && !name
                    .strip_prefix("Vec<")
                    .and_then(|element| element.strip_suffix('>'))
                    .is_some_and(|element| copy_structs.contains(element))
            {
                return Err(format!("type {name} is outside the AST contract"));
            }
        }
        _ => return Err("type is outside the AST contract".into()),
    }
    Ok(())
}

fn reject_stored_struct_borrow(value: &Type) -> Result<()> {
    if let Type::Reference(reference) = value {
        if type_name(&reference.elem)? != "str" {
            return Err("struct borrows are supported only as function parameters".into());
        }
    }
    Ok(())
}

fn check_body_types(
    block: &syn::Block,
    declarations: &BTreeSet<String>,
    structs: &BTreeSet<String>,
    copy_structs: &BTreeSet<String>,
) -> Result<()> {
    for statement in &block.stmts {
        match statement {
            Stmt::Local(local) => {
                if let Pat::Type(typed) = &local.pat {
                    reject_stored_struct_borrow(&typed.ty)?;
                    check_type(&typed.ty, declarations, structs, copy_structs)?;
                }
            }
            Stmt::Expr(Expr::If(branch), _) => {
                check_if_body_types(branch, declarations, structs, copy_structs)?
            }
            Stmt::Expr(Expr::While(loop_), _) => {
                check_body_types(&loop_.body, declarations, structs, copy_structs)?
            }
            _ => {}
        }
    }
    Ok(())
}

fn check_if_body_types(
    branch: &syn::ExprIf,
    declarations: &BTreeSet<String>,
    structs: &BTreeSet<String>,
    copy_structs: &BTreeSet<String>,
) -> Result<()> {
    check_body_types(&branch.then_branch, declarations, structs, copy_structs)?;
    if let Some((_, alternate)) = &branch.else_branch {
        match &**alternate {
            Expr::Block(alternate) => {
                check_body_types(&alternate.block, declarations, structs, copy_structs)?
            }
            Expr::If(alternate) => {
                check_if_body_types(alternate, declarations, structs, copy_structs)?
            }
            _ => unreachable!(),
        }
    }
    Ok(())
}

fn check_types(file: &syn::File) -> Result<()> {
    let declarations = file
        .items
        .iter()
        .filter_map(|item| match item {
            Item::Struct(node) => Some(node.ident.to_string()),
            Item::Enum(node) => Some(node.ident.to_string()),
            _ => None,
        })
        .collect::<BTreeSet<_>>();
    let structs = file
        .items
        .iter()
        .filter_map(|item| match item {
            Item::Struct(node) => Some(node.ident.to_string()),
            _ => None,
        })
        .collect::<BTreeSet<_>>();
    let copy_structs = file
        .items
        .iter()
        .filter_map(|item| match item {
            Item::Struct(node)
                if derive_names(&node.attrs)
                    .is_ok_and(|traits| traits.iter().any(|trait_name| trait_name == "Copy")) =>
            {
                Some(node.ident.to_string())
            }
            _ => None,
        })
        .collect::<BTreeSet<_>>();
    for item in &file.items {
        match item {
            Item::Const(node) => {
                reject_stored_struct_borrow(&node.ty)?;
                check_type(&node.ty, &declarations, &structs, &copy_structs)?;
            }
            Item::Struct(node) => {
                let Fields::Named(fields) = &node.fields else {
                    unreachable!()
                };
                for field in &fields.named {
                    reject_stored_struct_borrow(&field.ty)?;
                    check_type(&field.ty, &declarations, &structs, &copy_structs)?;
                }
            }
            Item::Enum(node) => {
                for variant in &node.variants {
                    if let Fields::Unnamed(fields) = &variant.fields {
                        reject_stored_struct_borrow(&fields.unnamed[0].ty)?;
                        check_type(
                            &fields.unnamed[0].ty,
                            &declarations,
                            &structs,
                            &copy_structs,
                        )?;
                    }
                }
            }
            Item::Fn(node) => {
                for arg in &node.sig.inputs {
                    let FnArg::Typed(arg) = arg else {
                        unreachable!()
                    };
                    check_type(&arg.ty, &declarations, &structs, &copy_structs)?;
                }
                let ReturnType::Type(_, output) = &node.sig.output else {
                    unreachable!()
                };
                if matches!(&**output, Type::Reference(_)) {
                    return Err("borrowed return types are outside the AST contract".into());
                }
                check_type(output, &declarations, &structs, &copy_structs)?;
                check_body_types(&node.block, &declarations, &structs, &copy_structs)?;
            }
            _ => unreachable!(),
        }
    }
    Ok(())
}

fn segments(path: &syn::Path) -> Vec<String> {
    path.segments
        .iter()
        .map(|segment| segment.ident.to_string())
        .collect()
}

fn ty(value: &Type) -> Result<Value> {
    match value {
        Type::Reference(reference) => Ok(json!({
            "kind": "reference",
            "inner": ty(&reference.elem)?,
        })),
        Type::Path(path) => {
            let segment = &path.path.segments[0];
            if let syn::PathArguments::AngleBracketed(arguments) = &segment.arguments {
                match &arguments.args[0] {
                    syn::GenericArgument::Type(argument) => Ok(json!({
                        "kind": "path",
                        "segments": segments(&path.path),
                        "typeArguments": [ty(argument)?],
                    })),
                    syn::GenericArgument::Lifetime(_) => {
                        Ok(json!({ "kind": "path", "segments": segments(&path.path) }))
                    }
                    _ => Err("expected a type or lifetime argument".into()),
                }
            } else {
                Ok(json!({ "kind": "path", "segments": segments(&path.path) }))
            }
        }
        _ => Err("type is outside the AST contract".into()),
    }
}

fn integer(value: &syn::LitInt) -> Result<String> {
    let source = value.to_string();
    if !source.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(format!(
            "integer literal {source} must use unsuffixed decimal syntax"
        ));
    }
    let number = source
        .parse::<u32>()
        .map_err(|_| format!("integer literal {source} exceeds the shared numeric bound"))?;
    if number > i32::MAX as u32 {
        return Err(format!(
            "integer literal {source} exceeds the shared numeric bound"
        ));
    }
    Ok(number.to_string())
}

fn operator(value: &BinOp) -> Result<&'static str> {
    match value {
        BinOp::Add(_) => Ok("add"),
        BinOp::Sub(_) => Ok("subtract"),
        BinOp::Lt(_) => Ok("less-than"),
        BinOp::Le(_) => Ok("less-or-equal"),
        BinOp::Gt(_) => Ok("greater-than"),
        BinOp::Ge(_) => Ok("greater-or-equal"),
        BinOp::Eq(_) => Ok("equal"),
        BinOp::Ne(_) => Ok("not-equal"),
        BinOp::And(_) => Ok("and"),
        BinOp::Or(_) => Ok("or"),
        BinOp::AddAssign(_) => Ok("add-assign"),
        _ => Err("binary operator is outside the AST contract".into()),
    }
}

fn if_expr(node: &syn::ExprIf) -> Result<Value> {
    if let Expr::Let(binding) = &*node.cond {
        let Pat::TupleStruct(pattern) = &*binding.pat else {
            return Err("if-let needs a payload enum variant".into());
        };
        let Pat::Ident(name) = &pattern.elems[0] else {
            return Err("if-let payload must bind an identifier".into());
        };
        let names = segments(&pattern.path);
        return Ok(json!({
            "kind": "if-let",
            "enumName": names[0],
            "variant": names[1],
            "payloadBinding": name.ident.to_string(),
            "source": expr(&binding.expr)?,
            "body": block(&node.then_branch)?,
        }));
    }
    let mut value = json!({
        "kind": "if",
        "condition": expr(&node.cond)?,
        "body": block(&node.then_branch)?,
    });
    if let Some((_, alternate)) = &node.else_branch {
        value["elseBody"] = match &**alternate {
            Expr::Block(alternate) => json!(block(&alternate.block)?),
            Expr::If(alternate) => json!([{
                "kind": "expression",
                "semicolon": false,
                "value": if_expr(alternate)?,
            }]),
            _ => unreachable!(),
        };
    }
    Ok(value)
}

fn expr(value: &Expr) -> Result<Value> {
    match value {
        Expr::Path(node) => Ok(json!({ "kind": "path", "segments": segments(&node.path) })),
        Expr::Lit(node) => match &node.lit {
            syn::Lit::Int(number) => Ok(json!({ "kind": "integer", "digits": integer(number)? })),
            syn::Lit::Char(character) => {
                Ok(json!({ "kind": "character", "scalar": character.value().to_string() }))
            }
            syn::Lit::Bool(boolean) => Ok(json!({ "kind": "boolean", "state": boolean.value })),
            _ => Err("literal is outside the AST contract".into()),
        },
        Expr::Paren(node) => Ok(json!({ "kind": "parenthesized", "inner": expr(&node.expr)? })),
        Expr::Group(node) => expr(&node.expr),
        Expr::Reference(node) => Ok(json!({ "kind": "borrow", "value": expr(&node.expr)? })),
        Expr::Cast(node) => Ok(json!({
            "kind": "cast",
            "value": expr(&node.expr)?,
            "targetType": ty(&node.ty)?,
        })),
        Expr::Binary(node) => Ok(json!({
            "kind": "binary",
            "operator": operator(&node.op)?,
            "left": expr(&node.left)?,
            "right": expr(&node.right)?,
        })),
        Expr::Assign(node) => Ok(json!({
            "kind": "assign",
            "left": expr(&node.left)?,
            "right": expr(&node.right)?,
        })),
        Expr::Field(node) => {
            let syn::Member::Named(member) = &node.member else {
                return Err("tuple field is outside the AST contract".into());
            };
            Ok(json!({ "kind": "field", "base": expr(&node.base)?, "member": member.to_string() }))
        }
        Expr::Index(node) => Ok(json!({
            "kind": "index",
            "base": expr(&node.expr)?,
            "index": expr(&node.index)?,
        })),
        Expr::MethodCall(node) => {
            if node.method == "collect" {
                let Expr::MethodCall(chars) = &*node.receiver else {
                    return Err("collect receiver is outside the AST contract".into());
                };
                Ok(json!({
                    "kind": "method-call",
                    "receiver": {
                        "kind": "method-call",
                        "receiver": expr(&chars.receiver)?,
                        "method": "chars",
                        "arguments": [],
                    },
                    "method": "collect",
                    "arguments": [],
                }))
            } else {
                Ok(json!({
                    "kind": "method-call",
                    "receiver": expr(&node.receiver)?,
                    "method": node.method.to_string(),
                    "arguments": node.args.iter().map(expr).collect::<Result<Vec<_>>>()?,
                }))
            }
        }
        Expr::Struct(node) => {
            let fields = node
                .fields
                .iter()
                .map(|field| {
                    let syn::Member::Named(member) = &field.member else {
                        return Err("tuple field is outside the AST contract".into());
                    };
                    Ok(json!({ "name": member.to_string(), "value": expr(&field.expr)? }))
                })
                .collect::<Result<Vec<_>>>()?;
            Ok(json!({
                "kind": "struct-literal",
                "path": segments(&node.path),
                "fields": fields,
            }))
        }
        Expr::Call(node) => Ok(json!({
            "kind": "call",
            "callee": expr(&node.func)?,
            "arguments": node.args.iter().map(expr).collect::<Result<Vec<_>>>()?,
        })),
        Expr::If(node) => if_expr(node),
        Expr::While(node) => Ok(json!({
            "kind": "while",
            "condition": expr(&node.cond)?,
            "body": block(&node.body)?,
        })),
        Expr::Return(node) => Ok(json!({
            "kind": "return",
            "value": expr(node.expr.as_ref().ok_or("bare return is outside the AST contract")?)?,
        })),
        Expr::Break(_) => Ok(json!({ "kind": "break" })),
        _ => Err("expression is outside the AST contract".into()),
    }
}

fn block(value: &syn::Block) -> Result<Vec<Value>> {
    value.stmts.iter().map(|statement| match statement {
        Stmt::Local(local) => {
            let (name, mutable) = pattern_ident(&local.pat)?;
            let mut result = json!({
                "kind": "local",
                "binding": { "name": name, "mutable": mutable },
                "initializer": expr(&local.init.as_ref().ok_or("uninitialized local is outside the AST contract")?.expr)?,
            });
            if let Pat::Type(typed) = &local.pat {
                result["type"] = ty(&typed.ty)?;
            }
            Ok(result)
        }
        Stmt::Expr(expression, semi) => Ok(json!({
            "kind": "expression",
            "semicolon": semi.is_some(),
            "value": expr(expression)?,
        })),
        _ => Err("statement is outside the AST contract".into()),
    }).collect()
}

fn item(value: &Item) -> Result<Value> {
    match value {
        Item::Const(node) => Ok(json!({
            "kind": "constant",
            "visibility": visibility(&node.vis)?,
            "name": node.ident.to_string(),
            "type": ty(&node.ty)?,
            "value": expr(&node.expr)?,
        })),
        Item::Struct(node) => {
            let Fields::Named(named) = &node.fields else {
                return Err("struct fields are outside the AST contract".into());
            };
            let fields = named
                .named
                .iter()
                .map(|field| {
                    Ok(json!({
                        "visibility": visibility(&field.vis)?,
                        "name": field.ident.as_ref().ok_or("unnamed field")?.to_string(),
                        "type": ty(&field.ty)?,
                    }))
                })
                .collect::<Result<Vec<_>>>()?;
            Ok(json!({
                "kind": "struct",
                "visibility": visibility(&node.vis)?,
                "name": node.ident.to_string(),
                "derives": derive_names(&node.attrs)?,
                "fields": fields,
            }))
        }
        Item::Enum(node) => {
            let variants = node
                .variants
                .iter()
                .map(|variant| {
                    let mut value = json!({ "name": variant.ident.to_string() });
                    if let Fields::Unnamed(fields) = &variant.fields {
                        value["payload"] = ty(&fields.unnamed[0].ty)?;
                    }
                    Ok(value)
                })
                .collect::<Result<Vec<_>>>()?;
            Ok(json!({
                "kind": "enum",
                "visibility": visibility(&node.vis)?,
                "name": node.ident.to_string(),
                "derives": derive_names(&node.attrs)?,
                "variants": variants,
            }))
        }
        Item::Fn(node) => {
            let parameters = node
                .sig
                .inputs
                .iter()
                .map(|arg| {
                    let FnArg::Typed(arg) = arg else {
                        return Err("receiver is outside the AST contract".into());
                    };
                    let (name, mutable) = pattern_ident(&arg.pat)?;
                    Ok(json!({ "name": name, "mutable": mutable, "type": ty(&arg.ty)? }))
                })
                .collect::<Result<Vec<_>>>()?;
            let ReturnType::Type(_, output) = &node.sig.output else {
                return Err("explicit return type is required".into());
            };
            Ok(json!({
                "kind": "function",
                "visibility": visibility(&node.vis)?,
                "name": node.sig.ident.to_string(),
                "parameters": parameters,
                "returnType": ty(output)?,
                "body": block(&node.block)?,
            }))
        }
        _ => Err("item is outside the AST contract".into()),
    }
}

pub fn parse(source: &str) -> Result<String> {
    let file = syn::parse_file(source).map_err(|error| error.to_string())?;
    syntax::check(&file)?;
    inspect(&file)?;
    check_types(&file)?;
    check_operations(&file)?;
    let items = file.items.iter().map(item).collect::<Result<Vec<_>>>()?;
    serde_json::to_string(&json!({ "schemaVersion": 1, "items": items }))
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::parse;

    mod smoke {
        include!("../transpiler_smoke.rs");
    }

    #[test]
    fn serializes_slice_without_losing_tail_or_mutability() {
        assert_eq!(smoke::stack_probe(3), 6);
        assert!(smoke::same_text(smoke::wrap_text("value"), "value"));
        assert!(smoke::same_wrapped_text(
            smoke::make_wrapped_text("value"),
            "value"
        ));
        assert!(smoke::echo_bool(true));
        assert_eq!(smoke::append_position(vec![2], 4), 2);
        assert_eq!(smoke::overwrite_position(vec![2], 0, 4), 4);
        assert!(
            smoke::span_stack(smoke::Span { start: 1, end: 2 })[0]
                == smoke::Span { start: 2, end: 2 }
        );
        assert!(
            smoke::span_stack_at(
                smoke::shift_span_stack(vec![smoke::Span { start: 1, end: 2 }], 0, 2),
                0,
            ) == smoke::Span { start: 3, end: 2 }
        );
        let value: serde_json::Value =
            serde_json::from_str(&parse(include_str!("../transpiler_smoke.rs")).unwrap()).unwrap();
        assert_eq!(value["schemaVersion"], 1);
        let shift = value["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|item| item["name"] == "shift_span")
            .unwrap();
        assert_eq!(shift["body"][0]["binding"]["mutable"], true);
        assert_eq!(shift["body"][3]["semicolon"], false);
        let choice = value["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|item| item["name"] == "choose_position")
            .unwrap();
        assert_eq!(
            choice["body"][1]["value"]["elseBody"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        let stack = value["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|item| item["name"] == "stack_probe")
            .unwrap();
        assert_eq!(
            stack["body"][0]["type"]["typeArguments"][0]["segments"][0],
            "usize"
        );
        assert_eq!(stack["body"][1]["value"]["arguments"][0]["kind"], "path");
        assert_eq!(stack["body"][4]["value"]["kind"], "assign");
        let wrapped = value["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|item| item["name"] == "wrap_text")
            .unwrap();
        assert_eq!(wrapped["returnType"]["segments"][0], "BorrowedText");
        assert!(wrapped["returnType"].get("typeArguments").is_none());
        let destructured = value["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|item| item["name"] == "same_wrapped_text")
            .unwrap();
        assert_eq!(destructured["body"][0]["value"]["kind"], "if-let");
        assert_eq!(destructured["body"][0]["value"]["payloadBinding"], "text");
    }

    #[test]
    fn rejects_nondecimal_literals() {
        assert!(parse("const X: usize = 0xff;").is_err());
    }

    #[test]
    fn character_literals_preserve_unicode_scalars() {
        let tree: serde_json::Value = serde_json::from_str(
            &parse("pub fn f(value: char) -> bool { value == '\\n' }").unwrap(),
        )
        .unwrap();
        assert_eq!(
            tree["items"][0]["body"][0]["value"]["right"]["kind"],
            "character"
        );
        assert_eq!(
            tree["items"][0]["body"][0]["value"]["right"]["scalar"],
            "\n"
        );
        assert!(parse("pub fn f(value: char) -> bool { value == '😀' }").is_ok());
    }

    #[test]
    fn boolean_literals_keep_their_value() {
        let tree: serde_json::Value =
            serde_json::from_str(&parse("pub fn f() -> bool { false }").unwrap()).unwrap();
        assert_eq!(tree["items"][0]["body"][0]["value"]["kind"], "boolean");
        assert_eq!(tree["items"][0]["body"][0]["value"]["state"], false);
    }

    #[test]
    fn char_codepoint_cast_has_one_lowering() {
        let tree: serde_json::Value =
            serde_json::from_str(&parse("pub fn f(value: char) -> u32 { value as u32 }").unwrap())
                .unwrap();
        assert_eq!(tree["items"][0]["body"][0]["value"]["kind"], "cast");
        assert_eq!(
            tree["items"][0]["body"][0]["value"]["targetType"]["segments"],
            serde_json::json!(["u32"])
        );
        assert!(parse("pub fn f(value: usize) -> u32 { value as u32 }").is_err());
        assert!(parse("pub fn f(value: char) -> usize { value as usize }").is_err());
        assert!(parse("pub fn f(value: u32) -> usize { value as usize }").is_ok());
        assert!(parse("pub fn f(value: i32) -> usize { value as usize }").is_err());
    }

    #[test]
    fn rejects_types_without_target_mappings() {
        assert!(parse("pub fn f(value: Vec<i32>) -> i32 { 1 }").is_err());
        assert!(parse("pub fn f(value: &char) -> bool { 1 == 1 }").is_err());
        assert!(parse("pub fn f(value: i32<'static>) -> bool { true }").is_err());
    }

    #[test]
    fn if_let_requires_matching_payload_enum() {
        let declaration = "enum Maybe { Empty, Number(i32) }";
        assert!(parse(&format!(
            "{declaration} pub fn f(value: Maybe) -> bool {{ if let Maybe::Empty(x) = value {{ return true; }} false }}"
        ))
        .is_err());
        assert!(parse(&format!(
            "{declaration} pub fn f(value: Maybe) -> bool {{ if let Other::Number(x) = value {{ return true; }} false }}"
        ))
        .is_err());
        assert!(parse(&format!(
            "{declaration} pub fn f(value: Maybe) -> bool {{ if let Maybe::Number(x) = value {{ return x > 0; }} false }}"
        ))
        .is_ok());
        assert!(parse(&format!(
            "{declaration} pub fn f(value: Maybe) -> bool {{ if let Maybe::Number(value) = value {{ return true; }} false }}"
        ))
        .is_err());
        assert!(parse(
            "enum Words { Value(Vec<char>) } pub fn f(value: Words) -> bool { if let Words::Value(chars) = value { return chars.len() > 0; } false }"
        )
        .is_err());
    }

    #[test]
    fn immutable_struct_borrows_have_a_narrow_boundary() {
        let record = "struct State { position: usize }";
        let accepted = format!(
            "{record} fn read(value: &State) -> usize {{ value.position }} pub fn f(value: State) -> usize {{ read(&value) }}"
        );
        let tree: serde_json::Value = serde_json::from_str(&parse(&accepted).unwrap()).unwrap();
        assert_eq!(
            tree["items"][2]["body"][0]["value"]["arguments"][0]["kind"],
            "borrow"
        );
        assert!(parse(&format!(
            "{record} pub fn f(value: &mut State) -> usize {{ value.position }}"
        ))
        .is_err());
        assert!(parse(&format!(
            "{record} pub fn f(value: &State) -> &State {{ value }}"
        ))
        .is_err());
        assert!(parse(&format!("{record} pub fn f(value: State) -> usize {{ let borrowed = &value; borrowed.position }}")).is_err());
        assert!(parse(&format!("{record} pub fn f(value: State) -> usize {{ let borrowed: &State = &value; borrowed.position }}")).is_err());
        assert!(parse("pub fn f(value: &Vec<usize>) -> usize { value.len() }").is_err());
        assert!(parse("enum State { Ready } pub fn f(value: &State) -> bool { true }").is_err());
    }

    #[test]
    fn rejects_string_length_with_different_target_units() {
        assert!(parse("pub fn f(value: &str) -> usize { value.len() }").is_err());
    }

    #[test]
    fn checks_else_branches_against_the_same_operation_rules() {
        assert!(parse("pub fn f(value: &str, flag: bool) -> usize { if flag { return 1; } else { let length = value.len(); return length; } }").is_err());
        assert!(parse("pub fn f(value: &str, first: bool, second: bool) -> usize { if first { return 1; } else if second { let length = value.len(); return length; } else { return 3; } }").is_err());
    }

    #[test]
    fn ascii_lowercase_requires_a_character() {
        assert!(parse("pub fn f(value: char) -> char { value.to_ascii_lowercase() }").is_ok());
        assert!(parse("pub fn f(value: &str) -> &str { value.to_ascii_lowercase() }").is_err());
    }

    #[test]
    fn rejects_comparisons_without_shared_value_semantics() {
        assert!(parse("pub fn f(a: Vec<char>, b: Vec<char>) -> bool { a == b }").is_err());
        assert!(parse("pub fn f(a: char, b: char) -> bool { a < b }").is_err());
        assert!(parse("pub fn f(a: &str, b: &str) -> bool { a < b }").is_err());
    }

    #[test]
    fn rejects_unknown_enum_constructors() {
        let declarations = "enum Outcome { Found(usize), NoMatch }";
        assert!(parse(&format!(
            "{declarations} pub fn f() -> Outcome {{ Outcome::Other(1) }}"
        ))
        .is_err());
        assert!(parse(&format!(
            "{declarations} pub fn f() -> Outcome {{ Outcome::NoMatch(1) }}"
        ))
        .is_err());
    }

    #[test]
    fn direct_calls_need_declared_functions_and_matching_arguments() {
        assert!(parse("pub fn f() -> usize { missing() }").is_err());
        assert!(
            parse("pub fn f(value: usize) -> usize { value } pub fn g() -> usize { f() }").is_err()
        );
        assert!(
            parse("pub fn f(value: bool) -> bool { value } pub fn g() -> bool { f(1) }").is_err()
        );
        assert!(
            parse("pub fn f(value: usize) -> usize { value } pub fn g() -> usize { f(1) }").is_ok()
        );
    }

    #[test]
    fn rejects_mutation_through_immutable_bindings() {
        let span = "struct Span { start: usize }";
        assert!(parse(&format!(
            "{span} pub fn f(value: Span) -> Span {{ value.start += 1; value }}"
        ))
        .is_err());
        assert!(parse(&format!(
            "{span} pub fn f(value: Span) -> Span {{ let copy = value; copy.start += 1; copy }}"
        ))
        .is_err());
    }

    #[test]
    fn state_operations_require_mutable_index_vectors() {
        for source in [
            "pub fn f() -> usize { let positions: Vec<usize> = Vec::new(); positions.push(1); positions.len() }",
            "pub fn f() -> usize { let positions: Vec<usize> = Vec::new(); positions[0] = 1; positions.len() }",
            "pub fn f() -> Vec<usize> { Vec::new() }",
            "pub fn f() -> usize { let mut positions = Vec::new(); positions.push(1); positions.len() }",
            "pub fn f() -> usize { let mut positions: Vec<usize> = Vec::new(); positions.push(false); positions.len() }",
            "pub fn f() -> usize { let mut positions: Vec<usize> = Vec::new(); positions[false] = 1; positions.len() }",
            "pub fn f() -> usize { let mut positions: Vec<usize> = Vec::new(); positions[0] = false; positions.len() }",
            "pub fn f() -> usize { let mut positions: Vec<usize> = Vec::new(); positions = Vec::new(); positions.len() }",
            "pub fn f() -> usize { let characters: Vec<char> = Vec::new(); characters.push('a'); characters.len() }",
            "pub fn f() -> usize { let mut characters: Vec<char> = Vec::new(); characters.push(1); characters.len() }",
            "pub fn f() -> usize { let mut characters: Vec<char> = Vec::new(); characters[0] = 1; characters.len() }",
        ] {
            assert!(parse(source).is_err(), "accepted: {source}");
        }
        assert!(parse("pub fn f() -> usize { let mut characters: Vec<char> = Vec::new(); characters.push('a'); characters.len() }").is_ok());
    }

    #[test]
    fn struct_vectors_require_copy_records_and_matching_elements() {
        let record = "#[derive(Clone, Copy)] struct State { position: usize }";
        assert!(parse(&format!(
            "{record} pub fn f() -> usize {{ let mut states: Vec<State> = Vec::new(); states.push(State {{ position: 1 }}); states[0] = State {{ position: 2 }}; states[0].position }}"
        ))
        .is_ok());
        assert!(parse(
            "struct State { position: usize } pub fn f(states: Vec<State>) -> usize { states.len() }"
        )
        .is_err());
        assert!(parse(&format!(
            "{record} pub fn f() -> usize {{ let mut states: Vec<State> = Vec::new(); states.push(1); states.len() }}"
        ))
        .is_err());
        assert!(parse(&format!(
            "{record} pub fn f() -> usize {{ let states: Vec<State> = Vec::new(); states.len() }}"
        ))
        .is_ok());
    }

    #[test]
    fn rejects_signed_arithmetic_and_oversized_literals() {
        assert!(parse("pub fn f(value: i32) -> i32 { value + 1 }").is_err());
        assert!(parse("const TOO_LARGE: usize = 2147483648;").is_err());
    }

    #[test]
    fn rust_source_matches_transpiler_smoke() {
        let span = smoke::Span { start: 1, end: 3 };
        let shifted = smoke::shift_span(span, 2);
        assert!(smoke::same_span(shifted, smoke::Span { start: 3, end: 5 }));
        assert_eq!(span.start, 1);
        assert_eq!(span.end, 3);
        assert!(smoke::same_span(
            smoke::shift_parameter(span, 2),
            smoke::Span { start: 3, end: 3 }
        ));
        let snapshot = smoke::snapshot_before_shift(span, 2);
        assert!(smoke::same_span(
            snapshot.before,
            smoke::Span { start: 1, end: 3 }
        ));
        assert!(smoke::same_span(
            snapshot.after,
            smoke::Span { start: 3, end: 3 }
        ));
        assert_eq!(smoke::echo_chars(vec!['a']), vec!['a']);
        assert_eq!(
            smoke::echo_bag(smoke::CharBag {
                characters: vec!['a'],
            })
            .characters,
            vec!['a']
        );
        assert_eq!(smoke::char_at(vec!['a'], 0), 'a');
        assert_eq!(smoke::forwarded_chars(vec!['a']), vec!['a']);
        assert_eq!(smoke::char_stack('😀'), vec!['b']);
        assert!(smoke::same_span(
            smoke::forwarded_span(span, 2),
            smoke::Span { start: 3, end: 5 }
        ));
        assert_eq!(smoke::add_positions(2, 3), 5);
        assert_eq!(smoke::subtract_positions(5, 3), 2);
        assert!(smoke::is_before_first(-1));
        assert_eq!(smoke::char_count("😀"), 1);
        assert_eq!(smoke::char_codepoint('😀'), 128512);
        assert_eq!(smoke::index_from_codepoint('😀'), 128512);
        assert_eq!(smoke::index_from_u32(2147483647), 2147483647);
        assert_eq!(smoke::choose_position(2, 3), 2);
        assert_eq!(smoke::choose_position(4, 3), 3);
        assert_eq!(smoke::choose_with_returns(2, 3), 2);
        assert_eq!(smoke::choose_with_returns(4, 3), 3);
        assert_eq!(smoke::classify_position(2, 3), 1);
        assert_eq!(smoke::classify_position(3, 3), 2);
        assert_eq!(smoke::classify_position(4, 3), 3);
        assert!(smoke::below_default_limit(2));
        assert!(!smoke::below_default_limit(3));
        assert_eq!(
            smoke::named_position(smoke::NamedSpan { from_position: 2 }),
            2
        );
    }
}
