pub use pgsid_regex_engine::*;

pub mod checkruntime {
    include!("values.rs");
    include!("date.rs");
    include!("timestamp.rs");
    include!("timestamptz.rs");
    include!("logic.rs");
}

pub use checkruntime::*;

pub mod pg_catalog {
    use super::*;

    include!("operations/pg_catalog/boolean.rs");
    include!("operations/pg_catalog/enumeration.rs");
    include!("operations/pg_catalog/date.rs");
    include!("operations/pg_catalog/timestamptz.rs");
    include!("operations/pg_catalog/timestamp.rs");
    include!("operations/pg_catalog/timezone.rs");
    include!("operations/pg_catalog/timezone_named.rs");
    include!("operations/pg_catalog/timezone_recurring.rs");
    include!(concat!(env!("OUT_DIR"), "/timezone-tables.rs"));
    include!("operations/pg_catalog/integer.rs");
    include!("operations/pg_catalog/bigint.rs");
    include!("operations/pg_catalog/text.rs");
    include!("operations/pg_catalog/regex.rs");
}
