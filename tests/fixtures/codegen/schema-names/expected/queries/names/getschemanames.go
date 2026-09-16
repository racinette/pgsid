package names

import (
	"context"
	schema_123billing2 "example.com/pgsid-schema-names/generated/schema/123billing"
	billing "example.com/pgsid-schema-names/generated/schema/billing"
	billing_extra2 "example.com/pgsid-schema-names/generated/schema/billing-extra"
	billing_extra3 "example.com/pgsid-schema-names/generated/schema/billing.extra"
	billing_extra "example.com/pgsid-schema-names/generated/schema/billing_extra"
	literal_data "example.com/pgsid-schema-names/generated/schema/literal_data"
	public "example.com/pgsid-schema-names/generated/schema/public"
	schema_123billing "example.com/pgsid-schema-names/generated/schema/schema_123billing"
	schema_212121 "example.com/pgsid-schema-names/generated/schema/schema_212121"
	schema_42696c6c696e67 "example.com/pgsid-schema-names/generated/schema/schema_42696c6c696e67"
	schema_5f5f70726f746f5f5f "example.com/pgsid-schema-names/generated/schema/schema_5f5f70726f746f5f5f"
	schema_5f68696464656e "example.com/pgsid-schema-names/generated/schema/schema_5f68696464656e"
	schema_612f62 "example.com/pgsid-schema-names/generated/schema/schema_612f62"
	schema_63616665cc81 "example.com/pgsid-schema-names/generated/schema/schema_63616665cc81"
	schema_636166c3a9 "example.com/pgsid-schema-names/generated/schema/schema_636166c3a9"
	schema_636f6e "example.com/pgsid-schema-names/generated/schema/schema_636f6e"
	schema_747261696c696e672e "example.com/pgsid-schema-names/generated/schema/schema_747261696c696e672e"
	schema_77697468207370616365 "example.com/pgsid-schema-names/generated/schema/schema_77697468207370616365"
	schema_custom "example.com/pgsid-schema-names/generated/schema/schema_custom"
	schema_e695b0e68dae "example.com/pgsid-schema-names/generated/schema/schema_e695b0e68dae"
	supplied "example.com/pgsid-schema-names/generated/schema/supplied"
	type_pkg "example.com/pgsid-schema-names/generated/schema/type"
)

const GetSchemaNamesSQL = "SELECT\n  s0.id AS ordinary_id,\n  s1.id AS dotted_id,\n  s2.id AS underscored_id,\n  s3.id AS dashed_id,\n  s4.id AS numeric_id,\n  s5.id AS unicode_id,\n  s6.id AS accented_id,\n  s7.id AS combining_id,\n  s8.id AS uppercase_id,\n  s9.id AS lowercase_id,\n  s10.id AS keyword_id,\n  s11.id AS punctuation_id,\n  s12.id AS hidden_id,\n  s13.id AS prefix_id,\n  s14.id AS literal_id,\n  s15.id AS overridden_id,\n  s16.id AS slash_id,\n  s17.id AS space_id,\n  s18.id AS trailing_dot_id,\n  s19.id AS device_id,\n  s20.id AS prototype_id,\n  s21.id AS numeric_literal_id\nFROM\n  \"public\".events AS s0,\n  \"billing.extra\".events AS s1,\n  \"billing_extra\".events AS s2,\n  \"billing-extra\".events AS s3,\n  \"123billing\".events AS s4,\n  \"数据\".events AS s5,\n  \"café\".events AS s6,\n  \"café\".events AS s7,\n  \"Billing\".events AS s8,\n  \"billing\".events AS s9,\n  \"type\".events AS s10,\n  \"!!!\".events AS s11,\n  \"_hidden\".events AS s12,\n  \"schema_custom\".events AS s13,\n  \"schema_e695b0e68dae\".events AS s14,\n  \"提供\".events AS s15,\n  \"a/b\".events AS s16,\n  \"with space\".events AS s17,\n  \"trailing.\".events AS s18,\n  \"con\".events AS s19,\n  \"__proto__\".events AS s20,\n  schema_123billing.events AS s21;"

type GetSchemaNamesParams struct {
}
type GetSchemaNamesRow struct {
	OrdinaryId       public.EventId                      `db:"ordinary_id"`
	DottedId         billing_extra3.EventId              `db:"dotted_id"`
	UnderscoredId    billing_extra.EventId               `db:"underscored_id"`
	DashedId         billing_extra2.EventId              `db:"dashed_id"`
	NumericId        schema_123billing2.EventId          `db:"numeric_id"`
	UnicodeId        schema_e695b0e68dae.EventId         `db:"unicode_id"`
	AccentedId       schema_636166c3a9.EventId           `db:"accented_id"`
	CombiningId      schema_63616665cc81.EventId         `db:"combining_id"`
	UppercaseId      schema_42696c6c696e67.EventId       `db:"uppercase_id"`
	LowercaseId      billing.EventId                     `db:"lowercase_id"`
	KeywordId        type_pkg.EventId                    `db:"keyword_id"`
	PunctuationId    schema_212121.EventId               `db:"punctuation_id"`
	HiddenId         schema_5f68696464656e.EventId       `db:"hidden_id"`
	PrefixId         schema_custom.EventId               `db:"prefix_id"`
	LiteralId        literal_data.EventId                `db:"literal_id"`
	OverriddenId     supplied.EventId                    `db:"overridden_id"`
	SlashId          schema_612f62.EventId               `db:"slash_id"`
	SpaceId          schema_77697468207370616365.EventId `db:"space_id"`
	TrailingDotId    schema_747261696c696e672e.EventId   `db:"trailing_dot_id"`
	DeviceId         schema_636f6e.EventId               `db:"device_id"`
	PrototypeId      schema_5f5f70726f746f5f5f.EventId   `db:"prototype_id"`
	NumericLiteralId schema_123billing.EventId           `db:"numeric_literal_id"`
}

func (q *Queries) GetSchemaNames(ctx context.Context) (GetSchemaNamesRow, error) {
	var row GetSchemaNamesRow
	err := q.db.QueryRow(ctx, GetSchemaNamesSQL).Scan(&row.OrdinaryId, &row.DottedId, &row.UnderscoredId, &row.DashedId, &row.NumericId, &row.UnicodeId, &row.AccentedId, &row.CombiningId, &row.UppercaseId, &row.LowercaseId, &row.KeywordId, &row.PunctuationId, &row.HiddenId, &row.PrefixId, &row.LiteralId, &row.OverriddenId, &row.SlashId, &row.SpaceId, &row.TrailingDotId, &row.DeviceId, &row.PrototypeId, &row.NumericLiteralId)
	return row, err
}
