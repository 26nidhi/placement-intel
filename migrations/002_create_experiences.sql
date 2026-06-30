-- migrations/002_create_experiences.sql

-- This table stores every interview experience —
-- whether scraped from GFG/LeetCode or manually submitted
-- by a student. One row = one full interview experience.

CREATE TABLE experiences (
  id SERIAL PRIMARY KEY,

  -- which company this experience belongs to
  -- REFERENCES means this must match an id in the companies table
  -- this is called a FOREIGN KEY — it enforces that you can never
  -- have an experience pointing to a company that doesn't exist
  company_id INTEGER NOT NULL REFERENCES companies(id),

  title VARCHAR(500),              -- "Amazon SDE-1 Interview Aug 2024"
  
  -- where this data came from
  -- CHECK ensures only these 3 values are allowed, nothing else
  source VARCHAR(50) NOT NULL CHECK (source IN ('gfg', 'leetcode', 'manual')),
  
  source_url TEXT,                 -- original blog link, NULL if manual submission

  year INTEGER,                    -- which year the interview happened
  
  total_rounds INTEGER,            -- how many rounds total

  result VARCHAR(50) CHECK (result IN ('selected', 'rejected', 'unknown')),

  ctc VARCHAR(100),                -- "22 LPA" — kept as text since formats vary

  process_duration VARCHAR(100),   -- "3 weeks" — kept as text, inconsistent data

  raw_text TEXT,                   -- original scraped/submitted text,
                                    -- kept for re-processing if our 
                                    -- extraction logic improves later

  tips TEXT,                       -- any tips mentioned in the experience

  created_at TIMESTAMP DEFAULT NOW()
);

-- index on company_id because almost every query will be
-- "get all experiences for company X" — this makes that instant
CREATE INDEX idx_experiences_company ON experiences(company_id);

-- index on year because users will filter by year often
CREATE INDEX idx_experiences_year ON experiences(year);

-- index on result for filtering selected vs rejected
CREATE INDEX idx_experiences_result ON experiences(result);