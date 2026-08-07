import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// A recording wrapper around the NullabilityCatalog.
//
// The catalog is the whole of what the walk knows about a schema: it is a pure
// data interface, so "which catalog QUESTION did this statement ask" is
// observable without touching the walk at all. Wrapping it answers two things
// no other suite does.
//
//   - Whether a `handled` catalog-feature label is TRUE. The label claims a
//     branch keys on the fact; if the accessor that carries it never fires
//     across the corpus, the branch is gone or was never there.
//   - Which capabilities the corpus never exercises. An accessor nothing calls
//     is either an untested branch or a capture nobody needs, and neither is
//     visible from the outside.
//
// Function members are recorded on CALL. The three Map members (`fnBodyAsts`,
// `fnArgDefaultAsts`, `viewAsts`) are recorded on property ACCESS: the walk
// reads them directly, so the access IS the question.
// ---------------------------------------------------------------------------

export interface CatalogSpy {
  /** The wrapper to hand to the walk in place of the real catalog. */
  catalog: NullabilityCatalog;
  /** Members touched so far, by name. */
  touched: Set<string>;
}

export function spyOnCatalog(catalog: NullabilityCatalog): CatalogSpy {
  const touched = new Set<string>();
  const proxy = new Proxy(catalog, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string") return value;
      if (typeof value === "function") {
        // Record on CALL rather than on access: the walk destructures nothing,
        // but a member merely *read* — by a type guard, or by this proxy's own
        // caller — is not a question anyone asked.
        return (...args: unknown[]) => {
          touched.add(prop);
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      touched.add(prop);
      return value;
    },
  });
  return { catalog: proxy, touched };
}

/** Every member of the interface, as the spy would name it. */
export function catalogMembers(catalog: NullabilityCatalog): string[] {
  return Object.keys(catalog).sort();
}
