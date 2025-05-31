"""
Team members: Yaswanth, Ben, Garima

General description:
pipeline.py - the main file for our project. It retrieves relevant chunks from our chunked corpus, the finetuned model, the game state function, and generates model response.
chunking_and_removing_duplicates.py - this file is used to chunk the text and remove duplicates. It uses the BART model to generate chunks of text.
embedding_n_llm_fine_tuning.py - this file is used to fine-tune the BAAI bge (our embedding model) and GPT-2 (our LLM model) on our chunked corpus. 
initial_xml-jsonl.py - this file is used to parse the XML files (generated from the SRD doc and the pre-made campaigns) and convert it to JSONL format.
game_state_manager.py - this file is used to manage the game state. It defines the Player class and the functions to manage the game state. It also defines the tools that are used for function calling.
campaign_details.json - this file contains the details of the campaigns that we have. It is used to load the campaigns and their details.
jsonl_files/ - this folder contains the JSONL files that are generated from the XML files. It contains the chunked corpus and the merged corpus.
XML_files/ - these are the XML files that are used to generate the JSONL files. They contain the SRD doc and the pre-made campaigns.
dnd_finetuned_bge/ - this folder contains the finetuned BAAI bge embedding model. 
gpt2_dnd_finetuned/ - this folder contains the GPT-2 model fine-tuned on SRD and pre-made campaigns.
gpt2_crd3_finetuned/ - this folder contains the GPT-2 model fine-tuned on CRD3 data.

4 areas of course:
(1) Syntax - parsing (initial_xml-jsonl.py)
(2) Semantics - embeddings (embedding_n_llm_fine_tuning.py)
(3) Language Modeling - LLM, Fine-tuning (embedding_n_llm_fine_tuning.py)
(4) Applications - dialog (this file)

We ran our code primarily on Google Colab and Ubuntu 24.04 (local). 
Here are the major dependencies (for the local environment):
- accelerate 1.6.0
- bitsandbytes 0.45.5
- datasets 2.19.2
- evaluate 0.4.3
- faiss-gpu 1.7.2
- numpy 1.26.4
- nvidia-cublas-cu12 12.6.4.1
- nvidia-cudnn-cu12 9.5.1.17
- openai 1.78.0
- rank-bm25 0.2.2
- sentence-transformers 4.1.0
- transformers 4.44.2

NOTE: You need to set up the OpenAI API key for this to work. We exported the key as an environment variable in our bashrc file.

"""


import os
import json
import glob
import re
from pathlib import Path

import numpy as np
import faiss
from rank_bm25 import BM25Okapi
from sklearn.preprocessing import normalize
from sentence_transformers import SentenceTransformer

from openai import OpenAI
import json
from dataclasses import asdict
from game_state_manager import (
    create_player,
    get_player,
    add_item_to_player,
    remove_item_from_player,
    change_weapon_for_player,
    heal_player,
    damage_player,
    restore_mana,
    drain_mana,
    dice_roll,
    Player,
    tools,
    user_tools,
    load_game_state,
)

generate_synthetic_flag = False
# this flag will be used to generate synthetic ground truths for the model evaluation
# we recommend keeping this as False, since the generated questions might change since flan gives the output differently each time

if os.path.exists("raw_gpt2_output.txt"):
    os.remove("raw_gpt2_output.txt")
if os.path.exists("perplexity_log.txt"):
    os.remove("perplexity_log.txt")
if os.path.exists("game_state.csv"):
    os.remove("game_state.csv")
if os.path.exists("qa_log.txt"):
    os.remove("qa_log.txt")

