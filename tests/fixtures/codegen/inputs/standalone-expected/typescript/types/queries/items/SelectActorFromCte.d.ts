type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
export type SelectActorFromCteParams = {
    "id": number | null;
};
export type SelectActorFromCteRow = {
    "actor": PgsidJson<number> | null;
};
