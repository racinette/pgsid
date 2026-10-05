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
    initial: i32,
    future: String,
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
    assert!(offsets.iter().all(|offset| offset.abs() < 86400));
    let indexes = &bytes[types_start..types_start + transitions];
    assert!(indexes.iter().all(|index| (*index as usize) < types));
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
    let mut initial = offsets[default_type];
    let mut times = Vec::new();
    let mut changes = Vec::new();
    for (i, index) in indexes.iter().enumerate() {
        let unix_seconds = i64::from_be_bytes(
            bytes[times_start + i * 8..times_start + i * 8 + 8]
                .try_into()
                .unwrap(),
        );
        let microseconds = (unix_seconds as i128 - 946684800) * 1000000;
        if microseconds < i64::MIN as i128 {
            initial = offsets[*index as usize];
            continue;
        }
        if microseconds > i64::MAX as i128 {
            break;
        }
        times.push(microseconds as i64);
        changes.push(offsets[*index as usize]);
    }
    assert!(times.windows(2).all(|pair| pair[0] < pair[1]));
    let end = header + 44 + block_size(bytes, header, 8);
    let future = std::str::from_utf8(&bytes[end..])
        .unwrap()
        .trim_matches('\n')
        .to_string();
    Zone {
        times,
        offsets: changes,
        initial,
        future,
    }
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
    for zone in &zones {
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
    let numeric_table_bytes = (checkpoint_seconds.len() + delta_seconds.len()) * 8
        + delta_ids.len() * size_of::<u16>()
        + offsets.len() * 4
        + (indexes.len() + zones.len() * 7 + checkpoint_seconds.len() * 3 + offset_ids.len())
            * size_of::<usize>();
    let offset_dictionary_entries = offsets.len();
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
        .next_power_of_two()
        / 2;
    let mut steps = Vec::new();
    while step > 0 {
        steps.push(integer(step as i64, false));
        step /= 2;
    }
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
        "transitionOffsetIndexBytes": size_of::<usize>(),
        "numericTableBytes": numeric_table_bytes + steps.len() * size_of::<usize>(),
        "utf8TableBytes": names.iter().map(String::len).sum::<usize>()
            + future.iter().map(|rule| rule.len()).sum::<usize>(),
        "rustSourceBytes": fs::metadata(output).unwrap().len(),
    });
    fs::write(
        output.with_extension("stats.json"),
        serde_json::to_string_pretty(&statistics).unwrap() + "\n",
    )
    .unwrap();
    let fixtures = serde_json::json!({"names":files.keys().collect::<Vec<_>>(),"ids":files.values().map(|bytes| unique[bytes]).collect::<Vec<_>>(),"zones":zones.iter().map(|zone|serde_json::json!({"times":zone.times.iter().map(|time|time.to_string()).collect::<Vec<_>>(),"offsets":zone.offsets,"initial":zone.initial,"future":zone.future})).collect::<Vec<_>>()});
    fs::write(
        output.with_extension("fixtures.json"),
        serde_json::to_string(&fixtures).unwrap(),
    )
    .unwrap();
    println!("{statistics}");
}
