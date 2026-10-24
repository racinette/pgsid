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
struct TsvectorSortSource {
    lexemes: Vec<TsvectorLexeme>,
    positions: Vec<TsvectorPosition>,
    by_position: bool,
}
#[derive(Clone, Copy)]
struct TsvectorSortIndex { value: usize }
#[derive(Clone)]
struct TsvectorSortPlan { indexes: Vec<TsvectorSortIndex> }

fn tsvector_sort_compare(source: &TsvectorSortSource, plan: &TsvectorSortPlan, a: i32, b: i32) -> i32 {
    let left = plan.indexes[usize::try_from(a).unwrap_or(0)].value;
    let right = plan.indexes[usize::try_from(b).unwrap_or(0)].value;
    if source.by_position {
        if source.positions[left].position < source.positions[right].position { return -1; };
        if source.positions[left].position > source.positions[right].position { return 1; };
        return 0;
    };
    tsvector_lexeme_order(source.lexemes[left].text.as_str(),source.lexemes[right].text.as_str())
}
fn tsvector_sort_median(source: &TsvectorSortSource, plan: &TsvectorSortPlan, a: i32, b: i32, c: i32) -> i32 {
    if tsvector_sort_compare(source,plan,a,b) < 0 {
        if tsvector_sort_compare(source,plan,b,c) < 0 { return b; };
        if tsvector_sort_compare(source,plan,a,c) < 0 { return c; };
        return a;
    };
    if tsvector_sort_compare(source,plan,b,c) > 0 { return b; };
    if tsvector_sort_compare(source,plan,a,c) < 0 { return a; };
    c
}
fn tsvector_sort_swap(input: TsvectorSortPlan, a: i32, b: i32) -> TsvectorSortPlan {
    let mut indexes = input.indexes;
    let saved = indexes[usize::try_from(a).unwrap_or(0)];
    indexes[usize::try_from(a).unwrap_or(0)] = indexes[usize::try_from(b).unwrap_or(0)];
    indexes[usize::try_from(b).unwrap_or(0)] = saved;
    TsvectorSortPlan {indexes:indexes}
}
fn tsvector_sort_block(input: TsvectorSortPlan, a: i32, b: i32, count: i32) -> TsvectorSortPlan {
    let mut plan = input;
    let mut i: i32 = 0;
    while i < count { plan = tsvector_sort_swap(plan,a + i,b + i); i = i + 1; }
    plan
}
fn tsvector_sort_partition(source: &TsvectorSortSource, input: TsvectorSortPlan, start: i32, count: i32) -> TsvectorSortPlan {
    let mut plan = input;
    let mut low = start;
    let mut size = count;
    while size > 1 {
        if size < 7 {
            let mut i = low + 1;
            while i < low + size {
                let mut j = i;
                while j > low && tsvector_sort_compare(source,&plan,j - 1,j) > 0 {
                    plan = tsvector_sort_swap(plan,j,j - 1);
                    j = j - 1;
                }
                i = i + 1;
            }
            return plan;
        };
        let mut sorted = true;
        let mut scan = low + 1;
        while scan < low + size && sorted {
            if tsvector_sort_compare(source,&plan,scan - 1,scan) > 0 { sorted = false; };
            scan = scan + 1;
        }
        if sorted { return plan; };
        let mut middle = low + size / 2;
        if size > 7 {
            let mut first = low;
            let mut last = low + size - 1;
            if size > 40 {
                let step = size / 8;
                first = tsvector_sort_median(source,&plan,first,first + step,first + 2 * step);
                middle = tsvector_sort_median(source,&plan,middle - step,middle,middle + step);
                last = tsvector_sort_median(source,&plan,last - 2 * step,last - step,last);
            };
            middle = tsvector_sort_median(source,&plan,first,middle,last);
        };
        plan = tsvector_sort_swap(plan,low,middle);
        let mut a = low + 1;
        let mut b = a;
        let mut c = low + size - 1;
        let mut d = c;
        let mut partitioning = true;
        while partitioning {
            let mut scanning = true;
            while b <= c && scanning {
                let comparison = tsvector_sort_compare(source,&plan,b,low);
                if comparison > 0 { scanning = false; }
                else {
                    if comparison == 0 { plan = tsvector_sort_swap(plan,a,b); a = a + 1; };
                    b = b + 1;
                };
            }
            scanning = true;
            while b <= c && scanning {
                let comparison = tsvector_sort_compare(source,&plan,c,low);
                if comparison < 0 { scanning = false; }
                else {
                    if comparison == 0 { plan = tsvector_sort_swap(plan,c,d); d = d - 1; };
                    c = c - 1;
                };
            }
            if b > c { partitioning = false; }
            else { plan = tsvector_sort_swap(plan,b,c); b = b + 1; c = c - 1; };
        }
        let end = low + size;
        let mut extent = a - low;
        if b - a < extent { extent = b - a; };
        plan = tsvector_sort_block(plan,low,b - extent,extent);
        extent = d - c;
        if end - d - 1 < extent { extent = end - d - 1; };
        plan = tsvector_sort_block(plan,b,end - extent,extent);
        let left = b - a;
        let right = d - c;
        if left <= right {
            if left > 1 { plan = tsvector_sort_partition(source,plan,low,left); };
            low = end - right;
            size = right;
        } else {
            if right > 1 { plan = tsvector_sort_partition(source,plan,end - right,right); };
            size = left;
        };
    }
    plan
}
fn tsvector_sort(source: &TsvectorSortSource) -> TsvectorSortPlan {
    let mut count = source.lexemes.len();
    if source.by_position { count = source.positions.len(); };
    let mut indexes: Vec<TsvectorSortIndex> = Vec::new();
    let mut i: usize = 0;
    while i < count { indexes.push(TsvectorSortIndex {value:i}); i += 1; }
    let plan = TsvectorSortPlan {indexes:indexes};
    tsvector_sort_partition(source,plan,0,count as i32)
}
