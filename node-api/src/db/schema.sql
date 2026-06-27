-- DDL Schema for AeroGuard NeonDB (dev branch)

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    r2_object_key TEXT UNIQUE NOT NULL,
    original_filename TEXT,
    file_size_bytes BIGINT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'uploaded', 'queued', 'processing', 'completed', 'failed', 'purged')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    purged_at TIMESTAMPTZ
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    frame_timestamp_ms INTEGER NOT NULL,
    metric_type TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence FLOAT,
    bbox_x1 FLOAT,
    bbox_y1 FLOAT,
    bbox_x2 FLOAT,
    bbox_y2 FLOAT,
    raw_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on jobs status for quick queue/processing lookups
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Create index on metrics job_id for quick retrieval of video frames metrics
CREATE INDEX IF NOT EXISTS idx_metrics_job_id ON metrics(job_id);
