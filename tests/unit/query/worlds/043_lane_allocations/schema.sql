-- @world checks
CREATE DOMAIN lane_slots AS integer[];
CREATE TABLE lane_allocations (
  slots lane_slots,
  standby integer[],
  requested_dimension integer,
  slot_limit integer,
  required_dimensions integer,
  first_slot integer,
  last_slot integer,
  layout text,
  use_standby boolean,
  CONSTRAINT slot_capacity CHECK (cardinality(slots) <= slot_limit),
  CONSTRAINT layout_rank CHECK (array_ndims(slots) IS NOT DISTINCT FROM required_dimensions),
  CONSTRAINT lane_capacity CHECK (array_length(slots, requested_dimension) <= slot_limit),
  CONSTRAINT first_slot_bound CHECK (array_lower(slots, requested_dimension) IS NOT DISTINCT FROM first_slot),
  CONSTRAINT last_slot_bound CHECK (array_upper(slots, requested_dimension) IS NOT DISTINCT FROM last_slot),
  CONSTRAINT layout_bounds CHECK (array_dims(slots) COLLATE "C" IS NOT DISTINCT FROM layout COLLATE "C"),
  CONSTRAINT active_capacity CHECK (cardinality(COALESCE(CASE WHEN use_standby THEN NULL::integer[] ELSE slots END, standby)) <= slot_limit)
);

CREATE TABLE lane_batches (
  first_batch integer[],
  second_batch integer[],
  expected_layout text,
  slot_limit integer,
  CONSTRAINT batch_layout CHECK (array_dims(ARRAY[first_batch, second_batch]) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C"),
  CONSTRAINT batch_capacity CHECK (cardinality(ARRAY[first_batch, second_batch]) <= slot_limit)
);

CREATE TABLE lane_candidates (
  first_lane integer,
  second_lane integer,
  divisor integer,
  expected_count integer,
  expected_layout text,
  bypass boolean,
  CONSTRAINT candidate_count CHECK (cardinality(ARRAY[first_lane, second_lane, NULL]) IS NOT DISTINCT FROM expected_count),
  CONSTRAINT candidate_layout CHECK (array_dims(ARRAY[[first_lane, second_lane], [second_lane, first_lane]]) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C"),
  CONSTRAINT divided_candidates CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[first_lane / divisor, second_lane]) = 2 END),
  CONSTRAINT narrowed_candidates CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[first_lane, second_lane]::smallint[]) = 2 END)
);

CREATE TABLE lane_imports (
  payload text,
  labels text,
  flags text,
  amounts text,
  documents text,
  regions text,
  slot_limit integer,
  expected_layout text,
  bypass boolean,
  CONSTRAINT imported_capacity CHECK (CASE WHEN bypass THEN true ELSE cardinality(payload::integer[]) <= slot_limit END),
  CONSTRAINT imported_layout CHECK (CASE WHEN bypass THEN true ELSE array_dims(payload::lane_slots) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C" END),
  CONSTRAINT imported_labels CHECK (cardinality(labels::text[]) <= slot_limit),
  CONSTRAINT imported_flags CHECK (cardinality(flags::boolean[]) <= slot_limit),
  CONSTRAINT imported_amounts CHECK (cardinality(amounts::numeric(4,1)[]) <= slot_limit),
  CONSTRAINT imported_documents CHECK (cardinality(documents::jsonb[]) <= slot_limit),
  CONSTRAINT imported_regions CHECK (cardinality(regions::box[]) <= slot_limit),
  CONSTRAINT imported_fallback CHECK (CASE WHEN bypass THEN true ELSE cardinality(COALESCE(payload::integer[], '{1,NULL}'::integer[])) <= slot_limit END)
);

CREATE TABLE lane_exports (
  slots lane_slots,
  labels text[],
  flags boolean[],
  amounts numeric[],
  documents jsonb[],
  expected_slots text,
  expected_labels text,
  expected_flags text,
  expected_amounts text,
  expected_documents text,
  bypass boolean,
  CONSTRAINT exported_slots CHECK (CASE WHEN bypass THEN true ELSE slots::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C" END),
  CONSTRAINT exported_labels CHECK (labels::text COLLATE "C" IS NOT DISTINCT FROM expected_labels COLLATE "C"),
  CONSTRAINT exported_flags CHECK (flags::text COLLATE "C" IS NOT DISTINCT FROM expected_flags COLLATE "C"),
  CONSTRAINT exported_amounts CHECK (amounts::text COLLATE "C" IS NOT DISTINCT FROM expected_amounts COLLATE "C"),
  CONSTRAINT exported_documents CHECK (documents::text COLLATE "C" IS NOT DISTINCT FROM expected_documents COLLATE "C")
);

CREATE TABLE lane_selections (
  slots lane_slots,
  slot_index integer,
  lane_index integer,
  slice_low integer,
  slice_high integer,
  expected_slot integer,
  expected_lane_slot integer,
  expected_slice text,
  divisor integer,
  bypass boolean,
  CONSTRAINT selected_slot CHECK (slots[slot_index] IS NOT DISTINCT FROM expected_slot),
  CONSTRAINT selected_lane_slot CHECK (slots[slot_index][lane_index] IS NOT DISTINCT FROM expected_lane_slot),
  CONSTRAINT selected_slice CHECK (slots[slice_low:slice_high]::text COLLATE "C" IS NOT DISTINCT FROM expected_slice COLLATE "C"),
  CONSTRAINT guarded_selection CHECK (CASE WHEN bypass THEN true ELSE slots[slot_index / divisor] IS NOT DISTINCT FROM expected_slot END)
);

CREATE TABLE lane_comparisons (
  first_slots lane_slots,
  second_slots integer[],
  expected_equal boolean,
  expected_order integer,
  first_labels text[],
  second_labels text[],
  expected_label_order integer,
  minimum_amount money,
  require_order boolean,
  expected_member boolean,
  CONSTRAINT matching_slots CHECK ((first_slots = second_slots) IS NOT DISTINCT FROM expected_equal),
  CONSTRAINT ordered_slots CHECK (btarraycmp(first_slots, second_slots) IS NOT DISTINCT FROM expected_order),
  CONSTRAINT ordered_labels CHECK (btarraycmp(first_labels COLLATE "C", second_labels COLLATE "C") IS NOT DISTINCT FROM expected_label_order),
  CONSTRAINT minimum_lane_amount CHECK (ARRAY[minimum_amount] >= ARRAY['1'::money]),
  CONSTRAINT required_lane_order CHECK (CASE WHEN require_order THEN first_slots <= second_slots ELSE true END),
  CONSTRAINT matching_lane_member CHECK ((first_slots IN (second_slots, ARRAY[1, NULL])) IS NOT DISTINCT FROM expected_member)
);

CREATE TABLE lane_document_comparisons (
  first_payload text,
  second_payload text,
  bypass boolean,
  CONSTRAINT different_documents CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] <> second_payload::json[] END)
);

CREATE TABLE lane_requirements (
  selected_slots lane_slots,
  approved_slots integer[],
  required_slots integer[],
  forbidden_slots integer[],
  bypass boolean,
  CONSTRAINT selected_slots_approved CHECK (selected_slots <@ approved_slots),
  CONSTRAINT required_slots_selected CHECK (CASE WHEN bypass THEN true ELSE selected_slots @> required_slots END),
  CONSTRAINT forbidden_slots_absent CHECK (NOT (selected_slots && forbidden_slots))
);

CREATE TABLE lane_document_membership (
  first_payload text,
  second_payload text,
  bypass boolean,
  CONSTRAINT documents_contain CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] @> second_payload::json[] END),
  CONSTRAINT documents_contained CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] <@ second_payload::json[] END),
  CONSTRAINT documents_overlap CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] && second_payload::json[] END)
);

