pub(crate) fn xpath_eval_run(initial: XPathEvalTask, program: &XPathProgram, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let values: Vec<XPathEvalTask> = Vec::new(); let mut stack = XPathEvalStack { values, count: 0 };
    stack = xpath_eval_stack_push(stack,initial);
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    let mut result = xpath_value_empty(0,0);
    while stack.count > 0 {
        let task = stack.values[stack.count-1].clone(); stack = xpath_eval_stack_pop(stack);
        let mut header = task.header; let mut input = task.input; let mut output = task.output;
        let mut parameters = task.parameters; let mut predicates = task.predicates;
        let mut value = result; result = xpath_value_empty(0,0);
        if header.kind == XPATH_EVAL_EXPRESSION {
            let node = program.runtime.nodes[header.root];
            let mut cost: i32 = 1;
            if header.mode == 1 && (node.kind == XPATH_NUMBER || node.kind == XPATH_STRING || node.kind == XPATH_GROUP || node.kind == XPATH_PATH) { cost = 0; };
            if header.mode == 2 || header.mode == 3 {
                let direct = node.kind == XPATH_NUMBER || node.kind == XPATH_STRING || node.kind == XPATH_ROOT || node.kind == XPATH_CONTEXT || node.kind == XPATH_PATH || node.kind == XPATH_GROUP || (node.kind == XPATH_BINARY && node.operation == 14) || (node.kind == XPATH_FILTER && header.mode == 2);
                if direct == false { cost = 2; };
            };
            let fault = xpath_eval_depth_fault(header.depth,cost,program.budget.limit);
            if fault < 0 { return xpath_value_fault(0-fault); }; if fault > 0 { return xpath_value_empty(0,fault); };
            header = xpath_eval_depth(header,header.depth+cost);
            if node.kind == XPATH_NUMBER { let text = xpath_parse_text(program,node.name); result = xpath_number_text(text.as_str(),powers); }
            else if node.kind == XPATH_STRING { result = xpath_value_string(xpath_parse_text(program,node.name)); }
            else if node.kind == XPATH_VARIABLE {
                let mut fault: i32 = 5;
                if node.prefix.start != node.prefix.end { let prefix = xpath_parse_text(program,node.prefix); if xpath_namespace_defined(namespaces,prefix.as_str()) == false { fault = 19; }; };
                result = xpath_value_fault(fault);
            } else if node.kind == XPATH_CONTEXT { result = xpath_value_single(header.context.node); }
            else if node.kind == XPATH_ROOT { result = xpath_value_single(xpath_reference_node(0)); }
            else if node.kind == XPATH_GROUP {
                let mut current = header.root; let mut groups: usize = 0;
                while program.runtime.nodes[current].kind == XPATH_GROUP { current = program.runtime.nodes[current].left; groups += 1; }
                let mut extra: i32 = 0; if header.mode != 1 { extra = groups as i32-1; };
                let fault = xpath_eval_depth_fault(header.depth,extra,program.budget.limit);
                if fault < 0 { return xpath_value_fault(0-fault); }; if fault > 0 { return xpath_value_empty(0,fault); };
                header = xpath_eval_depth(header,header.depth+extra);
                let next = xpath_eval_state(header,XPATH_EVAL_GROUP,0,groups,0,0,0,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,current,header.context,header.mode,header.bound),header.depth);
            } else if node.kind == XPATH_STEP || node.kind == XPATH_PREDICATE {
                stack = xpath_eval_stack_child(stack,xpath_eval_input_task(XPATH_EVAL_COLLECT_START,header.root,header.context,header.mode,header.bound,xpath_value_single(header.context.node)),header.depth);
            } else if node.kind == XPATH_PATH {
                let next = xpath_eval_state(header,XPATH_EVAL_PATH,0,0,0,0,0,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,node.left,header.context,0,absent),header.depth);
            } else if node.kind == XPATH_NEGATE {
                let next = xpath_eval_state(header,XPATH_EVAL_NEGATE,0,0,0,0,0,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,node.left,header.context,0,absent),header.depth);
            } else if node.kind == XPATH_BINARY {
                let mut demand: i32 = 0; if node.operation == 14 && (header.mode == 2 || header.mode == 3) { demand = header.mode; };
                let next = xpath_eval_state(header,XPATH_EVAL_LEFT,0,0,0,0,demand,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,node.left,header.context,demand,header.bound),header.depth);
            } else if node.kind == XPATH_FILTER {
                let left_kind = program.runtime.nodes[node.left].kind; let position = xpath_constant_position(program,node.right,powers);
                let first = header.mode != 2 && position.valid && position.value == 1 && (left_kind == XPATH_GROUP || left_kind == XPATH_FILTER);
                let sorted_predicate = program.runtime.nodes[node.right]; let mut predicate = sorted_predicate; if sorted_predicate.kind == XPATH_GROUP { predicate = program.runtime.nodes[sorted_predicate.left]; }; let mut last = false;
                if left_kind == XPATH_GROUP && sorted_predicate.kind == XPATH_GROUP && predicate.kind == XPATH_FUNCTION && predicate.operation == 0 && predicate.prefix.start == predicate.prefix.end {
                    let name = xpath_parse_text(program,predicate.name); last = name.as_str() == "last";
                };
                let mut demand: i32 = 0; let mut selection: i32 = 0;
                if first { demand = 2; selection = 1; }; if last { demand = 3; selection = 2; };
                let next = xpath_eval_state(header,XPATH_EVAL_FILTER,0,0,0,selection,0,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,node.left,header.context,demand,absent),header.depth);
            } else if node.kind == XPATH_FUNCTION {
                if node.left == 0 { result = xpath_eval_function_finish(program,header.root,parameters,header.context,tree,graph,namespaces,powers); }
                else {
                    let fault = xpath_eval_depth_fault(header.depth,node.operation,program.budget.limit);
                    if fault < 0 { return xpath_value_fault(0-fault); }; if fault > 0 { return xpath_value_empty(0,fault); };
                    let mut cursor = node.left;
                    while cursor > 0 { let argument = program.runtime.nodes[cursor]; predicates.push(argument.right); cursor = argument.left; }
                    let count = predicates.len(); let first = predicates[count-1];
                    let next = xpath_eval_state(header,XPATH_EVAL_ARGUMENT,0,count-1,0,0,0,0,0,header.position_range);
                    stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                    stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,first,header.context,0,absent),header.depth+node.operation);
                };
            } else { result = xpath_value_fault(10); };
        } else if header.kind == XPATH_EVAL_GROUP {
            let mut groups = header.cursor;
            while groups > 0 { if header.mode != 1 { value = xpath_value_sorted(value,tree); }; groups = groups-1; }
            result = value;
        } else if header.kind == XPATH_EVAL_NEGATE {
            let converted = xpath_value_to_number(value,tree,graph,powers); let node = program.runtime.nodes[header.root];
            if converted.state != 0 || node.operation == 0 { result = converted; }
            else { result = xpath_value_number(-f64::from_bits(converted.number as u64)); };
        } else if header.kind == XPATH_EVAL_PATH {
            let node = program.runtime.nodes[header.root];
            stack = xpath_eval_stack_child(stack,xpath_eval_input_task(XPATH_EVAL_COLLECT_START,node.right,header.context,header.mode,header.bound,value),header.depth);
        } else if header.kind == XPATH_EVAL_LEFT {
            let node = program.runtime.nodes[header.root]; let demand = header.maximum;
            if node.operation == 14 && demand != 0 { value = xpath_value_sorted(value,tree); };
            if node.operation == 1 || node.operation == 2 {
                let boolean = xpath_value_to_boolean(&value);
                if boolean.state != 0 || (node.operation == 1 && boolean.boolean) || (node.operation == 2 && boolean.boolean == false) { result = boolean; }
                else {
                    let next = xpath_eval_state(header,XPATH_EVAL_BOOLEAN,0,0,0,0,0,0,0,header.position_range);
                    stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                    stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,node.right,header.context,0,absent),header.depth);
                };
            } else {
                let mut next_bound = header.bound;
                if demand != 0 && value.kind == XPATH_KIND_NODES && value.state == 0 && value.nodes.values.len() > 0 {
                    let mut index: usize = 0; if demand == 3 { index = value.nodes.values.len()-1; }; next_bound = value.nodes.values[index];
                };
                let next = xpath_eval_state(header,XPATH_EVAL_RIGHT,0,0,0,0,0,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,value,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,node.right,header.context,demand,next_bound),header.depth);
            };
        } else if header.kind == XPATH_EVAL_BOOLEAN { result = xpath_value_to_boolean(&value); }
        else if header.kind == XPATH_EVAL_RIGHT {
            let node = program.runtime.nodes[header.root]; result = xpath_eval_binary_finish(input,value,node.operation,tree,graph,powers);
        } else if header.kind == XPATH_EVAL_ARGUMENT {
            parameters = xpath_arguments_add(parameters,value);
            if header.cursor == 0 { result = xpath_eval_function_finish(program,header.root,parameters,header.context,tree,graph,namespaces,powers); }
            else {
                let cursor = header.cursor-1; let following = predicates[cursor];
                let next = xpath_eval_state(header,XPATH_EVAL_ARGUMENT,0,cursor,0,0,0,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,following,header.context,0,absent),header.depth+cursor as i32+1);
            };
        } else if header.kind == XPATH_EVAL_FILTER {
            let node = program.runtime.nodes[header.root];
            if value.kind != XPATH_KIND_NODES { result = xpath_value_fault(11); }
            else if value.state != 0 { result = value; }
            else if header.minimum != 0 {
                if value.nodes.values.len() == 0 { result = value; }
                else { let mut index: usize = 0; if header.minimum == 2 { index = value.nodes.values.len()-1; }; result = xpath_value_single(value.nodes.values[index]); };
            } else {
                let mut maximum = value.nodes.values.len() as i32; if header.mode == 2 { maximum = 1; };
                let state = xpath_eval_depth(xpath_eval_header(XPATH_EVAL_FILTER_START,node.right,header.context,0,absent),header.depth);
                let next = xpath_eval_state(state,XPATH_EVAL_FILTER_START,0,0,0,1,maximum,0,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,value,output,parameters,predicates));
            };
        } else if header.kind == XPATH_EVAL_FILTER_START {
            if input.state < 0 || input.state >= 2 { result = input; }
            else if input.kind != XPATH_KIND_NODES { result = xpath_value_fault(11); }
            else if input.state != 0 { result = input; }
            else if (input.nodes.values.len() as i32) < header.minimum { result = xpath_value_empty(XPATH_KIND_NODES,0); }
            else {
                let next = xpath_eval_state(header,XPATH_EVAL_FILTER_NEXT,0,0,0,header.minimum,header.maximum,0,0,header.position_range);
                output = xpath_value_empty(XPATH_KIND_NODES,0);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
            };
        } else if header.kind == XPATH_EVAL_FILTER_NEXT {
            if header.index >= input.nodes.values.len() || (header.maximum > 0 && header.matched == header.maximum) { result = output; }
            else {
                let context = XPathContext { node: input.nodes.values[header.index], position: header.index as i32+1, size: input.nodes.values.len() as i32 };
                let next = xpath_eval_state(header,XPATH_EVAL_FILTER_RESULT,header.index,0,0,header.minimum,header.maximum,header.matched,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                stack = xpath_eval_stack_child(stack,xpath_eval_start(XPATH_EVAL_EXPRESSION,header.root,context,1,absent),header.depth);
            };
        } else if header.kind == XPATH_EVAL_FILTER_RESULT {
            if value.state != 0 { result = xpath_value_empty(XPATH_KIND_NODES,value.state); }
            else {
                let mut keep = xpath_value_truth(&value);
                if value.kind == XPATH_KIND_NUMBER { keep = f64::from_bits(value.number as u64) == (header.index as i32+1) as f64; };
                let mut matched = header.matched;
                if keep {
                    matched = matched+1;
                    if matched >= header.minimum && matched <= header.maximum { output = xpath_eval_append(output,input.nodes.values[header.index]); };
                };
                let next = xpath_eval_state(header,XPATH_EVAL_FILTER_NEXT,header.index+1,0,0,header.minimum,header.maximum,matched,0,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
            };
        } else if header.kind == XPATH_EVAL_COLLECT_START {
            if input.state < 0 || input.state >= 2 { result = input; }
            else if input.kind != XPATH_KIND_NODES { result = xpath_value_fault(11); }
            else {
                let mut index = header.root;
                while program.runtime.nodes[index].kind == XPATH_PREDICATE { predicates.push(program.runtime.nodes[index].right); index = program.runtime.nodes[index].left; }
                let step = program.runtime.nodes[index]; let test = xpath_node_test(program,step,namespaces);
                if test.valid == false { result = xpath_value_fault(19); }
                else if input.state != 0 { result = input; }
                else {
                    let mut position_range = XPathPosition { valid: false, value: 0 };
                    if predicates.len() > 0 { position_range = xpath_constant_position(program,predicates[0],powers); };
                    let next = xpath_eval_state(header,XPATH_EVAL_COLLECT_NEXT,0,0,index,0,0,0,0,position_range);
                    output = xpath_value_empty(XPATH_KIND_NODES,0);
                    stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                };
            };
        } else if header.kind == XPATH_EVAL_COLLECT_NEXT {
            if header.index >= input.nodes.values.len() { result = output; }
            else {
                let step = program.runtime.nodes[header.step]; let test = xpath_node_test(program,step,namespaces);
                let mut maximum: i32 = 0;
                if header.position_range.valid && predicates.len() == 1 { maximum = header.position_range.value; if maximum == 0 { maximum = -1; }; };
                let window = xpath_axis_window(tree,graph,input.nodes.values[header.index],step.operation,&test,header.mode,header.bound,header.visited,maximum);
                let positioned = window.positioned; let visited = window.visited; let sequence = window.sequence; let mut cursor: usize = 0;
                if positioned {
                    if sequence.cyclic { result = xpath_value_empty(XPATH_KIND_NODES,2); } else { result = xpath_value_nodes(sequence); };
                } else if header.position_range.valid && predicates.len() == 1 {
                    if sequence.cyclic && header.position_range.value <= 0 { result = xpath_value_empty(XPATH_KIND_NODES,2); }
                    else {
                        let found = xpath_sequence_position(&sequence,header.position_range.value);
                        if found.known == false { result = xpath_value_empty(XPATH_KIND_NODES,2); } else { result = xpath_value_single(found.value); };
                    };
                } else if header.mode == 1 && predicates.len() == 0 && sequence.values.len() > 0 { result = xpath_value_single(sequence.values[0]); }
                else {
                    if sequence.cyclic && sequence.values.len() > sequence.cycle { result = xpath_value_fault(15); }
                    else { result = xpath_value_nodes(sequence); cursor = predicates.len(); };
                };
                if result.state == 0 && result.nodes.values.len() > 0 && cursor > 0 {
                    let mut recursive = cursor as i32-1; if header.position_range.valid && cursor > 1 { recursive = recursive-1; };
                    let fault = xpath_eval_depth_fault(header.depth,recursive,program.budget.limit);
                    if fault < 0 { return xpath_value_fault(0-fault); }; if fault > 0 { return xpath_value_empty(0,fault); };
                };
                if result.state == 0 {
                    let next = xpath_eval_state(header,XPATH_EVAL_COLLECT_PREDICATE,header.index,cursor,header.step,0,0,0,visited,header.position_range);
                    stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                };
            };
        } else if header.kind == XPATH_EVAL_COLLECT_PREDICATE {
            if value.state != 0 { result = value; }
            else if header.cursor > 0 {
                let remaining = header.cursor-1; let predicate = predicates[remaining];
                let mut minimum: i32 = 1; let mut maximum = value.nodes.values.len() as i32; let mut cursor = remaining;
                if header.position_range.valid && remaining == 1 { minimum = header.position_range.value; maximum = header.position_range.value; cursor = 0; };
                let mut recursive = remaining as i32; if header.position_range.valid && predicates.len() > 1 { recursive = recursive-1; };
                let next = xpath_eval_state(header,XPATH_EVAL_COLLECT_PREDICATE,header.index,cursor,header.step,0,0,0,header.visited,header.position_range);
                stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                let state = xpath_eval_depth(xpath_eval_header(XPATH_EVAL_FILTER_START,predicate,header.context,0,absent),header.depth+recursive);
                let filter = xpath_eval_state(state,XPATH_EVAL_FILTER_START,0,0,0,minimum,maximum,0,0,header.position_range);
                let empty = xpath_value_empty(0,0); let args = xpath_arguments_empty(); let pending: Vec<usize> = Vec::new();
                stack = xpath_eval_stack_push(stack,xpath_eval_task(filter,value,empty,args,pending));
            } else {
                let a = XPathNodes { values: output.nodes.values }; let b = XPathNodes { values: value.nodes.values }; let merged = xpath_nodes_merge(a,&b,tree);
                output = xpath_value_nodes(XPathSequence { values: merged.values, cyclic: false, cycle: 0 });
                if header.mode == 1 && output.nodes.values.len() > 0 { result = output; }
                else {
                    let next = xpath_eval_state(header,XPATH_EVAL_COLLECT_NEXT,header.index+1,0,header.step,0,0,0,header.visited,header.position_range);
                    stack = xpath_eval_stack_push(stack,xpath_eval_task(next,input,output,parameters,predicates));
                };
            };
        } else { result = xpath_value_fault(10); };
        if result.state < 0 || result.state >= 2 { return result; };
    }
    result
}
