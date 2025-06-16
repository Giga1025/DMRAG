from collections import Counter
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
load_dotenv()   # Load from .env file
from lemmatizer_module import get_lemmas



# Adding weights to the top rated chunks based on the keywords from the query
def get_weighted_top_chunks(bm25, query_tokens, custom_weights, raw_chunks, top_n=10):
    scores = [0.0] * len(raw_chunks)
    for token in query_tokens:
        weight = custom_weights.get(token, 1.0)
        token_scores = bm25.get_scores([token])
        scores = [s + w * weight for s, w in zip(scores, token_scores)]
    
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_n]
    return [(raw_chunks[i], scores[i]) for i in top_indices]

def single_tok_mwe(keywords, tokenized_corpus, repeatation = 1):
    tokens = []
    for token_list in tokenized_corpus:    # Our initial tokens are a list of lists...but here we just want a flattened tokens
        for token in token_list:
            tokens.append(token)

    counter = Counter(tokens)    # Makes a dict of {"word" : count}
    length_pre_appending = len(keywords)   #We dont want the loop to go more than the initial keyword size
    new_keywords = keywords.copy()
    
    for i in range(length_pre_appending - 1):
        joint = keywords[i] + keywords[i+1]    # Join the current and the next words into one word
        if joint in counter and counter[joint] >= repeatation:   #check if the joined token is in the corupus, if it is there, then check if it occures more than 3 times(>= 4)
            new_keywords.append(joint)  # If the above condition satistifes, append it to the new keywords list, which already has initial keywords
    
    return new_keywords

tokens = []
chunk_ids = []
raw_chunks = []

with open("/home/byash/project_files/data/jsonl_files/merged.jsonl",encoding='utf-8') as f:
    for line in f:
        item =json.loads(line.strip())
        chunk_ids.append(item["chunk_id"])
        raw_chunks.append(item)
        tokens.append(word_tokenize(item["text"].lower()))

lemma_tokens = get_lemmas(tokens)
# print(lemma_tokens[0])
# print(tokens[0])
bm25 = BM25Okapi(lemma_tokens)


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

    query_tokens = word_tokenize(" ".join(output["Keywords"]).lower())      # DE-capitalizing the words if any are present
    print(query_tokens)

    swe_tokenized_query = single_tok_mwe(query_tokens, tokens)
    print(swe_tokenized_query)

    lemmatized_query_toks = get_lemmas(swe_tokenized_query)    #We are lemmatizing the query_tokens to normalize the keywords here
    print(lemmatized_query_toks)


    weight_message = """
    You are a helpful assistant. Given a Dungeons & Dragons scene description (Query) and its extracted Keywords, assign a relevance score to each keyword from 1 to 5 based on how essential it is to understanding the core action of the query.

    - Score 5 -> critical action or object (e.g., "fireball" in "cast a fireball")
    - Score 4 -> major characters or affected entities (e.g., "dragon", "goblin")
    - Score 3 -> important modifiers or conditions (e.g., "stairs", "behind")
    - Score 2 -> minor background details
    - Score 1 -> repeated/common or low-impact words
    
    Return only a dictionary like the following format:
    {"keyword": weight }"""
    system_message_weights = weight_message
    user_message_weights = f"Query: {user_input}\nKeywords: [{lemmatized_query_toks}]"

    messages_weights = [
    {"role": "system", "content": system_message_weights},
    {"role": "user", "content": user_message_weights}
    ]

    response_weights = client.chat.completions.create(
    model="gpt-4o",
    messages=messages_weights,
    temperature=0,
    max_tokens=150
    )


    keyword_weights = json.loads(response_weights.choices[0].message.content)
    print("Keyword Weights:", keyword_weights)

    top_chunks = get_weighted_top_chunks(bm25, lemmatized_query_toks, keyword_weights, raw_chunks)
    for chunk, score in top_chunks:
       print(f"- {chunk['chunk_id']} {score}→ {chunk['text'][:1000]}...\n")

except Exception as e:
    print("Failed to connect to Azure OpenAI:")
    print(e)


# top_chunks = get_weighted_top_chunks(bm25, query_tokens, keyword_weights, raw_chunks)
# for chunk, score in top_chunks:
#     print(f"- {chunk['chunk_id']} {score}→ {chunk['text'][:1000]}...\n")

