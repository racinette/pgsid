/// The enum public.event_state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, postgres_types::ToSql, postgres_types::FromSql)]
#[postgres(name = "event_state")]
pub enum EventState {
    #[postgres(name = "ready")]
    Ready,
    #[postgres(name = "in-progress")]
    InProgress,
    #[postgres(name = "done")]
    Done,
}

/// The composite type public.event_metadata.
#[derive(Debug, Clone, PartialEq, postgres_types::ToSql, postgres_types::FromSql)]
#[postgres(name = "event_metadata")]
pub struct EventMetadata {
    #[postgres(name = "source")]
    pub source: Option<String>,
    #[postgres(name = "confidence")]
    pub confidence: Option<super::pgsid::Numeric>,
}

/// The domain public.default_event_id.
#[derive(Debug, Clone, PartialEq)]
pub struct DefaultEventId(pub EventId);

impl<'a> postgres_types::FromSql<'a> for DefaultEventId {
    fn from_sql(ty: &postgres_types::Type, raw: &'a [u8]) -> Result<DefaultEventId, Box<dyn std::error::Error + Sync + Send>> {
        Ok(DefaultEventId(<EventId as postgres_types::FromSql<'a>>::from_sql(super::pgsid::domain_base(ty), raw)?))
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "default_event_id" && ty.schema() == "public") || <EventId as postgres_types::FromSql<'a>>::accepts(super::pgsid::domain_base(ty))
    }
}

impl postgres_types::ToSql for DefaultEventId {
    fn to_sql(&self, ty: &postgres_types::Type, out: &mut bytes::BytesMut) -> Result<postgres_types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        <EventId as postgres_types::ToSql>::to_sql(&self.0, super::pgsid::domain_base(ty), out)
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "default_event_id" && ty.schema() == "public") || <EventId as postgres_types::ToSql>::accepts(super::pgsid::domain_base(ty))
    }

    postgres_types::to_sql_checked!();
}

impl DefaultEventId {
    /// Evaluates the CHECKs of public.default_event_id on a value, which may be NULL or unknown.
    pub fn check_value(value: super::pgsid::CheckValue<&Self>) -> Vec<super::pgsid::CheckEvaluation> {
        vec!(super::pgsid::evaluator::checks::evaluation("public.event_id", "event_id_check", {
            let input_value = super::pgsid::evaluator::checks::read(&value, super::pgsid::evaluator::checkruntime::Int8Value::Unknown, super::pgsid::evaluator::checkruntime::Int8Value::Null, |value| super::pgsid::evaluator::checks::int8(&value.0.0));
            let faults = [super::pgsid::evaluator::checks::supplied(&value, match &input_value {
                super::pgsid::evaluator::checkruntime::Int8Value::Error(error) => Some(Some(*error)),
                super::pgsid::evaluator::checkruntime::Int8Value::Unknown | super::pgsid::evaluator::checkruntime::Int8Value::Unimplemented => Some(None),
                _ => None,
            })];
            super::pgsid::evaluator::checks::decide(&faults, move || super::pgsid::evaluator::checks::evaluate_check_public_domain_default_event_id_from_public_event_id_event_id_check_h7azw(input_value))
        }))
    }

    /// Evaluates the CHECKs of public.default_event_id on the value.
    pub fn evaluate_checks(&self) -> Vec<super::pgsid::CheckEvaluation> {
        Self::check_value(super::pgsid::CheckValue::Value(self))
    }

    /// The first CHECK of the domain the value fails, as the server would report it.
    pub fn validate_checks(&self) -> Result<(), super::pgsid::CheckError> {
        super::pgsid::validate_checks(self.evaluate_checks())
    }
}

/// The domain public.event_id.
#[derive(Debug, Clone, PartialEq)]
pub struct EventId(pub i64);

impl<'a> postgres_types::FromSql<'a> for EventId {
    fn from_sql(ty: &postgres_types::Type, raw: &'a [u8]) -> Result<EventId, Box<dyn std::error::Error + Sync + Send>> {
        Ok(EventId(<i64 as postgres_types::FromSql<'a>>::from_sql(super::pgsid::domain_base(ty), raw)?))
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "event_id" && ty.schema() == "public") || <i64 as postgres_types::FromSql<'a>>::accepts(super::pgsid::domain_base(ty))
    }
}

impl postgres_types::ToSql for EventId {
    fn to_sql(&self, ty: &postgres_types::Type, out: &mut bytes::BytesMut) -> Result<postgres_types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        <i64 as postgres_types::ToSql>::to_sql(&self.0, super::pgsid::domain_base(ty), out)
    }

