use crate::{
    ast_json::{item, validate_against, validate_file, with_locations},
    checked_item,
    facts::Facts,
    syntax,
    validate::Result,
};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use syn::spanned::Spanned;
use syn::visit::{self, Visit};

// A graph either validates whole, optionally recording its facts ("emitFacts"), or adds
// modules to a graph validated earlier, given that graph's facts ("runtimeFacts"). The
// second form returns only the added modules and their items; appended to the earlier
// output they are what parsing the combined graph returns. Dialect checks read a graph's
// syntax alone ("validate": false) and the source position of each node ("locations").
pub fn parse(source: &str) -> Result<String> {
    let graph: Value = serde_json::from_str(source).map_err(|error| error.to_string())?;
    if graph["schemaVersion"] != 1 {
        return Err("unsupported source graph version".into());
    }
    if graph["locations"] == true {
        with_locations(|| parse_graph(&graph))
    } else {
        parse_graph(&graph)
    }
}

fn parse_graph(graph: &Value) -> Result<String> {
    let validate = graph["validate"] != false;
    checked_item::leave();
    let modules = graph["modules"]
        .as_array()
        .ok_or("source graph requires modules")?;
    let cached = match graph.get("runtimeFacts") {
        Some(facts) => Some(Facts::from_json(facts)?),
        None => None,
    };
    let emit_facts = graph["emitFacts"] == true;
    if emit_facts && cached.is_some() {
        return Err("a graph linked against runtime facts cannot record facts".into());
    }
    if !validate && (emit_facts || cached.is_some()) {
        return Err("a graph read without validation has no facts".into());
    }
    let mut module_names = BTreeSet::new();
    for module in cached
        .iter()
        .flat_map(|facts| &facts.modules)
        .chain(modules)
    {
        let name = module["name"].as_str().ok_or("module requires name")?;
        if !module_names.insert(name) {
            return Err(format!("duplicate module {name}"));
        }
    }
    let mut parsed = Vec::new();
    let mut sources = BTreeMap::new();
    let mut owners = cached
        .as_ref()
        .map_or_else(BTreeMap::new, |facts| facts.owners.clone());
    for module in modules {
        let name = module["name"].as_str().unwrap();
        let dependencies = module["dependencies"]
            .as_array()
            .ok_or("module requires dependencies")?;
        for dependency in dependencies {
            let dependency = dependency
                .as_str()
                .ok_or("dependency must be a module name")?;
            if dependency == name || !module_names.contains(dependency) {
                return Err(format!("invalid dependency {dependency} in {name}"));
            }
        }
        for source in module["files"].as_array().ok_or("module requires files")? {
            let path = source["path"].as_str().ok_or("file requires path")?;
            let text = source["source"].as_str().ok_or("file requires source")?;
            let file = syn::parse_file(text).map_err(|error| format!("{path}: {error}"))?;
            if validate {
                syntax::check(&file).map_err(|error| at_checked_item(path, error))?;
            }
            let mut serialized = Vec::new();
            for declaration in &file.items {
                let value = item(declaration).map_err(|error| at_item(path, declaration, error))?;
                let symbol = value["name"].as_str().unwrap().to_string();
                if owners
                    .insert(
                        symbol.clone(),
                        (
                            name.to_string(),
                            value["visibility"] == "public" || value["visibility"] == "crate",
                        ),
                    )
                    .is_some()
                {
                    return Err(format!("duplicate linked symbol {symbol} in {path}"));
                }
                sources.insert(symbol, path);
                serialized.push(value);
            }
            parsed.push((name, path, dependencies, file, serialized));
        }
    }
    let linked = syn::File {
        shebang: None,
        attrs: Vec::new(),
        items: parsed
            .iter()
            .flat_map(|(_, _, _, file, _)| file.items.iter().cloned())
            .collect(),
    };
    let linked_failure = |error: String| match checked_item::take() {
        Some((name, line, column)) => match sources.get(&name) {
            Some(path) => format!("{path}:{line}:{column}: {error}"),
            None => error,
        },
        None => error,
    };
    match cached {
        Some(facts) => validate_against(&linked, facts).map_err(linked_failure)?,
        None if validate => validate_file(&linked).map_err(linked_failure)?,
        None => {}
    }
    let mut items = Vec::new();
    for (name, path, dependencies, file, serialized) in parsed {
        for (declaration, mut value) in file.items.iter().zip(serialized) {
            if validate {
                check_dependencies(declaration, name, dependencies, &owners)
                    .map_err(|error| at_item(path, declaration, error))?;
            }
            value["module"] = json!(name);
            value["sourceFile"] = json!(path);
            items.push(value);
        }
    }
    let modules = modules
        .iter()
        .map(|module| json!({ "name": module["name"], "dependencies": module["dependencies"] }))
        .collect::<Vec<_>>();
    let mut document = json!({ "schemaVersion": 1, "modules": modules, "items": items });
    if emit_facts {
        document["facts"] = Facts::collect(&linked.items, modules, owners)?.to_json();
    }
    serde_json::to_string(&document).map_err(|error| error.to_string())
}

