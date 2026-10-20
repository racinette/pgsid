import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'

const equality = Object.values(PG18_RANGE_TYPES)
  .map((m) => {
    const prefix = m.subtype.slice('pg_catalog.'.length).replaceAll('"', '')
    return `if kind==${({ 'pg_catalog.int4': 2, 'pg_catalog.int8': 3, 'pg_catalog.date': 7, 'pg_catalog."numeric"': 10, 'pg_catalog."timestamp"': 4, 'pg_catalog.timestamptz': 5 } as Record<string, number>)[m.subtype]} {return array_element_to_${prefix}(a)==array_element_to_${prefix}(b);};`
  })
  .join('\n')

export const multirangeExactProbe = String.raw`
fn multirange_fixture_cell_exact(a:ArrayElement,b:ArrayElement,kind:i32)->bool {
${equality}
 false
}
fn multirange_fixture_span_exact(a:&RangePayload,b:&RangePayload)->bool {
 if a.type_name.as_str()!=b.type_name.as_str() || a.element_type.as_str()!=b.element_type.as_str() || a.element_kind!=b.element_kind || a.empty!=b.empty || a.lower_inclusive!=b.lower_inclusive || a.upper_inclusive!=b.upper_inclusive || a.bounds.len()!=b.bounds.len() {return false;};
 let mut i:usize=0;
 while i<a.bounds.len() {if multirange_fixture_cell_exact(a.bounds[i].clone(),b.bounds[i].clone(),a.element_kind)==false {return false;};i+=1;}
 true
}
pub fn multirange_fixture_exact(actual:MultirangeValue,expected:MultirangeValue)->BoolValue {
 if let MultirangeValue::Error(error)=actual {return BoolValue::Error(error);};
 if let MultirangeValue::Error(error)=expected {return BoolValue::Error(error);};
 if let MultirangeValue::Unknown=actual {return BoolValue::Unknown;};
 if let MultirangeValue::Unknown=expected {return BoolValue::Unknown;};
 if let MultirangeValue::Null=actual {if let MultirangeValue::Null=expected {return BoolValue::Value(true);};return BoolValue::Value(false);};
 if let MultirangeValue::Null=expected {return BoolValue::Value(false);};
 if let MultirangeValue::Value(a)=actual {if let MultirangeValue::Value(b)=expected {
  if a.type_name.as_str()!=b.type_name.as_str() || a.range_type.as_str()!=b.range_type.as_str() || a.element_type.as_str()!=b.element_type.as_str() || a.element_kind!=b.element_kind || a.ranges.len()!=b.ranges.len() {return BoolValue::Value(false);};
  let mut i:usize=0;
  while i<a.ranges.len() {
   let left=a.ranges[i].clone();let right=b.ranges[i].clone();let mut same=false;
   if let RangeValue::Value(x)=left {if let RangeValue::Value(y)=right {same=multirange_fixture_span_exact(&x,&y);};};
   if same==false {return BoolValue::Value(false);};i+=1;
  }
  return BoolValue::Value(true);
 };};
 BoolValue::Unknown
}
`
