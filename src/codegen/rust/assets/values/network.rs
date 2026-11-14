//! PostgreSQL's network addresses and MAC addresses.

use std::error::Error;
use std::fmt;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use bytes::{Buf, BufMut, BytesMut};
use postgres_types::{to_sql_checked, FromSql, IsNull, ToSql, Type};

use super::temporal::{accepts_base, exact};

type BoxError = Box<dyn Error + Sync + Send>;

/// An inet value: a host address with the length of its network prefix.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Inet {
    pub address: IpAddr,
    pub prefix: u8,
}
/// A cidr value: a network, whose address has no bits set past its prefix.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Cidr {
    pub address: IpAddr,
    pub prefix: u8,
}

fn width(address: IpAddr) -> u8 {
    if address.is_ipv4() { 32 } else { 128 }
}
fn read(mut raw: &[u8]) -> Result<(IpAddr, u8), BoxError> {
    if raw.remaining() < 4 {
        return Err("invalid network address".into());
    }
    let (family, prefix, _cidr, length) = (raw.get_u8(), raw.get_u8(), raw.get_u8(), raw.get_u8());
    let address = match (family, length) {
        (2, 4) => IpAddr::V4(Ipv4Addr::from(<[u8; 4]>::try_from(raw)?)),
        (3, 16) => IpAddr::V6(Ipv6Addr::from(<[u8; 16]>::try_from(raw)?)),
        _ => return Err("invalid network address".into()),
    };
    Ok((address, prefix))
}
fn write(address: IpAddr, prefix: u8, cidr: bool, out: &mut BytesMut) -> Result<(), BoxError> {
    if prefix > width(address) {
        return Err("network prefix longer than the address".into());
    }
    match address {
        IpAddr::V4(address) => {
            out.put_slice(&[2, prefix, u8::from(cidr), 4]);
            out.put_slice(&address.octets());
        }
        IpAddr::V6(address) => {
            out.put_slice(&[3, prefix, u8::from(cidr), 16]);
            out.put_slice(&address.octets());
        }
    }
    Ok(())
}

impl<'a> FromSql<'a> for Inet {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        let (address, prefix) = read(raw)?;
        Ok(Self { address, prefix })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::INET)
    }
}
impl ToSql for Inet {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        write(self.address, self.prefix, false, out)?;
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::INET)
    }
    to_sql_checked!();
}
impl<'a> FromSql<'a> for Cidr {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        let (address, prefix) = read(raw)?;
        Ok(Self { address, prefix })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::CIDR)
    }
}
impl ToSql for Cidr {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        write(self.address, self.prefix, true, out)?;
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::CIDR)
    }
    to_sql_checked!();
}
// As the server writes them: an inet's prefix only where it is shorter than the address.
impl fmt::Display for Inet {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.address)?;
        if self.prefix != width(self.address) {
            write!(formatter, "/{}", self.prefix)?;
        }
        Ok(())
    }
}
impl fmt::Display for Cidr {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}/{}", self.address, self.prefix)
    }
}

/// A six-byte MAC address.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Macaddr(pub [u8; 6]);
/// An eight-byte MAC address.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Macaddr8(pub [u8; 8]);

macro_rules! mac {
    ($type:ident, $sql:expr, $width:expr) => {
        impl<'a> FromSql<'a> for $type {
            fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
                Ok(Self(<[u8; $width]>::try_from(exact(raw, $width)?)?))
            }
            fn accepts(ty: &Type) -> bool {
                accepts_base(ty, &$sql)
            }
        }
        impl ToSql for $type {
            fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
                out.put_slice(&self.0);
                Ok(IsNull::No)
            }
            fn accepts(ty: &Type) -> bool {
                accepts_base(ty, &$sql)
            }
            to_sql_checked!();
        }
        impl fmt::Display for $type {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                for (index, byte) in self.0.iter().enumerate() {
                    write!(formatter, "{}{byte:02x}", if index == 0 { "" } else { ":" })?;
                }
                Ok(())
            }
        }
    };
}
mac!(Macaddr, Type::MACADDR, 6);
mac!(Macaddr8, Type::MACADDR8, 8);
