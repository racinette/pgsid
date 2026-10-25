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
*/

const TS_RANK_WEIGHT_SHAPE: u32 = 3452630;
const TS_RANK_WEIGHT_NULL: u32 = 3452548;
const TS_RANK_WEIGHT_RANGE: u32 = 3452619;

#[derive(Clone, Copy)]
struct TsRankWeightSet { d: i32, c: i32, b: i32, a: i32 }
#[derive(Clone, Copy)]
enum TsRankWeights { Unknown, Error(SqlError), Value(TsRankWeightSet) }
#[derive(Clone, Copy)]
struct TsRankWordRange { start: usize, count: usize }
#[derive(Clone)]
struct TsRankOperandList { items: Vec<usize> }
#[derive(Clone, Copy)]
struct TsRankPrevious { entry: i32 }

fn ts_rank_defaults() -> TsRankWeightSet { TsRankWeightSet {d:1036831949,c:1045220557,b:1053609165,a:1065353216} }
fn ts_rank_single(value: f64) -> f64 { float4_number((value as f32).to_bits() as i32) }
fn ts_rank_weight(weights: &TsRankWeightSet, weight: i32) -> f64 {
    if weight == 1 { return float4_number(weights.c); };
    if weight == 2 { return float4_number(weights.b); };
    if weight == 3 { return float4_number(weights.a); };
    float4_number(weights.d)
}
fn ts_rank_flag(method: i32, bit: i32) -> bool {
    let mut mask = method as i64;
    if mask < 0i64 { mask = mask + 4294967296i64; };
    mask / (bit as i64) % 2i64 != 0i64
}
fn ts_rank_read_weights(input: ArrayValue) -> TsRankWeights {
    if let ArrayValue::Error(error) = input { return TsRankWeights::Error(error); };
    if let ArrayValue::Value(value) = input {
        if value.element_kind != 19 || value.element_type != "pg_catalog.float4" { return TsRankWeights::Unknown; };
        if value.dimensions.len() != 1 || value.elements.len() < 4 { return TsRankWeights::Error(make_sql_error(TS_RANK_WEIGHT_SHAPE)); };
        let mut uncertain = false;
        let mut index: usize = 0;
        while index < value.elements.len() {
            let element = value.elements[index].clone();
            if let ArrayElement::Null = element { return TsRankWeights::Error(make_sql_error(TS_RANK_WEIGHT_NULL)); };
            if let ArrayElement::Unknown = element {
                if value.null_bitmap != BoolValue::Value(false) { uncertain = true; };
            };
            index += 1;
        }
        if uncertain { return TsRankWeights::Unknown; };
        let defaults = ts_rank_defaults();
        let mut weights = defaults;
        index = 0;
        while index < 4 {
            let input = array_element_to_float4(value.elements[index].clone());
            if let Float4Value::Error(error) = input { return TsRankWeights::Error(error); };
            if input == Float4Value::Unknown { uncertain = true; };
            let mut bits = defaults.d;
            if index == 1 { bits = defaults.c; };
            if index == 2 { bits = defaults.b; };
            if index == 3 { bits = defaults.a; };
            if let Float4Value::Value(source) = input {
                let number = float4_number(source);
                if number > 1.0f64 { return TsRankWeights::Error(make_sql_error(TS_RANK_WEIGHT_RANGE)); };
                if number >= 0.0f64 { bits = source; };
            };
            if index == 0 { weights = TsRankWeightSet {d:bits,c:weights.c,b:weights.b,a:weights.a}; };
            if index == 1 { weights = TsRankWeightSet {d:weights.d,c:bits,b:weights.b,a:weights.a}; };
            if index == 2 { weights = TsRankWeightSet {d:weights.d,c:weights.c,b:bits,a:weights.a}; };
            if index == 3 { weights = TsRankWeightSet {d:weights.d,c:weights.c,b:weights.b,a:bits}; };
            index += 1;
        }
        if uncertain { return TsRankWeights::Unknown; };
        return TsRankWeights::Value(weights);
    };
    TsRankWeights::Unknown
}

fn ts_rank_find(document: &TsvectorPayload, operand: &TsqueryNode) -> TsRankWordRange {
    let mut low: usize = 0; let mut high = document.lexemes.len();
    let mut middle = high; let mut found = false;
    while low < high && found == false {
        middle = low + usize::try_from(((high-low) as i32)/2).unwrap_or(0);
        let order = tsvector_lexeme_order(operand.text.as_str(),document.lexemes[middle].text.as_str());
        if order == 0 { high = middle; found = true; }
        else if order > 0 { low = middle + 1; }
        else { high = middle; };
    }
    let mut count: usize = 0;
    if found { count = 1; };
    if operand.prefix {
        if low >= high { middle = high; };
        count = 0;
        let mut scanning = true;
        while middle < document.lexemes.len() && scanning {
            if text_has_prefix(document.lexemes[middle].text.as_str(),operand.text.as_str()) {
                count += 1; middle += 1;
            } else { scanning = false; };
        }
    };
    TsRankWordRange {start:high,count:count}
}
fn ts_rank_length(document: &TsvectorPayload) -> i32 {
    let mut length: i32 = 0; let mut index: usize = 0;
    while index < document.lexemes.len() {
        let mut count = document.lexemes[index].positions.len() as i32;
        if count == 0 { count = 1; };
        length = length + count;
        index += 1;
    }
    length
}

