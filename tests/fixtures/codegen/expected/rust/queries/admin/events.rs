/// The SQL of GetEvent.
pub const GET_EVENT_SQL: &'static str = "SELECT id, source_id, state, metadata FROM billing.events WHERE id = $1;";

/// The parameters of GetEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventParams {
    pub id: Option<i64>,
}

/// A row of GetEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventRow {
    pub id: crate::db::billing::EventId,
    pub source_id: crate::db::public::EventId,
    pub state: crate::db::billing::EventState,
    pub metadata: Option<crate::db::billing::EventMetadata>,
}

impl GetEventRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            id: row.try_get(0)?,
            source_id: row.try_get(1)?,
            state: row.try_get(2)?,
            metadata: row.try_get(3)?,
        })
    }
}

/// Runs GetEvent and reads its first row, if it returns one.
pub async fn get_event(client: &impl tokio_postgres::GenericClient, params: &GetEventParams) -> Result<Option<GetEventRow>, crate::db::pgsid::QueryError> {
    client.query(GET_EVENT_SQL, &[&params.id]).await?.first().map(GetEventRow::from_row).transpose()
}

/// The SQL of GetEvent_linux.
pub const GET_EVENT_LINUX_SQL: &'static str = "SELECT 1 AS value;";

/// A row of GetEvent_linux.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventLinuxRow {
    pub value: i32,
}

impl GetEventLinuxRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            value: row.try_get(0)?,
        })
    }
}

/// Runs GetEvent_linux and reads its first row, if it returns one.
pub async fn get_event_linux(client: &impl tokio_postgres::GenericClient) -> Result<Option<GetEventLinuxRow>, crate::db::pgsid::QueryError> {
    client.query(GET_EVENT_LINUX_SQL, &[]).await?.first().map(GetEventLinuxRow::from_row).transpose()
}

/// The SQL of GetEvent_test.
pub const GET_EVENT_TEST_SQL: &'static str = "SELECT 2 AS value;";

/// A row of GetEvent_test.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventTestRow {
    pub value: i32,
}

impl GetEventTestRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            value: row.try_get(0)?,
        })
    }
}

/// Runs GetEvent_test and reads its first row, if it returns one.
pub async fn get_event_test(client: &impl tokio_postgres::GenericClient) -> Result<Option<GetEventTestRow>, crate::db::pgsid::QueryError> {
    client.query(GET_EVENT_TEST_SQL, &[]).await?.first().map(GetEventTestRow::from_row).transpose()
}

/// The SQL of _Hidden.
pub const HIDDEN_SQL: &'static str = "SELECT 3 AS value;";

/// A row of _Hidden.
#[derive(Debug, Clone, PartialEq)]
pub struct HiddenRow {
    pub value: i32,
}

impl HiddenRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            value: row.try_get(0)?,
        })
    }
}

/// Runs _Hidden and reads its first row, if it returns one.
pub async fn hidden(client: &impl tokio_postgres::GenericClient) -> Result<Option<HiddenRow>, crate::db::pgsid::QueryError> {
    client.query(HIDDEN_SQL, &[]).await?.first().map(HiddenRow::from_row).transpose()
}

/// The SQL of GetAliases.
pub const GET_ALIASES_SQL: &'static str = "SELECT p.id AS public_id, q.id AS dotted_id, r.id AS underscored_id\nFROM public.events p, \"billing.extra\".events q, billing_extra.events r;";

/// A row of GetAliases.
#[derive(Debug, Clone, PartialEq)]
pub struct GetAliasesRow {
    pub public_id: crate::db::public::EventId,
    pub dotted_id: crate::db::billing_dot_extra::EventId,
    pub underscored_id: crate::db::billing_extra::EventId,
}

impl GetAliasesRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            public_id: row.try_get(0)?,
            dotted_id: row.try_get(1)?,
            underscored_id: row.try_get(2)?,
        })
    }
}

/// Runs GetAliases and reads its first row, if it returns one.
pub async fn get_aliases(client: &impl tokio_postgres::GenericClient) -> Result<Option<GetAliasesRow>, crate::db::pgsid::QueryError> {
    client.query(GET_ALIASES_SQL, &[]).await?.first().map(GetAliasesRow::from_row).transpose()
}
