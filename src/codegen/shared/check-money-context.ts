type MoneyContext = { moneyLocale?: 'C'; moneyFractionDigits?: number }

export function moneyTextCLocale(context: MoneyContext): boolean {
  return (
    context.moneyLocale === 'C' &&
    (context.moneyFractionDigits === undefined || context.moneyFractionDigits === 2)
  )
}

export function moneyContextFractionDigits(context: MoneyContext): number {
  return context.moneyLocale === 'C'
    ? moneyTextCLocale(context)
      ? 2
      : -1
    : (context.moneyFractionDigits ?? -1)
}
