/*
PostgreSQL Database Management System
(also known as Postgres, formerly known as Postgres95)

Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group

Portions Copyright (c) 1994, The Regents of the University of California

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose, without fee, and without a written agreement
is hereby granted, provided that the above copyright notice and this
paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.


Copyright (c) 2021-2025, PostgreSQL Global Development Group
Portions Copyright (c) 1992-1994, Regents of the University of California

Copyright (c) 1992, 1993
The Regents of the University of California. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the University nor the names of its contributors may
   be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#[derive(Clone)]
struct TsqueryRewriteNode { value: TsqueryNode, children: Vec<usize>, frozen: bool }
#[derive(Clone)]
struct TsqueryRewriteTree { nodes: Vec<TsqueryRewriteNode>, root: usize, known: bool }
#[derive(Clone)]
struct TsqueryRewriteChildren { items: Vec<usize>, known: bool }
#[derive(Clone, Copy)]
struct TsqueryRewriteTask { node: usize, finish: bool }

fn tsquery_rewrite_compare(tree: &TsqueryRewriteTree, left: usize, right: usize, utf8: bool) -> Int4Value {
    let mut tasks: Vec<TsqueryCompareFrame> = Vec::new();
    tasks.push(TsqueryCompareFrame {left:left,right:right,finish:false});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        let a = tree.nodes[task.left].clone();
        let b = tree.nodes[task.right].clone();
        if task.finish {
            if a.value.distance > b.value.distance { return make_int4_value(-1); };
            if a.value.distance < b.value.distance { return make_int4_value(1); };
        } else {
            if a.value.kind > b.value.kind { return make_int4_value(-1); };
            if a.value.kind < b.value.kind { return make_int4_value(1); };
            if a.value.kind == 0 {
                if a.value.text != b.value.text {
                    if utf8 == false && (tsquery_ascii(a.value.text.as_str()) == false || tsquery_ascii(b.value.text.as_str()) == false) { return Int4Value::Unknown; };
                    let ac = tsquery_legacy_crc(a.value.text.as_str());
                    let bc = tsquery_legacy_crc(b.value.text.as_str());
                    if ac > bc { return make_int4_value(-1); };
                    if ac < bc { return make_int4_value(1); };
                    return make_int4_value(tsvector_lexeme_order(a.value.text.as_str(),b.value.text.as_str()));
                };
            } else {
                if a.children.len() > b.children.len() { return make_int4_value(-1); };
                if a.children.len() < b.children.len() { return make_int4_value(1); };
                if a.value.kind == 4 {
                    let finish = TsqueryCompareFrame {left:task.left,right:task.right,finish:true};
                    if depth < tasks.len() { tasks[depth] = finish; } else { tasks.push(finish); };
                    depth += 1;
                };
                let mut index = a.children.len();
                while index > 0 {
                    index = index - 1;
                    let child = TsqueryCompareFrame {left:a.children[index],right:b.children[index],finish:false};
                    if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                    depth += 1;
                }
            };
        };
    }
    make_int4_value(0)
}

fn tsquery_rewrite_equal(tree: &TsqueryRewriteTree, left: usize, right: usize) -> bool {
    let mut tasks: Vec<TsqueryCompareFrame> = Vec::new();
    tasks.push(TsqueryCompareFrame {left:left,right:right,finish:false});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        let a = tree.nodes[task.left].clone();
        let b = tree.nodes[task.right].clone();
        if a.value.kind != b.value.kind || a.children.len() != b.children.len() { return false; };
        if a.value.kind == 0 {
            if a.value.text != b.value.text { return false; };
        } else {
            if a.value.kind == 4 && a.value.distance != b.value.distance { return false; };
            let mut index: usize = 0;
            while index < a.children.len() {
                let child = TsqueryCompareFrame {left:a.children[index],right:b.children[index],finish:false};
                if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                depth += 1;
                index += 1;
            }
        };
    }
    true
}

fn tsquery_rewrite_order_known(input: Int4Value) -> bool {
    if let Int4Value::Value(_) = input {
        return true;
    };
    false
}

fn tsquery_rewrite_order_number(input: Int4Value) -> i32 {
    if let Int4Value::Value(value) = input {
        return value;
    };
    0
}

fn tsquery_rewrite_median(input: &TsqueryRewriteTree, a: usize, b: usize, c: usize, utf8: bool) -> Int4Value {
    let ab = tsquery_rewrite_compare(input, a, b, utf8);
    if tsquery_rewrite_order_known(ab) == false {
        return ab;
    };
    let bc = tsquery_rewrite_compare(input, b, c, utf8);
    if tsquery_rewrite_order_known(bc) == false {
        return bc;
    };
    if tsquery_rewrite_order_number(ab) < 0 && tsquery_rewrite_order_number(bc) < 0 {
        return make_int4_value(b as i32);
    };
    if tsquery_rewrite_order_number(ab) >= 0 && tsquery_rewrite_order_number(bc) > 0 {
        return make_int4_value(b as i32);
    };
    let ac = tsquery_rewrite_compare(input, a, c, utf8);
    if tsquery_rewrite_order_known(ac) == false {
        return ac;
    };
    if tsquery_rewrite_order_number(ac) < 0 {
        if tsquery_rewrite_order_number(ab) < 0 {
            return make_int4_value(c as i32);
        };
        return make_int4_value(a as i32);
    };
    if tsquery_rewrite_order_number(ab) < 0 {
        return make_int4_value(a as i32);
    };
    make_int4_value(c as i32)
}

fn tsquery_rewrite_sort(input: &TsqueryRewriteTree, children: Vec<usize>, utf8: bool) -> TsqueryRewriteChildren {
    let mut order = children;
    let mut starts: Vec<usize> = Vec::new();
    let mut lengths: Vec<usize> = Vec::new();
    starts.push(0);
    lengths.push(order.len());
    let mut tasks: usize = 1;
    while tasks > 0 {
        tasks = tasks - 1;
        let start = starts[tasks];
        let count = lengths[tasks];
        let end = start + count;
        let mut partition = count >= 7;
        if count < 7 {
            let mut next = start + 1;
            while next < end {
                let mut position = next;
                let mut shifting = true;
                while position > start && shifting {
                    let compared =
                        tsquery_rewrite_compare(input, order[position - 1], order[position], utf8);
                    if tsquery_rewrite_order_known(compared) == false {
                        return TsqueryRewriteChildren {items:order,known:false};
                    };
                    if tsquery_rewrite_order_number(compared) > 0 {
                        let saved = order[position];
                        order[position] = order[position - 1];
                        order[position - 1] = saved;
                        position = position - 1;
                    } else {
                        shifting = false;
                    };
                }
                next += 1;
            }
        };
        if partition {
            let mut next = start + 1;
            let mut presorted = true;
            while next < end && presorted {
                let compared = tsquery_rewrite_compare(input, order[next - 1], order[next], utf8);
                if tsquery_rewrite_order_known(compared) == false {
                    return TsqueryRewriteChildren {items:order,known:false};
                };
                if tsquery_rewrite_order_number(compared) > 0 {
                    presorted = false;
                };
                next += 1;
            }
            partition = presorted == false;
        };
        if partition {
            let half = (count as i32) / 2;
            let middle = start + usize::try_from(half).unwrap_or(0);
            let mut pivot = order[middle];
            if count > 7 {
                let mut low = order[start];
                let mut mid = pivot;
                let mut high = order[end - 1];
                if count > 40 {
                    let eighth = (count as i32) / 8;
                    let distance = usize::try_from(eighth).unwrap_or(0);
                    let lo_choice = tsquery_rewrite_median(
                        input,
                        low,
                        order[start + distance],
                        order[start + distance + distance],
                        utf8,
                    );
                    if tsquery_rewrite_order_known(lo_choice) == false {
                        return TsqueryRewriteChildren {items:order,known:false};
                    };
                    low = usize::try_from(tsquery_rewrite_order_number(lo_choice)).unwrap_or(0);
                    let mid_choice = tsquery_rewrite_median(
                        input,
                        order[middle - distance],
                        mid,
                        order[middle + distance],
                        utf8,
                    );
                    if tsquery_rewrite_order_known(mid_choice) == false {
                        return TsqueryRewriteChildren {items:order,known:false};
                    };
                    mid = usize::try_from(tsquery_rewrite_order_number(mid_choice)).unwrap_or(0);
                    let hi_choice = tsquery_rewrite_median(
                        input,
                        order[end - 1 - (distance + distance)],
                        order[end - 1 - distance],
                        high,
                        utf8,
                    );
                    if tsquery_rewrite_order_known(hi_choice) == false {
                        return TsqueryRewriteChildren {items:order,known:false};
                    };
                    high = usize::try_from(tsquery_rewrite_order_number(hi_choice)).unwrap_or(0);
                };
                let choice = tsquery_rewrite_median(input, low, mid, high, utf8);
                if tsquery_rewrite_order_known(choice) == false {
                    return TsqueryRewriteChildren {items:order,known:false};
                };
                pivot = usize::try_from(tsquery_rewrite_order_number(choice)).unwrap_or(0);
            };
            let mut pivot_position = start;
            while order[pivot_position] != pivot {
                pivot_position += 1;
            }
            let saved = order[start];
            order[start] = pivot;
            order[pivot_position] = saved;
            let mut equal_low = start + 1;
            let mut scan_low = equal_low;
            let mut scan_high = end - 1;
            let mut equal_high = scan_high;
            let mut searching = true;
            while searching {
                let mut advance = true;
                while scan_low <= scan_high && advance {
                    let compared = tsquery_rewrite_compare(input, order[scan_low], pivot, utf8);
                    if tsquery_rewrite_order_known(compared) == false {
                        return TsqueryRewriteChildren {items:order,known:false};
                    };
                    let comparison = tsquery_rewrite_order_number(compared);
                    if comparison <= 0 {
                        if comparison == 0 {
                            let saved = order[equal_low];
                            order[equal_low] = order[scan_low];
                            order[scan_low] = saved;
                            equal_low += 1;
                        };
                        scan_low += 1;
                    } else {
                        advance = false;
                    };
                }
                advance = true;
                while scan_low <= scan_high && advance {
                    let compared = tsquery_rewrite_compare(input, order[scan_high], pivot, utf8);
                    if tsquery_rewrite_order_known(compared) == false {
                        return TsqueryRewriteChildren {items:order,known:false};
                    };
                    let comparison = tsquery_rewrite_order_number(compared);
                    if comparison >= 0 {
                        if comparison == 0 {
                            let saved = order[equal_high];
                            order[equal_high] = order[scan_high];
                            order[scan_high] = saved;
                            equal_high = equal_high - 1;
                        };
                        scan_high = scan_high - 1;
                    } else {
                        advance = false;
                    };
                }
                if scan_low > scan_high {
                    searching = false;
                } else {
                    let saved = order[scan_low];
                    order[scan_low] = order[scan_high];
                    order[scan_high] = saved;
                    scan_low += 1;
                    scan_high = scan_high - 1;
                };
            }
            let mut swap_count = equal_low - start;
            if swap_count > scan_low - equal_low {
                swap_count = scan_low - equal_low;
            };
            let mut swapped: usize = 0;
            while swapped < swap_count {
                let left = start + swapped;
                let right = scan_low - swap_count + swapped;
                let saved = order[left];
                order[left] = order[right];
                order[right] = saved;
                swapped += 1;
            }
            swap_count = equal_high - scan_high;
            if swap_count > end - equal_high - 1 {
                swap_count = end - equal_high - 1;
            };
            swapped = 0;
            while swapped < swap_count {
                let left = scan_low + swapped;
                let right = end - swap_count + swapped;
                let saved = order[left];
                order[left] = order[right];
                order[right] = saved;
                swapped += 1;
            }
            let left_count = scan_low - equal_low;
            let right_count = equal_high - scan_high;
            let mut large_start = start;
            let mut large_count = left_count;
            let mut small_start = end - right_count;
            let mut small_count = right_count;
            if left_count <= right_count {
                large_start = small_start;
                large_count = right_count;
                small_start = start;
                small_count = left_count;
            };
            if large_count > 1 {
                if tasks < starts.len() {
                    starts[tasks] = large_start;
                    lengths[tasks] = large_count;
                } else {
                    starts.push(large_start);
                    lengths.push(large_count);
                };
                tasks += 1;
            };
            if small_count > 1 {
                if tasks < starts.len() {
                    starts[tasks] = small_start;
                    lengths[tasks] = small_count;
                } else {
                    starts.push(small_start);
                    lengths.push(small_count);
                };
                tasks += 1;
            };
        };
    }
    TsqueryRewriteChildren {items:order,known:true}
}

fn tsquery_rewrite_import(input: TsqueryRewriteTree, value: TsqueryPayload, normalize: bool, utf8: bool) -> TsqueryRewriteTree {
    let mut nodes = input.nodes;
    let offset = nodes.len();
    let mut index: usize = 0;
    while index < value.nodes.len() {
        let node = value.nodes[index].clone();
        let mut children: Vec<usize> = Vec::new();
        if node.kind != 0 {
            let mut source: Vec<usize> = Vec::new();
            if node.kind != 1 { source.push(offset + node.right); };
            source.push(offset + node.left);
            let mut child_index: usize = 0;
            while child_index < source.len() {
                let child = nodes[source[child_index]].clone();
                if normalize && (node.kind == 2 || node.kind == 3) && child.value.kind == node.kind {
                    let mut member: usize = 0;
                    while member < child.children.len() { children.push(child.children[member]); member += 1; }
                } else { children.push(source[child_index]); };
                child_index += 1;
            }
        };
        nodes.push(TsqueryRewriteNode {value:node,children:children,frozen:false});
        index += 1;
    }
    let root = offset + value.root;
    let imported = TsqueryRewriteTree {nodes:nodes,root:root,known:true};
    if normalize { return tsquery_rewrite_sort_tree(imported,root,utf8); };
    imported
}

fn tsquery_rewrite_sort_tree(input: TsqueryRewriteTree, root: usize, utf8: bool) -> TsqueryRewriteTree {
    let mut tree = input;
    let mut tasks: Vec<TsqueryRewriteTask> = Vec::new();
    tasks.push(TsqueryRewriteTask {node:root,finish:false});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        let node = tree.nodes[task.node].clone();
        if task.finish {
            if node.value.kind != 4 && node.children.len() > 1 {
                let sorted = tsquery_rewrite_sort(&tree,node.children,utf8);
                if sorted.known == false { return TsqueryRewriteTree {nodes:tree.nodes,root:root,known:false}; };
                let mut nodes = tree.nodes;
                nodes[task.node] = TsqueryRewriteNode {value:node.value,children:sorted.items,frozen:node.frozen};
                tree = TsqueryRewriteTree {nodes:nodes,root:root,known:true};
            };
        } else {
            let finish = TsqueryRewriteTask {node:task.node,finish:true};
            if depth < tasks.len() { tasks[depth] = finish; } else { tasks.push(finish); };
            depth += 1;
            let mut index = node.children.len();
            while index > 0 {
                index = index - 1;
                let child = TsqueryRewriteTask {node:node.children[index],finish:false};
                if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                depth += 1;
            }
        };
    }
    tree
}
