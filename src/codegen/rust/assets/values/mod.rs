//! Values of the PostgreSQL types that no Rust standard type holds whole.

mod json;
mod range;
mod temporal;

pub use json::Json;
pub use range::{Multirange, Range};
pub use std::ops::Bound;
pub use temporal::{Date, Interval, Timestamp, Timestamptz};

/// The type a domain is declared over, which its newtype reads and writes; any other type itself.
pub fn domain_base(ty: &postgres_types::Type) -> &postgres_types::Type {
    match ty.kind() {
        postgres_types::Kind::Domain(base) => base,
        _ => ty,
    }
}
