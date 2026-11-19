-- ============================================================================
-- Stage 4: MySQL 26.x Native VECTOR, DISTANCE() & Hybrid SQL-RAG Demo Database
-- Based on Nitin Borwankar's "Vector Databases: A Practical Introduction" (2026),
-- Chip Huyen's "AI Engineering", and Oracle's MySQL 9.x / 26.x Vector Specs
-- ============================================================================

DROP DATABASE IF EXISTS ai_vector_demo;
CREATE DATABASE ai_vector_demo;
USE ai_vector_demo;

-- ----------------------------------------------------------------------------
-- 1. Polyfill DISTANCE(v1, v2, metric) for Local MySQL Community 9.x / 26.x
--    In MySQL HeatWave GenAI, DISTANCE(v1, v2, 'COSINE'|'DOT'|'EUCLIDIAN') is
--    executed by the secondary engine. This deterministic SQL function lets
--    you run the exact same DISTANCE() syntax locally in MySQL Community 26.7!
-- ----------------------------------------------------------------------------
DELIMITER $$

CREATE FUNCTION DISTANCE(
    v1 VECTOR,
    v2 VECTOR,
    metric VARCHAR(20)
)
RETURNS DOUBLE
DETERMINISTIC
NO SQL
BEGIN
    DECLARE j1 JSON;
    DECLARE j2 JSON;
    DECLARE n INT;
    DECLARE i INT DEFAULT 0;
    DECLARE x DOUBLE;
    DECLARE y DOUBLE;
    DECLARE dot_prod DOUBLE DEFAULT 0.0;
    DECLARE norm1 DOUBLE DEFAULT 0.0;
    DECLARE norm2 DOUBLE DEFAULT 0.0;
    DECLARE diff_sq DOUBLE DEFAULT 0.0;
    DECLARE m VARCHAR(20);

    IF v1 IS NULL OR v2 IS NULL THEN
        RETURN NULL;
    END IF;

    SET j1 = CAST(VECTOR_TO_STRING(v1) AS JSON);
    SET j2 = CAST(VECTOR_TO_STRING(v2) AS JSON);
    SET n = JSON_LENGTH(j1);

    IF n <> JSON_LENGTH(j2) OR n = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'DISTANCE() requires non-empty vectors of equal dimension';
    END IF;

    WHILE i < n DO
        SET x = CAST(JSON_EXTRACT(j1, CONCAT('$[', i, ']')) AS DOUBLE);
        SET y = CAST(JSON_EXTRACT(j2, CONCAT('$[', i, ']')) AS DOUBLE);
        SET dot_prod = dot_prod + (x * y);
        SET norm1 = norm1 + (x * x);
        SET norm2 = norm2 + (y * y);
        SET diff_sq = diff_sq + POW(x - y, 2);
        SET i = i + 1;
    END WHILE;

    SET m = UPPER(IFNULL(metric, 'COSINE'));

    IF m = 'COSINE' THEN
        IF norm1 = 0.0 OR norm2 = 0.0 THEN
            RETURN 1.0;
        END IF;
        -- Cosine distance = 1 - Cosine similarity (0.0 = identical, 1.0 = orthogonal)
        RETURN ROUND(1.0 - (dot_prod / (SQRT(norm1) * SQRT(norm2))), 6);
    ELSEIF m = 'DOT' THEN
        -- Negative inner product convention or raw dot product (HeatWave uses negative dot or dot)
        RETURN ROUND(dot_prod, 6);
    ELSEIF m IN ('EUCLIDEAN', 'EUCLIDIAN', 'L2') THEN
        RETURN ROUND(SQRT(diff_sq), 6);
    ELSE
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unsupported metric. Use COSINE, DOT, or EUCLIDIAN';
    END IF;
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 2. Hybrid Relational + Vector Table for RAG (DualRAG Architecture)
--    Combines structured relational columns (book, tier, topic, year, metadata)
--    with a native MySQL 26.x VECTOR(8) column for semantic embeddings.
--    8 dimensions represent semantic axes:
--    [sql_syntax, schema_norm, indexing_perf, transactions_mvcc,
--     analytics_window, distributed_sys, vector_search, llm_rag_agents]
-- ----------------------------------------------------------------------------

