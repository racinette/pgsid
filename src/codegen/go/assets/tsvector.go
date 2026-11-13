package pgsid

import (
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

// Tsvector is a PostgreSQL tsvector as its text. pgx reads tsvector in binary, which only its own
// type takes, so the text is rendered from that and parsed back into it to be sent.
type Tsvector string

func (v *Tsvector) ScanTSVector(value pgtype.TSVector) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Tsvector")
	}
	text, err := (pgtype.TSVectorCodec{}).PlanEncode(nil, pgtype.TSVectorOID, pgtype.TextFormatCode, value).Encode(value, nil)
	if err == nil {
		*v = Tsvector(text)
	}
	return err
}
func (v *Tsvector) ScanText(value pgtype.Text) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Tsvector")
	}
	*v = Tsvector(value.String)
	return nil
}
func (v Tsvector) TSVectorValue() (pgtype.TSVector, error) {
	var value pgtype.TSVector
	err := (pgtype.TSVectorCodec{}).PlanScan(nil, pgtype.TSVectorOID, pgtype.TextFormatCode, &value).Scan([]byte(v), &value)
	return value, err
}
func (v Tsvector) TextValue() (pgtype.Text, error) {
	return pgtype.Text{String: string(v), Valid: true}, nil
}
