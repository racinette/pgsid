package public

import (
	pgsid "example.com/pgsid-validation/generated/pgsid"
	"github.com/jackc/pgx/v5/pgtype"
)

type UserId int32
type Arrays struct {
	Id               int32                                       `db:"id"`
	Ordinary         []pgsid.Null[int32]                         `db:"ordinary"`
	Matrix           [][]pgsid.Null[int32]                       `db:"matrix"`
	Cube             pgsid.Null[[][][]pgsid.Null[int32]]         `db:"cube"`
	Flexible         pgtype.Array[pgsid.Null[int32]]             `db:"flexible"`
	OptionalFlexible pgsid.Null[pgtype.Array[pgsid.Null[int32]]] `db:"optional_flexible"`
	Owners           [][]pgsid.Null[UserId]                      `db:"owners"`
}
type ArrayView struct {
	Matrix   [][]pgsid.Null[int32]           `db:"matrix"`
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
}
