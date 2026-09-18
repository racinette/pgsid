import type { BuiltinInventoryGroup } from './taxonomy.js'
import { PG18_AGGREGATES } from './aggregates.generated.js'
import { PG18_ARRAYS } from './arrays.generated.js'
import { PG18_BINARY } from './binary.generated.js'
import { PG18_BOOLEAN } from './boolean.generated.js'
import { PG18_CATALOG } from './catalog.generated.js'
import { PG18_GENERIC } from './generic.generated.js'
import { PG18_GEOMETRY } from './geometry.generated.js'
import { PG18_JSON } from './json.generated.js'
import { PG18_NETWORK } from './network.generated.js'
import { PG18_NUMERIC } from './numeric.generated.js'
import { PG18_RANGES } from './ranges.generated.js'
import { PG18_SUPPORT } from './support.generated.js'
import { PG18_TEMPORAL } from './temporal.generated.js'
import { PG18_TEXT } from './text.generated.js'
import { PG18_TEXT_SEARCH } from './text-search.generated.js'
import { PG18_TRANSACTION } from './transaction.generated.js'
import { PG18_UUID } from './uuid.generated.js'
import { PG18_WINDOWS } from './windows.generated.js'
import { PG18_XML } from './xml.generated.js'
export const PG18_BUILTINS_VERSION = 180003 as const
export const PG18_BUILTIN_GROUPS: readonly BuiltinInventoryGroup[] = [
  { domain: 'aggregates', inventory: PG18_AGGREGATES },
  { domain: 'arrays', inventory: PG18_ARRAYS },
  { domain: 'binary', inventory: PG18_BINARY },
  { domain: 'boolean', inventory: PG18_BOOLEAN },
  { domain: 'catalog', inventory: PG18_CATALOG },
  { domain: 'generic', inventory: PG18_GENERIC },
  { domain: 'geometry', inventory: PG18_GEOMETRY },
  { domain: 'json', inventory: PG18_JSON },
  { domain: 'network', inventory: PG18_NETWORK },
  { domain: 'numeric', inventory: PG18_NUMERIC },
  { domain: 'ranges', inventory: PG18_RANGES },
  { domain: 'support', inventory: PG18_SUPPORT },
  { domain: 'temporal', inventory: PG18_TEMPORAL },
  { domain: 'text', inventory: PG18_TEXT },
  { domain: 'text-search', inventory: PG18_TEXT_SEARCH },
  { domain: 'transaction', inventory: PG18_TRANSACTION },
  { domain: 'uuid', inventory: PG18_UUID },
  { domain: 'windows', inventory: PG18_WINDOWS },
  { domain: 'xml', inventory: PG18_XML },
]
