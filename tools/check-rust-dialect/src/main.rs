use std::{
    collections::{BTreeMap, BTreeSet},
    env, fs,
};

use syn::{Expr, FnArg, Item, Pat, ReturnType, Stmt, Type, Visibility};

fn digits(value: &str) -> bool {
    !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit())
}

fn entry_name(name: &str) -> bool {
    name == "evaluate_check"
        || name.strip_prefix("evaluate_check_").is_some_and(|suffix| {
            let Some((readable, hash)) = suffix.rsplit_once("_h") else {
                return false;
            };
            !readable.is_empty()
                && readable
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_')
                && hash.len() == 4
                && hash
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        })
}

fn type_name(ty: &Type) -> Result<&'static str, String> {
    match ty {
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("Int2Value") => {
            Ok("Int2Value")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("Int4Value") => {
            Ok("Int4Value")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("Int8Value") => {
            Ok("Int8Value")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("DateValue") => {
            Ok("DateValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("TimestampValue") => {
            Ok("TimestampValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("TimestamptzValue") => {
            Ok("TimestamptzValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("EnumValue") => {
            Ok("EnumValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("UuidValue") => {
            Ok("UuidValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("MacaddrValue") => {
            Ok("MacaddrValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("Macaddr8Value") => {
            Ok("Macaddr8Value")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("NetworkValue") => {
            Ok("NetworkValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("NumericValue") => {
            Ok("NumericValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("ByteaValue") => {
            Ok("ByteaValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("TextValue") => {
            Ok("TextValue")
        }
        Type::Path(path) if path.qself.is_none() && path.path.is_ident("BoolValue") => {
            Ok("BoolValue")
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

fn positive_literal(expr: &Expr) -> Option<u32> {
    let Expr::Lit(literal) = expr else {
        return None;
    };
    let syn::Lit::Int(value) = &literal.lit else {
        return None;
    };
    let source = value.to_string();
    if !literal.attrs.is_empty() || !digits(&source) {
        return None;
    }
    source
        .parse::<u32>()
        .ok()
        .filter(|value| *value <= i32::MAX as u32)
}

fn negative_literal(expr: &Expr) -> Option<u32> {
    let Expr::Unary(unary) = expr else {
        return None;
    };
    if !unary.attrs.is_empty() || !matches!(unary.op, syn::UnOp::Neg(_)) {
        return None;
    }
    positive_literal(&unary.expr)
}

fn int4_minimum(expr: &Expr) -> bool {
    let Expr::Binary(binary) = expr else {
        return false;
    };
    binary.attrs.is_empty()
        && matches!(binary.op, syn::BinOp::Sub(_))
        && negative_literal(&binary.left) == Some(i32::MAX as u32)
        && positive_literal(&binary.right) == Some(1)
}

fn int8_literal(expr: &Expr) -> bool {
    let (literal, negative) = match expr {
        Expr::Lit(literal) if literal.attrs.is_empty() => (literal, false),
        Expr::Unary(unary) if unary.attrs.is_empty() && matches!(unary.op, syn::UnOp::Neg(_)) => {
            let Expr::Lit(literal) = &*unary.expr else {
                return false;
            };
            if !literal.attrs.is_empty() {
                return false;
            }
            (literal, true)
        }
        _ => return false,
    };
    let syn::Lit::Int(integer) = &literal.lit else {
        return false;
    };
    let source = integer.to_string();
    let Some(digits) = source.strip_suffix("i64") else {
        return false;
    };
    self::digits(digits)
        && digits
            .parse::<u64>()
            .is_ok_and(|value| value <= i64::MAX as u64 + u64::from(negative))
}

fn owned_clone(expr: &Expr, bindings: &BTreeMap<String, bool>) -> Result<(), String> {
    let Expr::MethodCall(call) = expr else {
        return Err("expected an immutable value clone".into());
    };
    if !call.attrs.is_empty()
        || call.turbofish.is_some()
        || call.method != "clone"
        || !call.args.is_empty()
        || !bindings.contains_key(&identifier(&call.receiver)?)
    {
        return Err("expected a bound immutable value clone".into());
    }
    Ok(())
}

fn call(expr: &Expr, bindings: &BTreeMap<String, bool>) -> Result<(), String> {
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
            _ if int8_literal(arg) => {}
            Expr::Path(_) if bindings.contains_key(&identifier(arg)?) => {}
            Expr::MethodCall(_) => owned_clone(arg, bindings)?,
            Expr::Lit(_) if positive_literal(arg).is_some() => {}
            Expr::Unary(_) if negative_literal(arg).is_some() => {}
            Expr::Binary(_) if int4_minimum(arg) => {}
            Expr::Lit(literal)
                if literal.attrs.is_empty() && matches!(&literal.lit, syn::Lit::Str(_)) => {}
            Expr::Lit(literal)
                if literal.attrs.is_empty() && matches!(&literal.lit, syn::Lit::Bool(_)) => {}
            _ => return Err("call argument is outside the CHECK subset".into()),
        }
    }
    Ok(())
}

fn value(expr: &Expr, bindings: &BTreeMap<String, bool>) -> Result<(), String> {
    if let Ok(name) = identifier(expr) {
        if bindings.contains_key(&name) {
            return Ok(());
        }
        return Err(format!("unbound identifier {name}"));
    }
    if matches!(expr, Expr::MethodCall(_)) {
        return owned_clone(expr, bindings);
    }
    call(expr, bindings)
}

fn condition(expr: &Expr, bindings: &BTreeMap<String, bool>) -> Result<(), String> {
    if let Expr::Binary(binary) = expr {
        if !binary.attrs.is_empty() || !matches!(binary.op, syn::BinOp::Eq(_)) {
            return Err("conditional is outside the CHECK subset".into());
        }
        let Expr::Lit(right) = &*binary.right else {
            return Err("conditional must compare a call with false".into());
        };
        if !right.attrs.is_empty() || !matches!(&right.lit, syn::Lit::Bool(value) if !value.value) {
            return Err("conditional must compare a call with false".into());
        }
        return call(&binary.left, bindings);
    }
    call(expr, bindings)
}

fn check_if(branch: &syn::ExprIf, bindings: &BTreeMap<String, bool>) -> Result<(), String> {
    if !branch.attrs.is_empty() {
        return Err("conditional attributes are outside the CHECK subset".into());
    }
    condition(&branch.cond, bindings)?;
    check_block(&branch.then_branch, &mut bindings.clone(), false)?;
    if let Some((_, alternate)) = &branch.else_branch {
        match &**alternate {
            Expr::Block(block) if block.attrs.is_empty() => {
                check_block(&block.block, &mut bindings.clone(), false)?
            }
            Expr::If(continuation) => check_if(continuation, bindings)?,
            _ => return Err("else branch is outside the CHECK subset".into()),
        }
    }
    Ok(())
}

fn check_block(
    block: &syn::Block,
    bindings: &mut BTreeMap<String, bool>,
    function_body: bool,
) -> Result<(), String> {
    if function_body && block.stmts.is_empty() {
        return Err("function needs a tail value".into());
    }
    for (index, statement) in block.stmts.iter().enumerate() {
        let last = index + 1 == block.stmts.len();
        match statement {
            Stmt::Local(local) if !function_body || !last => {
                if !local.attrs.is_empty() {
                    return Err("local binding is outside the CHECK subset".into());
                }
                let (pattern, mutable) = match &local.pat {
                    Pat::Ident(pattern) if pattern.mutability.is_none() => (pattern, false),
                    Pat::Type(typed) if typed.attrs.is_empty() => {
                        type_name(&typed.ty)?;
                        let Pat::Ident(pattern) = &*typed.pat else {
                            return Err("mutable result must bind an identifier".into());
                        };
                        if pattern.mutability.is_none() {
                            return Err("typed result must be mutable".into());
                        }
                        (pattern, true)
                    }
                    _ => return Err("local binding is outside the CHECK subset".into()),
                };
                if !pattern.attrs.is_empty() || pattern.by_ref.is_some() || pattern.subpat.is_some()
                {
                    return Err("local binding is outside the CHECK subset".into());
                }
                let initializer = local.init.as_ref().ok_or("local needs an initializer")?;
                if initializer.diverge.is_some() {
                    return Err("let-else is outside the CHECK subset".into());
                }
                value(&initializer.expr, bindings)?;
                if bindings
                    .insert(pattern.ident.to_string(), mutable)
                    .is_some()
                {
                    return Err("duplicate local binding".into());
                }
            }
            Stmt::Expr(Expr::Assign(assign), Some(_)) if !function_body || !last => {
                if !assign.attrs.is_empty() {
                    return Err("assignment attributes are outside the CHECK subset".into());
                }
                let target = identifier(&assign.left)?;
                if bindings.get(&target) != Some(&true) {
                    return Err("assignment target must be a mutable local".into());
                }
                value(&assign.right, bindings)?;
            }
            Stmt::Expr(Expr::If(branch), _) if !function_body || !last => {
                check_if(branch, bindings)?;
            }
            Stmt::Expr(expr, None) if function_body && last => value(expr, bindings)?,
            _ => return Err("statement is outside the CHECK subset".into()),
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
    if !entry_name(&name) || !matches!(&function.vis, Visibility::Public(_)) {
        return Err("only CHECK evaluator entries may be public".into());
    }
    if !matches!(&function.sig.output, ReturnType::Type(_, ty) if type_name(ty).as_deref() == Ok("CheckOutcome"))
    {
        return Err("function must return CheckOutcome".into());
    }
    let mut bindings = BTreeMap::new();
    for input in &function.sig.inputs {
        let FnArg::Typed(parameter) = input else {
            return Err("receiver is outside the CHECK subset".into());
        };
        if !parameter.attrs.is_empty()
            || !matches!(
                type_name(&parameter.ty)?,
                "Int2Value"
                    | "Int4Value"
                    | "Int8Value"
                    | "DateValue"
                    | "TimestampValue"
                    | "TimestamptzValue"
                    | "EnumValue"
                    | "NetworkValue"
                    | "UuidValue"
                    | "MacaddrValue"
                    | "Macaddr8Value"
                    | "NumericValue"
                    | "TextValue"
                    | "ByteaValue"
                    | "BoolValue"
            )
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
        if bindings.insert(pattern.ident.to_string(), false).is_some() {
            return Err("duplicate parameter".into());
        }
    }
    check_block(&function.block, &mut bindings, true)
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
    if !names.iter().any(|name| entry_name(name)) {
        return Err("missing public CHECK evaluator".into());
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
pub fn evaluate_check(amount: Int4Value, flag: BoolValue) -> CheckOutcome {
    let floor = make_int4_value(-2147483647 - 1);
    let compared = eval_int4_gt(amount, floor);
    let first = check_from_bool(compared);
    let mut result: CheckOutcome = first;
    if or_stops(first) == false {
        let null_test = bool_is_null(flag);
        let second = check_from_bool(null_test);
        result = or_finish(first, second);
    }
    result
}
"#;

    #[test]
    fn accepts_bound_value_clones_only() {
        let source = "pub fn evaluate_check(input: TextValue) -> CheckOutcome { let saved = input.clone(); let nullness = text_is_null(saved.clone()); let outcome = check_from_bool(nullness); outcome }";
        assert!(check_source(source).is_ok());
        for expression in ["missing.clone()", "input.clone(1)", "input.to_owned()"] {
            assert!(check_source(&source.replace("input.clone()", expression)).is_err());
        }
    }

    #[test]
    fn accepts_int8_values_and_exact_literals() {
        let source = "pub fn evaluate_check(amount: Int8Value) -> CheckOutcome { let constant = make_int8_value(0i64); let compared = compare(amount, constant); check_from_bool(compared) }";
        for literal in [
            "0i64",
            "9007199254740993i64",
            "9223372036854775807i64",
            "-9223372036854775808i64",
        ] {
            check_source(&source.replace("0i64", literal)).unwrap();
        }
        for literal in [
            "9223372036854775808i64",
            "-9223372036854775809i64",
            "9007199254740993",
            "0u64",
            "9_000i64",
            "0xffi64",
        ] {
            assert!(
                check_source(&source.replace("0i64", literal)).is_err(),
                "accepted {literal}"
            );
        }
        assert!(check_source(&source.replace("amount: Int8Value", "amount: i64")).is_err());
    }

    #[test]
    fn accepts_sequential_evaluator() {
        check_source(VALID).unwrap();
    }

    #[test]
    fn accepts_nested_lazy_branches() {
        let source = r#"
pub fn evaluate_check(flag: BoolValue, amount: Int4Value) -> CheckOutcome {
    let mut result: CheckOutcome = check_unknown();
    let guard_value = bool_is_null(flag);
    let guard = check_from_bool(guard_value);
    if case_guard_stops(guard) {
        result = guard;
    } else if case_guard_takes(guard) {
        let floor = make_int4_value(-1);
        let compared = eval_int4_gt(amount, floor);
        let selected = check_from_bool(compared);
        result = selected;
    } else {
        let other = check_unknown();
        result = other;
    }
    result
}
"#;
        check_source(source).unwrap();
        assert!(check_source(&source.replace("result = other;", "result = selected;")).is_err());
    }

    #[test]
    fn uuid_inputs_remain_concrete_and_immutable() {
        let source = r#"
pub fn evaluate_check(input: UuidValue) -> CheckOutcome {
    let nil_text = make_text_value("00000000-0000-0000-0000-000000000000");
    let nil = uuid_from_text(nil_text);
    let comparison = sql__pg_catalog__uuid_ne__n2xp(input, nil);
    let result = check_from_bool(comparison);
    result
}
"#;
        check_source(source).unwrap();
        assert!(
            check_source(&source.replace("input: UuidValue", "input: UuidValue<i32>")).is_err()
        );
        assert!(check_source(&source.replace("input: UuidValue", "mut input: UuidValue")).is_err());
    }

    #[test]
    fn accepts_enum_comparison_inputs() {
        let source = r#"
pub fn evaluate_check(state: EnumValue) -> CheckOutcome {
    let ready = make_enum_value(1);
    let compared = sql__pg_catalog__enum_eq__w63e(state, ready);
    let result = check_from_bool(compared);
    result
}
"#;
        check_source(source).unwrap();
        assert!(
            check_source(&source.replace("state: EnumValue", "state: EnumValue<i32>")).is_err()
        );
        assert!(check_source(&source.replace("state: EnumValue", "mut state: EnumValue")).is_err());
    }

    #[test]
    fn accepts_scalar_case_result_locals() {
        for (ty, constructor) in [
            ("Int2Value", "int2_unknown"),
            ("Int4Value", "int4_unknown"),
            ("Int8Value", "int8_unknown"),
            ("EnumValue", "enum_unknown"),
            ("DateValue", "date_unknown"),
            ("TimestampValue", "timestamp_unknown"),
            ("TimestamptzValue", "timestamptz_unknown"),
            ("NetworkValue", "network_unknown"),
            ("UuidValue", "uuid_unknown"),
            ("MacaddrValue", "macaddr_unknown"),
            ("Macaddr8Value", "macaddr8_unknown"),
            ("NumericValue", "numeric_unknown"),
            ("TextValue", "text_unknown"),
            ("BoolValue", "bool_unknown"),
        ] {
            let source = format!(
                r#"
pub fn evaluate_check(flag: BoolValue, input: {ty}) -> CheckOutcome {{
    let mut result: {ty} = {constructor}();
    let guard = check_from_bool(flag);
    if case_guard_takes(guard) {{
        result = input;
    }}
    let null_test = scalar_is_null(result);
    let outcome = check_from_bool(null_test);
    outcome
}}
"#
            );
            check_source(&source).unwrap();
            assert!(check_source(&source.replace("result = input;", "input = result;")).is_err());
            assert!(check_source(&source.replace("let mut result", "let result")).is_err());
        }
    }

    #[test]
    fn date_inputs_remain_concrete_and_immutable() {
        let source = r#"
pub fn evaluate_check(input: DateValue) -> CheckOutcome {
    let boundary = date_from_ymd(2000, 1, 1);
    let compared = sql__pg_catalog__date_ge__8wil(input, boundary);
    let result = check_from_bool(compared);
    result
}
"#;
        check_source(source).unwrap();
        assert!(
            check_source(&source.replace("input: DateValue", "input: DateValue<i32>")).is_err()
        );
        assert!(check_source(&source.replace("input: DateValue", "mut input: DateValue")).is_err());
    }

    #[test]
    fn timestamp_inputs_remain_concrete_and_immutable() {
        let source = r#"
pub fn evaluate_check(input: TimestampValue) -> CheckOutcome {
    let boundary = make_timestamp_value(0i64);
    let compared = compare(input, boundary);
    let result = check_from_bool(compared);
    result
}
"#;
        check_source(source).unwrap();
        assert!(check_source(
            &source.replace("input: TimestampValue", "input: TimestampValue<i64>")
        )
        .is_err());
        assert!(check_source(
            &source.replace("input: TimestampValue", "mut input: TimestampValue")
        )
        .is_err());
    }

    #[test]
    fn timestamptz_inputs_remain_concrete_and_immutable() {
        let source = r#"
pub fn evaluate_check(input: TimestamptzValue) -> CheckOutcome {
    let boundary = make_timestamptz_value(0i64);
    let compared = compare(input, boundary);
    let result = check_from_bool(compared);
    result
}
"#;
        check_source(source).unwrap();
        assert!(check_source(
            &source.replace("input: TimestamptzValue", "input: TimestamptzValue<i64>")
        )
        .is_err());
        assert!(check_source(
            &source.replace("input: TimestamptzValue", "mut input: TimestamptzValue")
        )
        .is_err());
    }

    #[test]
    fn rejects_unsupported_mutation_and_control_flow() {
        assert!(check_source(&VALID.replace("let mut result", "let result")).is_err());
        assert!(check_source(&VALID.replace("result: CheckOutcome", "result: i32")).is_err());
        assert!(check_source(&VALID.replace(
            "result = or_finish(first, second);",
            "flag = or_finish(first, second);"
        ))
        .is_err());
        assert!(check_source(&VALID.replace(
            "if or_stops(first) == false",
            "while or_stops(first) == false"
        ))
        .is_err());
        assert!(check_source(
            &VALID.replace("or_stops(first) == false", "or_stops(first) == true")
        )
        .is_err());
        assert!(check_source(
            &VALID.replace("or_stops(first) == false", "or_stops(first) || true")
        )
        .is_err());
    }

    #[test]
    fn rejects_nested_calls_and_unbound_values() {
        assert!(check_source(&VALID.replace(
            "or_finish(first, second)",
            "or_finish(first, check_from_bool(null_test))"
        ))
        .is_err());
        assert!(check_source(
            &VALID.replace("result = or_finish(first, second);", "result = missing;")
        )
        .is_err());
        assert!(check_source(&VALID.replace("result\n}", "missing\n}")).is_err());
    }

    #[test]
    fn accepts_only_public_evaluator_functions() {
        check_source(&VALID.replace(
            "evaluate_check(",
            "evaluate_check_public_table_orders_amount_positive_h1234(",
        ))
        .unwrap();
        assert!(check_source(&VALID.replace("evaluate_check(", "evaluate_check_0(")).is_err());
        assert!(check_source(&VALID.replace(
            "evaluate_check(",
            "evaluate_check_public_table_orders_check_h12345("
        ))
        .is_err());
        assert!(
            check_source(&VALID.replace("pub fn evaluate_check", "fn evaluate_check")).is_err()
        );
        assert!(check_source(&VALID.replace("evaluate_check(", "check_part_0(")).is_err());
        assert!(check_source(&format!("enum State {{ Unknown }}\n{VALID}")).is_err());
    }

    #[test]
    fn accepts_literals_within_the_narrow_range() {
        let source = r#"
pub fn evaluate_check(status: TextValue, enabled: BoolValue) -> CheckOutcome {
    let expected = make_text_value("housed");
    let boolean = make_bool_value(true);
    let result = compare_status(status, expected);
    let checked = check_from_bool(result);
    checked
}
"#;
        check_source(source).unwrap();
        assert!(check_source(&source.replace("\"housed\"", "b\"housed\"")).is_err());
        assert!(check_source(&VALID.replace("-2147483647 - 1", "-2147483648")).is_err());
        assert!(check_source(&VALID.replace("-2147483647 - 1", "-2147483646 - 2")).is_err());
    }
}
