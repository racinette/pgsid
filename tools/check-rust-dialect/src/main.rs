use std::{collections::BTreeSet, env, fs};

use syn::{Expr, FnArg, Item, Pat, ReturnType, Stmt, Type, Visibility};

fn type_name(ty: &Type) -> Result<&'static str, String> {
    match ty {
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("Int4Value") => {
            Ok("Int4Value")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("TextValue") => {
            Ok("TextValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("CheckOutcome") => {
            Ok("CheckOutcome")
        }
        _ => Err("type is outside the CHECK subset".into()),
    }
}

fn identifier(expr: &Expr) -> Result<String, String> {
    let Expr::Path(path) = expr else {
        return Err("expected a bound identifier".into());
    };
    if !path.attrs.is_empty()
        || path.qself.is_some()
        || path.path.segments.len() != 1
        || !matches!(path.path.segments[0].arguments, syn::PathArguments::None)
    {
        return Err("expected a bound identifier".into());
    }
    Ok(path.path.segments[0].ident.to_string())
}

fn call(expr: &Expr, bindings: &BTreeSet<String>) -> Result<(), String> {
    let Expr::Call(call) = expr else {
        return Err("expected a direct function call".into());
    };
    if !call.attrs.is_empty() {
        return Err("call attributes are outside the CHECK subset".into());
    }
    let Expr::Path(callee) = &*call.func else {
        return Err("expected a direct function call".into());
    };
    if !callee.attrs.is_empty()
        || callee.qself.is_some()
        || callee.path.segments.len() != 1
        || !matches!(callee.path.segments[0].arguments, syn::PathArguments::None)
    {
        return Err("expected a direct function call".into());
    }
    for arg in &call.args {
        match arg {
            Expr::Path(_) if bindings.contains(&identifier(arg)?) => {}
            Expr::Lit(literal)
                if literal.attrs.is_empty()
                    && matches!(&literal.lit, syn::Lit::Int(value) if value.to_string().chars().all(|digit| digit.is_ascii_digit())) =>
                {}
            Expr::Lit(literal)
                if literal.attrs.is_empty() && matches!(&literal.lit, syn::Lit::Str(_)) => {}
            _ => return Err("call argument is outside the CHECK subset".into()),
        }
    }
    Ok(())
}

fn check_function(function: &syn::ItemFn, names: &mut BTreeSet<String>) -> Result<(), String> {
    if !function.attrs.is_empty()
        || function.sig.constness.is_some()
        || function.sig.asyncness.is_some()
        || function.sig.unsafety.is_some()
        || function.sig.abi.is_some()
        || !function.sig.generics.params.is_empty()
        || function.sig.generics.where_clause.is_some()
        || function.sig.variadic.is_some()
    {
        return Err("function declaration is outside the CHECK subset".into());
    }
    let name = function.sig.ident.to_string();
    if !names.insert(name.clone()) {
        return Err(format!("duplicate function {name}"));
    }
    let entry = name == "evaluate_check";
    if !matches!(
        (&function.vis, entry),
        (Visibility::Public(_), true) | (Visibility::Inherited, false)
    ) {
        return Err("only evaluate_check may be public".into());
    }
    if !entry && !name.starts_with("check_part_") {
        return Err("private function must be a generated check_part".into());
    }
    if !matches!(&function.sig.output, ReturnType::Type(_, ty) if type_name(ty).as_deref() == Ok("CheckOutcome"))
    {
        return Err("function must return CheckOutcome".into());
    }
    let mut bindings = BTreeSet::new();
    for input in &function.sig.inputs {
        let FnArg::Typed(parameter) = input else {
            return Err("receiver is outside the CHECK subset".into());
        };
        if !parameter.attrs.is_empty()
            || !matches!(type_name(&parameter.ty)?, "Int4Value" | "TextValue")
        {
            return Err("parameter is outside the CHECK subset".into());
        }
        let Pat::Ident(pattern) = &*parameter.pat else {
            return Err("parameter must be an identifier".into());
        };
        if !pattern.attrs.is_empty()
            || pattern.mutability.is_some()
            || pattern.by_ref.is_some()
            || pattern.subpat.is_some()
        {
            return Err("parameter must be an immutable identifier".into());
        }
        if !bindings.insert(pattern.ident.to_string()) {
            return Err("duplicate parameter".into());
        }
    }
    let statements = &function.block.stmts;
    if statements.is_empty() {
        return Err("function needs a tail call".into());
    }
    for (index, statement) in statements.iter().enumerate() {
        let last = index + 1 == statements.len();
        match statement {
            Stmt::Local(local) if !last => {
                if !local.attrs.is_empty() {
                    return Err("local binding is outside the CHECK subset".into());
                }
                let Pat::Ident(pattern) = &local.pat else {
                    return Err("local binding must be an identifier".into());
                };
                if !pattern.attrs.is_empty()
                    || pattern.mutability.is_some()
                    || pattern.by_ref.is_some()
                    || pattern.subpat.is_some()
                {
                    return Err("local binding must be immutable".into());
                }
                let initializer = local
                    .init
                    .as_ref()
                    .ok_or("local needs a call initializer")?;
                if initializer.diverge.is_some() {
                    return Err("let-else is outside the CHECK subset".into());
                }
                call(&initializer.expr, &bindings)?;
                if !bindings.insert(pattern.ident.to_string()) {
                    return Err("duplicate local binding".into());
                }
            }
            Stmt::Expr(Expr::If(branch), _) if !last => {
                if !branch.attrs.is_empty() || branch.else_branch.is_some() {
                    return Err("conditional is outside the CHECK subset".into());
                }
                call(&branch.cond, &bindings)?;
                let [Stmt::Expr(Expr::Return(ret), Some(_))] = branch.then_branch.stmts.as_slice()
                else {
                    return Err("conditional must contain one early return".into());
                };
                if !ret.attrs.is_empty()
                    || !bindings.contains(&identifier(
                        ret.expr.as_deref().ok_or("return needs a value")?,
                    )?)
                {
                    return Err("return must use a bound identifier".into());
                }
            }
            Stmt::Expr(expr, None) if last => call(expr, &bindings)?,
            _ => return Err("statement is outside the CHECK subset".into()),
        }
    }
    Ok(())
}

fn check_source(source: &str) -> Result<(), String> {
    let file = syn::parse_file(source).map_err(|error| error.to_string())?;
    if !file.attrs.is_empty() {
        return Err("file attributes are outside the CHECK subset".into());
    }
    let mut names = BTreeSet::new();
    for item in &file.items {
        let Item::Fn(function) = item else {
            return Err("only functions are in the generated CHECK subset".into());
        };
        check_function(function, &mut names)?;
    }
    if !names.contains("evaluate_check") {
        return Err("missing public evaluate_check".into());
    }
    Ok(())
}

fn main() {
    let path = env::args()
        .nth(1)
        .expect("usage: pgsid-check-rust-dialect SOURCE");
    let source = fs::read_to_string(path).expect("cannot read CHECK Rust source");
    if let Err(error) = check_source(&source) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::check_source;

    const VALID: &str = r#"
fn check_part_0(amount: Int4Value) -> CheckOutcome {
    let zero = make_int4_value(0);
    eval_int4_gt(amount, zero)
}
pub fn evaluate_check(amount: Int4Value) -> CheckOutcome {
    let left = check_part_0(amount);
    if and_stops(left) { return left; }
    and_finish(left, left)
}
"#;

    #[test]
    fn accepts_small_generated_shape() {
        check_source(VALID).unwrap();
    }

    #[test]
    fn rejects_mutation_and_loops() {
        assert!(check_source(&VALID.replace("let left", "let mut left")).is_err());
        assert!(check_source(&VALID.replace(
            "if and_stops(left) { return left; }",
            "while and_stops(left) { return left; }"
        ))
        .is_err());
    }

    #[test]
    fn rejects_nested_calls_and_control_flow_in_arguments() {
        assert!(check_source(&VALID.replace(
            "and_finish(left, left)",
            "and_finish(left, check_part_0(amount))"
        ))
        .is_err());
        assert!(check_source(&VALID.replace(
            "and_finish(left, left)",
            "and_finish(left, { return left; })"
        ))
        .is_err());
    }

    #[test]
    fn rejects_declarations_and_other_public_functions() {
        assert!(check_source(&format!("enum State {{ Unknown }}\n{VALID}")).is_err());
        assert!(check_source(&VALID.replace("fn check_part_0", "pub fn check_part_0")).is_err());
    }

    #[test]
    fn rejects_generic_and_non_decimal_calls() {
        assert!(check_source(
            &VALID.replace("and_finish(left, left)", "and_finish::<u32>(left, left)")
        )
        .is_err());
        assert!(
            check_source(&VALID.replace("make_int4_value(0)", "make_int4_value(0x0)")).is_err()
        );
    }

    #[test]
    fn accepts_string_literals_and_rejects_byte_strings() {
        let source = r#"
fn check_part_0(status: TextValue) -> CheckOutcome {
    let housed = make_text_value("housed");
    compare_status(status, housed)
}
pub fn evaluate_check(status: TextValue) -> CheckOutcome {
    check_part_0(status)
}
"#;
        check_source(source).unwrap();
        assert!(check_source(&source.replace("\"housed\"", "b\"housed\"")).is_err());
        assert!(check_source(&source.replace("\"housed\"", "r#\"housed\"#")).is_ok());
    }
}
