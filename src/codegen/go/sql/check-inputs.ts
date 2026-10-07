const helpers: Record<string, { dependencies: readonly string[]; source: string }> = {
  checkInputEnum: {
    dependencies: ['checkInputText'],
    source: `func checkInputEnum[T any](field CheckOptional[T], kind string, labels []string) EvalValue[SqlEnum] {
  input := checkInputText(field)
  if !input.Certain { return EvalValue[SqlEnum]{} }
  if !input.Value.Valid { return EvalValue[SqlEnum]{Certain: true} }
  for _, label := range labels {
    if label == input.Value.Value {
      return EvalValue[SqlEnum]{Certain: true, Value: enumInput(label, kind, labels)}
    }
  }
  return EvalValue[SqlEnum]{}
}`,
  },
  checkInputNullness: {
    dependencies: ['checkNullRaw'],
    source: `func checkInputNullness[T any](field CheckOptional[T]) EvalValue[SqlBoolean] {
  if !field.Set { return EvalValue[SqlBoolean]{} }
  return EvalValue[SqlBoolean]{Certain: true, Value: SqlBoolean{Value: field.Null || checkNullRaw(any(field.V)), Valid: true}}
}`,
  },
  checkNullRaw: {
    dependencies: [],
    source: `func checkNullRaw(raw any) bool {
  if raw == nil { return true }
  value := reflect.ValueOf(raw)
  for value.Kind() == reflect.Pointer || value.Kind() == reflect.Interface {
    if value.IsNil() { return true }
    if nullable, ok := value.Interface().(interface { SQLValid() bool }); ok {
      return !nullable.SQLValid()
    }
    value = value.Elem()
  }
  if nullable, ok := value.Interface().(interface { SQLValid() bool }); ok {
    return !nullable.SQLValid()
  }
  switch value.Kind() {
  case reflect.Slice, reflect.Map: return value.IsNil()
  }
  return false
}`,
  },
  checkPrimitive: {
    dependencies: [],
    source: `func checkPrimitive(raw any) (any, bool) {
  if raw == nil { return nil, true }
  value := reflect.ValueOf(raw)
  for value.Kind() == reflect.Pointer {
    if value.IsNil() { return nil, true }
    value = value.Elem()
  }
  switch value.Kind() {
  case reflect.String: return value.String(), true
  case reflect.Bool: return value.Bool(), true
  case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64: return value.Int(), true
  case reflect.Float32, reflect.Float64: return value.Float(), true
  case reflect.Slice:
    if value.Type().Elem().Kind() == reflect.Uint8 { return value.Bytes(), true }
  }
  return nil, false
}`,
  },
  checkTextRaw: {
    dependencies: ['checkPrimitive'],
    source: `func checkTextRaw(raw any) (SqlText, bool) {
  switch value := raw.(type) {
  case nil: return SqlText{}, true
  case SqlText: return value, true
  case string: return SqlText{Value: value, Valid: true}, true
  case *string:
    if value == nil { return SqlText{}, true }
    return SqlText{Value: *value, Valid: true}, true
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlText{}, true }
    return checkTextRaw(value.SQLValue())
  }
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlText{}, true
    case string: return SqlText{Value: value, Valid: true}, true
    }
  }
  return SqlText{}, false
}`,
  },
  checkTextKnown: {
    dependencies: ['checkTextRaw'],
    source: `func checkTextKnown[T any](field CheckOptional[T]) bool {
  if !field.Set { return false }
  if field.Null { return true }
  _, known := checkTextRaw(any(field.V))
  return known
}`,
  },
  checkTextValue: {
    dependencies: ['checkTextRaw'],
    source: `func checkTextValue[T any](field CheckOptional[T]) SqlText {
  value, _ := checkTextRaw(any(field.V))
  if field.Null { return SqlText{} }
  return value
}`,
  },
  checkInputText: {
    dependencies: ['checkTextKnown', 'checkTextValue'],
    source: `func checkInputText[T any](field CheckOptional[T]) EvalValue[SqlText] {
  if !checkTextKnown(field) { return EvalValue[SqlText]{} }
  return EvalValue[SqlText]{Certain: true, Value: checkTextValue(field)}
}`,
  },
  checkIntegerRaw: {
    dependencies: ['checkPrimitive'],
    source: `func checkIntegerRaw(raw any) (SqlInteger, bool) {
  switch value := raw.(type) {
  case nil: return SqlInteger{}, true
  case SqlInteger: return value, true
  case int: return SqlInteger{Value: int64(value), Valid: true}, true
  case int16: return SqlInteger{Value: int64(value), Valid: true}, true
  case int32: return SqlInteger{Value: int64(value), Valid: true}, true
  case int64: return SqlInteger{Value: value, Valid: true}, true
  case *int:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case *int16:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case *int32:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case *int64:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlInteger{}, true }
    return checkIntegerRaw(value.SQLValue())
  }
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlInteger{}, true
    case int64: return SqlInteger{Value: value, Valid: true}, true
    }
  }
  return SqlInteger{}, false
}`,
  },
  checkInputInteger: {
    dependencies: ['checkIntegerRaw'],
    source: `func checkInputInteger[T any](field CheckOptional[T]) EvalValue[SqlInteger] {
  if !field.Set { return EvalValue[SqlInteger]{} }
  if field.Null { return EvalValue[SqlInteger]{Certain: true} }
  value, known := checkIntegerRaw(any(field.V))
  return EvalValue[SqlInteger]{Certain: known, Value: value}
}`,
  },
  checkBooleanRaw: {
    dependencies: ['checkPrimitive'],
    source: `func checkBooleanRaw(raw any) (SqlBoolean, bool) {
  switch value := raw.(type) {
  case nil: return SqlBoolean{}, true
  case SqlBoolean: return value, true
  case bool: return SqlBoolean{Value: value, Valid: true}, true
  case *bool:
    if value == nil { return SqlBoolean{}, true }
    return checkBooleanRaw(*value)
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlBoolean{}, true }
    return checkBooleanRaw(value.SQLValue())
  }
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlBoolean{}, true
    case bool: return SqlBoolean{Value: value, Valid: true}, true
    }
  }
  return SqlBoolean{}, false
}`,
  },
  checkInputBoolean: {
    dependencies: ['checkBooleanRaw'],
    source: `func checkInputBoolean[T any](field CheckOptional[T]) EvalValue[SqlBoolean] {
  if !field.Set { return EvalValue[SqlBoolean]{} }
  if field.Null { return EvalValue[SqlBoolean]{Certain: true} }
  value, known := checkBooleanRaw(any(field.V))
  return EvalValue[SqlBoolean]{Certain: known, Value: value}
}`,
  },
  checkFloatRaw: {
    dependencies: ['checkPrimitive'],
    source: `func checkFloatRaw(raw any) (SqlFloat, bool) {
  switch value := raw.(type) {
  case nil: return SqlFloat{}, true
  case SqlFloat: return value, true
  case float32: return SqlFloat{Value: float64(value), Valid: true}, true
  case float64: return SqlFloat{Value: value, Valid: true}, true
  case *float32:
    if value == nil { return SqlFloat{}, true }
    return checkFloatRaw(*value)
  case *float64:
    if value == nil { return SqlFloat{}, true }
    return checkFloatRaw(*value)
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlFloat{}, true }
    return checkFloatRaw(value.SQLValue())
  }
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlFloat{}, true
    case float64: return SqlFloat{Value: value, Valid: true}, true
    }
  }
  return SqlFloat{}, false
}`,
  },
  checkInputFloat: {
    dependencies: ['checkFloatRaw'],
    source: `func checkInputFloat[T any](field CheckOptional[T]) EvalValue[SqlFloat] {
  if !field.Set { return EvalValue[SqlFloat]{} }
  if field.Null { return EvalValue[SqlFloat]{Certain: true} }
  value, known := checkFloatRaw(any(field.V))
  return EvalValue[SqlFloat]{Certain: known, Value: value}
}`,
  },
}

export function goCheckInputSource(required: ReadonlySet<string>): {
  source: string
  reflect: boolean
  runtime: readonly string[]
} {
  const included = new Set<string>()
  const source: string[] = []
  const include = (name: string): void => {
    if (included.has(name)) return
    const helper = helpers[name]
    if (!helper) throw new Error(`Missing Go CHECK input helper: ${name}`)
    included.add(name)
    for (const dependency of helper.dependencies) include(dependency)
    source.push(helper.source)
  }
  for (const name of required) include(name)
  return {
    source: source.join('\n'),
    reflect: included.has('checkPrimitive') || included.has('checkNullRaw'),
    runtime: [
      ...(included.has('checkTextRaw') ? ['SqlText'] : []),
      ...(included.has('checkIntegerRaw') ? ['SqlInteger'] : []),
      ...(included.has('checkBooleanRaw') || included.has('checkInputNullness')
        ? ['SqlBoolean']
        : []),
      ...(included.has('checkFloatRaw') ? ['SqlFloat'] : []),
      ...(included.has('checkInputEnum') ? ['SqlEnum', 'enumInput'] : []),
    ],
  }
}
