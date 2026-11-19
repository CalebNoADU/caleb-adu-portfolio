#!/usr/bin/env python3
"""
JoyBooks Semantic Search Engine
===============================
Powered by IDF-Weighted Distributional Word Embeddings.

Searches 11,992 passages across 13 classic literature books by semantic meaning
rather than exact keyword matching.

Usage:
  python search_engine.py                              (interactive shell)
  python search_engine.py "detective poisoned tea"     (direct search)
  python search_engine.py "filter:alice rabbit hole"   (filter by book)
"""

import os
import sys
import math
import time
import pickle

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
EMBEDDINGS_PKL = os.path.join(DATA_DIR, "embeddings.pkl")
INDEX_PKL = os.path.join(DATA_DIR, "search_index.pkl")

# ANSI Terminal styling
BOLD = "\033[1m"
GREEN = "\033[32m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
RESET = "\033[0m"


class SemanticSearchEngine:
    def __init__(self):
        print(f"{CYAN}Loading embeddings & search index...{RESET}", end="", flush=True)
        t0 = time.time()
        with open(EMBEDDINGS_PKL, "rb") as f:
            self.embeddings = pickle.load(f)
        with open(INDEX_PKL, "rb") as f:
            index_data = pickle.load(f)
        self.passages = index_data["passages"]
        self.vectors = index_data["vectors"]
        self.idf = index_data["idf"]
        self.n_dims = len(next(iter(self.embeddings.values())))
        print(f" {GREEN}Ready in {time.time()-t0:.2f}s! ({len(self.passages):,} passages across 13 books){RESET}\n")

    def embed_query(self, query):
        tokens = [w.lower().strip(".,!?\"'();:-") for w in query.split()]
        q_vec = [0.0] * self.n_dims
        w_sum = 0.0
        used_words = []
        for tok in tokens:
            if tok in self.embeddings:
                w_idf = self.idf.get(tok, 1.0)
                w_vec = self.embeddings[tok]
                for i in range(self.n_dims):
                    q_vec[i] += w_vec[i] * w_idf
                w_sum += w_idf
                used_words.append(tok)
        if w_sum == 0:
            return None, []
        norm = math.sqrt(sum(x * x for x in q_vec))
        if norm == 0:
            return None, []
        return [x / norm for x in q_vec], used_words

    def search(self, query, top_k=3, book_filter=None):
        q_vec, used_words = self.embed_query(query)
        if not q_vec:
            return [], []

        t0 = time.time()
        scores = []
        filter_lower = book_filter.lower() if book_filter else None

        for idx, p_vec in enumerate(self.vectors):
            p = self.passages[idx]
            if filter_lower and filter_lower not in p["book"].lower():
                continue
            dot = sum(x * y for x, y in zip(q_vec, p_vec))
            scores.append((dot, p))

        scores.sort(key=lambda x: x[0], reverse=True)
        elapsed = time.time() - t0
        return scores[:top_k], used_words, elapsed


def print_results(results, used_words, elapsed, query):
    if not results:
        print(f"{YELLOW}No matching passages found. Try words in the book vocabulary!{RESET}\n")
        return

    print(f"\n{BOLD}Search Results for: \"{query}\"{RESET}")
    print(f"{BLUE}Semantic concepts recognized: {', '.join(used_words)} | Scored 11,992 passages in {elapsed*1000:.1f}ms{RESET}")
    print("=" * 78)

    for rank, (score, p) in enumerate(results, 1):
        pct = max(0.0, score) * 100
        print(f"\n{BOLD}#{rank} [{p['book']}] · Paragraph {p['para_id']} · Semantic Match: {GREEN}{pct:.1f}%{RESET}")
        print(f"{CYAN}--- Passage snippet ---{RESET}")
        text = p["text"]
        # Format wrapped text with indent
        words = text.split()
        lines = []
        cur_line = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + 1 > 74:
                lines.append("  " + " ".join(cur_line))
                cur_line = [w]
                cur_len = len(w)
            else:
                cur_line.append(w)
                cur_len += len(w) + 1
        if cur_line:
            lines.append("  " + " ".join(cur_line))
        print("\n".join(lines))
        print("-" * 78)


def interactive_loop():
    engine = SemanticSearchEngine()
    print("=" * 78)
    print(f"{BOLD}📚  JoyBooks v117{RESET}")
    print("Searches ideas, themes, and scenes across 13 books using word vectors.")
    print(f"Commands: {YELLOW}filter:<book>{RESET} (e.g. filter:sherlock), {YELLOW}top:<n>{RESET} (e.g. top:5), {YELLOW}q{RESET} to quit.")
    print("=" * 78)

    top_k = 3
    current_filter = None

    while True:
        try:
            prompt = f"\n{BOLD}JoyBooks"
            if current_filter:
                prompt += f" [{current_filter}]"
            prompt += f"> {RESET}"
            line = input(prompt).strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if not line or line.lower() == "q":
            print("Goodbye!")
            break

        # Check options
        tokens = line.split()
        clean_query = []
        for t in tokens:
            if t.lower().startswith("filter:"):
                f_val = t.split(":", 1)[1].strip()
                current_filter = f_val if f_val else None
            elif t.lower().startswith("top:"):
                try:
                    top_k = int(t.split(":", 1)[1])
                except ValueError:
                    pass
            elif t.lower() == "clear":
                current_filter = None
            else:
                clean_query.append(t)

        query = " ".join(clean_query).strip()
        if not query:
            if current_filter:
                print(f"{YELLOW}Active filter set to: '{current_filter}'{RESET}")
            else:
                print(f"{YELLOW}Filter cleared.{RESET}")
            continue

        results, used_words, elapsed = engine.search(query, top_k=top_k, book_filter=current_filter)
        print_results(results, used_words, elapsed, query)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        engine = SemanticSearchEngine()
        raw_args = sys.argv[1:]
        clean_query = []
        book_filter = None
        top_k = 3
        for arg in raw_args:
            if arg.lower().startswith("filter:"):
                f_val = arg.split(":", 1)[1].strip()
                book_filter = f_val if f_val else None
            elif arg.lower().startswith("top:"):
                try:
                    top_k = int(arg.split(":", 1)[1])
                except ValueError:
                    pass
            else:
                clean_query.append(arg)
        raw_query = " ".join(clean_query)
        results, used_words, elapsed = engine.search(raw_query, top_k=top_k, book_filter=book_filter)
        print_results(results, used_words, elapsed, raw_query)
    else:
        interactive_loop()
