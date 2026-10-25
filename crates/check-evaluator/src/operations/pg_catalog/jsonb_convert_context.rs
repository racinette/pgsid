pub fn jsonb_input_from_tsquery(input: TsqueryValue) -> JsonbInput {
    jsonb_input_from_text(tsquery_to_text(input))
}

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

pub fn jsonb_input_from_tsvector(input: TsvectorValue) -> JsonbInput {
    jsonb_input_from_text(tsvector_to_text(input))
}

pub fn jsonb_input_from_aclitem(input: AclitemValue) -> JsonbInput {
    jsonb_input_from_text(aclitem_to_text(input))
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

fn jsonb_float_output_input(input: TextValue) -> JsonbInput {
    if let TextValue::Error(error) = input { return JsonbInput::Error(error); };
    if let TextValue::Null = input { return JsonbInput::Null; };
    if let TextValue::Value(text) = input { return JsonbInput::Number(text); };
    JsonbInput::Unknown
}

fn jsonb_float_invariant(bits: i64, single: bool) -> JsonbInput {
    let mut extra: i32 = -15;
    let mut previous = String::new();
    while extra <= 3 {
        let mut rendered = TextValue::Unknown;
        if single { rendered = float4_output_context(make_float4_bits(bits as i32), extra, true); }
        else { rendered = float8_output_context(make_float8_bits(bits), extra, true); };
        let normalized = jsonb_text_context(jsonb_from_text(rendered), true);
        let mut ready = false;
        if let TextValue::Value(text) = normalized {
            ready = true;
            if extra > -15 && previous != text { return JsonbInput::Unknown; };
            previous = text;
        };
        if ready == false { return JsonbInput::Unknown; };
        extra = extra + 1;
    }
    JsonbInput::Number(previous)
}

pub fn jsonb_input_from_float4_context(input: Float4Value, extra: i32, known: bool, textual: bool) -> JsonbInput {
    let rendered = float4_output_context(input, extra, known);
    if known == false && textual == false {
        if let TextValue::Unknown = rendered {
            if let Float4Value::Value(bits) = input { return jsonb_float_invariant(bits as i64, true); };
        };
    };
    jsonb_float_output_input(rendered)
}

pub fn jsonb_input_from_float8_context(input: Float8Value, extra: i32, known: bool, textual: bool) -> JsonbInput {
    let rendered = float8_output_context(input, extra, known);
    if known == false && textual == false {
        if let TextValue::Unknown = rendered {
            if let Float8Value::Value(bits) = input { return jsonb_float_invariant(bits, false); };
        };
    };
    jsonb_float_output_input(rendered)
}

fn jsonb_geometry_number(bits: i64, extra: i32, known: bool) -> TextValue {
    float8_output_context(make_float8_bits(bits), extra, known)
}

fn jsonb_geometry_values(
    values: Vec<JsonbGeometryCoordinate>,
    opening: &str,
    ending: &str,
    extra: i32,
    known: bool,
) -> TextValue {
    let mut output = opening.to_owned();
    let mut index: usize = 0;
    while index < values.len() {
        let rendered = jsonb_geometry_number(values[index].bits, extra, known);
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

fn jsonb_geometry_pair(x: i64, y: i64, extra: i32, known: bool) -> TextValue {
    let mut values: Vec<JsonbGeometryCoordinate> = Vec::new();
    values.push(JsonbGeometryCoordinate { bits: x });
    values.push(JsonbGeometryCoordinate { bits: y });
    jsonb_geometry_values(values, "(", ")", extra, known)
}

fn jsonb_geometry_points(points: Vec<PointPayload>, opening: &str, ending: &str, extra: i32, known: bool) -> TextValue {
    let mut output = opening.to_owned();
    let mut index: usize = 0;
    while index < points.len() {
        let point = points[index];
        let rendered = jsonb_geometry_pair(point.x, point.y, extra, known);
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

pub fn jsonb_input_from_point_context(input: PointValue, extra: i32, known: bool) -> JsonbInput {
    if let PointValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == PointValue::Null {
        return JsonbInput::Null;
    };
    if let PointValue::Value(value) = input {
        let text = jsonb_geometry_pair(value.x, value.y, extra, known);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_line_context(input: LineValue, extra: i32, known: bool) -> JsonbInput {
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
        let text = jsonb_geometry_values(values, "{", "}", extra, known);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_lseg_context(input: LsegValue, extra: i32, known: bool) -> JsonbInput {
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
        let text = jsonb_geometry_points(points, "[", "]", extra, known);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_box_context(input: BoxValue, extra: i32, known: bool) -> JsonbInput {
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
        let text = jsonb_geometry_points(points, "", "", extra, known);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_circle_context(input: CircleValue, extra: i32, known: bool) -> JsonbInput {
    if let CircleValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == CircleValue::Null {
        return JsonbInput::Null;
    };
    if let CircleValue::Value(value) = input {
        let center = jsonb_geometry_pair(value.x, value.y, extra, known);
        let radius = jsonb_geometry_number(value.radius, extra, known);
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

pub fn jsonb_input_from_path_context(input: PathValue, extra: i32, known: bool) -> JsonbInput {
    if let PathValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let PathValue::Null = input {
        return JsonbInput::Null;
    };
    if let PathValue::Value(value) = input {
        if value.closed {
            let text = jsonb_geometry_points(value.points, "(", ")", extra, known);
            return jsonb_input_from_text(text);
        };
        let text = jsonb_geometry_points(value.points, "[", "]", extra, known);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_polygon_context(input: PolygonValue, extra: i32, known: bool) -> JsonbInput {
    if let PolygonValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let PolygonValue::Null = input {
        return JsonbInput::Null;
    };
    if let PolygonValue::Value(value) = input {
        let text = jsonb_geometry_points(value.points, "(", ")", extra, known);
        return jsonb_input_from_text(text);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_point(input: PointValue) -> JsonbInput {
    jsonb_input_from_point_context(input, 0, false)
}

pub fn jsonb_input_from_line(input: LineValue) -> JsonbInput {
    jsonb_input_from_line_context(input, 0, false)
}

pub fn jsonb_input_from_lseg(input: LsegValue) -> JsonbInput {
    jsonb_input_from_lseg_context(input, 0, false)
}

pub fn jsonb_input_from_box(input: BoxValue) -> JsonbInput {
    jsonb_input_from_box_context(input, 0, false)
}

pub fn jsonb_input_from_circle(input: CircleValue) -> JsonbInput {
    jsonb_input_from_circle_context(input, 0, false)
}

pub fn jsonb_input_from_path(input: PathValue) -> JsonbInput {
    jsonb_input_from_path_context(input, 0, false)
}

pub fn jsonb_input_from_polygon(input: PolygonValue) -> JsonbInput {
    jsonb_input_from_polygon_context(input, 0, false)
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
