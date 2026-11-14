/// The domain billing_extra.event_id.
#[derive(Debug, Clone, PartialEq)]
pub struct EventId(pub i64);

impl<'a> postgres_types::FromSql<'a> for EventId {
    fn from_sql(ty: &postgres_types::Type, raw: &'a [u8]) -> Result<EventId, Box<dyn std::error::Error + Sync + Send>> {
        Ok(EventId(<i64 as postgres_types::FromSql<'a>>::from_sql(super::pgsid::domain_base(ty), raw)?))
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "event_id" && ty.schema() == "billing_extra") || <i64 as postgres_types::FromSql<'a>>::accepts(super::pgsid::domain_base(ty))
    }
}

impl postgres_types::ToSql for EventId {
    fn to_sql(&self, ty: &postgres_types::Type, out: &mut bytes::BytesMut) -> Result<postgres_types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        <i64 as postgres_types::ToSql>::to_sql(&self.0, super::pgsid::domain_base(ty), out)
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "event_id" && ty.schema() == "billing_extra") || <i64 as postgres_types::ToSql>::accepts(super::pgsid::domain_base(ty))
    }

    postgres_types::to_sql_checked!();
}

/// A row of billing_extra.events.
#[derive(Debug, Clone, PartialEq)]
pub struct Events {
    pub id: EventId,
}

impl Events {
    /// Reads a row holding these columns, by name.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, tokio_postgres::Error> {
        Ok(Self {
            id: row.try_get("id")?,
        })
    }
}
