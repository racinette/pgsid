export interface TableTypes<Select, Insert, Update> {
    readonly select: Select;
    readonly insert: Insert;
    readonly update: Update;
}
export type InferSelect<Table extends TableTypes<unknown, unknown, unknown>> = Table["select"];
export type InferInsert<Table extends TableTypes<unknown, unknown, unknown>> = Table["insert"];
export type InferUpdate<Table extends TableTypes<unknown, unknown, unknown>> = Table["update"];
