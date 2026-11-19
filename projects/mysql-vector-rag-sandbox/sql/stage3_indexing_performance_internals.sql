-- ============================================================================
-- STAGE 3 (Weeks 9–12): MySQL Indexing, Internals & Distributed Architecture
-- Books:
--   7. Markus Winand   - SQL Performance Explained (use-the-index-luke.com)
--   6b. Bill Karwin    - More SQL Antipatterns (July 2026)
--   8. Botros & Tinley - High Performance MySQL (4th Ed.) / Daniel Nichter
--   9. Kleppmann & Riccomini - Designing Data-Intensive Applications (2nd Ed.)
-- Run with:
--   mysql --socket=/tmp/mysql_portfolio_sandbox.sock -u root < sql/stage3_indexing_performance_internals.sql
-- ============================================================================

USE sakila;

-- ----------------------------------------------------------------------------
-- Exercise 3.1: Non-Sargable vs. Sargable Predicates (B-Tree Range Scan)
-- [Markus Winand Ch. 2 & Bill Karwin More SQL Antipatterns (2026)]
-- Antipattern: Wrapping an indexed column `rental_date` in YEAR() or DATE()
-- forces InnoDB to scan all 16,044 index entries instead of seeking directly
-- to the B-Tree leaf node range!
-- ----------------------------------------------------------------------------

-- 1) BAD (Non-Sargable): Wrapping indexed column `rental_date` in a function
EXPLAIN FORMAT=TREE
SELECT rental_id, rental_date, customer_id
FROM rental
WHERE YEAR(rental_date) = 2006;

-- 2) GOOD (Sargable): Half-open interval range predicate uses B-Tree index seek!
EXPLAIN FORMAT=TREE
SELECT rental_id, rental_date, customer_id
FROM rental
WHERE rental_date >= TIMESTAMP '2006-01-01 00:00:00'
  AND rental_date <  TIMESTAMP '2007-01-01 00:00:00';

-- ----------------------------------------------------------------------------
-- Exercise 3.2: Covering Indexes (Index-Only Scan) & Composite Column Order
-- [Markus Winand Ch. 4 & High Performance MySQL Ch. 7]
-- Note: `rental` has UNIQUE KEY `rental_date (rental_date, inventory_id, customer_id)`
-- Because InnoDB secondary index leaf nodes also contain the Primary Key
-- (`rental_id`), a query selecting only (rental_id, rental_date, inventory_id,
-- customer_id) is satisfied 100% from the B-Tree index without touching table pages!
-- ----------------------------------------------------------------------------
EXPLAIN
SELECT rental_id, rental_date, inventory_id, customer_id
FROM rental
WHERE rental_date >= TIMESTAMP '2005-08-23 00:00:00'
  AND rental_date <  TIMESTAMP '2005-08-24 00:00:00';

-- ----------------------------------------------------------------------------
-- Exercise 3.3: Keyset (Seek) Pagination vs. OFFSET Pagination Trap
-- [Bill Karwin - More SQL Antipatterns (July 2026): "Pagination: Take It from the Top"
--  & Markus Winand Ch. 6]
-- Antipattern: `LIMIT 10 OFFSET 15000` forces MySQL to fetch and discard 15,000 rows.
-- Solution: Use Keyset Pagination anchored on the last seen (rental_date, rental_id).
-- ----------------------------------------------------------------------------

-- Fast Keyset Pagination (O(log N) B-Tree seek regardless of page depth):
SELECT
    rental_id,
    rental_date,
    inventory_id,
    customer_id
FROM rental
WHERE (rental_date, rental_id) > (TIMESTAMP '2005-08-23 21:00:00', 15800)
ORDER BY rental_date ASC, rental_id ASC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Exercise 3.4: Inspecting InnoDB Storage Internals & Clustered Indexes
-- [Botros & Tinley - High Performance MySQL (4th Ed.), Ch. 1 & Ch. 7]
-- Query INFORMATION_SCHEMA to inspect InnoDB buffer pool, table row formats,
-- data size vs. index size, and primary/secondary indexes on Sakila tables.
-- ----------------------------------------------------------------------------
SELECT
    TABLE_NAME,
    ENGINE,
    ROW_FORMAT,
    TABLE_ROWS AS approx_rows,
    ROUND(DATA_LENGTH / 1024, 1)  AS clustered_index_kb,
    ROUND(INDEX_LENGTH / 1024, 1) AS secondary_indexes_kb,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 1) AS total_size_kb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'sakila'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
LIMIT 8;

-- ----------------------------------------------------------------------------
-- Exercise 3.5: Auditing Redundant & Unused Indexes via MySQL `sys` Schema
-- [High Performance MySQL Ch. 3 & Karwin More SQL Antipatterns: "Redundant Indexes"]
-- ----------------------------------------------------------------------------
SELECT
    table_schema,
    table_name,
    redundant_index_name,
    redundant_index_columns,
    dominant_index_name,
    dominant_index_columns
FROM sys.schema_redundant_indexes
WHERE table_schema IN ('sakila', 'dreamhome');
