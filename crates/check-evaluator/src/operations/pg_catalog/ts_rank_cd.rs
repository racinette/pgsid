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

#[derive(Clone, Copy)]
struct TsRankCdPosition { position: i32, weight: i32, entry: usize, node: usize }
#[derive(Clone)]
struct TsRankCdPositions { items: Vec<TsRankCdPosition> }
#[derive(Clone)]
struct TsRankCdGroup { position: i32, weight: i32, operands: Vec<usize> }
#[derive(Clone)]
struct TsRankCdDocument { items: Vec<TsRankCdGroup> }
#[derive(Clone, Copy)]
struct TsRankCdCover { found: bool, next: usize, begin: usize, end: usize, p: i32, q: i32 }

fn ts_rank_cd_later(a: TsRankCdPosition, b: TsRankCdPosition) -> bool {
    if a.position != b.position { return a.position > b.position; };
    if a.weight != b.weight { return a.weight > b.weight; };
    a.entry > b.entry
}

fn ts_rank_cd_sort(mut values: Vec<TsRankCdPosition>) -> TsRankCdPositions {
    let mut boundary = values.len();
    let mut initial = usize::try_from((boundary as i32)/2).unwrap_or(0);
    while boundary > 1 {
        let mut root: usize = 0;
        if initial > 0 { initial = initial - 1; root = initial; }
        else {
            boundary = boundary - 1;
            let swap = values[0]; values[0] = values[boundary]; values[boundary] = swap;
        };
        let mut sifting = true;
        while root+root+1 < boundary && sifting {
            let mut child = root+root+1;
            if child+1 < boundary && ts_rank_cd_later(values[child+1],values[child]) { child += 1; };
            if ts_rank_cd_later(values[child],values[root]) {
                let swap = values[root]; values[root] = values[child]; values[child] = swap;
                root = child;
            } else { sifting = false; };
        }
    }
    TsRankCdPositions {items:values}
}

fn ts_rank_cd_build_document(document: &TsvectorPayload, query: &TsqueryPayload) -> TsRankCdDocument {
    let mut positions: Vec<TsRankCdPosition> = Vec::new();
    let mut index = query.nodes.len();
    while index > 0 {
        index = index - 1;
        let operand = query.nodes[index].clone();
        if operand.kind == 0 {
            let entries = ts_rank_find(document,&operand);
            let mut entry: usize = 0;
            while entry < entries.count {
                let ordinal = entries.start+entry;
                let lexeme = document.lexemes[ordinal].clone();
                let mut position: usize = 0;
                while position < lexeme.positions.len() {
                    let current = lexeme.positions[position];
                    let mut bit: i32 = 1;
                    if current.weight == 1 { bit = 2; };
                    if current.weight == 2 { bit = 4; };
                    if current.weight == 3 { bit = 8; };
                    if operand.weight == 0 || operand.weight / bit % 2 != 0 {
                        positions.push(TsRankCdPosition {position:current.position,weight:current.weight,entry:ordinal,node:index});
                    };
                    position += 1;
                }
                entry += 1;
            }
        };
    }
    let sorted = ts_rank_cd_sort(positions);
    let mut groups: Vec<TsRankCdGroup> = Vec::new();
    index = 0;
    while index < sorted.items.len() {
        let current = sorted.items[index];
        let mut operands: Vec<usize> = Vec::new();
        let mut same = true;
        while index < sorted.items.len() && same {
            let next = sorted.items[index];
            if current.position == next.position && current.weight == next.weight && current.entry == next.entry {
                operands.push(next.node); index += 1;
            } else { same = false; };
        }
        groups.push(TsRankCdGroup {position:current.position,weight:current.weight,operands:operands});
    }
    TsRankCdDocument {items:groups}
}

