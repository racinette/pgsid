use std::collections::{BTreeMap, BTreeSet};

use syn::{punctuated::Punctuated, Expr, Fields, FnArg, Item, Pat, Stmt, Token, Type};

pub type Result<T> = std::result::Result<T, String>;

pub fn path_name(path: &syn::Path) -> String {
    path.segments
        .iter()
        .map(|segment| segment.ident.to_string())
        .collect::<Vec<_>>()
        .join("::")
}

pub fn type_name(ty: &Type) -> Result<String> {
    match ty {
        Type::Reference(reference) if reference.mutability.is_none() => {
            Ok(format!("&{}", type_name(&reference.elem)?))
        }
        Type::Path(path) if path.qself.is_none() && path.path.segments.len() == 1 => {
            let segment = &path.path.segments[0];
            let name = segment.ident.to_string();
            match &segment.arguments {
                syn::PathArguments::None => Ok(name),
                syn::PathArguments::AngleBracketed(arguments) if name != "Vec" => {
                    if !matches!(
                        name.as_str(),
                        "usize" | "u32" | "i32" | "i64" | "bool" | "char" | "str"
                    ) && arguments.args.len() == 1
                        && matches!(&arguments.args[0], syn::GenericArgument::Lifetime(_))
                    {
                        Ok(name)
                    } else {
                        Err(format!("unsupported type arguments for {name}"))
                    }
                }
                syn::PathArguments::AngleBracketed(arguments) if name == "Vec" => {
                    if arguments.args.len() != 1 {
                        return Err("Vec must have one type argument".into());
                    }
                    match &arguments.args[0] {
                        syn::GenericArgument::Type(inner) => {
                            Ok(format!("Vec<{}>", type_name(inner)?))
                        }
                        _ => Err("Vec type argument is not a type".into()),
                    }
                }
                _ => Err(format!("unsupported type arguments for {name}")),
            }
        }
        _ => Err(format!("unsupported Rust type: {ty:?}")),
    }
}

pub fn pattern_ident(pattern: &Pat) -> Result<(String, bool)> {
    match pattern {
        Pat::Ident(ident) => Ok((ident.ident.to_string(), ident.mutability.is_some())),
        Pat::Type(typed) => pattern_ident(&typed.pat),
        _ => Err("only identifier bindings are in the subset".into()),
    }
}

fn derives(attrs: &[syn::Attribute]) -> Result<BTreeSet<String>> {
    let mut names = BTreeSet::new();
    for attribute in attrs {
        if !attribute.path().is_ident("derive") {
            return Err("only #[derive(...)] attributes are in this subset".into());
        }
        let parsed: Punctuated<syn::Path, Token![,]> = attribute
            .parse_args_with(Punctuated::parse_terminated)
            .map_err(|error| error.to_string())?;
        for path in parsed {
            let name = path_name(&path);
            if !matches!(name.as_str(), "Clone" | "Copy" | "PartialEq" | "Eq") {
                return Err(format!("derive({name}) needs an explicit lowering rule"));
            }
            names.insert(name);
        }
    }
    if names.contains("Copy") != names.contains("Clone") {
        return Err("this subset requires Clone and Copy together".into());
    }
    if names.contains("Eq") && !names.contains("PartialEq") {
        return Err("derive(Eq) requires PartialEq".into());
    }
    Ok(names)
}

fn scalar(name: &str) -> bool {
    matches!(
        name,
        "usize" | "u32" | "i32" | "i64" | "bool" | "char" | "&str"
    )
}

