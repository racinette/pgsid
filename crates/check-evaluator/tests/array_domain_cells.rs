use pgsid_check_evaluator::{
    array_from_coerced_tree, ArrayDimension, ArrayElement, ArrayPayload, ArrayValue, BoolValue,
    SqlError,
};

fn payload(element_type: &str, element_kind: i32, elements: Vec<ArrayElement>) -> ArrayPayload {
    ArrayPayload {
        null_bitmap: BoolValue::Unknown,
        element_type: element_type.to_owned(),
        element_kind,
        dimensions: vec![ArrayDimension {
            lower: 5,
            length: elements.len() as i32,
        }],
        elements,
    }
}

#[test]
fn nested_owned_arrays_preserve_independent_shapes_identity_and_snapshots() {
    let inner = payload("pg_catalog.int4", 2, vec![ArrayElement::Int4(10)]);
    let middle = payload("domain:group", 41, vec![ArrayElement::Array(inner)]);
    let outer = payload("domain:batch", 41, vec![ArrayElement::Array(middle)]);
    let original = ArrayValue::Value(outer);
    let plan = "domain:batch\0domain:group\0pg_catalog.int4";
    let kinds = "))\u{2}";
    let mut copied = array_from_coerced_tree(original.clone(), plan, kinds);
    if let ArrayValue::Value(ref mut value) = copied {
        if let ArrayElement::Array(ref mut middle) = value.elements[0] {
            if let ArrayElement::Array(ref mut inner) = middle.elements[0] {
                inner.elements[0] = ArrayElement::Int4(99);
                inner.dimensions[0].lower = -3;
            } else {
                panic!("missing inner array");
            }
        } else {
            panic!("missing middle array");
        }
    } else {
        panic!("nested value rejected");
    }
    if let ArrayValue::Value(value) = original {
        if let ArrayElement::Array(middle) = &value.elements[0] {
            if let ArrayElement::Array(inner) = &middle.elements[0] {
                assert!(matches!(inner.elements[0], ArrayElement::Int4(10)));
                assert_eq!(inner.dimensions[0].lower, 5);
            } else {
                panic!("missing inner snapshot");
            }
        } else {
            panic!("missing middle snapshot");
        }
    } else {
        panic!("missing original snapshot");
    }
    for types in [
        "domain:batch\0domain:other\0pg_catalog.int4",
        "domain:batch\0domain:group\0pg_catalog.text",
    ] {
        assert!(matches!(
            array_from_coerced_tree(copied.clone(), types, kinds),
            ArrayValue::Unknown
        ));
    }
    assert!(matches!(
        array_from_coerced_tree(copied, plan, ")\u{2}"),
        ArrayValue::Unknown
    ));
}

#[test]
fn nested_states_keep_outer_shape_null_bitmap_and_first_error() {
    let inner = payload(
        "pg_catalog.int4",
        2,
        vec![ArrayElement::Null, ArrayElement::Unknown],
    );
    let outer = payload("domain:group", 41, vec![ArrayElement::Array(inner)]);
    let value = array_from_coerced_tree(
        ArrayValue::Value(outer),
        "domain:group\0pg_catalog.int4",
        ")\u{2}",
    );
    if let ArrayValue::Value(value) = value {
        assert!(value.null_bitmap == BoolValue::Unknown);
        assert_eq!(value.dimensions[0].length, 1);
        if let ArrayElement::Array(inner) = &value.elements[0] {
            assert_eq!(inner.dimensions[0].length, 2);
        } else {
            panic!("missing inner states");
        }
    } else {
        panic!("partial inner array rejected");
    }
    let inner = payload(
        "pg_catalog.int4",
        2,
        vec![ArrayElement::Error(SqlError { state: 3452582 })],
    );
    let outer = payload(
        "domain:group",
        41,
        vec![
            ArrayElement::Array(inner),
            ArrayElement::Error(SqlError { state: 1 }),
        ],
    );
    assert!(matches!(
        array_from_coerced_tree(
            ArrayValue::Value(outer),
            "domain:group\0pg_catalog.int4",
            ")\u{2}"
        ),
        ArrayValue::Error(SqlError { state: 3452582 })
    ));
    let mut malformed = payload("pg_catalog.int4", 2, vec![ArrayElement::Int4(10)]);
    malformed.dimensions[0].length = 2;
    let outer = payload("domain:group", 41, vec![ArrayElement::Array(malformed)]);
    assert!(matches!(
        array_from_coerced_tree(
            ArrayValue::Value(outer),
            "domain:group\0pg_catalog.int4",
            ")\u{2}"
        ),
        ArrayValue::Unknown
    ));
}