fn ts_rank_operand_compare(input: &TsqueryPayload, a: usize, b: usize) -> Int4Value {
    make_int4_value(tsvector_lexeme_order(input.nodes[a].text.as_str(),input.nodes[b].text.as_str()))
}
fn ts_rank_order_known(input: Int4Value) -> bool {
    if let Int4Value::Value(_) = input {
        return true;
    };
    false
}

fn ts_rank_order_number(input: Int4Value) -> i32 {
    if let Int4Value::Value(value) = input {
        return value;
    };
    0
}

fn ts_rank_median(input: &TsqueryPayload, a: usize, b: usize, c: usize) -> Int4Value {
    let ab = ts_rank_operand_compare(input, a, b);
    if ts_rank_order_known(ab) == false {
        return ab;
    };
    let bc = ts_rank_operand_compare(input, b, c);
    if ts_rank_order_known(bc) == false {
        return bc;
    };
    if ts_rank_order_number(ab) < 0 && ts_rank_order_number(bc) < 0 {
        return make_int4_value(b as i32);
    };
    if ts_rank_order_number(ab) >= 0 && ts_rank_order_number(bc) > 0 {
        return make_int4_value(b as i32);
    };
    let ac = ts_rank_operand_compare(input, a, c);
    if ts_rank_order_known(ac) == false {
        return ac;
    };
    if ts_rank_order_number(ac) < 0 {
        if ts_rank_order_number(ab) < 0 {
            return make_int4_value(c as i32);
        };
        return make_int4_value(a as i32);
    };
    if ts_rank_order_number(ab) < 0 {
        return make_int4_value(a as i32);
    };
    make_int4_value(c as i32)
}

fn ts_rank_sort(input: &TsqueryPayload, children: Vec<usize>) -> TsRankOperandList {
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
                        ts_rank_operand_compare(input, order[position - 1], order[position]);
                    if ts_rank_order_known(compared) == false {
                        return TsRankOperandList {items:order};
                    };
                    if ts_rank_order_number(compared) > 0 {
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
                let compared = ts_rank_operand_compare(input, order[next - 1], order[next]);
                if ts_rank_order_known(compared) == false {
                    return TsRankOperandList {items:order};
                };
                if ts_rank_order_number(compared) > 0 {
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
                    let lo_choice = ts_rank_median(
                        input,
                        low,
                        order[start + distance],
                        order[start + distance + distance],
                    );
                    if ts_rank_order_known(lo_choice) == false {
                        return TsRankOperandList {items:order};
                    };
                    low = usize::try_from(ts_rank_order_number(lo_choice)).unwrap_or(0);
                    let mid_choice = ts_rank_median(
                        input,
                        order[middle - distance],
                        mid,
                        order[middle + distance],
                    );
                    if ts_rank_order_known(mid_choice) == false {
                        return TsRankOperandList {items:order};
                    };
                    mid = usize::try_from(ts_rank_order_number(mid_choice)).unwrap_or(0);
                    let hi_choice = ts_rank_median(
                        input,
                        order[end - 1 - (distance + distance)],
                        order[end - 1 - distance],
                        high,
                    );
                    if ts_rank_order_known(hi_choice) == false {
                        return TsRankOperandList {items:order};
                    };
                    high = usize::try_from(ts_rank_order_number(hi_choice)).unwrap_or(0);
                };
                let choice = ts_rank_median(input, low, mid, high);
                if ts_rank_order_known(choice) == false {
                    return TsRankOperandList {items:order};
                };
                pivot = usize::try_from(ts_rank_order_number(choice)).unwrap_or(0);
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
                    let compared = ts_rank_operand_compare(input, order[scan_low], pivot);
                    if ts_rank_order_known(compared) == false {
                        return TsRankOperandList {items:order};
                    };
                    let comparison = ts_rank_order_number(compared);
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
                    let compared = ts_rank_operand_compare(input, order[scan_high], pivot);
                    if ts_rank_order_known(compared) == false {
                        return TsRankOperandList {items:order};
                    };
                    let comparison = ts_rank_order_number(compared);
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
    TsRankOperandList {items:order}
}


fn ts_rank_items(query: &TsqueryPayload) -> TsRankOperandList {
    let mut order: Vec<usize> = Vec::new(); let mut index = query.nodes.len();
    while index > 0 { index = index - 1; if query.nodes[index].kind == 0 { order.push(index); }; }
    let sorted = ts_rank_sort(query,order);
    let mut items: Vec<usize> = Vec::new(); index = 0;
    while index < sorted.items.len() {
        let current = sorted.items[index];
        let mut keep = items.len() == 0;
        if items.len() > 0 { keep = query.nodes[items[items.len()-1]].text != query.nodes[current].text; };
        if keep { items.push(current); };
        index += 1;
    }
    TsRankOperandList {items:items}
}
