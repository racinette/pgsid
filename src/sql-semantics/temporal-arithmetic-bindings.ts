export const temporalArithmeticOperators: ReadonlyArray<readonly [string, string]> = [
  ['operator:["pg_catalog","*"](pg_catalog."interval",pg_catalog.float8)', 'intervalMul'],
  ['operator:["pg_catalog","*"](pg_catalog.float8,pg_catalog."interval")', 'mulDInterval'],
  ['operator:["pg_catalog","+"](pg_catalog."interval",pg_catalog."interval")', 'intervalPl'],
  ['operator:["pg_catalog","+"](pg_catalog."interval",pg_catalog."time")', 'intervalPlTime'],
  [
    'operator:["pg_catalog","+"](pg_catalog."interval",pg_catalog."timestamp")',
    'intervalPlTimestamp',
  ],
  ['operator:["pg_catalog","+"](pg_catalog."interval",pg_catalog.date)', 'intervalPlDate'],
  [
    'operator:["pg_catalog","+"](pg_catalog."interval",pg_catalog.timestamptz)',
    'intervalPlTimestamptz',
  ],
  ['operator:["pg_catalog","+"](pg_catalog."interval",pg_catalog.timetz)', 'intervalPlTimetz'],
  ['operator:["pg_catalog","+"](pg_catalog."time",pg_catalog."interval")', 'timePlInterval'],
  ['operator:["pg_catalog","+"](pg_catalog."time",pg_catalog.date)', 'timePlDate'],
  [
    'operator:["pg_catalog","+"](pg_catalog."timestamp",pg_catalog."interval")',
    'timestampPlInterval',
  ],
  ['operator:["pg_catalog","+"](pg_catalog.date,pg_catalog."interval")', 'datePlInterval'],
  ['operator:["pg_catalog","+"](pg_catalog.date,pg_catalog."time")', 'datePlTime'],
  ['operator:["pg_catalog","+"](pg_catalog.date,pg_catalog.int4)', 'datePlInt'],
  ['operator:["pg_catalog","+"](pg_catalog.date,pg_catalog.timetz)', 'datePlTimetz'],
  ['operator:["pg_catalog","+"](pg_catalog.int4,pg_catalog.date)', 'intPlDate'],
  [
    'operator:["pg_catalog","+"](pg_catalog.timestamptz,pg_catalog."interval")',
    'timestamptzPlInterval',
  ],
  ['operator:["pg_catalog","+"](pg_catalog.timetz,pg_catalog."interval")', 'timetzPlInterval'],
  ['operator:["pg_catalog","+"](pg_catalog.timetz,pg_catalog.date)', 'timetzPlDate'],
  ['operator:["pg_catalog","-"](,pg_catalog."interval")', 'intervalUm'],
  ['operator:["pg_catalog","-"](pg_catalog."interval",pg_catalog."interval")', 'intervalMi'],
  ['operator:["pg_catalog","-"](pg_catalog."time",pg_catalog."interval")', 'timeMiInterval'],
  ['operator:["pg_catalog","-"](pg_catalog."time",pg_catalog."time")', 'timeMiTime'],
  [
    'operator:["pg_catalog","-"](pg_catalog."timestamp",pg_catalog."interval")',
    'timestampMiInterval',
  ],
  [
    'operator:["pg_catalog","-"](pg_catalog."timestamp",pg_catalog."timestamp")',
    'timestampMiTimestamp',
  ],
  ['operator:["pg_catalog","-"](pg_catalog.date,pg_catalog."interval")', 'dateMiInterval'],
  ['operator:["pg_catalog","-"](pg_catalog.date,pg_catalog.date)', 'dateMiDate'],
  ['operator:["pg_catalog","-"](pg_catalog.date,pg_catalog.int4)', 'dateMiInt'],
  [
    'operator:["pg_catalog","-"](pg_catalog.timestamptz,pg_catalog."interval")',
    'timestamptzMiInterval',
  ],
  [
    'operator:["pg_catalog","-"](pg_catalog.timestamptz,pg_catalog.timestamptz)',
    'timestamptzMiTimestamptz',
  ],
  ['operator:["pg_catalog","-"](pg_catalog.timetz,pg_catalog."interval")', 'timetzMiInterval'],
  ['operator:["pg_catalog","/"](pg_catalog."interval",pg_catalog.float8)', 'intervalDiv'],
  ['operator:["pg_catalog","="](pg_catalog.date,pg_catalog."timestamp")', 'dateTimestampEq'],
  ['operator:["pg_catalog","<>"](pg_catalog.date,pg_catalog."timestamp")', 'dateTimestampNe'],
  ['operator:["pg_catalog","<"](pg_catalog.date,pg_catalog."timestamp")', 'dateTimestampLt'],
  ['operator:["pg_catalog","<="](pg_catalog.date,pg_catalog."timestamp")', 'dateTimestampLe'],
  ['operator:["pg_catalog",">"](pg_catalog.date,pg_catalog."timestamp")', 'dateTimestampGt'],
  ['operator:["pg_catalog",">="](pg_catalog.date,pg_catalog."timestamp")', 'dateTimestampGe'],
  ['operator:["pg_catalog","="](pg_catalog."timestamp",pg_catalog.date)', 'timestampDateEq'],
  ['operator:["pg_catalog","<>"](pg_catalog."timestamp",pg_catalog.date)', 'timestampDateNe'],
  ['operator:["pg_catalog","<"](pg_catalog."timestamp",pg_catalog.date)', 'timestampDateLt'],
  ['operator:["pg_catalog","<="](pg_catalog."timestamp",pg_catalog.date)', 'timestampDateLe'],
  ['operator:["pg_catalog",">"](pg_catalog."timestamp",pg_catalog.date)', 'timestampDateGt'],
  ['operator:["pg_catalog",">="](pg_catalog."timestamp",pg_catalog.date)', 'timestampDateGe'],
  ['operator:["pg_catalog","="](pg_catalog.date,pg_catalog.timestamptz)', 'dateTimestamptzEq'],
  ['operator:["pg_catalog","<>"](pg_catalog.date,pg_catalog.timestamptz)', 'dateTimestamptzNe'],
  ['operator:["pg_catalog","<"](pg_catalog.date,pg_catalog.timestamptz)', 'dateTimestamptzLt'],
  ['operator:["pg_catalog","<="](pg_catalog.date,pg_catalog.timestamptz)', 'dateTimestamptzLe'],
  ['operator:["pg_catalog",">"](pg_catalog.date,pg_catalog.timestamptz)', 'dateTimestamptzGt'],
  ['operator:["pg_catalog",">="](pg_catalog.date,pg_catalog.timestamptz)', 'dateTimestamptzGe'],
  ['operator:["pg_catalog","="](pg_catalog.timestamptz,pg_catalog.date)', 'timestamptzDateEq'],
  ['operator:["pg_catalog","<>"](pg_catalog.timestamptz,pg_catalog.date)', 'timestamptzDateNe'],
  ['operator:["pg_catalog","<"](pg_catalog.timestamptz,pg_catalog.date)', 'timestamptzDateLt'],
  ['operator:["pg_catalog","<="](pg_catalog.timestamptz,pg_catalog.date)', 'timestamptzDateLe'],
  ['operator:["pg_catalog",">"](pg_catalog.timestamptz,pg_catalog.date)', 'timestamptzDateGt'],
  ['operator:["pg_catalog",">="](pg_catalog.timestamptz,pg_catalog.date)', 'timestamptzDateGe'],
  [
    'operator:["pg_catalog","="](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzEq',
  ],
  [
    'operator:["pg_catalog","<>"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzNe',
  ],
  [
    'operator:["pg_catalog","<"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzLt',
  ],
  [
    'operator:["pg_catalog","<="](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzLe',
  ],
  [
    'operator:["pg_catalog",">"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzGt',
  ],
  [
    'operator:["pg_catalog",">="](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzGe',
  ],
  [
    'operator:["pg_catalog","="](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampEq',
  ],
  [
    'operator:["pg_catalog","<>"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampNe',
  ],
  [
    'operator:["pg_catalog","<"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampLt',
  ],
  [
    'operator:["pg_catalog","<="](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampLe',
  ],
  [
    'operator:["pg_catalog",">"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampGt',
  ],
  [
    'operator:["pg_catalog",">="](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampGe',
  ],
]

