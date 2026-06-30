-- migrations/003_create_topics.sql

-- This is the master list of DSA topics we recognize.
-- "Dynamic Programming", "Trees", "Graphs" etc.
-- Our topic extraction engine (Module 4) will match
-- scraped text against this list.

CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,   -- "Dynamic Programming"
  slug VARCHAR(255) UNIQUE NOT NULL,   -- "dynamic-programming"
  category VARCHAR(100),                -- "Data Structures" or "Algorithms"
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_topics_slug ON topics(slug);


-- ─────────────────────────────────────────────
-- This is the LINKING table — connects experiences to topics.
-- One experience can have MANY topics.
-- One topic can appear in MANY experiences.
-- This relationship is called MANY-TO-MANY.
-- A linking table is the standard way to represent this.

CREATE TABLE experience_topics (
  id SERIAL PRIMARY KEY,
  
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,

  -- prevents the same topic being linked twice to the same experience
  UNIQUE(experience_id, topic_id)
);

CREATE INDEX idx_exp_topics_experience ON experience_topics(experience_id);
CREATE INDEX idx_exp_topics_topic ON experience_topics(topic_id);