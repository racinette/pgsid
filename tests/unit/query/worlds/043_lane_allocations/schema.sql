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
