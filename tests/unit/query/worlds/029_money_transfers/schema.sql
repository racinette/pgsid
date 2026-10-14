-- @world checks
CREATE DOMAIN imported_amount AS money;
CREATE DOMAIN settled_amount AS imported_amount;

CREATE TABLE cash_accounts (
  id integer PRIMARY KEY,
  label text NOT NULL,
  balance settled_amount,
  recorded_wire bytea,
  recorded_present boolean,
  skip_validation boolean NOT NULL,
  CONSTRAINT account_wire CHECK (CASE WHEN skip_validation THEN true ELSE cash_send(balance)=recorded_wire END),
  CONSTRAINT account_presence CHECK (CASE WHEN skip_validation THEN true ELSE (balance IS NOT NULL)=recorded_present END),
  CONSTRAINT account_floor CHECK (CASE WHEN skip_validation THEN true ELSE balance >= '1.25'::money END)
);
CREATE TABLE cash_calculations (
  id integer PRIMARY KEY,
  account_id integer NOT NULL REFERENCES cash_accounts(id),
  label text NOT NULL,
  first_amount settled_amount,
  second_amount money,
  recorded_sum money,
  recorded_difference money,
  recorded_ratio float8,
  recorded_same boolean,
  recorded_order integer,
  recorded_larger money,
  recorded_smaller money,
  recorded_words text,
  skip_validation boolean NOT NULL,
  CONSTRAINT cash_sum CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(first_amount+second_amount,recorded_sum) END),
  CONSTRAINT cash_difference CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(first_amount-second_amount,recorded_difference) END),
  CONSTRAINT cash_ratio CHECK (CASE WHEN skip_validation THEN true ELSE first_amount/second_amount=recorded_ratio END),
  CONSTRAINT cash_relation CHECK (CASE WHEN skip_validation THEN true ELSE cash_cmp(first_amount,second_amount)=recorded_order AND cash_eq(first_amount,second_amount)=recorded_same AND cash_ne(first_amount,second_amount)=NOT recorded_same AND cash_lt(first_amount,second_amount)=(recorded_order<0) AND cash_le(first_amount,second_amount)=(recorded_order<=0) AND cash_gt(first_amount,second_amount)=(recorded_order>0) AND cash_ge(first_amount,second_amount)=(recorded_order>=0) END),
  CONSTRAINT cash_selection CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(cashlarger(first_amount,second_amount),recorded_larger) AND cash_eq(cashsmaller(first_amount,second_amount),recorded_smaller) END),
  CONSTRAINT cash_words CHECK (CASE WHEN skip_validation THEN true ELSE cash_words(first_amount)=recorded_words END)
);
CREATE TABLE cash_scales (
  id integer PRIMARY KEY,
  account_id integer NOT NULL REFERENCES cash_accounts(id),
  label text NOT NULL,
  amount money,
  factor_small smallint,
  factor_integer integer,
  factor_wide bigint,
  factor_real real,
  factor_double float8,
  recorded_small_product money,
  recorded_integer_product money,
  recorded_wide_product money,
  recorded_real_product money,
  recorded_double_product money,
  recorded_small_quotient money,
  recorded_integer_quotient money,
  recorded_wide_quotient money,
  recorded_real_quotient money,
  recorded_double_quotient money,
  skip_validation boolean NOT NULL,
  CONSTRAINT cash_small_scale CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(amount*factor_small,recorded_small_product) AND cash_eq(factor_small*amount,recorded_small_product) AND cash_eq(amount/factor_small,recorded_small_quotient) END),
  CONSTRAINT cash_integer_scale CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(amount*factor_integer,recorded_integer_product) AND cash_eq(factor_integer*amount,recorded_integer_product) AND cash_eq(amount/factor_integer,recorded_integer_quotient) END),
  CONSTRAINT cash_wide_scale CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(amount*factor_wide,recorded_wide_product) AND cash_eq(factor_wide*amount,recorded_wide_product) AND cash_eq(amount/factor_wide,recorded_wide_quotient) END),
  CONSTRAINT cash_real_scale CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(amount*factor_real,recorded_real_product) AND cash_eq(factor_real*amount,recorded_real_product) AND cash_eq(amount/factor_real,recorded_real_quotient) END),
  CONSTRAINT cash_double_scale CHECK (CASE WHEN skip_validation THEN true ELSE cash_eq(amount*factor_double,recorded_double_product) AND cash_eq(factor_double*amount,recorded_double_product) AND cash_eq(amount/factor_double,recorded_double_quotient) END)
);
