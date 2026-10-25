fn ts_rank_distance(distance: i32) -> f64 {
    if distance > 100 { return ts_rank_single(1.0e-30f64); };
    float4_number(TS_RANK_DISTANCE_BITS[usize::try_from(distance-1).unwrap_or(0)])
}

fn ts_rank_or(weights: &TsRankWeightSet, document: &TsvectorPayload, query: &TsqueryPayload, operands: &TsRankOperandList) -> f64 {
    let mut result = 0.0f64;
    let mut index: usize = 0;
    while index < operands.items.len() {
        let operand = query.nodes[operands.items[index]].clone();
        let entries = ts_rank_find(document,&operand);
        let mut entry: usize = 0;
        while entry < entries.count {
            let lexeme = document.lexemes[entries.start+entry].clone();
            let mut count = lexeme.positions.len();
            if count == 0 { count = 1; };
            let mut partial = 0.0f64;
            let mut maximum = -1.0f64;
            let mut selected: usize = 0;
            let mut position: usize = 0;
            while position < count {
                let mut weight: i32 = 0;
                if lexeme.positions.len() > 0 { weight = lexeme.positions[position].weight; };
                let value = ts_rank_weight(weights,weight);
                let order = position as i32 + 1;
                partial = ts_rank_single(partial + ts_rank_single(value / ((order*order) as f64)));
                if value > maximum { maximum = value; selected = position; };
                position += 1;
            }
            let order = selected as i32 + 1;
            let numerator = ts_rank_single(ts_rank_single(maximum+partial) - ts_rank_single(maximum / ((order*order) as f64)));
            result = ts_rank_single(result + numerator / 1.64493406685f64);
            entry += 1;
        }
        index += 1;
    }
    if operands.items.len() > 0 { result = ts_rank_single(result / ts_rank_single((operands.items.len() as i32) as f64)); };
    result
}

fn ts_rank_and(weights: &TsRankWeightSet, document: &TsvectorPayload, query: &TsqueryPayload, operands: &TsRankOperandList) -> f64 {
    if operands.items.len() < 2 { return ts_rank_or(weights,document,query,operands); };
    let mut previous: Vec<TsRankPrevious> = Vec::new();
    let mut index: usize = 0;
    while index < operands.items.len() { previous.push(TsRankPrevious {entry:-1}); index += 1; }
    let mut result = -1.0f64;
    index = 0;
    while index < operands.items.len() {
        let operand = query.nodes[operands.items[index]].clone();
        let entries = ts_rank_find(document,&operand);
        let mut entry: usize = 0;
        while entry < entries.count {
            let current = entries.start + entry;
            previous[index] = TsRankPrevious {entry:current as i32};
            let lexeme = document.lexemes[current].clone();
            let mut count = lexeme.positions.len();
            if count == 0 { count = 1; };
            let mut earlier: usize = 0;
            while earlier < index {
                if previous[earlier].entry >= 0 {
                    let old = document.lexemes[usize::try_from(previous[earlier].entry).unwrap_or(0)].clone();
                    let mut old_count = old.positions.len();
                    if old_count == 0 { old_count = 1; };
                    let mut p: usize = 0;
                    while p < count {
                        let mut a: i32 = 16383;
                        let mut aw: i32 = 0;
                        if lexeme.positions.len() > 0 { a = lexeme.positions[p].position; aw = lexeme.positions[p].weight; };
                        let mut q: usize = 0;
                        while q < old_count {
                            let mut b: i32 = 16383;
                            let mut bw: i32 = 0;
                            if old.positions.len() > 0 { b = old.positions[q].position; bw = old.positions[q].weight; };
                            let mut distance = a-b;
                            if distance < 0 { distance = 0-distance; };
                            if distance != 0 || lexeme.positions.len() == 0 || old.positions.len() == 0 {
                                if distance == 0 { distance = 16384; };
                                let pair = ts_rank_single(ts_rank_weight(weights,aw)*ts_rank_weight(weights,bw));
                                let product = ts_rank_single(pair*ts_rank_distance(distance));
                                let value = ts_rank_single(product.sqrt());
                                if result < 0.0f64 { result = value; }
                                else { result = ts_rank_single(1.0f64-(1.0f64-result)*(1.0f64-value)); };
                            };
                            q += 1;
                        }
                        p += 1;
                    }
                };
                earlier += 1;
            }
            entry += 1;
        }
        index += 1;
    }
    result
}

fn ts_rank_calculate(weights: &TsRankWeightSet, document: &TsvectorPayload, query: &TsqueryPayload, method: i32) -> f64 {
    if document.lexemes.len() == 0 || query.nodes.len() == 0 { return 0.0f64; };
    let operands = ts_rank_items(query);
    let root = query.nodes[query.root].clone();
    let mut result = 0.0f64;
    if root.kind == 2 || root.kind == 4 { result = ts_rank_and(weights,document,query,&operands); }
    else { result = ts_rank_or(weights,document,query,&operands); };
    if result < 0.0f64 { result = ts_rank_single(1.0e-20f64); };
    let length = ts_rank_length(document);
    if ts_rank_flag(method,1) { result = ts_rank_single(result / (((length+1) as f64).ln()/2.0f64.ln())); };
    if ts_rank_flag(method,2) && length > 0 { result = ts_rank_single(result / ts_rank_single(length as f64)); };
    let unique = document.lexemes.len() as i32;
    if ts_rank_flag(method,8) { result = ts_rank_single(result / ts_rank_single(unique as f64)); };
    if ts_rank_flag(method,16) { result = ts_rank_single(result / (((unique+1) as f64).ln()/2.0f64.ln())); };
    if ts_rank_flag(method,32) { result = ts_rank_single(result / ts_rank_single(result+1.0f64)); };
    result
}

fn ts_rank_run(weights: ArrayValue, document: TsvectorValue, query: TsqueryValue, method: Int4Value, defaults: bool) -> Float4Value {
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
                let result = ts_rank_calculate(&selected,&value,&pattern,normalization);
                if result != result { return Float4Value::UnspecifiedNan; };
                return make_float4_bits((result as f32).to_bits() as i32);
            };
        };
    };
    Float4Value::Unknown
}

pub fn sql__pg_catalog__ts_rank__hfbf(weights: ArrayValue, document: TsvectorValue, query: TsqueryValue) -> Float4Value { ts_rank_run(weights,document,query,make_int4_value(0),false) }
pub fn sql__pg_catalog__ts_rank__wvbm(weights: ArrayValue, document: TsvectorValue, query: TsqueryValue, method: Int4Value) -> Float4Value { ts_rank_run(weights,document,query,method,false) }
pub fn sql__pg_catalog__ts_rank__fite(document: TsvectorValue, query: TsqueryValue) -> Float4Value { ts_rank_run(ArrayValue::Null,document,query,make_int4_value(0),true) }
pub fn sql__pg_catalog__ts_rank__d2j5(document: TsvectorValue, query: TsqueryValue, method: Int4Value) -> Float4Value { ts_rank_run(ArrayValue::Null,document,query,method,true) }
