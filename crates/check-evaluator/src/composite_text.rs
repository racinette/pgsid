#[derive(Clone)]
pub struct CompositeTextPayload {
    pub characters: Vec<char>,
    pub position: usize,
    pub expected: usize,
    pub fields: Vec<ArrayElement>,
    pub current: TextValue,
}

#[derive(Clone)]
pub enum CompositeTextPlan {
    Unknown,
    Null,
    Error(SqlError),
    Value(CompositeTextPayload),
}
