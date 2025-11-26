import { IReportService } from '../interfaces/IReportService';
import {
  ReportItem,
  UploadReportRequest,
  UploadReportResponse,
  GetReportContentRequest,
  GetReportContentResponse,
  GetReportMetadataRequest,
  GetReportMetadataResponse,
  GetReportAttemptsRequest,
  GetReportAttemptsResponse,
  ToggleAttemptScoreRequest,
  ToggleAttemptScoreResponse,
} from '../types/report.types';
import { validateGarakReport } from '../utils/report-validator';
import { ReportErrors } from '../errors/report-errors';
import { getDataSource, initializeDataSource, isDatabaseConfigured } from '@/app/data-source';
import { DataSource } from 'typeorm';
import { Report } from '@/app/entities/Report';
import { Attempt } from '@/app/entities/Attempt';
import { GarakAttempt } from '@/lib/garak-parser';
import { parseReportMetadata } from '../utils/report-metadata-parser';
import { parseCategoryAttempts } from '../utils/report-attempts-parser';

/**
 * Database-based implementation of IReportService
 * 
 * This implementation uses PostgreSQL to store and retrieve reports
 */
export class DatabaseReportService implements IReportService {
  /**
   * Extract runId from filename (format: garak.{uuid}.jsonl)
   */
  private extractRunIdFromFilename(filename: string): string {
    const match = filename.match(/garak\.([^.]+)\.jsonl/);
    return match ? match[1] : filename.replace(/\.jsonl$/, '');
  }

  /**
   * Ensure DataSource is initialized
   * This handles the case where the instrumentation hook hasn't run yet
   */
  private async ensureDataSource(): Promise<DataSource> {
    let dataSource = getDataSource();
    if (!dataSource) {
      if (!isDatabaseConfigured()) {
        throw new Error('Database not configured');
      }
      // Try to initialize if not already initialized
      // This can happen if the instrumentation hook hasn't run yet or failed
      console.log('[DatabaseReportService] DataSource not initialized, attempting to initialize...');
      try {
        dataSource = await initializeDataSource();
        if (!dataSource) {
          const error = new Error('Failed to initialize database connection: initializeDataSource returned null');
          console.error('[DatabaseReportService]', error);
          throw error;
        }
        console.log('[DatabaseReportService] DataSource initialized successfully');
      } catch (error) {
        console.error('[DatabaseReportService] Failed to initialize DataSource:', error);
        throw error;
      }
    }
    return dataSource;
  }

  async getAllReports(): Promise<ReportItem[]> {
    const dataSource = await this.ensureDataSource();

    const reportRepo = dataSource.getRepository(Report);
    const reports = await reportRepo.find({
      order: { startedAt: 'DESC', createdAt: 'DESC' },
    });

    return reports.map((report): ReportItem => ({
      filename: report.reportFilename || `garak.${report.runId}.jsonl`,
      runId: report.runId,
      size: 0, // Size not stored in DB
      startTime: report.startedAt ? report.startedAt.toISOString() : null,
      modelName: report.modelName,
      garakVersion: report.garakVersion,
      // folderPath not applicable in database mode
    }));
  }

  async uploadReport(request: UploadReportRequest): Promise<UploadReportResponse> {
    // Validate file
    const validation = validateGarakReport(request.fileContent);
    if (!validation.isValid) {
      throw ReportErrors.invalidGarakReport(validation.error);
    }

    if (!validation.metadata) {
      throw ReportErrors.invalidGarakReport('Missing report metadata');
    }

    const { runId, startTime, garakVersion } = validation.metadata;

    // Parse JSONL to extract data
    const lines = request.fileContent.trim().split('\n');
    const startEntries: Record<string, unknown>[] = [];
    const initEntries: Record<string, unknown>[] = [];
    const attempts: Record<string, unknown>[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const obj = JSON.parse(trimmed);
        const entryType = obj.entry_type;

        if (entryType === 'start_run setup') {
          startEntries.push(obj);
        } else if (entryType === 'init') {
          initEntries.push(obj);
        } else if (entryType === 'attempt' && obj.status === 2) {
          attempts.push(obj);
        }
      } catch {
        // Skip invalid lines
        continue;
      }
    }

    if (startEntries.length === 0) {
      throw ReportErrors.invalidGarakReport('No "start_run setup" entry found');
    }

    const start = startEntries[0];
    const init = initEntries[0] ?? {};

    const reportFilename = (start['transient.report_filename'] as string) ?? request.filename;
    const modelType = (start['plugins.model_type'] as string) ?? null;
    const modelName = (start['plugins.model_name'] as string) ?? null;
    const startedAtRaw =
      (start['transient.starttime_iso'] as string) ??
      (init.start_time as string) ??
      null;
    const startedAt = startedAtRaw ? new Date(startedAtRaw) : null;

