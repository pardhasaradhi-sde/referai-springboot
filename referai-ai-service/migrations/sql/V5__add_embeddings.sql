-- V5__add_embeddings.sql
-- Adds pgvector support and embedding column/index for semantic retrieval.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_profiles_embedding_ivfflat
ON profiles
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
