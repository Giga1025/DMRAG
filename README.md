# DMRAG- your AI dungeon master for DND sessions

## Introduction

Dungeons and dragons is a popular table top board game, which is packed with rich lore, world building and spontanious story changes. Considering this challenges, it is always required to have a experienced dungeon master to narrate the story, which is'nt possible to everyone. To overcome this huddle, we came up with model that can act as the dungeon master for the players. The model can start with any genre specified by the player(currently we are limited to few). The Rag model has a semantically rich vector data base that includes, dnd rule books and premade campaigns like curse_of_strahd, Dues for the dead etc. We had also provided the ingame state tracker that can keep track of the player details like hp, mana, effects. 

## Method
![image](https://github.com/user-attachments/assets/c93fc417-a755-4953-84d3-e3db0001a342)


## Code
General description:
* pipeline.py - the main file for our project. It retrieves relevant chunks from our chunked corpus, the finetuned model, the game state function, and generates model response.
* chunking_and_removing_duplicates.py - this file is used to chunk the text and remove duplicates. It uses the BART model to generate chunks of text.
* embedding_n_llm_fine_tuning.py - this file is used to fine-tune the BAAI bge (our embedding model) and GPT-2 (our LLM model) on our chunked corpus. 
* initial_xml-jsonl.py - this file is used to parse the XML files (generated from the SRD doc and the pre-made campaigns) and convert it to JSONL format.
* game_state_manager.py - this file is used to manage the game state. It defines the Player class and the functions to manage the game state. It also defines the tools that are used for function calling.
* campaign_details.json - this file contains the details of the campaigns that we have. It is used to load the campaigns and their details.
* jsonl_files/ - this folder contains the JSONL files that are generated from the XML files. It contains the chunked corpus and the merged corpus.

## Data

The data needed for the vector data base was obtained from the official dnd website, which contained the pdf's of the books. Out of which we chose following pdf's:
* Rule book: The heart of the model, this data from the rule book is what going to help our model understand, implement in a dungeon master way.
* Premade campaigns: This helps the model create lore rich campaign and also not let it lose the track.

All the pdf's are initially converted to xml formate and later to jsonl, which again includes paragraph and grouped formats. All the mentioned files are available in the "data" folder. The final data file that we will be needing is the "merged" file, which includes the merged jsonl data from the rule book and pre made campagins which were were chunked using overalpping and filtered for repeating words or sentences before merging

## Models

We had fine tuned our embedder and llm using the data from the rule book, this helps the model understand the semantics and context of words and sentences more clearly. Further more, when it comes to the llm, we had fine tuned it using live dnd sessions data from a youtube channel called "critical role". Option is provided to choose whichever model the user wants.

## Example ouput

![image](https://github.com/user-attachments/assets/ede1a3d6-243e-4fae-bb27-57fa254ebec1)

## Work in progress

* Making the jsonl more structured including keywords.
* More stringent categorizing the jsonls using regex
* Using bigger models for embedder and llm, which involves fine tuning them too.
* Working on making the model have better track of the storylines and previous dialogues
* Building a user friendly application to provide best user experience.
  
