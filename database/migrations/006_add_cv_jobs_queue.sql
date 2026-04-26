-- Queue table for durable CV generation/edit jobs

CREATE TABLE IF NOT EXISTS cv_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_id INTEGER NOT NULL REFERENCES generated_cvs(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('generate', 'edit')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_jobs_user_id ON cv_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_jobs_status_created_at ON cv_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_cv_jobs_cv_id ON cv_jobs(cv_id);

ALTER TABLE cv_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own CV jobs" ON cv_jobs;
CREATE POLICY "Users can view their own CV jobs" ON cv_jobs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own CV jobs" ON cv_jobs;
CREATE POLICY "Users can create their own CV jobs" ON cv_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own CV jobs" ON cv_jobs;
CREATE POLICY "Users can update their own CV jobs" ON cv_jobs
    FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_cv_jobs_updated_at ON cv_jobs;
CREATE TRIGGER update_cv_jobs_updated_at BEFORE UPDATE ON cv_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