# -------------------------------------
# 1) LOAD & FILTER ALL CHUNKED DOCS
# -------------------------------------
def load_all_chunks(jsonl_file: str, source_filter: str = None):
    all_chunks = []
    with open(jsonl_file, "r", encoding="utf-8") as f:
        for line in f:
            chunk = json.loads(line)

            # We always include the rule book chunks
            if chunk.get("genre") == "core_rules" and chunk.get("source_doc") == "rule_book":
                all_chunks.append(chunk)
                continue

            # We filter out the chunks that are not from the campaign that the user selected
            if source_filter and chunk.get("source_doc") != source_filter:
                continue

            all_chunks.append(chunk)
    return all_chunks

# -------------------------------------
# 2) HYBRID RETRIEVER CLASS
# -------------------------------------
class HybridRetriever:
    def __init__(self, chunks: list[dict], embedding_model_path="/content/dnd_finetuned_bge"):
        self.chunks = chunks
        self.texts = [chunk["text"] for chunk in self.chunks]

        self.tokenized_corpus = [re.findall(r"\w+", text.lower()) for text in self.texts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        self.embedder = SentenceTransformer(embedding_model_path)
        self.chunk_embeddings = self.embedder.encode(
            self.texts, convert_to_numpy=True, batch_size=32, show_progress_bar=True
        )
        self.chunk_embeddings = normalize(self.chunk_embeddings, axis=1)

        self.index = faiss.IndexFlatIP(self.chunk_embeddings.shape[1])
        self.index.add(self.chunk_embeddings)

    def hybrid_search(self, query, top_k=5, alpha=0.2):
        qtok = re.findall(r"\w+", query.lower())
        bm25_s = np.array(self.bm25.get_scores(qtok))
        bm25_n = (bm25_s - bm25_s.min()) / (bm25_s.max() - bm25_s.min() + 1e-8)

        query_post = query.strip().lower()
        query_prompt = f"Represent this question for retrieving relevant documents: {query_post}"
        q_emb = self.embedder.encode([query_prompt], convert_to_numpy=True)
        q_emb = normalize(q_emb, axis=1)

        cand_idx = np.argsort(bm25_s)[::-1][:1000]
        cand_embs = self.chunk_embeddings[cand_idx]
        idx50 = faiss.IndexFlatIP(cand_embs.shape[1])
        idx50.add(cand_embs)
        D, I = idx50.search(q_emb, 50)

        cos_s = np.zeros(len(self.chunks))
        for rank, score in zip(I[0], D[0]):
            cos_s[cand_idx[rank]] = score
        cos_n = (cos_s - cos_s.min()) / (cos_s.max() - cos_s.min() + 1e-8)

        hybrid = alpha * bm25_n + (1 - alpha) * cos_n
        order = np.argsort(hybrid)[::-1]

        seen, out = set(), []
        for i in order:
            if i in cand_idx and self.chunks[i].get("section_type") == "combat":
                t = self.chunks[i]["text"]
                if t not in seen:
                    seen.add(t)
                    out.append(self.chunks[i])
                if len(out) >= top_k:
                    break
        return out

    def format_context(self, chunks):
        return "\n\n".join(chunk["text"] for chunk in chunks)

# -------------------------------------
# 3) RESPONSE GENERATION
# -------------------------------------
from transformers import pipeline, GPT2Tokenizer, GPT2LMHeadModel
import torch

def generate_model_response(prompt, model, tokenizer, model_choice):
    dm_generator = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        device=0,
    )

    out = dm_generator(
        prompt,
        max_new_tokens=80,
        do_sample=True,
        top_p=0.4,
        pad_token_id=tokenizer.eos_token_id,
    )[0]["generated_text"]

    # print(out)

    with open("raw_gpt2_output.txt", "a") as f:
        f.write(out + "\n\n")

    # lines = out.split('\n')

    # we parse out the DM line since our model tends to ramble and not follow our instructions
    # you can check the raw_gpt2_output.txt file to see the full output

    lines = out.split('\n')

    # we find the first line that starts with 'DM:'
    dm_index = next((i for i, line in enumerate(lines) if line.startswith('DM:')), None)

    if dm_index is not None:
        first_dm_line = lines[dm_index].replace("DM:", "", 1).strip()
        subsequent_lines = lines[dm_index+1:]
        if model_choice == 1:
            dm_content = first_dm_line + '\n' + '\n'.join(subsequent_lines)
            return dm_content
        
        additional_lines = []
        for line in subsequent_lines:
            if line.startswith("Player:"):
                break
            additional_lines.append(line.strip())

        dm_content = first_dm_line + '\n' + '\n'.join(additional_lines)
        
        return dm_content
    else:
        return None

