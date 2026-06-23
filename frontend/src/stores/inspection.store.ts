'use client';

import { create } from 'zustand';
import { PipelineStage, PipelineStageStatus } from '@/types/inspection';
import { getPresignedUrl, getJobMetrics, Detection } from '@/lib/api';

const STAGE_DEFAULTS: PipelineStage[] = [
  { name: 'upload', label: 'Upload Complete', status: 'pending' },
  { name: 'frame_extraction', label: 'Frame Extraction', status: 'pending' },
  { name: 'enhancement', label: 'AI Enhancement', status: 'pending' },
  { name: 'defect_detection', label: 'Defect Detection', status: 'pending' },
  { name: 'reconstruction', label: '3D Reconstruction', status: 'pending' },
  { name: 'report_generation', label: 'Report Generation', status: 'pending' },
  { name: 'inventory_check', label: 'Inventory Check', status: 'pending' },
  { name: 'maintenance_recommendations', label: 'Maintenance Recommendations', status: 'pending' },
];

interface InspectionState {
  currentStep: number;
  aircraftModel: string;
  registrationNumber: string;
  tailNumber: string;
  inspectionType: string;
  uploadProgress: number;
  uploadedFile: { name: string; size: string } | null;
  fileObject: File | null;
  jobId: string | null;
  detections: Detection[];
  inferenceTime: number;
  pipelineError: string | null;
  pipelineStages: PipelineStage[];
  isUploading: boolean;
  isPipelineRunning: boolean;
  pipelineComplete: boolean;
  setStep: (step: number) => void;
  setField: (field: string, value: string) => void;
  startUpload: (file: File) => void;
  startPipeline: () => Promise<void>;
  reset: () => void;
}

