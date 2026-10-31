const FLOAT_ARITHMETIC_ZERO: u32 = 3452582;
fn float_arithmetic(left: Float8Value, right: Float8Value, mode: i32, single: bool) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = left { unresolved_flavor = 1; };
    if let Float8Value::Unknown = right { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = right { unresolved_flavor = 2; };
 if let Float8Value::Error(error)=left {return Float8Value::Error(error);}
 if let Float8Value::Error(error)=right {return Float8Value::Error(error);}
 let mut condition_flavor_10_1: i32 = unresolved_flavor; if let Float8Value::Unknown = left { if condition_flavor_10_1 < 1 { condition_flavor_10_1 = 1; }; }; if let Float8Value::Unimplemented = left { condition_flavor_10_1 = 2; }; if let Float8Value::Unknown = right { if condition_flavor_10_1 < 1 { condition_flavor_10_1 = 1; }; }; if let Float8Value::Unimplemented = right { condition_flavor_10_1 = 2; }; if (left == Float8Value::Unknown || left == Float8Value::Unimplemented) || (right == Float8Value::Unknown || right == Float8Value::Unimplemented) {return float8_unresolved(condition_flavor_10_1);}
 if left==Float8Value::Null || right==Float8Value::Null {return Float8Value::Null;}
 let known_left=float8_semantic(left);let known_right=float8_semantic(right);
 if let Float8Value::Value(a_bits)=known_left {if let Float8Value::Value(b_bits)=known_right {
  let a=float8_number(a_bits);let b=float8_number(b_bits);let infinity=1.0f64/0.0f64;
  if mode==3 && b==0.0f64 && a==a {return Float8Value::Error(make_sql_error(FLOAT_ARITHMETIC_ZERO));}
  let mut value=0.0f64;
  if mode==0 {value=a+b;};if mode==1 {value=a-b;};if mode==2 {value=a*b;};if mode==3 {value=a/b;};
  if single {let bits=(value as f32).to_bits() as i32;value=float4_number(bits);};
  if value.abs()==infinity && a.abs()!=infinity && (mode==3 || b.abs()!=infinity) {return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));}
  if value==0.0f64 && a!=0.0f64 && ((mode==2 && b!=0.0f64) || (mode==3 && b.abs()!=infinity)) {return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));}
  if value!=value {return Float8Value::UnspecifiedNan;};
  return make_float8_value(value);
 };};let mut local_flavor_23_5: i32 = unresolved_flavor; if let Float8Value::Unknown = known_right { if local_flavor_23_5 < 1 { local_flavor_23_5 = 1; }; }; if let Float8Value::Unimplemented = known_right { local_flavor_23_5 = 2; }; if let Float8Value::Unknown = known_left { if local_flavor_23_5 < 1 { local_flavor_23_5 = 1; }; }; if let Float8Value::Unimplemented = known_left { local_flavor_23_5 = 2; }; float8_unresolved(local_flavor_23_5)
}


pub fn sql__pg_catalog__float48div__rlvj(left: Float4Value, right: Float8Value) -> Float8Value {float_arithmetic(float4_widen(left), right, 3, false)}

pub fn sql__pg_catalog__float48mi__j57p(left: Float4Value, right: Float8Value) -> Float8Value {float_arithmetic(float4_widen(left), right, 1, false)}

pub fn sql__pg_catalog__float48mul__vt4x(left: Float4Value, right: Float8Value) -> Float8Value {float_arithmetic(float4_widen(left), right, 2, false)}

pub fn sql__pg_catalog__float48pl__w08q(left: Float4Value, right: Float8Value) -> Float8Value {float_arithmetic(float4_widen(left), right, 0, false)}

pub fn sql__pg_catalog__float4abs__svtc(left: Float4Value) -> Float4Value {if let Float4Value::Value(bits)=left {let signed=bits as i64;let mut output=signed;if signed<0i64 {output=signed-(-2147483648i64);} ;return make_float4_bits(output as i32);};left}

