//! Values of the PostgreSQL types that no Rust standard type holds whole.

mod bits;
mod clock;
mod dims;
mod error;
mod geometry;
mod identifiers;
mod json;
mod network;
mod range;
mod temporal;

pub use bits::BitString;
pub use clock::{Time, Timetz};
pub use dims::{DimensionError, D2, D3, D4, D5, D6};
pub use error::QueryError;
pub use geometry::{Circle, Line, Lseg, Path, PgBox, Point, Polygon};
pub use identifiers::{Char, Cid, Money, OidAlias, PgLsn, Refcursor, Snapshot, Tid, Uuid, Xid, Xid8};
pub use json::Json;
pub use network::{Cidr, Inet, Macaddr, Macaddr8};
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
