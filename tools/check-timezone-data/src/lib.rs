use quote::ToTokens;
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
    process::Command,
};
use syn::{parse_quote, Expr, LitInt};

const TRANSITIONS_PER_BLOCK: usize = 32;

struct Zone {
    times: Vec<i64>,
    offsets: Vec<i32>,
    abbreviations: Vec<String>,
    initial: i32,
    initial_abbreviation: String,
    future: String,
    types: Vec<(String, i32, i32, bool)>,
    forced_seconds: Vec<i64>,
    forced_types: Vec<usize>,
    initial_type: usize,
}

fn u32_at(bytes: &[u8], index: usize) -> usize {
    u32::from_be_bytes(bytes[index..index + 4].try_into().unwrap()) as usize
}

fn block_size(bytes: &[u8], header: usize, width: usize) -> usize {
    let counts: Vec<usize> = (0..6).map(|i| u32_at(bytes, header + 20 + i * 4)).collect();
    counts[3] * (width + 1)
        + counts[4] * 6
        + counts[5]
        + counts[2] * (width + 4)
        + counts[0]
        + counts[1]
}

fn decode(bytes: &[u8]) -> Zone {
    assert_eq!(&bytes[..4], b"TZif");
    assert!(bytes[4] == b'2' || bytes[4] == b'3');
    let header = 44 + block_size(bytes, 0, 4);
    assert_eq!(&bytes[header..header + 4], b"TZif");
    let transitions = u32_at(bytes, header + 32);
    let types = u32_at(bytes, header + 36);
    assert!(types > 0);
    assert_eq!(
        u32_at(bytes, header + 28),
        0,
        "leap-second tables require separate semantics"
    );
    let times_start = header + 44;
    let types_start = times_start + transitions * 8;
    let offset_start = types_start + transitions;
    let offsets: Vec<i32> = (0..types)
        .map(|i| {
            i32::from_be_bytes(
                bytes[offset_start + i * 6..offset_start + i * 6 + 4]
                    .try_into()
                    .unwrap(),
            )
        })
        .collect();
    let abbreviation_start = offset_start + types * 6;
    let abbreviation_end = abbreviation_start + u32_at(bytes, header + 40);
    let abbreviations: Vec<String> = (0..types)
        .map(|i| {
            let start = abbreviation_start + usize::from(bytes[offset_start + i * 6 + 5]);
            assert!(start < abbreviation_end);
            let length = bytes[start..abbreviation_end]
                .iter()
                .position(|b| *b == 0)
                .unwrap();
            let value = &bytes[start..start + length];
            assert!(value.is_ascii());
            String::from_utf8(value.to_vec()).unwrap()
        })
        .collect();
    assert!(offsets.iter().all(|offset| offset.abs() < 86400));
    let indexes = &bytes[types_start..types_start + transitions];
    assert!(indexes.iter().all(|index| (*index as usize) < types));
    let mut all_types: Vec<(String, i32, i32, bool)> = (0..types)
        .map(|index| {
            let raw_index = usize::from(bytes[offset_start + index * 6 + 5]);
            let mut first = 0;
            while first < abbreviation_end - abbreviation_start {
                let end = bytes[abbreviation_start + first..abbreviation_end]
                    .iter()
                    .position(|byte| *byte == 0)
                    .unwrap()
                    + first;
                if &bytes[abbreviation_start + first..abbreviation_start + end]
                    == abbreviations[index].as_bytes()
                {
                    break;
                }
                first = end + 1;
            }
            (
                abbreviations[index].clone(),
                offsets[index],
                i32::from(bytes[offset_start + index * 6 + 4]),
                first == raw_index,
            )
        })
        .collect();
    let mut default_type = if indexes.contains(&0) { None } else { Some(0) };
    if default_type.is_none()
        && transitions > 0
        && bytes[offset_start + indexes[0] as usize * 6 + 4] != 0
    {
        default_type = (0..indexes[0] as usize)
            .rev()
            .find(|i| bytes[offset_start + i * 6 + 4] == 0);
    }
    let default_type = default_type.unwrap_or_else(|| {
        (0..types)
            .find(|i| bytes[offset_start + i * 6 + 4] == 0)
            .unwrap_or(0)
    });
    let forced_seconds = (0..transitions)
        .map(|index| {
            let unix = i64::from_be_bytes(
                bytes[times_start + index * 8..times_start + index * 8 + 8]
                    .try_into()
                    .unwrap(),
            );
            (i128::from(unix) - 946684800).clamp(i128::from(i64::MIN), i128::from(i64::MAX)) as i64
        })
        .collect();
    let forced_types = indexes.iter().map(|index| usize::from(*index)).collect();
    let mut initial = offsets[default_type];
    let mut initial_abbreviation = abbreviations[default_type].clone();
    let mut times = Vec::new();
    let mut changes = Vec::new();
    let mut labels = Vec::new();
    for (i, index) in indexes.iter().enumerate() {
        let unix_seconds = i64::from_be_bytes(
            bytes[times_start + i * 8..times_start + i * 8 + 8]
                .try_into()
                .unwrap(),
        );
        let microseconds = (unix_seconds as i128 - 946684800) * 1000000;
        if microseconds < i64::MIN as i128 {
            initial = offsets[*index as usize];
            initial_abbreviation = abbreviations[*index as usize].clone();
            continue;
        }
        if microseconds > i64::MAX as i128 {
            break;
        }
        times.push(microseconds as i64);
        changes.push(offsets[*index as usize]);
        labels.push(abbreviations[*index as usize].clone());
    }
    assert!(times.windows(2).all(|pair| pair[0] < pair[1]));
    let end = header + 44 + block_size(bytes, header, 8);
    let future = std::str::from_utf8(&bytes[end..])
        .unwrap()
        .trim_matches('\n')
        .to_string();
    let mut characters = bytes[abbreviation_start..abbreviation_end].to_vec();
    let footer = footer_types(&future);
    for (label, seconds, daylight) in &footer {
        let (label, seconds, daylight) = (label.clone(), *seconds, *daylight);
        let mut terminated = label.as_bytes().to_vec();
        terminated.push(0);
        let slot = characters
            .windows(terminated.len())
            .position(|window| window == terminated);
        let slot = slot.unwrap_or_else(|| {
            let start = characters.len();
            characters.extend(&terminated);
            start
        });
        let mut visible = 0;
        while visible < characters.len() {
            let end = characters[visible..]
                .iter()
                .position(|byte| *byte == 0)
                .unwrap()
                + visible;
            if characters[visible..=end] == terminated {
                break;
            }
            visible = end + 1;
        }
        all_types.push((label, seconds, daylight, visible == slot));
    }
    if footer.len() == 2 {
        for (label, seconds, _) in &footer {
            let entry = all_types
                .iter()
                .rev()
                .find(|(candidate, offset, _, _)| candidate == label && offset == seconds)
                .unwrap();
            if entry.3 {
                let last = indexes
                    .iter()
                    .rev()
                    .map(|index| &all_types[usize::from(*index)])
                    .find(|(candidate, _, _, visible)| *visible && candidate == label)
                    .or_else(|| {
                        let initial = &all_types[default_type];
                        (initial.3 && initial.0 == *label).then_some(initial)
                    });
                assert!(
                    last.is_none_or(|entry| entry.1 == *seconds),
                    "future abbreviation {label} changes after the raw transition window"
                );
            }
        }
    }
    Zone {
        times,
        offsets: changes,
        abbreviations: labels,
        initial,
        initial_abbreviation,
        future,
        types: all_types,
        forced_seconds,
        forced_types,
        initial_type: default_type,
    }
}

