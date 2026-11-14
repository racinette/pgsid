//! CHECK constraints evaluated in Rust, as the server would evaluate them on a row it is sent.

use std::error::Error;
use std::fmt;

/// A value a CHECK evaluation reads: unknown, which leaves undecided each check that reaches it,
/// SQL NULL, or a value.
#[derive(Debug, Clone, PartialEq, Default)]
pub enum CheckValue<T> {
    #[default]
    Unknown,
    Null,
    Value(T),
}

impl<T> CheckValue<T> {
    pub fn as_ref(&self) -> CheckValue<&T> {
        match self {
            Self::Unknown => CheckValue::Unknown,
            Self::Null => CheckValue::Null,
            Self::Value(value) => CheckValue::Value(value),
        }
    }
    pub fn map<U>(self, map: impl FnOnce(T) -> U) -> CheckValue<U> {
        match self {
            Self::Unknown => CheckValue::Unknown,
            Self::Null => CheckValue::Null,
            Self::Value(value) => CheckValue::Value(map(value)),
        }
    }
}

/// A value that may be SQL NULL, as a row holds it.
impl<T> From<Option<T>> for CheckValue<T> {
    fn from(value: Option<T>) -> Self {
        value.map_or(Self::Null, Self::Value)
    }
}

/// What a CHECK constraint evaluates to. A row passes a check that is true or NULL; an error is
/// the one the server raises evaluating it; an undecided check depends on what the evaluation
/// does not know, such as an unknown value or the server's settings.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CheckResult {
    True,
    False,
    Null,
    Error { state: String, message: String },
    Undecided { reason: String },
}

/// One CHECK constraint's result, named by the table or domain that owns it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CheckEvaluation {
    pub owner: &'static str,
    pub constraint: &'static str,
    pub result: CheckResult,
}

/// The error the server would raise for a row: a check that is false, or one whose evaluation
/// fails.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CheckError {
    Violation { owner: &'static str, constraint: &'static str },
    Evaluation { owner: &'static str, constraint: &'static str, state: String, message: String },
}

impl CheckError {
    pub fn sqlstate(&self) -> &str {
        match self {
            Self::Violation { .. } => "23514",
            Self::Evaluation { state, .. } => state,
        }
    }
}

impl fmt::Display for CheckError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Violation { owner, constraint } => {
                write!(formatter, "new row for {owner} violates check constraint \"{constraint}\"")
            }
            Self::Evaluation { constraint, state, message, .. } => {
                write!(formatter, "check constraint \"{constraint}\" fails to evaluate: {message} (SQLSTATE {state})")
            }
        }
    }
}
impl Error for CheckError {}

/// The first check a row fails, in order; undecided checks pass, since the server decides them.
pub fn validate_checks(evaluations: impl IntoIterator<Item = CheckEvaluation>) -> Result<(), CheckError> {
    for evaluation in evaluations {
        match evaluation.result {
            CheckResult::False => {
                return Err(CheckError::Violation { owner: evaluation.owner, constraint: evaluation.constraint })
            }
            CheckResult::Error { state, message } => {
                return Err(CheckError::Evaluation { owner: evaluation.owner, constraint: evaluation.constraint, state, message })
            }
            _ => {}
        }
    }
    Ok(())
}
