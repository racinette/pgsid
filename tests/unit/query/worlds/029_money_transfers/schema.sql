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

CREATE TABLE cash_numeric_casts (
  numeric_amount numeric,
  integer_amount integer,
  wide_amount bigint,
  amount money,
  numeric_wire bytea,
  integer_wire bytea,
  wide_wire bytea,
  expected_numeric numeric,
  expected_scale integer,
  bypass boolean,
  CONSTRAINT numeric_money_cast CHECK (CASE WHEN bypass THEN true ELSE cash_send(numeric_amount::money) IS NOT DISTINCT FROM numeric_wire END),
  CONSTRAINT integer_money_cast CHECK (CASE WHEN bypass THEN true ELSE cash_send(integer_amount::money) IS NOT DISTINCT FROM integer_wire END),
  CONSTRAINT wide_money_cast CHECK (CASE WHEN bypass THEN true ELSE cash_send(wide_amount::money) IS NOT DISTINCT FROM wide_wire END),
  CONSTRAINT money_numeric_cast CHECK (CASE WHEN bypass THEN true ELSE numeric_send(amount::numeric) IS NOT DISTINCT FROM numeric_send(expected_numeric) END),
  CONSTRAINT money_numeric_scale CHECK (CASE WHEN bypass THEN true ELSE scale(amount::numeric) IS NOT DISTINCT FROM expected_scale END),
  CONSTRAINT money_domain_cast CHECK (CASE WHEN bypass THEN true ELSE cash_send(numeric_amount::settled_amount) IS NOT DISTINCT FROM numeric_wire END),
  CONSTRAINT money_array_cast CHECK (CASE WHEN bypass THEN true ELSE cash_send((ARRAY[numeric_amount]::money[])[1]) IS NOT DISTINCT FROM numeric_wire END)
);

CREATE TABLE cash_text_values (
  source_text text,
  amount settled_amount,
  expected_wire bytea,
  expected_text text,
  bypass boolean,
  CONSTRAINT cash_import CHECK (CASE WHEN bypass THEN true ELSE cash_send(source_text::money) IS NOT DISTINCT FROM expected_wire END),
  CONSTRAINT cash_display CHECK (CASE WHEN bypass THEN true ELSE amount::text IS NOT DISTINCT FROM expected_text END),
  CONSTRAINT cash_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(amount) IS NOT DISTINCT FROM to_jsonb(expected_text) END),
  CONSTRAINT cash_array_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[amount,NULL]) IS NOT DISTINCT FROM jsonb_build_array(expected_text,NULL) END),
  CONSTRAINT cash_record_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(ROW(amount,ARRAY[amount])) IS NOT DISTINCT FROM jsonb_build_object('f1',expected_text,'f2',jsonb_build_array(expected_text)) END)
);

CREATE TYPE cash_span AS RANGE(subtype=settled_amount,multirange_type_name=cash_spans);
CREATE TABLE cash_band_text (
  source_text text,
  band cash_span,
  bands cash_spans,
  expected_band text,
  expected_bands text,
  bypass boolean,
  CONSTRAINT band_text_import CHECK (CASE WHEN bypass THEN true ELSE (source_text::cash_span)::text IS NOT DISTINCT FROM expected_band END),
  CONSTRAINT band_text_display CHECK (CASE WHEN bypass THEN true ELSE band::text IS NOT DISTINCT FROM expected_band END),
  CONSTRAINT bands_text_display CHECK (CASE WHEN bypass THEN true ELSE bands::text IS NOT DISTINCT FROM expected_bands END),
  CONSTRAINT band_array_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[band,NULL]) IS NOT DISTINCT FROM jsonb_build_array(expected_band,NULL) END),
  CONSTRAINT bands_array_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[bands,NULL]) IS NOT DISTINCT FROM jsonb_build_array(expected_bands,NULL) END)
);
