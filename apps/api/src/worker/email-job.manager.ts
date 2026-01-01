import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { sendEmailPrompts } from './worker';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface EmailJob {
  id: string;
  status: JobStatus;
  progress: number;
  total: number;
  sent: number;
  skipped: number;
  error?: string;
  createdAt: Date;
}

class EmailJobManager {
  private jobs: Map<string, EmailJob> = new Map();

  startJob(fastify: FastifyInstance, options: { onlyPending?: boolean }): EmailJob {
    const id = randomUUID();
    const job: EmailJob = {
      id,
      status: 'pending',
      progress: 0,
      total: 0,
      sent: 0,
      skipped: 0,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);

    // Start processing in background
    setTimeout(async () => {
      try {
        await this.processJob(id, fastify, options);
      } catch (error) {
        console.error(`Job ${id} failed:`, error);
        this.updateJob(id, { status: 'failed', error: String(error) });
      }
    }, 0);

    return job;
  }

  getJob(id: string): EmailJob | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<EmailJob>) {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(id, job);
    }
  }

  private async processJob(jobId: string, fastify: FastifyInstance, options: { onlyPending?: boolean }) {
    this.updateJob(jobId, { status: 'processing' });

    // Pass the manager and jobId to the worker function so it can report progress
    await sendEmailPrompts(fastify, options, (progress) => {
      this.updateJob(jobId, {
        total: progress.total,
        sent: progress.sent,
        skipped: progress.skipped,
        progress: progress.percent,
      });
    });

    this.updateJob(jobId, { status: 'completed', progress: 100 });
  }
}

export const emailJobManager = new EmailJobManager();
