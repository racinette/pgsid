use crate::{
    ast_json::{collect_type_sets, TypeSets},
    validate::{collect_constants, collect_semantics, Binding, Bindings, Result, Semantics},
};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, BTreeSet};

// What validating more modules against an already validated graph needs from it: its modules,
// declaration tables, function signatures, constant types and symbol owners. Every table is
// keyed and sorted, so the same graph always records the same facts.
pub(crate) struct Facts {
    pub(crate) modules: Vec<Value>,
    pub(crate) types: TypeSets,
    pub(crate) semantics: Semantics,
    pub(crate) constants: Bindings,
    pub(crate) owners: BTreeMap<String, (String, bool)>,
}

impl Facts {
    pub(crate) fn collect(
        items: &[syn::Item],
        modules: Vec<Value>,
        owners: BTreeMap<String, (String, bool)>,
    ) -> Result<Self> {
        let mut types = TypeSets::default();
        collect_type_sets(items, &mut types);
        let mut semantics = Semantics::default();
        collect_semantics(items, &mut semantics)?;
        let mut constants = Bindings::new();
        collect_constants(items, &mut constants)?;
        Ok(Self {
            modules,
            types,
            semantics,
            constants,
            owners,
        })
    }

    pub(crate) fn to_json(&self) -> Value {
        let semantics = &self.semantics;
        json!({
            "schemaVersion": 1,
            "modules": self.modules,
            "declarations": self.types.declarations,
            "structs": self.types.structs,
            "vectorElements": self.types.vector_elements,
            "fields": semantics.fields,
            "copy": semantics.copy,
            "clone": semantics.clone,
            "equality": semantics.equality,
            "variants": semantics.variants.iter().map(|((owner, variant), payload)|
                json!([owner, variant, payload])).collect::<Vec<_>>(),
            "functions": semantics.functions.iter().map(|(name, (parameters, output))|
                (name.clone(), json!([parameters, output]))).collect::<Map<_, _>>(),
            "constants": self.constants.iter().map(|(name, binding)|
                (name.clone(), json!(binding.ty))).collect::<Map<_, _>>(),
            "owners": self.owners.iter().map(|(name, (module, exported))|
                (name.clone(), json!([module, exported]))).collect::<Map<_, _>>(),
        })
    }

    pub(crate) fn from_json(value: &Value) -> Result<Self> {
        if value["schemaVersion"] != 1 {
            return Err("unsupported runtime facts version".into());
        }
        let invalid = || "runtime facts are malformed".to_string();
        let text = |value: &Value| value.as_str().map(str::to_string).ok_or_else(invalid);
        let names = |key: &str| -> Result<BTreeSet<String>> {
            value[key]
                .as_array()
                .ok_or_else(invalid)?
                .iter()
                .map(text)
                .collect()
        };
        let entries = |key: &str| value[key].as_object().ok_or_else(invalid);
        let pair = |value: &Value| -> Result<(Value, Value)> {
            match value.as_array().map(Vec::as_slice) {
                Some([first, second]) => Ok((first.clone(), second.clone())),
                _ => Err(invalid()),
            }
        };
        let mut semantics = Semantics {
            copy: names("copy")?,
            clone: names("clone")?,
            equality: names("equality")?,
            ..Semantics::default()
        };
        for (owner, fields) in entries("fields")? {
            let fields = fields.as_object().ok_or_else(invalid)?;
            let fields = fields
                .iter()
                .map(|(name, ty)| Ok((name.clone(), text(ty)?)))
                .collect::<Result<_>>()?;
            semantics.fields.insert(owner.clone(), fields);
        }
        for variant in value["variants"].as_array().ok_or_else(invalid)? {
            let [owner, name, payload] =
                variant.as_array().map(Vec::as_slice).ok_or_else(invalid)?
            else {
                return Err(invalid());
            };
            let payload = if payload.is_null() {
                None
            } else {
                Some(text(payload)?)
            };
            semantics
                .variants
                .insert((text(owner)?, text(name)?), payload);
        }
        for (name, signature) in entries("functions")? {
            let (parameters, output) = pair(signature)?;
            let parameters = parameters
                .as_array()
                .ok_or_else(invalid)?
                .iter()
                .map(text)
                .collect::<Result<_>>()?;
            semantics
                .functions
                .insert(name.clone(), (parameters, text(&output)?));
        }
        let constants = entries("constants")?
            .iter()
            .map(|(name, ty)| {
                Ok((
                    name.clone(),
                    Binding {
                        ty: text(ty)?,
                        mutable: false,
                    },
                ))
            })
            .collect::<Result<_>>()?;
        let owners = entries("owners")?
            .iter()
            .map(|(name, owner)| {
                let (module, exported) = pair(owner)?;
                Ok((
                    name.clone(),
                    (text(&module)?, exported.as_bool().ok_or_else(invalid)?),
                ))
            })
            .collect::<Result<_>>()?;
        Ok(Self {
            modules: value["modules"].as_array().ok_or_else(invalid)?.clone(),
            types: TypeSets {
                declarations: names("declarations")?,
                structs: names("structs")?,
                vector_elements: names("vectorElements")?,
            },
            semantics,
            constants,
            owners,
        })
    }
}
