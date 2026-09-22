export const goCheckDependencies: Record<string, readonly string[]> = {
  EvalBool: ['SqlBoolean'],
  evalBoolCertain: ['EvalBool'],
  evalBoolUncertain: ['EvalBool'],
  evalBoolNot: ['EvalBool'],
  evalBoolAnd: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
  evalBoolOr: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
  evalBoolCase: ['EvalBool', 'evalBoolUncertain'],
  evalBoolTest: ['EvalBool', 'evalBoolCertain'],
  evalBoolCompare: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
}
