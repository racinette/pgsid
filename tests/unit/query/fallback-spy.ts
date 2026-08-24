import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// A recording wrapper around the NullabilityCatalog — catalog-spy.ts one level
// down. That spy records WHICH member a statement asked; this one records the
// ARGUMENTS and the RESULT of every call, because the fallback census's whole
// question is "did the typed channel DECLINE here": a fallback branch is
// reached exactly when a resolver the walk asked first answers `null` /
// `{ kind: "unknown" }`, and that fact is visible only in the results.
//
// Same boundary as catalog-spy: the catalog is a pure data interface, so this
// observes from the test side and the walk cannot tell the difference. No
// hook enters the engine.
//
// Results are recorded AFTER the call returns, so a member that throws is
// simply absent — none of the resolvers the census reads throws.
// ---------------------------------------------------------------------------

export interface RecordedCall {
  member: string;
  args: readonly unknown[];
  result: unknown;
}

export interface RecordingCatalog {
  /** The wrapper to hand to the walk in place of the real catalog. */
  catalog: NullabilityCatalog;
  /** Every call so far, in call order. */
  calls: RecordedCall[];
}

export function recordCatalog(catalog: NullabilityCatalog): RecordingCatalog {
  const calls: RecordedCall[] = [];
  const proxy = new Proxy(catalog, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = (value as (...a: unknown[]) => unknown).apply(target, args);
        calls.push({ member: prop, args, result });
        return result;
      };
    },
  });
  return { catalog: proxy, calls };
}