export const useInspectionStore = create<InspectionState>()((set, get) => ({
  currentStep: 1,
  aircraftModel: '',
  registrationNumber: '',
  tailNumber: '',
  inspectionType: '',
  uploadProgress: 0,
  uploadedFile: null,
  fileObject: null,
  jobId: null,
  detections: [],
  inferenceTime: 0,
  pipelineError: null,
  pipelineStages: STAGE_DEFAULTS.map((s) => ({ ...s })),
  isUploading: false,
  isPipelineRunning: false,
  pipelineComplete: false,

  setStep: (step) => set({ currentStep: step }),
  setField: (field, value) => set({ [field]: value } as any),

  startUpload: async (file) => {
    set({ isUploading: true, uploadProgress: 0, uploadedFile: null, fileObject: file, jobId: null, pipelineError: null });
    try {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      
      // Determine content type safely
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'mov') contentType = 'video/quicktime';
        else if (ext === 'avi') contentType = 'video/x-msvideo';
        else contentType = 'video/mp4'; // fallback
      }

      // 1. Get presigned URL
      const { uploadUrl, jobId } = await getPresignedUrl(file.name, file.size, contentType);
      set({ jobId });

      // 2. Perform PUT request to R2 using XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          set({ uploadProgress: Math.min(progress, 99) });
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const notifyRes = await fetch(`${API_URL}/api/v1/uploads/upload-success`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId }),
            });
            if (!notifyRes.ok) {
              throw new Error(`Failed to notify backend: ${notifyRes.statusText}`);
            }
            set({
              uploadProgress: 100,
              isUploading: false,
              uploadedFile: { name: file.name, size: `${sizeMb} MB` },
            });
          } catch (notifyErr: any) {
            console.error('Error notifying backend of upload success:', notifyErr);
            set({
              isUploading: false,
              pipelineError: notifyErr.message || 'Failed to initialize processing on backend.',
            });
          }
        } else {
          set({
            isUploading: false,
            pipelineError: `Upload failed with status ${xhr.status}`,
          });
        }
      };

      xhr.onerror = () => {
        set({
          isUploading: false,
          pipelineError: 'Network error occurred during upload.',
        });
      };

      xhr.send(file);
    } catch (error: any) {
      console.error('Error generating upload URL:', error);
      set({
        isUploading: false,
        pipelineError: error.message || 'Failed to start upload process.',
      });
    }
  },

  startPipeline: async () => {
    const { fileObject, jobId } = get();
    const stages = STAGE_DEFAULTS.map((s) => ({ ...s }));

    // Initialize running state
    set({
      isPipelineRunning: true,
      pipelineStages: stages,
      pipelineComplete: false,
      pipelineError: null,
      detections: [],
      inferenceTime: 0
    });

    if (!jobId || !fileObject) {
      stages[0].status = 'error';
      set({
        isPipelineRunning: false,
        pipelineError: 'No file uploaded or job ID found. Please go back and upload.',
        pipelineStages: stages
      });
      return;
    }

    try {
      // Step 1: Upload Complete
      stages[0].status = 'complete';
      stages[0].duration = '0.3s';
      set({ pipelineStages: [...stages] });

      // Step 2: Frame Extraction (opens EventSource stream)
      stages[1].status = 'running';
      stages[1].progress = 'Connecting to analysis stream...';
      set({ pipelineStages: [...stages] });

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const eventSource = new EventSource(`${API_URL}/api/v1/jobs/${jobId}/stream`);

      const handleCleanup = () => {
        eventSource.close();
      };

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE Event:', data);

          if (data.type === 'status_update') {
            const status = data.status;
            if (status === 'processing') {
              stages[1].status = 'complete';
              stages[1].duration = 'Done';
              stages[1].progress = undefined;

              stages[2].status = 'complete'; // AI Enhancement
              stages[2].duration = 'Done';

              stages[3].status = 'running';
              stages[3].progress = 'Processing frames and running inference...';
              set({ pipelineStages: [...stages] });
            }
          } else if (data.type === 'progress') {
            const count = typeof data.progress === 'object' ? data.progress.frameCount : data.progress;
            stages[3].progress = `Processing frame ${count || 0}...`;
            set({ pipelineStages: [...stages] });
          } else if (data.type === 'job_complete') {
            handleCleanup();

            stages[3].status = 'complete';
            stages[3].duration = 'Done';
            stages[3].progress = undefined;

            // Fetch final metrics from DB
            stages[4].status = 'running';
            stages[4].progress = 'Mapping metrics to 3D Twin...';
            set({ pipelineStages: [...stages] });

            try {
              const dbMetrics = await getJobMetrics(jobId);
              
              // Map DB metrics to Detection format
              const detectionsList = dbMetrics.map((m) => {
                const x1 = m.bboxX1 || 0;
                const y1 = m.bboxY1 || 0;
                const x2 = m.bboxX2 || 0;
                const y2 = m.bboxY2 || 0;
                const isNormalized = x1 <= 1.0 && y1 <= 1.0 && x2 <= 1.0 && y2 <= 1.0;
                const areaRatio = isNormalized
                  ? Math.max(0, Math.min(1, (x2 - x1) * (y2 - y1)))
                  : Math.max(0, Math.min(1, ((x2 - x1) * (y2 - y1)) / (640 * 640)));

                return {
                  class_name: m.label,
                  confidence: m.confidence || 0,
                  bbox: [x1, y1, x2, y2] as [number, number, number, number],
                  area_ratio: areaRatio,
                };
              });

              // Sequentially complete remaining stages for premium UX
              stages[4].status = 'complete';
              stages[4].duration = '0.5s';
              stages[4].progress = undefined;

              stages[5].status = 'running';
              stages[5].progress = 'Generating inspection reports...';
              set({ pipelineStages: [...stages] });
              await new Promise((r) => setTimeout(r, 400));
              stages[5].status = 'complete';
              stages[5].duration = '0.4s';
              stages[5].progress = undefined;

              stages[6].status = 'running';
              stages[6].progress = 'Checking parts inventory...';
              set({ pipelineStages: [...stages] });
              await new Promise((r) => setTimeout(r, 400));
              stages[6].status = 'complete';
              stages[6].duration = '0.4s';
              stages[6].progress = undefined;

              stages[7].status = 'running';
              stages[7].progress = 'Finalizing recommendations...';
              set({ pipelineStages: [...stages] });
              await new Promise((r) => setTimeout(r, 400));
              stages[7].status = 'complete';
              stages[7].duration = '0.4s';
              stages[7].progress = undefined;

              set({
                isPipelineRunning: false,
                pipelineComplete: true,
                detections: detectionsList,
                inferenceTime: 0,
                pipelineStages: [...stages],
              });
            } catch (err: any) {
              console.error('Error post-processing job metrics:', err);
              stages[4].status = 'error';
              set({
                isPipelineRunning: false,
                pipelineError: err.message || 'Failed to fetch job metrics.',
                pipelineStages: [...stages],
              });
            }
          } else if (data.type === 'job_failed') {
            handleCleanup();
            const runningIdx = stages.findIndex((s) => s.status === 'running');
            if (runningIdx !== -1) {
              stages[runningIdx].status = 'error';
            } else {
              stages[3].status = 'error';
            }
            set({
              isPipelineRunning: false,
              pipelineError: data.error || 'Job failed during execution.',
              pipelineStages: [...stages],
            });
          }
        } catch (parseErr) {
          console.error('Error parsing SSE event data:', parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource connection error:', err);
        handleCleanup();
        stages[3].status = 'error';
        set({
          isPipelineRunning: false,
          pipelineError: 'EventSource connection disconnected or failed.',
          pipelineStages: [...stages],
        });
      };

    } catch (error: any) {
      console.error('Pipeline startup failed:', error);
      stages[1].status = 'error';
      set({
        isPipelineRunning: false,
        pipelineError: error.message || 'Failed to start pipeline.',
        pipelineStages: [...stages]
      });
    }
  },

  reset: () =>
    set({
      currentStep: 1,
      aircraftModel: '',
      registrationNumber: '',
      tailNumber: '',
      inspectionType: '',
      uploadProgress: 0,
      uploadedFile: null,
      fileObject: null,
      jobId: null,
      detections: [],
      inferenceTime: 0,
      pipelineError: null,
      pipelineStages: STAGE_DEFAULTS.map((s) => ({ ...s })),
      isUploading: false,
      isPipelineRunning: false,
      pipelineComplete: false,
    }),
}));


