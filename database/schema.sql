-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1️⃣ USERS TABLE
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 2️⃣ FILES TABLE (Folders + Files)
-- =========================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
    mime_type TEXT,
    size_bytes BIGINT DEFAULT 0,
    storage_key TEXT,  -- path in cloud storage bucket
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Prevent duplicate file/folder names in same directory
CREATE UNIQUE INDEX unique_name_per_folder
ON files(user_id, parent_id, name)
WHERE is_deleted = FALSE;

-- =========================
-- 3️⃣ FILE VERSIONS (Optional Advanced Feature)
-- =========================
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_key TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 4️⃣ GAME SCORES
-- =========================
CREATE TABLE game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_name TEXT NOT NULL,
    score INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 5️⃣ CLIPPY AI SESSIONS
-- =========================
CREATE TABLE clippy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context TEXT,
    user_message TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 6️⃣ INDEXING (Performance Critical)
-- =========================
CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_parent ON files(parent_id);
CREATE INDEX idx_files_storage_key ON files(storage_key);
CREATE INDEX idx_scores_user ON game_scores(user_id);
CREATE INDEX idx_clippy_user ON clippy_sessions(user_id);

-- =========================
-- 7️⃣ AUTO UPDATE updated_at TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_files_timestamp
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();