    fn accepts(ty: &postgres_types::Type) -> bool {
        (ty.name() == "event_id" && ty.schema() == "public") || <i64 as postgres_types::ToSql>::accepts(super::pgsid::domain_base(ty))
    }

    postgres_types::to_sql_checked!();
}

impl EventId {
    /// Evaluates the CHECKs of public.event_id on a value, which may be NULL or unknown.
    pub fn check_value(value: super::pgsid::CheckValue<&Self>) -> Vec<super::pgsid::CheckEvaluation> {
        vec!(super::pgsid::evaluator::checks::evaluation("public.event_id", "event_id_check", {
            let input_value = super::pgsid::evaluator::checks::read(&value, super::pgsid::evaluator::checkruntime::Int8Value::Unknown, super::pgsid::evaluator::checkruntime::Int8Value::Null, |value| super::pgsid::evaluator::checks::int8(&value.0));
            let faults = [super::pgsid::evaluator::checks::supplied(&value, match &input_value {
                super::pgsid::evaluator::checkruntime::Int8Value::Error(error) => Some(Some(*error)),
                super::pgsid::evaluator::checkruntime::Int8Value::Unknown | super::pgsid::evaluator::checkruntime::Int8Value::Unimplemented => Some(None),
                _ => None,
            })];
            super::pgsid::evaluator::checks::decide(&faults, move || super::pgsid::evaluator::checks::evaluate_check_public_domain_event_id_event_id_check_hcydw(input_value))
        }))
    }

    /// Evaluates the CHECKs of public.event_id on the value.
    pub fn evaluate_checks(&self) -> Vec<super::pgsid::CheckEvaluation> {
        Self::check_value(super::pgsid::CheckValue::Value(self))
    }

    /// The first CHECK of the domain the value fails, as the server would report it.
    pub fn validate_checks(&self) -> Result<(), super::pgsid::CheckError> {
        super::pgsid::validate_checks(self.evaluate_checks())
    }
}

/// A row of public.accounts.
#[derive(Debug, Clone, PartialEq)]
pub struct Accounts {
    pub id: i64,
    pub display_name: String,
}

impl Accounts {
    /// Reads a row holding these columns, by name.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, tokio_postgres::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            display_name: row.try_get("display_name")?,
        })
    }
}

/// A row of public.events.
#[derive(Debug, Clone, PartialEq)]
pub struct Events {
    pub id: EventId,
    pub default_id: Option<DefaultEventId>,
    pub account_id: Option<i64>,
    pub state: EventState,
    pub states: Option<Vec<Option<EventState>>>,
    pub payload: super::pgsid::Json,
    pub audit: Option<super::pgsid::Json>,
    pub metadata: Option<EventMetadata>,
    pub note: Option<String>,
    pub created_at: super::pgsid::Timestamptz,
}

impl Events {
    /// Reads a row holding these columns, by name.
    pub fn from_row(row: &tokio_postgres::Row) -> Result<Self, tokio_postgres::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            default_id: row.try_get("default_id")?,
            account_id: row.try_get("account_id")?,
            state: row.try_get("state")?,
            states: row.try_get("states")?,
            payload: row.try_get("payload")?,
            audit: row.try_get("audit")?,
            metadata: row.try_get("metadata")?,
            note: row.try_get("note")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

/// The columns of public.events its CHECKs read, each unknown until given.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct EventsCheckInput {
    pub id: super::pgsid::CheckValue<EventId>,
    pub default_id: super::pgsid::CheckValue<DefaultEventId>,
}

impl EventsCheckInput {
    /// Evaluates the CHECKs of public.events, and those of its columns' domains, on the columns given.
    pub fn evaluate(&self) -> Vec<super::pgsid::CheckEvaluation> {
        vec!(EventId::check_value(self.id.as_ref()), DefaultEventId::check_value(self.default_id.as_ref()), vec!()).into_iter().flatten().collect()
    }

    /// The first CHECK of the table the columns fail, as the server would report it.
    pub fn validate(&self) -> Result<(), super::pgsid::CheckError> {
        super::pgsid::validate_checks(self.evaluate())
    }
}

impl From<&Events> for EventsCheckInput {
    fn from(row: &Events) -> Self {
        Self {
            id: super::pgsid::CheckValue::Value(row.id.clone()),
            default_id: super::pgsid::CheckValue::from(row.default_id.clone()),
        }
    }
}
