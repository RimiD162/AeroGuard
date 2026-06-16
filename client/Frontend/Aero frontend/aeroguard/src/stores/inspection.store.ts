'use client';

import { create } from 'zustand';
import { PipelineStage, PipelineStageStatus } from '@/types/inspection';
import { detectDefects, Detection } from '@/lib/api';

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
  detections: [],
  inferenceTime: 0,
  pipelineError: null,
  pipelineStages: STAGE_DEFAULTS.map((s) => ({ ...s })),
  isUploading: false,
  isPipelineRunning: false,
  pipelineComplete: false,

  setStep: (step) => set({ currentStep: step }),
  setField: (field, value) => set({ [field]: value } as any),

  startUpload: (file) => {
    set({ isUploading: true, uploadProgress: 0, uploadedFile: null, fileObject: file });
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        set({
          uploadProgress: 100,
          isUploading: false,
          uploadedFile: { name: file.name, size: `${sizeMb} MB` },
        });
      } else {
        set({ uploadProgress: Math.min(progress, 99) });
      }
    }, 100);
  },

  startPipeline: async () => {
    const { fileObject } = get();
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

    if (!fileObject) {
      stages[0].status = 'error';
      set({
        isPipelineRunning: false,
        pipelineError: 'No file uploaded. Please go back and select a file.',
        pipelineStages: stages
      });
      return;
    }

    try {
      // Step 1: Upload Complete
      stages[0].status = 'complete';
      stages[0].duration = '0.3s';

      // Step 2: Frame Extraction (simulate image loading)
      stages[1].status = 'running';
      stages[1].progress = 'Scanning image metadata...';
      set({ pipelineStages: [...stages] });
      await new Promise((resolve) => setTimeout(resolve, 800));
      stages[1].status = 'complete';
      stages[1].duration = '0.8s';
      stages[1].progress = undefined;

      // Step 3: AI Enhancement
      stages[2].status = 'running';
      stages[2].progress = 'Applying visual filters...';
      set({ pipelineStages: [...stages] });
      await new Promise((resolve) => setTimeout(resolve, 600));
      stages[2].status = 'complete';
      stages[2].duration = '0.6s';
      stages[2].progress = undefined;

      // Step 4: Defect Detection (Real backend API call)
      stages[3].status = 'running';
      stages[3].progress = 'Running YOLOv8 inference...';
      set({ pipelineStages: [...stages] });

      const response = await detectDefects(fileObject);

      stages[3].status = 'complete';
      stages[3].duration = `${(response.metrics.inference_time_ms / 1000).toFixed(2)}s`;
      stages[3].progress = undefined;

      // Step 5: 3D Reconstruction
      stages[4].status = 'running';
      stages[4].progress = 'Projecting 3D locations...';
      set({ pipelineStages: [...stages] });
      await new Promise((resolve) => setTimeout(resolve, 600));
      stages[4].status = 'complete';
      stages[4].duration = '0.6s';
      stages[4].progress = undefined;

      // Step 6: Report Generation
      stages[5].status = 'running';
      stages[5].progress = 'Generating report files...';
      set({ pipelineStages: [...stages] });
      await new Promise((resolve) => setTimeout(resolve, 500));
      stages[5].status = 'complete';
      stages[5].duration = '0.5s';
      stages[5].progress = undefined;

      // Step 7: Inventory Check
      stages[6].status = 'running';
      stages[6].progress = 'Querying part availability...';
      set({ pipelineStages: [...stages] });
      await new Promise((resolve) => setTimeout(resolve, 400));
      stages[6].status = 'complete';
      stages[6].duration = '0.4s';
      stages[6].progress = undefined;

      // Step 8: Recommendations
      stages[7].status = 'running';
      stages[7].progress = 'Formulating advisories...';
      set({ pipelineStages: [...stages] });
      await new Promise((resolve) => setTimeout(resolve, 500));
      stages[7].status = 'complete';
      stages[7].duration = '0.5s';
      stages[7].progress = undefined;

      // Set final state
      set({
        isPipelineRunning: false,
        pipelineComplete: true,
        detections: response.detections,
        inferenceTime: response.metrics.inference_time_ms,
        pipelineStages: [...stages]
      });

    } catch (error: any) {
      console.error('Inspection pipeline failed:', error);
      const runningIdx = stages.findIndex((s) => s.status === 'running');
      if (runningIdx !== -1) {
        stages[runningIdx].status = 'error';
      } else {
        stages[3].status = 'error';
      }

      set({
        isPipelineRunning: false,
        pipelineError: error.message || 'Network request failed. Is the backend running?',
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
      detections: [],
      inferenceTime: 0,
      pipelineError: null,
      pipelineStages: STAGE_DEFAULTS.map((s) => ({ ...s })),
      isUploading: false,
      isPipelineRunning: false,
      pipelineComplete: false,
    }),
}));
