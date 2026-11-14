//! PostgreSQL's ranges and multiranges over any subtype.

use std::error::Error;
use std::ops::Bound;

use bytes::{Buf, BufMut, BytesMut};
use postgres_protocol::types::{self as protocol, RangeBound};
use postgres_types::{to_sql_checked, FromSql, IsNull, Kind, ToSql, Type};

type BoxError = Box<dyn Error + Sync + Send>;

/// A range: empty, or two bounds, each including or excluding its value or unbounded. A range
/// keeps the bounds it was built with; the server stores, and reads back, its canonical form.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Range<T> {
    Empty,
    Bounds { lower: Bound<T>, upper: Bound<T> },
}

/// A multirange: its ranges, which the server sorts and merges.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
pub struct Multirange<T>(pub Vec<Range<T>>);

impl<T> std::ops::Deref for Multirange<T> {
    type Target = Vec<Range<T>>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

// The subtype of a range type, or of a domain over one.
fn range_subtype(ty: &Type) -> Option<&Type> {
    match ty.kind() {
        Kind::Range(subtype) => Some(subtype),
        Kind::Domain(base) => range_subtype(base),
        _ => None,
    }
}
// The subtype of a multirange type, or of a domain over one.
fn multirange_subtype(ty: &Type) -> Option<&Type> {
    match ty.kind() {
        Kind::Multirange(subtype) => Some(subtype),
        Kind::Domain(base) => multirange_subtype(base),
        _ => None,
    }
}

fn read_bound<'a, T: FromSql<'a>>(
    subtype: &Type,
    bound: RangeBound<Option<&'a [u8]>>,
) -> Result<Bound<T>, BoxError> {
    Ok(match bound {
        RangeBound::Inclusive(value) => Bound::Included(T::from_sql_nullable(subtype, value)?),
        RangeBound::Exclusive(value) => Bound::Excluded(T::from_sql_nullable(subtype, value)?),
        RangeBound::Unbounded => Bound::Unbounded,
    })
}
fn write_bound<T: ToSql>(
    subtype: &Type,
    bound: &Bound<T>,
    out: &mut BytesMut,
) -> Result<RangeBound<postgres_protocol::IsNull>, BoxError> {
    let null = |value: IsNull| match value {
        IsNull::Yes => postgres_protocol::IsNull::Yes,
        IsNull::No => postgres_protocol::IsNull::No,
    };
    Ok(match bound {
        Bound::Included(value) => RangeBound::Inclusive(null(value.to_sql(subtype, out)?)),
        Bound::Excluded(value) => RangeBound::Exclusive(null(value.to_sql(subtype, out)?)),
        Bound::Unbounded => RangeBound::Unbounded,
    })
}

impl<'a, T: FromSql<'a>> Range<T> {
    fn read(subtype: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(match protocol::range_from_sql(raw)? {
            protocol::Range::Empty => Self::Empty,
            protocol::Range::Nonempty(lower, upper) => Self::Bounds {
                lower: read_bound(subtype, lower)?,
                upper: read_bound(subtype, upper)?,
            },
        })
    }
}
impl<T: ToSql> Range<T> {
    fn write(&self, subtype: &Type, out: &mut BytesMut) -> Result<(), BoxError> {
        match self {
            Self::Empty => protocol::empty_range_to_sql(out),
            Self::Bounds { lower, upper } => protocol::range_to_sql(
                |out| write_bound(subtype, lower, out),
                |out| write_bound(subtype, upper, out),
                out,
            )?,
        }
        Ok(())
    }
}

impl<'a, T: FromSql<'a>> FromSql<'a> for Range<T> {
    fn from_sql(ty: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Self::read(range_subtype(ty).ok_or("not a range type")?, raw)
    }
    fn accepts(ty: &Type) -> bool {
        range_subtype(ty).is_some_and(T::accepts)
    }
}
impl<T: ToSql> ToSql for Range<T> {
    fn to_sql(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        self.write(range_subtype(ty).ok_or("not a range type")?, out)?;
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        range_subtype(ty).is_some_and(<T as ToSql>::accepts)
    }
    to_sql_checked!();
}

impl<'a, T: FromSql<'a>> FromSql<'a> for Multirange<T> {
    fn from_sql(ty: &Type, mut raw: &'a [u8]) -> Result<Self, BoxError> {
        let subtype = multirange_subtype(ty).ok_or("not a multirange type")?;
        if raw.remaining() < 4 {
            return Err("invalid multirange".into());
        }
        let count = raw.get_i32();
        let mut ranges = Vec::with_capacity(usize::try_from(count).unwrap_or(0));
        for _ in 0..count {
            if raw.remaining() < 4 {
                return Err("invalid multirange".into());
            }
            let length = usize::try_from(raw.get_i32()).map_err(|_| "invalid multirange")?;
            let (item, rest) = raw.split_at_checked(length).ok_or("invalid multirange")?;
            ranges.push(Range::read(subtype, item)?);
            raw = rest;
        }
        if !raw.is_empty() {
            return Err("invalid multirange".into());
        }
        Ok(Self(ranges))
    }
    fn accepts(ty: &Type) -> bool {
        multirange_subtype(ty).is_some_and(<T as FromSql>::accepts)
    }
}
impl<T: ToSql> ToSql for Multirange<T> {
    fn to_sql(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        let subtype = multirange_subtype(ty).ok_or("not a multirange type")?;
        out.put_i32(i32::try_from(self.0.len())?);
        for item in &self.0 {
            let start = out.len();
            out.put_i32(0);
            item.write(subtype, out)?;
            let length = i32::try_from(out.len() - start - 4)?;
            out[start..start + 4].copy_from_slice(&length.to_be_bytes());
        }
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        multirange_subtype(ty).is_some_and(<T as ToSql>::accepts)
    }
    to_sql_checked!();
}