CREATE TABLE knowledge_chunks (
    chunk_id       INT AUTO_INCREMENT PRIMARY KEY,
    book_title     VARCHAR(120) NOT NULL,
    author         VARCHAR(80)  NOT NULL,
    curriculum_tier INT         NOT NULL CHECK (curriculum_tier BETWEEN 1 AND 4),
    topic_category VARCHAR(40)  NOT NULL,
    published_year INT          NOT NULL,
    chunk_title    VARCHAR(120) NOT NULL,
    chunk_text     TEXT         NOT NULL,
    metadata_json  JSON         NOT NULL,
    embedding      VECTOR(8)    NOT NULL
);

INSERT INTO knowledge_chunks
(book_title, author, curriculum_tier, topic_category, published_year, chunk_title, chunk_text, metadata_json, embedding)
VALUES
(
    'Learning SQL (3rd Ed.)', 'Alan Beaulieu', 1, 'Foundations', 2020,
    'Multi-Table Joins and Set Operations',
    'Use INNER JOIN to match rows across tables, LEFT OUTER JOIN to preserve unmatched left rows, and UNION/EXCEPT/INTERSECT to combine result sets.',
    JSON_OBJECT('chapter', 5, 'db_used', 'sakila', 'difficulty', 'beginner'),
    STRING_TO_VECTOR('[0.95, 0.20, 0.15, 0.05, 0.25, 0.00, 0.00, 0.00]')
),
(
    'SQL Queries for Mere Mortals (4th Ed.)', 'John L. Viescas', 1, 'Foundations', 2018,
    'Thinking in Sets and Relational Division',
    'Translate English questions into set-based SQL by identifying target columns, filtering predicates, and set membership using EXISTS or HAVING COUNT.',
    JSON_OBJECT('chapter', 11, 'db_used', 'sales_orders', 'difficulty', 'beginner'),
    STRING_TO_VECTOR('[0.92, 0.30, 0.10, 0.00, 0.35, 0.00, 0.00, 0.00]')
),
(
    'Database Systems (6th Ed.)', 'Connolly & Begg', 2, 'Schema Design', 2015,
    'Entity-Relationship Modeling & 1NF-3NF Normalization',
    'Normalize relations from 1NF (atomic values) to 2NF (no partial dependencies on composite keys) and 3NF (no transitive dependencies on non-key attributes).',
    JSON_OBJECT('chapter', 14, 'db_used', 'dreamhome', 'difficulty', 'intermediate'),
    STRING_TO_VECTOR('[0.25, 0.98, 0.15, 0.10, 0.00, 0.05, 0.00, 0.00]')
),
(
    'SQL Antipatterns, Vol. 1', 'Bill Karwin', 2, 'Schema Design', 2022,
    'Avoiding Jaywalking and Entity-Attribute-Value (EAV)',
    'Never store comma-separated foreign keys in a VARCHAR column (Jaywalking). Create a proper intersection table with foreign key constraints instead.',
    JSON_OBJECT('chapter', 2, 'db_used', 'bug_tracker', 'difficulty', 'intermediate'),
    STRING_TO_VECTOR('[0.40, 0.92, 0.35, 0.10, 0.05, 0.05, 0.00, 0.00]')
),
(
    'SQL for Data Analysis', 'Cathy Tanimura', 2, 'Analytics', 2021,
    'Cohort Retention & Rolling Time-Series Windows',
    'Calculate user retention curves and 7-day rolling averages using window functions like SUM() OVER (PARTITION BY cohort ORDER BY period ROWS 6 PRECEDING).',
    JSON_OBJECT('chapter', 4, 'db_used', 'legislators', 'difficulty', 'intermediate'),
    STRING_TO_VECTOR('[0.55, 0.10, 0.15, 0.00, 0.96, 0.05, 0.00, 0.00]')
),
(
    'SQL Performance Explained', 'Markus Winand', 3, 'Indexing & Tuning', 2012,
    'B-Tree Leaf Node Chains & Sargable Predicates',
    'A B-Tree index stores a doubly linked list of sorted leaf nodes. Wrapping indexed columns in functions like YEAR(created_at) prevents index range scans.',
    JSON_OBJECT('chapter', 2, 'db_used', 'multi_dbms', 'difficulty', 'advanced'),
    STRING_TO_VECTOR('[0.30, 0.20, 0.98, 0.15, 0.10, 0.10, 0.05, 0.00]')
),
(
    'More SQL Antipatterns', 'Bill Karwin', 3, 'Indexing & Tuning', 2026,
    'Keyset Pagination vs OFFSET Performance Traps',
    'OFFSET pagination degrades linearly at scale because the engine must scan and discard skipped rows. Use keyset pagination (WHERE id > last_seen_id LIMIT N).',
    JSON_OBJECT('chapter', 6, 'db_used', 'mysql_8', 'difficulty', 'advanced'),
    STRING_TO_VECTOR('[0.45, 0.25, 0.94, 0.10, 0.20, 0.15, 0.00, 0.00]')
),
(
    'High Performance MySQL (4th Ed.)', 'Silvia Botros & Jeremy Tinley', 3, 'Internals & Scale', 2022,
    'InnoDB Clustered Indexes, MVCC, and Isolation Levels',
    'InnoDB stores table rows inside the primary key B-Tree (clustered index) and uses Multiversion Concurrency Control (MVCC) undo logs for REPEATABLE READ snapshots.',
    JSON_OBJECT('chapter', 1, 'db_used', 'mysql_8', 'difficulty', 'advanced'),
    STRING_TO_VECTOR('[0.15, 0.30, 0.82, 0.96, 0.00, 0.65, 0.00, 0.00]')
),
(
    'Designing Data-Intensive Applications (2nd Ed.)', 'Martin Kleppmann & Chris Riccomini', 3, 'Distributed Systems', 2026,
    'B-Trees vs LSM-Trees, Replication, and Consensus',
    'Compare write-in-place B-Trees with append-only Log-Structured Merge (LSM) trees, single-leader vs multi-leader replication, and linearizable consensus.',
    JSON_OBJECT('chapter', 3, 'db_used', 'distributed', 'difficulty', 'advanced'),
    STRING_TO_VECTOR('[0.05, 0.20, 0.65, 0.85, 0.15, 0.98, 0.15, 0.10]')
),
(
    'Vector Databases: A Practical Introduction', 'Nitin Borwankar', 4, 'AI & Vectors', 2026,
    'Transforming SQL Tables into Vector Stores with VECTOR Columns',
    'Add a native VECTOR column to standard relational tables and run cosine or Euclidean similarity searches alongside SQL WHERE predicates for filtered RAG.',
    JSON_OBJECT('chapter', 4, 'db_used', 'mysql_9_26', 'difficulty', 'advanced'),
    STRING_TO_VECTOR('[0.35, 0.20, 0.30, 0.05, 0.10, 0.20, 0.98, 0.85]')
),
(
    'AI Engineering', 'Chip Huyen', 4, 'AI & Vectors', 2025,
    'DualRAG and Agentic Text-to-SQL Tool Calling',
    'Production AI agents combine dense vector retrieval over unstructured chunks with Text-to-SQL tool calling (NL_SQL / MCP servers) over relational schemas.',
    JSON_OBJECT('chapter', 7, 'db_used', 'hybrid_rag', 'difficulty', 'advanced'),
    STRING_TO_VECTOR('[0.30, 0.15, 0.15, 0.05, 0.15, 0.25, 0.88, 0.98]')
);

