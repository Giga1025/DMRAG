from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Tuple
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def setup_middleware(app: FastAPI):
    """Setup all middleware for the FastAPI app"""
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # Add your frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # You can add more middleware here as needed
    # For example:
    # app.add_middleware(SomeOtherMiddleware)
    
    return app

# Auth dependency
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split("Bearer ")[1]
    response = supabase.auth.get_user(token)
    supabase.postgrest.auth(token)
    user = response.user
    return user

# Helper function to get both user and token
async def get_user_and_token(authorization: Optional[str] = Header(None)) -> Tuple:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split("Bearer ")[1]
    response = supabase.auth.get_user(token)
    user = response.user
    return user, token

# Export supabase client for use in other modules
def get_supabase_client() -> Client:
    return supabase 