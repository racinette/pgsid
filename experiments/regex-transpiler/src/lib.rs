mod ast_json;
mod syntax;
mod validate;

pub fn parse_ast(source: &str) -> Result<String, String> {
    ast_json::parse(source)
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
            if size == 0 {
                0
            } else {
                buffers.0.as_mut_ptr() as u32
            }
        })
    }

    #[no_mangle]
    pub extern "C" fn parse() -> u32 {
        BUFFERS.with(|buffers| {
            let mut buffers = buffers.borrow_mut();
            let result = std::str::from_utf8(&buffers.0)
                .map_err(|error| error.to_string())
                .and_then(super::parse_ast);
            match result {
                Ok(ast) => {
                    buffers.1 = ast.into_bytes();
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
        BUFFERS.with(|buffers| {
            let buffers = buffers.borrow();
            if buffers.1.is_empty() {
                0
            } else {
                buffers.1.as_ptr() as u32
            }
        })
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
