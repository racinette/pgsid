/*
 Copyright (C) 1998-2012 Daniel Veillard.  All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is fur-
nished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FIT-
NESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
fn xpath_reference_order(tree: &XmlTree, left: XPathReference, right: XPathReference) -> i32 {
    if xpath_reference_equal(left,right) { return 0; };
    if left.kind == 2 || right.kind == 2 { return -1; };
    let mut a = left.node; let mut b = right.node;
    if a == b {
        if left.kind == 0 { return -1; };
        if right.kind == 0 { return 1; };
        if left.index < right.index { return -1; };
        return 1;
    };
    if tree.nodes[b].previous > 0 && a == tree.nodes[b].previous { return -1; };
    if tree.nodes[b].next > 0 && a == tree.nodes[b].next { return 1; };
    let mut depth_a: usize = 0; let mut depth_b: usize = 0;
    let mut cursor = b;
    while cursor > 0 {
        cursor = tree.nodes[cursor].parent;
        if cursor == a { return -1; };
        depth_b += 1;
    }
    cursor = a;
    while cursor > 0 {
        cursor = tree.nodes[cursor].parent;
        if cursor == b { return 1; };
        depth_a += 1;
    }
    while depth_a > depth_b { a = tree.nodes[a].parent; depth_a = depth_a-1; }
    while depth_b > depth_a { b = tree.nodes[b].parent; depth_b = depth_b-1; }
    while tree.nodes[a].parent != tree.nodes[b].parent {
        a = tree.nodes[a].parent; b = tree.nodes[b].parent;
    }
    cursor = tree.nodes[a].next;
    while cursor > 0 { if cursor == b { return -1; }; cursor = tree.nodes[cursor].next; }
    1
}

fn xpath_nodes_same(tree: &XmlTree, left: XPathReference, right: XPathReference) -> bool {
    if left.kind != right.kind || left.node != right.node { return false; };
    if left.kind == 2 {
        let a = xpath_namespace_prefix(tree,left.index); let b = xpath_namespace_prefix(tree,right.index);
        return a == b;
    };
    left.index == right.index
}

pub(crate) fn xpath_nodes_merge(input: XPathNodes, right: &XPathNodes, tree: &XmlTree) -> XPathNodes {
    let count = input.values.len();
    let mut values = input.values; let mut index: usize = 0;
    while index < right.values.len() {
        let candidate = right.values[index]; let mut position: usize = 0; let mut found = false;
        while position < count {
            if xpath_nodes_same(tree,values[position],candidate) { found = true; };
            position += 1;
        }
        if found == false { values.push(candidate); };
        index += 1;
    }
    XPathNodes { values }
}
