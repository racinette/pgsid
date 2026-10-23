const XPATH_KIND_NODES: i32 = 1;
const XPATH_KIND_BOOLEAN: i32 = 2;
const XPATH_KIND_NUMBER: i32 = 3;
const XPATH_KIND_STRING: i32 = 4;

#[derive(Clone)]
struct XPathValue { kind: i32, state: i32, boolean: bool, number: i64, text: String, nodes: XPathSequence }

#[derive(Clone, Copy)]
struct XPathContext { node: XPathReference, position: i32, size: i32 }

fn xpath_value_empty(kind: i32, state: i32) -> XPathValue {
    let values: Vec<XPathReference> = Vec::new();
    let nodes = XPathSequence { values, cyclic: false, cycle: 0 };
    XPathValue { kind, state, boolean: false, number: 0i64, text: String::new(), nodes }
}

fn xpath_value_boolean(boolean: bool) -> XPathValue {
    let values: Vec<XPathReference> = Vec::new();
    let nodes = XPathSequence { values, cyclic: false, cycle: 0 };
    XPathValue { kind: XPATH_KIND_BOOLEAN, state: 0, boolean, number: 0i64, text: String::new(), nodes }
}

fn xpath_value_number(number: f64) -> XPathValue {
    let values: Vec<XPathReference> = Vec::new();
    let nodes = XPathSequence { values, cyclic: false, cycle: 0 };
    let mut bits = number.to_bits() as i64;
    if number != number { bits = 9221120237041090560i64; };
    XPathValue { kind: XPATH_KIND_NUMBER, state: 0, boolean: false, number: bits, text: String::new(), nodes }
}

pub(crate) fn xpath_value_string(text: String) -> XPathValue {
    let values: Vec<XPathReference> = Vec::new();
    let nodes = XPathSequence { values, cyclic: false, cycle: 0 };
    XPathValue { kind: XPATH_KIND_STRING, state: 0, boolean: false, number: 0i64, text, nodes }
}

pub(crate) fn xpath_value_nodes(nodes: XPathSequence) -> XPathValue {
    let mut state: i32 = 0;
    if nodes.cyclic { state = 1; };
    XPathValue { kind: XPATH_KIND_NODES, state, boolean: false, number: 0i64, text: String::new(), nodes }
}

fn xpath_value_truth(input: &XPathValue) -> bool {
    if input.kind == XPATH_KIND_BOOLEAN { return input.boolean; };
    if input.kind == XPATH_KIND_NUMBER {
        let number = f64::from_bits(input.number as u64);
        return number == number && number != 0.0f64;
    };
    if input.kind == XPATH_KIND_STRING { return input.text.as_str() != ""; };
    input.nodes.values.len() > 0
}
