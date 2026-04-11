-- Initial Supabase schema for CV Builder
-- This file contains all table definitions needed for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CV Templates table
CREATE TABLE IF NOT EXISTS cv_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL, -- e.g., "template-1.html"
    screenshot_url TEXT NOT NULL, -- e.g., "/images/templates/template-1.png"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated CVs table
CREATE TABLE IF NOT EXISTS generated_cvs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES cv_templates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
    progress TEXT, -- Current step: "Processing DOCX...", "AI Formatting...", "Generating PDF..."
    pdf_url TEXT, -- URL to generated PDF
    html_content TEXT, -- Generated HTML content stored in DB
    original_doc_text TEXT, -- Extracted plain text from source DOCX
    original_doc_links JSONB, -- Sanitized links extracted from DOCX
    name TEXT, -- Name of the generated CV (from original filename)
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_cvs_user_id ON generated_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_cvs_template_id ON generated_cvs(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_cvs_status ON generated_cvs(status);
CREATE INDEX IF NOT EXISTS idx_generated_cvs_updated_at ON generated_cvs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- RLS (Row Level Security) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Generated CVs policies
CREATE POLICY "Users can view their own CVs" ON generated_cvs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CVs" ON generated_cvs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CVs" ON generated_cvs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CVs" ON generated_cvs
    FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- CV Templates are public (read-only for everyone)
CREATE POLICY "Anyone can view CV templates" ON cv_templates
    FOR SELECT USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_cvs_updated_at BEFORE UPDATE ON generated_cvs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default CV templates
INSERT INTO cv_templates (name, file_name, screenshot_url, description) VALUES
('Modern Professional', 'template-1.html', '/images/templates/template-1.png', 'Clean and modern professional template'),
('Creative Designer', 'template-2.html', '/images/templates/template-2.png', 'Creative template for designers and artists'),
('Executive Classic', 'template-3.html', '/images/templates/template-3.png', 'Classic executive template with traditional layout'),
('Tech Minimalist', 'template-4.html', '/images/templates/template-4.png', 'Minimalist template perfect for tech professionals')
ON CONFLICT DO NOTHING;
