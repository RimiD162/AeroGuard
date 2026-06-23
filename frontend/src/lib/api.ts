const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Detection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  area_ratio: number;
}

export interface DetectionResponse {
  detections: Detection[];
  metrics: {
    inference_time_ms: number;
    total_time_ms: number;
  };
}

export interface DBMetric {
  id: string;
  jobId: string;
  frameTimestampMs: number;
  metricType: string;
  label: string;
  confidence: number | null;
  bboxX1: number | null;
  bboxY1: number | null;
  bboxX2: number | null;
  bboxY2: number | null;
  rawValue: string | null;
  createdAt: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  r2ObjectKey: string;
  jobId: string;
  expiresAt: string;
}

/**
 * @deprecated Use getPresignedUrl and XMLHttpRequest instead for decoupled uploads
 */
export async function detectDefects(file: File): Promise<DetectionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/detect`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Detection failed';
    try {
      const errData = await response.json();
      errorMessage = errData.detail || errorMessage;
    } catch {
      // fallback
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getPresignedUrl(
  filename: string,
  fileSizeBytes: number,
  contentType: string
): Promise<PresignedUrlResponse> {
  const response = await fetch(`${API_URL}/api/v1/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, fileSizeBytes, contentType }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to generate presigned URL';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface DBJob {
  id: string;
  r2ObjectKey: string;
  originalFilename: string | null;
  fileSizeBytes: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  purgedAt: string | null;
  metricsCount: number;
}

export async function getJobs(page = 1, limit = 50): Promise<DBJob[]> {
  const response = await fetch(`${API_URL}/api/v1/jobs?page=${page}&limit=${limit}`);

  if (!response.ok) {
    let errorMessage = 'Failed to fetch jobs';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getJob(jobId: string): Promise<DBJob> {
  const response = await fetch(`${API_URL}/api/v1/jobs/${jobId}`);

  if (!response.ok) {
    let errorMessage = 'Failed to fetch job';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getJobMetrics(jobId: string, page = 1, limit = 100): Promise<DBMetric[]> {
  const response = await fetch(`${API_URL}/api/v1/jobs/${jobId}/metrics?page=${page}&limit=${limit}`);

  if (!response.ok) {
    let errorMessage = 'Failed to fetch job metrics';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

