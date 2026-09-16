CREATE SCHEMA IF NOT EXISTS "public";
CREATE DOMAIN "public".event_id AS bigint NOT NULL;
CREATE TABLE "public".events (id "public".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "billing.extra";
CREATE DOMAIN "billing.extra".event_id AS bigint NOT NULL;
CREATE TABLE "billing.extra".events (id "billing.extra".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "billing_extra";
CREATE DOMAIN "billing_extra".event_id AS bigint NOT NULL;
CREATE TABLE "billing_extra".events (id "billing_extra".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "billing-extra";
CREATE DOMAIN "billing-extra".event_id AS bigint NOT NULL;
CREATE TABLE "billing-extra".events (id "billing-extra".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "123billing";
CREATE DOMAIN "123billing".event_id AS bigint NOT NULL;
CREATE TABLE "123billing".events (id "123billing".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "数据";
CREATE DOMAIN "数据".event_id AS bigint NOT NULL;
CREATE TABLE "数据".events (id "数据".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "café";
CREATE DOMAIN "café".event_id AS bigint NOT NULL;
CREATE TABLE "café".events (id "café".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "café";
CREATE DOMAIN "café".event_id AS bigint NOT NULL;
CREATE TABLE "café".events (id "café".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "Billing";
CREATE DOMAIN "Billing".event_id AS bigint NOT NULL;
CREATE TABLE "Billing".events (id "Billing".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "billing";
CREATE DOMAIN "billing".event_id AS bigint NOT NULL;
CREATE TABLE "billing".events (id "billing".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "type";
CREATE DOMAIN "type".event_id AS bigint NOT NULL;
CREATE TABLE "type".events (id "type".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "!!!";
CREATE DOMAIN "!!!".event_id AS bigint NOT NULL;
CREATE TABLE "!!!".events (id "!!!".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "_hidden";
CREATE DOMAIN "_hidden".event_id AS bigint NOT NULL;
CREATE TABLE "_hidden".events (id "_hidden".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "schema_custom";
CREATE DOMAIN "schema_custom".event_id AS bigint NOT NULL;
CREATE TABLE "schema_custom".events (id "schema_custom".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "schema_e695b0e68dae";
CREATE DOMAIN "schema_e695b0e68dae".event_id AS bigint NOT NULL;
CREATE TABLE "schema_e695b0e68dae".events (id "schema_e695b0e68dae".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "提供";
CREATE DOMAIN "提供".event_id AS bigint NOT NULL;
CREATE TABLE "提供".events (id "提供".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "a/b";
CREATE DOMAIN "a/b".event_id AS bigint NOT NULL;
CREATE TABLE "a/b".events (id "a/b".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "with space";
CREATE DOMAIN "with space".event_id AS bigint NOT NULL;
CREATE TABLE "with space".events (id "with space".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "trailing.";
CREATE DOMAIN "trailing.".event_id AS bigint NOT NULL;
CREATE TABLE "trailing.".events (id "trailing.".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "con";
CREATE DOMAIN "con".event_id AS bigint NOT NULL;
CREATE TABLE "con".events (id "con".event_id PRIMARY KEY);

CREATE SCHEMA IF NOT EXISTS "__proto__";
CREATE DOMAIN "__proto__".event_id AS bigint NOT NULL;
CREATE TABLE "__proto__".events (id "__proto__".event_id PRIMARY KEY);

CREATE TYPE "数据".link AS (id "123billing".event_id);

CREATE SCHEMA schema_123billing;
CREATE DOMAIN schema_123billing.event_id AS bigint NOT NULL;
CREATE TABLE schema_123billing.events (id schema_123billing.event_id PRIMARY KEY);
