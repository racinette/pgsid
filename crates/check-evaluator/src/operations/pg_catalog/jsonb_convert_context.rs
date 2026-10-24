#[derive(Clone, Copy)]
struct JsonbGeometryCoordinate {
    bits: i64,
}

pub fn jsonb_input_from_oid_alias(input: OidValue) -> JsonbInput {
    let text = oid_alias_to_text(input, true);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_operator_alias(input: OidValue) -> JsonbInput {
    let text = oid_alias_to_text(input, false);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_bytea(input: ByteaValue) -> JsonbInput {
    if let ByteaValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let ByteaValue::Null = input {
        return JsonbInput::Null;
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_money_context(input: MoneyValue, c_locale: bool) -> JsonbInput {
    jsonb_input_from_text(money_to_text_context(input,c_locale))
}

pub fn jsonb_input_from_money(input: MoneyValue) -> JsonbInput {
    if let MoneyValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let MoneyValue::Null = input {
        return JsonbInput::Null;
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_interval(input: IntervalValue) -> JsonbInput {
    if let IntervalValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == IntervalValue::Null {
        return JsonbInput::Null;
    };
    if let IntervalValue::Value(value) = input {
        let special = interval_special(value);
        if special < 0 {
            return JsonbInput::Text("-infinity".to_owned());
        };
        if special > 0 {
            return JsonbInput::Text("infinity".to_owned());
        };
    };
    JsonbInput::Unknown
}

fn jsonb_geometry_number(bits: i64) -> TextValue {
    if bits == -9223372036854775808i64 {
        return TextValue::Value("-0".to_owned());
    };
    let input = make_float8_bits(bits);
    let rendered = jsonb_input_from_float8(input);
    if let JsonbInput::Number(text) = rendered {
        return TextValue::Value(text);
    };
    TextValue::Unknown
}

fn jsonb_geometry_values(
    values: Vec<JsonbGeometryCoordinate>,
    opening: &str,
    ending: &str,
) -> TextValue {
    let mut output = opening.to_owned();
    let mut index: usize = 0;
    while index < values.len() {
        let rendered = jsonb_geometry_number(values[index].bits);
        let mut ready = false;
        if let TextValue::Value(text) = rendered {
            ready = true;
            if index > 0 {
                output.push(',');
            };
            output.push_str(text.as_str());
        };
        if ready == false {
            return TextValue::Unknown;
        };
        index += 1;
    }
    output.push_str(ending);
    TextValue::Value(output)
}

fn jsonb_geometry_pair(x: i64, y: i64) -> TextValue {
    let mut values: Vec<JsonbGeometryCoordinate> = Vec::new();
    values.push(JsonbGeometryCoordinate { bits: x });
    values.push(JsonbGeometryCoordinate { bits: y });
    jsonb_geometry_values(values, "(", ")")
}

fn jsonb_geometry_points(points: Vec<PointPayload>, opening: &str, ending: &str) -> TextValue {
    let mut output = opening.to_owned();
    let mut index: usize = 0;
    while index < points.len() {
        let point = points[index];
        let rendered = jsonb_geometry_pair(point.x, point.y);
        let mut ready = false;
        if let TextValue::Value(text) = rendered {
            ready = true;
            if index > 0 {
                output.push(',');
            };
            output.push_str(text.as_str());
        };
        if ready == false {
            return TextValue::Unknown;
        };
        index += 1;
    }
    output.push_str(ending);
    TextValue::Value(output)
}

pub fn jsonb_input_from_point(input: PointValue) -> JsonbInput {
    if let PointValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == PointValue::Null {
        return JsonbInput::Null;
    };
    if let PointValue::Value(value) = input {
        let text = jsonb_geometry_pair(value.x, value.y);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_line(input: LineValue) -> JsonbInput {
    if let LineValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == LineValue::Null {
        return JsonbInput::Null;
    };
    if let LineValue::Value(value) = input {
        let mut values: Vec<JsonbGeometryCoordinate> = Vec::new();
        values.push(JsonbGeometryCoordinate { bits: value.a });
        values.push(JsonbGeometryCoordinate { bits: value.b });
        values.push(JsonbGeometryCoordinate { bits: value.c });
        let text = jsonb_geometry_values(values, "{", "}");
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_lseg(input: LsegValue) -> JsonbInput {
    if let LsegValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == LsegValue::Null {
        return JsonbInput::Null;
    };
    if let LsegValue::Value(value) = input {
        let mut points: Vec<PointPayload> = Vec::new();
        points.push(PointPayload {
            x: value.x1,
            y: value.y1,
            wire_known: value.wire_known,
        });
        points.push(PointPayload {
            x: value.x2,
            y: value.y2,
            wire_known: value.wire_known,
        });
        let text = jsonb_geometry_points(points, "[", "]");
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_box(input: BoxValue) -> JsonbInput {
    if let BoxValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == BoxValue::Null {
        return JsonbInput::Null;
    };
    if let BoxValue::Value(value) = input {
        let mut points: Vec<PointPayload> = Vec::new();
        points.push(PointPayload {
            x: value.high_x,
            y: value.high_y,
            wire_known: value.wire_known,
        });
        points.push(PointPayload {
            x: value.low_x,
            y: value.low_y,
            wire_known: value.wire_known,
        });
        let text = jsonb_geometry_points(points, "", "");
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_circle(input: CircleValue) -> JsonbInput {
    if let CircleValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == CircleValue::Null {
        return JsonbInput::Null;
    };
    if let CircleValue::Value(value) = input {
        let center = jsonb_geometry_pair(value.x, value.y);
        let radius = jsonb_geometry_number(value.radius);
        if let TextValue::Value(point) = center {
            if let TextValue::Value(number) = radius {
                let mut output = "<".to_owned();
                output.push_str(point.as_str());
                output.push(',');
                output.push_str(number.as_str());
                output.push('>');
                return JsonbInput::Text(output);
            };
        };
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_path(input: PathValue) -> JsonbInput {
    if let PathValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let PathValue::Null = input {
        return JsonbInput::Null;
    };
    if let PathValue::Value(value) = input {
        if value.closed {
            let text = jsonb_geometry_points(value.points, "(", ")");
            return jsonb_input_from_text(text);
        };
        let text = jsonb_geometry_points(value.points, "[", "]");
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_polygon(input: PolygonValue) -> JsonbInput {
    if let PolygonValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let PolygonValue::Null = input {
        return JsonbInput::Null;
    };
    if let PolygonValue::Value(value) = input {
        let text = jsonb_geometry_points(value.points, "(", ")");
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_enum(input: EnumValue) -> JsonbInput {
    if let EnumValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == EnumValue::Null {
        return JsonbInput::Null;
    };
    JsonbInput::Unknown
}
