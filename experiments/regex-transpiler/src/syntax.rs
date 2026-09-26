use syn::{BinOp, Expr, Fields, FnArg, Item, Pat, ReturnType, Stmt, Type};

type Result = std::result::Result<(), String>;

fn no_attrs(attrs: &[syn::Attribute]) -> Result {
    if attrs.is_empty() {
        Ok(())
    } else {
        Err("attributes are outside the syntax subset".into())
    }
}

fn path(path: &syn::Path, max_segments: usize) -> Result {
    if path.leading_colon.is_some()
        || path.segments.is_empty()
        || path.segments.len() > max_segments
        || path
            .segments
            .iter()
            .any(|segment| !matches!(segment.arguments, syn::PathArguments::None))
    {
        return Err("path is outside the syntax subset".into());
    }
    Ok(())
}

fn ty(ty: &Type) -> Result {
    match ty {
        Type::Reference(reference)
            if reference.lifetime.is_none() && reference.mutability.is_none() =>
        {
            self::ty(&reference.elem)
        }
        Type::Path(name) if name.qself.is_none() && name.path.segments.len() == 1 => {
            let segment = &name.path.segments[0];
            if segment.ident == "Vec" {
                let syn::PathArguments::AngleBracketed(arguments) = &segment.arguments else {
                    return Err("Vec needs one type argument".into());
                };
                if arguments.args.len() != 1 {
                    return Err("Vec needs one type argument".into());
                }
                let syn::GenericArgument::Type(inner) = &arguments.args[0] else {
                    return Err("Vec needs one type argument".into());
                };
                self::ty(inner)
            } else {
                path(&name.path, 1)
            }
        }
        _ => Err("type is outside the syntax subset".into()),
    }
}

fn pat(pat: &Pat) -> Result {
    match pat {
        Pat::Ident(ident)
            if ident.attrs.is_empty() && ident.by_ref.is_none() && ident.subpat.is_none() =>
        {
            Ok(())
        }
        Pat::Type(typed) if typed.attrs.is_empty() => {
            self::pat(&typed.pat)?;
            ty(&typed.ty)
        }
        _ => Err("pattern is outside the syntax subset".into()),
    }
}

fn expr(expr: &Expr) -> Result {
    match expr {
        Expr::Path(node) if node.attrs.is_empty() && node.qself.is_none() => path(&node.path, 2),
        Expr::Lit(node)
            if node.attrs.is_empty()
                && matches!(
                    node.lit,
                    syn::Lit::Int(_) | syn::Lit::Char(_) | syn::Lit::Bool(_)
                ) =>
        {
            Ok(())
        }
        Expr::Paren(node) if node.attrs.is_empty() => self::expr(&node.expr),
        Expr::Group(node) if node.attrs.is_empty() => self::expr(&node.expr),
        Expr::Cast(node) if node.attrs.is_empty() => {
            if !matches!(&*node.ty, Type::Path(target) if target.path.is_ident("u32")) {
                return Err("only casts to u32 are in the syntax subset".into());
            }
            self::expr(&node.expr)
        }
        Expr::Binary(node) if node.attrs.is_empty() => {
            if !matches!(
                node.op,
                BinOp::Add(_)
                    | BinOp::Sub(_)
                    | BinOp::Lt(_)
                    | BinOp::Le(_)
                    | BinOp::Gt(_)
                    | BinOp::Ge(_)
                    | BinOp::Eq(_)
                    | BinOp::Ne(_)
                    | BinOp::And(_)
                    | BinOp::Or(_)
            ) {
                return Err("binary operator is outside the syntax subset".into());
            }
            self::expr(&node.left)?;
            self::expr(&node.right)
        }
        Expr::Field(node)
            if node.attrs.is_empty() && matches!(node.member, syn::Member::Named(_)) =>
        {
            self::expr(&node.base)
        }
        Expr::Index(node) if node.attrs.is_empty() => {
            self::expr(&node.expr)?;
            self::expr(&node.index)
        }
        Expr::MethodCall(node) if node.attrs.is_empty() && node.turbofish.is_none() => {
            let method = node.method.to_string();
            if method == "len" && node.args.is_empty() {
                return self::expr(&node.receiver);
            }
            if method == "to_ascii_lowercase" && node.args.is_empty() {
                return self::expr(&node.receiver);
            }
            if method == "collect" && node.args.is_empty() {
                let Expr::MethodCall(chars) = &*node.receiver else {
                    return Err("only chars().collect() is in the syntax subset".into());
                };
                if !chars.attrs.is_empty()
                    || chars.turbofish.is_some()
                    || chars.method != "chars"
                    || !chars.args.is_empty()
                {
                    return Err("only chars().collect() is in the syntax subset".into());
                }
                return self::expr(&chars.receiver);
            }
            Err("method call is outside the syntax subset".into())
        }
        Expr::Struct(node) if node.attrs.is_empty() && node.rest.is_none() => {
            path(&node.path, 1)?;
            for field in &node.fields {
                no_attrs(&field.attrs)?;
                if !matches!(field.member, syn::Member::Named(_)) {
                    return Err("tuple fields are outside the syntax subset".into());
                }
                self::expr(&field.expr)?;
            }
            Ok(())
        }
        Expr::Call(node) if node.attrs.is_empty() => {
            let Expr::Path(callee) = &*node.func else {
                return Err("only named calls are in the syntax subset".into());
            };
            no_attrs(&callee.attrs)?;
            if callee.qself.is_some() {
                return Err("qualified calls are outside the syntax subset".into());
            }
            path(&callee.path, 2)?;
            if callee.path.segments.len() == 2
                && callee.path.segments[0].ident == "Vec"
                && callee.path.segments[1].ident == "new"
                && node.args.is_empty()
            {
                return Ok(());
            }
            if callee.path.segments.len() != 2 || node.args.len() != 1 {
                return Err(
                    "only single-payload enum constructors are in the syntax subset".into(),
                );
            }
            for arg in &node.args {
                self::expr(arg)?;
            }
            Ok(())
        }
        _ => Err("expression is outside the syntax subset".into()),
    }
}

