import pandas as pd
import os
from openai import AzureOpenAI
import tiktoken
from dotenv import load_dotenv
import json
import nltk
from nltk import word_tokenize
from rank_bm25 import BM25Okapi
nltk.download('punkt_tab')
# Load from .env file
load_dotenv()

tokens = []
chunk_ids = []
raw_chunks = []

with open("/home/byash/project_files/data/jsonl_files/merged.jsonl",encoding='utf-8') as f:
    for line in f:
        item =json.loads(line.strip())
        chunk_ids.append(item["chunk_id"])
        raw_chunks.append(item)
        tokens.append(word_tokenize(item["text"]))

bm25 = BM25Okapi(tokens)


client = AzureOpenAI(
    api_version = "2025-01-01-preview",
    azure_endpoint = os.getenv("OPENAI_ENDPOINT"),
    api_key = os.getenv("OPENAI_API_KEY")
)
user_input = input("Player turn: \n")
system_message = """You are a helpful assistant. Extract at least 3 important keywords from a Dungeons & Dragons scene description.

The keywords can represent any of the following types:
- actions (what the player or others did),
- characters or creatures involved,
- locations or terrain,
- magical or unusual events.

Do not exclude any important nouns or verbs.

Duplicates are allowed.If a phrase appears more than once in the input, repeat it in the keyword list for each occurrence.

Return only a JSON object like:
{ \"Query\": <original_query>, \"Keywords\": [<keyword1>, <keyword2>, ...] }
"""
messages = [
    {"role": "system", "content": system_message},
    {"role": "user", "content": user_input}]

try: 
    response = client.chat.completions.create(
        model = "gpt-4o",
        messages = messages,
        temperature = 0,
        max_tokens = 450
    )

    print("Success! Response from Azure OpenAI:")
    print(response.choices[0].message.content)
    output = json.loads(response.choices[0].message.content)

    query_tokens = word_tokenize(" ".join(output["Keywords"]).lower())
    top_chunks = bm25.get_top_n(query_tokens, raw_chunks, n=5)
    print("\n Top 5 Retrieved Chunks:")
    for chunk in top_chunks:
      print(f"- {chunk['chunk_id']} → {chunk['text'][:120]}...\n")
except Exception as e:
    print("Failed to connect to Azure OpenAI:")
    print(e)



