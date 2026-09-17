package pgsidpgx

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type QueryValidationError = validation.QueryValidationError

func ValidatedJSON(target any, contract, query, column string, nullable bool) any {
	return validation.ValidatedJSON(target, contract, query, column, nullable)
}
func ValidateJSONInput(value any, contract, query, column string, nullable bool) (any, error) {
	return validation.ValidateJSONInput(value, contract, query, column, nullable)
}
