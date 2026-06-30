-- migrations/001_create_companies.sql

-- This table stores every company we have data for.
-- id is auto-generated, name must be unique so we don't
-- accidentally create "Amazon" twice.

CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,  -- "amazon" used in URLs like /api/companies/amazon
  created_at TIMESTAMP DEFAULT NOW()
);

-- index on slug because we will search by it constantly
-- this makes lookups like WHERE slug = 'amazon' much faster
CREATE INDEX idx_companies_slug ON companies(slug);