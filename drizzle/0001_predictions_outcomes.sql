CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  user_uid TEXT REFERENCES users(uid) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB NOT NULL,
  payload JSONB NOT NULL,
  drift_prob REAL NOT NULL,
  crash_prob REAL NOT NULL,
  flow_prob REAL NOT NULL,
  predicted_path TEXT NOT NULL,
  model_version TEXT,
  prompt_version TEXT,
  latency_ms REAL
);

CREATE INDEX IF NOT EXISTS predictions_created_at_idx ON predictions (created_at);
CREATE INDEX IF NOT EXISTS predictions_path_idx ON predictions (predicted_path);
CREATE INDEX IF NOT EXISTS predictions_user_created_at_idx ON predictions (user_uid, created_at);

CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  prediction_id TEXT NOT NULL UNIQUE REFERENCES predictions(id) ON DELETE CASCADE,
  user_uid TEXT REFERENCES users(uid) ON DELETE CASCADE,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_path TEXT NOT NULL,
  actual_drift_score REAL,
  source TEXT NOT NULL DEFAULT 'auto',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS outcomes_evaluated_at_idx ON outcomes (evaluated_at);
CREATE INDEX IF NOT EXISTS outcomes_prediction_idx ON outcomes (prediction_id);