//! PostgreSQL's identifiers, positions and other small fixed-width values.

use std::error::Error;
use std::fmt;

use bytes::{Buf, BufMut, BytesMut};
use postgres_types::{to_sql_checked, FromSql, IsNull, Kind, ToSql, Type};

use super::temporal::{accepts_base, exact};

type BoxError = Box<dyn Error + Sync + Send>;

macro_rules! fixed {
    ($type:ident, $sql:expr, $width:expr, |$raw:ident| $read:expr, |$value:ident, $out:ident| $write:expr) => {
        impl<'a> FromSql<'a> for $type {
            fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
                let mut $raw = exact(raw, $width)?;
                Ok($read)
            }
            fn accepts(ty: &Type) -> bool {
                accepts_base(ty, &$sql)
            }
        }
        impl ToSql for $type {
            fn to_sql(&self, _: &Type, $out: &mut BytesMut) -> Result<IsNull, BoxError> {
                let $value = self;
                $write;
                Ok(IsNull::No)
            }
            fn accepts(ty: &Type) -> bool {
                accepts_base(ty, &$sql)
            }
            to_sql_checked!();
        }
    };
}

/// A UUID's sixteen bytes, written as the server writes it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Uuid(pub [u8; 16]);
impl fmt::Display for Uuid {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (index, byte) in self.0.iter().enumerate() {
            if matches!(index, 4 | 6 | 8 | 10) {
                formatter.write_str("-")?;
            }
            write!(formatter, "{byte:02x}")?;
        }
        Ok(())
    }
}
fixed!(Uuid, Type::UUID, 16, |raw| { let mut bytes = [0; 16]; raw.copy_to_slice(&mut bytes); Uuid(bytes) }, |value, out| out.put_slice(&value.0));

/// A transaction identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Xid(pub u32);
fixed!(Xid, Type::XID, 4, |raw| Xid(raw.get_u32()), |value, out| out.put_u32(value.0));
/// A command identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Cid(pub u32);
fixed!(Cid, Type::CID, 4, |raw| Cid(raw.get_u32()), |value, out| out.put_u32(value.0));
/// A full transaction identifier, with its epoch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Xid8(pub u64);
fixed!(Xid8, Type::XID8, 8, |raw| Xid8(raw.get_u64()), |value, out| out.put_u64(value.0));
/// A money amount in the currency's smallest unit, as the server stores it; its text depends on
/// the session's monetary locale.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Money(pub i64);
fixed!(Money, Type::MONEY, 8, |raw| Money(raw.get_i64()), |value, out| out.put_i64(value.0));
/// The single-byte "char" type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Char(pub u8);
fixed!(Char, Type::CHAR, 1, |raw| Char(raw.get_u8()), |value, out| out.put_u8(value.0));
/// A row's physical position: its block and its line pointer within it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Tid {
    pub block: u32,
    pub offset: u16,
}
fixed!(Tid, Type::TID, 6, |raw| Tid { block: raw.get_u32(), offset: raw.get_u16() }, |value, out| {
    out.put_u32(value.block);
    out.put_u16(value.offset)
});
impl fmt::Display for Tid {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "({},{})", self.block, self.offset)
    }
}
/// A write-ahead log position.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct PgLsn(pub u64);
fixed!(PgLsn, Type::PG_LSN, 8, |raw| PgLsn(raw.get_u64()), |value, out| out.put_u64(value.0));
impl fmt::Display for PgLsn {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{:X}/{:X}", self.0 >> 32, self.0 & 0xFFFF_FFFF)
    }
}

/// An object identifier of an OID alias type, such as regclass. The binary format carries the
/// identifier only; the server writes the object's name as text.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct OidAlias(pub u32);
const OID_ALIASES: &[&str] = &[
    "regproc", "regprocedure", "regoper", "regoperator", "regclass", "regtype", "regconfig",
    "regdictionary", "regnamespace", "regrole", "regcollation",
];
fn oid_alias(ty: &Type) -> bool {
    match ty.kind() {
        Kind::Domain(base) => oid_alias(base),
        _ => ty.schema() == "pg_catalog" && OID_ALIASES.contains(&ty.name()),
    }
}
impl<'a> FromSql<'a> for OidAlias {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(Self(exact(raw, 4)?.get_u32()))
    }
    fn accepts(ty: &Type) -> bool {
        oid_alias(ty)
    }
}
impl ToSql for OidAlias {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_u32(self.0);
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        oid_alias(ty)
    }
    to_sql_checked!();
}

/// A snapshot of transaction visibility: the oldest transaction still running, the first not yet
/// assigned, and the running ones between them.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Snapshot {
    pub xmin: u64,
    pub xmax: u64,
    pub running: Vec<u64>,
}
fn snapshot(ty: &Type) -> bool {
    match ty.kind() {
        Kind::Domain(base) => snapshot(base),
        _ => ty.schema() == "pg_catalog" && matches!(ty.name(), "pg_snapshot" | "txid_snapshot"),
    }
}
impl<'a> FromSql<'a> for Snapshot {
    fn from_sql(_: &Type, mut raw: &'a [u8]) -> Result<Self, BoxError> {
        if raw.remaining() < 20 {
            return Err("invalid snapshot".into());
        }
        let count = usize::try_from(raw.get_i32()).map_err(|_| "invalid snapshot")?;
        let (xmin, xmax) = (raw.get_u64(), raw.get_u64());
        if raw.remaining() != count * 8 {
            return Err("invalid snapshot".into());
        }
        Ok(Self { xmin, xmax, running: (0..count).map(|_| raw.get_u64()).collect() })
    }
    fn accepts(ty: &Type) -> bool {
        snapshot(ty)
    }
}
impl ToSql for Snapshot {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i32(i32::try_from(self.running.len())?);
        out.put_u64(self.xmin);
        out.put_u64(self.xmax);
        for xid in &self.running {
            out.put_u64(*xid);
        }
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        snapshot(ty)
    }
    to_sql_checked!();
}
impl fmt::Display for Snapshot {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}:{}:", self.xmin, self.xmax)?;
        for (index, xid) in self.running.iter().enumerate() {
            write!(formatter, "{}{xid}", if index == 0 { "" } else { "," })?;
        }
        Ok(())
    }
}

/// A cursor's name.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Refcursor(pub String);
impl<'a> FromSql<'a> for Refcursor {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(Self(std::str::from_utf8(raw)?.to_owned()))
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::REFCURSOR)
    }
}
impl ToSql for Refcursor {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_slice(self.0.as_bytes());
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::REFCURSOR)
    }
    to_sql_checked!();
}