fn returns_from_both_branches(branch: &syn::ExprIf) -> bool {
    let Some((_, alternate)) = &branch.else_branch else {
        return false;
    };
    let alternate_returns = match &**alternate {
        Expr::Block(alternate) => returns_from_block(&alternate.block),
        Expr::If(alternate) => returns_from_both_branches(alternate),
        _ => false,
    };
    returns_from_block(&branch.then_branch) && alternate_returns
}

fn returns_from_block(block: &syn::Block) -> bool {
    match block.stmts.last() {
        Some(Stmt::Expr(Expr::Return(_), _)) => true,
        Some(Stmt::Expr(Expr::If(branch), _)) => returns_from_both_branches(branch),
        _ => false,
    }
}

fn if_statement(branch: &syn::ExprIf) -> Result {
    no_attrs(&branch.attrs)?;
    expr(&branch.cond)?;
    block(&branch.then_branch, false)?;
    if let Some((_, alternate)) = &branch.else_branch {
        match &**alternate {
            Expr::Block(alternate) => {
                no_attrs(&alternate.attrs)?;
                block(&alternate.block, false)?;
            }
            Expr::If(alternate) => if_statement(alternate)?,
            _ => return Err("else branch must be a block or if".into()),
        }
    }
    Ok(())
}

fn block(block: &syn::Block, function_body: bool) -> Result {
    for (index, statement) in block.stmts.iter().enumerate() {
        if index + 1 == block.stmts.len() {
            if let Stmt::Expr(value, None) = statement {
                if matches!(value, Expr::If(branch) if branch.else_branch.is_some() && !returns_from_both_branches(branch))
                {
                    return Err("expression-valued if is outside the syntax subset".into());
                }
                if !function_body
                    && !matches!(
                        value,
                        Expr::Return(_) | Expr::Break(_) | Expr::If(_) | Expr::While(_)
                    )
                {
                    return Err("branch tail value is outside the syntax subset".into());
                }
            }
        }
        match statement {
            Stmt::Local(local) => {
                no_attrs(&local.attrs)?;
                pat(&local.pat)?;
                let Some(init) = &local.init else {
                    return Err("uninitialized local is outside the syntax subset".into());
                };
                if init.diverge.is_some() {
                    return Err("let-else is outside the syntax subset".into());
                }
                expr(&init.expr)?;
            }
            Stmt::Expr(Expr::Return(node), _) if node.attrs.is_empty() => {
                let Some(value) = &node.expr else {
                    return Err("bare return is outside the syntax subset".into());
                };
                expr(value)?;
            }
            Stmt::Expr(Expr::Break(node), _)
                if node.attrs.is_empty() && node.label.is_none() && node.expr.is_none() => {}
            Stmt::Expr(Expr::If(node), _) => if_statement(node)?,
            Stmt::Expr(Expr::While(node), _) if node.attrs.is_empty() && node.label.is_none() => {
                expr(&node.cond)?;
                self::block(&node.body, false)?;
            }
            Stmt::Expr(Expr::Binary(node), _)
                if node.attrs.is_empty() && matches!(node.op, BinOp::AddAssign(_)) =>
            {
                expr(&node.left)?;
                expr(&node.right)?;
            }
            Stmt::Expr(Expr::Assign(node), _) if node.attrs.is_empty() => {
                expr(&node.left)?;
                expr(&node.right)?;
            }
            Stmt::Expr(Expr::MethodCall(node), _)
                if node.attrs.is_empty()
                    && node.turbofish.is_none()
                    && node.method == "push"
                    && node.args.len() == 1 =>
            {
                expr(&node.receiver)?;
                expr(&node.args[0])?;
            }
            Stmt::Expr(value, _) => expr(value)?,
            _ => return Err("statement is outside the syntax subset".into()),
        }
    }
    Ok(())
}

