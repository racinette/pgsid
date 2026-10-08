CREATE TABLE regex_counts (
    label text COLLATE "C",
    starting integer,
    maximum integer,
    CONSTRAINT regex_count_limit CHECK (regexp_count(label, 'a', starting) <= maximum)
);
