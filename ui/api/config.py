# AI Model Configuration
# HuggingFace model paths for the D&D AI Dungeon Master

# Text Generation Models
GPT2_DND_MODEL_PATH = "bpv2420/gpt2_dnd_finetuned"

# Embedding Models  
DND_EMBEDDING_MODEL_PATH = "bpv2420/dnd_finetuned_bge"

# Local model fallbacks (if needed)
GPT2_CRD3_MODEL_PATH = "gpt2_crd3_finetuned"

# RAG Configuration
DEFAULT_TOP_K = 3
DEFAULT_ALPHA = 0.2
DEFAULT_MAX_NEW_TOKENS = 80

# Storage Configuration
CHUNKS_BUCKET = "jsonl-files"
CHUNKS_FILE = "first_200.jsonl"
CAMPAIGN_DETAILS_FILE = "campaign_details.json" 