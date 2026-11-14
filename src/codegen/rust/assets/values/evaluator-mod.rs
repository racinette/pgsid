
#[allow(dead_code, unused_imports, unused_variables, unused_mut, unused_assignments, non_snake_case, non_camel_case_types, clippy::all)]
mod evaluator;
mod numeric;
mod text;

pub use numeric::{Numeric, NumericError};
pub use text::{Aclitem, Jsonpath, Tsquery, Tsvector, Xml};
