use crate::{
    ast_json::{item, validate_file},
    syntax,
    validate::Result,
};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use syn::visit::{self, Visit};

pub fn parse(source: &str) -> Result<String> {
    let graph: Value = serde_json::from_str(source).map_err(|error| error.to_string())?;
    if graph["schemaVersion"] != 1 {
        return Err("unsupported source graph version".into());
    }
    let modules = graph["modules"]
        .as_array()
        .ok_or("source graph requires modules")?;
    let mut module_names = BTreeSet::new();
    for module in modules {
        let name = module["name"].as_str().ok_or("module requires name")?;
        if !module_names.insert(name) {
            return Err(format!("duplicate module {name}"));
        }
    }
    let mut parsed = Vec::new();
    let mut owners = std::collections::BTreeMap::new();
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
            syntax::check(&file).map_err(|error| format!("{path}: {error}"))?;
            for declaration in &file.items {
                let serialized = item(declaration)?;
                let symbol = serialized["name"].as_str().unwrap().to_string();
                if owners
                    .insert(symbol.clone(), (name, serialized["visibility"] == "public"))
                    .is_some()
                {
                    return Err(format!("duplicate linked symbol {symbol} in {path}"));
                }
            }
            parsed.push((name, path, dependencies, file));
        }
    }
    let linked = syn::File {
        shebang: None,
        attrs: Vec::new(),
        items: parsed
            .iter()
            .flat_map(|(_, _, _, file)| file.items.iter().cloned())
            .collect(),
    };
    validate_file(&linked)?;
    let mut items = Vec::new();
    for (name, path, dependencies, file) in &parsed {
        for declaration in &file.items {
            let mut serialized = item(declaration)?;
            check_dependencies(declaration, name, dependencies, &owners)
                .map_err(|error| format!("{path}: {error}"))?;
            serialized["module"] = json!(name);
            serialized["sourceFile"] = json!(path);
            items.push(serialized);
        }
    }
    serde_json::to_string(
        &json!({ "schemaVersion": 1, "modules": modules.iter().map(|module|
        json!({ "name": module["name"], "dependencies": module["dependencies"] })
    ).collect::<Vec<_>>(), "items": items }),
    )
    .map_err(|error| error.to_string())
}

fn check_dependencies(
    declaration: &syn::Item,
    module: &str,
    dependencies: &[Value],
    owners: &std::collections::BTreeMap<String, (&str, bool)>,
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
    owners: &'a std::collections::BTreeMap<String, (&'a str, bool)>,
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
                .any(|dependency| dependency.as_str() == Some(*owner))
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
}
