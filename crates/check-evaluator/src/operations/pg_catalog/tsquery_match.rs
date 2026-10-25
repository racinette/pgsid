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

#[derive(Clone)]
struct TsqueryMatchData { state: i32, width: i64, negate: bool, positions: Vec<usize> }
#[derive(Clone)]
struct TsqueryMatchFrame { node: usize, phrase: bool, positions: bool, step: i32, left: TsqueryMatchData }

fn tsquery_match_state(state: i32) -> TsqueryMatchData {
    let positions: Vec<usize> = Vec::new();
    TsqueryMatchData {state:state,width:0i64,negate:false,positions:positions}
}

fn tsquery_match_lexeme(lexeme: &TsvectorLexeme, weight: i32, positions: bool) -> TsqueryMatchData {
    if lexeme.positions.len() == 0 {
        if positions { return tsquery_match_state(2); };
        return tsquery_match_state(1);
    };
    let mut output: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < lexeme.positions.len() {
        let value = lexeme.positions[index];
        let mut bit: i32 = 1;
        if value.weight == 1 { bit = 2; };
        if value.weight == 2 { bit = 4; };
        if value.weight == 3 { bit = 8; };
        if weight == 0 || weight / bit % 2 != 0 {
            if positions == false { return tsquery_match_state(1); };
            output.push(usize::try_from(value.position).unwrap_or(0));
        };
        index += 1;
    }
    let mut state: i32 = 0;
    if output.len() > 0 { state = 1; };
    TsqueryMatchData {state:state,width:0i64,negate:false,positions:output}
}

fn tsquery_match_operand(document: &TsvectorPayload, operand: &TsqueryNode, positions: bool) -> TsqueryMatchData {
    let mut low: usize = 0;
    let mut high = document.lexemes.len();
    let mut middle = high;
    let mut result = tsquery_match_state(0);
    let mut searching = true;
    while low < high && searching {
        middle = low + usize::try_from(((high-low) as i32)/2).unwrap_or(0);
        let order = tsvector_lexeme_order(operand.text.as_str(),document.lexemes[middle].text.as_str());
        if order == 0 {
            let lexeme = document.lexemes[middle].clone();
            result = tsquery_match_lexeme(&lexeme,operand.weight,positions);
            searching = false;
        } else if order > 0 { low = middle + 1; }
        else { high = middle; };
    }
    if operand.prefix && (result.state != 1 || positions) {
        if low >= high { middle = high; };
        result = tsquery_match_state(0);
        let mut present: Vec<usize> = Vec::new();
        let mut scanning = true;
        while middle < document.lexemes.len() && scanning {
            let lexeme = document.lexemes[middle].clone();
            if text_has_prefix(lexeme.text.as_str(),operand.text.as_str()) == false { scanning = false; }
            else {
                let found = tsquery_match_lexeme(&lexeme,operand.weight,positions);
                if positions {
                    if found.state == 2 { return found; };
                    let mut index: usize = 0;
                    while index < found.positions.len() {
                        let position = found.positions[index];
                        while present.len() <= position { present.push(0); }
                        present[position] = 1;
                        index += 1;
                    }
                } else if found.state == 1 { return found; };
                middle += 1;
            };
        }
        let mut output: Vec<usize> = Vec::new();
        let mut index: usize = 0;
        while index < present.len() { if present[index] == 1 { output.push(index); }; index += 1; }
        let mut state: i32 = 0;
        if output.len() > 0 { state = 1; };
        result = TsqueryMatchData {state:state,width:0i64,negate:false,positions:output};
    };
    result
}

fn tsquery_match_wrap(value: i64) -> i64 { (value as i32) as i64 }

fn tsquery_match_merge(left: &TsqueryMatchData, right: &TsqueryMatchData, emit: i32, left_offset: i64, right_offset: i64, width: i64, negate: bool, positions: bool) -> TsqueryMatchData {
    let lshift = tsquery_match_wrap(left_offset);
    let rshift = tsquery_match_wrap(right_offset);
    let span = tsquery_match_wrap(width);
    let mut output: Vec<usize> = Vec::new();
    let mut l: usize = 0;
    let mut r: usize = 0;
    let mut scanning = true;
    while (l < left.positions.len() || r < right.positions.len()) && scanning {
        let mut a: i64 = 2147483647i64;
        let mut b: i64 = 2147483647i64;
        if l < left.positions.len() { a = tsquery_match_wrap(((left.positions[l] as i32) as i64) + lshift); }
        else if emit / 2 % 2 == 0 { scanning = false; };
        if r < right.positions.len() { b = tsquery_match_wrap(((right.positions[r] as i32) as i64) + rshift); }
        else if emit % 2 == 0 { scanning = false; };
        if scanning {
            let mut position: i64 = 0i64;
            if a < b { if emit % 2 != 0 { position = a; }; l += 1; }
            else if a == b { if emit / 4 % 2 != 0 { position = b; }; l += 1; r += 1; }
            else { if emit / 2 % 2 != 0 { position = b; }; r += 1; };
            if position > 0i64 {
                if positions == false { return tsquery_match_state(1); };
                let masked = (position % 16384i64) as i32;
                output.push(usize::try_from(masked).unwrap_or(0));
            };
        };
    }
    let mut state: i32 = 0;
    if output.len() > 0 || negate { state = 1; };
    TsqueryMatchData {state:state,width:span,negate:negate,positions:output}
}

