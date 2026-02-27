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
DO $$ BEGIN
    CREATE TYPE vfs_node_type AS ENUM ('file', 'folder', 'shortcut');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================================================================
-- 2. USERS (Multi-Tenancy Root)
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    storage_quota_bytes BIGINT DEFAULT 10737418240, -- 10GB default
    storage_used_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Fix existing users table if it's missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT DEFAULT 10737418240;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Index for quick authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =========================================================================
-- 3. SESSIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to quickly validate/revoke sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- =========================================================================
-- 4. VIRTUAL FILE SYSTEM (Materialized Path)
-- =========================================================================
CREATE TABLE IF NOT EXISTS vfs_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    path TEXT NOT NULL, 
    name VARCHAR(255) NOT NULL,
    node_type vfs_node_type NOT NULL,
    parent_id UUID REFERENCES vfs_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_vfs_user_path UNIQUE (user_id, path)
);

-- Performance Indexes:
CREATE UNIQUE INDEX IF NOT EXISTS idx_vfs_user_id ON vfs_nodes(user_id, id);
CREATE INDEX IF NOT EXISTS idx_vfs_path_prefix ON vfs_nodes (user_id, path text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_vfs_parent ON vfs_nodes(user_id, parent_id);


-- =========================================================================
-- 5. FILE METADATA (GCS Mapping)
-- =========================================================================
CREATE TABLE IF NOT EXISTS file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vfs_node_id UUID NOT NULL REFERENCES vfs_nodes(id) ON DELETE CASCADE,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    gcs_object_key TEXT NOT NULL,
    md5_hash VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_file_metadata_node UNIQUE (user_id, vfs_node_id)
);

CREATE INDEX IF NOT EXISTS idx_file_meta_node ON file_metadata(user_id, vfs_node_id);

-- =========================================================================
-- 6. WINDOW LAYOUT (Desktop State Persistence)
-- =========================================================================
CREATE TABLE IF NOT EXISTS window_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(100) NOT NULL,
    z_index INTEGER NOT NULL DEFAULT 0,
    is_minimized BOOLEAN DEFAULT FALSE,
    is_maximized BOOLEAN DEFAULT FALSE,
    pos_x INTEGER NOT NULL DEFAULT 100,
    pos_y INTEGER NOT NULL DEFAULT 100,
    width INTEGER NOT NULL DEFAULT 800,
    height INTEGER NOT NULL DEFAULT 600,
    context_node_id UUID REFERENCES vfs_nodes(id) ON DELETE CASCADE,
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_window_layout_app UNIQUE (user_id, app_identifier, context_node_id)
);

CREATE INDEX IF NOT EXISTS idx_window_layout_load ON window_layout(user_id);


-- =========================================================================
-- 7. CLIPPY HISTORY (AI Chat Logs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS clippy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL, 
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    related_app VARCHAR(100),
    related_node_id UUID REFERENCES vfs_nodes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clippy_history_session ON clippy_history(user_id, session_id, created_at ASC);

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

-- Helper to safely create triggers
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_users') THEN
        CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_vfs') THEN
        CREATE TRIGGER set_timestamp_vfs BEFORE UPDATE ON vfs_nodes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_meta') THEN
        CREATE TRIGGER set_timestamp_meta BEFORE UPDATE ON file_metadata FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;