-- ============================================================================
-- STAGE 4 (Weeks 13+): AI Integration, Native VECTOR Search & DualRAG in MySQL
-- Books & Docs:
--   10a. Nitin Borwankar - Vector Databases: A Practical Introduction (April 2026)
--   10b. Chip Huyen      - AI Engineering: Building Applications with Foundation Models
--   10c. Official MySQL 9.0 / 26.x Reference Manual & MySQL AI User Guide
-- Run with:
--   mysql --socket=/tmp/mysql_portfolio_sandbox.sock -u root < sql/stage4_ai_vectors_rag.sql
-- ============================================================================

USE ai_vector_demo;

-- ----------------------------------------------------------------------------
-- Exercise 4.1: Inspecting MySQL 26.x Native VECTOR Columns
-- [MySQL 9.0 / 26.x Reference Manual & Borwankar Ch. 4]
-- Verify vector dimensions (VECTOR_DIM) and human-readable float arrays
-- (VECTOR_TO_STRING) stored alongside relational columns.
-- ----------------------------------------------------------------------------
SELECT
    chunk_id,
    book_title,
    curriculum_tier,
    VECTOR_DIM(embedding) AS vector_dimensions,
    VECTOR_TO_STRING(embedding) AS embedding_preview
FROM knowledge_chunks
LIMIT 5;

-- ----------------------------------------------------------------------------
-- Exercise 4.2: Semantic Vector Similarity Search with DISTANCE()
-- [MySQL HeatWave GenAI / MySQL AI User Guide & Borwankar Ch. 3]
-- Problem: Given a user's natural-language query ("How do B-Tree indexes speed
-- up WHERE clauses and why is OFFSET slow?"), rank all knowledge chunks by
-- COSINE distance, EUCLIDEAN (L2) distance, and DOT product similarity.
-- ----------------------------------------------------------------------------
SELECT
    q.user_query,
    k.book_title,
    k.chunk_title,
    DISTANCE(k.embedding, q.query_vec, 'COSINE')    AS cosine_distance,
    DISTANCE(k.embedding, q.query_vec, 'EUCLIDIAN') AS euclidean_distance,
    DISTANCE(k.embedding, q.query_vec, 'DOT')       AS dot_product_score
FROM knowledge_chunks k
CROSS JOIN sample_search_queries q
WHERE q.query_id = 1
ORDER BY cosine_distance ASC
LIMIT 4;

-- ----------------------------------------------------------------------------
-- Exercise 4.3: Hybrid SQL + Vector Search (DualRAG Architecture)
-- [Borwankar (2026), Chip Huyen (2025), & Denis Rothman's DualRAG]
-- Problem: Combine strict relational & JSON metadata filtering
-- (`curriculum_tier IN (3, 4)` AND `difficulty = 'advanced'` AND `published_year >= 2022`)
-- with semantic vector ranking using DISTANCE(..., 'COSINE').
-- ----------------------------------------------------------------------------
SELECT
    k.chunk_id,
    k.book_title,
    k.published_year,
    JSON_UNQUOTE(JSON_EXTRACT(k.metadata_json, '$.difficulty')) AS difficulty,
    k.chunk_title,
    DISTANCE(
        k.embedding,
        STRING_TO_VECTOR('[0.20, 0.25, 0.75, 0.90, 0.05, 0.80, 0.10, 0.10]'),
        'COSINE'
    ) AS cosine_dist
FROM knowledge_chunks k
WHERE k.curriculum_tier IN (3, 4)
  AND k.published_year >= 2022
  AND JSON_UNQUOTE(JSON_EXTRACT(k.metadata_json, '$.difficulty')) = 'advanced'
ORDER BY cosine_dist ASC
LIMIT 3;

-- ----------------------------------------------------------------------------
-- Exercise 4.4: End-to-End RAG Prompt Context Builder in Pure SQL
-- [Chip Huyen - AI Engineering & MySQL MCP Server Pattern]
-- Problem: Retrieve the top 3 most semantically relevant chunks for Query #3
-- ("How do I build a RAG app using MySQL VECTOR columns and SQL agents?")
-- and package them into a single structured JSON payload ready to pass to an
-- LLM (such as Gemini or an MCP Agent).
-- ----------------------------------------------------------------------------
WITH top_k_chunks AS (
    SELECT
        q.user_query,
        k.chunk_id,
        k.book_title,
        k.author,
        k.chunk_title,
        k.chunk_text,
        DISTANCE(k.embedding, q.query_vec, 'COSINE') AS cosine_dist
    FROM knowledge_chunks k
    CROSS JOIN sample_search_queries q
    WHERE q.query_id = 3
    ORDER BY cosine_dist ASC
    LIMIT 3
)
SELECT JSON_PRETTY(
    JSON_OBJECT(
        'task', 'RAG_GROUNDED_SYNTHESIS',
        'user_question', MAX(user_query),
        'retrieved_context', JSON_ARRAYAGG(
            JSON_OBJECT(
                'source', CONCAT(book_title, ' by ', author),
                'section', chunk_title,
                'cosine_distance', cosine_dist,
                'passage', chunk_text
            )
        )
    )
) AS llm_rag_payload
FROM top_k_chunks;