// A rejection names its file, and the line and column of the item when one is known.
fn at_item(path: &str, declaration: &syn::Item, error: String) -> String {
    let start = declaration.span().start();
    format!("{path}:{}:{}: {error}", start.line, start.column + 1)
}

fn at_checked_item(path: &str, error: String) -> String {
    match checked_item::take() {
        Some((_, line, column)) => format!("{path}:{line}:{column}: {error}"),
        None => format!("{path}: {error}"),
    }
}

fn check_dependencies(
    declaration: &syn::Item,
    module: &str,
    dependencies: &[Value],
    owners: &BTreeMap<String, (String, bool)>,
) -> Result<()> {
    let mut checker = DependencyChecker {
        module,
        dependencies,
        owners,
        scopes: Vec::new(),
        error: None,
    };
    checker.visit_item(declaration);
    checker.error.map_or(Ok(()), Err)
}

struct DependencyChecker<'a> {
    module: &'a str,
    dependencies: &'a [Value],
    owners: &'a BTreeMap<String, (String, bool)>,
    scopes: Vec<BTreeSet<String>>,
    error: Option<String>,
}

fn pattern_bindings(pattern: &syn::Pat, bindings: &mut BTreeSet<String>) {
    match pattern {
        syn::Pat::Ident(binding) => {
            bindings.insert(binding.ident.to_string());
        }
        syn::Pat::Type(typed) => pattern_bindings(&typed.pat, bindings),
        syn::Pat::TupleStruct(tuple) => {
            for element in &tuple.elems {
                pattern_bindings(element, bindings);
            }
        }
        syn::Pat::Struct(record) => {
            for field in &record.fields {
                pattern_bindings(&field.pat, bindings);
            }
        }
        _ => (),
    }
}

impl DependencyChecker<'_> {
    fn reference(&mut self, path: &syn::Path, value: bool) {
        if self.error.is_some() {
            return;
        }
        let Some(first) = path.segments.first() else {
            return;
        };
        let symbol = first.ident.to_string();
        if value
            && path.segments.len() == 1
            && self
                .scopes
                .iter()
                .rev()
                .any(|scope| scope.contains(&symbol))
        {
            return;
        }
        if let Some((owner, public)) = self.owners.get(&symbol) {
            if *owner == self.module {
                return;
            }
            if !self
                .dependencies
                .iter()
                .any(|dependency| dependency.as_str() == Some(owner.as_str()))
            {
                self.error = Some(format!(
                    "{} references {owner}::{symbol} without a dependency",
                    self.module
                ));
            } else if !public {
                self.error = Some(format!(
                    "{} references private symbol {owner}::{symbol}",
                    self.module
                ));
            }
        }
    }
}