pub fn sql__pg_catalog__float4div__27d0(left: Float4Value, right: Float4Value) -> Float4Value {float8_narrow(float_arithmetic(float4_widen(left), float4_widen(right), 3, true))}

pub fn sql__pg_catalog__float4larger__bpdf(left: Float4Value, right: Float4Value) -> Float4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Float4Value::Unknown = left { unresolved_flavor = 1; };
    if let Float4Value::Unknown = right { unresolved_flavor = 1; };
    if let Float4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Float4Value::Unimplemented = right { unresolved_flavor = 2; };let order=float8_compare(float4_widen(left),float4_widen(right));if let Int4Value::Error(error)=order {return Float4Value::Error(error);};let mut condition_flavor_44_211: i32 = unresolved_flavor; if let Int4Value::Unknown = order { if condition_flavor_44_211 < 1 { condition_flavor_44_211 = 1; }; }; if let Int4Value::Unimplemented = order { condition_flavor_44_211 = 2; }; if (order == Int4Value::Unknown || order == Int4Value::Unimplemented) {return float4_unresolved(condition_flavor_44_211);};if order==Int4Value::Null {return Float4Value::Null;};if let Int4Value::Value(value)=order {if value > 0 {return left;}return right;};float4_unresolved(unresolved_flavor)}

pub fn sql__pg_catalog__float4mi__vetq(left: Float4Value, right: Float4Value) -> Float4Value {float8_narrow(float_arithmetic(float4_widen(left), float4_widen(right), 1, true))}

pub fn sql__pg_catalog__float4mul__1pfj(left: Float4Value, right: Float4Value) -> Float4Value {float8_narrow(float_arithmetic(float4_widen(left), float4_widen(right), 2, true))}

pub fn sql__pg_catalog__float4pl__1qe3(left: Float4Value, right: Float4Value) -> Float4Value {float8_narrow(float_arithmetic(float4_widen(left), float4_widen(right), 0, true))}

pub fn sql__pg_catalog__float4smaller__1d11(left: Float4Value, right: Float4Value) -> Float4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Float4Value::Unknown = left { unresolved_flavor = 1; };
    if let Float4Value::Unknown = right { unresolved_flavor = 1; };
    if let Float4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Float4Value::Unimplemented = right { unresolved_flavor = 2; };let order=float8_compare(float4_widen(left),float4_widen(right));if let Int4Value::Error(error)=order {return Float4Value::Error(error);};let mut condition_flavor_57_211: i32 = unresolved_flavor; if let Int4Value::Unknown = order { if condition_flavor_57_211 < 1 { condition_flavor_57_211 = 1; }; }; if let Int4Value::Unimplemented = order { condition_flavor_57_211 = 2; }; if (order == Int4Value::Unknown || order == Int4Value::Unimplemented) {return float4_unresolved(condition_flavor_57_211);};if order==Int4Value::Null {return Float4Value::Null;};if let Int4Value::Value(value)=order {if value < 0 {return left;}return right;};float4_unresolved(unresolved_flavor)}

pub fn sql__pg_catalog__float4um__4uu4(left: Float4Value) -> Float4Value {if let Float4Value::Value(bits)=left {let signed=bits as i64;let mut output=signed;if signed<0i64 {output=signed-(-2147483648i64);} else {output=signed+(-2147483648i64);};return make_float4_bits(output as i32);};left}

pub fn sql__pg_catalog__float4up__fygi(left: Float4Value) -> Float4Value {left}

pub fn sql__pg_catalog__float84div__ck25(left: Float8Value, right: Float4Value) -> Float8Value {float_arithmetic(left, float4_widen(right), 3, false)}

pub fn sql__pg_catalog__float84mi__megv(left: Float8Value, right: Float4Value) -> Float8Value {float_arithmetic(left, float4_widen(right), 1, false)}

