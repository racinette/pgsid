/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2010-2017 Christopher Swenson.
 * Copyright (c) 2012 Vojtech Fried.
 * Copyright (c) 2012 Google Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
#[derive(Clone, Copy)]
struct XPathSortRun { start: usize, length: usize }

#[derive(Clone)]
struct XPathRunResult { nodes: XPathNodes, length: usize }

pub(crate) fn xpath_sort_insert(input: XPathNodes, tree: &XmlTree, begin: usize, start: usize, end: usize) -> XPathNodes {
    let mut values = input.values; let mut index = begin+start;
    while index < end {
        if xpath_reference_order(tree,values[index-1],values[index]) > 0 {
            let candidate = values[index];
            let mut lower = begin; let mut upper = index-1;
            let mut location = begin;
            if xpath_reference_order(tree,candidate,values[begin]) >= 0 {
                location = upper;
                if xpath_reference_order(tree,candidate,values[upper]) <= 0 {
                    let mut middle = lower+usize::try_from(((upper-lower) as i32)/2).unwrap_or(0);
                    let mut searching = true;
                    while searching {
                        if xpath_reference_order(tree,candidate,values[middle]) < 0 {
                            if middle-lower <= 1 { location = middle; searching = false; }
                            else { upper = middle; };
                        } else {
                            if upper-middle <= 1 { location = middle+1; searching = false; }
                            else { lower = middle; };
                        };
                        if searching { middle = lower+usize::try_from(((upper-lower) as i32)/2).unwrap_or(0); };
                    }
                };
            };
            let mut cursor = index;
            while cursor > location { values[cursor] = values[cursor-1]; cursor = cursor-1; }
            values[location] = candidate;
        };
        index += 1;
    }
    XPathNodes { values }
}

pub(crate) fn xpath_sort_run(input: XPathNodes, tree: &XmlTree, start: usize) -> XPathRunResult {
    let mut values = input.values; let size = values.len();
    if size-start == 1 { return XPathRunResult { nodes: XPathNodes { values }, length: 1 }; };
    if start >= size-2 {
        if xpath_reference_order(tree,values[size-2],values[size-1]) > 0 {
            let saved = values[size-2]; values[size-2] = values[size-1]; values[size-1] = saved;
        };
        return XPathRunResult { nodes: XPathNodes { values }, length: 2 };
    };
    let decreasing = xpath_reference_order(tree,values[start],values[start+1]) > 0;
    let mut current = start+2; let mut scanning = true;
    while current < size-1 && scanning {
        let compared = xpath_reference_order(tree,values[current-1],values[current]);
        if (decreasing && compared <= 0) || (decreasing == false && compared > 0) { scanning = false; }
        else { current += 1; };
    }
    if decreasing {
        let mut left = start; let mut right = current-1;
        while left < right {
            let saved = values[left]; values[left] = values[right]; values[right] = saved;
            left += 1; right = right-1;
        }
    };
    XPathRunResult { nodes: XPathNodes { values }, length: current-start }
}

pub(crate) fn xpath_sort_merge(input: XPathNodes, tree: &XmlTree, start: usize, left: usize, right: usize) -> XPathNodes {
    let mut values = input.values; let mut buffer: Vec<XPathReference> = Vec::new();
    let end = start+left+right;
    if left < right {
        let mut index: usize = 0;
        while index < left { buffer.push(values[start+index]); index += 1; }
        let mut a: usize = 0; let mut b = start+left; let mut target = start; let mut merging = true;
        while target < end && merging {
            if a < left && b < end {
                if xpath_reference_order(tree,buffer[a],values[b]) <= 0 { values[target] = buffer[a]; a += 1; }
                else { values[target] = values[b]; b += 1; };
            } else if a < left { values[target] = buffer[a]; a += 1; }
            else { merging = false; };
            target += 1;
        }
    } else {
        let mut index: usize = 0;
        while index < right { buffer.push(values[start+left+index]); index += 1; }
        let mut a = right; let mut b = start+left; let mut target = end; let mut merging = true;
        while target > start && merging {
            target = target-1;
            if a > 0 && b > start {
                if xpath_reference_order(tree,values[b-1],buffer[a-1]) > 0 { b = b-1; values[target] = values[b]; }
                else { a = a-1; values[target] = buffer[a]; };
            } else if a > 0 { a = a-1; values[target] = buffer[a]; }
            else { merging = false; };
        }
    };
    XPathNodes { values }
}

pub(crate) fn xpath_nodes_sort(input: XPathNodes, tree: &XmlTree) -> XPathNodes {
    let size = input.values.len();
    if size <= 1 { return input; };
    if size < 64 { return xpath_sort_insert(input,tree,0,1,size); };
    let mut nodes = input;
    let mut minimum = size as i32; let mut remainder: i32 = 0;
    while minimum >= 64 { if minimum%2 != 0 { remainder = 1; }; minimum = minimum/2; }
    let minrun = usize::try_from(minimum+remainder).unwrap_or(0);
    let mut runs: Vec<XPathSortRun> = Vec::new(); let mut count: usize = 0;
    let mut cursor: usize = 0; let mut pushed: usize = 0;
    while cursor < size {
        let mut invariant = true;
        if count == 2 { invariant = runs[0].length > runs[1].length; };
        if count >= 3 { invariant = runs[count-3].length > runs[count-2].length+runs[count-1].length && runs[count-2].length > runs[count-1].length; };
        if pushed >= 3 && invariant == false {
            let mut collapsing = true;
            while count > 1 && collapsing {
                let mut merge = count-2;
                if count == 2 {
                    if runs[0].length+runs[1].length != size && runs[0].length > runs[1].length { collapsing = false; };
                } else {
                    let b = runs[count-3].length; let c = runs[count-2].length; let d = runs[count-1].length;
                    let mut previous = false;
                    if count >= 4 { previous = runs[count-4].length <= b+c; };
                    let bcd = b <= c+d || previous; let cd = c <= d;
                    if bcd == false && cd == false { collapsing = false; };
                    if bcd && cd == false { merge = count-3; };
                };
                if collapsing {
                    let first = runs[merge]; let second = runs[merge+1];
                    nodes = xpath_sort_merge(nodes,tree,first.start,first.length,second.length);
                    runs[merge] = XPathSortRun { start: first.start, length: first.length+second.length };
                    if merge+2 < count { runs[merge+1] = runs[merge+2]; };
                    count = count-1;
                    if count == 1 { collapsing = false; };
                };
            }
        } else {
            let found = xpath_sort_run(nodes,tree,cursor); let mut length = found.length; nodes = found.nodes;
            let mut wanted = minrun; if wanted > size-cursor { wanted = size-cursor; };
            if wanted > length { nodes = xpath_sort_insert(nodes,tree,cursor,length,cursor+wanted); length = wanted; };
            let run = XPathSortRun { start: cursor, length };
            if count < runs.len() { runs[count] = run; } else { runs.push(run); };
            count += 1; cursor += length; pushed += 1;
        };
    }
    while count > 1 {
        let first = runs[count-2]; let second = runs[count-1];
        nodes = xpath_sort_merge(nodes,tree,first.start,first.length,second.length);
        runs[count-2] = XPathSortRun { start: first.start, length: first.length+second.length };
        count = count-1;
    }
    nodes
}
