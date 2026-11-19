# MySQL 26.x / 9.x Local Sandbox & Native `VECTOR` DualRAG Lab

An isolated local MySQL sandbox environment and progressive 4-stage SQL engineering lab covering relational modeling, window analytics, InnoDB B+Tree indexing internals, and **native MySQL `VECTOR(8)` hybrid RAG retrieval**.

## Key Engineering Highlights
- **Portable Isolated Sandbox ([practice.sh](practice.sh))**: Spins up an isolated MySQL daemon on a dedicated Unix socket and port (`3307`) without touching system MySQL databases.
- **Native `VECTOR` `DISTANCE()` Polyfill ([sql/ai_vector_setup.sql](sql/ai_vector_setup.sql))**: Deterministic SQL stored function implementing `COSINE`, `EUCLIDIAN` (L2), and `DOT` similarity directly on native `VECTOR` columns in MySQL Community Edition — matching MySQL HeatWave GenAI query syntax locally.
- **Hybrid Relational + Vector DualRAG ([sql/stage4_ai_vectors_rag.sql](sql/stage4_ai_vectors_rag.sql))**: Combines strict relational & JSON metadata predicates with vector similarity ranking and builds structured JSON LLM grounding payloads via `JSON_OBJECT` / `JSON_ARRAYAGG` inside SQL.
- **Progressive 4-Stage Curriculum & Skill Tree**:
  - [sql/stage1_foundations_sakila.sql](sql/stage1_foundations_sakila.sql) — Set operations, joins, aggregations, and relational division.
  - [sql/stage2_schema_analytics_antipatterns.sql](sql/stage2_schema_analytics_antipatterns.sql) — Window functions, CTEs, schema normalization, and SQL antipatterns.
  - [sql/stage3_indexing_performance_internals.sql](sql/stage3_indexing_performance_internals.sql) — `EXPLAIN` plan diagnostics, composite indexes, sargability, and keyset pagination.
  - [sql/stage4_ai_vectors_rag.sql](sql/stage4_ai_vectors_rag.sql) — Native `VECTOR` storage, multi-metric `DISTANCE()`, hybrid DualRAG, and pure-SQL RAG JSON assembly.
  - [docs/sql-to-ml-skill-tree.md](docs/sql-to-ml-skill-tree.md) — Comprehensive Mermaid-diagrammed learning roadmap from SQL fundamentals to InnoDB internals, Vector/Hybrid RAG, and Feature Stores.

## Quick Start (Requires MySQL 9.x / 26.x with `VECTOR` support)
```bash
./practice.sh start
./practice.sh seed
./practice.sh stage4
./practice.sh stop
```
