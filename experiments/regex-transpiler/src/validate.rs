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

fn infer_expr_type(value: &Expr, locals: &BTreeMap<String, String>) -> Result<Option<String>> {
    match value {
        Expr::Path(path) if path.path.segments.len() == 1 => {
            Ok(locals.get(&path_name(&path.path)).cloned())
        }
        Expr::Lit(syn::ExprLit {
            lit: syn::Lit::Int(_),
            ..
        }) => Ok(Some("usize".into())),
        Expr::Paren(paren) => infer_expr_type(&paren.expr, locals),
        Expr::Group(group) => infer_expr_type(&group.expr, locals),
        Expr::Binary(binary) => {
            let left = infer_expr_type(&binary.left, locals)?;
            infer_expr_type(&binary.right, locals)?;
            match binary.op {
                syn::BinOp::Add(_) | syn::BinOp::Sub(_) => Ok(left),
                syn::BinOp::AddAssign(_) => Ok(None),
                _ => Ok(Some("bool".into())),
            }
        }
        Expr::Field(field) => {
            infer_expr_type(&field.base, locals)?;
            Ok(None)
        }
        Expr::Index(index) => {
            let base = infer_expr_type(&index.expr, locals)?;
            infer_expr_type(&index.index, locals)?;
            if base.as_deref() == Some("Vec<char>") {
                Ok(Some("char".into()))
            } else {
                Ok(None)
            }
        }
        Expr::MethodCall(call) if call.method == "len" => {
            if infer_expr_type(&call.receiver, locals)?.as_deref() != Some("Vec<char>") {
                return Err("len() is supported only on Vec<char>".into());
            }
            Ok(Some("usize".into()))
        }
        Expr::MethodCall(call) if call.method == "collect" => {
            let Expr::MethodCall(chars) = &*call.receiver else {
                unreachable!()
            };
            if infer_expr_type(&chars.receiver, locals)?.as_deref() != Some("&str") {
                return Err("chars().collect() is supported only on &str".into());
            }
            Ok(Some("Vec<char>".into()))
        }
        Expr::Struct(structure) => {
            for field in &structure.fields {
                infer_expr_type(&field.expr, locals)?;
            }
            Ok(Some(path_name(&structure.path)))
        }
        Expr::Call(call) => {
            for argument in &call.args {
                infer_expr_type(argument, locals)?;
            }
            let Expr::Path(path) = &*call.func else {
                unreachable!()
            };
            Ok(path_name(&path.path)
                .split_once("::")
                .map(|(name, _)| name.to_string()))
        }
        Expr::If(branch) => {
            infer_expr_type(&branch.cond, locals)?;
            check_body_methods(&branch.then_branch, &mut locals.clone())?;
            Ok(None)
        }
        Expr::While(loop_) => {
            infer_expr_type(&loop_.cond, locals)?;
            check_body_methods(&loop_.body, &mut locals.clone())?;
            Ok(None)
        }
        Expr::Return(ret) => {
            if let Some(value) = &ret.expr {
                infer_expr_type(value, locals)?;
            }
            Ok(None)
        }
        Expr::Break(_) => Ok(None),
        _ => Ok(None),
    }
}

fn check_body_methods(block: &syn::Block, locals: &mut BTreeMap<String, String>) -> Result<()> {
    for statement in &block.stmts {
        match statement {
            Stmt::Local(local) => {
                let (name, _) = pattern_ident(&local.pat)?;
                let inferred = infer_expr_type(&local.init.as_ref().unwrap().expr, locals)?;
                let ty = if let Pat::Type(typed) = &local.pat {
                    type_name(&typed.ty)?
                } else {
                    inferred.ok_or_else(|| format!("cannot infer type of {name}"))?
                };
                locals.insert(name, ty);
            }
            Stmt::Expr(value, _) => {
                infer_expr_type(value, locals)?;
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn check_methods(file: &syn::File) -> Result<()> {
    let constants = file
        .items
        .iter()
        .filter_map(|item| match item {
            Item::Const(value) => Some((value.ident.to_string(), type_name(&value.ty))),
            _ => None,
        })
        .map(|(name, ty)| ty.map(|ty| (name, ty)))
        .collect::<Result<BTreeMap<_, _>>>()?;
    for item in &file.items {
        if let Item::Fn(function) = item {
            let mut locals = constants.clone();
            for parameter in &function.sig.inputs {
                let FnArg::Typed(parameter) = parameter else {
                    unreachable!()
                };
                let (name, _) = pattern_ident(&parameter.pat)?;
                locals.insert(name, type_name(&parameter.ty)?);
            }
            check_body_methods(&function.block, &mut locals)?;
        }
    }
    Ok(())
}
