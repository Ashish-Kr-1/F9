-- =========================================================================
-- Windows XP Web OS Clone - PostgreSQL DDL
-- strict multi-tenant architecture with materialized path VFS
-- =========================================================================

-- Enable UUID extension for robust distributed keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pgcrypto can also be used, but uuid-ossp is standard for deep uuid support
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 

-- =========================================================================
-- 1. ENUMS
-- =========================================================================
CREATE TYPE vfs_node_type AS ENUM ('file', 'folder', 'shortcut');

-- =========================================================================
-- 2. USERS (Multi-Tenancy Root)
-- =========================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    storage_quota_bytes BIGINT DEFAULT 10737418240, -- 10GB default
    storage_used_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Index for quick authentication lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- =========================================================================
-- 3. SESSIONS
-- =========================================================================
-- While JWTs are stateless, tracking refresh tokens or active sessions
-- is critical for remote logout capabilities in a professional environment.
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to quickly validate/revoke sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- =========================================================================
-- 4. VIRTUAL FILE SYSTEM (Materialized Path)
-- =========================================================================
-- Design Choice: Materialized paths (root/folder/file) allow lightning-fast 
-- full-tree retrievals using prefix matching (path LIKE 'root/folder/%') 
-- compared to recursive CTEs on Adjacency Lists (parent_id).
CREATE TABLE vfs_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- The full path identifying the theoretical structure (e.g. C:/Users/Ashish/Documents/file.txt)
    -- Using TEXT to allow deep nesting, but enforcing uniqueness
    path TEXT NOT NULL, 
    
    name VARCHAR(255) NOT NULL,
    node_type vfs_node_type NOT NULL,
    
    -- parent_id is kept for quick directory listings, though path is primary for deep searches
    parent_id UUID REFERENCES vfs_nodes(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 🔴 STRICT MULTI-TENANCY: Composite Unique Constraint
    -- A user cannot have two files with the exact same path
    CONSTRAINT uq_vfs_user_path UNIQUE (user_id, path)
);

-- Performance Indexes for 100k+ files:
-- 1. Fast lookup of a specific node for a specific user
CREATE UNIQUE INDEX idx_vfs_user_id ON vfs_nodes(user_id, id);

-- 2. Fast prefix searching (crucial for materialized path pattern)
-- The text_pattern_ops operator class enables index usage for LIKE queries
CREATE INDEX idx_vfs_path_prefix ON vfs_nodes (user_id, path text_pattern_ops);

-- 3. Fast directory listing (Give me all files where parent_id = X)
CREATE INDEX idx_vfs_parent ON vfs_nodes(user_id, parent_id);


-- =========================================================================
-- 5. FILE METADATA (GCS Mapping)
-- =========================================================================
-- Design Choice: Separate metadata out of VFS. Folders don't need this table.
-- This keeps the VFS table extremely narrow and fast for tree traversals.
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vfs_node_id UUID NOT NULL REFERENCES vfs_nodes(id) ON DELETE CASCADE,
    
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    
    -- The actual physical location in Google Cloud Storage 
    -- (e.g. gs://xp-clone-bucket/user-uuid/file-uuid)
    gcs_object_key TEXT NOT NULL,
    
    md5_hash VARCHAR(32), -- For integrity checks and deduplication
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 1-to-1 relationship with VFS node
    CONSTRAINT uq_file_metadata_node UNIQUE (user_id, vfs_node_id)
);

-- Index for mapping node to storage
CREATE INDEX idx_file_meta_node ON file_metadata(user_id, vfs_node_id);

-- =========================================================================
-- 6. WINDOW LAYOUT (Desktop State Persistence)
-- =========================================================================
CREATE TABLE window_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    app_identifier VARCHAR(100) NOT NULL, -- e.g., 'notepad', 'file_explorer'
    z_index INTEGER NOT NULL DEFAULT 0,
    is_minimized BOOLEAN DEFAULT FALSE,
    is_maximized BOOLEAN DEFAULT FALSE,
    
    -- Position and Dimensions
    pos_x INTEGER NOT NULL DEFAULT 100,
    pos_y INTEGER NOT NULL DEFAULT 100,
    width INTEGER NOT NULL DEFAULT 800,
    height INTEGER NOT NULL DEFAULT 600,
    
    -- If the window is displaying specific content (e.g. Notepad showing file X)
    context_node_id UUID REFERENCES vfs_nodes(id) ON DELETE CASCADE,
    
    last_modified TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_window_layout_app UNIQUE (user_id, app_identifier, context_node_id)
);

-- Index to quickly load the entire desktop state on boot
CREATE INDEX idx_window_layout_load ON window_layout(user_id);


-- =========================================================================
-- 7. CLIPPY HISTORY (AI Chat Logs)
-- =========================================================================
CREATE TABLE clippy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Store conversation context to maintain LLM continuity
    session_id UUID NOT NULL, 
    
    -- 'user' or 'ai'
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    
    -- Optional reference if Clippy was asked about a specific file or app
    related_app VARCHAR(100),
    related_node_id UUID REFERENCES vfs_nodes(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to retrieve chat history chronologically for a session
CREATE INDEX idx_clippy_history_session ON clippy_history(user_id, session_id, created_at ASC);

-- =========================================================================
-- TRIGGERS (Auto-update updated_at timestamps)
-- =========================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_vfs
BEFORE UPDATE ON vfs_nodes
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_meta
BEFORE UPDATE ON file_metadata
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();