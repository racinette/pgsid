const ZONE_SEARCH_STEPS: &[usize] = &[4, 2, 1];
const ZONE_NAMES: &[&str] = &[
    "test/invalid",
    "test/julian",
    "test/ordinal",
    "test/seconds",
    "test/signed",
];
const ZONE_IDS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_STARTS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_ENDS: &[usize] = &[1, 2, 3, 4, 5];
const ZONE_INITIAL_OFFSET_IDS: &[usize] = &[0, 0, 0, 0, 0];
const ZONE_RECURRING: &[usize] = &[1, 1, 1, 1, 1];
const ZONE_FUTURE_RULES: &[&str] = &[
    "STD0DST,M13.1.0,M10.1.0",
    "STD0DST,J60/0,J300/0",
    "STD0DST,59/0,300/0",
    "STD-0:30:60DST-1:45:60,M3.5.0/26:30:60,M10.5.0/-1:20:60",
    "STD0DST-1;J1/-2,J300/26",
];
const ZONE_BLOCK_STARTS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_BLOCK_ENDS: &[usize] = &[1, 2, 3, 4, 5];
const ZONE_CHECKPOINT_SECONDS: &[i64] = &[0i64, 0i64, 0i64, 0i64, 0i64];
const ZONE_BLOCK_TRANSITION_STARTS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_BLOCK_TRANSITION_ENDS: &[usize] = &[1, 2, 3, 4, 5];
const ZONE_BLOCK_DELTA_STARTS: &[usize] = &[0, 0, 0, 0, 0];
const ZONE_TRANSITION_DELTA_SECONDS: &[i64] = &[];
const ZONE_TRANSITION_DELTA_IDS: &[u16] = &[];
const ZONE_OFFSET_STARTS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_OFFSET_IDS: &[usize] = &[0, 0, 0, 0, 0];
const ZONE_OFFSET_SECONDS: &[i32] = &[0, 0, 0, 1860, 0];
const ZONE_ABBREVIATIONS: &[&str] = &["STD"];
const ZONE_INITIAL_ABBREVIATION_IDS: &[usize] = &[0, 0, 0, 0, 0];
const ZONE_ABBREVIATION_IDS: &[u16] = &[0, 0, 0, 0, 0];

const ZONE_TYPE_STARTS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_TYPE_ENDS: &[usize] = &[1, 2, 3, 4, 5];
const ZONE_TYPE_ABBREVIATION_IDS: &[usize] = &[0, 0, 0, 0, 0];
const ZONE_TYPE_OFFSET_SECONDS: &[i32] = &[0, 0, 0, 1860, 0];
const ZONE_TYPE_DAYLIGHT: &[i32] = &[0, 0, 0, 0, 0];
const ZONE_TYPE_VISIBLE: &[i32] = &[1, 1, 1, 1, 1];
const ZONE_DEFAULT_ABBREVIATION_NAMES: &[&str] = &[];
const ZONE_DEFAULT_ABBREVIATION_SECONDS: &[i32] = &[];
const ZONE_DEFAULT_ABBREVIATION_ZONES: &[&str] = &[];

const ZONE_FORCE_STARTS: &[usize] = &[0, 1, 2, 3, 4];
const ZONE_FORCE_ENDS: &[usize] = &[1, 2, 3, 4, 5];
const ZONE_FORCE_SECONDS: &[i64] = &[0i64, 0i64, 0i64, 0i64, 0i64];
const ZONE_FORCE_TYPE_IDS: &[u16] = &[0, 1, 2, 3, 4];
const ZONE_FORCE_INITIAL_TYPES: &[usize] = &[0, 1, 2, 3, 4];