# -------------------------------------
# 4) GAME STATE PARSER
# -------------------------------------

def parser(client, answer):
    # this function is to parse the model response to check if any changes to the game state were made
    # we make use of OpenAI API function calling for this
    # essentially, we pass it all the CRUD functions we have for the game state (as defined in game_state_manager.py)
    # and we let the model decide which ones to call
    # the model returns the function name and the arguments in a json format
    # we then call the function with the arguments provided

    completion = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=[{"role": "user", "content": answer}],
        tools=tools
    )

    tool_calls = completion.choices[0].message.tool_calls

    if not tool_calls:
        return
    
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        arguments = tool_call.function.arguments
        arguments = json.loads(arguments)

        if function_name == "create_player":
            player_name = arguments.get("name")
            player_class = arguments.get("character_class")
            player_race = arguments.get("race")
            player_hp = arguments.get("hp", 100)
            player_mana = arguments.get("mana", 100)
            player_weapon = arguments.get("weapon", "Fists")
            player_items = arguments.get("items", [])
            player_status = arguments.get("status", "Base")

            new_player = Player(
                player_name,
                player_class,
                player_race,
                player_weapon,
                player_items,
                hp=player_hp,
                mana=player_mana,
                status=player_status,
            )
            
            success = create_player(new_player)            
            if success:
                print(f"Player created: {new_player.name}, {new_player.character_class}, {new_player.race} with {new_player.hp} HP and {new_player.mana} mana, wielding {new_player.weapon}.")
        elif function_name == "add_item_to_player":
            add_item_to_player(arguments["name"], arguments["item"])
        elif function_name == "remove_item_from_player":
            remove_item_from_player(arguments["name"], arguments["item"])
        elif function_name == "change_weapon_for_player":
            change_weapon_for_player(arguments["name"], arguments["weapon"])
        elif function_name == "damage_player":
            damage_player(arguments["name"], arguments["amount"])
        elif function_name == "heal_player":
            heal_player(arguments["name"], arguments["amount"])
        elif function_name == "restore_mana":
            restore_mana(arguments["name"], arguments["amount"])
        elif function_name == "drain_mana":
            drain_mana(arguments["name"], arguments["amount"])

def user_parser(client, answer):
    # this function is similar to the parser function above
    # except this is for user input
    # we use this solely for dice rolls

    completion = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=[{"role": "user", "content": answer}],
        tools=user_tools
    )

    tool_calls = completion.choices[0].message.tool_calls

    if not tool_calls:
        return None
    
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        arguments = tool_call.function.arguments
        arguments = json.loads(arguments)

        if function_name == "dice_roll":
            return dice_roll(arguments["max_value"])
        
    return None

# -------------------------------------
# 5) PERPLEXITY CALCULATION
# -------------------------------------

def calculate_perplexity(text, model, tokenizer):
    encodings = tokenizer(text, return_tensors='pt').to(model.device)
    input_ids = encodings.input_ids
    target_ids = input_ids.clone()
    
    with torch.no_grad():
        outputs = model(input_ids, labels=target_ids)
        loss = outputs.loss
    
    perplexity = torch.exp(loss).cpu().item()
    return perplexity

# ------------------------------------------
# 6) SYNTHETIC GROUND TRUTHS GENERATION
# ------------------------------------------

