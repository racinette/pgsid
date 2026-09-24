use std::env;
use std::fs;

fn run() -> Result<(), String> {
    let mut arguments = env::args().skip(1);
    let mode = arguments
        .next()
        .ok_or("usage: regex-transpiler-spike --check SOURCE | --ast SOURCE OUT_FILE")?;
    let source = arguments.next().ok_or("source file is required")?;
    let output = match mode.as_str() {
        "--check" => None,
        "--ast" => Some(arguments.next().ok_or("AST output file is required")?),
        _ => return Err("expected --check or --ast".into()),
    };
    if arguments.next().is_some() {
        return Err("unexpected extra argument".into());
    }
    let source = fs::read_to_string(source).map_err(|error| error.to_string())?;
    let ast = regex_transpiler_spike::parse_ast(&source)?;
    if let Some(output) = output {
        fs::write(output, ast).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