pub fn check(file: &syn::File) -> Result {
    no_attrs(&file.attrs)?;
    for item in &file.items {
        match item {
            Item::Const(node) => {
                no_attrs(&node.attrs)?;
                ty(&node.ty)?;
                expr(&node.expr)?;
            }
            Item::Struct(node) => {
                if !node.generics.params.is_empty() || node.generics.where_clause.is_some() {
                    return Err("struct generics are outside the syntax subset".into());
                }
                let Fields::Named(fields) = &node.fields else {
                    return Err("only named structs are in the syntax subset".into());
                };
                for field in &fields.named {
                    no_attrs(&field.attrs)?;
                    ty(&field.ty)?;
                }
            }
            Item::Enum(node) => {
                if node.variants.is_empty() {
                    return Err("empty enums are outside the syntax subset".into());
                }
                if !node.generics.params.is_empty() || node.generics.where_clause.is_some() {
                    return Err("enum generics are outside the syntax subset".into());
                }
                for variant in &node.variants {
                    no_attrs(&variant.attrs)?;
                    if variant.discriminant.is_some() {
                        return Err("enum discriminants are outside the syntax subset".into());
                    }
                    match &variant.fields {
                        Fields::Unit => {}
                        Fields::Unnamed(fields) if fields.unnamed.len() == 1 => {
                            let field = &fields.unnamed[0];
                            no_attrs(&field.attrs)?;
                            ty(&field.ty)?;
                        }
                        _ => return Err("enum fields are outside the syntax subset".into()),
                    }
                }
            }
            Item::Fn(node) => {
                no_attrs(&node.attrs)?;
                let sig = &node.sig;
                if sig.asyncness.is_some()
                    || sig.constness.is_some()
                    || sig.unsafety.is_some()
                    || sig.abi.is_some()
                    || sig.variadic.is_some()
                    || !sig.generics.params.is_empty()
                    || sig.generics.where_clause.is_some()
                {
                    return Err("function modifiers are outside the syntax subset".into());
                }
                for arg in &sig.inputs {
                    let FnArg::Typed(arg) = arg else {
                        return Err("receiver is outside the syntax subset".into());
                    };
                    no_attrs(&arg.attrs)?;
                    pat(&arg.pat)?;
                    ty(&arg.ty)?;
                }
                let ReturnType::Type(_, output) = &sig.output else {
                    return Err("explicit return type is required".into());
                };
                ty(output)?;
                block(&node.block, true)?;
            }
            _ => return Err("top-level item is outside the syntax subset".into()),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::check;

    #[test]
    fn accepts_current_slice() {
        let file = syn::parse_file(include_str!("../transpiler_smoke.rs")).unwrap();
        assert!(check(&file).is_ok());
    }

    #[test]
    fn rejects_unlowered_constructs() {
        for source in [
            "pub fn f() -> usize { loop {} }",
            "pub fn f() -> usize { let x = 1 * 2; x }",
            "pub fn f() -> usize { let mut x = 1; let y = x += 1; y }",
            "pub fn f() -> usize { std::mem::size_of::<usize>() }",
            "pub fn f() -> usize { let x = vec![1]; x.len() }",
            "pub fn f() -> usize { helper() }",
            "pub fn f() -> usize { Outcome::Found(1, 2) }",
            "enum Empty {}",
            "#[allow(dead_code)] const X: usize = 1;",
            "pub fn f() -> usize { let x = 1; unsafe { x } }",
            "pub fn f(value: char) -> usize { value as usize }",
            "pub fn f(value: bool) -> usize { if value { 1 } else { 2 } }",
            "pub fn f(value: bool) -> usize { let result = if value { 1 } else { 2 }; result }",
        ] {
            let file = syn::parse_file(source).unwrap();
            assert!(check(&file).is_err(), "accepted: {source}");
        }
    }
}
