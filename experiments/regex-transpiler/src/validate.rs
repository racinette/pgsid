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
    matches!(name, "usize" | "u32" | "i32" | "bool" | "char" | "&str")
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
    fields: BTreeMap<String, BTreeMap<String, String>>,
    equality: BTreeSet<String>,
    variants: BTreeMap<(String, String), Option<String>>,
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

fn numeric(name: &str) -> bool {
    matches!(name, "usize" | "u32" | "i32")
}

fn checked_arithmetic(name: &str) -> bool {
    matches!(name, "usize" | "u32")
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
            lit: syn::Lit::Int(_),
            ..
        }) => Ok(Some("usize".into())),
        Expr::Lit(syn::ExprLit {
            lit: syn::Lit::Char(_),
            ..
        }) => Ok(Some("char".into())),
        Expr::Paren(paren) => infer_expr_type(&paren.expr, locals, semantics),
        Expr::Group(group) => infer_expr_type(&group.expr, locals, semantics),
        Expr::Binary(binary) => {
            let left = infer_expr_type(&binary.left, locals, semantics)?;
            let right = infer_expr_type(&binary.right, locals, semantics)?;
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
                syn::BinOp::Add(_) | syn::BinOp::Sub(_) => {
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
            semantics
                .fields
                .get(&base)
                .and_then(|fields| fields.get(&member.to_string()))
                .cloned()
                .map(Some)
                .ok_or_else(|| format!("unknown field {base}.{member}"))
        }
        Expr::Index(index) => {
            let base = infer_expr_type(&index.expr, locals, semantics)?;
            infer_expr_type(&index.index, locals, semantics)?;
            if base.as_deref() == Some("Vec<char>") {
                Ok(Some("char".into()))
            } else {
                Err("indexing is supported only on Vec<char>".into())
            }
        }
        Expr::MethodCall(call) if call.method == "len" => {
            if infer_expr_type(&call.receiver, locals, semantics)?.as_deref() != Some("Vec<char>") {
                return Err("len() is supported only on Vec<char>".into());
            }
            Ok(Some("usize".into()))
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
                infer_expr_type(&field.expr, locals, semantics)?;
                let syn::Member::Named(member) = &field.member else {
                    unreachable!();
                };
                if !declared.contains_key(&member.to_string()) {
                    return Err(format!("unknown field {name}.{member}"));
                }
            }
            Ok(Some(name))
        }
        Expr::Call(call) => {
            for argument in &call.args {
                infer_expr_type(argument, locals, semantics)?;
            }
            let Expr::Path(path) = &*call.func else {
                unreachable!()
            };
            let name = path.path.segments[0].ident.to_string();
            let variant = path.path.segments[1].ident.to_string();
            if !matches!(
                semantics.variants.get(&(name.clone(), variant)),
                Some(Some(_))
            ) {
                return Err("call is not a declared enum constructor".into());
            }
            Ok(Some(name))
        }
        Expr::If(branch) => {
            infer_expr_type(&branch.cond, locals, semantics)?;
            check_body_methods(&branch.then_branch, &mut locals.clone(), semantics)?;
            Ok(None)
        }
        Expr::While(loop_) => {
            infer_expr_type(&loop_.cond, locals, semantics)?;
            check_body_methods(&loop_.body, &mut locals.clone(), semantics)?;
            Ok(None)
        }
        Expr::Return(ret) => {
            if let Some(value) = &ret.expr {
                infer_expr_type(value, locals, semantics)?;
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
                let inferred =
                    infer_expr_type(&local.init.as_ref().unwrap().expr, locals, semantics)?;
                let ty = if let Pat::Type(typed) = &local.pat {
                    type_name(&typed.ty)?
                } else {
                    inferred.ok_or_else(|| format!("cannot infer type of {name}"))?
                };
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
        fields: BTreeMap::new(),
        equality: BTreeSet::new(),
        variants: BTreeMap::new(),
    };
    for item in &file.items {
        match item {
            Item::Struct(structure) => {
                let name = structure.ident.to_string();
                if derives(&structure.attrs)?.contains("PartialEq") {
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
                if derives(&enumeration.attrs)?.contains("PartialEq") {
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
        if let Item::Fn(function) = item {
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
        }
    }
    Ok(())
}