fn ts_rank_cd_reset(query: &TsqueryPayload) -> TsqueryMatchOperands {
    let mut items: Vec<TsqueryMatchData> = Vec::new();
    let mut index: usize = 0;
    while index < query.nodes.len() { items.push(tsquery_match_state(0)); index += 1; }
    TsqueryMatchOperands {items:items}
}

fn ts_rank_cd_fill(mut input: TsqueryMatchOperands, group: &TsRankCdGroup, reverse: bool) -> TsqueryMatchOperands {
    let mut index: usize = 0;
    while index < group.operands.len() {
        let node = group.operands[index];
        let previous = input.items[node].clone();
        let position = usize::try_from(group.position).unwrap_or(0);
        let mut positions: Vec<usize> = Vec::new();
        let mut keep = true;
        if previous.positions.len() > 0 {
            if reverse { keep = previous.positions[0] != position; }
            else { keep = previous.positions[previous.positions.len()-1] != position; };
        };
        if reverse && keep { positions.push(position); };
        let mut old: usize = 0;
        while old < previous.positions.len() { positions.push(previous.positions[old]); old += 1; }
        if reverse == false && keep { positions.push(position); };
        input.items[node] = TsqueryMatchData {state:1,width:0i64,negate:false,positions:positions};
        index += 1;
    }
    input
}

fn ts_rank_cd_find_cover(document: &TsvectorPayload, query: &TsqueryPayload, doc: &TsRankCdDocument, start: usize) -> TsRankCdCover {
    let mut next = start;
    while next < doc.items.len() {
        let mut operands = ts_rank_cd_reset(query);
        let mut cursor = next;
        let mut found = false;
        let mut end = next;
        let mut q: i32 = 0;
        let mut scanning = true;
        while cursor < doc.items.len() && scanning {
            let group = doc.items[cursor].clone();
            operands = ts_rank_cd_fill(operands,&group,false);
            if tsquery_match_execute(document,query,&operands,true) == BoolValue::Value(true) {
                if group.position > q { q = group.position; end = cursor; found = true; };
                scanning = false;
            } else { cursor += 1; };
        }
        if found == false { return TsRankCdCover {found:false,next:next,begin:next,end:next,p:0,q:0}; };
        operands = ts_rank_cd_reset(query);
        cursor = end+1;
        let mut p: i32 = 2147483647;
        let mut begin = next;
        scanning = true;
        while cursor > next && scanning {
            cursor = cursor - 1;
            let group = doc.items[cursor].clone();
            operands = ts_rank_cd_fill(operands,&group,true);
            if tsquery_match_execute(document,query,&operands,true) == BoolValue::Value(true) {
                p = group.position; begin = cursor; scanning = false;
            };
        }
        if p <= q { return TsRankCdCover {found:true,next:begin+1,begin:begin,end:end,p:p,q:q}; };
        next += 1;
    }
    TsRankCdCover {found:false,next:next,begin:next,end:next,p:0,q:0}
}

fn ts_rank_cd_calculate(weights: &TsRankWeightSet, document: &TsvectorPayload, query: &TsqueryPayload, method: i32) -> f64 {
    let doc = ts_rank_cd_build_document(document,query);
    if doc.items.len() == 0 { return 0.0f64; };
    let mut result = 0.0f64;
    let mut sum_distance = 0.0f64;
    let mut previous_center = 0.0f64;
    let mut extents: i32 = 0;
    let mut next: usize = 0;
    let mut scanning = true;
    while scanning {
        let cover = ts_rank_cd_find_cover(document,query,&doc,next);
        if cover.found {
            let mut inverse_sum = 0.0f64;
            let mut index = cover.begin;
            while index <= cover.end {
                inverse_sum = inverse_sum + 1.0f64/ts_rank_weight(weights,doc.items[index].weight);
                index += 1;
            }
            let count = (cover.end-cover.begin) as i32;
            let score = ((count+1) as f64)/inverse_sum;
            let mut noise = (cover.q-cover.p)-count;
            if noise < 0 { noise = count/2; };
            result = result + score/((noise+1) as f64);
            let center = ((cover.q+cover.p) as f64)/2.0f64;
            if extents > 0 && center > previous_center { sum_distance = sum_distance + 1.0f64/(center-previous_center); };
            previous_center = center;
            extents = extents + 1;
            next = cover.next;
        } else { scanning = false; };
    }
    let length = ts_rank_length(document);
    if ts_rank_flag(method,1) { result = result/((length+1) as f64).ln(); };
    if ts_rank_flag(method,2) && length > 0 { result = result/(length as f64); };
    if ts_rank_flag(method,4) && extents > 0 && sum_distance > 0.0f64 { result = result/((extents as f64)/sum_distance); };
    let unique = document.lexemes.len() as i32;
    if ts_rank_flag(method,8) { result = result/(unique as f64); };
    if ts_rank_flag(method,16) { result = result/(((unique+1) as f64).ln()/2.0f64.ln()); };
    if ts_rank_flag(method,32) { result = result/(result+1.0f64); };
    result
}

