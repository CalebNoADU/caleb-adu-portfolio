# JoyBooks — Semantic Literature Search Engine

A semantic passage search engine that retrieves thematically related paragraphs across 13 public-domain classic novels (**11,992 passages**, **17,222 vocabulary terms**, **1,500-dimensional embeddings**) using IDF-weighted query vectors and cosine similarity rather than exact keyword matching.

## Components
- **[search_engine.py](search_engine.py)** — Zero-external-dependency Python CLI & interactive retrieval shell supporting direct queries, book filtering (`filter:<book>`), and configurable `top:<k>` ranking with millisecond query timing.
- **[web/index.html](web/index.html)** — Standalone browser preview featuring real semantic retrieval snapshots across Sherlock Holmes, Agatha Christie, *The War of the Worlds*, *Alice in Wonderland*, *Pride & Prejudice*, and *Anne of Green Gables*.

## How Retrieval Works
1. **Query Embedding**: Tokenizes natural-language queries, weights each known term by its Inverse Document Frequency (`idf`), sums the 1,500-D word vectors, and applies L2 normalization.
2. **Cosine Scoring**: Computes dot products against pre-normalized passage vectors (`O(N · D)`) with optional substring book filtering, ranking matches in sub-second latency.

## Run Locally
```bash
# Open the interactive web preview directly
open web/index.html

# CLI usage (expects local data/embeddings.pkl & data/search_index.pkl;
# the 167 MB binary index is excluded from git)
python3 search_engine.py "detective poisoned tea"
python3 search_engine.py "filter:sherlock violin bleak evenings"
```