# WARNING! Running this code will change the ground truth questions (because flan gives the output differently each time) based on what we evaluated below
# Please use the data that was provided by us for the evaluation, this code is just for reference

# here we generate synthetic ground truths for the model evaluation
# so we pass the model chunks that we generated
# for each chunk, the model generates 3 questions

import json
from pathlib import Path
from tqdm import tqdm
from transformers import pipeline

if generate_synthetic_flag:
    qg_pipe = pipeline("text2text-generation", model="google/flan-t5-base")

    input_path = Path("jsonl_files/merged.jsonl")        
    output_path = Path("jsonl_files/synthetic_ground_truths_temp.jsonl")

    with input_path.open("r", encoding="utf-8") as f:
        all_chunks = [json.loads(line) for line in f]

    qa_data = []

    for i, chunk in enumerate(tqdm(all_chunks[:200], desc="Generating questions")):  
        text = chunk.get("text", "").strip()
        chunk_id = chunk.get("chunk_id", f"chunk_{i}")

        if not text:
            continue

        prompt = f"Generate 3 questions based on this Dungeons & Dragons content:\n{text}"
        try:
            outputs = qg_pipe(
                prompt,
                max_length=64,
                num_return_sequences=3,
                do_sample=True,          
                temperature=0.7          
            )
            questions = [o["generated_text"].strip() for o in outputs if "?" in o["generated_text"]]

            for q in questions:
                qa_data.append({
                    "query": q,
                    "positive_contexts": [{"text": text, "id": chunk_id}],
                    "metadata": {
                        "section_hierarchy": chunk.get("section_hierarchy", []),
                        "source_doc": chunk.get("source_doc", ""),
                        "genre": chunk.get("genre", ""),
                        "section_type": chunk.get("section_type", "")
                    }
                })

        except Exception as e:
            print(f"Error at chunk {chunk_id}: {e}")


    with output_path.open("w", encoding="utf-8") as out:
        for item in qa_data:
            out.write(json.dumps(item) + "\n")

    print(f"Saved {len(qa_data)} synthetic QA pairs to {output_path}")

# ------------------------------------------
# 7) SYNTHETIC GROUND TRUTHS EVALUATION
# ------------------------------------------

from sentence_transformers import util

def evaluate_multiple_custom_queries(queries_with_gt: list[tuple[str, set]], retriever: HybridRetriever, k: int = 3):
    chunk_id_map = {c["text"].strip(): c.get("chunk_id") or c.get("id") for c in retriever.chunks}
    id_to_text = {c.get("chunk_id") or c.get("id"): c["text"].strip() for c in retriever.chunks}
    embedder = retriever.embedder

    with open("qa_log.txt", "a", encoding="utf-8") as f:
        for query, ground_truth_ids in queries_with_gt:
            retrieved_chunks = retriever.hybrid_search(query, top_k=k, alpha=0.5)
            retrieved_ids = {chunk_id_map.get(chunk["text"].strip()) for chunk in retrieved_chunks}

            hits = len(ground_truth_ids & retrieved_ids)

            f.write(f"\n\nQuery: {query}")
            f.write(f"\nGround Truth IDs: {ground_truth_ids}")
            f.write(f"\nRetrieved IDs: {retrieved_ids}")
            f.write(f"\nPrecision@{k}:{hits / k:.4f}")
            f.write(f"\nRecall@{k}: {hits / len(ground_truth_ids):.4f}")

            gt_texts = [id_to_text[cid] for cid in ground_truth_ids if cid in id_to_text]
            retrieved_texts = [chunk["text"].strip() for chunk in retrieved_chunks]

            if not gt_texts:
                f.write("\nNo ground truth text found for semantic similarity evaluation.")
                continue

            gt_embeddings = embedder.encode(gt_texts, convert_to_tensor=True)
            retrieved_embeddings = embedder.encode(retrieved_texts, convert_to_tensor=True)

            max_similarities = []
            for r_embed in retrieved_embeddings:
                sims = util.pytorch_cos_sim(r_embed, gt_embeddings)
                max_similarities.append(sims.max().item())

            avg_similarity = np.mean(max_similarities)
            f.write(f"\nSemantic Similarity@{k}: {avg_similarity:.4f}")
            f.write("\nContext is semantically relevant." if avg_similarity > 0.50 else "\nContext may be off-topic.")