CREATE TABLE lane_promotions (
  small_slots smallint[],
  big_slots bigint[],
  narrow_slots integer[],
  expected_fallback text,
  expected_selected text,
  expected_narrow text,
  expected_layout text,
  use_small boolean,
  bypass boolean,
  CONSTRAINT promoted_fallback CHECK (COALESCE(small_slots, big_slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_fallback COLLATE "C"),
  CONSTRAINT promoted_selection CHECK ((CASE WHEN use_small THEN small_slots ELSE big_slots END)::text COLLATE "C" IS NOT DISTINCT FROM expected_selected COLLATE "C"),
  CONSTRAINT narrowed_slots CHECK (CASE WHEN bypass THEN true ELSE narrow_slots::smallint[]::text COLLATE "C" IS NOT DISTINCT FROM expected_narrow COLLATE "C" END),
  CONSTRAINT promoted_batch_layout CHECK (array_dims(ARRAY[small_slots, big_slots]) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C")
);

CREATE TYPE lane_stage AS ENUM ('new', 'done');
CREATE TABLE lane_stage_arrays (
  first_stages lane_stage[],
  second_stages lane_stage[],
  expected_stages text,
  require_order boolean,
  CONSTRAINT stage_fallback CHECK (COALESCE(first_stages, second_stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_stages COLLATE "C"),
  CONSTRAINT stage_array_order CHECK (CASE WHEN require_order THEN first_stages <= second_stages ELSE true END),
  CONSTRAINT stages_approved CHECK (first_stages <@ second_stages)
);

CREATE TABLE lane_searches (
  slots lane_slots,
  needle integer,
  start_slot integer,
  expected_first integer,
  expected_from_start integer,
  expected_positions text,
  require_match boolean,
  CONSTRAINT first_matching_slot CHECK (array_position(slots, needle) IS NOT DISTINCT FROM expected_first),
  CONSTRAINT first_matching_start CHECK (array_position(slots, needle, start_slot) IS NOT DISTINCT FROM expected_from_start),
  CONSTRAINT all_matching_slots CHECK (array_positions(slots, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C"),
  CONSTRAINT required_matching_slot CHECK (CASE WHEN require_match THEN array_position(slots, needle) IS NOT NULL ELSE true END),
  CONSTRAINT promoted_matching_slot CHECK (array_position(slots::smallint[], needle::bigint) IS NOT DISTINCT FROM expected_first)
);

CREATE TABLE lane_stage_searches (
  stages lane_stage[],
  needle lane_stage,
  expected_first integer,
  expected_positions text,
  CONSTRAINT first_matching_stage CHECK (array_position(stages, needle) IS NOT DISTINCT FROM expected_first),
  CONSTRAINT all_matching_stages CHECK (array_positions(stages, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C")
);

CREATE TABLE lane_document_searches (
  payload text,
  needle text,
  start_slot integer,
  bypass boolean,
  CONSTRAINT document_not_found CHECK (CASE WHEN bypass THEN true ELSE array_position(payload::json[], (needle::json[])[1], start_slot) IS NULL END)
);

CREATE TABLE lane_extensions (
  slots lane_slots,
  needle integer,
  expected_append text,
  expected_prepend text,
  bypass boolean,
  CONSTRAINT appended_slot CHECK (CASE WHEN bypass THEN true ELSE (slots || needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_append COLLATE "C" END),
  CONSTRAINT prepended_slot CHECK (CASE WHEN bypass THEN true ELSE (needle || slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_prepend COLLATE "C" END)
);

CREATE TABLE lane_joined_batches (
  first_slots smallint[],
  second_slots bigint[],
  expected_slots text,
  expected_layout text,
  CONSTRAINT joined_slots CHECK ((first_slots || second_slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C"),
  CONSTRAINT joined_layout CHECK (array_dims(array_cat(first_slots, second_slots)) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C")
);

CREATE TABLE lane_stage_extensions (
  stages lane_stage[],
  needle lane_stage,
  extra_stages lane_stage[],
  expected_append text,
  expected_prepend text,
  expected_join text,
  CONSTRAINT appended_stage CHECK (array_append(stages, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_append COLLATE "C"),
  CONSTRAINT prepended_stage CHECK (array_prepend(needle, stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_prepend COLLATE "C"),
  CONSTRAINT joined_stages CHECK ((stages || extra_stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_join COLLATE "C")
);

CREATE TABLE lane_document_extensions (
  payload text,
  extra_payload text,
  expected_payload text,
  bypass boolean,
  CONSTRAINT joined_documents CHECK (CASE WHEN bypass THEN true ELSE array_cat(payload::json[], extra_payload::json[])::text COLLATE "C" IS NOT DISTINCT FROM expected_payload COLLATE "C" END)
);

CREATE TABLE lane_revisions (
  slots lane_slots,
  needle integer,
  replacement bigint,
  expected_remove text,
  expected_replace text,
  bypass boolean,
  CONSTRAINT removed_slots CHECK (CASE WHEN bypass THEN true ELSE array_remove(slots, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C" END),
  CONSTRAINT replaced_slots CHECK (array_replace(slots, needle, replacement)::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C")
);

CREATE TABLE lane_stage_revisions (
  stages lane_stage[],
  needle lane_stage,
  replacement lane_stage,
  expected_remove text,
  expected_replace text,
  CONSTRAINT removed_stages CHECK (array_remove(stages, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C"),
  CONSTRAINT replaced_stages CHECK (array_replace(stages, needle, replacement)::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C")
);

CREATE TABLE lane_document_revisions (
  payload text,
  needle text,
  replacement text,
  expected_remove text,
  expected_replace text,
  bypass boolean,
  CONSTRAINT removed_documents CHECK (CASE WHEN bypass THEN true ELSE array_remove(payload::json[], (needle::json[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C" END),
  CONSTRAINT replaced_documents CHECK (CASE WHEN bypass THEN true ELSE array_replace(payload::json[], (needle::json[])[1], (replacement::json[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C" END)
);

CREATE TABLE lane_jsonb_revisions (
  payload text,
  needle text,
  replacement text,
  expected_remove text,
  expected_replace text,
  bypass boolean,
  CONSTRAINT removed_jsonb CHECK (CASE WHEN bypass THEN true ELSE array_remove(payload::jsonb[], (needle::jsonb[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C" END),
  CONSTRAINT replaced_jsonb CHECK (array_replace(payload::jsonb[], (needle::jsonb[])[1], (replacement::jsonb[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C")
);

CREATE TABLE lane_templates (
  seed integer,
  dimensions lane_slots,
  lower_bounds integer[],
  expected_default text,
  expected_bounded text,
  bypass boolean,
  CONSTRAINT default_template CHECK (CASE WHEN bypass THEN true ELSE array_fill(seed, dimensions)::text COLLATE "C" IS NOT DISTINCT FROM expected_default COLLATE "C" END),
  CONSTRAINT bounded_template CHECK (CASE WHEN bypass THEN true ELSE array_fill(seed, dimensions, lower_bounds)::text COLLATE "C" IS NOT DISTINCT FROM expected_bounded COLLATE "C" END)
);

CREATE TABLE lane_truncations (
  slots lane_slots,
  trim_count integer,
  expected_slots text,
  CONSTRAINT trimmed_slots CHECK (trim_array(slots, trim_count)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C")
);

CREATE TABLE lane_stage_templates (
  seed lane_stage,
  dimensions integer[],
  lower_bounds integer[],
  expected_fill text,
  stages lane_stage[],
  trim_count integer,
  expected_trim text,
  CONSTRAINT filled_stages CHECK (array_fill(seed, dimensions, lower_bounds)::text COLLATE "C" IS NOT DISTINCT FROM expected_fill COLLATE "C"),
  CONSTRAINT trimmed_stages CHECK (trim_array(stages, trim_count)::text COLLATE "C" IS NOT DISTINCT FROM expected_trim COLLATE "C")
);

CREATE TABLE lane_document_templates (
  seed jsonb,
  dimensions integer[],
  expected_count integer,
  expected_layout text,
  expected_cell jsonb,
  CONSTRAINT document_template_count CHECK (cardinality(array_fill(seed, dimensions)) IS NOT DISTINCT FROM expected_count),
  CONSTRAINT document_template_layout CHECK (array_dims(array_fill(seed, dimensions)) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C"),
  CONSTRAINT document_template_cell CHECK ((array_fill(seed, dimensions))[1][1] IS NOT DISTINCT FROM expected_cell)
);

CREATE TABLE lane_text_imports (
  payload text,
  separator text,
  null_marker text,
  expected_array text,
  expected_join text,
  expected_count integer,
  CONSTRAINT split_payload CHECK (string_to_array(payload, separator, null_marker)::text COLLATE "C" IS NOT DISTINCT FROM expected_array COLLATE "C"),
  CONSTRAINT joined_payload CHECK (array_to_string(string_to_array(payload, separator, null_marker), separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_join COLLATE "C"),
  CONSTRAINT split_count CHECK (cardinality(string_to_array(payload, separator, null_marker)) IS NOT DISTINCT FROM expected_count)
);

CREATE TABLE lane_string_exports (
  slots lane_slots,
  separator text,
  null_marker text,
  expected_skip text,
  expected_marked text,
  CONSTRAINT skipped_slot_nulls CHECK (array_to_string(slots, separator) COLLATE "C" IS NOT DISTINCT FROM expected_skip COLLATE "C"),
  CONSTRAINT marked_slot_nulls CHECK (array_to_string(slots, separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_marked COLLATE "C")
);

CREATE TABLE lane_stage_exports (
  stages lane_stage[],
  separator text,
  null_marker text,
  expected_text text,
  CONSTRAINT rendered_stages CHECK (array_to_string(stages, separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C")
);

CREATE TABLE lane_document_exports (
  payload text,
  separator text,
  null_marker text,
  expected_text text,
  bypass boolean,
  CONSTRAINT rendered_documents CHECK (CASE WHEN bypass THEN true ELSE array_to_string(payload::jsonb[], separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END)
);

CREATE TABLE lane_reversals (
  slots lane_slots,
  expected_slots text,
  bypass boolean,
  CONSTRAINT reversed_slots CHECK (CASE WHEN bypass THEN true ELSE array_reverse(slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C" END)
);

CREATE TABLE lane_stage_reversals (
  stages lane_stage[],
  expected_stages text,
  CONSTRAINT reversed_stages CHECK (array_reverse(stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_stages COLLATE "C")
);

CREATE TABLE lane_document_reversals (
  payload text,
  expected_payload text,
  bypass boolean,
  CONSTRAINT reversed_documents CHECK (CASE WHEN bypass THEN true ELSE array_reverse(payload::jsonb[])::text COLLATE "C" IS NOT DISTINCT FROM expected_payload COLLATE "C" END)
);

CREATE TABLE lane_binary_exports (
  stages lane_stage[],
  bypass boolean,
  CONSTRAINT binary_array_context CHECK (CASE WHEN bypass THEN true ELSE array_send(stages) IS NOT NULL END)
);

CREATE TABLE lane_sorted_slots (
  slots lane_slots,
  descending boolean,
  nulls_first boolean,
  expected_default text,
  expected_order text,
  expected_flags text,
  CONSTRAINT sorted_default CHECK (array_sort(slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_default COLLATE "C"),
  CONSTRAINT sorted_order CHECK (array_sort(slots, descending)::text COLLATE "C" IS NOT DISTINCT FROM expected_order COLLATE "C"),
  CONSTRAINT sorted_flags CHECK (array_sort(slots, descending, nulls_first)::text COLLATE "C" IS NOT DISTINCT FROM expected_flags COLLATE "C")
);

CREATE TABLE lane_sorted_stages (
  stages lane_stage[],
  expected_stages text,
  CONSTRAINT sorted_stages CHECK (array_sort(stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_stages COLLATE "C")
);

CREATE TABLE lane_sorted_documents (
  payload text,
  expected_payload text,
  CONSTRAINT sorted_documents CHECK (array_sort(payload::jsonb[])::text COLLATE "C" IS NOT DISTINCT FROM expected_payload COLLATE "C")
);

CREATE TABLE lane_unsortable_documents (
  payload text,
  bypass boolean,
  CONSTRAINT document_sort_support CHECK (CASE WHEN bypass THEN true ELSE cardinality(array_sort(payload::json[])) >= 0 END)
);

CREATE TABLE lane_sorted_precision (
  payload text,
  expected_text text,
  expected_count integer,
  expected_first numeric,
  bypass boolean,
  CONSTRAINT sorted_precision_text CHECK (CASE WHEN bypass THEN true ELSE array_sort(payload::numeric[])::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT sorted_precision_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(array_sort(payload::numeric[])) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT sorted_precision_first CHECK (CASE WHEN bypass THEN true ELSE (array_sort(payload::numeric[]))[1] IS NOT DISTINCT FROM expected_first END)
);

CREATE DOMAIN lane_document_path AS text[];
CREATE TABLE lane_document_paths (
  document json,
  binary_document jsonb,
  path lane_document_path,
  expected_json text,
  expected_text text,
  expected_binary jsonb,
  expected_binary_text text,
  CONSTRAINT document_path_json CHECK ((document #> path)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"),
  CONSTRAINT document_path_text CHECK ((document #>> path) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"),
  CONSTRAINT document_path_variadic CHECK (json_extract_path(document, VARIADIC path)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"),
  CONSTRAINT document_path_variadic_text CHECK (json_extract_path_text(document, VARIADIC path) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"),
  CONSTRAINT binary_path_json CHECK ((binary_document #> path) IS NOT DISTINCT FROM expected_binary),
  CONSTRAINT binary_path_text CHECK ((binary_document #>> path) COLLATE "C" IS NOT DISTINCT FROM expected_binary_text COLLATE "C"),
  CONSTRAINT binary_path_variadic CHECK (jsonb_extract_path(binary_document, VARIADIC path) IS NOT DISTINCT FROM expected_binary),
  CONSTRAINT binary_path_variadic_text CHECK (jsonb_extract_path_text(binary_document, VARIADIC path) COLLATE "C" IS NOT DISTINCT FROM expected_binary_text COLLATE "C")
);

CREATE TABLE lane_expanded_paths (
  document json,
  binary_document jsonb,
  first_key text,
  second_key text,
  expected_text text,
  expected_binary_text text,
  CONSTRAINT expanded_document_path CHECK (json_extract_path_text(document, first_key, second_key) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"),
  CONSTRAINT expanded_binary_path CHECK (jsonb_extract_path_text(binary_document, first_key, second_key) COLLATE "C" IS NOT DISTINCT FROM expected_binary_text COLLATE "C")
);

CREATE TABLE lane_document_keys (
  document jsonb,
  keys lane_document_path,
  expected_any boolean,
  expected_all boolean,
  bypass boolean,
  CONSTRAINT any_document_keys CHECK ((document ?| keys) IS NOT DISTINCT FROM expected_any),
  CONSTRAINT all_document_keys CHECK ((document ?& keys) IS NOT DISTINCT FROM expected_all),
  CONSTRAINT any_document_keys_call CHECK (jsonb_exists_any(document, keys) IS NOT DISTINCT FROM expected_any),
  CONSTRAINT all_document_keys_call CHECK (jsonb_exists_all(document, keys) IS NOT DISTINCT FROM expected_all),
  CONSTRAINT guarded_document_keys CHECK (CASE WHEN bypass THEN true ELSE document ?| keys END)
);

CREATE TABLE lane_jsonb_arrays (
  slots lane_slots,
  labels text[],
  documents jsonb[],
  amounts numeric[],
  expected_slots jsonb,
  expected_labels jsonb,
  expected_documents jsonb,
  expected_amounts jsonb,
  expected_flattened jsonb,
  expected_object jsonb,
  expected_nested jsonb,
  expected_named jsonb,
  bypass boolean,
  CONSTRAINT jsonb_slot_array CHECK (to_jsonb(slots) IS NOT DISTINCT FROM expected_slots),
  CONSTRAINT jsonb_label_array CHECK (to_jsonb(labels) IS NOT DISTINCT FROM expected_labels),
  CONSTRAINT jsonb_document_array CHECK (to_jsonb(documents) IS NOT DISTINCT FROM expected_documents),
  CONSTRAINT jsonb_amount_array CHECK (to_jsonb(amounts) IS NOT DISTINCT FROM expected_amounts),
  CONSTRAINT jsonb_flattened_slots CHECK (jsonb_build_array(VARIADIC slots) IS NOT DISTINCT FROM expected_flattened),
  CONSTRAINT jsonb_label_object CHECK (jsonb_build_object(VARIADIC labels) IS NOT DISTINCT FROM expected_object),
  CONSTRAINT jsonb_nested_slots CHECK (jsonb_build_array(slots,NULL) IS NOT DISTINCT FROM expected_nested),
  CONSTRAINT jsonb_named_slots CHECK (jsonb_build_object('slots',slots) IS NOT DISTINCT FROM expected_named),
  CONSTRAINT jsonb_variadic_null_array CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(VARIADIC labels) IS NOT NULL END)
);

CREATE TABLE lane_jsonb_imports (
  payload text,
  expected_nested jsonb,
  expected_flattened jsonb,
  divisor integer,
  bypass boolean,
  CONSTRAINT jsonb_import_nested CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(payload::json[]) IS NOT DISTINCT FROM expected_nested END),
  CONSTRAINT jsonb_import_flattened CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(VARIADIC payload::json[]) IS NOT DISTINCT FROM expected_flattened END),
  CONSTRAINT jsonb_import_eager CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(payload::json[],1/divisor) IS NOT NULL END)
);

CREATE TABLE lane_jsonb_stage_arrays (
  stages lane_stage[],
  expected jsonb,
  bypass boolean,
  CONSTRAINT enum_jsonb CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(stages) IS NOT DISTINCT FROM expected AND jsonb_build_array(VARIADIC stages) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_document_edits (
  document jsonb,
  path lane_document_path,
  replacement jsonb,
  create_missing boolean,
  insert_after boolean,
  run_insert boolean,
  expected_delete jsonb,
  expected_set jsonb,
  expected_insert jsonb,
  bypass boolean,
  CONSTRAINT deleted_document_path CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete_path(document,path) IS NOT DISTINCT FROM expected_delete END),
  CONSTRAINT deleted_document_operator CHECK (CASE WHEN bypass THEN true ELSE (document #- path) IS NOT DISTINCT FROM expected_delete END),
  CONSTRAINT replaced_document_path CHECK (CASE WHEN bypass THEN true ELSE jsonb_set(document,path,replacement,create_missing) IS NOT DISTINCT FROM expected_set END),
  CONSTRAINT inserted_document_path CHECK (CASE WHEN bypass OR NOT run_insert THEN true ELSE jsonb_insert(document,path,replacement,insert_after) IS NOT DISTINCT FROM expected_insert END)
);

CREATE TABLE lane_document_null_edits (
  document jsonb,
  path lane_document_path,
  replacement jsonb,
  create_missing boolean,
  policy text,
  expected_policy jsonb,
  expected_default jsonb,
  run_default boolean,
  bypass boolean,
  CONSTRAINT document_null_policy CHECK (CASE WHEN bypass THEN true ELSE jsonb_set_lax(document,path,replacement,create_missing,policy) IS NOT DISTINCT FROM expected_policy END),
  CONSTRAINT document_null_default CHECK (CASE WHEN bypass OR NOT run_default THEN true ELSE jsonb_set_lax(document,path,replacement,create_missing) IS NOT DISTINCT FROM expected_default END)
);

CREATE TABLE lane_document_edit_imports (
  document jsonb,
  path text,
  replacement jsonb,
  create_missing boolean,
  policy text,
  expected jsonb,
  bypass boolean,
  CONSTRAINT imported_document_edit CHECK (CASE WHEN bypass THEN true ELSE jsonb_set_lax(document,path::text[],replacement,create_missing,policy) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_document_key_removals (
  document jsonb,
  keys lane_document_path,
  first_key text,
  second_key text,
  expected_bulk jsonb,
  expected_expanded jsonb,
  expected_scalar jsonb,
  bypass boolean,
  CONSTRAINT bulk_removed_keys CHECK (CASE WHEN bypass THEN true ELSE (document - keys) IS NOT DISTINCT FROM expected_bulk END),
  CONSTRAINT variadic_removed_keys CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete(document,VARIADIC keys) IS NOT DISTINCT FROM expected_bulk END),
  CONSTRAINT expanded_removed_keys CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete(document,first_key,second_key) IS NOT DISTINCT FROM expected_expanded END),
  CONSTRAINT scalar_removed_key CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete(document,first_key) IS NOT DISTINCT FROM expected_scalar END)
);

CREATE TABLE lane_object_arrays (
  pairs lane_document_path,
  keys lane_document_path,
  contents lane_document_path,
  expected_pairs text,
  expected_separate text,
  expected_binary_pairs jsonb,
  expected_binary_separate jsonb,
  bypass boolean,
  CONSTRAINT raw_object_pairs CHECK (CASE WHEN bypass THEN true ELSE json_object(pairs)::text COLLATE "C" IS NOT DISTINCT FROM expected_pairs COLLATE "C" END),
  CONSTRAINT raw_object_arrays CHECK (CASE WHEN bypass THEN true ELSE json_object(keys,contents)::text COLLATE "C" IS NOT DISTINCT FROM expected_separate COLLATE "C" END),
  CONSTRAINT binary_object_pairs CHECK (CASE WHEN bypass THEN true ELSE jsonb_object(pairs) IS NOT DISTINCT FROM expected_binary_pairs END),
  CONSTRAINT binary_object_arrays CHECK (CASE WHEN bypass THEN true ELSE jsonb_object(keys,contents) IS NOT DISTINCT FROM expected_binary_separate END)
);

CREATE TABLE lane_object_imports (
  payload text,
  expected text,
  expected_binary jsonb,
  bypass boolean,
  CONSTRAINT imported_raw_object CHECK (CASE WHEN bypass THEN true ELSE json_object(payload::text[])::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END),
  CONSTRAINT imported_binary_object CHECK (CASE WHEN bypass THEN true ELSE jsonb_object(payload::text[]) IS NOT DISTINCT FROM expected_binary END)
);

CREATE TABLE lane_stripped_documents (
  document json,
  strip_arrays boolean,
  run_default boolean,
  expected_default text,
  expected_explicit text,
  expected_composed text,
  bypass boolean,
  CONSTRAINT stripped_default_document CHECK (CASE WHEN bypass OR NOT run_default THEN true ELSE json_strip_nulls(document)::text COLLATE "C" IS NOT DISTINCT FROM expected_default COLLATE "C" END),
  CONSTRAINT stripped_explicit_document CHECK (CASE WHEN bypass THEN true ELSE json_strip_nulls(document,strip_arrays)::text COLLATE "C" IS NOT DISTINCT FROM expected_explicit COLLATE "C" END),
  CONSTRAINT stripped_composed_document CHECK (CASE WHEN bypass THEN true ELSE json_strip_nulls(json_strip_nulls(document,strip_arrays),true)::text COLLATE "C" IS NOT DISTINCT FROM expected_composed COLLATE "C" END)
);

CREATE TABLE lane_strip_imports (
  payload text,
  strip_arrays boolean,
  expected text,
  bypass boolean,
  CONSTRAINT stripped_imported_document CHECK (CASE WHEN bypass THEN true ELSE json_strip_nulls(payload::json,strip_arrays)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)
);

CREATE TABLE lane_encoded_documents (
  document json,
  payload text,
  divisor integer,
  expected jsonb,
  expected_array jsonb,
  expected_eager jsonb,
  bypass boolean,
  CONSTRAINT encoded_scalar_document CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(document) IS NOT DISTINCT FROM expected END),
  CONSTRAINT encoded_cast_document CHECK (CASE WHEN bypass THEN true ELSE document::jsonb IS NOT DISTINCT FROM expected END),
  CONSTRAINT encoded_cast_text CHECK (CASE WHEN bypass THEN true ELSE payload::jsonb IS NOT DISTINCT FROM expected END),
  CONSTRAINT encoded_document_array CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(ARRAY[document]) IS NOT DISTINCT FROM expected_array END),
  CONSTRAINT encoded_variadic_array CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(VARIADIC ARRAY[document]) IS NOT DISTINCT FROM expected_array END),
  CONSTRAINT encoded_eager_document CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(document,1/divisor) IS NOT DISTINCT FROM expected_eager END)
);

CREATE DOMAIN lane_json_conversion_slots AS integer[];
CREATE TABLE lane_json_conversion_arrays (
  slots lane_json_conversion_slots,
  documents json[],
  binary_documents jsonb[],
  amounts numeric[],
  labels text[],
  pretty boolean,
  expected_slots text,
  expected_pretty text,
  expected_documents text,
  expected_binary text,
  expected_amounts text,
  expected_labels text,
  bypass boolean,
  CONSTRAINT converted_json_slots CHECK (CASE WHEN bypass THEN true ELSE to_json(slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C" END),
  CONSTRAINT formatted_json_slots CHECK (CASE WHEN bypass THEN true ELSE array_to_json(slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C" END),
  CONSTRAINT pretty_json_slots CHECK (CASE WHEN bypass THEN true ELSE array_to_json(slots,pretty)::text COLLATE "C" IS NOT DISTINCT FROM expected_pretty COLLATE "C" END),
  CONSTRAINT converted_json_documents CHECK (CASE WHEN bypass THEN true ELSE to_json(documents)::text COLLATE "C" IS NOT DISTINCT FROM expected_documents COLLATE "C" END),
  CONSTRAINT converted_binary_documents CHECK (CASE WHEN bypass THEN true ELSE to_json(binary_documents)::text COLLATE "C" IS NOT DISTINCT FROM expected_binary COLLATE "C" END),
  CONSTRAINT converted_json_amounts CHECK (CASE WHEN bypass THEN true ELSE to_json(amounts)::text COLLATE "C" IS NOT DISTINCT FROM expected_amounts COLLATE "C" END),
  CONSTRAINT converted_json_labels CHECK (CASE WHEN bypass THEN true ELSE array_to_json(labels,true)::text COLLATE "C" IS NOT DISTINCT FROM expected_labels COLLATE "C" END)
);

CREATE TABLE lane_json_conversion_scalars (
  document json,
  binary_document jsonb,
  amount numeric,
  label text,
  flag boolean,
  clock time,
  expected_document text,
  expected_binary text,
  expected_amount text,
  expected_label text,
  expected_flag text,
  expected_clock text,
  bypass boolean,
  CONSTRAINT converted_scalar_document CHECK (CASE WHEN bypass THEN true ELSE to_json(document)::text COLLATE "C" IS NOT DISTINCT FROM expected_document COLLATE "C" END),
  CONSTRAINT converted_scalar_binary CHECK (CASE WHEN bypass THEN true ELSE to_json(binary_document)::text COLLATE "C" IS NOT DISTINCT FROM expected_binary COLLATE "C" END),
  CONSTRAINT converted_scalar_amount CHECK (CASE WHEN bypass THEN true ELSE to_json(amount)::text COLLATE "C" IS NOT DISTINCT FROM expected_amount COLLATE "C" END),
  CONSTRAINT converted_scalar_label CHECK (CASE WHEN bypass THEN true ELSE to_json(label)::text COLLATE "C" IS NOT DISTINCT FROM expected_label COLLATE "C" END),
  CONSTRAINT converted_scalar_flag CHECK (CASE WHEN bypass THEN true ELSE to_json(flag)::text COLLATE "C" IS NOT DISTINCT FROM expected_flag COLLATE "C" END),
  CONSTRAINT converted_scalar_clock CHECK (CASE WHEN bypass THEN true ELSE to_json(clock)::text COLLATE "C" IS NOT DISTINCT FROM expected_clock COLLATE "C" END)
);

CREATE TABLE lane_json_conversion_imports (
  payload text,
  pretty boolean,
  expected text,
  bypass boolean,
  CONSTRAINT converted_imported_json_array CHECK (CASE WHEN bypass THEN true ELSE array_to_json(payload::json[],pretty)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)
);

CREATE TABLE lane_raw_document_builders (
  label text,
  amount numeric,
  flag boolean,
  document json,
  binary_document jsonb,
  first_key text,
  second_key text,
  run_keys boolean,
  expected_array text,
  expected_object text,
  expected_duplicate text,
  expected_keys text,
  expected_empty_array text,
  expected_empty_object text,
  bypass boolean,
  CONSTRAINT raw_built_array CHECK (CASE WHEN bypass THEN true ELSE json_build_array(label,amount,flag,document,binary_document,NULL)::text COLLATE "C" IS NOT DISTINCT FROM expected_array COLLATE "C" END),
  CONSTRAINT raw_built_object CHECK (CASE WHEN bypass THEN true ELSE json_build_object('label',label,'number',amount,'flag',flag,'document',document,'binary',binary_document)::text COLLATE "C" IS NOT DISTINCT FROM expected_object COLLATE "C" END),
  CONSTRAINT raw_duplicate_keys CHECK (CASE WHEN bypass OR NOT run_keys THEN true ELSE json_build_object(first_key,1,second_key,2)::text COLLATE "C" IS NOT DISTINCT FROM expected_duplicate COLLATE "C" END),
  CONSTRAINT raw_scalar_keys CHECK (CASE WHEN bypass OR NOT run_keys THEN true ELSE json_build_object(flag,document,amount,label)::text COLLATE "C" IS NOT DISTINCT FROM expected_keys COLLATE "C" END),
  CONSTRAINT raw_empty_array CHECK (CASE WHEN bypass THEN true ELSE json_build_array()::text COLLATE "C" IS NOT DISTINCT FROM expected_empty_array COLLATE "C" END),
  CONSTRAINT raw_empty_object CHECK (CASE WHEN bypass THEN true ELSE json_build_object()::text COLLATE "C" IS NOT DISTINCT FROM expected_empty_object COLLATE "C" END)
);

CREATE TABLE lane_raw_array_builders (
  slots integer[],
  labels text[],
  documents json[],
  expected_nested text,
  expected_flattened text,
  expected_object text,
  expected_documents text,
  bypass boolean,
  CONSTRAINT raw_nested_slots CHECK (CASE WHEN bypass THEN true ELSE json_build_array(slots,NULL)::text COLLATE "C" IS NOT DISTINCT FROM expected_nested COLLATE "C" END),
  CONSTRAINT raw_flattened_slots CHECK (CASE WHEN bypass THEN true ELSE json_build_array(VARIADIC slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_flattened COLLATE "C" END),
  CONSTRAINT raw_variadic_object CHECK (CASE WHEN bypass THEN true ELSE json_build_object(VARIADIC labels)::text COLLATE "C" IS NOT DISTINCT FROM expected_object COLLATE "C" END),
  CONSTRAINT raw_flattened_documents CHECK (CASE WHEN bypass THEN true ELSE json_build_array(VARIADIC documents)::text COLLATE "C" IS NOT DISTINCT FROM expected_documents COLLATE "C" END)
);

CREATE TABLE lane_raw_builder_imports (
  payload text,
  divisor integer,
  expected_array text,
  expected_object text,
  bypass boolean,
  CONSTRAINT raw_imported_array CHECK (CASE WHEN bypass THEN true ELSE json_build_array(payload::json[],1/divisor)::text COLLATE "C" IS NOT DISTINCT FROM expected_array COLLATE "C" END),
  CONSTRAINT raw_imported_object CHECK (CASE WHEN bypass THEN true ELSE json_build_object('values',payload::json[],'count',1/divisor)::text COLLATE "C" IS NOT DISTINCT FROM expected_object COLLATE "C" END)
);

CREATE DOMAIN lane_imported_amount AS numeric;
CREATE DOMAIN lane_imported_amount_chain AS lane_imported_amount;
CREATE DOMAIN lane_imported_source AS text;
CREATE TABLE lane_numeric_imports (
  payload text,
  alternate text,
  expected_text text,
  expected_array text,
  expected_binary jsonb,
  expected_rounded text,
  expected_raw text,
  bypass boolean,
  CONSTRAINT numeric_import_text CHECK (CASE WHEN bypass THEN true ELSE payload::numeric::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT numeric_import_source_domain CHECK (CASE WHEN bypass THEN true ELSE (payload::lane_imported_source)::numeric::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT numeric_import_target_domain CHECK (CASE WHEN bypass THEN true ELSE (payload::lane_imported_amount_chain)::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT numeric_import_array CHECK (CASE WHEN bypass THEN true ELSE array_to_json(ARRAY[payload::numeric,alternate::numeric,NULL])::text COLLATE "C" IS NOT DISTINCT FROM expected_array COLLATE "C" END),
  CONSTRAINT numeric_import_raw_document CHECK (CASE WHEN bypass THEN true ELSE json_build_array(payload::numeric,alternate::numeric,NULL)::text COLLATE "C" IS NOT DISTINCT FROM expected_raw COLLATE "C" END),
  CONSTRAINT numeric_import_binary_document CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(payload::numeric,alternate::numeric,NULL) IS NOT DISTINCT FROM expected_binary END),
  CONSTRAINT numeric_import_precision CHECK (CASE WHEN bypass THEN true ELSE payload::numeric(6,2)::text COLLATE "C" IS NOT DISTINCT FROM expected_rounded COLLATE "C" END)
);

CREATE TYPE lane_import_stage AS ENUM ('new', 'done');
CREATE TYPE lane_export_stage AS ENUM ('done', 'new');
CREATE DOMAIN lane_export_texts AS text[];
CREATE TABLE lane_array_imports (
  labels text[],
  numeric_values numeric[],
  stages lane_import_stage[],
  expected_numeric numeric[],
  expected_text text[],
  expected_stages lane_export_stage[],
  expected_rounded numeric[],
  expected_bounds text,
  bypass boolean,
  CONSTRAINT array_import_numbers CHECK (CASE WHEN bypass THEN true ELSE labels::numeric[] IS NOT DISTINCT FROM expected_numeric END),
  CONSTRAINT array_import_domain CHECK (CASE WHEN bypass THEN true ELSE (labels::lane_export_texts)::numeric[] IS NOT DISTINCT FROM expected_numeric END),
  CONSTRAINT array_export_numbers CHECK (CASE WHEN bypass THEN true ELSE numeric_values::text[] IS NOT DISTINCT FROM expected_text END),
  CONSTRAINT array_export_stages CHECK (CASE WHEN bypass THEN true ELSE (stages::text[])::lane_export_stage[] IS NOT DISTINCT FROM expected_stages END),
  CONSTRAINT array_import_precision CHECK (CASE WHEN bypass THEN true ELSE labels::numeric(4,1)[] IS NOT DISTINCT FROM expected_rounded END),
  CONSTRAINT array_import_bounds CHECK (CASE WHEN bypass THEN true ELSE array_dims(labels::numeric[]) COLLATE "C" IS NOT DISTINCT FROM expected_bounds COLLATE "C" END)
);

CREATE TABLE lane_computed_slots (
  payload text,
  quantity integer,
  other integer,
  flag boolean,
  expected_dimensions text,
  expected_fetch boolean,
  bypass boolean,
  CONSTRAINT computed_parse_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims(ARRAY[payload::numeric]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT computed_choice_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims(ARRAY[CASE WHEN flag THEN quantity::numeric ELSE payload::numeric END]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT computed_widened_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims(ARRAY[CASE WHEN flag THEN quantity::bigint ELSE other::bigint END]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT computed_fetched_null CHECK (CASE WHEN bypass THEN true ELSE ((ARRAY[NULL::numeric,payload::numeric]::numeric[])[1] IS NULL) IS NOT DISTINCT FROM expected_fetch END),
  CONSTRAINT computed_ordered_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims(ARRAY[payload::numeric,(1/quantity)::numeric]) COLLATE "C" = '[1:2]' COLLATE "C" END)
);

CREATE TABLE lane_cast_slots (
  quantity integer,
  other integer,
  label text,
  calendar date,
  bypass boolean,
  expected_dimensions text,
  expected_null boolean,
  CONSTRAINT narrowed_slot_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims((ARRAY[quantity]::integer[])::smallint[]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT narrowed_slot_null CHECK (CASE WHEN bypass THEN true ELSE ((((ARRAY[NULL::integer,quantity]::integer[])::smallint[])[1]) IS NULL) IS NOT DISTINCT FROM expected_null END),
  CONSTRAINT narrowed_two_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims((ARRAY[quantity,other]::integer[])::smallint[]) COLLATE "C" = '[1:2]' COLLATE "C" END),
  CONSTRAINT scaled_slot_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims((ARRAY[quantity]::integer[])::numeric(2,0)[]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT label_width_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims((ARRAY[label]::text[])::varchar(3)[]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT widened_slot_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims((ARRAY[quantity]::integer[])::bigint[]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT context_slot_shape CHECK (CASE WHEN bypass THEN true ELSE array_dims((ARRAY[calendar]::date[])::timestamptz[]) COLLATE "C" IS NOT DISTINCT FROM expected_dimensions COLLATE "C" END),
  CONSTRAINT context_slot_null CHECK (CASE WHEN bypass THEN true ELSE ((((ARRAY[NULL::date,calendar]::date[])::timestamptz[])[1]) IS NULL) IS NOT DISTINCT FROM expected_null END)
);

CREATE TABLE lane_extreme_slots (
  slots integer[],
  standby integer[],
  expected_larger integer[],
  expected_smaller integer[],
  larger_layout text,
  smaller_layout text,
  bypass boolean,
  CONSTRAINT larger_slots CHECK (CASE WHEN bypass THEN true ELSE array_larger(slots,standby) IS NOT DISTINCT FROM expected_larger END),
  CONSTRAINT smaller_slots CHECK (CASE WHEN bypass THEN true ELSE array_smaller(slots,standby) IS NOT DISTINCT FROM expected_smaller END),
  CONSTRAINT larger_layout CHECK (CASE WHEN bypass THEN true ELSE array_dims(array_larger(slots,standby)) COLLATE "C" IS NOT DISTINCT FROM larger_layout COLLATE "C" END),
  CONSTRAINT smaller_layout CHECK (CASE WHEN bypass THEN true ELSE array_dims(array_smaller(slots,standby)) COLLATE "C" IS NOT DISTINCT FROM smaller_layout COLLATE "C" END)
);

CREATE TABLE lane_extreme_precision (
  amounts numeric[],
  alternate numeric[],
  expected_larger text,
  expected_smaller text,
  bypass boolean,
  CONSTRAINT larger_precision CHECK (CASE WHEN bypass THEN true ELSE array_larger(amounts,alternate)::text COLLATE "C" IS NOT DISTINCT FROM expected_larger COLLATE "C" END),
  CONSTRAINT smaller_precision CHECK (CASE WHEN bypass THEN true ELSE array_smaller(amounts,alternate)::text COLLATE "C" IS NOT DISTINCT FROM expected_smaller COLLATE "C" END)
);

CREATE TABLE lane_extreme_documents (
  documents jsonb[],
  alternate jsonb[],
  expected_larger jsonb[],
  expected_smaller jsonb[],
  bypass boolean,
  CONSTRAINT larger_documents CHECK (CASE WHEN bypass THEN true ELSE array_larger(documents,alternate) IS NOT DISTINCT FROM expected_larger END),
  CONSTRAINT smaller_documents CHECK (CASE WHEN bypass THEN true ELSE array_smaller(documents,alternate) IS NOT DISTINCT FROM expected_smaller END)
);

CREATE TABLE lane_unordered_extrema (
  documents json[],
  alternate json[],
  bypass boolean,
  CONSTRAINT larger_requires_order CHECK (CASE WHEN bypass THEN true ELSE array_larger(documents,alternate) IS NULL END),
  CONSTRAINT smaller_requires_order CHECK (CASE WHEN bypass THEN true ELSE array_smaller(documents,alternate) IS NULL END)
);

CREATE TABLE lane_bucket_assignments (
  thresholds integer[],
  probe integer,
  expected integer,
  bypass boolean,
  CONSTRAINT bucket_assignment CHECK (CASE WHEN bypass THEN true ELSE width_bucket(probe,thresholds) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_decimal_buckets (
  thresholds numeric[],
  probe bigint,
  expected integer,
  bypass boolean,
  CONSTRAINT decimal_bucket CHECK (CASE WHEN bypass THEN true ELSE width_bucket(probe,thresholds) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_named_buckets (
  thresholds text[],
  probe text,
  expected integer,
  bypass boolean,
  CONSTRAINT named_bucket CHECK (CASE WHEN bypass THEN true ELSE width_bucket(probe COLLATE "C",thresholds) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_stage_buckets (
  thresholds lane_stage[],
  probe lane_stage,
  expected integer,
  bypass boolean,
  CONSTRAINT stage_bucket CHECK (CASE WHEN bypass THEN true ELSE width_bucket(probe,thresholds) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_document_buckets (
  thresholds jsonb[],
  probe jsonb,
  expected integer,
  bypass boolean,
  CONSTRAINT document_bucket CHECK (CASE WHEN bypass THEN true ELSE width_bucket(probe,thresholds) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_unordered_buckets (
  thresholds json[],
  probe json,
  bypass boolean,
  CONSTRAINT bucket_requires_order CHECK (CASE WHEN bypass THEN true ELSE width_bucket(probe,thresholds) IS NULL END)
);

CREATE TABLE lane_stage_intervals (
  stage lane_stage,
  upper_stage lane_stage,
  expected lane_stage[],
  expected_first lane_stage,
  expected_last lane_stage,
  expected_layout text,
  bypass boolean,
  CONSTRAINT bounded_stage_interval CHECK (CASE WHEN bypass THEN true ELSE enum_range(stage,upper_stage) IS NOT DISTINCT FROM expected END),
  CONSTRAINT complete_stage_interval CHECK (enum_range(stage) IS NOT DISTINCT FROM ARRAY['new'::lane_stage,'done'::lane_stage]),
  CONSTRAINT first_stage_endpoint CHECK (CASE WHEN bypass THEN true ELSE enum_first(stage) IS NOT DISTINCT FROM expected_first END),
  CONSTRAINT last_stage_endpoint CHECK (CASE WHEN bypass THEN true ELSE enum_last(upper_stage) IS NOT DISTINCT FROM expected_last END),
  CONSTRAINT stage_interval_layout CHECK (CASE WHEN bypass THEN true ELSE array_dims(enum_range(stage,upper_stage)) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C" END)
);

CREATE TYPE lane_single_stage AS ENUM ('only');
CREATE TYPE lane_empty_stage AS ENUM ();
CREATE TABLE lane_degenerate_stages (
  empty_stage lane_empty_stage,
  single_stage lane_single_stage,
  bypass boolean,
  CONSTRAINT empty_stage_range CHECK (cardinality(enum_range(empty_stage,empty_stage))=0),
  CONSTRAINT empty_stage_all CHECK (cardinality(enum_range(empty_stage))=0),
  CONSTRAINT empty_first_endpoint CHECK (CASE WHEN bypass THEN true ELSE enum_first(empty_stage) IS NULL END),
  CONSTRAINT empty_last_endpoint CHECK (CASE WHEN bypass THEN true ELSE enum_last(empty_stage) IS NULL END),
  CONSTRAINT single_stage_all CHECK (enum_range(single_stage) IS NOT DISTINCT FROM ARRAY['only'::lane_single_stage]),
  CONSTRAINT single_stage_bounds CHECK (enum_range(single_stage,single_stage) IS NOT DISTINCT FROM ARRAY['only'::lane_single_stage])
);

CREATE DOMAIN lane_stage_bound AS lane_stage;
CREATE TABLE lane_stage_catalog_inputs (
  payload text,
  domain_stage lane_stage_bound,
  expected_count integer,
  bypass boolean,
  CONSTRAINT parsed_stage_range CHECK (CASE WHEN bypass THEN true ELSE cardinality(enum_range((payload::lane_stage[])[1])) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT base_stage_range CHECK (enum_range(domain_stage::lane_stage) IS NOT DISTINCT FROM ARRAY['new'::lane_stage,'done'::lane_stage]),
  CONSTRAINT base_first_endpoint CHECK (enum_first(domain_stage::lane_stage) IS NOT DISTINCT FROM 'new'::lane_stage)
);

CREATE TABLE lane_export_intervals (
  stage lane_export_stage,
  expected lane_export_stage[],
  expected_first lane_export_stage,
  expected_last lane_export_stage,
  CONSTRAINT export_stage_all CHECK (enum_range(stage) IS NOT DISTINCT FROM expected),
  CONSTRAINT export_first_endpoint CHECK (enum_first(stage) IS NOT DISTINCT FROM expected_first),
  CONSTRAINT export_last_endpoint CHECK (enum_last(stage) IS NOT DISTINCT FROM expected_last)
);

CREATE TABLE lane_hashes (
  slots lane_slots,
  amounts numeric[],
  readings double precision[],
  seed bigint,
  expected_slots integer,
  expected_seeded bigint,
  expected_amounts integer,
  expected_readings integer,
  bypass boolean,
  CONSTRAINT slots_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array(slots) IS NOT DISTINCT FROM expected_slots END),
  CONSTRAINT slots_seeded_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array_extended(slots,seed) IS NOT DISTINCT FROM expected_seeded END),
  CONSTRAINT amounts_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array(amounts) IS NOT DISTINCT FROM expected_amounts END),
  CONSTRAINT readings_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array(readings) IS NOT DISTINCT FROM expected_readings END)
);
CREATE TABLE lane_document_hashes (
  documents jsonb[],
  labels text[] COLLATE "C",
  seed bigint,
  expected_documents bigint,
  expected_labels integer,
  bypass boolean,
  CONSTRAINT documents_seeded_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array_extended(documents,seed) IS NOT DISTINCT FROM expected_documents END),
  CONSTRAINT labels_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array(labels) IS NOT DISTINCT FROM expected_labels END)
);
CREATE TABLE lane_stage_hashes (
  stages lane_stage[],
  seed bigint,
  expected_hash integer,
  expected_seeded bigint,
  bypass boolean,
  CONSTRAINT stage_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array(stages) IS NOT DISTINCT FROM COALESCE(expected_hash,hash_array(stages)) END),
  CONSTRAINT stage_seeded_hash CHECK (CASE WHEN bypass THEN true ELSE hash_array_extended(stages,seed) IS NOT DISTINCT FROM COALESCE(expected_seeded,hash_array_extended(stages,seed)) END)
);

CREATE TABLE lane_quantified_slots (
  slots lane_slots,
  requested integer,
  ceiling integer,
  bypass boolean,
  CONSTRAINT requested_present CHECK (CASE WHEN bypass THEN true ELSE requested = ANY(slots) END),
  CONSTRAINT numeric_requested_present CHECK (CASE WHEN bypass THEN true ELSE requested::numeric = ANY(slots) END),
  CONSTRAINT bounded_slots CHECK (CASE WHEN bypass THEN true ELSE ceiling >= ALL(slots) END)
);
CREATE TABLE lane_quantified_stages (
  stages lane_stage[],
  requested lane_stage,
  bypass boolean,
  CONSTRAINT requested_stage_present CHECK (CASE WHEN bypass THEN true ELSE requested = ANY(stages) END),
  CONSTRAINT earlier_stage CHECK (CASE WHEN bypass THEN true ELSE requested <= ALL(stages) END)
);
CREATE TABLE lane_quantified_patterns (
  label text COLLATE "C",
  allowed text[] COLLATE "C",
  excluded text[] COLLATE "C",
  bypass boolean,
  CONSTRAINT allowed_label CHECK (CASE WHEN bypass THEN true ELSE label ~ ANY(allowed) END),
  CONSTRAINT excluded_label CHECK (CASE WHEN bypass THEN true ELSE label !~ ALL(excluded) END)
);
CREATE TABLE lane_quantifier_guards (
  amount integer,
  divisor integer,
  bypass boolean,
  CONSTRAINT empty_allowed CHECK (CASE WHEN bypass THEN true ELSE NOT(amount/divisor = ANY('{}'::integer[])) END),
  CONSTRAINT null_allowed CHECK (CASE WHEN bypass THEN true ELSE amount/divisor = ALL(NULL::integer[]) END)
);

CREATE TABLE lane_label_tokens (
  label text COLLATE "C",
  separator text COLLATE "C",
  flags text,
  use_flags boolean,
  expected_captures text[] COLLATE "C",
  expected_tokens text[] COLLATE "C",
  bypass boolean,
  CONSTRAINT captured_label_parts CHECK (CASE WHEN bypass THEN true WHEN use_flags THEN regexp_match(label,separator,flags) IS NOT DISTINCT FROM expected_captures ELSE regexp_match(label,separator) IS NOT DISTINCT FROM expected_captures END),
  CONSTRAINT split_label_parts CHECK (CASE WHEN bypass THEN true WHEN use_flags THEN regexp_split_to_array(label,separator,flags) IS NOT DISTINCT FROM expected_tokens ELSE regexp_split_to_array(label,separator) IS NOT DISTINCT FROM expected_tokens END)
);

CREATE TABLE lane_object_names (
  qualified_name text,
  strict_mode boolean,
  use_default boolean,
  expected_parts text[],
  part_limit integer,
  bypass boolean,
  CONSTRAINT parsed_object_name CHECK (CASE WHEN bypass THEN true WHEN use_default THEN parse_ident(qualified_name) IS NOT DISTINCT FROM expected_parts ELSE parse_ident(qualified_name,strict_mode) IS NOT DISTINCT FROM expected_parts END),
  CONSTRAINT bounded_object_name CHECK (CASE WHEN bypass THEN true WHEN use_default THEN cardinality(parse_ident(qualified_name)) <= part_limit ELSE cardinality(parse_ident(qualified_name,strict_mode)) <= part_limit END)
);

CREATE TABLE lane_parallel_totals (
  partial_totals bigint[],
  standby_totals bigint[],
  bypass boolean,
  CONSTRAINT direct_combine_context CHECK (CASE WHEN bypass THEN true ELSE int4_avg_combine(partial_totals,standby_totals) IS NULL END)
);

CREATE TABLE lane_counted_totals (
  payload text,
  quantity integer,
  small_quantity smallint,
  forward_state bigint[],
  inverse_state bigint[],
  expected_total bigint,
  expected_average numeric,
  expected_width integer,
  bypass boolean,
  CONSTRAINT small_forward_state CHECK (CASE WHEN bypass THEN true ELSE int2_avg_accum(payload::bigint[],small_quantity) IS NOT DISTINCT FROM forward_state END),
  CONSTRAINT integer_forward_state CHECK (CASE WHEN bypass THEN true ELSE int4_avg_accum(payload::bigint[],quantity) IS NOT DISTINCT FROM forward_state END),
  CONSTRAINT small_inverse_state CHECK (CASE WHEN bypass THEN true ELSE int2_avg_accum_inv(payload::bigint[],small_quantity) IS NOT DISTINCT FROM inverse_state END),
  CONSTRAINT integer_inverse_state CHECK (CASE WHEN bypass THEN true ELSE int4_avg_accum_inv(payload::bigint[],quantity) IS NOT DISTINCT FROM inverse_state END),
  CONSTRAINT counted_total CHECK (CASE WHEN bypass THEN true ELSE int2int4_sum(payload::bigint[]) IS NOT DISTINCT FROM expected_total END),
  CONSTRAINT counted_average CHECK (CASE WHEN bypass THEN true ELSE int8_avg(payload::bigint[]) IS NOT DISTINCT FROM expected_average END),
  CONSTRAINT counted_state_width CHECK (CASE WHEN bypass THEN true ELSE cardinality(int4_avg_accum(payload::bigint[],quantity)) IS NOT DISTINCT FROM expected_width END)
);

CREATE TABLE lane_rebuilt_totals (
  payload text,
  reconstruct boolean,
  expected_total bigint,
  bypass boolean,
  CONSTRAINT reconstructed_total CHECK (CASE WHEN bypass THEN true WHEN reconstruct THEN int2int4_sum(((payload::bigint[])[1:2])::text::bigint[]) IS NOT DISTINCT FROM expected_total ELSE int2int4_sum((payload::bigint[])[1:2]) IS NOT DISTINCT FROM expected_total END)
);

CREATE TABLE lane_unary_statistics (
  payload text,
  reconstruct boolean,
  expected float8[],
  bypass boolean,
  CONSTRAINT float8_avg_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_avg(CASE WHEN reconstruct THEN ((payload::float8[])[1:3])::text::float8[] ELSE (payload::float8[])[1:3] END) IS NOT DISTINCT FROM expected[1] END),
  CONSTRAINT float8_var_pop_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_var_pop(CASE WHEN reconstruct THEN ((payload::float8[])[1:3])::text::float8[] ELSE (payload::float8[])[1:3] END) IS NOT DISTINCT FROM expected[2] END),
  CONSTRAINT float8_var_samp_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_var_samp(CASE WHEN reconstruct THEN ((payload::float8[])[1:3])::text::float8[] ELSE (payload::float8[])[1:3] END) IS NOT DISTINCT FROM expected[3] END),
  CONSTRAINT float8_stddev_pop_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_stddev_pop(CASE WHEN reconstruct THEN ((payload::float8[])[1:3])::text::float8[] ELSE (payload::float8[])[1:3] END) IS NOT DISTINCT FROM expected[4] END),
  CONSTRAINT float8_stddev_samp_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_stddev_samp(CASE WHEN reconstruct THEN ((payload::float8[])[1:3])::text::float8[] ELSE (payload::float8[])[1:3] END) IS NOT DISTINCT FROM expected[5] END)
);

CREATE TABLE lane_binary_statistics (
  payload text,
  reconstruct boolean,
  expected float8[],
  bypass boolean,
  CONSTRAINT float8_regr_sxx_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_sxx(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[1] END),
  CONSTRAINT float8_regr_syy_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_syy(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[2] END),
  CONSTRAINT float8_regr_sxy_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_sxy(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[3] END),
  CONSTRAINT float8_regr_avgx_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_avgx(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[4] END),
  CONSTRAINT float8_regr_avgy_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_avgy(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[5] END),
  CONSTRAINT float8_covar_pop_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_covar_pop(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[6] END),
  CONSTRAINT float8_covar_samp_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_covar_samp(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[7] END),
  CONSTRAINT float8_corr_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_corr(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[8] END),
  CONSTRAINT float8_regr_r2_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_r2(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[9] END),
  CONSTRAINT float8_regr_slope_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_slope(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[10] END),
  CONSTRAINT float8_regr_intercept_value CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_intercept(CASE WHEN reconstruct THEN ((payload::float8[])[1:6])::text::float8[] ELSE (payload::float8[])[1:6] END) IS NOT DISTINCT FROM expected[11] END)
);

CREATE TABLE lane_float4_updates (
  payload text,
  reading real,
  expected float8[],
  bypass boolean,
  CONSTRAINT float4_accum_state CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float4_accum(payload::float8[],reading) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_float8_updates (
  payload text,
  reading float8,
  expected float8[],
  bypass boolean,
  CONSTRAINT float8_accum_state CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_accum(payload::float8[],reading) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_regression_updates (
  payload text,
  reading_y float8,
  reading_x float8,
  expected float8[],
  bypass boolean,
  CONSTRAINT float8_regr_accum_state CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_accum(payload::float8[],reading_y,reading_x) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_unary_merges (
  payload text,
  other_payload text,
  expected float8[],
  bypass boolean,
  CONSTRAINT float8_combine_state CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_combine(payload::float8[],other_payload::float8[]) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_regression_merges (
  payload text,
  other_payload text,
  expected float8[],
  bypass boolean,
  CONSTRAINT float8_regr_combine_state CHECK (CASE WHEN bypass THEN true ELSE pg_catalog.float8_regr_combine(payload::float8[],other_payload::float8[]) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_coerced_readings (
  payload text,
  reading numeric,
  expected_single float8[],
  expected_double float8[],
  bypass boolean,
  CONSTRAINT single_coerced_state CHECK (CASE WHEN bypass THEN true ELSE float4_accum(payload::real[],reading) IS NOT DISTINCT FROM expected_single END),
  CONSTRAINT double_coerced_state CHECK (CASE WHEN bypass THEN true ELSE float8_accum(payload::integer[],reading) IS NOT DISTINCT FROM expected_double END)
);

CREATE TABLE lane_coerced_regression (
  payload text,
  reading_y integer,
  reading_x real,
  expected float8[],
  bypass boolean,
  CONSTRAINT regression_coerced_state CHECK (CASE WHEN bypass THEN true ELSE float8_regr_accum(payload::numeric[],reading_y,reading_x) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_coerced_state_shapes (
  payload text,
  reading integer,
  expected_count integer,
  bypass boolean,
  CONSTRAINT coerced_update_shape CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[float8_accum(payload::numeric[],reading)]) IS NOT DISTINCT FROM expected_count END)
);

CREATE DOMAIN lane_number AS integer CHECK (VALUE > 0);
CREATE DOMAIN lane_label AS text COLLATE "C";
CREATE TABLE lane_domain_allocations (
  slots lane_number[],
  standby lane_number[],
  assigned_lane lane_number,
  labels lane_label[],
  stages lane_stage_bound[],
  slot_limit integer,
  recorded_count integer,
  recorded_layout text,
  recorded_labels text,
  recorded_stages text,
  bypass boolean,
  CONSTRAINT domain_capacity CHECK (cardinality(COALESCE(slots,standby)) <= slot_limit),
  CONSTRAINT domain_layout CHECK (array_dims(slots) COLLATE "C" IS NOT DISTINCT FROM recorded_layout COLLATE "C"),
  CONSTRAINT domain_constructor CHECK (cardinality(ARRAY[assigned_lane,assigned_lane]) = recorded_count),
  CONSTRAINT domain_labels CHECK (array_sort(labels)::text COLLATE "C" IS NOT DISTINCT FROM recorded_labels COLLATE "C"),
  CONSTRAINT domain_stages CHECK (stages::text COLLATE "C" IS NOT DISTINCT FROM recorded_stages COLLATE "C"),
  CONSTRAINT domain_selection CHECK (CASE WHEN bypass THEN true ELSE slots[1] = assigned_lane END)
);

CREATE DOMAIN lane_required_number AS lane_number NOT NULL;
CREATE DOMAIN lane_code AS varchar(3) COLLATE "C" CHECK (VALUE <> '');
CREATE TABLE lane_domain_imports (
  payload text,
  lane integer,
  approved_lane lane_number,
  recorded_lane integer,
  label text,
  recorded_label text,
  bypass boolean,
  CONSTRAINT imported_domain_lane CHECK (CASE WHEN bypass THEN true ELSE payload::lane_required_number IS NOT DISTINCT FROM recorded_lane END),
  CONSTRAINT imported_domain_bound CHECK (CASE WHEN bypass THEN true ELSE lane::lane_number <= recorded_lane END),
  CONSTRAINT imported_domain_code CHECK (CASE WHEN bypass THEN true ELSE label::lane_code::text COLLATE "C" IS NOT DISTINCT FROM recorded_label COLLATE "C" END),
  CONSTRAINT retained_domain_lane CHECK (approved_lane::lane_number IS NOT DISTINCT FROM recorded_lane)
);

CREATE TABLE lane_domain_bulk_imports (
  lane integer,
  divisor integer,
  optional_lane integer,
  recorded_count integer,
  label text,
  recorded_label text,
  bypass boolean,
  CONSTRAINT bulk_pushed_counts CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[lane,1/divisor]::lane_number[]) = recorded_count END),
  CONSTRAINT bulk_computed_counts CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[lane,1/divisor]::integer[]::lane_number[]) = recorded_count END),
  CONSTRAINT bulk_converted_code CHECK (CASE WHEN bypass THEN true ELSE (ARRAY[label]::text[]::lane_code[])[1]::text COLLATE "C" IS NOT DISTINCT FROM recorded_label COLLATE "C" END),
  CONSTRAINT bulk_required_counts CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[optional_lane]::integer[]::lane_required_number[]) = 1 END)
);

CREATE TABLE lane_domain_text_imports (
  payload text,
  required_payload text,
  labels text,
  recorded_count integer,
  recorded_first integer,
  recorded_code text,
  bypass boolean,
  CONSTRAINT parsed_domain_capacity CHECK (CASE WHEN bypass THEN true ELSE cardinality(payload::lane_number[]) = recorded_count END),
  CONSTRAINT parsed_domain_first CHECK (CASE WHEN bypass THEN true ELSE (payload::lane_number[])[1] IS NOT DISTINCT FROM recorded_first END),
  CONSTRAINT parsed_domain_required CHECK (CASE WHEN bypass THEN true ELSE cardinality(required_payload::lane_required_number[]) >= 0 END),
  CONSTRAINT parsed_domain_code CHECK (CASE WHEN bypass THEN true ELSE (labels::lane_code[])[1]::text COLLATE "C" IS NOT DISTINCT FROM recorded_code COLLATE "C" END)
);

CREATE DOMAIN lane_pair_array AS integer[] CHECK (cardinality(VALUE)=2);
CREATE DOMAIN lane_positive_pair AS lane_pair_array CHECK (VALUE[1]>0);
CREATE DOMAIN lane_required_pair AS lane_positive_pair NOT NULL;
CREATE DOMAIN lane_pair_codes AS varchar(3)[] COLLATE "C" CHECK (cardinality(VALUE)=2);
CREATE DOMAIN lane_rounded_pair AS numeric(3,1)[] CHECK (cardinality(VALUE)=2);
CREATE TABLE lane_array_domain_imports (
  payload text,
  required_payload text,
  codes text,
  recorded_first integer,
  recorded_code text,
  lane integer,
  divisor integer,
  approved_pair lane_pair_array,
  recorded_approved integer,
  bypass boolean,
  CONSTRAINT whole_domain_precision CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[lane::numeric,1::numeric/divisor::numeric]::lane_rounded_pair)=2 END),
  CONSTRAINT whole_domain_size CHECK (CASE WHEN bypass THEN true ELSE cardinality(payload::lane_pair_array)=2 END),
  CONSTRAINT whole_domain_required CHECK (CASE WHEN bypass THEN true ELSE (required_payload::lane_required_pair)[1] IS NOT DISTINCT FROM recorded_first END),
  CONSTRAINT whole_domain_codes CHECK (CASE WHEN bypass THEN true ELSE (codes::lane_pair_codes)[1]::text COLLATE "C" IS NOT DISTINCT FROM recorded_code COLLATE "C" END),
  CONSTRAINT whole_domain_constructor CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[lane,1/divisor]::lane_positive_pair)=2 END),
  CONSTRAINT whole_domain_retained CHECK (CASE WHEN bypass THEN true ELSE (approved_pair::lane_pair_array)[1] IS NOT DISTINCT FROM recorded_approved END)
);

CREATE DOMAIN lane_unblocked_number AS integer CHECK(VALUE<>0);
CREATE TABLE lane_polymorphic_allocations (
  lane lane_number,
  slots lane_number[],
  fallback lane_unblocked_number[],
  required_slots lane_required_number[],
  stage lane_stage_bound,
  recorded_appended integer,
  recorded_choice integer,
  check_required boolean,
  check_layout boolean,
  divisor integer,
  bypass boolean,
  CONSTRAINT polymorphic_fill CHECK(CASE WHEN bypass THEN true ELSE cardinality(array_fill(lane,ARRAY[2]))=2 END),
  CONSTRAINT polymorphic_append CHECK(CASE WHEN bypass THEN true ELSE cardinality(array_append(slots,lane))=recorded_appended END),
  CONSTRAINT polymorphic_retained CHECK(CASE WHEN bypass THEN true ELSE (array_fill(lane,ARRAY[2]))[1]::lane_number IS NOT DISTINCT FROM lane END),
  CONSTRAINT polymorphic_choice CHECK(CASE WHEN bypass THEN true ELSE cardinality(COALESCE(slots,fallback))=recorded_choice END),
  CONSTRAINT polymorphic_eager CHECK(CASE WHEN bypass THEN true ELSE cardinality(GREATEST(slots,fallback))>=0 END),
  CONSTRAINT polymorphic_required CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN check_required THEN cardinality(array_append(required_slots,NULL))>=0 ELSE true END END),
  CONSTRAINT polymorphic_stage CHECK(CASE WHEN bypass THEN true ELSE (array_fill(stage,ARRAY[2]))[1]::lane_stage=stage::lane_stage END),
  CONSTRAINT polymorphic_layout CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN check_layout THEN cardinality(ARRAY[slots,fallback,ARRAY[1,1/divisor]])=6 ELSE true END END)
);

CREATE TABLE lane_code_coercions (
  approved lane_code[],
  payload text,
  recorded_count integer,
  recorded_code text,
  recorded_explicit text,
  divisor integer,
  bypass boolean,
  CONSTRAINT implicit_code_capacity CHECK(CASE WHEN bypass THEN true ELSE cardinality(COALESCE(approved,payload::varchar[]))=recorded_count END),
  CONSTRAINT explicit_code_capacity CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::varchar[]::lane_code[])=recorded_count END),
  CONSTRAINT implicit_code_order CHECK(CASE WHEN bypass THEN true ELSE cardinality(COALESCE(approved,payload::varchar[]))+(1/divisor)>0 END),
  CONSTRAINT explicit_code_order CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::varchar[]::lane_code[])+(1/divisor)>0 END),
  CONSTRAINT implicit_code_value CHECK(CASE WHEN bypass THEN true ELSE (COALESCE(approved,payload::varchar[]))[1]::text COLLATE "C" IS NOT DISTINCT FROM recorded_code COLLATE "C" END),
  CONSTRAINT explicit_code_value CHECK(CASE WHEN bypass THEN true ELSE (payload::varchar[]::lane_code[])[1]::text COLLATE "C" IS NOT DISTINCT FROM recorded_explicit COLLATE "C" END)
);


CREATE TABLE lane_group_allocations (
  groups lane_pair_array[],
  first_group lane_pair_array,
  second_group lane_pair_array,
  expected_count integer,
  expected_size integer,
  expected_lower integer,
  expected_first integer,
  expected_slice integer,
  expected_append integer,
  expected_construct integer,
  divisor integer,
  expected_scaled integer,
  bypass boolean,
  CONSTRAINT nested_group_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT nested_group_size CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups[1]) IS NOT DISTINCT FROM expected_size END),
  CONSTRAINT nested_group_lower CHECK(CASE WHEN bypass THEN true ELSE array_lower(groups[1],1) IS NOT DISTINCT FROM expected_lower END),
  CONSTRAINT nested_group_first CHECK(CASE WHEN bypass THEN true ELSE (groups[1])[expected_lower] IS NOT DISTINCT FROM expected_first END),
  CONSTRAINT nested_group_slice CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups[1:1]) IS NOT DISTINCT FROM expected_slice END),
  CONSTRAINT nested_group_append CHECK(CASE WHEN bypass THEN true ELSE cardinality(array_append(groups,first_group)) IS NOT DISTINCT FROM expected_append END),
  CONSTRAINT nested_group_constructor CHECK(CASE WHEN bypass THEN true ELSE cardinality((ARRAY[first_group,second_group])[1]) IS NOT DISTINCT FROM expected_construct END),
  CONSTRAINT nested_group_fill CHECK(CASE WHEN bypass THEN true ELSE cardinality(array_fill(first_group,ARRAY[2]))=2 END),
  CONSTRAINT nested_group_scaled CHECK(CASE WHEN bypass THEN true ELSE cardinality(first_group)/divisor=expected_scaled END)
);


CREATE TABLE lane_group_text_imports (
  payload text,
  required_payload text,
  expected_count integer,
  expected_first integer,
  divisor integer,
  bypass boolean,
  CONSTRAINT nested_text_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::lane_pair_array[]) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT nested_text_first CHECK(CASE WHEN bypass THEN true ELSE ((payload::lane_pair_array[])[1])[1] IS NOT DISTINCT FROM expected_first END),
  CONSTRAINT nested_text_required CHECK(CASE WHEN bypass THEN true ELSE cardinality(required_payload::lane_required_pair[])>=0 END),
  CONSTRAINT nested_text_order CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::lane_pair_array[])/divisor>=0 END)
);

CREATE TABLE lane_group_exports (
  groups lane_pair_array[],
  recorded_text text,
  recorded_join text,
  recorded_first text,
  divisor integer,
  bypass boolean,
  CONSTRAINT nested_export_text CHECK(CASE WHEN bypass THEN true ELSE groups::text COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
  CONSTRAINT nested_export_join CHECK(CASE WHEN bypass THEN true ELSE array_to_string(groups,'|','<NULL>') COLLATE "C" IS NOT DISTINCT FROM recorded_join COLLATE "C" END),
  CONSTRAINT nested_export_first CHECK(CASE WHEN bypass THEN true ELSE groups[1]::text COLLATE "C" IS NOT DISTINCT FROM recorded_first COLLATE "C" END),
  CONSTRAINT nested_export_order CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups)/divisor>=0 END)
);

CREATE TABLE lane_group_casts (
  groups lane_pair_array[],
  payload text,
  recorded_text text,
  recorded_first numeric,
  divisor integer,
  bypass boolean,
  CONSTRAINT nested_cast_text CHECK(CASE WHEN bypass THEN true ELSE (groups::lane_rounded_pair[])::text COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
  CONSTRAINT nested_cast_input CHECK(CASE WHEN bypass THEN true ELSE (payload::lane_pair_array[]::lane_rounded_pair[])::text COLLATE "C" IS NOT DISTINCT FROM recorded_text COLLATE "C" END),
  CONSTRAINT nested_cast_first CHECK(CASE WHEN bypass THEN true ELSE ((groups::lane_rounded_pair[])[1])[1] IS NOT DISTINCT FROM recorded_first END),
  CONSTRAINT nested_cast_required CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups::lane_required_pair[])/divisor>=0 END)
);

CREATE TABLE lane_group_comparisons (
  groups lane_pair_array[],
  thresholds lane_pair_array[],
  requested lane_pair_array,
  expected_order integer,
  expected_position integer,
  expected_contains boolean,
  expected_any boolean,
  expected_sort text,
  bypass boolean,
  CONSTRAINT nested_compare_order CHECK(CASE WHEN bypass THEN true ELSE btarraycmp(groups,thresholds)=expected_order END),
  CONSTRAINT nested_compare_position CHECK(CASE WHEN bypass THEN true ELSE array_position(groups,requested) IS NOT DISTINCT FROM expected_position END),
  CONSTRAINT nested_compare_contains CHECK(CASE WHEN bypass THEN true ELSE (groups@>thresholds) IS NOT DISTINCT FROM expected_contains END),
  CONSTRAINT nested_compare_any CHECK(CASE WHEN bypass THEN true ELSE (requested=ANY(groups)) IS NOT DISTINCT FROM expected_any END),
  CONSTRAINT nested_compare_sort CHECK(CASE WHEN bypass THEN true ELSE array_sort(groups)::text COLLATE "C" IS NOT DISTINCT FROM expected_sort COLLATE "C" END)
);

CREATE TABLE lane_group_hashes (
  groups lane_pair_array[],
  payload text,
  seed bigint,
  expected_hash integer,
  expected_seeded bigint,
  bypass boolean,
  CONSTRAINT nested_group_hash CHECK(CASE WHEN bypass THEN true ELSE hash_array(groups) IS NOT DISTINCT FROM expected_hash END),
  CONSTRAINT nested_group_seeded_hash CHECK(CASE WHEN bypass THEN true ELSE hash_array_extended(groups,seed) IS NOT DISTINCT FROM expected_seeded END),
  CONSTRAINT nested_group_input_hash CHECK(CASE WHEN bypass OR payload IS NULL THEN true ELSE hash_array(payload::lane_pair_array[]) IS NOT DISTINCT FROM expected_hash END)
);

CREATE TABLE lane_group_json_exports (
  groups lane_pair_array[],
  payload text,
  expected_raw text,
  expected_binary jsonb,
  expected_flat jsonb,
  bypass boolean,
  CONSTRAINT nested_json_raw CHECK(CASE WHEN bypass THEN true ELSE to_json(groups)::text COLLATE "C" IS NOT DISTINCT FROM expected_raw COLLATE "C" END),
  CONSTRAINT nested_json_binary CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(groups) IS NOT DISTINCT FROM expected_binary END),
  CONSTRAINT nested_json_flat CHECK(CASE WHEN bypass THEN true ELSE jsonb_build_array(VARIADIC groups) IS NOT DISTINCT FROM expected_flat END),
  CONSTRAINT nested_json_input CHECK(CASE WHEN bypass OR payload IS NULL THEN true ELSE to_jsonb(payload::lane_pair_array[]) IS NOT DISTINCT FROM expected_binary END)
);

CREATE DOMAIN lane_stage_group AS lane_stage[];
CREATE TABLE lane_enum_json_exports (
  first_stage lane_import_stage,
  second_stage lane_export_stage,
  groups lane_stage_group[],
  expected_binary jsonb,
  expected_raw text,
  expected_groups jsonb,
  bypass boolean,
  CONSTRAINT enum_json_binary CHECK(CASE WHEN bypass THEN true ELSE jsonb_build_array(first_stage,second_stage) IS NOT DISTINCT FROM expected_binary END),
  CONSTRAINT enum_json_raw CHECK(CASE WHEN bypass THEN true ELSE json_build_array(first_stage,second_stage)::text COLLATE "C" IS NOT DISTINCT FROM expected_raw COLLATE "C" END),
  CONSTRAINT enum_json_groups CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(groups) IS NOT DISTINCT FROM expected_groups END)
);

CREATE TABLE lane_catalog_array_exports (
  lanes text,
  bits text,
  labels text,
  amounts text,
  expected_lanes text,
  expected_bits text,
  expected_labels text,
  expected_amounts text,
  quantity integer,
  divisor integer,
  bypass boolean,
  CONSTRAINT catalog_lane_text CHECK(CASE WHEN bypass THEN true ELSE array_to_string(lanes::pg_catalog._int4,'|','N') COLLATE "C" IS NOT DISTINCT FROM expected_lanes COLLATE "C" END),
  CONSTRAINT catalog_bit_text CHECK(CASE WHEN bypass THEN true ELSE array_to_string(bits::pg_catalog._bit,'|','N') COLLATE "C" IS NOT DISTINCT FROM expected_bits COLLATE "C" END),
  CONSTRAINT catalog_label_text CHECK(CASE WHEN bypass THEN true ELSE array_to_string(labels::pg_catalog._bpchar,'|','N') COLLATE "C" IS NOT DISTINCT FROM expected_labels COLLATE "C" END),
  CONSTRAINT catalog_amount_text CHECK(CASE WHEN bypass THEN true ELSE array_to_string(amounts::pg_catalog._numeric(4,1),'|','N') COLLATE "C" IS NOT DISTINCT FROM expected_amounts COLLATE "C" END),
  CONSTRAINT catalog_narrowed_shape CHECK(CASE WHEN bypass THEN true ELSE cardinality(ARRAY[quantity,1/divisor]::pg_catalog._int2)=2 END)
);

CREATE TABLE lane_reservation_windows (
  span int4range,
  alternate_span int4range,
  loads int8range,
  price_band numrange,
  service_days daterange,
  local_shift tsrange,
  instant_shift tstzrange,
  prefer_alternate boolean,
  expected_end integer,
  expected_empty boolean,
  expected_lower_inc boolean,
  expected_continuous_upper_inc boolean,
  expected_lower_inf boolean,
  expected_upper_inf boolean,
  expected_lower_null boolean,
  expected_upper_null boolean,
  minimum integer,
  latest_local timestamp,
  earliest_instant timestamptz,
  denominator integer,
  bypass boolean,
  CONSTRAINT window_empty_flags CHECK(CASE WHEN bypass THEN true ELSE
    isempty(span) IS NOT DISTINCT FROM expected_empty AND isempty(loads) IS NOT DISTINCT FROM expected_empty AND
    isempty(price_band) IS NOT DISTINCT FROM expected_empty AND isempty(service_days) IS NOT DISTINCT FROM expected_empty AND
    isempty(local_shift) IS NOT DISTINCT FROM expected_empty AND isempty(instant_shift) IS NOT DISTINCT FROM expected_empty END),
  CONSTRAINT window_lower_flags CHECK(CASE WHEN bypass THEN true ELSE
    lower_inc(span) IS NOT DISTINCT FROM expected_lower_inc AND lower_inc(loads) IS NOT DISTINCT FROM expected_lower_inc AND
    lower_inc(price_band) IS NOT DISTINCT FROM expected_lower_inc AND lower_inc(service_days) IS NOT DISTINCT FROM expected_lower_inc AND
    lower_inc(local_shift) IS NOT DISTINCT FROM expected_lower_inc AND lower_inc(instant_shift) IS NOT DISTINCT FROM expected_lower_inc END),
  CONSTRAINT window_upper_flags CHECK(CASE WHEN bypass THEN true ELSE
    upper_inc(span) IS NOT DISTINCT FROM CASE WHEN span IS NULL THEN NULL ELSE false END AND
    upper_inc(loads) IS NOT DISTINCT FROM CASE WHEN loads IS NULL THEN NULL ELSE false END AND
    upper_inc(service_days) IS NOT DISTINCT FROM CASE WHEN service_days IS NULL THEN NULL ELSE false END AND
    upper_inc(price_band) IS NOT DISTINCT FROM expected_continuous_upper_inc AND
    upper_inc(local_shift) IS NOT DISTINCT FROM expected_continuous_upper_inc AND upper_inc(instant_shift) IS NOT DISTINCT FROM expected_continuous_upper_inc END),
  CONSTRAINT window_infinite_flags CHECK(CASE WHEN bypass THEN true ELSE
    lower_inf(span) IS NOT DISTINCT FROM expected_lower_inf AND upper_inf(span) IS NOT DISTINCT FROM expected_upper_inf AND
    lower_inf(loads) IS NOT DISTINCT FROM expected_lower_inf AND upper_inf(loads) IS NOT DISTINCT FROM expected_upper_inf AND
    lower_inf(price_band) IS NOT DISTINCT FROM expected_lower_inf AND upper_inf(price_band) IS NOT DISTINCT FROM expected_upper_inf AND
    lower_inf(service_days) IS NOT DISTINCT FROM expected_lower_inf AND upper_inf(service_days) IS NOT DISTINCT FROM expected_upper_inf AND
    lower_inf(local_shift) IS NOT DISTINCT FROM expected_lower_inf AND upper_inf(local_shift) IS NOT DISTINCT FROM expected_upper_inf AND
    lower_inf(instant_shift) IS NOT DISTINCT FROM expected_lower_inf AND upper_inf(instant_shift) IS NOT DISTINCT FROM expected_upper_inf END),
  CONSTRAINT window_bound_presence CHECK(CASE WHEN bypass THEN true ELSE
    (lower(span) IS NULL) IS NOT DISTINCT FROM expected_lower_null AND (upper(span) IS NULL) IS NOT DISTINCT FROM expected_upper_null AND
    (lower(loads) IS NULL) IS NOT DISTINCT FROM expected_lower_null AND (upper(loads) IS NULL) IS NOT DISTINCT FROM expected_upper_null AND
    (lower(price_band) IS NULL) IS NOT DISTINCT FROM expected_lower_null AND (upper(price_band) IS NULL) IS NOT DISTINCT FROM expected_upper_null AND
    (lower(service_days) IS NULL) IS NOT DISTINCT FROM expected_lower_null AND (upper(service_days) IS NULL) IS NOT DISTINCT FROM expected_upper_null AND
    (lower(local_shift) IS NULL) IS NOT DISTINCT FROM expected_lower_null AND (upper(local_shift) IS NULL) IS NOT DISTINCT FROM expected_upper_null AND
    (lower(instant_shift) IS NULL) IS NOT DISTINCT FROM expected_lower_null AND (upper(instant_shift) IS NULL) IS NOT DISTINCT FROM expected_upper_null END),
  CONSTRAINT window_integer_floor CHECK(CASE WHEN bypass THEN true ELSE lower(COALESCE(span,alternate_span)) >= minimum END),
  CONSTRAINT window_local_ceiling CHECK(CASE WHEN bypass THEN true ELSE upper(local_shift) <= latest_local END),
  CONSTRAINT window_instant_floor CHECK(CASE WHEN bypass THEN true ELSE lower(instant_shift) >= earliest_instant END),
  CONSTRAINT window_selected_end CHECK(CASE WHEN bypass THEN true ELSE upper(CASE WHEN prefer_alternate THEN alternate_span ELSE span END) IS NOT DISTINCT FROM expected_end END),
  CONSTRAINT window_division CHECK(CASE WHEN bypass THEN true ELSE isempty(span) OR 1/denominator > 0 END)
);

CREATE TABLE lane_constructor_windows (
  low_bound integer,
  high_bound integer,
  low_wide bigint,
  high_wide bigint,
  low_price numeric,
  high_price numeric,
  low_day date,
  high_day date,
  low_local timestamp,
  high_local timestamp,
  low_instant timestamptz,
  high_instant timestamptz,
  bound_flags text,
  expected_empty boolean,
  ceiling_wide bigint,
  latest_day date,
  earliest_local timestamp,
  latest_instant timestamptz,
  divisor integer,
  bypass boolean,
  CONSTRAINT constructor_empty CHECK(CASE WHEN bypass THEN true ELSE isempty(int4range(low_bound,high_bound,bound_flags)) IS NOT DISTINCT FROM expected_empty END),
  CONSTRAINT constructor_wide_end CHECK(CASE WHEN bypass THEN true ELSE upper(int8range(low_wide,high_wide,bound_flags))<=ceiling_wide END),
  CONSTRAINT constructor_price_floor CHECK(CASE WHEN bypass THEN true ELSE lower(numrange(low_price,high_price,bound_flags))>=0 END),
  CONSTRAINT constructor_day_end CHECK(CASE WHEN bypass THEN true ELSE upper(daterange(low_day,high_day,bound_flags))<=latest_day END),
  CONSTRAINT constructor_local_floor CHECK(CASE WHEN bypass THEN true ELSE lower(tsrange(low_local,high_local,bound_flags))>=earliest_local END),
  CONSTRAINT constructor_instant_end CHECK(CASE WHEN bypass THEN true ELSE upper(tstzrange(low_instant,high_instant,bound_flags))<=latest_instant END),
  CONSTRAINT constructor_default_end CHECK(CASE WHEN bypass THEN true ELSE upper(int4range(low_bound,high_bound/divisor))<=100 END),
  CONSTRAINT constructor_canonical_floor CHECK(CASE WHEN bypass THEN true ELSE lower(int4range_canonical(int4range(low_bound,high_bound,bound_flags)))>=0 END)
);

CREATE DOMAIN imported_slot AS int4range CHECK(isempty(VALUE) OR lower(VALUE)>=0);
CREATE TABLE lane_range_imports (
  slots text,
  loads text,
  prices text,
  calendar_days text,
  local_shift text,
  instant_shift text,
  expected_empty boolean,
  expected_end integer,
  minimum_price numeric,
  latest_day date,
  earliest_local timestamp,
  latest_instant timestamptz,
  divisor integer,
  bypass boolean,
  CONSTRAINT range_import_empty CHECK(CASE WHEN bypass THEN true ELSE isempty(slots::int4range) IS NOT DISTINCT FROM expected_empty END),
  CONSTRAINT range_import_end CHECK(CASE WHEN bypass THEN true ELSE upper(int4range(slots))<=expected_end END),
  CONSTRAINT range_import_domain_end CHECK(CASE WHEN bypass THEN true ELSE upper(slots::imported_slot)<=expected_end END),
  CONSTRAINT range_import_loads CHECK(CASE WHEN bypass THEN true ELSE upper(loads::int8range)<=9007199254741000::bigint END),
  CONSTRAINT range_import_prices CHECK(CASE WHEN bypass THEN true ELSE lower(prices::numrange)>=minimum_price END),
  CONSTRAINT range_import_days CHECK(CASE WHEN bypass THEN true ELSE upper(calendar_days::daterange)<=latest_day END),
  CONSTRAINT range_import_local CHECK(CASE WHEN bypass THEN true ELSE lower(local_shift::tsrange)>=earliest_local END),
  CONSTRAINT range_import_instant CHECK(CASE WHEN bypass THEN true ELSE upper(instant_shift::tstzrange)<=latest_instant END),
  CONSTRAINT range_import_start CHECK(CASE WHEN bypass THEN true ELSE lower(slots::int4range)>=1/divisor END)
);

CREATE TABLE lane_range_exports (
  slots int4range,
  loads int8range,
  prices numrange,
  calendar_days daterange,
  local_shift tsrange,
  instant_shift tstzrange,
  expected_slots text,
  expected_loads text,
  expected_prices text,
  expected_days text,
  expected_local text,
  expected_instant text,
  slot_prefix text,
  imported text,
  divisor integer,
  bypass boolean,
  CONSTRAINT range_export_slots CHECK(CASE WHEN bypass THEN true ELSE slots::text IS NOT DISTINCT FROM expected_slots END),
  CONSTRAINT range_export_loads CHECK(CASE WHEN bypass THEN true ELSE text(loads) IS NOT DISTINCT FROM expected_loads END),
  CONSTRAINT range_export_prices CHECK(CASE WHEN bypass THEN true ELSE prices::varchar IS NOT DISTINCT FROM expected_prices END),
  CONSTRAINT range_export_days CHECK(CASE WHEN bypass THEN true ELSE calendar_days::text IS NOT DISTINCT FROM expected_days END),
  CONSTRAINT range_export_local CHECK(CASE WHEN bypass THEN true ELSE local_shift::text IS NOT DISTINCT FROM expected_local END),
  CONSTRAINT range_export_instant CHECK(CASE WHEN bypass THEN true ELSE instant_shift::text IS NOT DISTINCT FROM expected_instant END),
  CONSTRAINT range_export_prefix CHECK(CASE WHEN bypass THEN true ELSE (slots::char(3))::text IS NOT DISTINCT FROM slot_prefix END),
  CONSTRAINT range_export_domain CHECK(CASE WHEN bypass THEN true ELSE (slots::imported_slot)::text IS NOT DISTINCT FROM expected_slots END),
  CONSTRAINT range_export_import CHECK(CASE WHEN bypass THEN true ELSE (imported::int4range)::text IS NOT DISTINCT FROM expected_slots END),
  CONSTRAINT range_export_constructor CHECK(CASE WHEN bypass THEN true ELSE int4range(1,3/divisor)::text='[1,3)' END)
);

CREATE TABLE lane_range_relations (
  slots int4range,
  other_slots int4range,
  loads int8range,
  other_loads int8range,
  prices numrange,
  other_prices numrange,
  calendar_days daterange,
  other_days daterange,
  local_shift tsrange,
  other_local tsrange,
  instant_shift tstzrange,
  other_instant tstzrange,
  expected_order integer,
  expected_contains boolean,
  expected_overlap boolean,
  expected_adjacent boolean,
  bypass boolean,
  CONSTRAINT range_relation_order CHECK(CASE WHEN bypass THEN true ELSE
    range_cmp(slots,other_slots) IS NOT DISTINCT FROM expected_order AND range_cmp(loads,other_loads) IS NOT DISTINCT FROM expected_order AND
    range_cmp(prices,other_prices) IS NOT DISTINCT FROM expected_order AND range_cmp(calendar_days,other_days) IS NOT DISTINCT FROM expected_order AND
    range_cmp(local_shift,other_local) IS NOT DISTINCT FROM expected_order AND range_cmp(instant_shift,other_instant) IS NOT DISTINCT FROM expected_order END),
  CONSTRAINT range_relation_contains CHECK(CASE WHEN bypass THEN true ELSE
    (slots @> other_slots) IS NOT DISTINCT FROM expected_contains AND (loads @> other_loads) IS NOT DISTINCT FROM expected_contains AND
    (prices @> other_prices) IS NOT DISTINCT FROM expected_contains AND (calendar_days @> other_days) IS NOT DISTINCT FROM expected_contains AND
    (local_shift @> other_local) IS NOT DISTINCT FROM expected_contains AND (instant_shift @> other_instant) IS NOT DISTINCT FROM expected_contains END),
  CONSTRAINT range_relation_overlap CHECK(CASE WHEN bypass THEN true ELSE
    (slots && other_slots) IS NOT DISTINCT FROM expected_overlap AND (loads && other_loads) IS NOT DISTINCT FROM expected_overlap AND
    (prices && other_prices) IS NOT DISTINCT FROM expected_overlap AND (calendar_days && other_days) IS NOT DISTINCT FROM expected_overlap AND
    (local_shift && other_local) IS NOT DISTINCT FROM expected_overlap AND (instant_shift && other_instant) IS NOT DISTINCT FROM expected_overlap END),
  CONSTRAINT range_relation_adjacent CHECK(CASE WHEN bypass THEN true ELSE
    (slots -|- other_slots) IS NOT DISTINCT FROM expected_adjacent AND (loads -|- other_loads) IS NOT DISTINCT FROM expected_adjacent AND
    (prices -|- other_prices) IS NOT DISTINCT FROM expected_adjacent AND (calendar_days -|- other_days) IS NOT DISTINCT FROM expected_adjacent AND
    (local_shift -|- other_local) IS NOT DISTINCT FROM expected_adjacent AND (instant_shift -|- other_instant) IS NOT DISTINCT FROM expected_adjacent END)
);

CREATE TABLE lane_range_algebra (
  slots int4range,
  other_slots int4range,
  combined int4range,
  shared int4range,
  remaining int4range,
  hull int4range,
  preferred int4range,
  needle integer,
  expected_contains boolean,
  divisor integer,
  bypass boolean,
  CONSTRAINT range_algebra_union CHECK(CASE WHEN bypass THEN true ELSE slots+other_slots IS NOT DISTINCT FROM combined END),
  CONSTRAINT range_algebra_intersection CHECK(CASE WHEN bypass THEN true ELSE slots*other_slots IS NOT DISTINCT FROM shared END),
  CONSTRAINT range_algebra_difference CHECK(CASE WHEN bypass THEN true ELSE slots-other_slots IS NOT DISTINCT FROM remaining END),
  CONSTRAINT range_algebra_hull CHECK(CASE WHEN bypass THEN true ELSE range_merge(slots,other_slots) IS NOT DISTINCT FROM hull END),
  CONSTRAINT range_algebra_choice CHECK(CASE WHEN bypass THEN true ELSE greatest(NULLIF(slots,other_slots),other_slots) IS NOT DISTINCT FROM preferred END),
  CONSTRAINT range_algebra_element CHECK(CASE WHEN bypass THEN true ELSE (slots @> needle) IS NOT DISTINCT FROM expected_contains END),
  CONSTRAINT range_algebra_constructor CHECK(CASE WHEN bypass THEN true ELSE int4range(1,3/divisor) << other_slots END)
);

CREATE TABLE lane_range_fingerprints (
  slots int4range,
  loads int8range,
  prices numrange,
  calendar_days daterange,
  local_shift tsrange,
  instant_shift tstzrange,
  slot_wire text,
  load_wire text,
  price_wire text,
  day_wire text,
  local_wire text,
  instant_wire text,
  expected_hashes integer[],
  expected_extended bigint[],
  seed bigint,
  divisor integer,
  bypass boolean,
  CONSTRAINT range_fingerprint_slots CHECK(CASE WHEN bypass THEN true ELSE encode(range_send(slots),'hex') IS NOT DISTINCT FROM slot_wire END),
  CONSTRAINT range_fingerprint_loads CHECK(CASE WHEN bypass THEN true ELSE encode(range_send(loads),'hex') IS NOT DISTINCT FROM load_wire END),
  CONSTRAINT range_fingerprint_prices CHECK(CASE WHEN bypass THEN true ELSE encode(range_send(prices),'hex') IS NOT DISTINCT FROM price_wire END),
  CONSTRAINT range_fingerprint_days CHECK(CASE WHEN bypass THEN true ELSE encode(range_send(calendar_days),'hex') IS NOT DISTINCT FROM day_wire END),
  CONSTRAINT range_fingerprint_local CHECK(CASE WHEN bypass THEN true ELSE encode(range_send(local_shift),'hex') IS NOT DISTINCT FROM local_wire END),
  CONSTRAINT range_fingerprint_instant CHECK(CASE WHEN bypass THEN true ELSE encode(range_send(instant_shift),'hex') IS NOT DISTINCT FROM instant_wire END),
  CONSTRAINT range_fingerprint_hashes CHECK(CASE WHEN bypass THEN true ELSE
    hash_range(slots) IS NOT DISTINCT FROM expected_hashes[1] AND hash_range(loads) IS NOT DISTINCT FROM expected_hashes[2] AND
    hash_range(prices) IS NOT DISTINCT FROM expected_hashes[3] AND hash_range(calendar_days) IS NOT DISTINCT FROM expected_hashes[4] AND
    hash_range(local_shift) IS NOT DISTINCT FROM expected_hashes[5] AND hash_range(instant_shift) IS NOT DISTINCT FROM expected_hashes[6] END),
  CONSTRAINT range_fingerprint_extended CHECK(CASE WHEN bypass THEN true ELSE
    hash_range_extended(slots,seed/divisor) IS NOT DISTINCT FROM expected_extended[1] AND hash_range_extended(loads,seed) IS NOT DISTINCT FROM expected_extended[2] AND
    hash_range_extended(prices,seed) IS NOT DISTINCT FROM expected_extended[3] AND hash_range_extended(calendar_days,seed) IS NOT DISTINCT FROM expected_extended[4] AND
    hash_range_extended(local_shift,seed) IS NOT DISTINCT FROM expected_extended[5] AND hash_range_extended(instant_shift,seed) IS NOT DISTINCT FROM expected_extended[6] END)
);

CREATE DOMAIN lane_recorded_range AS int4range;
CREATE DOMAIN lane_range_history AS lane_recorded_range[];

CREATE TABLE lane_range_batches (
  slots int4range[],
  loads int8range[],
  prices numrange[],
  calendar_days daterange[],
  local_shift tsrange[],
  instant_shift tstzrange[],
  typed_slots lane_recorded_range[],
  histories lane_range_history[],
  head int4range,
  expected_counts integer[],
  expected_member boolean,
  expected_sorted boolean,
  bypass boolean,
  CONSTRAINT range_batch_slots_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(slots) IS NOT DISTINCT FROM expected_counts[1] END),
  CONSTRAINT range_batch_loads_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(loads) IS NOT DISTINCT FROM expected_counts[2] END),
  CONSTRAINT range_batch_prices_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(prices) IS NOT DISTINCT FROM expected_counts[3] END),
  CONSTRAINT range_batch_calendar_days_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(calendar_days) IS NOT DISTINCT FROM expected_counts[4] END),
  CONSTRAINT range_batch_local_shift_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(local_shift) IS NOT DISTINCT FROM expected_counts[5] END),
  CONSTRAINT range_batch_instant_shift_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(instant_shift) IS NOT DISTINCT FROM expected_counts[6] END),
  CONSTRAINT range_batch_first CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN slots IS NULL THEN true ELSE slots[array_lower(slots,1)] IS NOT DISTINCT FROM head END END),
  CONSTRAINT range_batch_member CHECK(CASE WHEN bypass THEN true ELSE (head=ANY(slots)) IS NOT DISTINCT FROM expected_member END),
  CONSTRAINT range_batch_sorted CHECK(CASE WHEN bypass THEN true ELSE (array_sort(slots)=slots) IS NOT DISTINCT FROM expected_sorted END),
  CONSTRAINT range_batch_domain CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN typed_slots IS NULL THEN true ELSE typed_slots[1] IS NOT DISTINCT FROM head END END),
  CONSTRAINT range_batch_nested CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN histories IS NULL THEN true ELSE (histories[1])[1] IS NOT DISTINCT FROM head END END)
);

CREATE DOMAIN lane_recorded_load_spans AS int8multirange;
CREATE DOMAIN lane_load_segments AS lane_recorded_load_spans;

CREATE TABLE lane_shift_segments (
  slots int4multirange,
  loads lane_load_segments,
  prices nummultirange,
  calendar_days datemultirange,
  local_shift tsmultirange,
  instant_shift tstzmultirange,
  alternate_loads lane_load_segments,
  slot_floor integer,
  load_floor bigint,
  price_ceiling numeric,
  day_floor date,
  local_ceiling timestamp,
  instant_floor timestamptz,
  expected_empty boolean,
  expected_bounded boolean,
  expected_missing boolean,
  choose_alternate boolean,
  bypass boolean,
  CONSTRAINT shift_segments_slots CHECK(CASE WHEN bypass THEN true ELSE lower(slots) IS NOT DISTINCT FROM slot_floor END),
  CONSTRAINT shift_segments_loads CHECK(CASE WHEN bypass THEN true ELSE lower(loads) IS NOT DISTINCT FROM load_floor END),
  CONSTRAINT shift_segments_prices CHECK(CASE WHEN bypass THEN true ELSE upper(prices) IS NOT DISTINCT FROM price_ceiling END),
  CONSTRAINT shift_segments_days CHECK(CASE WHEN bypass THEN true ELSE lower(calendar_days) IS NOT DISTINCT FROM day_floor END),
  CONSTRAINT shift_segments_local CHECK(CASE WHEN bypass THEN true ELSE upper(local_shift) IS NOT DISTINCT FROM local_ceiling END),
  CONSTRAINT shift_segments_instant CHECK(CASE WHEN bypass THEN true ELSE lower(instant_shift) IS NOT DISTINCT FROM instant_floor END),
  CONSTRAINT shift_segments_empty CHECK(CASE WHEN bypass THEN true ELSE isempty(slots)=expected_empty END),
  CONSTRAINT shift_segments_bounded CHECK(CASE WHEN bypass THEN true ELSE (lower_inc(slots) AND NOT upper_inc(slots) AND NOT lower_inf(slots) AND NOT upper_inf(slots))=expected_bounded END),
  CONSTRAINT shift_segments_present CHECK(CASE WHEN bypass THEN true ELSE (slots IS NULL)=expected_missing END),
  CONSTRAINT shift_segments_choice CHECK(CASE WHEN bypass THEN true ELSE lower(CASE WHEN choose_alternate THEN alternate_loads ELSE COALESCE(loads,NULL::int8multirange) END) IS NOT DISTINCT FROM load_floor END)
);

CREATE TABLE lane_segment_assembly (
  first_slot lane_recorded_range,
  second_slot lane_recorded_range,
  slot_parts lane_recorded_range[],
  load_parts int8range[],
  price_parts numrange[],
  day_parts daterange[],
  local_parts tsrange[],
  instant_parts tstzrange[],
  slot_floor integer,
  slot_ceiling integer,
  load_ceiling bigint,
  price_floor numeric,
  day_ceiling date,
  local_floor timestamp,
  instant_ceiling timestamptz,
  chosen_floor integer,
  chosen_ceiling integer,
  expected_zero_empty boolean,
  choose_parts boolean,
  bypass boolean,
  CONSTRAINT segment_assembly_pair CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN first_slot IS NULL OR second_slot IS NULL THEN true ELSE lower(int4multirange(first_slot,second_slot)) IS NOT DISTINCT FROM slot_floor END END),
  CONSTRAINT segment_assembly_slots CHECK(CASE WHEN bypass THEN true ELSE upper(int4multirange(VARIADIC slot_parts)) IS NOT DISTINCT FROM slot_ceiling END),
  CONSTRAINT segment_assembly_loads CHECK(CASE WHEN bypass THEN true ELSE upper(int8multirange(VARIADIC load_parts)) IS NOT DISTINCT FROM load_ceiling END),
  CONSTRAINT segment_assembly_prices CHECK(CASE WHEN bypass THEN true ELSE lower(nummultirange(VARIADIC price_parts)) IS NOT DISTINCT FROM price_floor END),
  CONSTRAINT segment_assembly_days CHECK(CASE WHEN bypass THEN true ELSE upper(datemultirange(VARIADIC day_parts)) IS NOT DISTINCT FROM day_ceiling END),
  CONSTRAINT segment_assembly_local CHECK(CASE WHEN bypass THEN true ELSE lower(tsmultirange(VARIADIC local_parts)) IS NOT DISTINCT FROM local_floor END),
  CONSTRAINT segment_assembly_instant CHECK(CASE WHEN bypass THEN true ELSE upper(tstzmultirange(VARIADIC instant_parts)) IS NOT DISTINCT FROM instant_ceiling END),
  CONSTRAINT segment_assembly_case CHECK(CASE WHEN bypass THEN true ELSE lower(CASE WHEN choose_parts THEN int4multirange(VARIADIC slot_parts) ELSE int4multirange(first_slot) END) IS NOT DISTINCT FROM chosen_floor END),
  CONSTRAINT segment_assembly_coalesce CHECK(CASE WHEN bypass THEN true ELSE upper(COALESCE(first_slot::int4multirange,int4multirange(VARIADIC slot_parts),NULL::int4multirange)) IS NOT DISTINCT FROM chosen_ceiling END),
  CONSTRAINT segment_assembly_zero CHECK(CASE WHEN bypass THEN true ELSE isempty(int4multirange())=expected_zero_empty END)
);

CREATE DOMAIN lane_bounded_segments AS int4multirange
  CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL);

CREATE TABLE lane_segment_compatibility (
  slots int4multirange,
  other_slots int4multirange,
  loads lane_load_segments,
  other_loads lane_load_segments,
  prices nummultirange,
  other_prices nummultirange,
  calendar_days datemultirange,
  other_days datemultirange,
  local_shift tsmultirange,
  other_local tsmultirange,
  instant_shift tstzmultirange,
  other_instant tstzmultirange,
  reserved_span lane_recorded_range,
  checkpoint integer,
  alternatives lane_recorded_range[],
  preferred int4multirange,
  expected_order integer,
  expected_contains boolean,
  expected_overlap boolean,
  expected_adjacent boolean,
  expected_span boolean,
  expected_checkpoint boolean,
  expected_alternative boolean,
  require_bounded boolean,
  bypass boolean,
  CONSTRAINT segment_compatibility_order CHECK(CASE WHEN bypass THEN true ELSE
    multirange_cmp(slots,other_slots) IS NOT DISTINCT FROM expected_order AND multirange_cmp(loads,other_loads) IS NOT DISTINCT FROM expected_order AND
    multirange_cmp(prices,other_prices) IS NOT DISTINCT FROM expected_order AND multirange_cmp(calendar_days,other_days) IS NOT DISTINCT FROM expected_order AND
    multirange_cmp(local_shift,other_local) IS NOT DISTINCT FROM expected_order AND multirange_cmp(instant_shift,other_instant) IS NOT DISTINCT FROM expected_order END),
  CONSTRAINT segment_compatibility_contains CHECK(CASE WHEN bypass THEN true ELSE
    (slots @> other_slots) IS NOT DISTINCT FROM expected_contains AND (loads @> other_loads) IS NOT DISTINCT FROM expected_contains AND
    (prices @> other_prices) IS NOT DISTINCT FROM expected_contains AND (calendar_days @> other_days) IS NOT DISTINCT FROM expected_contains AND
    (local_shift @> other_local) IS NOT DISTINCT FROM expected_contains AND (instant_shift @> other_instant) IS NOT DISTINCT FROM expected_contains END),
  CONSTRAINT segment_compatibility_overlap CHECK(CASE WHEN bypass THEN true ELSE
    (slots && other_slots) IS NOT DISTINCT FROM expected_overlap AND (loads && other_loads) IS NOT DISTINCT FROM expected_overlap AND
    (prices && other_prices) IS NOT DISTINCT FROM expected_overlap AND (calendar_days && other_days) IS NOT DISTINCT FROM expected_overlap AND
    (local_shift && other_local) IS NOT DISTINCT FROM expected_overlap AND (instant_shift && other_instant) IS NOT DISTINCT FROM expected_overlap END),
  CONSTRAINT segment_compatibility_adjacent CHECK(CASE WHEN bypass THEN true ELSE
    (slots -|- other_slots) IS NOT DISTINCT FROM expected_adjacent AND (loads -|- other_loads) IS NOT DISTINCT FROM expected_adjacent AND
    (prices -|- other_prices) IS NOT DISTINCT FROM expected_adjacent AND (calendar_days -|- other_days) IS NOT DISTINCT FROM expected_adjacent AND
    (local_shift -|- other_local) IS NOT DISTINCT FROM expected_adjacent AND (instant_shift -|- other_instant) IS NOT DISTINCT FROM expected_adjacent END),
  CONSTRAINT segment_compatibility_span CHECK(CASE WHEN bypass THEN true ELSE
    (slots @> reserved_span) IS NOT DISTINCT FROM expected_span AND (reserved_span <@ slots) IS NOT DISTINCT FROM expected_span END),
  CONSTRAINT segment_compatibility_checkpoint CHECK(CASE WHEN bypass THEN true ELSE
    (slots @> checkpoint) IS NOT DISTINCT FROM expected_checkpoint AND (checkpoint <@ slots) IS NOT DISTINCT FROM expected_checkpoint END),
  CONSTRAINT segment_compatibility_choice CHECK(CASE WHEN bypass THEN true ELSE
    greatest(NULLIF(slots,other_slots),COALESCE(other_slots,slots))=preferred END),
  CONSTRAINT segment_compatibility_alternatives CHECK(CASE WHEN bypass THEN true ELSE
    (slots @> ANY(alternatives)) IS NOT DISTINCT FROM expected_alternative END),
  CONSTRAINT segment_compatibility_bounded CHECK(CASE WHEN bypass THEN true ELSE
    CASE WHEN require_bounded THEN slots::lane_bounded_segments IS NOT DISTINCT FROM slots ELSE NULL END END)
);

CREATE TABLE lane_segment_algebra (
  slots int4multirange,
  other_slots int4multirange,
  loads lane_load_segments,
  other_loads lane_load_segments,
  prices nummultirange,
  other_prices nummultirange,
  calendar_days datemultirange,
  other_days datemultirange,
  local_shift tsmultirange,
  other_local tsmultirange,
  instant_shift tstzmultirange,
  other_instant tstzmultirange,
  combined_slots int4multirange,
  combined_loads int8multirange,
  combined_prices nummultirange,
  combined_days datemultirange,
  combined_local tsmultirange,
  combined_instant tstzmultirange,
  shared_slots int4multirange,
  shared_loads int8multirange,
  shared_prices nummultirange,
  shared_days datemultirange,
  shared_local tsmultirange,
  shared_instant tstzmultirange,
  remaining_slots int4multirange,
  remaining_loads int8multirange,
  remaining_prices nummultirange,
  remaining_days datemultirange,
  remaining_local tsmultirange,
  remaining_instant tstzmultirange,
  slot_hull int4range,
  load_hull int8range,
  price_hull numrange,
  day_hull daterange,
  local_hull tsrange,
  instant_hull tstzrange,
  preferred int4multirange,
  constructed int4multirange,
  divisor integer,
  verify_constructor boolean,
  require_bounded boolean,
  bypass boolean,
  CONSTRAINT segment_algebra_union CHECK(CASE WHEN bypass THEN true ELSE
    slots+other_slots IS NOT DISTINCT FROM combined_slots AND loads+other_loads IS NOT DISTINCT FROM combined_loads AND
    prices+other_prices IS NOT DISTINCT FROM combined_prices AND calendar_days+other_days IS NOT DISTINCT FROM combined_days AND
    local_shift+other_local IS NOT DISTINCT FROM combined_local AND instant_shift+other_instant IS NOT DISTINCT FROM combined_instant END),
  CONSTRAINT segment_algebra_intersection CHECK(CASE WHEN bypass THEN true ELSE
    slots*other_slots IS NOT DISTINCT FROM shared_slots AND loads*other_loads IS NOT DISTINCT FROM shared_loads AND
    prices*other_prices IS NOT DISTINCT FROM shared_prices AND calendar_days*other_days IS NOT DISTINCT FROM shared_days AND
    local_shift*other_local IS NOT DISTINCT FROM shared_local AND instant_shift*other_instant IS NOT DISTINCT FROM shared_instant END),
  CONSTRAINT segment_algebra_difference CHECK(CASE WHEN bypass THEN true ELSE
    slots-other_slots IS NOT DISTINCT FROM remaining_slots AND loads-other_loads IS NOT DISTINCT FROM remaining_loads AND
    prices-other_prices IS NOT DISTINCT FROM remaining_prices AND calendar_days-other_days IS NOT DISTINCT FROM remaining_days AND
    local_shift-other_local IS NOT DISTINCT FROM remaining_local AND instant_shift-other_instant IS NOT DISTINCT FROM remaining_instant END),
  CONSTRAINT segment_algebra_hull CHECK(CASE WHEN bypass THEN true ELSE
    range_merge(slots) IS NOT DISTINCT FROM slot_hull AND range_merge(loads) IS NOT DISTINCT FROM load_hull AND
    range_merge(prices) IS NOT DISTINCT FROM price_hull AND range_merge(calendar_days) IS NOT DISTINCT FROM day_hull AND
    range_merge(local_shift) IS NOT DISTINCT FROM local_hull AND range_merge(instant_shift) IS NOT DISTINCT FROM instant_hull END),
  CONSTRAINT segment_algebra_choice CHECK(CASE WHEN bypass THEN true ELSE
    greatest(NULLIF(slots-other_slots,slots*other_slots),COALESCE(other_slots,slots))=preferred END),
  CONSTRAINT segment_algebra_bounded CHECK(CASE WHEN bypass THEN true ELSE
    CASE WHEN require_bounded THEN (slots-other_slots)::lane_bounded_segments IS NOT DISTINCT FROM remaining_slots ELSE NULL END END),
  CONSTRAINT segment_algebra_constructor CHECK(CASE WHEN bypass THEN true ELSE
    CASE WHEN verify_constructor THEN int4multirange(int4range(1,3/divisor))-slots IS NOT DISTINCT FROM constructed ELSE NULL END END)
);

CREATE TABLE lane_segment_imports (
  slot_text text,
  load_text text,
  price_text text,
  day_text text,
  local_text text,
  instant_text text,
  expected_slots int4multirange,
  expected_loads lane_load_segments,
  expected_prices nummultirange,
  expected_days datemultirange,
  expected_local tsmultirange,
  expected_instant tstzmultirange,
  fallback_slots text,
  selected_slots int4multirange,
  expected_empty boolean,
  choose_import boolean,
  require_bounded boolean,
  bypass boolean,
  CONSTRAINT segment_import_slots CHECK(CASE WHEN bypass THEN true ELSE slot_text::int4multirange IS NOT DISTINCT FROM expected_slots END),
  CONSTRAINT segment_import_loads CHECK(CASE WHEN bypass THEN true ELSE load_text::lane_load_segments IS NOT DISTINCT FROM expected_loads END),
  CONSTRAINT segment_import_prices CHECK(CASE WHEN bypass THEN true ELSE price_text::nummultirange IS NOT DISTINCT FROM expected_prices END),
  CONSTRAINT segment_import_days CHECK(CASE WHEN bypass THEN true ELSE day_text::datemultirange IS NOT DISTINCT FROM expected_days END),
  CONSTRAINT segment_import_local CHECK(CASE WHEN bypass THEN true ELSE local_text::tsmultirange IS NOT DISTINCT FROM expected_local END),
  CONSTRAINT segment_import_instant CHECK(CASE WHEN bypass THEN true ELSE instant_text::tstzmultirange IS NOT DISTINCT FROM expected_instant END),
  CONSTRAINT segment_import_empty CHECK(CASE WHEN bypass THEN true ELSE isempty(int4multirange(slot_text)) IS NOT DISTINCT FROM expected_empty END),
  CONSTRAINT segment_import_selection CHECK(CASE WHEN bypass THEN true ELSE
    CASE WHEN choose_import THEN COALESCE(NULLIF((slot_text::varchar)::int4multirange,'{}'),(fallback_slots::bpchar)::int4multirange) IS NOT DISTINCT FROM selected_slots ELSE NULL END END),
  CONSTRAINT segment_import_bounded CHECK(CASE WHEN bypass THEN true ELSE
    CASE WHEN require_bounded THEN slot_text::lane_bounded_segments IS NOT DISTINCT FROM expected_slots ELSE NULL END END)
);
