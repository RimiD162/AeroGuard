import { pgTable, uuid, text, bigint, timestamp, integer, real, jsonb } from 'drizzle-orm/pg-core';

// Jobs Table Definition
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  r2ObjectKey: text('r2_object_key').unique().notNull(),
  originalFilename: text('original_filename'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
  status: text('status', {
    enum: ['pending', 'uploaded', 'queued', 'processing', 'completed', 'failed', 'purged']
  }).notNull(),
  errorMessage: text('error_message'),
  aircraftModel: text('aircraft_model'),
  registrationNumber: text('registration_number'),
  tailNumber: text('tail_number'),
  inspectionType: text('inspection_type'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  purgedAt: timestamp('purged_at', { withTimezone: true }),
});

// Metrics Table Definition
export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  frameTimestampMs: integer('frame_timestamp_ms').notNull(),
  metricType: text('metric_type').notNull(),
  label: text('label').notNull(),
  confidence: real('confidence'),
  bboxX1: real('bbox_x1'),
  bboxY1: real('bbox_y1'),
  bboxX2: real('bbox_x2'),
  bboxY2: real('bbox_y2'),
  rawValue: text('raw_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Types for select and insert operations
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Metric = typeof metrics.$inferSelect;
export type NewMetric = typeof metrics.$inferInsert;
