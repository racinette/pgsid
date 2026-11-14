/// The SQL of GetEvent.
pub const GET_EVENT_SQL: &'static str = "WITH selected AS (\n  SELECT id, account_id, payload, state, created_at\n  FROM public.events\n  WHERE id = $1\n)\nSELECT\n  selected.id,\n  selected.payload,\n  selected.payload -> 'actor' AS actor,\n  selected.state,\n  selected.created_at,\n  accounts.id AS joined_account_id,\n  accounts.display_name\nFROM selected\nLEFT JOIN public.accounts AS accounts ON accounts.id = selected.account_id;";

/// The parameters of GetEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventParams {
    pub id: Option<i64>,
}

/// A row of GetEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventRow {
    pub id: crate::db::public::EventId,
    pub payload: crate::db::pgsid::Json,
    pub actor: Option<crate::db::pgsid::Json>,
    pub state: crate::db::public::EventState,
    pub created_at: crate::db::pgsid::Timestamptz,
    pub accounts: GetEventAccounts,
}

/// The forms the accounts columns of a GetEvent row take.
#[derive(Debug, Clone, PartialEq)]
pub enum GetEventAccounts {
    Absent,
    Present {
        joined_account_id: i64,
        display_name: String,
    },
}

impl GetEventRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        let column5: Option<i64> = row.try_get(5)?;
        let column6: Option<String> = row.try_get(6)?;
        Ok(Self {
            id: row.try_get(0)?,
            payload: row.try_get(1)?,
            actor: row.try_get(2)?,
            state: row.try_get(3)?,
            created_at: row.try_get(4)?,
            accounts: match (column5, column6) {
                (None, _) => GetEventAccounts::Absent,
                (Some(column5), Some(column6)) => GetEventAccounts::Present {
                    joined_account_id: column5,
                    display_name: column6,
                },
                _ => return Err(crate::db::pgsid::QueryError::NoMember {
                    query: "GetEvent",
                    group: "GetEventAccounts",
                }),
            },
        })
    }
}

/// Runs GetEvent and reads its first row, if it returns one.
pub async fn get_event(client: &impl tokio_postgres::GenericClient, params: &GetEventParams) -> Result<Option<GetEventRow>, crate::db::pgsid::QueryError> {
    client.query(GET_EVENT_SQL, &[&params.id]).await?.first().map(GetEventRow::from_row).transpose()
}

/// The SQL of UpdateEvent.
pub const UPDATE_EVENT_SQL: &'static str = "UPDATE public.events\nSET payload = $1, note = $2\nWHERE id = $3\nRETURNING id, payload, payload ->> 'score' AS score, note;";

/// The parameters of UpdateEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct UpdateEventParams {
    pub payload: crate::db::pgsid::Json,
    pub note: Option<String>,
    pub id: Option<i64>,
}

/// A row of UpdateEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct UpdateEventRow {
    pub id: crate::db::public::EventId,
    pub payload: crate::db::pgsid::Json,
    pub score: Option<String>,
    pub note: Option<String>,
}

impl UpdateEventRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            id: row.try_get(0)?,
            payload: row.try_get(1)?,
            score: row.try_get(2)?,
            note: row.try_get(3)?,
        })
    }
}

/// Runs UpdateEvent and reads its first row, if it returns one.
pub async fn update_event(client: &impl tokio_postgres::GenericClient, params: &UpdateEventParams) -> Result<Option<UpdateEventRow>, crate::db::pgsid::QueryError> {
    client.query(UPDATE_EVENT_SQL, &[&params.payload, &params.note, &params.id]).await?.first().map(UpdateEventRow::from_row).transpose()
}

/// The SQL of DeleteFinishedEvents.
pub const DELETE_FINISHED_EVENTS_SQL: &'static str = "DELETE FROM public.events\nWHERE state = $1;";

/// The parameters of DeleteFinishedEvents.
#[derive(Debug, Clone, PartialEq)]
pub struct DeleteFinishedEventsParams {
    pub state: Option<crate::db::public::EventState>,
}

/// Runs DeleteFinishedEvents and returns the number of rows it affected.
pub async fn delete_finished_events(client: &impl tokio_postgres::GenericClient, params: &DeleteFinishedEventsParams) -> Result<u64, crate::db::pgsid::QueryError> {
    Ok(client.execute(DELETE_FINISHED_EVENTS_SQL, &[&params.state]).await?)
}

/// The SQL of ListEvents.
pub const LIST_EVENTS_SQL: &'static str = "WITH selected AS (SELECT id, payload, note FROM public.events)\nSELECT id, payload, note FROM selected ORDER BY id;";