fn tsquery_match_phrase(left: TsqueryMatchData, right: TsqueryMatchData, kind: i32, distance: i32, positions: bool) -> TsqueryMatchData {
    if kind != 3 && (left.state == 0 || right.state == 0) { return tsquery_match_state(0); };
    if kind == 3 && left.state == 0 && right.state == 0 { return tsquery_match_state(0); };
    if left.state == 2 || right.state == 2 { return tsquery_match_state(2); };
    let mut lwidth = left.width;
    let mut rwidth = right.width;
    if left.state == 0 { lwidth = 0i64; };
    if right.state == 0 { rwidth = 0i64; };
    let mut width = lwidth;
    if rwidth > width { width = rwidth; };
    let mut loffset = width - lwidth;
    let mut roffset = width - rwidth;
    if kind == 4 { loffset = (distance as i64) + rwidth; roffset = 0i64; width = (distance as i64) + lwidth + rwidth; };
    if positions == false { width = 0i64; };
    let mut emit: i32 = 4;
    let mut negate = false;
    if kind == 3 {
        if left.negate && right.negate { negate = true; }
        else if left.negate { emit = 1; negate = true; }
        else if right.negate { emit = 2; negate = true; }
        else { emit = 7; };
    } else {
        if left.negate && right.negate { emit = 7; negate = true; }
        else if left.negate { emit = 2; }
        else if right.negate { emit = 1; };
    };
    let result = tsquery_match_merge(&left,&right,emit,loffset,roffset,width,negate,positions);
    if negate { return TsqueryMatchData {state:1,width:result.width,negate:true,positions:result.positions}; };
    result
}

fn tsquery_match_evaluate(document: &TsvectorPayload, query: &TsqueryPayload) -> BoolValue {
    if query.nodes.len() == 0 { return make_bool_value(false); };
    let mut frames: Vec<TsqueryMatchFrame> = Vec::new();
    frames.push(TsqueryMatchFrame {node:query.root,phrase:false,positions:false,step:0,left:tsquery_match_state(0)});
    let mut depth: usize = 1;
    let mut result = tsquery_match_state(0);
    while depth > 0 {
        depth = depth - 1;
        let frame = frames[depth].clone();
        let node = query.nodes[frame.node].clone();
        let phrase = frame.phrase || node.kind == 4;
        if frame.step == 0 {
            if node.kind == 0 { result = tsquery_match_operand(document,&node,frame.phrase); }
            else {
                let parent = TsqueryMatchFrame {node:frame.node,phrase:frame.phrase,positions:frame.positions,step:1,left:tsquery_match_state(0)};
                if depth < frames.len() { frames[depth] = parent; } else { frames.push(parent); };
                depth += 1;
                let child = TsqueryMatchFrame {node:node.left,phrase:phrase,positions:phrase,step:0,left:tsquery_match_state(0)};
                if depth < frames.len() { frames[depth] = child; } else { frames.push(child); };
                depth += 1;
            };
        } else if frame.step == 1 {
            if node.kind == 1 {
                let mut state = result.state;
                let mut negate = result.negate;
                if phrase {
                    if state == 0 { state = 1; negate = true; }
                    else if state == 1 {
                        if result.positions.len() > 0 { negate = negate == false; }
                        else { state = 0; negate = false; };
                    };
                } else {
                    if state == 0 { state = 1; } else if state == 1 { state = 0; };
                };
                result = TsqueryMatchData {state:state,width:result.width,negate:negate,positions:result.positions};
            } else {
                let mut skip = node.kind != 3 && result.state == 0;
                if phrase == false && node.kind == 3 && result.state == 1 { skip = true; };
                if skip { result = tsquery_match_state(result.state); }
                else {
                    let parent = TsqueryMatchFrame {node:frame.node,phrase:frame.phrase,positions:frame.positions,step:2,left:result};
                    result = tsquery_match_state(0);
                    if depth < frames.len() { frames[depth] = parent; } else { frames.push(parent); };
                    depth += 1;
                    let child = TsqueryMatchFrame {node:node.right,phrase:phrase,positions:phrase,step:0,left:tsquery_match_state(0)};
                    if depth < frames.len() { frames[depth] = child; } else { frames.push(child); };
                    depth += 1;
                };
            };
        } else if phrase {
            result = tsquery_match_phrase(frame.left,result,node.kind,node.distance,frame.positions);
            if frame.phrase == false && result.state == 2 { result = tsquery_match_state(0); };
        } else {
            let mut state = frame.left.state;
            if node.kind == 2 && result.state == 0 { state = 0; };
            if node.kind == 3 && result.state == 1 { state = 1; };
            result = tsquery_match_state(state);
        };
    }
    make_bool_value(result.state == 1)
}

pub fn sql__pg_catalog__ts_match_vq__53kf(document: TsvectorValue, query: TsqueryValue) -> BoolValue {
    if let TsvectorValue::Error(error) = document { return BoolValue::Error(error); };
    if let TsqueryValue::Error(error) = query { return BoolValue::Error(error); };
    if let TsvectorValue::Unknown = document { return BoolValue::Unknown; };
    if let TsqueryValue::Unknown = query { return BoolValue::Unknown; };
    if let TsvectorValue::Null = document { return BoolValue::Null; };
    if let TsqueryValue::Null = query { return BoolValue::Null; };
    if let TsvectorValue::Value(value) = document {
        if let TsqueryValue::Value(pattern) = query { return tsquery_match_evaluate(&value,&pattern); };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__ts_match_qv__ib1m(query: TsqueryValue, document: TsvectorValue) -> BoolValue {
    if let TsqueryValue::Error(error) = query { return BoolValue::Error(error); };
    if let TsvectorValue::Error(error) = document { return BoolValue::Error(error); };
    sql__pg_catalog__ts_match_vq__53kf(document,query)
}