export const temporalArithmeticFunctions: ReadonlyArray<readonly [string, string]> = [
  ['function:["pg_catalog","date_pli"](pg_catalog.date,pg_catalog.int4)', 'datePlInt'],
  ['function:["pg_catalog","integer_pl_date"](pg_catalog.int4,pg_catalog.date)', 'intPlDate'],
  ['function:["pg_catalog","date_mii"](pg_catalog.date,pg_catalog.int4)', 'dateMiInt'],
  ['function:["pg_catalog","date_mi"](pg_catalog.date,pg_catalog.date)', 'dateMiDate'],
  [
    'function:["pg_catalog","date_pl_interval"](pg_catalog.date,pg_catalog."interval")',
    'datePlInterval',
  ],
  [
    'function:["pg_catalog","interval_pl_date"](pg_catalog."interval",pg_catalog.date)',
    'intervalPlDate',
  ],
  [
    'function:["pg_catalog","date_mi_interval"](pg_catalog.date,pg_catalog."interval")',
    'dateMiInterval',
  ],
  ['function:["pg_catalog","datetime_pl"](pg_catalog.date,pg_catalog."time")', 'datePlTime'],
  ['function:["pg_catalog","timedate_pl"](pg_catalog."time",pg_catalog.date)', 'timePlDate'],
  ['function:["pg_catalog","datetimetz_pl"](pg_catalog.date,pg_catalog.timetz)', 'datePlTimetz'],
  ['function:["pg_catalog","timetzdate_pl"](pg_catalog.timetz,pg_catalog.date)', 'timetzPlDate'],
  [
    'function:["pg_catalog","time_pl_interval"](pg_catalog."time",pg_catalog."interval")',
    'timePlInterval',
  ],
  [
    'function:["pg_catalog","interval_pl_time"](pg_catalog."interval",pg_catalog."time")',
    'intervalPlTime',
  ],
  [
    'function:["pg_catalog","time_mi_interval"](pg_catalog."time",pg_catalog."interval")',
    'timeMiInterval',
  ],
  ['function:["pg_catalog","time_mi_time"](pg_catalog."time",pg_catalog."time")', 'timeMiTime'],
  [
    'function:["pg_catalog","timestamp_pl_interval"](pg_catalog."timestamp",pg_catalog."interval")',
    'timestampPlInterval',
  ],
  [
    'function:["pg_catalog","interval_pl_timestamp"](pg_catalog."interval",pg_catalog."timestamp")',
    'intervalPlTimestamp',
  ],
  [
    'function:["pg_catalog","timestamp_mi_interval"](pg_catalog."timestamp",pg_catalog."interval")',
    'timestampMiInterval',
  ],
  [
    'function:["pg_catalog","timestamp_mi"](pg_catalog."timestamp",pg_catalog."timestamp")',
    'timestampMiTimestamp',
  ],
  [
    'function:["pg_catalog","timestamptz_pl_interval"](pg_catalog.timestamptz,pg_catalog."interval")',
    'timestamptzPlInterval',
  ],
  [
    'function:["pg_catalog","interval_pl_timestamptz"](pg_catalog."interval",pg_catalog.timestamptz)',
    'intervalPlTimestamptz',
  ],
  [
    'function:["pg_catalog","timestamptz_mi_interval"](pg_catalog.timestamptz,pg_catalog."interval")',
    'timestamptzMiInterval',
  ],
  [
    'function:["pg_catalog","timestamptz_mi"](pg_catalog.timestamptz,pg_catalog.timestamptz)',
    'timestamptzMiTimestamptz',
  ],
  [
    'function:["pg_catalog","timetz_pl_interval"](pg_catalog.timetz,pg_catalog."interval")',
    'timetzPlInterval',
  ],
  [
    'function:["pg_catalog","interval_pl_timetz"](pg_catalog."interval",pg_catalog.timetz)',
    'intervalPlTimetz',
  ],
  [
    'function:["pg_catalog","timetz_mi_interval"](pg_catalog.timetz,pg_catalog."interval")',
    'timetzMiInterval',
  ],
  [
    'function:["pg_catalog","interval_pl"](pg_catalog."interval",pg_catalog."interval")',
    'intervalPl',
  ],
  [
    'function:["pg_catalog","interval_mi"](pg_catalog."interval",pg_catalog."interval")',
    'intervalMi',
  ],
  ['function:["pg_catalog","interval_um"](pg_catalog."interval")', 'intervalUm'],
  [
    'function:["pg_catalog","interval_mul"](pg_catalog."interval",pg_catalog.float8)',
    'intervalMul',
  ],
  [
    'function:["pg_catalog","mul_d_interval"](pg_catalog.float8,pg_catalog."interval")',
    'mulDInterval',
  ],
  [
    'function:["pg_catalog","interval_div"](pg_catalog."interval",pg_catalog.float8)',
    'intervalDiv',
  ],
  ['function:["pg_catalog","justify_hours"](pg_catalog."interval")', 'justifyHours'],
  ['function:["pg_catalog","justify_days"](pg_catalog."interval")', 'justifyDays'],
  ['function:["pg_catalog","justify_interval"](pg_catalog."interval")', 'justifyInterval'],
  ['function:["pg_catalog","date"](pg_catalog."timestamp")', 'dateFromTimestamp'],
  ['function:["pg_catalog","date"](pg_catalog.timestamptz)', 'dateFromTimestamptz'],
  ['function:["pg_catalog","timestamp"](pg_catalog.date)', 'timestampFromDate'],
  [
    'function:["pg_catalog","timestamp"](pg_catalog.date,pg_catalog."time")',
    'timestampFromDateTime',
  ],
  ['function:["pg_catalog","timestamp"](pg_catalog.timestamptz)', 'timestampFromTimestamptz'],
  ['function:["pg_catalog","timestamptz"](pg_catalog."timestamp")', 'timestamptzFromTimestamp'],
  ['function:["pg_catalog","timestamptz"](pg_catalog.date)', 'timestamptzFromDate'],
  [
    'function:["pg_catalog","timestamptz"](pg_catalog.date,pg_catalog."time")',
    'timestamptzFromDateTime',
  ],
  [
    'function:["pg_catalog","timestamptz"](pg_catalog.date,pg_catalog.timetz)',
    'timestamptzFromDateTimetz',
  ],
  ['function:["pg_catalog","time"](pg_catalog."timestamp")', 'timeFromTimestamp'],
  ['function:["pg_catalog","time"](pg_catalog.timestamptz)', 'timeFromTimestamptz'],
  ['function:["pg_catalog","time"](pg_catalog.timetz)', 'timeFromTimetz'],
  ['function:["pg_catalog","time"](pg_catalog."interval")', 'timeFromInterval'],
  ['function:["pg_catalog","timetz"](pg_catalog."time")', 'timetzFromTime'],
  ['function:["pg_catalog","timetz"](pg_catalog.timestamptz)', 'timetzFromTimestamptz'],
  ['function:["pg_catalog","interval"](pg_catalog."time")', 'intervalFromTime'],
  [
    'function:["pg_catalog","timezone"](pg_catalog."interval",pg_catalog."timestamp")',
    'timezoneIntervalTimestamp',
  ],
  [
    'function:["pg_catalog","timezone"](pg_catalog."interval",pg_catalog.timestamptz)',
    'timezoneIntervalTimestamptz',
  ],
  [
    'function:["pg_catalog","timezone"](pg_catalog."interval",pg_catalog.timetz)',
    'timezoneIntervalTimetz',
  ],
  [
    'function:["pg_catalog","date_eq_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampEq',
  ],
  [
    'function:["pg_catalog","date_ne_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampNe',
  ],
  [
    'function:["pg_catalog","date_lt_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampLt',
  ],
  [
    'function:["pg_catalog","date_le_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampLe',
  ],
  [
    'function:["pg_catalog","date_gt_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampGt',
  ],
  [
    'function:["pg_catalog","date_ge_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampGe',
  ],
  [
    'function:["pg_catalog","date_cmp_timestamp"](pg_catalog.date,pg_catalog."timestamp")',
    'dateTimestampCompare',
  ],
  [
    'function:["pg_catalog","timestamp_eq_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateEq',
  ],
  [
    'function:["pg_catalog","timestamp_ne_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateNe',
  ],
  [
    'function:["pg_catalog","timestamp_lt_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateLt',
  ],
  [
    'function:["pg_catalog","timestamp_le_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateLe',
  ],
  [
    'function:["pg_catalog","timestamp_gt_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateGt',
  ],
  [
    'function:["pg_catalog","timestamp_ge_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateGe',
  ],
  [
    'function:["pg_catalog","timestamp_cmp_date"](pg_catalog."timestamp",pg_catalog.date)',
    'timestampDateCompare',
  ],
  [
    'function:["pg_catalog","date_eq_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzEq',
  ],
  [
    'function:["pg_catalog","date_ne_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzNe',
  ],
  [
    'function:["pg_catalog","date_lt_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzLt',
  ],
  [
    'function:["pg_catalog","date_le_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzLe',
  ],
  [
    'function:["pg_catalog","date_gt_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzGt',
  ],
  [
    'function:["pg_catalog","date_ge_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzGe',
  ],
  [
    'function:["pg_catalog","date_cmp_timestamptz"](pg_catalog.date,pg_catalog.timestamptz)',
    'dateTimestamptzCompare',
  ],
  [
    'function:["pg_catalog","timestamptz_eq_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateEq',
  ],
  [
    'function:["pg_catalog","timestamptz_ne_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateNe',
  ],
  [
    'function:["pg_catalog","timestamptz_lt_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateLt',
  ],
  [
    'function:["pg_catalog","timestamptz_le_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateLe',
  ],
  [
    'function:["pg_catalog","timestamptz_gt_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateGt',
  ],
  [
    'function:["pg_catalog","timestamptz_ge_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateGe',
  ],
  [
    'function:["pg_catalog","timestamptz_cmp_date"](pg_catalog.timestamptz,pg_catalog.date)',
    'timestamptzDateCompare',
  ],
  [
    'function:["pg_catalog","timestamp_eq_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzEq',
  ],
  [
    'function:["pg_catalog","timestamp_ne_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzNe',
  ],
  [
    'function:["pg_catalog","timestamp_lt_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzLt',
  ],
  [
    'function:["pg_catalog","timestamp_le_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzLe',
  ],
  [
    'function:["pg_catalog","timestamp_gt_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzGt',
  ],
  [
    'function:["pg_catalog","timestamp_ge_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzGe',
  ],
  [
    'function:["pg_catalog","timestamp_cmp_timestamptz"](pg_catalog."timestamp",pg_catalog.timestamptz)',
    'timestampTimestamptzCompare',
  ],
  [
    'function:["pg_catalog","timestamptz_eq_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampEq',
  ],
  [
    'function:["pg_catalog","timestamptz_ne_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampNe',
  ],
  [
    'function:["pg_catalog","timestamptz_lt_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampLt',
  ],
  [
    'function:["pg_catalog","timestamptz_le_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampLe',
  ],
  [
    'function:["pg_catalog","timestamptz_gt_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampGt',
  ],
  [
    'function:["pg_catalog","timestamptz_ge_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampGe',
  ],
  [
    'function:["pg_catalog","timestamptz_cmp_timestamp"](pg_catalog.timestamptz,pg_catalog."timestamp")',
    'timestamptzTimestampCompare',
  ],
]