pub fn inspect(file: &syn::File) -> Result<()> {
    let mut copy = BTreeSet::new();
    let mut equality = BTreeSet::new();
    let mut enums: BTreeMap<String, Vec<Option<String>>> = BTreeMap::new();
    for item in &file.items {
        match item {
            Item::Const(item) => {
                type_name(&item.ty)?;
            }
            Item::Struct(item) => {
                let name = item.ident.to_string();
                if !matches!(item.fields, Fields::Named(_)) {
                    return Err(format!("{name}: only named struct fields are supported"));
                }
                let traits = derives(&item.attrs).map_err(|error| format!("{name}: {error}"))?;
                if traits.contains("Copy") {
                    copy.insert(name.clone());
                }
                if traits.contains("PartialEq") {
                    equality.insert(name);
                }
            }
            Item::Enum(item) => {
                let name = item.ident.to_string();
                let traits = derives(&item.attrs).map_err(|error| format!("{name}: {error}"))?;
                if traits.contains("Copy") {
                    copy.insert(name.clone());
                }
                if traits.contains("PartialEq") {
                    equality.insert(name.clone());
                }
                let mut variants = Vec::new();
                for variant in &item.variants {
                    if !variant.attrs.is_empty() || variant.discriminant.is_some() {
                        return Err(format!(
                            "{name}: variant attributes and discriminants are outside the subset"
                        ));
                    }
                    let payload = match &variant.fields {
                        Fields::Unit => None,
                        Fields::Unnamed(fields) if fields.unnamed.len() == 1 => {
                            Some(type_name(&fields.unnamed[0].ty)?)
                        }
                        _ => {
                            return Err(format!(
                                "{name}: variant {} has unsupported fields",
                                variant.ident
                            ))
                        }
                    };
                    variants.push(payload);
                }
                enums.insert(name, variants);
            }
            Item::Fn(function) => {
                if !function.attrs.is_empty()
                    || !function.sig.generics.params.is_empty()
                    || function.sig.asyncness.is_some()
                    || function.sig.constness.is_some()
                    || function.sig.unsafety.is_some()
                    || function.sig.abi.is_some()
                {
                    return Err(format!(
                        "{}: function modifiers are outside the subset",
                        function.sig.ident
                    ));
                }
            }
            _ => return Err("top-level Rust item is outside the subset".into()),
        }
    }
    for item in &file.items {
        match item {
            Item::Struct(structure) => {
                let name = structure.ident.to_string();
                let Fields::Named(fields) = &structure.fields else {
                    unreachable!()
                };
                for field in &fields.named {
                    let ty = type_name(&field.ty)?;
                    if !field.attrs.is_empty() {
                        return Err(format!("{name}: field attributes are outside the subset"));
                    }
                    if copy.contains(&name) && !scalar(&ty) && !copy.contains(&ty) {
                        return Err(format!(
                            "{name}: Copy field type {ty} has no target lowering"
                        ));
                    }
                    if equality.contains(&name) && !scalar(&ty) && !equality.contains(&ty) {
                        return Err(format!(
                            "{name}: equality field type {ty} has no target lowering"
                        ));
                    }
                }
            }
            Item::Enum(enumeration) => {
                let name = enumeration.ident.to_string();
                for payload in &enums[&name] {
                    if let Some(ty) = payload {
                        if copy.contains(&name) && !scalar(ty) && !copy.contains(ty) {
                            return Err(format!(
                                "{name}: Copy payload type {ty} has no target lowering"
                            ));
                        }
                        if equality.contains(&name) && !scalar(ty) && !equality.contains(ty) {
                            return Err(format!(
                                "{name}: equality payload type {ty} has no target lowering"
                            ));
                        }
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}

struct Semantics {
    return_type: Option<String>,
    fields: BTreeMap<String, BTreeMap<String, String>>,
    copy: BTreeSet<String>,
    equality: BTreeSet<String>,
    variants: BTreeMap<(String, String), Option<String>>,
    functions: BTreeMap<String, (Vec<String>, String)>,
}

fn shared_vector_element(name: &str, semantics: &Semantics) -> Option<String> {
    let element = name.strip_prefix("Vec<")?.strip_suffix('>')?;
    if element == "char"
        || element == "usize"
        || (semantics.fields.contains_key(element) && semantics.copy.contains(element))
    {
        Some(element.to_string())
    } else {
        None
    }
}

#[derive(Clone)]
struct Binding {
    ty: String,
    mutable: bool,
}

type Bindings = BTreeMap<String, Binding>;

fn assignment_root(value: &Expr) -> Option<String> {
    match value {
        Expr::Path(path) if path.path.segments.len() == 1 => Some(path_name(&path.path)),
        Expr::Field(field) => assignment_root(&field.base),
        Expr::Index(index) => assignment_root(&index.expr),
        Expr::Paren(paren) => assignment_root(&paren.expr),
        Expr::Group(group) => assignment_root(&group.expr),
        _ => None,
    }
}

fn is_new_index_vector(value: &Expr) -> bool {
    matches!(value,
        Expr::Call(call)
        if call.args.is_empty()
            && matches!(&*call.func, Expr::Path(path) if path_name(&path.path) == "Vec::new"))
}

fn numeric(name: &str) -> bool {
    matches!(name, "usize" | "u32" | "i32" | "i64")
}

fn checked_arithmetic(name: &str) -> bool {
    matches!(name, "usize" | "u32")
}

fn check_if_methods(branch: &syn::ExprIf, locals: &Bindings, semantics: &Semantics) -> Result<()> {
    if let Expr::Let(binding) = &*branch.cond {
        let Pat::TupleStruct(pattern) = &*binding.pat else {
            return Err("if-let needs a payload enum variant".into());
        };
        let name = pattern.path.segments[0].ident.to_string();
        let variant = pattern.path.segments[1].ident.to_string();
        let payload = semantics
            .variants
            .get(&(name.clone(), variant))
            .and_then(Clone::clone)
            .ok_or("if-let pattern is not a payload enum variant")?;
        if !scalar(&payload) && !semantics.copy.contains(&payload) {
            return Err("if-let payload needs shared value semantics".into());
        }
        if infer_expr_type(&binding.expr, locals, semantics)?.as_deref() != Some(&name) {
            return Err("if-let source type differs from its enum pattern".into());
        }
        let mut branch_locals = locals.clone();
        match &pattern.elems[0] {
            Pat::Ident(bound) => {
                branch_locals.insert(
                    bound.ident.to_string(),
                    Binding {
                        ty: payload,
                        mutable: false,
                    },
                );
            }
            Pat::Wild(_) => (),
            _ => return Err("if-let payload must be an identifier or wildcard".into()),
        }
        return check_body_methods(&branch.then_branch, &mut branch_locals, semantics);
    }
    infer_expr_type(&branch.cond, locals, semantics)?;
    check_body_methods(&branch.then_branch, &mut locals.clone(), semantics)?;
    if let Some((_, alternate)) = &branch.else_branch {
        match &**alternate {
            Expr::Block(alternate) => {
                check_body_methods(&alternate.block, &mut locals.clone(), semantics)?;
            }
            Expr::If(alternate) => check_if_methods(alternate, locals, semantics)?,
            _ => unreachable!(),
        }
    }
    Ok(())
}

fn infer_expr_type(
    value: &Expr,
    locals: &Bindings,
    semantics: &Semantics,
) -> Result<Option<String>> {
    match value {
        Expr::Path(path) if path.path.segments.len() == 1 => Ok(locals
            .get(&path_name(&path.path))
            .map(|binding| binding.ty.clone())),
        Expr::Path(path) if path.path.segments.len() == 2 => {
            let name = path.path.segments[0].ident.to_string();
            let variant = path.path.segments[1].ident.to_string();
            if semantics.variants.get(&(name.clone(), variant)) != Some(&None) {
                return Err("path is not a unit enum variant".into());
            }
            Ok(Some(name))
        }
        Expr::Lit(syn::ExprLit {
            lit: syn::Lit::Int(number),
            ..
        }) => Ok(Some(
            if number.suffix() == "i64" {
                "i64"
            } else {
                "usize"
            }
            .into(),
        )),
        Expr::Lit(syn::ExprLit {
            lit: syn::Lit::Char(_),
            ..
        }) => Ok(Some("char".into())),
        Expr::Lit(syn::ExprLit {
            lit: syn::Lit::Bool(_),
            ..
        }) => Ok(Some("bool".into())),
        Expr::Lit(syn::ExprLit {
            lit: syn::Lit::Str(_),
            ..
        }) => Ok(Some("&str".into())),
        Expr::Paren(paren) => infer_expr_type(&paren.expr, locals, semantics),
        Expr::Group(group) => infer_expr_type(&group.expr, locals, semantics),
        Expr::Unary(unary) if matches!(unary.op, syn::UnOp::Neg(_)) => {
            let source = infer_expr_type(&unary.expr, locals, semantics)?;
            let literal = matches!(
                &*unary.expr,
                Expr::Lit(syn::ExprLit {
                    lit: syn::Lit::Int(_),
                    ..
                })
            );
            if literal && source.as_deref() == Some("i64") {
                return Ok(Some("i64".into()));
            }
            if source.as_deref() != Some("i32") && !(literal && source.as_deref() == Some("usize"))
            {
                return Err("unary minus requires an i32 operand".into());
            }
            Ok(Some("i32".into()))
        }
        Expr::Reference(reference) => {
            let inner = infer_expr_type(&reference.expr, locals, semantics)?
                .ok_or("borrowed value has no shared type")?;
            if !semantics.fields.contains_key(&inner) {
                return Err("only declared structs can be borrowed".into());
            }
            Ok(Some(format!("&{inner}")))
        }
        Expr::Cast(cast) => {
            let target = type_name(&cast.ty)?;
            let source = infer_expr_type(&cast.expr, locals, semantics)?;
            if (target == "u32" && source.as_deref() == Some("char"))
                || (target == "usize" && source.as_deref() == Some("u32"))
                || (target == "i64" && source.as_deref() == Some("i32"))
            {
                return Ok(Some(target));
            }
            Err("cast has no target lowering".into())
        }
        Expr::Binary(binary) => {
            let left = infer_expr_type(&binary.left, locals, semantics)?;
            let right = infer_expr_type(&binary.right, locals, semantics)?;
            if matches!(
                binary.op,
                syn::BinOp::Eq(_)
                    | syn::BinOp::Ne(_)
                    | syn::BinOp::Lt(_)
                    | syn::BinOp::Le(_)
                    | syn::BinOp::Gt(_)
                    | syn::BinOp::Ge(_)
            ) && (left.as_deref() == Some("i64") || right.as_deref() == Some("i64"))
                && left != right
            {
                return Err("i64 comparisons require i64 operands".into());
            }
            match binary.op {
                syn::BinOp::Eq(_) | syn::BinOp::Ne(_) => {
                    let ty = left
                        .or(right)
                        .ok_or("cannot resolve equality operand type")?;
                    if !scalar(&ty) && !semantics.equality.contains(&ty) {
                        return Err(format!("equality for {ty} has no target lowering"));
                    }
                    Ok(Some("bool".into()))
                }
                syn::BinOp::Lt(_) | syn::BinOp::Le(_) | syn::BinOp::Gt(_) | syn::BinOp::Ge(_) => {
                    let ty = left
                        .or(right)
                        .ok_or("cannot resolve ordering operand type")?;
                    if !numeric(&ty) {
                        return Err(format!("ordering for {ty} has no target lowering"));
                    }
                    Ok(Some("bool".into()))
                }
                syn::BinOp::Add(_)
                | syn::BinOp::Sub(_)
                | syn::BinOp::Mul(_)
                | syn::BinOp::Div(_)
                | syn::BinOp::Rem(_) => {
                    let signed_literal = |operand: &Expr, ty: &Option<String>| {
                        ty.as_deref() == Some("usize")
                            && matches!(
                                operand,
                                Expr::Lit(syn::ExprLit {
                                    lit: syn::Lit::Int(_),
                                    ..
                                })
                            )
                    };
                    if left.as_deref() == Some("i32") || right.as_deref() == Some("i32") {
                        if !(left.as_deref() == Some("i32") || signed_literal(&binary.left, &left))
                            || !(right.as_deref() == Some("i32")
                                || signed_literal(&binary.right, &right))
                        {
                            return Err("signed arithmetic requires i32 operands".into());
                        }
                        return Ok(Some("i32".into()));
                    }
                    if matches!(
                        binary.op,
                        syn::BinOp::Mul(_) | syn::BinOp::Div(_) | syn::BinOp::Rem(_)
                    ) {
                        return Err(
                            "multiplication, division, and remainder require i32 operands".into(),
                        );
                    }
                    if !left.as_deref().is_some_and(checked_arithmetic)
                        || !right.as_deref().is_some_and(checked_arithmetic)
                    {
                        return Err("arithmetic needs nonnegative numeric operands".into());
                    }
                    Ok(left)
                }
                syn::BinOp::AddAssign(_) => {
                    if !left.as_deref().is_some_and(checked_arithmetic)
                        || !right.as_deref().is_some_and(checked_arithmetic)
                    {
                        return Err("assignment needs nonnegative numeric operands".into());
                    }
                    let root = assignment_root(&binary.left)
                        .ok_or("assignment target is not an addressable binding")?;
                    if !locals.get(&root).is_some_and(|binding| binding.mutable) {
                        return Err(format!("assignment target {root} is immutable"));
                    }
                    Ok(None)
                }
                _ => Ok(Some("bool".into())),
            }
        }
        Expr::Field(field) => {
            let base = infer_expr_type(&field.base, locals, semantics)?;
            let Some(base) = base else {
                return Err("cannot resolve field base type".into());
            };
            let syn::Member::Named(member) = &field.member else {
                return Err("tuple field is outside the subset".into());
            };
            let owner = base.strip_prefix('&').unwrap_or(&base);
            semantics
                .fields
                .get(owner)
                .and_then(|fields| fields.get(&member.to_string()))
                .cloned()
                .map(Some)
                .ok_or_else(|| format!("unknown field {base}.{member}"))
        }
        Expr::Index(index) => {
            let base = infer_expr_type(&index.expr, locals, semantics)?;
            if infer_expr_type(&index.index, locals, semantics)?.as_deref() != Some("usize") {
                return Err("vector index must be usize".into());
            }
            base.as_deref()
                .and_then(|name| shared_vector_element(name, semantics))
                .map(Some)
                .ok_or_else(|| "indexing is supported only on shared vectors".into())
        }
        Expr::MethodCall(call) if call.method == "len" => {
            let receiver = infer_expr_type(&call.receiver, locals, semantics)?;
            if receiver
                .as_deref()
                .and_then(|name| shared_vector_element(name, semantics))
                .is_none()
            {
                return Err("len() is supported only on shared vectors".into());
            }
            Ok(Some("usize".into()))
        }
        Expr::MethodCall(call) if call.method == "push" => {
            let receiver = infer_expr_type(&call.receiver, locals, semantics)?;
            let value = infer_expr_type(&call.args[0], locals, semantics)?;
            if receiver
                .as_deref()
                .and_then(|name| shared_vector_element(name, semantics))
                != value
            {
                return Err("push() requires a mutable vector and matching element".into());
            }
            let root = assignment_root(&call.receiver)
                .ok_or("push() receiver is not an addressable binding")?;
            if !locals.get(&root).is_some_and(|binding| binding.mutable) {
                return Err(format!("push() receiver {root} is immutable"));
            }
            Ok(None)
        }
        Expr::MethodCall(call) if call.method == "to_ascii_lowercase" => {
            if infer_expr_type(&call.receiver, locals, semantics)?.as_deref() != Some("char") {
                return Err("to_ascii_lowercase() is supported only on char".into());
            }
            Ok(Some("char".into()))
        }
        Expr::MethodCall(call) if call.method == "collect" => {
            let Expr::MethodCall(chars) = &*call.receiver else {
                unreachable!()
            };
            if infer_expr_type(&chars.receiver, locals, semantics)?.as_deref() != Some("&str") {
                return Err("chars().collect() is supported only on &str".into());
            }
            Ok(Some("Vec<char>".into()))
        }
        Expr::Struct(structure) => {
            let name = path_name(&structure.path);
            let declared = semantics
                .fields
                .get(&name)
                .ok_or_else(|| format!("unknown struct {name}"))?;
            if structure.fields.len() != declared.len() {
                return Err(format!("struct {name} needs all declared fields"));
            }
            for field in &structure.fields {
                let actual = infer_expr_type(&field.expr, locals, semantics)?;
                let syn::Member::Named(member) = &field.member else {
                    unreachable!();
                };
                if declared.get(&member.to_string()).map(String::as_str) == Some("i64")
                    && actual.as_deref() != Some("i64")
                {
                    return Err("i64 fields require explicitly typed values".into());
                }
                if !declared.contains_key(&member.to_string()) {
                    return Err(format!("unknown field {name}.{member}"));
                }
            }
            Ok(Some(name))
        }
        Expr::Call(call) => {
            if let Expr::Path(path) = &*call.func {
                if path_name(&path.path) == "Vec::new" && call.args.is_empty() {
                    return Err("Vec::new() requires an explicitly typed Vec<usize> local".into());
                }
            }
            for argument in &call.args {
                infer_expr_type(argument, locals, semantics)?;
            }
            let Expr::Path(path) = &*call.func else {
                unreachable!()
            };
            if path.path.segments.len() == 1 {
                let name = path.path.segments[0].ident.to_string();
                let (parameters, result) = semantics
                    .functions
                    .get(&name)
                    .ok_or_else(|| format!("unknown function {name}"))?;
                if call.args.len() != parameters.len() {
                    return Err(format!("function {name} has the wrong argument count"));
                }
                for (argument, expected) in call.args.iter().zip(parameters) {
                    let actual = infer_expr_type(argument, locals, semantics)?
                        .ok_or("argument has no shared type")?;
                    let numeric_literal = matches!(
                        argument,
                        Expr::Lit(syn::ExprLit {
                            lit: syn::Lit::Int(_),
                            ..
                        })
                    );
                    if actual != *expected
                        && !(numeric_literal
                            && actual == "usize"
                            && matches!(expected.as_str(), "u32" | "i32"))
                    {
                        return Err(format!("function {name} argument type differs"));
                    }
                }
                return Ok(Some(result.clone()));
            }
            let name = path.path.segments[0].ident.to_string();
            let variant = path.path.segments[1].ident.to_string();
            if !matches!(
                semantics.variants.get(&(name.clone(), variant)),
                Some(Some(_))
            ) {
                return Err("call is not a declared enum constructor".into());
            }
            if semantics
                .variants
                .get(&(name.clone(), path.path.segments[1].ident.to_string()))
                .and_then(Clone::clone)
                .as_deref()
                == Some("i64")
                && infer_expr_type(&call.args[0], locals, semantics)?.as_deref() != Some("i64")
            {
                return Err("i64 payloads require explicitly typed values".into());
            }
            Ok(Some(name))
        }
        Expr::Assign(assign) => {
            let destination = infer_expr_type(&assign.left, locals, semantics)?
                .ok_or("assignment destination has no shared type")?;
            let source = infer_expr_type(&assign.right, locals, semantics)?
                .ok_or("assignment source has no shared type")?;
            match &*assign.left {
                Expr::Path(_)
                    if scalar(&destination)
                        || (semantics.copy.contains(&destination)
                            && semantics
                                .variants
                                .keys()
                                .any(|(name, _)| name == &destination)) => {}
                Expr::Index(_)
                    if destination == "usize"
                        || destination == "char"
                        || (semantics.fields.contains_key(&destination)
                            && semantics.copy.contains(&destination)) => {}
                _ => {
                    return Err(
                        "assignment target must be a scalar or Copy enum binding or vector element"
                            .into(),
                    )
                }
            }
            if destination != source
                && !(matches!(
                    &*assign.right,
                    Expr::Lit(syn::ExprLit {
                        lit: syn::Lit::Int(_),
                        ..
                    })
                ) && matches!(destination.as_str(), "u32" | "i32"))
            {
                return Err("assignment source and destination types differ".into());
            }
            let root = assignment_root(&assign.left)
                .ok_or("assignment target is not an addressable binding")?;
            if !locals.get(&root).is_some_and(|binding| binding.mutable) {
                return Err(format!("assignment target {root} is immutable"));
            }
            Ok(None)
        }
        Expr::If(branch) => {
            check_if_methods(branch, locals, semantics)?;
            Ok(None)
        }
        Expr::While(loop_) => {
            infer_expr_type(&loop_.cond, locals, semantics)?;
            check_body_methods(&loop_.body, &mut locals.clone(), semantics)?;
            Ok(None)
        }
        Expr::Return(ret) => {
            if let Some(value) = &ret.expr {
                let actual = infer_expr_type(value, locals, semantics)?;
                if semantics.return_type.as_deref() == Some("i64")
                    && actual.as_deref() != Some("i64")
                {
                    return Err("i64 returns require explicitly typed values".into());
                }
            }
            Ok(None)
        }
        Expr::Break(_) => Ok(None),
        _ => Ok(None),
    }
}

fn check_body_methods(
    block: &syn::Block,
    locals: &mut Bindings,
    semantics: &Semantics,
) -> Result<()> {
    for statement in &block.stmts {
        match statement {
            Stmt::Local(local) => {
                let (name, mutable) = pattern_ident(&local.pat)?;
                let initializer = &local.init.as_ref().unwrap().expr;
                if matches!(&**initializer, Expr::Reference(_)) {
                    return Err("borrowed references cannot be stored in locals".into());
                }
                let ty = if is_new_index_vector(initializer) {
                    let Pat::Type(typed) = &local.pat else {
                        return Err(
                            "Vec::new() requires an explicitly typed Vec<usize> local".into()
                        );
                    };
                    let vector_type = type_name(&typed.ty)?;
                    if shared_vector_element(&vector_type, semantics).is_none() {
                        return Err("Vec::new() requires a shared vector type".into());
                    }
                    vector_type
                } else {
                    let inferred = infer_expr_type(initializer, locals, semantics)?;
                    if let Pat::Type(typed) = &local.pat {
                        let declared = type_name(&typed.ty)?;
                        if declared == "i64" && inferred.as_deref() != Some("i64") {
                            return Err("i64 locals require explicitly typed values".into());
                        }
                        declared
                    } else {
                        inferred.ok_or_else(|| format!("cannot infer type of {name}"))?
                    }
                };
                if ty.starts_with('&') && ty != "&str" {
                    return Err("borrowed structs cannot be stored in locals".into());
                }
                locals.insert(name, Binding { ty, mutable });
            }
            Stmt::Expr(value, _) => {
                infer_expr_type(value, locals, semantics)?;
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn check_operations(file: &syn::File) -> Result<()> {
    let mut semantics = Semantics {
        return_type: None,
        fields: BTreeMap::new(),
        copy: BTreeSet::new(),
        equality: BTreeSet::new(),
        variants: BTreeMap::new(),
        functions: BTreeMap::new(),
    };
    for item in &file.items {
        match item {
            Item::Struct(structure) => {
                let name = structure.ident.to_string();
                let traits = derives(&structure.attrs)?;
                if traits.contains("Copy") {
                    semantics.copy.insert(name.clone());
                }
                if traits.contains("PartialEq") {
                    semantics.equality.insert(name.clone());
                }
                let Fields::Named(fields) = &structure.fields else {
                    unreachable!();
                };
                let mut types = BTreeMap::new();
                for field in &fields.named {
                    types.insert(
                        field.ident.as_ref().unwrap().to_string(),
                        type_name(&field.ty)?,
                    );
                }
                semantics.fields.insert(name, types);
            }
            Item::Enum(enumeration) => {
                let name = enumeration.ident.to_string();
                let traits = derives(&enumeration.attrs)?;
                if traits.contains("Copy") {
                    semantics.copy.insert(name.clone());
                }
                if traits.contains("PartialEq") {
                    semantics.equality.insert(name.clone());
                }
                for variant in &enumeration.variants {
                    let payload = match &variant.fields {
                        Fields::Unit => None,
                        Fields::Unnamed(fields) => Some(type_name(&fields.unnamed[0].ty)?),
                        _ => unreachable!(),
                    };
                    semantics
                        .variants
                        .insert((name.clone(), variant.ident.to_string()), payload);
                }
            }
            Item::Fn(function) => {
                let parameters = function
                    .sig
                    .inputs
                    .iter()
                    .map(|input| match input {
                        FnArg::Typed(parameter) => type_name(&parameter.ty),
                        _ => Err("receiver is outside the subset".into()),
                    })
                    .collect::<Result<Vec<_>>>()?;
                let syn::ReturnType::Type(_, return_type) = &function.sig.output else {
                    return Err("explicit return type is required".into());
                };
                semantics.functions.insert(
                    function.sig.ident.to_string(),
                    (parameters, type_name(return_type)?),
                );
            }
            _ => {}
        }
    }
    let constants = file
        .items
        .iter()
        .filter_map(|item| match item {
            Item::Const(value) => Some((value.ident.to_string(), type_name(&value.ty))),
            _ => None,
        })
        .map(|(name, ty)| ty.map(|ty| (name, Binding { ty, mutable: false })))
        .collect::<Result<Bindings>>()?;
    for item in &file.items {
        if let Item::Const(constant) = item {
            if type_name(&constant.ty)? == "i64"
                && infer_expr_type(&constant.expr, &constants, &semantics)?.as_deref()
                    != Some("i64")
            {
                return Err("i64 constants require explicitly typed values".into());
            }
        }
        if let Item::Fn(function) = item {
            let syn::ReturnType::Type(_, ty) = &function.sig.output else {
                unreachable!()
            };
            semantics.return_type = Some(type_name(ty)?);
            let mut locals = constants.clone();
            for parameter in &function.sig.inputs {
                let FnArg::Typed(parameter) = parameter else {
                    unreachable!()
                };
                let (name, mutable) = pattern_ident(&parameter.pat)?;
                locals.insert(
                    name,
                    Binding {
                        ty: type_name(&parameter.ty)?,
                        mutable,
                    },
                );
            }
            check_body_methods(&function.block, &mut locals, &semantics)?;
            if semantics.return_type.as_deref() == Some("i64") {
                if let Some(Stmt::Expr(tail, None)) = function.block.stmts.last() {
                    if !matches!(tail, Expr::Return(_))
                        && infer_expr_type(tail, &locals, &semantics)?.as_deref() != Some("i64")
                    {
                        return Err("i64 returns require explicitly typed values".into());
                    }
                }
            }
        }
    }
    Ok(())
}
