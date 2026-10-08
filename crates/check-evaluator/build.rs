use std::{env, path::PathBuf, process::Command};

fn main() {
    println!("cargo:rerun-if-changed=../../vendor/postgresql-timezone/tzdata.zi");
    println!("cargo:rerun-if-env-changed=ZIC");
    let root = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap()).join("../..");
    let output = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    println!("cargo:rerun-if-changed=../../vendor/postgresql-unicode");
    pgsid_check_unicode_data::generate(
        &root.join("vendor/postgresql-unicode"),
        &output.join("unicode-tables.rs"),
    );
    let tzif = output.join("tzif");
    if tzif.exists() {
        std::fs::remove_dir_all(&tzif).unwrap();
    }
    std::fs::create_dir_all(&tzif).unwrap();
    assert!(
        Command::new(env::var_os("ZIC").unwrap_or_else(|| "zic".into()))
            .arg("-d")
            .arg(&tzif)
            .arg(root.join("vendor/postgresql-timezone/tzdata.zi"))
            .status()
            .expect("CHECK timezone generation requires zic")
            .success()
    );
    pgsid_check_timezone_data::generate(&tzif, &output.join("timezone-tables.rs"));
}