impl<'ast> Visit<'ast> for DependencyChecker<'_> {
    fn visit_item_fn(&mut self, function: &'ast syn::ItemFn) {
        let mut parameters = BTreeSet::new();
        for parameter in &function.sig.inputs {
            if let syn::FnArg::Typed(parameter) = parameter {
                pattern_bindings(&parameter.pat, &mut parameters);
            }
        }
        self.scopes.push(parameters);
        visit::visit_item_fn(self, function);
        self.scopes.pop();
    }

    fn visit_block(&mut self, block: &'ast syn::Block) {
        self.scopes.push(BTreeSet::new());
        visit::visit_block(self, block);
        self.scopes.pop();
    }

    fn visit_local(&mut self, local: &'ast syn::Local) {
        visit::visit_local(self, local);
        pattern_bindings(&local.pat, self.scopes.last_mut().unwrap());
    }

    fn visit_expr_if(&mut self, branch: &'ast syn::ExprIf) {
        let mut bindings = BTreeSet::new();
        if let syn::Expr::Let(condition) = &*branch.cond {
            self.visit_expr(&condition.expr);
            self.visit_pat(&condition.pat);
            pattern_bindings(&condition.pat, &mut bindings);
        } else {
            self.visit_expr(&branch.cond);
        }
        self.scopes.push(bindings);
        self.visit_block(&branch.then_branch);
        self.scopes.pop();
        if let Some((_, alternative)) = &branch.else_branch {
            self.visit_expr(alternative);
        }
    }

    fn visit_expr_path(&mut self, path: &'ast syn::ExprPath) {
        self.reference(&path.path, true);
        visit::visit_expr_path(self, path);
    }

    fn visit_type_path(&mut self, path: &'ast syn::TypePath) {
        self.reference(&path.path, false);
        visit::visit_type_path(self, path);
    }

    fn visit_expr_struct(&mut self, record: &'ast syn::ExprStruct) {
        self.reference(&record.path, false);
        visit::visit_expr_struct(self, record);
    }

    fn visit_pat(&mut self, pattern: &'ast syn::Pat) {
        match pattern {
            syn::Pat::Path(path) => self.reference(&path.path, false),
            syn::Pat::TupleStruct(tuple) => self.reference(&tuple.path, false),
            syn::Pat::Struct(record) => self.reference(&record.path, false),
            _ => (),
        }
        visit::visit_pat(self, pattern);
    }
}

#[cfg(test)]
mod tests {
    use crate::parse_ast as parse;

    fn modules(dependencies: &[&str]) -> String {
        serde_json::json!({ "schemaVersion": 1, "modules": [
            { "name": "checks", "dependencies": dependencies, "files": [
                { "path": "evaluator.rs", "source": "pub fn evaluate(value: Value) -> bool { positive(value) }" }
            ] },
            { "name": "pg_catalog", "dependencies": [], "files": [
                { "path": "value.rs", "source": "#[derive(Clone, Copy)] pub struct Value { pub number: i32 }" },
                { "path": "positive.rs", "source": "pub fn positive(value: Value) -> bool { value.number > 0 }" }
            ] }
        ] }).to_string()
    }

    #[test]
    fn links_crate_visible_helpers_without_exposing_private_symbols() {
        let graph = modules(&["pg_catalog"]).replace("pub fn positive", "pub(crate) fn positive");
        let document: serde_json::Value = serde_json::from_str(&parse(&graph).unwrap()).unwrap();
        assert_eq!(document["items"][2]["visibility"], "crate");
        assert_eq!(document["items"][2]["module"], "pg_catalog");
    }

    #[test]
    fn links_files_with_explicit_module_ownership() {
        let document: serde_json::Value =
            serde_json::from_str(&parse(&modules(&["pg_catalog"])).unwrap()).unwrap();
        assert_eq!(document["items"][0]["module"], "checks");
        assert_eq!(document["items"][0]["sourceFile"], "evaluator.rs");
        assert_eq!(document["items"][2]["module"], "pg_catalog");
        assert_eq!(document["modules"][0]["dependencies"][0], "pg_catalog");
    }

    #[test]
    fn rejects_undeclared_and_missing_module_dependencies() {
        assert!(parse(&modules(&[]))
            .unwrap_err()
            .contains("without a dependency"));
        assert!(parse(&modules(&["missing"]))
            .unwrap_err()
            .contains("invalid dependency"));
    }