fn footer_types(source: &str) -> Vec<(String, i32, i32)> {
    fn label<'a>(source: &mut &'a str) -> &'a str {
        if source.starts_with('<') {
            let end = source.find('>').unwrap();
            let value = &source[1..end];
            *source = &source[end + 1..];
            value
        } else {
            let end = source
                .find(|c: char| c.is_ascii_digit() || c == '+' || c == '-' || c == ',' || c == ';')
                .unwrap_or(source.len());
            let value = &source[..end];
            *source = &source[end..];
            value
        }
    }
    fn clock(source: &mut &str) -> i32 {
        let mut sign = 1;
        if source.starts_with('-') {
            sign = -1;
            *source = &source[1..];
        } else if source.starts_with('+') {
            *source = &source[1..];
        }
        let mut value = 0;
        for index in 0..3 {
            let end = source
                .find(|c: char| !c.is_ascii_digit())
                .unwrap_or(source.len());
            assert!(end > 0);
            value = value * 60 + source[..end].parse::<i32>().unwrap();
            *source = &source[end..];
            if !source.starts_with(':') {
                return sign * value * 60i32.pow(2 - index);
            }
            assert!(index < 2);
            *source = &source[1..];
        }
        unreachable!()
    }
    if source.is_empty() {
        return Vec::new();
    }
    let mut rest = source;
    let standard = label(&mut rest).to_string();
    let seconds = -clock(&mut rest);
    let mut types = vec![(standard, seconds, 0)];
    if !rest.is_empty() {
        let daylight = label(&mut rest).to_string();
        assert!(!daylight.is_empty());
        let seconds = if rest.starts_with(',') || rest.starts_with(';') {
            seconds + 3600
        } else {
            -clock(&mut rest)
        };
        assert!(rest.starts_with(',') || rest.starts_with(';'));
        types.push((daylight, seconds, 1));
    }
    types
}

