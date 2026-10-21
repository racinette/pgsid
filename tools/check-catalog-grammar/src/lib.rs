use pgsid_check_evaluator::{pg_catalog::literal_text_fields, ArrayElement, ArrayValue, TextValue};
use serde_json::{json, Value};

pub fn decode_fields(source: &str) -> Result<String, String> {
    let request: Value = serde_json::from_str(source).map_err(|error| error.to_string())?;
    let kind = match request.get("kind").and_then(Value::as_str) {
        Some("range") => 0,
        Some("multirange") => 1,
        Some("array") => 2,
        _ => return Err("Unknown catalog text grammar".to_owned()),
    };
    let text = request
        .get("text")
        .and_then(Value::as_str)
        .ok_or_else(|| "Catalog text grammar requires a string".to_owned())?;
    let response = match literal_text_fields(TextValue::Value(text.to_owned()), kind) {
        ArrayValue::Value(value) => {
            let fields: Result<Vec<_>, _> = value
                .elements
                .into_iter()
                .map(|element| match element {
                    ArrayElement::Text(text) => Ok(Some(text)),
                    ArrayElement::Null => Ok(None),
                    _ => Err("Unexpected catalog text grammar element".to_owned()),
                })
                .collect();
            json!({"kind":"Value","fields":fields?})
        }
        ArrayValue::Error(error) => json!({"kind":"Error","state":error.state}),
        _ => json!({"kind":"Unknown"}),
    };
    Ok(response.to_string())
}

#[cfg(test)]
mod tests {
    use super::decode_fields;
    use serde_json::{json, Value};

    #[test]
    fn validates_requests_and_serializes_decoded_fields() {
        for source in [
            "",
            "null",
            "{}",
            r#"{"kind":"other","text":"{}"}"#,
            r#"{"kind":"array","text":1}"#,
        ] {
            assert!(decode_fields(source).is_err(), "{source}");
        }
        let request = json!({"kind":"array","text":r#"{NULL,"NULL","é雪","a\\b"}"#});
        let result: Value =
            serde_json::from_str(&decode_fields(&request.to_string()).unwrap()).unwrap();
        assert_eq!(
            result,
            json!({"kind":"Value","fields":[null,"NULL","é雪","a\\b"]})
        );
        let error: Value =
            serde_json::from_str(&decode_fields(r#"{"kind":"range","text":"invalid"}"#).unwrap())
                .unwrap();
        assert_eq!(
            error,
            json!({"kind":"Error","state":u32::from_str_radix("22P02",36).unwrap()})
        );
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use std::cell::RefCell;

    thread_local! {
        static BUFFERS: RefCell<(Vec<u8>, Vec<u8>)> = RefCell::new((Vec::new(), Vec::new()));
    }

    #[no_mangle]
    pub extern "C" fn alloc(size: u32) -> u32 {
        BUFFERS.with(|buffers| {
            let mut buffers = buffers.borrow_mut();
            buffers.0.resize(size as usize, 0);
            buffers.0.as_mut_ptr() as u32
        })
    }

    #[no_mangle]
    pub extern "C" fn decode() -> u32 {
        BUFFERS.with(|buffers| {
            let mut buffers = buffers.borrow_mut();
            match std::str::from_utf8(&buffers.0)
                .map_err(|error| error.to_string())
                .and_then(super::decode_fields)
            {
                Ok(output) => {
                    buffers.1 = output.into_bytes();
                    0
                }
                Err(error) => {
                    buffers.1 = error.into_bytes();
                    1
                }
            }
        })
    }

    #[no_mangle]
    pub extern "C" fn output_ptr() -> u32 {
        BUFFERS.with(|buffers| buffers.borrow().1.as_ptr() as u32)
    }

    #[no_mangle]
    pub extern "C" fn output_len() -> u32 {
        BUFFERS.with(|buffers| buffers.borrow().1.len() as u32)
    }

    #[no_mangle]
    pub extern "C" fn dispose() {
        BUFFERS.with(|buffers| {
            let mut buffers = buffers.borrow_mut();
            buffers.0.clear();
            buffers.1.clear();
        });
    }
}
