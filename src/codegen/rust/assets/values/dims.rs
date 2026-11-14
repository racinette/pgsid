//! Arrays of a declared number of dimensions, each level a vector.

use std::error::Error;

use bytes::{Buf, BytesMut};
use postgres_protocol::types::{self as protocol, ArrayDimension};
use postgres_types::{to_sql_checked, FromSql, IsNull, Kind, ToSql, Type};

type BoxError = Box<dyn Error + Sync + Send>;

// The element type of an array type, or of a domain over one.
fn element(ty: &Type) -> Option<&Type> {
    match ty.kind() {
        Kind::Array(element) => Some(element),
        Kind::Domain(base) => element(base),
        _ => None,
    }
}

/// An array whose dimension count is not one the column declares. The count is declared by the
/// column's dimensions mapping, one when it has none.
#[derive(Debug)]
pub struct DimensionError {
    pub found: usize,
    pub declared: &'static [usize],
}
impl std::fmt::Display for DimensionError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "array has {} dimensions, but the column's dimensions mapping declares {:?}",
            self.found, self.declared
        )
    }
}
impl Error for DimensionError {}

/// An array read: the length of each dimension and the elements in order. An empty array has no
/// dimensions. The binary format is the dimension count, a NULL flag and the element type, each
/// dimension's length and lower bound, then each element's length and bytes, -1 for NULL.
pub fn read<'a, T: FromSql<'a>>(ty: &Type, mut raw: &'a [u8]) -> Result<(Vec<usize>, Vec<T>), BoxError> {
    let element = element(ty).ok_or("not an array type")?;
    if raw.remaining() < 12 {
        return Err("invalid array".into());
    }
    let count = usize::try_from(raw.get_i32()).map_err(|_| "invalid array")?;
    raw.advance(8);
    if raw.remaining() < count * 8 {
        return Err("invalid array".into());
    }
    let mut lengths = Vec::with_capacity(count);
    for _ in 0..count {
        lengths.push(usize::try_from(raw.get_i32()).map_err(|_| "invalid array length")?);
        raw.advance(4);
    }
    let total: usize = if count == 0 { 0 } else { lengths.iter().product() };
    let mut values = Vec::with_capacity(total);
    for _ in 0..total {
        if raw.remaining() < 4 {
            return Err("invalid array".into());
        }
        let length = raw.get_i32();
        let value = if length < 0 {
            None
        } else {
            let length = usize::try_from(length)?;
            let (value, rest) = raw.split_at_checked(length).ok_or("invalid array")?;
            raw = rest;
            Some(value)
        };
        values.push(T::from_sql_nullable(element, value)?);
    }
    if !raw.is_empty() {
        return Err("invalid array".into());
    }
    Ok((lengths, values))
}

/// An array written from the length of each dimension and the elements in order.
pub fn write<'b, T: ToSql + 'b>(
    ty: &Type,
    lengths: &[usize],
    values: impl Iterator<Item = &'b T>,
    out: &mut BytesMut,
) -> Result<(), BoxError> {
    let element = element(ty).ok_or("not an array type")?;
    let dimensions = lengths
        .iter()
        .map(|length| Ok(ArrayDimension { len: i32::try_from(*length)?, lower_bound: 1 }))
        .collect::<Result<Vec<_>, BoxError>>()?;
    protocol::array_to_sql(
        dimensions,
        element.oid(),
        values,
        |value, out| match value.to_sql(element, out)? {
            IsNull::No => Ok(postgres_protocol::IsNull::No),
            IsNull::Yes => Ok(postgres_protocol::IsNull::Yes),
        },
        out,
    )?;
    Ok(())
}