    #[test]
    fn rejects_private_symbols_at_module_boundaries() {
        let mut graph: serde_json::Value = serde_json::from_str(&modules(&["pg_catalog"])).unwrap();
        graph["modules"][1]["files"][1]["source"] =
            serde_json::json!("fn positive(value: Value) -> bool { value.number > 0 }");
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("private symbol"));
    }

    #[test]
    fn rejects_duplicate_modules_and_linked_symbols() {
        let mut graph: serde_json::Value = serde_json::from_str(&modules(&["pg_catalog"])).unwrap();
        graph["modules"][1]["name"] = serde_json::json!("checks");
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("duplicate module"));
        graph = serde_json::from_str(&modules(&["pg_catalog"])).unwrap();
        let duplicate = graph["modules"][1]["files"][1].clone();
        graph["modules"][1]["files"]
            .as_array_mut()
            .unwrap()
            .push(duplicate);
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("duplicate linked symbol"));
    }

    // Splits the fixture into the runtime graph, which records its facts, and the checks
    // module, which links against them.
    fn split(graph: &str) -> (serde_json::Value, serde_json::Value) {
        let graph: serde_json::Value = serde_json::from_str(graph).unwrap();
        let (checks, runtime): (Vec<_>, Vec<_>) = graph["modules"]
            .as_array()
            .unwrap()
            .iter()
            .cloned()
            .partition(|module| module["name"] == "checks");
        let runtime =
            serde_json::json!({ "schemaVersion": 1, "modules": runtime, "emitFacts": true });
        let runtime: serde_json::Value =
            serde_json::from_str(&parse(&runtime.to_string()).unwrap()).unwrap();
        let checks = serde_json::json!({ "schemaVersion": 1, "modules": checks, "runtimeFacts": runtime["facts"] });
        (runtime, checks)
    }

    #[test]
    fn modules_linked_against_runtime_facts_extend_the_runtime_output() {
        let graph = modules(&["pg_catalog"]);
        let (runtime, checks) = split(&graph);
        let checks: serde_json::Value =
            serde_json::from_str(&parse(&checks.to_string()).unwrap()).unwrap();
        let mut combined = serde_json::json!({ "schemaVersion": 1 });
        for key in ["modules", "items"] {
            combined[key] = serde_json::json!([
                runtime[key].as_array().unwrap().clone(),
                checks[key].as_array().unwrap().clone()
            ]
            .concat());
        }
        let mut graph: serde_json::Value = serde_json::from_str(&graph).unwrap();
        graph["modules"].as_array_mut().unwrap().reverse();
        let full: serde_json::Value =
            serde_json::from_str(&parse(&graph.to_string()).unwrap()).unwrap();
        assert_eq!(combined, full);
    }

    #[test]
    fn modules_linked_against_runtime_facts_keep_whole_graph_checks() {
        let graph = modules(&["pg_catalog"]);
        let (_, checks) = split(&graph);
        let with_source = |source: &str| {
            let mut graph = checks.clone();
            graph["modules"][0]["files"][0]["source"] = serde_json::json!(source);
            parse(&graph.to_string()).unwrap_err()
        };
        assert!(
            with_source("pub fn positive(value: Value) -> bool { true }")
                .contains("duplicate linked symbol")
        );
        assert!(
            with_source("pub fn evaluate(value: Missing) -> bool { true }")
                .contains("outside the AST contract")
        );
        assert!(with_source("#[derive(Clone)] pub enum Local { Empty } pub fn evaluate(value: Value) -> bool { true }")
            .contains("cannot declare types"));
        assert!(
            with_source("pub fn evaluate(value: Value) -> i64 { 1 }").contains("explicitly typed")
        );
        let mut graph = checks.clone();
        graph["modules"][0]["dependencies"] = serde_json::json!([]);
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("without a dependency"));
        graph["modules"][0]["dependencies"] = serde_json::json!(["missing"]);
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("invalid dependency"));
        graph["modules"][0]["name"] = serde_json::json!("pg_catalog");
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("duplicate module"));
        let private = modules(&["pg_catalog"]).replace("pub fn positive", "fn positive");
        let (_, checks) = split(&private);
        assert!(parse(&checks.to_string())
            .unwrap_err()
            .contains("private symbol"));
    }

    fn shadow_graph(source: &str, dependencies: &[&str]) -> String {
        serde_json::json!({ "schemaVersion": 1, "modules": [
            { "name": "checkruntime", "dependencies": dependencies, "files": [
                { "path": "runtime.rs", "source": source }
            ] },
            { "name": "regex_engine", "dependencies": [], "files": [
                { "path": "regex.rs", "source": "pub fn count() -> i64 { 9i64 } #[derive(Clone, Copy, PartialEq, Eq)] pub struct Foreign { pub value: i64 }" }
            ] }
        ] }).to_string()
    }

    #[test]
    fn local_values_shadow_foreign_functions_without_a_dependency() {
        for source in [
            "pub fn read_count(count: i64) -> i64 { count }",
            "pub fn read_count() -> i64 { let count: i64 = 2i64; count }",
            "pub fn read_count(Foreign: i64) -> i64 { Foreign }",
            "#[derive(Clone, Copy, PartialEq, Eq)] pub enum Value { Null, Number(i64) } pub fn read_count(value: Value) -> i64 { if let Value::Number(count) = value { return count; } 0i64 }",
        ] {
            assert!(parse(&shadow_graph(source, &[])).is_ok(), "{source}");
        }
    }

    #[test]
    fn foreign_references_require_dependencies_before_and_outside_local_scopes() {
        for source in [
            "pub fn read_count() -> i64 { let count = count(); count }",
            "pub fn read_count(flag: bool) -> i64 { if flag { let count: i64 = 2i64; let inner = count; } count() }",
            "#[derive(Clone, Copy, PartialEq, Eq)] pub enum Value { Null, Number(i64) } pub fn read_count(value: Value) -> i64 { if let Value::Number(count) = value { return count; } count() }",
            "pub fn read_count(Foreign: Foreign) -> i64 { Foreign.value }",
        ] {
            assert!(parse(&shadow_graph(source, &[])).unwrap_err().contains("without a dependency"), "{source}");
            assert!(parse(&shadow_graph(source, &["regex_engine"])).is_ok(), "{source}");
        }
    }

    #[test]
    fn records_source_positions_only_when_asked() {
        let mut graph: serde_json::Value = serde_json::from_str(&modules(&["pg_catalog"])).unwrap();
        graph["modules"][1]["files"][1]["source"] =
            serde_json::json!("pub fn positive(value: Value) -> bool {\n    value.number > 0\n}");
        let plain: serde_json::Value =
            serde_json::from_str(&parse(&graph.to_string()).unwrap()).unwrap();
        assert!(!plain.to_string().contains("\"line\""));
        graph["locations"] = serde_json::json!(true);
        let located: serde_json::Value =
            serde_json::from_str(&parse(&graph.to_string()).unwrap()).unwrap();
        let positive = &located["items"][2];
        assert_eq!(
            (&positive["line"], &positive["column"]),
            (&serde_json::json!(1), &serde_json::json!(1))
        );
        let statement = &positive["body"][0];
        assert_eq!(
            (&statement["line"], &statement["column"]),
            (&serde_json::json!(2), &serde_json::json!(5))
        );
        assert_eq!(statement["value"]["right"]["line"], 2);
        assert_eq!(statement["value"]["right"]["column"], 20);
        assert_eq!(positive["parameters"][0]["type"]["column"], 24);
        // Translation reads the same graph without positions afterwards.
        graph["locations"] = serde_json::json!(false);
        assert_eq!(parse(&graph.to_string()).unwrap(), plain.to_string());
    }

    #[test]
    fn reads_syntax_without_validating_when_asked() {
        let mut graph: serde_json::Value = serde_json::from_str(&modules(&[])).unwrap();
        graph["modules"][1]["files"][1]["source"] =
            serde_json::json!("pub fn positive(value: Value) -> bool { missing(value) * 2.5f64 }");
        assert!(parse(&graph.to_string()).is_err());
        graph["validate"] = serde_json::json!(false);
        let document: serde_json::Value =
            serde_json::from_str(&parse(&graph.to_string()).unwrap()).unwrap();
        assert_eq!(
            document["items"][2]["body"][0]["value"]["operator"],
            "multiply"
        );
        graph["emitFacts"] = serde_json::json!(true);
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .contains("without validation"));
    }

    #[test]
    fn rejections_name_the_file_and_item_position() {
        let mut graph: serde_json::Value = serde_json::from_str(&modules(&["pg_catalog"])).unwrap();
        graph["modules"][1]["files"][1]["source"] =
            serde_json::json!("pub fn other() -> bool { true }\n\npub fn positive(value: Value) -> bool { missing(value) }");
        assert_eq!(
            parse(&graph.to_string()).unwrap_err(),
            "positive.rs:3:1: unknown function missing"
        );
        graph["modules"][1]["files"][1]["source"] =
            serde_json::json!("\nconst LIMIT: usize = 0xff;");
        assert!(parse(&graph.to_string())
            .unwrap_err()
            .starts_with("positive.rs:2:1: "));
        let undeclared = modules(&[]);
        assert!(parse(&undeclared)
            .unwrap_err()
            .starts_with("evaluator.rs:1:1: "));
    }
}