    const dataSource = await this.ensureDataSource();

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Insert report using TypeORM
      const reportInsertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Report)
        .values({
          runId,
          reportFilename,
          garakVersion,
          modelType,
          modelName,
          config: start ?? null,
          startedAt,
        })
        .returning(['id'])
        .execute();

      const firstIdentifier = reportInsertResult.identifiers[0];
      if (!firstIdentifier || firstIdentifier.id == null) {
        throw new Error('Failed to get inserted report id');
      }
      const reportId: number = firstIdentifier.id as number;

      // Insert attempts in batches using queryRunner to stay within transaction
      // Using queryRunner.manager for batch inserts (following POC pattern exactly)
      const BATCH_SIZE = 200;

      for (let i = 0; i < attempts.length; i += BATCH_SIZE) {
        const batch = attempts.slice(i, i + BATCH_SIZE);
        const values = batch.map((a, idx) => {
          const seq =
            typeof a.seq === 'number'
              ? a.seq
              : i + idx;
          const status = typeof a.status === 'number' ? a.status : 2;

          return {
            reportId,
            uuid: a.uuid as string,
            seq,
            status,
            probeClassname: (a.probe_classname as string) ?? null,
            probeParams: (a.probe_params as Record<string, unknown>) ?? {},
            goal: (a.goal as string) ?? null,
            prompt: a.prompt ?? null,
            outputs: a.outputs ?? [],
            detectorResults: a.detector_results ?? {},
            notes: a.notes ?? {},
            conversations: a.conversations ?? [],
            reverseTranslationOutputs: a.reverse_translation_outputs ?? [],
          };
        });

        if (values.length > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(Attempt)
            .values(values)
            .execute();
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        filename: reportFilename,
        size: request.fileSize,
        metadata: {
          runId,
          startTime,
          garakVersion,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Failed to upload report:', error);
      throw ReportErrors.failedToSaveFile();
    } finally {
      await queryRunner.release();
    }
  }

  async getReportContent(request: GetReportContentRequest): Promise<GetReportContentResponse> {
    const runId = this.extractRunIdFromFilename(request.filename);

    const dataSource = await this.ensureDataSource();
    const reportRepo = dataSource.getRepository(Report);
    const report = await reportRepo.findOne({ where: { runId } });

    if (!report) {
      throw ReportErrors.fileNotFound(`Report with runId ${runId} not found`);
    }

    // Reconstruct JSONL from database
    const lines: string[] = [];

    // Add init entry
    if (report.startedAt || report.garakVersion) {
      const initEntry = {
        entry_type: 'init',
        run: report.runId,
        start_time: report.startedAt ? report.startedAt.toISOString() : null,
        garak_version: report.garakVersion,
      };
      lines.push(JSON.stringify(initEntry));
    }

    // Add start_run setup entry if config exists
    if (report.config) {
      const startEntry = {
        entry_type: 'start_run setup',
        ...report.config,
        'transient.run_id': report.runId,
        'transient.report_filename': report.reportFilename,
        'transient.starttime_iso': report.startedAt ? report.startedAt.toISOString() : null,
        'plugins.model_type': report.modelType,
        'plugins.model_name': report.modelName,
        '_config.version': report.garakVersion,
      };
      lines.push(JSON.stringify(startEntry));
    }

    // Get all attempts for this report
    const attemptRepo = dataSource.getRepository(Attempt);
    const attempts = await attemptRepo.find({
      where: { reportId: report.id },
      order: { seq: 'ASC', id: 'ASC' },
    });

    // Convert attempts to JSONL format
    for (const attempt of attempts) {
      const attemptEntry = {
        entry_type: 'attempt',
        uuid: attempt.uuid,
        seq: attempt.seq,
        status: attempt.status,
        probe_classname: attempt.probeClassname ?? '',
        probe_params: attempt.probeParams ?? {},
        prompt: attempt.prompt,
        outputs: attempt.outputs ?? [],
        detector_results: attempt.detectorResults ?? {},
        notes: attempt.notes ?? {},
        goal: attempt.goal,
        conversations: attempt.conversations ?? [],
        reverse_translation_outputs: attempt.reverseTranslationOutputs ?? [],
      };
      lines.push(JSON.stringify(attemptEntry));
    }

    const content = lines.join('\n');
    return {
      content,
      filename: request.filename,
      size: Buffer.byteLength(content, 'utf8'),
    };
  }

  async getReportMetadata(request: GetReportMetadataRequest): Promise<GetReportMetadataResponse> {
    const runId = this.extractRunIdFromFilename(request.filename);

    const dataSource = await this.ensureDataSource();
    const reportRepo = dataSource.getRepository(Report);
    const report = await reportRepo.findOne({ where: { runId } });

    if (!report) {
      throw ReportErrors.fileNotFound(`Report with runId ${runId} not found`);
    }

    // Get report content and use existing parser
    const contentResult = await this.getReportContent({ filename: request.filename });
    const metadata = parseReportMetadata(contentResult.content);

    return metadata;
  }

  async getReportAttempts(request: GetReportAttemptsRequest): Promise<GetReportAttemptsResponse> {
    const runId = this.extractRunIdFromFilename(request.filename);

    const dataSource = await this.ensureDataSource();
    const reportRepo = dataSource.getRepository(Report);
    const report = await reportRepo.findOne({ where: { runId } });

    if (!report) {
      throw ReportErrors.fileNotFound(`Report with runId ${runId} not found`);
    }

    const page = request.page ?? 1;
    const limit = request.limit ?? 100;
    const filter = request.filter ?? 'all';

    // Get all attempts for this report (following POC pattern)
    // Category and vulnerability filtering is done by the parser
    const attemptRepo = dataSource.getRepository(Attempt);
    const allAttempts = await attemptRepo
      .createQueryBuilder('a')
      .where('a.reportId = :reportId', { reportId: report.id })
      .orderBy('a.seq', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .getMany();

    // Transform to GarakAttempt format
    // Ensure all required fields match the GarakAttempt interface exactly
    const garakAttempts: GarakAttempt[] = allAttempts.map((a): GarakAttempt => {
      // Ensure prompt has the correct structure
      let prompt = a.prompt;
      if (!prompt || typeof prompt !== 'object' || !('turns' in prompt)) {
        prompt = { turns: [] };
      }

      // Ensure outputs is an array
      const outputs = Array.isArray(a.outputs) ? a.outputs : [];

      // Ensure detector_results is an object
      const detectorResults = a.detectorResults && typeof a.detectorResults === 'object' 
        ? (a.detectorResults as Record<string, number[]>)
        : {};

      // Ensure conversations is an array
      const conversations = Array.isArray(a.conversations) ? a.conversations : [];

      return {
        uuid: a.uuid,
        seq: a.seq,
        status: a.status,
        probe_classname: a.probeClassname ?? '',
        probe_params: a.probeParams ?? {},
        prompt: prompt as { turns: Array<{ role: string; content: { text: string; lang: string } }> },
        outputs: outputs as Array<{ text: string; lang: string }>,
        detector_results: detectorResults,
        goal: a.goal ?? '',
        conversations: conversations as Array<{ turns: Array<{ role: string; content: { text: string; lang: string } }> }>,
      };
    });

    // Use existing parser for filtering and pagination
    const content = garakAttempts.map(a => JSON.stringify({ entry_type: 'attempt', ...a })).join('\n');
    const result = parseCategoryAttempts(content, request.category, page, limit, filter);

    return {
      attempts: result.attempts,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async toggleAttemptScore(request: ToggleAttemptScoreRequest): Promise<ToggleAttemptScoreResponse> {
    const runId = this.extractRunIdFromFilename(request.filename);

    const dataSource = await this.ensureDataSource();
    const reportRepo = dataSource.getRepository(Report);
    const report = await reportRepo.findOne({ where: { runId } });

    if (!report) {
      throw ReportErrors.fileNotFound(`Report with runId ${runId} not found`);
    }

    const attemptRepo = dataSource.getRepository(Attempt);
    const attempt = await attemptRepo.findOne({
      where: { reportId: report.id, uuid: request.attemptUuid },
    });

    if (!attempt) {
      throw ReportErrors.fileNotFound(`Attempt with UUID ${request.attemptUuid} not found`);
    }

    // Update detector_results
    const detectorResults = (attempt.detectorResults as Record<string, number[]>) ?? {};
    if (!detectorResults[request.detectorName]) {
      // Create new detector array
      const numOutputs = Array.isArray(attempt.outputs) ? attempt.outputs.length : 1;
      detectorResults[request.detectorName] = new Array(numOutputs).fill(0);
    }

    const scores = [...detectorResults[request.detectorName]];
    if (request.responseIndex >= scores.length) {
      throw new Error(`Invalid responseIndex ${request.responseIndex}`);
    }

    scores[request.responseIndex] = request.newScore;
    detectorResults[request.detectorName] = scores;

    // Update in database
    attempt.detectorResults = detectorResults;
    await attemptRepo.save(attempt);

    return {
      success: true,
      message: `Updated detector ${request.detectorName} score for response ${request.responseIndex} to ${request.newScore}`,
    };
  }
}

