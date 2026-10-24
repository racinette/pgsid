#[derive(Clone)]
pub enum ArrayElement {
    Unknown,
    Null,
    Error(SqlError),
    Int2(i32),
    Int4(i32),
    Int8(i64),
    Timestamp(i64),
    Timestamptz(i64),
    Enum(EnumPayload),
    Date(i32),
    Text(String),
    Bool(bool),
    Numeric(String),
    Json(JsonPayload),
    Jsonb(JsonbPayload),
    Network(NetworkAddress),
    Bit(String),
    Bytea(String),
    Macaddr(MacAddress),
    Macaddr8(MacAddress),
    Uuid(Uuid),
    Float4(i32),
    Float8(i64),
    Time(i64),
    Timetz(TimetzPayload),
    Interval(IntervalPayload),
    Point(PointPayload),
    Line(LinePayload),
    Lseg(LsegPayload),
    Box(BoxPayload),
    Path(PathPayload),
    Polygon(PolygonPayload),
    Circle(CirclePayload),
    Money(i64),
    InternalChar(i32),
    Oid(i64),
    Xid(i64),
    Cid(i64),
    Snapshot(SnapshotPayload),
    Xid8(i64),
    PgLsn(i64),
    Tid(i64),
    Jsonpath(JsonpathPayload),
    JsonpathStoredText(String),
    Array(ArrayPayload),
    Float4UnspecifiedNan,
    Float8UnspecifiedNan,
    ByteaUnspecified(i32),
    BoxNonNull,
    Range(RangePayload),
    Multirange(MultirangePayload),
    Composite(CompositePayload),
    Xml(String),
    XmlRenderedText(String),
    XmlNonNull(XmlKnowledge),
    TextNonNull,
    Aclitem(AclitemPayload),
    Tsvector(TsvectorPayload),
}

pub fn array_element_family(input: ArrayElement) -> i32 {
    if let ArrayElement::Tsvector(_) = input { return 47; };
    if let ArrayElement::Aclitem(_) = input { return 46; };
    if let ArrayElement::TextNonNull = input { return 8; };
    if let ArrayElement::XmlNonNull(_) = input { return 45; };
    if let ArrayElement::Xml(_) = input { return 45; };
    if let ArrayElement::XmlRenderedText(_) = input { return 45; };
    if let ArrayElement::Composite(_) = input { return 44; };
    if let ArrayElement::Multirange(_) = input {
        return 43;
    };
    if let ArrayElement::Range(_) = input {
        return 42;
    };
    if let ArrayElement::Array(_) = input {
        return 41;
    };
    if let ArrayElement::Int2(_) = input {
        return 1;
    };
    if let ArrayElement::Int4(_) = input {
        return 2;
    };
    if let ArrayElement::Int8(_) = input {
        return 3;
    };
    if let ArrayElement::Timestamp(_) = input {
        return 4;
    };
    if let ArrayElement::Timestamptz(_) = input {
        return 5;
    };
    if let ArrayElement::Enum(_) = input {
        return 6;
    };
    if let ArrayElement::Date(_) = input {
        return 7;
    };
    if let ArrayElement::Text(_) = input {
        return 8;
    };
    if let ArrayElement::Bool(_) = input {
        return 9;
    };
    if let ArrayElement::Numeric(_) = input {
        return 10;
    };
    if let ArrayElement::Json(_) = input {
        return 11;
    };
    if let ArrayElement::Jsonb(_) = input {
        return 12;
    };
    if let ArrayElement::Network(_) = input {
        return 13;
    };
    if let ArrayElement::Bit(_) = input {
        return 14;
    };
    if let ArrayElement::Bytea(_) = input {
        return 15;
    };
    if let ArrayElement::Macaddr(_) = input {
        return 16;
    };
    if let ArrayElement::Macaddr8(_) = input {
        return 17;
    };
    if let ArrayElement::Uuid(_) = input {
        return 18;
    };
    if let ArrayElement::Float4(_) = input {
        return 19;
    };
    if let ArrayElement::Float8(_) = input {
        return 20;
    };
    if let ArrayElement::Time(_) = input {
        return 21;
    };
    if let ArrayElement::Timetz(_) = input {
        return 22;
    };
    if let ArrayElement::Interval(_) = input {
        return 23;
    };
    if let ArrayElement::Point(_) = input {
        return 24;
    };
    if let ArrayElement::Line(_) = input {
        return 25;
    };
    if let ArrayElement::Lseg(_) = input {
        return 26;
    };
    if let ArrayElement::Box(_) = input {
        return 27;
    };
    if let ArrayElement::Path(_) = input {
        return 28;
    };
    if let ArrayElement::Polygon(_) = input {
        return 29;
    };
    if let ArrayElement::Circle(_) = input {
        return 30;
    };
    if let ArrayElement::Money(_) = input {
        return 31;
    };
    if let ArrayElement::InternalChar(_) = input {
        return 32;
    };
    if let ArrayElement::Oid(_) = input {
        return 33;
    };
    if let ArrayElement::Xid(_) = input {
        return 34;
    };
    if let ArrayElement::Cid(_) = input {
        return 35;
    };
    if let ArrayElement::Snapshot(_) = input {
        return 36;
    };
    if let ArrayElement::Xid8(_) = input {
        return 37;
    };
    if let ArrayElement::PgLsn(_) = input {
        return 38;
    };
    if let ArrayElement::Tid(_) = input {
        return 39;
    };
    if let ArrayElement::JsonpathStoredText(_) = input {
        return 40;
    };
    if let ArrayElement::Jsonpath(_) = input {
        return 40;
    };
    if let ArrayElement::Float4UnspecifiedNan = input {
        return 19;
    };
    if let ArrayElement::Float8UnspecifiedNan = input {
        return 20;
    };
    if let ArrayElement::ByteaUnspecified(_) = input {
        return 15;
    };
    if let ArrayElement::BoxNonNull = input {
        return 27;
    };
    0
}

