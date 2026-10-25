use pgsid_check_evaluator::{
    array_element_from_range, make_range_support, multirange_from_coerced_array,
    range_from_profiled_bounds, ArrayDimension, ArrayElement, ArrayPayload, ArrayValue, BoolValue,
    MultirangeValue, RangeValue, SqlError,
};

const SPAN: &str = "public.capture_span";

fn member(lower: i32, upper: i32) -> ArrayElement {
    array_element_from_range(range_from_profiled_bounds(
        SPAN,
        "pg_catalog.int4",
        2,
        false,
        true,
        false,
        ArrayElement::Int4(lower),
        ArrayElement::Int4(upper),
        make_range_support(0, 0),
    ))
}

fn array(elements: Vec<ArrayElement>) -> ArrayValue {
    ArrayValue::Value(ArrayPayload {
        element_type: SPAN.to_owned(),
        element_kind: 42,
        dimensions: if elements.is_empty() {
            vec![]
        } else {
            vec![ArrayDimension {
                lower: 1,
                length: elements.len() as i32,
            }]
        },
        null_bitmap: BoolValue::Unknown,
        elements,
    })
}

fn restore(input: ArrayValue) -> MultirangeValue {
    multirange_from_coerced_array(
        input,
        "public.capture_set",
        SPAN,
        "pg_catalog.int4",
        2,
        make_range_support(0, 0),
    )
}

#[test]
fn stored_multirange_preserves_order_bounds_and_independent_snapshots_without_callbacks() {
    let mut original = array(vec![member(7, 9), member(1, 3)]);
    let restored = restore(original.clone());
    if let ArrayValue::Value(ref mut payload) = original {
        if let ArrayElement::Range(ref mut range) = payload.elements[0] {
            range.bounds[0] = ArrayElement::Int4(99);
        }
    }
    if let MultirangeValue::Value(payload) = restored {
        assert_eq!(payload.ranges.len(), 2);
        assert_eq!(payload.support.comparison, 0);
        assert_eq!(payload.support.canonical, 0);
        for (index, expected) in [7, 1].iter().enumerate() {
            if let RangeValue::Value(range) = &payload.ranges[index] {
                assert!(range.lower_inclusive);
                assert!(!range.upper_inclusive);
                assert!(matches!(range.bounds[0], ArrayElement::Int4(value) if value == *expected));
            } else {
                panic!("missing stored range");
            }
        }
    } else {
        panic!("missing stored multirange");
    }
    assert!(
        matches!(restore(array(vec![])), MultirangeValue::Value(value) if value.ranges.is_empty())
    );
}

#[test]
fn stored_multirange_validates_member_identity_shape_and_states() {
    assert!(matches!(
        restore(ArrayValue::Unknown),
        MultirangeValue::Unknown
    ));
    assert!(matches!(
        restore(ArrayValue::Null),
        MultirangeValue::Unknown
    ));
    assert!(
        matches!(restore(ArrayValue::Error(SqlError{state:1})), MultirangeValue::Error(error) if error.state == 1)
    );
    assert!(matches!(
        restore(array(vec![ArrayElement::Null])),
        MultirangeValue::Unknown
    ));
    let mut wrong = array(vec![member(1, 3)]);
    if let ArrayValue::Value(ref mut value) = wrong {
        value.dimensions[0].length = 2;
    }
    assert!(matches!(restore(wrong), MultirangeValue::Unknown));
    let mut wrong = array(vec![member(1, 3)]);
    if let ArrayValue::Value(ref mut value) = wrong {
        value.element_type = "public.other".to_owned();
    }
    assert!(matches!(restore(wrong), MultirangeValue::Unknown));
    let mut wrong = array(vec![member(1, 3)]);
    if let ArrayValue::Value(ref mut value) = wrong {
        if let ArrayElement::Range(ref mut range) = value.elements[0] {
            range.type_name = "public.other".to_owned();
        }
    }
    assert!(matches!(restore(wrong), MultirangeValue::Unknown));
}
