-- Ensure one login per worker
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_user_id_unique ON auth_users(user_id);