# -------------------------------------
# 7) MAIN PIPELINE
# -------------------------------------
if __name__ == "__main__":
    client = OpenAI()

    if os.path.exists("game_state.csv"):
        os.remove("game_state.csv")

    welcome_message = f"""
Welcome to our D&D game! 
Start by specifying the number of players (we support upto 3 players).
    """

    print(welcome_message)

    num_players = int(input("Enter the number of players (1-3): "))
    while num_players < 1 or num_players > 3:
        print("Invalid number of players. Please enter a number between 1 and 3.")
        num_players = int(input("Enter the number of players (1-3): "))
    
    post_num_players_message = f"""
Great! You have {num_players} players.
Now, let's create the players.
    """

    print(post_num_players_message)    

    for i in range(num_players):
        print("Please describe player ", i + 1, ". Be sure to include their name, character class, and race. You can also include their HP, Mana, and weapon.")
        player_description = input(f"Player {i + 1} description: ")
        parser(client, player_description)

    with open("campaign_details.json", "r") as f:
        campaigns = json.load(f)

    post_num_players_message = f"""
Great!
Now, let's select a campaign.
Here are the available campaigns:    
    """
    for i, campaign in enumerate(campaigns["campaigns"]):
        post_num_players_message += f"\n{i + 1}. {campaign['title']}: {campaign['summary']}\n"

    post_num_players_message += "\nPlease select a campaign by entering the corresponding number: "
    print(post_num_players_message)

    campaign_choice = int(input("Enter your choice: "))

    while campaign_choice < 1 or campaign_choice > len(campaigns["campaigns"]):
        print("Invalid choice. Please select a valid campaign.")
        campaign_choice = int(input("Enter your choice: "))

    selected_campaign = campaigns["campaigns"][campaign_choice - 1]["title"]
    initial_campaign_description = campaigns["campaigns"][campaign_choice - 1]["initialDescription"]
    selected_campaign_filter_title = campaigns["campaigns"][campaign_choice - 1]["filterTitle"]

    CHUNKS_FOLDER = "jsonl_files/first_200.jsonl"
    SOURCE_FILTER = selected_campaign_filter_title
    TOP_K = 3
    ALPHA = 0.5
    EMBEDDING_MODEL_PATH = "dnd_finetuned_bge/dnd_finetuned_bge"

    chunks = load_all_chunks(CHUNKS_FOLDER, SOURCE_FILTER)

    retriever = HybridRetriever(chunks, embedding_model_path=EMBEDDING_MODEL_PATH)
    QA_PATH = "jsonl_files/synthetic_ground_truths_temp.jsonl"

    post_campaign_select_message = f"""
Great! You have selected the campaign.
Now, what model would you like to use for the game? 
1. GPT-2 fine-tuned on D&D data
2. GPT-2 fine-tuned on CRD3
3. OpenAI API GPT-4.1-nano  
    """
    print(post_campaign_select_message)

    model_choice = int(input("Enter your choice: "))
    while model_choice < 1 or model_choice > 3:
        print("Invalid choice. Please select a valid model.")
        model_choice = int(input("Enter your choice: "))

    if model_choice == 1:
        model_name = "gpt2_dnd_finetuned/gpt2_dnd_finetuned"
        tokenizer = GPT2Tokenizer.from_pretrained(model_name)
        model = GPT2LMHeadModel.from_pretrained(model_name)
    elif model_choice == 2:
        model_name = "gpt2_crd3_finetuned"
        tokenizer = GPT2Tokenizer.from_pretrained(model_name)
        model = GPT2LMHeadModel.from_pretrained(model_name)

    post_model_select_message = f"""
Great! You have selected the model.
Now, let's start the game!
You can stop the game at any time by typing 'exit'.
    """
    print(post_model_select_message)

    starter_message = f"""
DM: Welcome to the game!
{initial_campaign_description}
What would you like to do?
    """

    print(starter_message)

    prev_message = starter_message
                    
    while True:
        user_input = input("Enter your response: ")
        if user_input.lower() == "exit":
            break

        combined_input = f"{prev_message} {user_input}"
        
        # top_chunks = retriever.hybrid_search(user_input, top_k=TOP_K, alpha=ALPHA)
        top_chunks = retriever.hybrid_search(combined_input, top_k=TOP_K, alpha=ALPHA)
        context = retriever.format_context(top_chunks)

        players = load_game_state()
        payload = [asdict(p) for p in players]
        compact = json.dumps(payload, separators=(",",":"))

        user_parser_res = user_parser(client, user_input)
        if user_parser_res:
            context += f"\n\nPlayer rolled a {user_parser_res}.\n"

        # if prev_message:
        #     context += f"\n\n{prev_message}\n"
        #     prev_message = None

        # prompt = (
        #     f"You are the DM. Use the context and game state to generate new, good, relevant narration. Remember that you are the DM, and everything you say will be relayed to the players. If there any new characters (other than the players), you must introduce them in the narration. Ensure the narration has a logical flow.\n\n"
        #     f"Context: {context}\n"
        #     f"Game state: {compact}\n"
        #     f"Player: {user_input}\n"
        #     f"DM: "
        # )   
        prompt = (
            f"Context: {context}\n"
            f"Game state: {compact}\n"
            f"Player: {user_input}\n"
            f"Respond to player's input using the context and game state. Create a single next narration that is concise.\n"
            f"DM: "
        )   

        if model_choice == 1 or model_choice == 2:
            answer = generate_model_response(prompt, model, tokenizer, model_choice)

        else:
            completion = client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {
                        "role": "developer",
                        "content": 
                            f"""You are the dungeon master for a D&D game. Here's the context: {context} \n\n
                                Respond to the player's input as the DM. 
                                Keep your responses extremely concise, and only include the relevant information. 
                                Do not include any additional information.
                                If the player describes an action, respond with whether it is successful or not, and provide any relevant details of what happened as a result of the action.
                                Remember that you must narrate the game as the DM, and not just respond to the player's input.
                                You must give the player information about the game world, and not just respond to their input.
                                If the player asks a question, respond with the answer as the DM.
                                Try to keep your responses relevant to the context provided.
                            """
                    },
                    {
                        "role": "user",
                        "content": user_input
                    }
                ]
            )

            answer = completion.choices[0].message.content

        print("DM: ", answer)
        prev_message = answer

        parser(client, answer)

        if model_choice == 1 or model_choice == 2:
            perplexity = calculate_perplexity(prompt, model, tokenizer)
            with open("perplexity_log.txt", "a") as f:
                f.write(f"Prompt: {prompt}\n")
                f.write(f"Perplexity: {perplexity:.2f}\n\n")

    if generate_synthetic_flag:
        QUERY_GT_PAIRS = [
            ("What are the three main pillars of D&D play?", {"r_0001"}),
            ("What is the cost to gain a level?", {"r_0154"}),
            ("How many hit dice are needed to pool the hit dice", {"r_0155"}),
            ("What identifies morality", {"r_0133"}),
        ]
        evaluate_multiple_custom_queries(QUERY_GT_PAIRS, retriever, k=3)


# John is a half-orc mage. he has only 20 hp, but 1000 mana. he carries a shield.
# Bob is a wizard from America. He is a dwarf. He has 300 hp, 50 mana, and no weapon
# John searches the trail for any tracks
