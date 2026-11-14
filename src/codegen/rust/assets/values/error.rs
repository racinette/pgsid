//! The errors of generated queries.

use std::error::Error;
use std::fmt;

/// A generated query's failure: the database's error, which includes a value that fails to read,
/// or a row that no member of one of the query's row groups describes.
#[derive(Debug)]
pub enum QueryError {
    Database(tokio_postgres::Error),
    NoMember { query: &'static str, group: &'static str },
}

impl fmt::Display for QueryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => error.fmt(formatter),
            Self::NoMember { query, group } => write!(formatter, "{query}: the row is no member of {group}"),
        }
    }
}
impl Error for QueryError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            Self::NoMember { .. } => None,
        }
    }
}
impl From<tokio_postgres::Error> for QueryError {
    fn from(error: tokio_postgres::Error) -> Self {
        Self::Database(error)
    }
}
