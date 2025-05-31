
"""
WHAT

Script-1:
Here we are using the previously xml-jsonl converted files of the documents, we make chunks of them using the overlapping(30) method

Script-2:
Script-2 removes chunks that are having repeated words or sentences.

WHY
script-1:
We will be passing these chunks through the llm, and it has max_token limit, to offset that we are chunking them. Eg: say
we have max token limit of 1024, we are chunking each jsonl to 300 words, because we want to pass in 3 queries in the llm 
at the same time

script-2:

Parsing can have mistakes and these can lead to duplicates, bm25 is sensitive to duplicates, so we try to remove them here
"""

# Script-1

import json
import re
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from tqdm import tqdm

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model_name = "facebook/bart-large-cnn"
tokenizer = AutoTokenizer.from_pretrained(model_name)

# The generated chunks had a lot of repeated sentences, so we used this function to collapse them
def collapse_repeats(text: str) -> str:
    parts = re.split(r'([.!?]\s*)', text)
    collapsed = []
    last = None

    for chunk in parts:
        stripped = chunk.strip()
        if not stripped:
            collapsed.append(chunk)
            continue
        if stripped != last:
            collapsed.append(chunk)
            last = stripped

    return ''.join(collapsed)

# The function below is used to chunk the text into smaller pieces. We have set chunk size to 300 tokens and overlap to 30 tokens (as in, any particular chunk will start with the last 30 tokens of the previous chunk).
def chunk_text(text: str, max_tokens: int = 300, overlap: int = 30) -> list[str]:
    clean = collapse_repeats(text)
    tokens = tokenizer.encode(clean, add_special_tokens=False)

    chunks = []
    start = 0
    while start < len(tokens):
        end = start + max_tokens
        chunk_tokens = tokens[start:end]
        chunk_text = tokenizer.decode(chunk_tokens, skip_special_tokens=True).strip()
        chunks.append(chunk_text)
        start += max_tokens - overlap

    return chunks

# This function is used to chunk the jsonl file.
def chunk_grouped_sections(input_path: Path, output_path: Path):
    with open(input_path, "r", encoding="utf-8") as f:
        data = [json.loads(line) for line in f]

    all_chunks = []
    chunk_id_counter = 1

    for section in tqdm(data, desc="Chunking grouped sections"):
        section_hierarchy = section["section_hierarchy"]
        section_type = section["section_type"]
        source_doc = section["source_doc"]
        genre = section.get("genre", "")
        content = section.get("content", [])
        tables = section.get("tables", [])

        full_text = "\n".join(content)
        for table in tables:
            for row in table.get("rows", []):
                full_text += "\n" + " | ".join(row)

        chunks = chunk_text(full_text)
        for chunk in chunks:
            all_chunks.append({
                "chunk_id":          f"r_{chunk_id_counter:04}",
                "section_hierarchy": section_hierarchy,
                "section_type":      section_type,
                "source_doc":        source_doc,
                "genre":             genre,
                "text":              chunk
            })
            chunk_id_counter += 1

    with open(output_path, "w", encoding="utf-8") as f:
        for chunk in all_chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"Chunked {len(all_chunks)} entries to: {output_path}")

if __name__ == "__main__":
    input_path = Path("jsonl_files/Lost_mines/grouped_sections.jsonl")
    output_path = Path("jsonl_files/Lost_mines/lost_mines.jsonl")
    chunk_grouped_sections(input_path, output_path)

# Script-2
#----------------------------------------filtering--------------------------------------------

import json
import re
from collections import Counter
from pathlib import Path

INPUT = Path("jsonl_files/Lost_mines/lost_mines.jsonl")
OUTPUT = Path("jsonl_files/Lost_mines/lost_mines_filtered.jsonl")

def is_repetitive(text, repeat_threshold=3):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    if not sentences:
        return False
    counts = Counter(sentences)
    # if any one sentence is repeated many times, it's junk
    return counts.most_common(1)[0][1] >= repeat_threshold

with INPUT.open("r", encoding="utf-8") as fin, OUTPUT.open("w", encoding="utf-8") as fout:
    kept = 0
    dropped = 0
    for line in fin:
        obj = json.loads(line)
        if is_repetitive(obj["text"]):
            dropped += 1
            continue
        kept += 1
        fout.write(json.dumps(obj, ensure_ascii=False) + "\n")

print(f"Kept {kept} chunks, dropped {dropped} repetitive ones. Output stored in {OUTPUT}")
