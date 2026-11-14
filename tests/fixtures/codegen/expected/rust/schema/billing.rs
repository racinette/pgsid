/// The enum billing.event_state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, postgres_types::ToSql, postgres_types::FromSql)]
#[postgres(name = "event_state")]
pub enum EventState {
    #[postgres(name = "pending")]
    Pending,
    #[postgres(name = "paid")]
    Paid,
}

/// The composite type billing.event_metadata.
#[derive(Debug, Clone, PartialEq, postgres_types::ToSql, postgres_types::FromSql)]
#[postgres(name = "event_metadata")]
pub struct EventMetadata {
    #[postgres(name = "event")]
    pub event: Option<super::public::EventId>,
}

/// The domain billing.event_id.
#[derive(Debug, Clone, PartialEq)]
pub struct EventId(pub i64);

impl<'a> postgres_types::FromSql<'a> for EventId {
    fn from_sql(ty: &postgres_types::Type, raw: &'a [u8]) -> Result<EventId, Box<dyn std::error::Error + Sync + Send>> {
        Ok(EventId(<i64 as postgres_types::FromSql<'a>>::from_sql(super::pgsid::domain_base(ty), raw)?))
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "event_id" && ty.schema() == "billing") || <i64 as postgres_types::FromSql<'a>>::accepts(super::pgsid::domain_base(ty))
    }
}

impl postgres_types::ToSql for EventId {
    fn to_sql(&self, ty: &postgres_types::Type, out: &mut bytes::BytesMut) -> Result<postgres_types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        <i64 as postgres_types::ToSql>::to_sql(&self.0, super::pgsid::domain_base(ty), out)
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "event_id" && ty.schema() == "billing") || <i64 as postgres_types::ToSql>::accepts(super::pgsid::domain_base(ty))
    }

    postgres_types::to_sql_checked!();
}

/// A row of billing.events.
#[derive(Debug, Clone, PartialEq)]
pub struct Events {
    pub id: EventId,
    pub source_id: super::public::EventId,
    pub state: EventState,
    pub metadata: Option<EventMetadata>,
}

impl Events {
    /// Reads a row holding these columns, by name.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, tokio_postgres::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            source_id: row.try_get("source_id")?,
            state: row.try_get("state")?,
            metadata: row.try_get("metadata")?,
        })
    }
}
