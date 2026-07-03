CREATE TABLE IF NOT EXISTS demo_records (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO demo_records (title)
VALUES ('First production record')
ON CONFLICT (title) DO NOTHING;