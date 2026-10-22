const ARRAY_REVERSE_LIMIT: u32 = 8584704;

pub fn sql__pg_catalog__array_reverse__iwk0(input: ArrayValue) -> ArrayValue {
    if let ArrayValue::Value(value) = input {
        if value.dimensions.len() == 0 || value.dimensions[0].length < 2 {
            return ArrayValue::Value(value);
        };
        let mut depth: usize = 0;
        while depth < value.dimensions.len() {
            let dimension = value.dimensions[depth];
            if (dimension.lower as i64) + (dimension.length as i64) > 2147483647i64 {
                return ArrayValue::Error(make_sql_error(ARRAY_REVERSE_LIMIT));
            };
            depth += 1;
        }
        let rows = value.dimensions[0].length;
        let width = (value.elements.len() as i32) / rows;
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut row: i32 = 0;
        while row < rows && width > 0 {
            let mut column: i32 = 0;
            while column < width {
                let offset = (rows - row - 1) * width + column;
                let position = usize::try_from(offset).unwrap_or(value.elements.len());
                elements.push(value.elements[position].clone());
                column = column + 1;
            }
            row = row + 1;
        }
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        if width > 0 {
            let mut dimension: usize = 0;
            while dimension < value.dimensions.len() {
                dimensions.push(value.dimensions[dimension]);
                dimension += 1;
            }
        };
        let null_bitmap = array_reconstruction_bitmap(&value);
        return make_array_value(ArrayPayload {
            null_bitmap: null_bitmap,
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: elements,
        });
    };
    input
}