fn collect(directory: &Path, root: &Path, files: &mut BTreeMap<String, Vec<u8>>) {
    for entry in fs::read_dir(directory).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() {
            collect(&path, root, files);
        } else {
            files.insert(
                path.strip_prefix(root)
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_string(),
                fs::read(path).unwrap(),
            );
        }
    }
}

fn integer(value: i64, wide: bool) -> Expr {
    let digits: LitInt = syn::parse_str(&format!(
        "{}{}",
        value.unsigned_abs(),
        if wide { "i64" } else { "" }
    ))
    .unwrap();
    if value < 0 {
        parse_quote!(-#digits)
    } else {
        parse_quote!(#digits)
    }
}

fn parse_default_abbreviations(source: &str) -> BTreeMap<String, (i32, String)> {
    let mut entries = BTreeMap::new();
    for line in source.lines() {
        let fields: Vec<_> = line.split('#').next().unwrap().split_whitespace().collect();
        if fields.is_empty() {
            continue;
        }
        assert!((2..=3).contains(&fields.len()));
        assert!(fields[0].is_ascii() && fields[0].len() <= 10);
        let value = if let Ok(seconds) = fields[1].parse::<i32>() {
            assert!((-50400..=50400).contains(&seconds));
            if fields.len() == 3 {
                assert_eq!(fields[2], "D");
            }
            (seconds, String::new())
        } else {
            assert_eq!(fields.len(), 2);
            assert!(fields[1].contains('/'));
            (0, fields[1].to_owned())
        };
        assert!(entries
            .insert(fields[0].to_ascii_lowercase(), value)
            .is_none());
    }
    entries
}

pub fn generate(root: &Path, output: &Path) {
    let mut files = BTreeMap::new();
    collect(root, root, &mut files);
    let mut unique = BTreeMap::<Vec<u8>, usize>::new();
    let mut zones = Vec::new();
    let mut names = Vec::new();
    let mut indexes = Vec::new();
    for (name, bytes) in &files {
        let index = if let Some(index) = unique.get(bytes) {
            *index
        } else {
            let index = zones.len();
            zones.push(decode(bytes));
            unique.insert(bytes.clone(), index);
            index
        };
        names.push(name.to_ascii_lowercase());
        indexes.push(index);
    }
    let mut sorted: Vec<_> = names.into_iter().zip(indexes).collect();
    sorted.sort();
    assert!(sorted.windows(2).all(|pair| pair[0].0 != pair[1].0));
    let (names, indexes): (Vec<_>, Vec<_>) = sorted.into_iter().unzip();
    let mut starts = Vec::new();
    let mut ends = Vec::new();
    let mut initial = Vec::new();
    let mut future = Vec::new();
    let mut times = Vec::new();
    let mut offsets = Vec::new();
    let mut offset_starts = Vec::new();
    let mut offset_ids = Vec::new();
    let mut block_starts = Vec::new();
    let mut block_ends = Vec::new();
    let mut checkpoint_seconds = Vec::new();
    let mut block_transition_starts = Vec::new();
    let mut block_transition_ends = Vec::new();
    let mut block_delta_starts = Vec::new();
    let mut deltas = Vec::new();
    let mut recurring = Vec::new();
    let abbreviations: Vec<String> = zones
        .iter()
        .flat_map(|zone| {
            std::iter::once(&zone.initial_abbreviation)
                .chain(&zone.abbreviations)
                .chain(zone.types.iter().map(|(label, _, _, _)| label))
        })
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    assert!(abbreviations.len() <= usize::from(u16::MAX) + 1);
    let mut type_starts = Vec::new();
    let mut type_ends = Vec::new();
    let mut type_abbreviation_ids = Vec::new();
    let mut type_offsets = Vec::new();
    let mut type_daylight = Vec::new();
    let mut type_visible = Vec::new();
    let mut abbreviation_ids = Vec::new();
    let mut initial_abbreviation_ids = Vec::new();
    let mut forced_starts = Vec::new();
    let mut forced_ends = Vec::new();
    let mut forced_seconds = Vec::new();
    let mut forced_type_ids = Vec::new();
    let mut forced_initial_types = Vec::new();
    for zone in &zones {
        let type_base = type_offsets.len();
        forced_starts.push(integer(forced_seconds.len() as i64, false));
        forced_seconds.extend(
            zone.forced_seconds
                .iter()
                .map(|seconds| integer(*seconds, true)),
        );
        forced_type_ids.extend(
            zone.forced_types
                .iter()
                .map(|index| u16::try_from(type_base + index).unwrap()),
        );
        forced_ends.push(integer(forced_seconds.len() as i64, false));
        forced_initial_types.push(integer((type_base + zone.initial_type) as i64, false));
        type_starts.push(integer(type_offsets.len() as i64, false));
        for (label, seconds, daylight, visible) in &zone.types {
            type_abbreviation_ids.push(integer(
                abbreviations.binary_search(label).unwrap() as i64,
                false,
            ));
            type_offsets.push(integer(i64::from(*seconds), false));
            type_daylight.push(integer(i64::from(*daylight), false));
            type_visible.push(integer(i64::from(*visible), false));
        }
        type_ends.push(integer(type_offsets.len() as i64, false));
        assert_eq!(zone.times.len(), zone.abbreviations.len());
        initial_abbreviation_ids.push(
            abbreviations
                .binary_search(&zone.initial_abbreviation)
                .unwrap(),
        );
        abbreviation_ids.extend(
            zone.abbreviations
                .iter()
                .map(|label| u16::try_from(abbreviations.binary_search(label).unwrap()).unwrap()),
        );
        starts.push(times.len());
        block_starts.push(checkpoint_seconds.len());
        for (block, values) in zone.times.chunks(TRANSITIONS_PER_BLOCK).enumerate() {
            assert!(values.iter().all(|time| time % 1_000_000 == 0));
            checkpoint_seconds.push(values[0] / 1_000_000);
            let start = times.len() + block * TRANSITIONS_PER_BLOCK;
            block_transition_starts.push(start);
            block_transition_ends.push(start + values.len());
            block_delta_starts.push(deltas.len());
            deltas.extend(
                values
                    .windows(2)
                    .map(|pair| pair[1] / 1_000_000 - pair[0] / 1_000_000),
            );
        }
        block_ends.push(checkpoint_seconds.len());
        times.extend(zone.times.iter().copied());
        offset_starts.push(offsets.len());
        let mut dictionary = BTreeMap::new();
        for offset in std::iter::once(&zone.initial).chain(&zone.offsets) {
            if !dictionary.contains_key(offset) {
                let id = dictionary.len();
                dictionary.insert(*offset, id);
                offsets.push(*offset);
            }
        }
        offset_ids.extend(zone.offsets.iter().map(|offset| dictionary[offset]));
        ends.push(times.len());
        initial.push(dictionary[&zone.initial]);
        future.push(zone.future.as_str());
        let quoted_end = if zone.future.starts_with('<') {
            zone.future.find('>').unwrap() + 1
        } else {
            zone.future
                .find(|c: char| c.is_ascii_digit() || c == '+' || c == '-')
                .unwrap_or(zone.future.len())
        };
        let tail = &zone.future[quoted_end..];
        recurring
            .push(usize::from(tail.chars().any(|c| {
                !(c.is_ascii_digit() || c == ':' || c == '+' || c == '-')
            })));
    }
    let delta_seconds: Vec<_> = deltas
        .iter()
        .copied()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    assert!(
        delta_seconds.len() <= usize::from(u16::MAX) + 1,
        "transition delta dictionary exceeds u16 index range"
    );
    assert!(delta_seconds.iter().all(|delta| *delta > 0));
    let delta_ids: Vec<_> = deltas
        .iter()
        .map(|delta| u16::try_from(delta_seconds.binary_search(delta).unwrap()).unwrap())
        .collect();
    for block in 0..checkpoint_seconds.len() {
        let start = block_transition_starts[block];
        let end = block_transition_ends[block];
        assert!(end - start <= TRANSITIONS_PER_BLOCK);
        let mut seconds = checkpoint_seconds[block];
        assert_eq!(seconds * 1_000_000, times[start]);
        for index in start + 1..end {
            seconds += delta_seconds
                [usize::from(delta_ids[block_delta_starts[block] + index - start - 1])];
            assert_eq!(seconds * 1_000_000, times[index]);
        }
    }
    let default_abbreviations =
        parse_default_abbreviations(include_str!("../../../vendor/postgresql-timezone/Default"));
    let default_names: Vec<_> = default_abbreviations.keys().cloned().collect();
    let default_seconds: Vec<_> = default_abbreviations
        .values()
        .map(|(seconds, _)| integer(i64::from(*seconds), false))
        .collect();
    let default_zones: Vec<_> = default_abbreviations
        .values()
        .map(|(_, zone)| zone.clone())
        .collect();
    let numeric_table_bytes = forced_seconds.len() * 8
        + forced_type_ids.len() * size_of::<u16>()
        + zones.len() * 3 * size_of::<usize>()
        + (checkpoint_seconds.len() + delta_seconds.len()) * 8
        + delta_ids.len() * size_of::<u16>()
        + abbreviation_ids.len() * size_of::<u16>()
        + initial_abbreviation_ids.len() * size_of::<usize>()
        + offsets.len() * 4
        + type_starts.len() * 2 * size_of::<usize>()
        + type_offsets.len() * (size_of::<usize>() + 12)
        + default_seconds.len() * 4
        + (indexes.len() + zones.len() * 7 + checkpoint_seconds.len() * 3 + offset_ids.len())
            * size_of::<usize>();
    let offset_dictionary_entries = offsets.len();
    let initial_abbreviation_ids: Vec<_> = initial_abbreviation_ids
        .iter()
        .map(|id| integer(*id as i64, false))
        .collect();
    let abbreviation_ids: Vec<_> = abbreviation_ids
        .iter()
        .map(|id| integer(i64::from(*id), false))
        .collect();
    let indexes: Vec<_> = indexes.iter().map(|i| integer(*i as i64, false)).collect();
    let starts: Vec<_> = starts.iter().map(|i| integer(*i as i64, false)).collect();
    let ends: Vec<_> = ends.iter().map(|i| integer(*i as i64, false)).collect();
    let initial: Vec<_> = initial.iter().map(|i| integer(*i as i64, false)).collect();
    let offsets: Vec<_> = offsets.iter().map(|i| integer(*i as i64, false)).collect();
    let offset_starts: Vec<_> = offset_starts
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let offset_ids: Vec<_> = offset_ids
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let recurring: Vec<_> = recurring
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let checkpoints: Vec<_> = checkpoint_seconds
        .iter()
        .map(|time| integer(*time, true))
        .collect();
    let delta_literals: Vec<_> = delta_seconds
        .iter()
        .map(|delta| integer(*delta, true))
        .collect();
    let delta_ids: Vec<_> = delta_ids
        .iter()
        .map(|id| integer(i64::from(*id), false))
        .collect();
    let block_starts: Vec<_> = block_starts
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let block_ends: Vec<_> = block_ends
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let block_transition_starts: Vec<_> = block_transition_starts
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let block_transition_ends: Vec<_> = block_transition_ends
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let block_delta_starts: Vec<_> = block_delta_starts
        .iter()
        .map(|i| integer(*i as i64, false))
        .collect();
    let mut step = checkpoint_seconds
        .len()
        .max(names.len())
        .max(
            zones
                .iter()
                .map(|zone| zone.forced_seconds.len())
                .max()
                .unwrap_or(0),
        )
        .next_power_of_two()
        / 2;
    let mut steps = Vec::new();
    while step > 0 {
        steps.push(integer(step as i64, false));
        step /= 2;
    }
    let forced_type_literals: Vec<_> = forced_type_ids
        .iter()
        .map(|index| integer(i64::from(*index), false))
        .collect();
    let file: syn::File = parse_quote! {
        const ZONE_SEARCH_STEPS: &[usize] = &[#(#steps),*];
        const ZONE_NAMES: &[&str] = &[#(#names),*];
        const ZONE_IDS: &[usize] = &[#(#indexes),*];
        const ZONE_STARTS: &[usize] = &[#(#starts),*];
        const ZONE_ENDS: &[usize] = &[#(#ends),*];
        const ZONE_INITIAL_OFFSET_IDS: &[usize] = &[#(#initial),*];
        const ZONE_RECURRING: &[usize] = &[#(#recurring),*];
        const ZONE_FUTURE_RULES: &[&str] = &[#(#future),*];
        const ZONE_BLOCK_STARTS: &[usize] = &[#(#block_starts),*];
        const ZONE_BLOCK_ENDS: &[usize] = &[#(#block_ends),*];
        const ZONE_CHECKPOINT_SECONDS: &[i64] = &[#(#checkpoints),*];
        const ZONE_BLOCK_TRANSITION_STARTS: &[usize] = &[#(#block_transition_starts),*];
        const ZONE_BLOCK_TRANSITION_ENDS: &[usize] = &[#(#block_transition_ends),*];
        const ZONE_BLOCK_DELTA_STARTS: &[usize] = &[#(#block_delta_starts),*];
        const ZONE_TRANSITION_DELTA_SECONDS: &[i64] = &[#(#delta_literals),*];
        const ZONE_TRANSITION_DELTA_IDS: &[u16] = &[#(#delta_ids),*];
        const ZONE_OFFSET_STARTS: &[usize] = &[#(#offset_starts),*];
        const ZONE_OFFSET_IDS: &[usize] = &[#(#offset_ids),*];
        const ZONE_OFFSET_SECONDS: &[i32] = &[#(#offsets),*];
        const ZONE_FORCE_STARTS: &[usize] = &[#(#forced_starts),*];
        const ZONE_FORCE_ENDS: &[usize] = &[#(#forced_ends),*];
        const ZONE_FORCE_SECONDS: &[i64] = &[#(#forced_seconds),*];
        const ZONE_FORCE_TYPE_IDS: &[u16] = &[#(#forced_type_literals),*];
        const ZONE_FORCE_INITIAL_TYPES: &[usize] = &[#(#forced_initial_types),*];
        const ZONE_TYPE_STARTS: &[usize] = &[#(#type_starts),*];
        const ZONE_TYPE_ENDS: &[usize] = &[#(#type_ends),*];
        const ZONE_TYPE_ABBREVIATION_IDS: &[usize] = &[#(#type_abbreviation_ids),*];
        const ZONE_TYPE_OFFSET_SECONDS: &[i32] = &[#(#type_offsets),*];
        const ZONE_TYPE_DAYLIGHT: &[i32] = &[#(#type_daylight),*];
        const ZONE_TYPE_VISIBLE: &[i32] = &[#(#type_visible),*];
        const ZONE_DEFAULT_ABBREVIATION_NAMES: &[&str] = &[#(#default_names),*];
        const ZONE_DEFAULT_ABBREVIATION_SECONDS: &[i32] = &[#(#default_seconds),*];
        const ZONE_DEFAULT_ABBREVIATION_ZONES: &[&str] = &[#(#default_zones),*];
        const ZONE_ABBREVIATIONS: &[&str] = &[#(#abbreviations),*];
        const ZONE_INITIAL_ABBREVIATION_IDS: &[usize] = &[#(#initial_abbreviation_ids),*];
        const ZONE_ABBREVIATION_IDS: &[u16] = &[#(#abbreviation_ids),*];
    };
    fs::write(output, file.into_token_stream().to_string()).unwrap();
    assert!(Command::new("rustfmt")
        .args(["--edition", "2021"])
        .arg(output)
        .status()
        .unwrap()
        .success());
    let statistics = serde_json::json!({
        "zoneNames": files.len(),
        "distinctDatasets": zones.len(),
        "transitions": times.len(),
        "transitionCheckpoints": checkpoint_seconds.len(),
        "distinctTransitionDeltas": delta_seconds.len(),
        "transitionDeltas": deltas.len(),
        "maxTransitionsPerBlock": TRANSITIONS_PER_BLOCK,
        "transitionIndexBytes": size_of::<u16>(),
        "offsetDictionaryEntries": offset_dictionary_entries,
        "distinctAbbreviations": abbreviations.len(),
        "timezoneTypeRecords": type_offsets.len(),
        "forcedAbbreviationTransitions": forced_seconds.len(),
        "defaultAbbreviations": default_abbreviations.len(),
        "transitionAbbreviationIndexBytes": size_of::<u16>(),
        "transitionOffsetIndexBytes": size_of::<usize>(),
        "numericTableBytes": numeric_table_bytes + steps.len() * size_of::<usize>(),
        "utf8TableBytes": names.iter().map(String::len).sum::<usize>()
            + future.iter().map(|rule| rule.len()).sum::<usize>()
            + abbreviations.iter().map(String::len).sum::<usize>()
            + default_names.iter().map(String::len).sum::<usize>() + default_zones.iter().map(String::len).sum::<usize>(),
        "rustSourceBytes": fs::metadata(output).unwrap().len(),
    });
    fs::write(
        output.with_extension("stats.json"),
        serde_json::to_string_pretty(&statistics).unwrap() + "\n",
    )
    .unwrap();
    let fixtures = serde_json::json!({"names":files.keys().collect::<Vec<_>>(),"ids":files.values().map(|bytes| unique[bytes]).collect::<Vec<_>>(),"zones":zones.iter().map(|zone|serde_json::json!({"times":zone.times.iter().map(|time|time.to_string()).collect::<Vec<_>>(),"offsets":zone.offsets,"abbreviations":zone.abbreviations,"initial":zone.initial,"initialAbbreviation":zone.initial_abbreviation,"future":zone.future})).collect::<Vec<_>>()});
    fs::write(
        output.with_extension("fixtures.json"),
        serde_json::to_string(&fixtures).unwrap(),
    )
    .unwrap();
    println!("{statistics}");
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Scratch(std::path::PathBuf);
    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn preserves_unused_type_records_and_native_abbreviation_string_slots() {
        let mut header = vec![0u8; 44];
        header[..5].copy_from_slice(b"TZif2");
        let mut second = header.clone();
        second[36..40].copy_from_slice(&3u32.to_be_bytes());
        second[40..44].copy_from_slice(&8u32.to_be_bytes());
        let mut bytes = header;
        bytes.extend(second);
        for (seconds, daylight, label) in [(0i32, 0, 0), (7200, 1, 4), (3600, 0, 5)] {
            bytes.extend(seconds.to_be_bytes());
            bytes.push(daylight);
            bytes.push(label);
        }
        bytes.extend(b"UTC\0ABC\0");
        bytes.extend(b"\nUTC0\n");
        let zone = decode(&bytes);
        assert!(zone.times.is_empty());
        assert_eq!(
            zone.types,
            vec![
                ("UTC".into(), 0, 0, true),
                ("ABC".into(), 7200, 1, true),
                ("BC".into(), 3600, 0, false),
                ("UTC".into(), 0, 0, true)
            ]
        );
    }

    #[test]
    fn extends_the_native_abbreviation_roster_with_footer_types() {
        assert_eq!(
            footer_types("IST-1GMT0,M10.5.0,M3.5.0/1"),
            vec![("IST".into(), 3600, 0), ("GMT".into(), 0, 1)]
        );
        assert_eq!(
            footer_types("<+0545>-5:45"),
            vec![("+0545".into(), 20700, 0)]
        );
        assert_eq!(
            footer_types("STD0DST,M3.2.0,M11.1.0"),
            vec![("STD".into(), 0, 0), ("DST".into(), 3600, 1)]
        );
    }

    #[test]
    fn retains_forced_history_and_initial_type_before_the_microsecond_domain() {
        let mut header = vec![0u8; 44];
        header[..5].copy_from_slice(b"TZif2");
        let mut second = header.clone();
        second[32..36].copy_from_slice(&1u32.to_be_bytes());
        second[36..40].copy_from_slice(&2u32.to_be_bytes());
        second[40..44].copy_from_slice(&8u32.to_be_bytes());
        let mut bytes = header;
        bytes.extend(second);
        bytes.extend(i64::MIN.to_be_bytes());
        bytes.push(1);
        for (seconds, label) in [(0i32, 0), (3600, 4)] {
            bytes.extend(seconds.to_be_bytes());
            bytes.push(0);
            bytes.push(label);
        }
        bytes.extend(b"UTC\0OLD\0");
        bytes.extend(b"\nUTC0\n");
        let zone = decode(&bytes);
        assert!(zone.times.is_empty());
        assert_eq!(zone.initial, 3600);
        assert_eq!(zone.forced_seconds, vec![i64::MIN]);
        assert_eq!(zone.forced_types, vec![1]);
        assert_eq!(zone.initial_type, 0);
    }

    #[test]
    fn parses_the_released_default_abbreviation_profile() {
        let profile = parse_default_abbreviations(include_str!(
            "../../../vendor/postgresql-timezone/Default"
        ));
        assert_eq!(profile.len(), 195);
        assert_eq!(profile["utc"], (0, String::new()));
        assert_eq!(profile["est"], (-18000, String::new()));
        assert_eq!(profile["msk"], (0, "Europe/Moscow".into()));
        assert!(profile.keys().all(|key| key.len() < 10));
    }

    #[test]
    fn retains_abbreviation_changes_without_offset_changes() {
        let scratch = Scratch(std::env::temp_dir().join(format!(
            "pgsid-timezone-labels-{}-{}",
            std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
        )));
        fs::create_dir(&scratch.0).unwrap();
        let source = scratch.0.join("labels.zi");
        fs::write(
            &source,
            "Zone Test/Labels 0 - OLD 2000 Jan 1 0:00u\n\t0 - NEW\n",
        )
        .unwrap();
        let compiled = scratch.0.join("tzif");
        fs::create_dir(&compiled).unwrap();
        assert!(
            Command::new(std::env::var_os("ZIC").unwrap_or_else(|| "zic".into()))
                .arg("-d")
                .arg(&compiled)
                .arg(&source)
                .status()
                .unwrap()
                .success()
        );
        let zone = decode(&fs::read(compiled.join("Test/Labels")).unwrap());
        assert_eq!(zone.initial, 0);
        assert_eq!(zone.initial_abbreviation, "OLD");
        assert_eq!(zone.times, vec![0]);
        assert_eq!(zone.offsets, vec![0]);
        assert_eq!(zone.abbreviations, vec!["NEW"]);
        assert_eq!(zone.future, "NEW0");
    }
}
