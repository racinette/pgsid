import {
  builtinMetadata,
  builtinTypeComparison,
  functionMetadata,
} from '../../src/postgres/builtins/inventory.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'

export const multirangeMetadataNames = [
  'isempty',
  'lower_inc',
  'upper_inc',
  'lower_inf',
  'upper_inf',
] as const
export const multirangeMetadata = (name: string) =>
  functionMetadata(`function:["pg_catalog","${name}"](pg_catalog.anymultirange)`)

const equality = Object.values(PG18_RANGE_TYPES)
  .map((metadata) => {
    const selected = builtinMetadata(builtinTypeComparison(metadata.subtype)!.equality!)
    const implementation =
      selected.kind === 'operator' ? builtinMetadata(selected.implementation) : selected
    if (implementation.kind !== 'function')
      throw new Error('Range bound equality requires a catalog function')
    const prefix = metadata.subtype.slice('pg_catalog.'.length).replaceAll('"', '')
    return `if kind==${arrayElementFamily(metadata.subtype)} {let a=array_element_to_${prefix}(left);let b=array_element_to_${prefix}(right);return ${implementation.rustName}(a,b);};`
  })
  .join('\n')

export const multirangeProbe =
  String.raw`
fn multirange_fixture_bool_equal(actual:BoolValue,expected:BoolValue)->BoolValue {
 if let BoolValue::Error(error)=actual {return BoolValue::Error(error);};
 if let BoolValue::Error(error)=expected {return BoolValue::Error(error);};
 if actual==BoolValue::Unknown || expected==BoolValue::Unknown {return BoolValue::Unknown;};
 BoolValue::Value(actual==expected)
}
fn multirange_fixture_bound_equal(left:ArrayElement,right:ArrayElement,kind:i32)->BoolValue {
 if let ArrayElement::Error(error)=left {return BoolValue::Error(error);};
 if let ArrayElement::Error(error)=right {return BoolValue::Error(error);};
 if let ArrayElement::Unknown=left {return BoolValue::Unknown;};
 if let ArrayElement::Unknown=right {return BoolValue::Unknown;};
 if let ArrayElement::Null=left {if let ArrayElement::Null=right {return BoolValue::Value(true);};return BoolValue::Value(false);};
 if let ArrayElement::Null=right {return BoolValue::Value(false);};
` +
  equality +
  String.raw`
 BoolValue::Unknown
}
fn multirange_fixture_count(input:MultirangeValue,expected:Int4Value)->BoolValue {
 if let MultirangeValue::Error(error)=input {return BoolValue::Error(error);};
 if let Int4Value::Error(error)=expected {return BoolValue::Error(error);};
 if let MultirangeValue::Unknown=input {return BoolValue::Unknown;};
 if let MultirangeValue::Null=input {return BoolValue::Value(expected==Int4Value::Null);};
 if let MultirangeValue::Value(payload)=input {if let Int4Value::Value(count)=expected {return BoolValue::Value(payload.ranges.len() as i32==count);};};
 BoolValue::Unknown
}
pub fn multirange_fixture_check(input:MultirangeValue,expected:BoolValue,head:RangeValue,tail:RangeValue,count:Int4Value,bypass:BoolValue,mode:i32,kind:i32)->BoolValue {
 if bypass==BoolValue::Value(true) {return BoolValue::Value(true);};
 let storage=multirange_fixture_count(input.clone(),count);
 if storage!=BoolValue::Value(true) {return storage;};
` +
  multirangeMetadataNames
    .map(
      (name, i) =>
        `if mode==${i} {let actual=${multirangeMetadata(name).rustName}(input);return multirange_fixture_bool_equal(actual,expected);};`,
    )
    .join('\n') +
  String.raw`
 let left=${multirangeMetadata('lower').rustName}(input.clone());let right=range_bound(head,false);
 let first=multirange_fixture_bound_equal(left,right,kind);let guard=check_from_bool(first);
 if and_stops(guard) {return bool_from_check(guard);};
 let left_upper=${multirangeMetadata('upper').rustName}(input);let right_upper=range_bound(tail,true);
 let second=multirange_fixture_bound_equal(left_upper,right_upper,kind);let upper_state=check_from_bool(second);
 bool_from_check(and_finish(guard,upper_state))
}
`
