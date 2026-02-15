CREATE TABLE branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    business_name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    branch_password TEXT NOT NULL,
    business_type TEXT NOT NULL,
    year_established INTEGER,
    contact_full_name TEXT NOT NULL,
    contact_position TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL,
    review_platforms TEXT[], -- Stores selected platforms as an array
    additional_info TEXT,
    newsletter_subscribed BOOLEAN DEFAULT false
);
-- Add latitude and longitude columns to your branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Example: Pin a location in Colombo
UPDATE branches 
SET latitude = 6.9271, longitude = 79.8612 
WHERE branch_id = 'YOUR_BRANCH_ID';

CREATE TABLE concerns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id TEXT NOT NULL, -- Links to your 'branches' table
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
  category TEXT,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the todos table
CREATE TABLE todos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id TEXT NOT NULL, -- To filter tasks by branch (e.g., BCH-001)
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('Daily Operations', 'Staff Management', 'Inventory', 'Customer Service')),
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
    due_date DATE,
    notes TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now 
-- (In production, you'd restrict this to authenticated users)
CREATE POLICY "Allow all access to todos" ON todos FOR ALL USING (true);


-- Drop the table and recreate with correct structure
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Business info
    business_name TEXT,
    business_category TEXT,
    address TEXT,
    city TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    
    -- Review info
    reviewer_name TEXT,
    review_rating INTEGER,
    review_text TEXT,
    review_date TIMESTAMP,
    
    -- Additional details
    price_per_person TEXT,
    meal_type TEXT,
    
    -- Sentiment analysis
    sentiment_score TEXT,
    sentiment_confidence NUMERIC,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment_score);
CREATE INDEX idx_reviews_city ON reviews(city);
CREATE INDEX idx_reviews_date ON reviews(review_date DESC);
CREATE INDEX idx_reviews_rating ON reviews(review_rating);