pub fn sql__pg_catalog__float84mul__f3k3(left: Float8Value, right: Float4Value) -> Float8Value {float_arithmetic(left, float4_widen(right), 2, false)}

pub fn sql__pg_catalog__float84pl__v598(left: Float8Value, right: Float4Value) -> Float8Value {float_arithmetic(left, float4_widen(right), 0, false)}

pub fn sql__pg_catalog__float8abs__fq86(left: Float8Value) -> Float8Value {if let Float8Value::Value(bits)=left {let signed=bits;let mut output=signed;if signed<0i64 {output=signed-(-9223372036854775808i64);} ;return make_float8_bits(output);};left}

pub fn sql__pg_catalog__float8div__kumj(left: Float8Value, right: Float8Value) -> Float8Value {float_arithmetic(left, right, 3, false)}

pub fn sql__pg_catalog__float8larger__b58s(left: Float8Value, right: Float8Value) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = left { unresolved_flavor = 1; };
    if let Float8Value::Unknown = right { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = right { unresolved_flavor = 2; };let order=float8_compare(left,right);if let Int4Value::Error(error)=order {return Float8Value::Error(error);};let mut condition_flavor_80_183: i32 = unresolved_flavor; if let Int4Value::Unknown = order { if condition_flavor_80_183 < 1 { condition_flavor_80_183 = 1; }; }; if let Int4Value::Unimplemented = order { condition_flavor_80_183 = 2; }; if (order == Int4Value::Unknown || order == Int4Value::Unimplemented) {return float8_unresolved(condition_flavor_80_183);};if order==Int4Value::Null {return Float8Value::Null;};if let Int4Value::Value(value)=order {if value > 0 {return left;}return right;};float8_unresolved(unresolved_flavor)}

pub fn sql__pg_catalog__float8mi__r1nu(left: Float8Value, right: Float8Value) -> Float8Value {float_arithmetic(left, right, 1, false)}

pub fn sql__pg_catalog__float8mul__d3nd(left: Float8Value, right: Float8Value) -> Float8Value {float_arithmetic(left, right, 2, false)}

pub fn sql__pg_catalog__float8pl__g3ou(left: Float8Value, right: Float8Value) -> Float8Value {float_arithmetic(left, right, 0, false)}

pub fn sql__pg_catalog__float8smaller__sp3n(left: Float8Value, right: Float8Value) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = left { unresolved_flavor = 1; };
    if let Float8Value::Unknown = right { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = right { unresolved_flavor = 2; };let order=float8_compare(left,right);if let Int4Value::Error(error)=order {return Float8Value::Error(error);};let mut condition_flavor_93_183: i32 = unresolved_flavor; if let Int4Value::Unknown = order { if condition_flavor_93_183 < 1 { condition_flavor_93_183 = 1; }; }; if let Int4Value::Unimplemented = order { condition_flavor_93_183 = 2; }; if (order == Int4Value::Unknown || order == Int4Value::Unimplemented) {return float8_unresolved(condition_flavor_93_183);};if order==Int4Value::Null {return Float8Value::Null;};if let Int4Value::Value(value)=order {if value < 0 {return left;}return right;};float8_unresolved(unresolved_flavor)}

pub fn sql__pg_catalog__float8um__3uy5(left: Float8Value) -> Float8Value {if let Float8Value::Value(bits)=left {let signed=bits;let mut output=signed;if signed<0i64 {output=signed-(-9223372036854775808i64);} else {output=signed+(-9223372036854775808i64);};return make_float8_bits(output);};left}

pub fn sql__pg_catalog__float8up__8n3o(left: Float8Value) -> Float8Value {left}

pub fn sql__pg_catalog__abs__csap(input: Float4Value) -> Float4Value {
    sql__pg_catalog__float4abs__svtc(input)
}

pub fn sql__pg_catalog__abs__wle0(input: Float8Value) -> Float8Value {
    sql__pg_catalog__float8abs__fq86(input)
}
