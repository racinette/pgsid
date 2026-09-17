package public

import "github.com/jackc/pgx/v5/pgtype"

type UserId int32
type Arrays struct {
	Id               int32                `db:"id"`
	Ordinary         []int32              `db:"ordinary"`
	Matrix           [][]int32            `db:"matrix"`
	Cube             [][][]int32          `db:"cube"`
	Flexible         pgtype.Array[int32]  `db:"flexible"`
	OptionalFlexible *pgtype.Array[int32] `db:"optional_flexible"`
	Owners           [][]UserId           `db:"owners"`
}
type ArrayView struct {
	Matrix   [][]int32           `db:"matrix"`
	Flexible pgtype.Array[int32] `db:"flexible"`
}
