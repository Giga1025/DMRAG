
"""
WHAT:

Here we are fine tuning our sentence_transformer and llm on our merged data from the previous chunking part.

WHY

We want our embeddings to be semantic and our llm to understand those embeddings, so we train them on same data

NOTE: This code requires >8GB of VRAM, so it might not run locally. We ran this code on colab.
If you run on colab, please take care to upload the merged.jsonl file to the colab environment and set the path accordingly.

"""

#-------------------------------------------------------embedding_transformer_fine_tuning------------------
import os
import json
from pathlib import Path
from sentence_transformers import InputExample, SentenceTransformer, losses
from torch.utils.data import DataLoader
import torch

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["WANDB_DISABLED"] = "true"
torch.cuda.empty_cache()

examples = []
with open("jsonl_files/merged.jsonl", "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        text = data["text"].strip()
        if len(text.split()) >= 10:
            # only consider text with more than 10 words
            examples.append(InputExample(texts=[text, text]))

model = SentenceTransformer("BAAI/bge-base-en-v1.5")

train_dataloader = DataLoader(examples, shuffle=True, batch_size=16)

train_loss = losses.MultipleNegativesRankingLoss(model)

model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=100,
    show_progress_bar=True
)

model.save("dnd_finetuned_bge")

#-------------------------LLM-fine_tuning--------------------------------------------------------
import json

with open("jsonl_files/merged.jsonl", "r", encoding="utf-8") as infile, open("dnd_corpus.txt", "w", encoding="utf-8") as outfile:
    for line in infile:
        data = json.loads(line)
        text = data.get("text", "").strip()
        if len(text.split()) >= 10:
            outfile.write(text + "\n\n")

from transformers import GPT2LMHeadModel, GPT2Tokenizer, TextDataset, DataCollatorForLanguageModeling, Trainer, TrainingArguments
import torch
import os

model_name = "gpt2-medium"
output_dir = "gpt2_dnd_finetuned"
dataset_path = "dnd_corpus.txt"

tokenizer = GPT2Tokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = GPT2LMHeadModel.from_pretrained(model_name)
model.resize_token_embeddings(len(tokenizer))

dataset = TextDataset(
    tokenizer=tokenizer,
    file_path=dataset_path,
    block_size=512
)

data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer,
    mlm=False
)

training_args = TrainingArguments(
    output_dir=output_dir,
    overwrite_output_dir=True,
    num_train_epochs=3,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    save_steps=500,
    save_total_limit=2,
    prediction_loss_only=True,
    logging_steps=100,
    learning_rate=5e-5,
    warmup_steps=100,
    fp16=torch.cuda.is_available()
)

trainer = Trainer(
    model=model,
    args=training_args,
    data_collator=data_collator,
    train_dataset=dataset
)

trainer.train()

model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)


#-----------------------------------------------------------------------------------------------