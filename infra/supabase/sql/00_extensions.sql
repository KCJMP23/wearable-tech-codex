-- Extensions for affiliate-factory platform
-- Enable required PostgreSQL extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search for RAG and recommendations
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Hierarchical data for taxonomy trees
CREATE EXTENSION IF NOT EXISTS "ltree";

-- Additional useful extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For accent-insensitive search