fn ts_rank_cd_run(weights: ArrayValue, document: TsvectorValue, query: TsqueryValue, method: Int4Value, defaults: bool) -> Float4Value {
    if let ArrayValue::Error(error) = weights { return Float4Value::Error(error); };
    if let TsvectorValue::Error(error) = document { return Float4Value::Error(error); };
    if let TsqueryValue::Error(error) = query { return Float4Value::Error(error); };
    if let Int4Value::Error(error) = method { return Float4Value::Error(error); };
    if defaults == false { if let ArrayValue::Unknown = weights { return Float4Value::Unknown; }; };
    if let TsvectorValue::Unknown = document { return Float4Value::Unknown; };
    if let TsqueryValue::Unknown = query { return Float4Value::Unknown; };
    if method == Int4Value::Unknown { return Float4Value::Unknown; };
    if defaults == false { if let ArrayValue::Null = weights { return Float4Value::Null; }; };
    if let TsvectorValue::Null = document { return Float4Value::Null; };
    if let TsqueryValue::Null = query { return Float4Value::Null; };
    if method == Int4Value::Null { return Float4Value::Null; };
    let mut selected = ts_rank_defaults();
    if defaults == false {
        let parsed = ts_rank_read_weights(weights);
        if let TsRankWeights::Unknown = parsed { return Float4Value::Unknown; };
        if let TsRankWeights::Error(error) = parsed { return Float4Value::Error(error); };
        if let TsRankWeights::Value(value) = parsed { selected = value; };
    };
    if let TsvectorValue::Value(value) = document {
        if let TsqueryValue::Value(pattern) = query {
            if let Int4Value::Value(normalization) = method {
                let result = ts_rank_cd_calculate(&selected,&value,&pattern,normalization);
                if result != result { return Float4Value::UnspecifiedNan; };
                return make_float4_bits((result as f32).to_bits() as i32);
            };
        };
    };
    Float4Value::Unknown
}

pub fn sql__pg_catalog__ts_rank_cd__w5px(weights: ArrayValue, document: TsvectorValue, query: TsqueryValue) -> Float4Value { ts_rank_cd_run(weights,document,query,make_int4_value(0),false) }
pub fn sql__pg_catalog__ts_rank_cd__81i4(weights: ArrayValue, document: TsvectorValue, query: TsqueryValue, method: Int4Value) -> Float4Value { ts_rank_cd_run(weights,document,query,method,false) }
pub fn sql__pg_catalog__ts_rank_cd__rycu(document: TsvectorValue, query: TsqueryValue) -> Float4Value { ts_rank_cd_run(ArrayValue::Null,document,query,make_int4_value(0),true) }
pub fn sql__pg_catalog__ts_rank_cd__tqso(document: TsvectorValue, query: TsqueryValue, method: Int4Value) -> Float4Value { ts_rank_cd_run(ArrayValue::Null,document,query,method,true) }
