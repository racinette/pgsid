use crate::{
    ast_json::{item, validate_file},
    syntax,
    validate::Result,
};
use serde_json::{json, Value};
use std::collections::BTreeSet;

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
            check_dependencies(&serialized, name, dependencies, &owners)
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
    value: &Value,
    module: &str,
    dependencies: &[Value],
    owners: &std::collections::BTreeMap<String, (&str, bool)>,
) -> Result<()> {
    match value {
        Value::Object(fields) => {
            let symbol = fields
                .get("segments")
                .or_else(|| fields.get("path"))
                .and_then(Value::as_array)
                .and_then(|path| path.first())
                .and_then(Value::as_str)
                .or_else(|| fields.get("enumName").and_then(Value::as_str));
            if let Some(symbol) = symbol {
                if let Some((owner, public)) = owners.get(symbol) {
                    if *owner != module
                        && !dependencies
                            .iter()
                            .any(|dependency| dependency.as_str() == Some(owner))
                    {
                        return Err(format!(
                            "{module} references {owner}::{symbol} without a dependency"
                        ));
                    }
                    if *owner != module && !public {
                        return Err(format!(
                            "{module} references private symbol {owner}::{symbol}"
                        ));
                    }
                }
            }
            for child in fields.values() {
                check_dependencies(child, module, dependencies, owners)?;
            }
        }
        Value::Array(children) => {
            for child in children {
                check_dependencies(child, module, dependencies, owners)?;
            }
        }
        _ => (),
    }
    Ok(())
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
}
