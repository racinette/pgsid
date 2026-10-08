use std::{env, path::Path};

fn main() {
    let arguments: Vec<_> = env::args().collect();
    assert_eq!(
        arguments.len(),
        3,
        "usage: check-unicode-data HEADER_DIRECTORY OUTPUT_RS"
    );
    pgsid_check_unicode_data::generate(Path::new(&arguments[1]), Path::new(&arguments[2]));
}
