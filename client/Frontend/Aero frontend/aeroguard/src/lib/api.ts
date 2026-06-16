const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
