//! Keeps, of a set of Rust modules, the items reachable from the named roots, so a generated crate
//! can carry the part of the CHECK evaluator it calls.
//!
//! Usage: rust-prune IN OUT ROOT...
//!
//! IN holds one file per module, NAME.rs, and NAME.deps listing the modules it uses. A root is
//! MODULE::NAME. An item is reached when a reached item names it, in its own module or one it
//! uses; a reached type keeps its impls. Doc comments are dropped.

use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::fs;
use std::path::Path;

use proc_macro2::{TokenStream, TokenTree};
use quote::ToTokens;
use syn::{Item, Type};

fn idents(tokens: TokenStream, out: &mut BTreeSet<String>) {
    for token in tokens {
        match token {
            TokenTree::Ident(ident) => {
                out.insert(ident.to_string());
            }
            TokenTree::Group(group) => idents(group.stream(), out),
            _ => {}
        }
    }
}

fn item_name(item: &Item) -> Option<String> {
    Some(match item {
        Item::Fn(item) => item.sig.ident.to_string(),
        Item::Struct(item) => item.ident.to_string(),
        Item::Enum(item) => item.ident.to_string(),
        Item::Type(item) => item.ident.to_string(),
        Item::Const(item) => item.ident.to_string(),
        Item::Static(item) => item.ident.to_string(),
        Item::Trait(item) => item.ident.to_string(),
        Item::Union(item) => item.ident.to_string(),
        Item::Macro(item) => item.ident.as_ref()?.to_string(),
        _ => return None,
    })
}

fn self_type(ty: &Type) -> Option<String> {
    match ty {
        Type::Path(path) => path.path.segments.last().map(|segment| segment.ident.to_string()),
        Type::Reference(reference) => self_type(&reference.elem),
        _ => None,
    }
}

fn strip_docs(attrs: &mut Vec<syn::Attribute>) {
    attrs.retain(|attr| !attr.path().is_ident("doc"));
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let (input, output, roots) = (Path::new(&args[1]), Path::new(&args[2]), &args[3..]);
    let mut modules: BTreeMap<String, (Vec<Item>, Vec<String>)> = BTreeMap::new();
    for entry in fs::read_dir(input).unwrap() {
        let path = entry.unwrap().path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("rs") {
            continue;
        }
        let name = path.file_stem().unwrap().to_str().unwrap().to_owned();
        let file = syn::parse_file(&fs::read_to_string(&path).unwrap()).unwrap();
        let deps = fs::read_to_string(path.with_extension("deps")).unwrap_or_default();
        modules.insert(name, (file.items, deps.split_whitespace().map(str::to_owned).collect()));
    }
    // Every named item, and every impl by the type it is for.
    let mut named: BTreeMap<(String, String), Vec<usize>> = BTreeMap::new();
    let mut impls: BTreeMap<(String, String), Vec<usize>> = BTreeMap::new();
    for (module, (items, _)) in &modules {
        for (index, item) in items.iter().enumerate() {
            if let Some(name) = item_name(item) {
                named.entry((module.clone(), name)).or_default().push(index);
            } else if let Item::Impl(item) = item {
                if let Some(name) = self_type(&item.self_ty) {
                    impls.entry((module.clone(), name)).or_default().push(index);
                }
            }
        }
    }
    let mut kept: BTreeSet<(String, usize)> = BTreeSet::new();
    let mut queue: VecDeque<(String, usize)> = VecDeque::new();
    let mark = |module: &str, name: &str, kept: &mut BTreeSet<(String, usize)>, queue: &mut VecDeque<(String, usize)>| {
        let key = (module.to_owned(), name.to_owned());
        for index in named.get(&key).into_iter().flatten().chain(impls.get(&key).into_iter().flatten()) {
            if kept.insert((module.to_owned(), *index)) {
                queue.push_back((module.to_owned(), *index));
            }
        }
    };
    for root in roots {
        let (module, name) = root.split_once("::").expect("a root is MODULE::NAME");
        if !named.contains_key(&(module.to_owned(), name.to_owned())) {
            panic!("unknown root {root}");
        }
        mark(module, name, &mut kept, &mut queue);
    }
    while let Some((module, index)) = queue.pop_front() {
        let (items, deps) = &modules[&module];
        let mut names = BTreeSet::new();
        idents(items[index].to_token_stream(), &mut names);
        for name in &names {
            mark(&module, name, &mut kept, &mut queue);
            for dep in deps {
                mark(dep, name, &mut kept, &mut queue);
            }
        }
    }
    fs::create_dir_all(output).unwrap();
    for (module, (items, deps)) in &modules {
        let mut file = syn::File { shebang: None, attrs: Vec::new(), items: Vec::new() };
        for (index, item) in items.iter().enumerate() {
            if kept.contains(&(module.clone(), index)) {
                let mut item = item.clone();
                match &mut item {
                    Item::Fn(item) => strip_docs(&mut item.attrs),
                    Item::Struct(item) => strip_docs(&mut item.attrs),
                    Item::Enum(item) => strip_docs(&mut item.attrs),
                    Item::Const(item) => strip_docs(&mut item.attrs),
                    Item::Impl(item) => strip_docs(&mut item.attrs),
                    _ => {}
                }
                file.items.push(item);
            }
        }
        if file.items.is_empty() {
            continue;
        }
        let uses: String = deps.iter().map(|dep| format!("use super::{dep}::*;\n")).collect();
        fs::write(output.join(format!("{module}.rs")), format!("{uses}{}\n", file.to_token_stream())).unwrap();
    }
}