pub fn array_element_from_array(input: ArrayValue) -> ArrayElement {
    if let ArrayValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayElement::Null;
    };
    if let ArrayValue::Value(value) = input {
        return ArrayElement::Array(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_array(input: ArrayElement) -> ArrayValue {
    if let ArrayElement::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return ArrayValue::Null;
    };
    if let ArrayElement::Array(value) = input {
        return ArrayValue::Value(value);
    };
    ArrayValue::Unknown
}

pub fn array_element_from_int2(input: Int2Value) -> ArrayElement {
    if let Int2Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Int2Value::Null = input {
        return ArrayElement::Null;
    };
    if let Int2Value::Value(value) = input {
        return ArrayElement::Int2(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_int2(input: ArrayElement) -> Int2Value {
    if let ArrayElement::Error(error) = input {
        return Int2Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Int2Value::Null;
    };
    if let ArrayElement::Int2(value) = input {
        return Int2Value::Value(value);
    };
    Int2Value::Unknown
}

pub fn array_element_from_int4(input: Int4Value) -> ArrayElement {
    if let Int4Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Int4Value::Null = input {
        return ArrayElement::Null;
    };
    if let Int4Value::Value(value) = input {
        return ArrayElement::Int4(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_int4(input: ArrayElement) -> Int4Value {
    if let ArrayElement::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Int4Value::Null;
    };
    if let ArrayElement::Int4(value) = input {
        return Int4Value::Value(value);
    };
    Int4Value::Unknown
}

pub fn array_element_from_int8(input: Int8Value) -> ArrayElement {
    if let Int8Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Int8Value::Null = input {
        return ArrayElement::Null;
    };
    if let Int8Value::Value(value) = input {
        return ArrayElement::Int8(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_int8(input: ArrayElement) -> Int8Value {
    if let ArrayElement::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Int8Value::Null;
    };
    if let ArrayElement::Int8(value) = input {
        return Int8Value::Value(value);
    };
    Int8Value::Unknown
}

pub fn array_element_from_timestamp(input: TimestampValue) -> ArrayElement {
    if let TimestampValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let TimestampValue::Null = input {
        return ArrayElement::Null;
    };
    if let TimestampValue::Value(value) = input {
        return ArrayElement::Timestamp(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_timestamp(input: ArrayElement) -> TimestampValue {
    if let ArrayElement::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TimestampValue::Null;
    };
    if let ArrayElement::Timestamp(value) = input {
        return TimestampValue::Value(value);
    };
    TimestampValue::Unknown
}

pub fn array_element_from_timestamptz(input: TimestamptzValue) -> ArrayElement {
    if let TimestamptzValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let TimestamptzValue::Null = input {
        return ArrayElement::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        return ArrayElement::Timestamptz(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_timestamptz(input: ArrayElement) -> TimestamptzValue {
    if let ArrayElement::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TimestamptzValue::Null;
    };
    if let ArrayElement::Timestamptz(value) = input {
        return TimestamptzValue::Value(value);
    };
    TimestamptzValue::Unknown
}

pub fn array_element_from_enum(input: EnumValue) -> ArrayElement {
    if let EnumValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let EnumValue::Null = input {
        return ArrayElement::Null;
    };
    if let EnumValue::Value(value) = input {
        return ArrayElement::Enum(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_enum(input: ArrayElement) -> EnumValue {
    if let ArrayElement::Error(error) = input {
        return EnumValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return EnumValue::Null;
    };
    if let ArrayElement::Enum(value) = input {
        return EnumValue::Value(value);
    };
    EnumValue::Unknown
}

pub fn array_element_from_date(input: DateValue) -> ArrayElement {
    if let DateValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let DateValue::Null = input {
        return ArrayElement::Null;
    };
    if let DateValue::Value(value) = input {
        return ArrayElement::Date(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_date(input: ArrayElement) -> DateValue {
    if let ArrayElement::Error(error) = input {
        return DateValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return DateValue::Null;
    };
    if let ArrayElement::Date(value) = input {
        return DateValue::Value(value);
    };
    DateValue::Unknown
}

pub fn array_element_from_text(input: TextValue) -> ArrayElement {
    if input == TextValue::NonNull { return ArrayElement::TextNonNull; };
    if let TextValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let TextValue::Null = input {
        return ArrayElement::Null;
    };
    if let TextValue::Value(value) = input {
        return ArrayElement::Text(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_text(input: ArrayElement) -> TextValue {
    if let ArrayElement::TextNonNull = input { return TextValue::NonNull; };
    if let ArrayElement::Error(error) = input {
        return TextValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TextValue::Null;
    };
    if let ArrayElement::Text(value) = input {
        return TextValue::Value(value);
    };
    TextValue::Unknown
}

pub fn array_element_from_bool(input: BoolValue) -> ArrayElement {
    if let BoolValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let BoolValue::Null = input {
        return ArrayElement::Null;
    };
    if let BoolValue::Value(value) = input {
        return ArrayElement::Bool(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_bool(input: ArrayElement) -> BoolValue {
    if let ArrayElement::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return BoolValue::Null;
    };
    if let ArrayElement::Bool(value) = input {
        return BoolValue::Value(value);
    };
    BoolValue::Unknown
}

pub fn array_element_from_numeric(input: NumericValue) -> ArrayElement {
    if let NumericValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let NumericValue::Null = input {
        return ArrayElement::Null;
    };
    if let NumericValue::Value(value) = input {
        return ArrayElement::Numeric(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_numeric(input: ArrayElement) -> NumericValue {
    if let ArrayElement::Error(error) = input {
        return NumericValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return NumericValue::Null;
    };
    if let ArrayElement::Numeric(value) = input {
        return NumericValue::Value(value);
    };
    NumericValue::Unknown
}

pub fn array_element_from_json(input: JsonValue) -> ArrayElement {
    if let JsonValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let JsonValue::Null = input {
        return ArrayElement::Null;
    };
    if let JsonValue::Value(value) = input {
        return ArrayElement::Json(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_json(input: ArrayElement) -> JsonValue {
    if let ArrayElement::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return JsonValue::Null;
    };
    if let ArrayElement::Json(value) = input {
        return JsonValue::Value(value);
    };
    JsonValue::Unknown
}

pub fn array_element_from_jsonb(input: JsonbValue) -> ArrayElement {
    if let JsonbValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let JsonbValue::Null = input {
        return ArrayElement::Null;
    };
    if let JsonbValue::Value(value) = input {
        return ArrayElement::Jsonb(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_jsonb(input: ArrayElement) -> JsonbValue {
    if let ArrayElement::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return JsonbValue::Null;
    };
    if let ArrayElement::Jsonb(value) = input {
        return JsonbValue::Value(value);
    };
    JsonbValue::Unknown
}

pub fn array_element_from_network(input: NetworkValue) -> ArrayElement {
    if let NetworkValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let NetworkValue::Null = input {
        return ArrayElement::Null;
    };
    if let NetworkValue::Value(value) = input {
        return ArrayElement::Network(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_network(input: ArrayElement) -> NetworkValue {
    if let ArrayElement::Error(error) = input {
        return NetworkValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return NetworkValue::Null;
    };
    if let ArrayElement::Network(value) = input {
        return NetworkValue::Value(value);
    };
    NetworkValue::Unknown
}

pub fn array_element_from_bit(input: BitValue) -> ArrayElement {
    if let BitValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let BitValue::Null = input {
        return ArrayElement::Null;
    };
    if let BitValue::Value(value) = input {
        return ArrayElement::Bit(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_bit(input: ArrayElement) -> BitValue {
    if let ArrayElement::Error(error) = input {
        return BitValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return BitValue::Null;
    };
    if let ArrayElement::Bit(value) = input {
        return BitValue::Value(value);
    };
    BitValue::Unknown
}

pub fn array_element_from_bytea(input: ByteaValue) -> ArrayElement {
    if let ByteaValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let ByteaValue::Null = input {
        return ArrayElement::Null;
    };
    if let ByteaValue::Value(value) = input {
        return ArrayElement::Bytea(value);
    };
    if let ByteaValue::Unspecified(length) = input {
        return ArrayElement::ByteaUnspecified(length);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_bytea(input: ArrayElement) -> ByteaValue {
    if let ArrayElement::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return ByteaValue::Null;
    };
    if let ArrayElement::Bytea(value) = input {
        return ByteaValue::Value(value);
    };
    if let ArrayElement::ByteaUnspecified(length) = input {
        return ByteaValue::Unspecified(length);
    };
    ByteaValue::Unknown
}

pub fn array_element_from_macaddr(input: MacaddrValue) -> ArrayElement {
    if let MacaddrValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let MacaddrValue::Null = input {
        return ArrayElement::Null;
    };
    if let MacaddrValue::Value(value) = input {
        return ArrayElement::Macaddr(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_macaddr(input: ArrayElement) -> MacaddrValue {
    if let ArrayElement::Error(error) = input {
        return MacaddrValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return MacaddrValue::Null;
    };
    if let ArrayElement::Macaddr(value) = input {
        return MacaddrValue::Value(value);
    };
    MacaddrValue::Unknown
}

pub fn array_element_from_macaddr8(input: Macaddr8Value) -> ArrayElement {
    if let Macaddr8Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Macaddr8Value::Null = input {
        return ArrayElement::Null;
    };
    if let Macaddr8Value::Value(value) = input {
        return ArrayElement::Macaddr8(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_macaddr8(input: ArrayElement) -> Macaddr8Value {
    if let ArrayElement::Error(error) = input {
        return Macaddr8Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Macaddr8Value::Null;
    };
    if let ArrayElement::Macaddr8(value) = input {
        return Macaddr8Value::Value(value);
    };
    Macaddr8Value::Unknown
}

pub fn array_element_from_uuid(input: UuidValue) -> ArrayElement {
    if let UuidValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let UuidValue::Null = input {
        return ArrayElement::Null;
    };
    if let UuidValue::Value(value) = input {
        return ArrayElement::Uuid(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_uuid(input: ArrayElement) -> UuidValue {
    if let ArrayElement::Error(error) = input {
        return UuidValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return UuidValue::Null;
    };
    if let ArrayElement::Uuid(value) = input {
        return UuidValue::Value(value);
    };
    UuidValue::Unknown
}

pub fn array_element_from_float4(input: Float4Value) -> ArrayElement {
    if let Float4Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Float4Value::Null = input {
        return ArrayElement::Null;
    };
    if let Float4Value::Value(value) = input {
        return ArrayElement::Float4(value);
    };
    if let Float4Value::UnspecifiedNan = input {
        return ArrayElement::Float4UnspecifiedNan;
    };
    ArrayElement::Unknown
}

pub fn array_element_to_float4(input: ArrayElement) -> Float4Value {
    if let ArrayElement::Error(error) = input {
        return Float4Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Float4Value::Null;
    };
    if let ArrayElement::Float4(value) = input {
        return Float4Value::Value(value);
    };
    if let ArrayElement::Float4UnspecifiedNan = input {
        return Float4Value::UnspecifiedNan;
    };
    Float4Value::Unknown
}

pub fn array_element_from_float8(input: Float8Value) -> ArrayElement {
    if let Float8Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Float8Value::Null = input {
        return ArrayElement::Null;
    };
    if let Float8Value::Value(value) = input {
        return ArrayElement::Float8(value);
    };
    if let Float8Value::UnspecifiedNan = input {
        return ArrayElement::Float8UnspecifiedNan;
    };
    ArrayElement::Unknown
}

pub fn array_element_to_float8(input: ArrayElement) -> Float8Value {
    if let ArrayElement::Error(error) = input {
        return Float8Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Float8Value::Null;
    };
    if let ArrayElement::Float8(value) = input {
        return Float8Value::Value(value);
    };
    if let ArrayElement::Float8UnspecifiedNan = input {
        return Float8Value::UnspecifiedNan;
    };
    Float8Value::Unknown
}

pub fn array_element_from_time(input: TimeValue) -> ArrayElement {
    if let TimeValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let TimeValue::Null = input {
        return ArrayElement::Null;
    };
    if let TimeValue::Value(value) = input {
        return ArrayElement::Time(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_time(input: ArrayElement) -> TimeValue {
    if let ArrayElement::Error(error) = input {
        return TimeValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TimeValue::Null;
    };
    if let ArrayElement::Time(value) = input {
        return TimeValue::Value(value);
    };
    TimeValue::Unknown
}

pub fn array_element_from_timetz(input: TimetzValue) -> ArrayElement {
    if let TimetzValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let TimetzValue::Null = input {
        return ArrayElement::Null;
    };
    if let TimetzValue::Value(value) = input {
        return ArrayElement::Timetz(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_timetz(input: ArrayElement) -> TimetzValue {
    if let ArrayElement::Error(error) = input {
        return TimetzValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TimetzValue::Null;
    };
    if let ArrayElement::Timetz(value) = input {
        return TimetzValue::Value(value);
    };
    TimetzValue::Unknown
}

pub fn array_element_from_interval(input: IntervalValue) -> ArrayElement {
    if let IntervalValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let IntervalValue::Null = input {
        return ArrayElement::Null;
    };
    if let IntervalValue::Value(value) = input {
        return ArrayElement::Interval(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_interval(input: ArrayElement) -> IntervalValue {
    if let ArrayElement::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return IntervalValue::Null;
    };
    if let ArrayElement::Interval(value) = input {
        return IntervalValue::Value(value);
    };
    IntervalValue::Unknown
}

pub fn array_element_from_point(input: PointValue) -> ArrayElement {
    if let PointValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let PointValue::Null = input {
        return ArrayElement::Null;
    };
    if let PointValue::Value(value) = input {
        return ArrayElement::Point(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_point(input: ArrayElement) -> PointValue {
    if let ArrayElement::Error(error) = input {
        return PointValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return PointValue::Null;
    };
    if let ArrayElement::Point(value) = input {
        return PointValue::Value(value);
    };
    PointValue::Unknown
}

pub fn array_element_from_line(input: LineValue) -> ArrayElement {
    if let LineValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let LineValue::Null = input {
        return ArrayElement::Null;
    };
    if let LineValue::Value(value) = input {
        return ArrayElement::Line(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_line(input: ArrayElement) -> LineValue {
    if let ArrayElement::Error(error) = input {
        return LineValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return LineValue::Null;
    };
    if let ArrayElement::Line(value) = input {
        return LineValue::Value(value);
    };
    LineValue::Unknown
}

pub fn array_element_from_lseg(input: LsegValue) -> ArrayElement {
    if let LsegValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let LsegValue::Null = input {
        return ArrayElement::Null;
    };
    if let LsegValue::Value(value) = input {
        return ArrayElement::Lseg(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_lseg(input: ArrayElement) -> LsegValue {
    if let ArrayElement::Error(error) = input {
        return LsegValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return LsegValue::Null;
    };
    if let ArrayElement::Lseg(value) = input {
        return LsegValue::Value(value);
    };
    LsegValue::Unknown
}

pub fn array_element_from_box(input: BoxValue) -> ArrayElement {
    if let BoxValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let BoxValue::Null = input {
        return ArrayElement::Null;
    };
    if let BoxValue::Value(value) = input {
        return ArrayElement::Box(value);
    };
    if let BoxValue::NonNull = input {
        return ArrayElement::BoxNonNull;
    };
    ArrayElement::Unknown
}

pub fn array_element_to_box(input: ArrayElement) -> BoxValue {
    if let ArrayElement::Error(error) = input {
        return BoxValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return BoxValue::Null;
    };
    if let ArrayElement::Box(value) = input {
        return BoxValue::Value(value);
    };
    if let ArrayElement::BoxNonNull = input {
        return BoxValue::NonNull;
    };
    BoxValue::Unknown
}

pub fn array_element_from_path(input: PathValue) -> ArrayElement {
    if let PathValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let PathValue::Null = input {
        return ArrayElement::Null;
    };
    if let PathValue::Value(value) = input {
        return ArrayElement::Path(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_path(input: ArrayElement) -> PathValue {
    if let ArrayElement::Error(error) = input {
        return PathValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return PathValue::Null;
    };
    if let ArrayElement::Path(value) = input {
        return PathValue::Value(value);
    };
    PathValue::Unknown
}

pub fn array_element_from_polygon(input: PolygonValue) -> ArrayElement {
    if let PolygonValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let PolygonValue::Null = input {
        return ArrayElement::Null;
    };
    if let PolygonValue::Value(value) = input {
        return ArrayElement::Polygon(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_polygon(input: ArrayElement) -> PolygonValue {
    if let ArrayElement::Error(error) = input {
        return PolygonValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return PolygonValue::Null;
    };
    if let ArrayElement::Polygon(value) = input {
        return PolygonValue::Value(value);
    };
    PolygonValue::Unknown
}

pub fn array_element_from_circle(input: CircleValue) -> ArrayElement {
    if let CircleValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let CircleValue::Null = input {
        return ArrayElement::Null;
    };
    if let CircleValue::Value(value) = input {
        return ArrayElement::Circle(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_circle(input: ArrayElement) -> CircleValue {
    if let ArrayElement::Error(error) = input {
        return CircleValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return CircleValue::Null;
    };
    if let ArrayElement::Circle(value) = input {
        return CircleValue::Value(value);
    };
    CircleValue::Unknown
}

pub fn array_element_from_money(input: MoneyValue) -> ArrayElement {
    if let MoneyValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let MoneyValue::Null = input {
        return ArrayElement::Null;
    };
    if let MoneyValue::Value(value) = input {
        return ArrayElement::Money(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_money(input: ArrayElement) -> MoneyValue {
    if let ArrayElement::Error(error) = input {
        return MoneyValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return MoneyValue::Null;
    };
    if let ArrayElement::Money(value) = input {
        return MoneyValue::Value(value);
    };
    MoneyValue::Unknown
}

pub fn array_element_from_internal_char(input: InternalCharValue) -> ArrayElement {
    if let InternalCharValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let InternalCharValue::Null = input {
        return ArrayElement::Null;
    };
    if let InternalCharValue::Value(value) = input {
        return ArrayElement::InternalChar(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_internal_char(input: ArrayElement) -> InternalCharValue {
    if let ArrayElement::Error(error) = input {
        return InternalCharValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return InternalCharValue::Null;
    };
    if let ArrayElement::InternalChar(value) = input {
        return InternalCharValue::Value(value);
    };
    InternalCharValue::Unknown
}

pub fn array_element_from_oid(input: OidValue) -> ArrayElement {
    if let OidValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let OidValue::Null = input {
        return ArrayElement::Null;
    };
    if let OidValue::Value(value) = input {
        return ArrayElement::Oid(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_oid(input: ArrayElement) -> OidValue {
    if let ArrayElement::Error(error) = input {
        return OidValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return OidValue::Null;
    };
    if let ArrayElement::Oid(value) = input {
        return OidValue::Value(value);
    };
    OidValue::Unknown
}

pub fn array_element_from_xid(input: XidValue) -> ArrayElement {
    if let XidValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let XidValue::Null = input {
        return ArrayElement::Null;
    };
    if let XidValue::Value(value) = input {
        return ArrayElement::Xid(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_xid(input: ArrayElement) -> XidValue {
    if let ArrayElement::Error(error) = input {
        return XidValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return XidValue::Null;
    };
    if let ArrayElement::Xid(value) = input {
        return XidValue::Value(value);
    };
    XidValue::Unknown
}

pub fn array_element_from_cid(input: CidValue) -> ArrayElement {
    if let CidValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let CidValue::Null = input {
        return ArrayElement::Null;
    };
    if let CidValue::Value(value) = input {
        return ArrayElement::Cid(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_cid(input: ArrayElement) -> CidValue {
    if let ArrayElement::Error(error) = input {
        return CidValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return CidValue::Null;
    };
    if let ArrayElement::Cid(value) = input {
        return CidValue::Value(value);
    };
    CidValue::Unknown
}

pub fn array_element_from_snapshot(input: SnapshotValue) -> ArrayElement {
    if let SnapshotValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let SnapshotValue::Null = input {
        return ArrayElement::Null;
    };
    if let SnapshotValue::Value(value) = input {
        return ArrayElement::Snapshot(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_snapshot(input: ArrayElement) -> SnapshotValue {
    if let ArrayElement::Error(error) = input {
        return SnapshotValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return SnapshotValue::Null;
    };
    if let ArrayElement::Snapshot(value) = input {
        return SnapshotValue::Value(value);
    };
    SnapshotValue::Unknown
}

pub fn array_element_from_xid8(input: Xid8Value) -> ArrayElement {
    if let Xid8Value::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Xid8Value::Null = input {
        return ArrayElement::Null;
    };
    if let Xid8Value::Value(value) = input {
        return ArrayElement::Xid8(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_xid8(input: ArrayElement) -> Xid8Value {
    if let ArrayElement::Error(error) = input {
        return Xid8Value::Error(error);
    };
    if let ArrayElement::Null = input {
        return Xid8Value::Null;
    };
    if let ArrayElement::Xid8(value) = input {
        return Xid8Value::Value(value);
    };
    Xid8Value::Unknown
}

pub fn array_element_from_pg_lsn(input: PgLsnValue) -> ArrayElement {
    if let PgLsnValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let PgLsnValue::Null = input {
        return ArrayElement::Null;
    };
    if let PgLsnValue::Value(value) = input {
        return ArrayElement::PgLsn(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_pg_lsn(input: ArrayElement) -> PgLsnValue {
    if let ArrayElement::Error(error) = input {
        return PgLsnValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return PgLsnValue::Null;
    };
    if let ArrayElement::PgLsn(value) = input {
        return PgLsnValue::Value(value);
    };
    PgLsnValue::Unknown
}

pub fn array_element_from_tid(input: TidValue) -> ArrayElement {
    if let TidValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let TidValue::Null = input {
        return ArrayElement::Null;
    };
    if let TidValue::Value(value) = input {
        return ArrayElement::Tid(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_tid(input: ArrayElement) -> TidValue {
    if let ArrayElement::Error(error) = input {
        return TidValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TidValue::Null;
    };
    if let ArrayElement::Tid(value) = input {
        return TidValue::Value(value);
    };
    TidValue::Unknown
}

pub fn array_element_from_jsonpath(input: JsonpathValue) -> ArrayElement {
    if let JsonpathValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let JsonpathValue::Null = input {
        return ArrayElement::Null;
    };
    if let JsonpathValue::StoredText(value) = input {
        return ArrayElement::JsonpathStoredText(value);
    };
    if let JsonpathValue::Value(value) = input {
        return ArrayElement::Jsonpath(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_jsonpath(input: ArrayElement) -> JsonpathValue {
    if let ArrayElement::Error(error) = input {
        return JsonpathValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return JsonpathValue::Null;
    };
    if let ArrayElement::JsonpathStoredText(value) = input {
        return JsonpathValue::StoredText(value);
    };
    if let ArrayElement::Jsonpath(value) = input {
        return JsonpathValue::Value(value);
    };
    JsonpathValue::Unknown
}

pub fn array_element_from_range(input: RangeValue) -> ArrayElement {
    if let RangeValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let RangeValue::Null = input {
        return ArrayElement::Null;
    };
    if let RangeValue::Value(value) = input {
        return ArrayElement::Range(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_range(input: ArrayElement) -> RangeValue {
    if let ArrayElement::Error(error) = input {
        return RangeValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return RangeValue::Null;
    };
    if let ArrayElement::Range(value) = input {
        return make_coerced_range_value(value);
    };
    RangeValue::Unknown
}

pub fn array_element_from_multirange(input: MultirangeValue) -> ArrayElement {
    if let MultirangeValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let MultirangeValue::Null = input {
        return ArrayElement::Null;
    };
    if let MultirangeValue::Value(value) = input {
        return ArrayElement::Multirange(value);
    };
    ArrayElement::Unknown
}

pub fn array_element_to_multirange(input: ArrayElement) -> MultirangeValue {
    if let ArrayElement::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return MultirangeValue::Null;
    };
    if let ArrayElement::Multirange(value) = input {
        return make_coerced_multirange_value(value);
    };
    MultirangeValue::Unknown
}


pub fn array_element_from_xml(input: XmlValue) -> ArrayElement {
    if let XmlValue::NonNull(knowledge) = input {
        let checked = make_xml_knowledge(knowledge.document,knowledge.content);
        if let XmlValue::NonNull(actual) = checked { return ArrayElement::XmlNonNull(actual); };
        return ArrayElement::Unknown;
    };
    if let XmlValue::Error(error) = input { return ArrayElement::Error(error); };
    if let XmlValue::Null = input { return ArrayElement::Null; };
    if let XmlValue::Value(value) = input { return ArrayElement::Xml(value); };
    if let XmlValue::RenderedText(value) = input { return ArrayElement::XmlRenderedText(value); };
    ArrayElement::Unknown
}

pub fn array_element_to_xml(input: ArrayElement) -> XmlValue {
    if let ArrayElement::XmlNonNull(knowledge) = input { return make_xml_knowledge(knowledge.document,knowledge.content); };
    if let ArrayElement::Error(error) = input { return XmlValue::Error(error); };
    if let ArrayElement::Null = input { return XmlValue::Null; };
    if let ArrayElement::Xml(value) = input { return XmlValue::Value(value); };
    if let ArrayElement::XmlRenderedText(value) = input { return XmlValue::RenderedText(value); };
    XmlValue::Unknown
}

pub fn array_element_from_aclitem(input: AclitemValue) -> ArrayElement {
    if let AclitemValue::Error(error) = input { return ArrayElement::Error(error); };
    if input == AclitemValue::Null { return ArrayElement::Null; };
    if let AclitemValue::Value(value) = input { return ArrayElement::Aclitem(value); };
    ArrayElement::Unknown
}
pub fn array_element_to_aclitem(input: ArrayElement) -> AclitemValue {
    if let ArrayElement::Error(error) = input { return AclitemValue::Error(error); };
    if let ArrayElement::Null = input { return AclitemValue::Null; };
    if let ArrayElement::Aclitem(value) = input { return AclitemValue::Value(value); };
    AclitemValue::Unknown
}

pub fn array_element_from_tsvector(input: TsvectorValue) -> ArrayElement {
    if let TsvectorValue::Error(error) = input { return ArrayElement::Error(error); };
    if let TsvectorValue::Null = input { return ArrayElement::Null; };
    if let TsvectorValue::Value(value) = input { return ArrayElement::Tsvector(value); };
    ArrayElement::Unknown
}
pub fn array_element_to_tsvector(input: ArrayElement) -> TsvectorValue {
    if let ArrayElement::Error(error) = input { return TsvectorValue::Error(error); };
    if let ArrayElement::Null = input { return TsvectorValue::Null; };
    if let ArrayElement::Tsvector(value) = input { return TsvectorValue::Value(value); };
    TsvectorValue::Unknown
}
