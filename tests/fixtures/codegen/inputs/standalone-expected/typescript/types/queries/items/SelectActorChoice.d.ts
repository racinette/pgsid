type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
export type SelectActorChoiceParams = {
    "id": number | null;
};
export type SelectActorChoiceRow = {
    "actor": PgsidJson<number> | null;
};
