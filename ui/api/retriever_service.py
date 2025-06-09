import os
import json
import re
from typing import List, Dict, Any

import numpy as np
import faiss
from rank_bm25 import BM25Okapi
from sklearn.preprocessing import normalize
from sentence_transformers import SentenceTransformer


class HybridRetriever:
    def __init__(self, chunks: List[Dict[str, Any]], embedding_model_path: str = "dnd_finetuned_bge/dnd_finetuned_bge"):
        self.chunks = chunks
        self.texts = [chunk["text"] for chunk in self.chunks]

        # Initialize BM25
        self.tokenized_corpus = [re.findall(r"\w+", text.lower()) for text in self.texts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        # Initialize semantic embeddings
        self.embedder = SentenceTransformer(embedding_model_path)
        self.chunk_embeddings = self.embedder.encode(
            self.texts, convert_to_numpy=True, batch_size=32, show_progress_bar=True
        )
        self.chunk_embeddings = normalize(self.chunk_embeddings, axis=1)

        # Initialize FAISS index
        self.index = faiss.IndexFlatIP(self.chunk_embeddings.shape[1])
        self.index.add(self.chunk_embeddings)

    def hybrid_search(self, query: str, top_k: int = 5, alpha: float = 0.2) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining BM25 and semantic search
        
        Args:
            query: Search query string
            top_k: Number of top results to return
            alpha: Weight for BM25 vs semantic search (0.0 = only semantic, 1.0 = only BM25)
        
        Returns:
            List of top matching chunks
        """
        # BM25 search
        qtok = re.findall(r"\w+", query.lower())
        bm25_s = np.array(self.bm25.get_scores(qtok))
        bm25_n = (bm25_s - bm25_s.min()) / (bm25_s.max() - bm25_s.min() + 1e-8)

        # Semantic search
        query_post = query.strip().lower()
        query_prompt = f"Represent this question for retrieving relevant documents: {query_post}"
        q_emb = self.embedder.encode([query_prompt], convert_to_numpy=True)
        q_emb = normalize(q_emb, axis=1)

        # Get top candidates from BM25 and search semantically within them
        cand_idx = np.argsort(bm25_s)[::-1][:1000]
        cand_embs = self.chunk_embeddings[cand_idx]
        idx50 = faiss.IndexFlatIP(cand_embs.shape[1])
        idx50.add(cand_embs)
        D, I = idx50.search(q_emb, 50)

        # Combine scores
        cos_s = np.zeros(len(self.chunks))
        for rank, score in zip(I[0], D[0]):
            cos_s[cand_idx[rank]] = score
        cos_n = (cos_s - cos_s.min()) / (cos_s.max() - cos_s.min() + 1e-8)

        # Hybrid scoring
        hybrid = alpha * bm25_n + (1 - alpha) * cos_n
        order = np.argsort(hybrid)[::-1]

        # Get top results, prioritizing combat sections and avoiding duplicates
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

    def format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format retrieved chunks into a context string"""
        return "\n\n".join(chunk["text"] for chunk in chunks)


class RetrieverService:
    def __init__(self):
        self.retriever = None
        self.embedding_model_path = "../../models/dnd_finetuned_bge/dnd_finetuned_bge"
    
    def initialize_retriever(self, chunks: List[Dict[str, Any]], embedding_model_path: str = None) -> Dict[str, Any]:
        """
        Initialize the hybrid retriever with chunks
        
        Args:
            chunks: List of document chunks
            embedding_model_path: Path to the embedding model
        
        Returns:
            Status response
        """
        try:
            if embedding_model_path:
                self.embedding_model_path = embedding_model_path
            
            self.retriever = HybridRetriever(chunks, self.embedding_model_path)
            
            return {
                "success": True,
                "message": f"Retriever initialized with {len(chunks)} chunks",
                "chunk_count": len(chunks)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "chunk_count": 0
            }
    
    def search(self, query: str, top_k: int = 5, alpha: float = 0.2) -> Dict[str, Any]:
        """
        Perform hybrid search
        
        Args:
            query: Search query
            top_k: Number of results to return
            alpha: BM25 vs semantic search weight
        
        Returns:
            Search results
        """
        if not self.retriever:
            return {
                "success": False,
                "error": "Retriever not initialized. Please initialize with chunks first.",
                "results": [],
                "context": ""
            }
        
        try:
            results = self.retriever.hybrid_search(query, top_k, alpha)
            context = self.retriever.format_context(results)
            
            return {
                "success": True,
                "results": results,
                "context": context,
                "query": query,
                "result_count": len(results)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "context": ""
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get retriever status"""
        return {
            "initialized": self.retriever is not None,
            "chunk_count": len(self.retriever.chunks) if self.retriever else 0,
            "embedding_model_path": self.embedding_model_path
        } 