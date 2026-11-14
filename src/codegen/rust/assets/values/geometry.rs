//! PostgreSQL's geometric shapes, whose fields are float8 coordinates.

use std::error::Error;

use bytes::{Buf, BufMut, BytesMut};
use postgres_types::{to_sql_checked, FromSql, IsNull, ToSql, Type};

use super::temporal::accepts_base;

type BoxError = Box<dyn Error + Sync + Send>;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}
/// The line Ax + By + C = 0; the server refuses A and B both zero.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Line {
    pub a: f64,
    pub b: f64,
    pub c: f64,
}
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Lseg {
    pub start: Point,
    pub end: Point,
}
/// A box, which the server keeps with its upper right corner first; named apart from the standard
/// library's box.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PgBox {
    pub high: Point,
    pub low: Point,
}
#[derive(Debug, Clone, PartialEq)]
pub struct Path {
    pub closed: bool,
    pub points: Vec<Point>,
}
#[derive(Debug, Clone, PartialEq)]
pub struct Polygon {
    pub points: Vec<Point>,
}
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Circle {
    pub center: Point,
    pub radius: f64,
}

fn floats(raw: &mut &[u8], count: usize) -> Result<Vec<f64>, BoxError> {
    if raw.remaining() < count * 8 {
        return Err("invalid geometric value".into());
    }
    Ok((0..count).map(|_| raw.get_f64()).collect())
}
fn finish(raw: &[u8]) -> Result<(), BoxError> {
    if raw.is_empty() {
        Ok(())
    } else {
        Err("invalid geometric value".into())
    }
}
fn points(raw: &mut &[u8], count: i32) -> Result<Vec<Point>, BoxError> {
    let count = usize::try_from(count).map_err(|_| "invalid point count")?;
    let values = floats(raw, count * 2)?;
    Ok(values.chunks(2).map(|pair| Point { x: pair[0], y: pair[1] }).collect())
}
fn put_point(out: &mut BytesMut, point: Point) {
    out.put_f64(point.x);
    out.put_f64(point.y);
}

macro_rules! geometry {
    ($type:ty, $sql:expr, |$raw:ident| $read:expr, |$value:ident, $out:ident| $write:expr) => {
        impl<'a> FromSql<'a> for $type {
            fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
                let mut $raw = raw;
                let value = $read;
                finish($raw)?;
                Ok(value)
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

geometry!(Point, Type::POINT, |raw| { let v = floats(&mut raw, 2)?; Point { x: v[0], y: v[1] } }, |value, out| put_point(out, *value));
geometry!(Line, Type::LINE, |raw| { let v = floats(&mut raw, 3)?; Line { a: v[0], b: v[1], c: v[2] } }, |value, out| {
    out.put_f64(value.a);
    out.put_f64(value.b);
    out.put_f64(value.c)
});
geometry!(Lseg, Type::LSEG, |raw| { let v = floats(&mut raw, 4)?; Lseg { start: Point { x: v[0], y: v[1] }, end: Point { x: v[2], y: v[3] } } }, |value, out| {
    put_point(out, value.start);
    put_point(out, value.end)
});
geometry!(PgBox, Type::BOX, |raw| { let v = floats(&mut raw, 4)?; PgBox { high: Point { x: v[0], y: v[1] }, low: Point { x: v[2], y: v[3] } } }, |value, out| {
    put_point(out, value.high);
    put_point(out, value.low)
});
geometry!(Path, Type::PATH, |raw| {
    if raw.remaining() < 5 { return Err("invalid path".into()); }
    let closed = raw.get_u8() != 0;
    let count = raw.get_i32();
    Path { closed, points: points(&mut raw, count)? }
}, |value, out| {
    out.put_u8(u8::from(value.closed));
    out.put_i32(i32::try_from(value.points.len())?);
    for point in &value.points { put_point(out, *point); }
});
geometry!(Polygon, Type::POLYGON, |raw| {
    if raw.remaining() < 4 { return Err("invalid polygon".into()); }
    let count = raw.get_i32();
    Polygon { points: points(&mut raw, count)? }
}, |value, out| {
    out.put_i32(i32::try_from(value.points.len())?);
    for point in &value.points { put_point(out, *point); }
});
geometry!(Circle, Type::CIRCLE, |raw| { let v = floats(&mut raw, 3)?; Circle { center: Point { x: v[0], y: v[1] }, radius: v[2] } }, |value, out| {
    put_point(out, value.center);
    out.put_f64(value.radius)
});