/// A row of ListEvents.
#[derive(Debug, Clone, PartialEq)]
pub struct ListEventsRow {
    pub id: crate::db::public::EventId,
    pub payload: crate::db::pgsid::Json,
    pub note: Option<String>,
}

impl ListEventsRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            id: row.try_get(0)?,
            payload: row.try_get(1)?,
            note: row.try_get(2)?,
        })
    }
}

/// Runs ListEvents and reads its rows.
pub async fn list_events(client: &impl tokio_postgres::GenericClient) -> Result<Vec<ListEventsRow>, crate::db::pgsid::QueryError> {
    client.query(LIST_EVENTS_SQL, &[]).await?.iter().map(ListEventsRow::from_row).collect()
}

/// The SQL of RenameEvent.
pub const RENAME_EVENT_SQL: &'static str = "UPDATE public.events SET note = $1 WHERE id = $2;";

/// The parameters of RenameEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct RenameEventParams {
    pub note: Option<String>,
    pub id: Option<i64>,
}

/// Runs RenameEvent.
pub async fn rename_event(client: &impl tokio_postgres::GenericClient, params: &RenameEventParams) -> Result<(), crate::db::pgsid::QueryError> {
    client.execute(RENAME_EVENT_SQL, &[&params.note, &params.id]).await?;
    Ok(())
}

/// The SQL of GetEventStates.
pub const GET_EVENT_STATES_SQL: &'static str = "SELECT states FROM public.events WHERE id = $1;";

/// The parameters of GetEventStates.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventStatesParams {
    pub id: Option<i64>,
}

/// A row of GetEventStates.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventStatesRow {
    pub states: Option<Vec<Option<crate::db::public::EventState>>>,
}

impl GetEventStatesRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            states: row.try_get(0)?,
        })
    }
}

/// Runs GetEventStates and reads its first row, if it returns one.
pub async fn get_event_states(client: &impl tokio_postgres::GenericClient, params: &GetEventStatesParams) -> Result<Option<GetEventStatesRow>, crate::db::pgsid::QueryError> {
    client.query(GET_EVENT_STATES_SQL, &[&params.id]).await?.first().map(GetEventStatesRow::from_row).transpose()
}

/// The SQL of GetEventTypes.
pub const GET_EVENT_TYPES_SQL: &'static str = "SELECT id, default_id, state, states, ARRAY[1, NULL]::int4[] AS numbers\nFROM public.events WHERE id = $1;";

/// The parameters of GetEventTypes.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventTypesParams {
    pub id: Option<i64>,
}

/// A row of GetEventTypes.
#[derive(Debug, Clone, PartialEq)]
pub struct GetEventTypesRow {
    pub id: crate::db::public::EventId,
    pub default_id: Option<crate::db::public::DefaultEventId>,
    pub state: crate::db::public::EventState,
    pub states: Option<Vec<Option<crate::db::public::EventState>>>,
    pub numbers: Vec<Option<i32>>,
}

impl GetEventTypesRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            id: row.try_get(0)?,
            default_id: row.try_get(1)?,
            state: row.try_get(2)?,
            states: row.try_get(3)?,
            numbers: row.try_get(4)?,
        })
    }
}

/// Runs GetEventTypes and reads its first row, if it returns one.
pub async fn get_event_types(client: &impl tokio_postgres::GenericClient, params: &GetEventTypesParams) -> Result<Option<GetEventTypesRow>, crate::db::pgsid::QueryError> {
    client.query(GET_EVENT_TYPES_SQL, &[&params.id]).await?.first().map(GetEventTypesRow::from_row).transpose()
}

/// The SQL of GetBillingEvent.
pub const GET_BILLING_EVENT_SQL: &'static str = "SELECT id, source_id, state FROM billing.events WHERE id = $1;";

/// The parameters of GetBillingEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct GetBillingEventParams {
    pub id: Option<i64>,
}

/// A row of GetBillingEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct GetBillingEventRow {
    pub id: crate::db::billing::EventId,
    pub source_id: crate::db::public::EventId,
    pub state: crate::db::billing::EventState,
}

impl GetBillingEventRow {
    /// Reads a row of the query, by position.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, crate::db::pgsid::QueryError> {
        Ok(Self {
            id: row.try_get(0)?,
            source_id: row.try_get(1)?,
            state: row.try_get(2)?,
        })
    }
}

/// Runs GetBillingEvent and reads its first row, if it returns one.
pub async fn get_billing_event(client: &impl tokio_postgres::GenericClient, params: &GetBillingEventParams) -> Result<Option<GetBillingEventRow>, crate::db::pgsid::QueryError> {
    client.query(GET_BILLING_EVENT_SQL, &[&params.id]).await?.first().map(GetBillingEventRow::from_row).transpose()
}