/// Nested vectors of one depth, read from and written as an array of that many dimensions.
pub trait Nested<T>: Sized {
    const DEPTH: usize;
    fn build(lengths: &[usize], values: &mut std::vec::IntoIter<T>) -> Self;
    // The lengths of each level, refused where sub-arrays differ, as array input refuses them.
    fn lengths(&self, out: &mut Vec<usize>, level: usize) -> Result<(), BoxError>;
    fn values<'b>(&'b self, out: &mut Vec<&'b T>);
}
impl<T> Nested<T> for Vec<T> {
    const DEPTH: usize = 1;
    fn build(lengths: &[usize], values: &mut std::vec::IntoIter<T>) -> Self {
        values.by_ref().take(lengths.first().copied().unwrap_or(0)).collect()
    }
    fn lengths(&self, out: &mut Vec<usize>, level: usize) -> Result<(), BoxError> {
        match out.get(level) {
            None => out.push(self.len()),
            Some(length) if *length == self.len() => {}
            Some(_) => return Err("sub-arrays of a multidimensional array differ in length".into()),
        }
        Ok(())
    }
    fn values<'b>(&'b self, out: &mut Vec<&'b T>) {
        out.extend(self.iter());
    }
}
macro_rules! nested {
    ($depth:expr, $inner:ty) => {
        impl<T> Nested<T> for Vec<$inner> {
            const DEPTH: usize = $depth;
            fn build(lengths: &[usize], values: &mut std::vec::IntoIter<T>) -> Self {
                (0..lengths.first().copied().unwrap_or(0))
                    .map(|_| <$inner as Nested<T>>::build(&lengths[1..], values))
                    .collect()
            }
            fn lengths(&self, out: &mut Vec<usize>, level: usize) -> Result<(), BoxError> {
                match out.get(level) {
                    None => out.push(self.len()),
                    Some(length) if *length == self.len() => {}
                    Some(_) => return Err("sub-arrays of a multidimensional array differ in length".into()),
                }
                for item in self {
                    <$inner as Nested<T>>::lengths(item, out, level + 1)?;
                }
                Ok(())
            }
            fn values<'b>(&'b self, out: &mut Vec<&'b T>) {
                for item in self {
                    <$inner as Nested<T>>::values(item, out);
                }
            }
        }
    };
}
nested!(2, Vec<T>);
nested!(3, Vec<Vec<T>>);
nested!(4, Vec<Vec<Vec<T>>>);
nested!(5, Vec<Vec<Vec<Vec<T>>>>);
nested!(6, Vec<Vec<Vec<Vec<Vec<T>>>>>);

/// Nested vectors read from an array of their depth, or the dimension error naming the counts
/// declared. An empty array reads as the empty vector.
pub fn shape<T, N: Nested<T>>(lengths: Vec<usize>, values: Vec<T>, declared: &'static [usize]) -> Result<N, BoxError> {
    if !lengths.is_empty() && lengths.len() != N::DEPTH {
        return Err(Box::new(DimensionError { found: lengths.len(), declared }));
    }
    Ok(N::build(&lengths, &mut values.into_iter()))
}
/// Nested vectors written as an array of their depth; an empty one is the empty array.
pub fn unshape<T: ToSql, N: Nested<T>>(ty: &Type, value: &N, out: &mut BytesMut) -> Result<IsNull, BoxError> {
    let mut lengths = Vec::new();
    value.lengths(&mut lengths, 0)?;
    let mut values = Vec::new();
    value.values(&mut values);
    if values.is_empty() {
        lengths.clear();
    }
    write(ty, &lengths, values.into_iter(), out)?;
    Ok(IsNull::No)
}
pub fn accepts<T>(ty: &Type, element_accepts: fn(&Type) -> bool) -> bool {
    element(ty).is_some_and(element_accepts)
}

macro_rules! dimension {
    ($name:ident, $depth:expr, $nested:ty, $doc:expr) => {
        #[doc = $doc]
        #[derive(Debug, Clone, PartialEq, Default)]
        pub struct $name<T>(pub $nested);
        impl<'a, T: FromSql<'a>> FromSql<'a> for $name<T> {
            fn from_sql(ty: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
                let (lengths, values) = read::<T>(ty, raw)?;
                Ok(Self(shape::<T, $nested>(lengths, values, &[$depth])?))
            }
            fn accepts(ty: &Type) -> bool {
                accepts::<T>(ty, <T as FromSql>::accepts)
            }
        }
        impl<T: ToSql> ToSql for $name<T> {
            fn to_sql(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
                unshape::<T, $nested>(ty, &self.0, out)
            }
            fn accepts(ty: &Type) -> bool {
                accepts::<T>(ty, <T as ToSql>::accepts)
            }
            to_sql_checked!();
        }
    };
}
dimension!(D2, 2, Vec<Vec<T>>, "An array of two dimensions.");
dimension!(D3, 3, Vec<Vec<Vec<T>>>, "An array of three dimensions.");
dimension!(D4, 4, Vec<Vec<Vec<Vec<T>>>>, "An array of four dimensions.");
dimension!(D5, 5, Vec<Vec<Vec<Vec<Vec<T>>>>>, "An array of five dimensions.");
dimension!(D6, 6, Vec<Vec<Vec<Vec<Vec<Vec<T>>>>>>, "An array of six dimensions.");