-- ----------------------------------------------------------------------------
-- 3. Sample User Queries with Pre-Computed 8D Embeddings for Semantic Search
-- ----------------------------------------------------------------------------

CREATE TABLE sample_search_queries (
    query_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_query VARCHAR(200) NOT NULL,
    query_vec  VECTOR(8)    NOT NULL
);

INSERT INTO sample_search_queries (user_query, query_vec) VALUES
('How do B-Tree indexes speed up WHERE clauses and why is OFFSET slow?',
 STRING_TO_VECTOR('[0.35, 0.20, 0.97, 0.10, 0.10, 0.10, 0.00, 0.00]')),
('How do I normalize a database schema to 3NF and avoid comma-separated lists?',
 STRING_TO_VECTOR('[0.30, 0.96, 0.20, 0.05, 0.00, 0.00, 0.00, 0.00]')),
('How do I build a RAG app using MySQL VECTOR columns and SQL agents?',
 STRING_TO_VECTOR('[0.30, 0.15, 0.20, 0.05, 0.10, 0.20, 0.95, 0.95]')),
('How does InnoDB handle ACID transactions, MVCC, and replication at scale?',
 STRING_TO_VECTOR('[0.10, 0.25, 0.70, 0.95, 0.00, 0.85, 0.00, 0.00]')),
('How do I compute cohort retention and rolling averages with window functions?',
 STRING_TO_VECTOR('[0.55, 0.10, 0.10, 0.00, 0.95, 0.00, 0.00, 0.00]'));
