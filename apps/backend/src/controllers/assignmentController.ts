// apps/backend/src/controllers/assignmentController.ts
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { Assignment, IAssignment, IQuestionType } from '../models/Assignment';
import { Result } from '../models/Result';
import { Activity } from '../models/Activity';
import { addGenerationJob, getJobPositionInQueue } from '../queues/generationQueue';
import { cacheService } from '../services/cacheService';
import { parseFileContent } from '../utils/fileParser';
import { uploadToR2 } from '../services/r2Service';
import { emitToAssignment } from '../socket/socketManager';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let sourceMaterial = '';
    let uploadedFileUrl: string | undefined = undefined;

    if (req.file) {
      console.log(`📁 Processing uploaded file: ${req.file.originalname}`);
      try {
        const extractedText = await parseFileContent(req.file);
        sourceMaterial = extractedText.trim();
        uploadedFileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (parseErr: unknown) {
        res.status(400).json({
          success: false,
          message: `Failed to parse file: ${getErrorMessage(parseErr)}`,
        });
        return;
      }
    }

    // Default parameters matching spec
    let subject = req.body.subject || '';
    let className = req.body.className || req.body.grade || '';
    let schoolName = req.body.schoolName || '';
    let timeAllowed = req.body.timeAllowed ? Number(req.body.timeAllowed) : 60;
    let dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
    let questionTypes: IQuestionType[] = req.body.questionTypes || [];
    let difficultyDistribution = req.body.difficultyDistribution || { easy: 30, medium: 50, hard: 20 };
    let additionalInstructions = req.body.additionalInstructions || req.body.voicePrompt || '';
    let includeAnswerKey = req.body.includeAnswerKey !== undefined ? !!req.body.includeAnswerKey : false;

    // Support nested formData structure sent by the frontend
    if (req.body.formData) {
      const fd = req.body.formData;
      subject = fd.subject || subject;
      className = fd.grade || fd.className || className;
      schoolName = fd.schoolName || schoolName;
      timeAllowed = fd.timeAllowed !== undefined ? Number(fd.timeAllowed) : timeAllowed;
      includeAnswerKey = fd.includeAnswerKey !== undefined ? !!fd.includeAnswerKey : includeAnswerKey;
      additionalInstructions = fd.voicePrompt || fd.additionalInstructions || additionalInstructions;
      
      if (fd.dueDate) {
        dueDate = new Date(fd.dueDate);
      }

      if (Array.isArray(fd.questionRows)) {
        questionTypes = fd.questionRows.map((r: { type?: string; count?: number; marksPerQuestion?: number }) => ({
          type: String(r.type || ''),
          count: Number(r.count) || 1,
          marksPerQuestion: Number(r.marksPerQuestion) || 1,
        }));
      }

      if (fd.difficulty) {
        const { easy, moderate, medium, hard } = fd.difficulty;
        difficultyDistribution = {
          easy: Number(easy) || 0,
          medium: Number(medium || moderate) || 0,
          hard: Number(hard) || 0,
        };
      }
    }

    const smartTitle = `${subject} Class ${className} Assessment - ${new Date(dueDate).toLocaleDateString()}`;

    const assignment = new Assignment({
      title: smartTitle,
      subject,
      className,
      schoolName,
      timeAllowed,
      dueDate,
      questionTypes,
      difficultyDistribution,
      additionalInstructions,
      uploadedFileUrl,
      extractedText: sourceMaterial,
      includeAnswerKey,
      status: 'pending',
    });

    await assignment.save();

    const jobId = assignment._id.toString();
    const job = await addGenerationJob(jobId);
    const jobPosition = await getJobPositionInQueue(job.id || jobId);

    emitToAssignment(jobId, 'job:queued', {
      assignmentId: jobId,
      jobId: job.id,
      position: jobPosition,
    });

    await cacheService.delPattern('assignments:list:*');

    // Create activity log
    const activity = new Activity({
      type: 'assignment_created',
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      metadata: {
        subject: assignment.subject,
        className: assignment.className,
        dueDate: assignment.dueDate,
      },
    });
    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Assessment creation request queued successfully',
      assignment,
      jobPosition,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search as string;

    const query: Record<string, unknown> = { deleted: { $ne: true } };
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const cacheKey = `assignments:list:${status || 'all'}:${page || 'all'}:${limit || 'all'}:${search || 'all'}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      res.status(200).json({
        success: true,
        source: 'cache',
        ...parsed,
      });
      return;
    }

    let assignmentsQuery = Assignment.find(query).sort({ createdAt: -1 });

    if (page && limit) {
      const skip = (page - 1) * limit;
      assignmentsQuery = assignmentsQuery.skip(skip).limit(limit);
    }

    const assignments = await assignmentsQuery;
    const total = await Assignment.countDocuments(query);

    const payload = {
      assignments,
      total,
      page: page || 1,
      limit: limit || total,
      totalPages: limit ? Math.ceil(total / limit) : 1,
    };

    await cacheService.set(cacheKey, JSON.stringify(payload), 300);

    res.status(200).json({
      success: true,
      source: 'database',
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const assignment = await Assignment.findOne({ _id: id, deleted: { $ne: true } });

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    // Dynamic Version History Sync based on Result documents
    const results = await Result.find({ assignmentId: id }).select('version totalQuestions generatedAt').sort({ version: 1 });
    const versionHistory = results.map(r => ({
      version: r.version,
      timestamp: r.generatedAt ? new Date(r.generatedAt).toLocaleString() : new Date().toLocaleString(),
      questionsCount: r.totalQuestions,
    }));

    const defaultHistory = [{
      version: 1,
      timestamp: new Date(assignment.createdAt).toLocaleString(),
      questionsCount: 0,
    }];

    const assignmentObj = assignment.toObject();
    assignmentObj.versionHistory = versionHistory.length > 0 ? versionHistory : defaultHistory;
    assignmentObj.version = results.length > 0 ? results[results.length - 1].version : assignment.version;

    res.status(200).json({
      success: true,
      assignment: assignmentObj,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const redisKey = `job:status:${id}`;
    const cached = await cacheService.get(redisKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      res.status(200).json({
        success: true,
        status: parsed.status,
        progress: parsed.progress ?? 0,
        jobId: id,
      });
      return;
    }

    const assignment = await Assignment.findOne({ _id: id, deleted: { $ne: true } });
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: assignment.status,
      progress: 0,
      jobId: id,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentResult = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const versionParam = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
    const cacheKey = `result:${id}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const responsePayload: Record<string, unknown> = {
        success: true,
        source: 'cache',
        ...parsed,
      };
      if (versionParam !== undefined && versionParam > 1) {
        responsePayload.version = versionParam;
      }
      res.status(200).json(responsePayload);
      return;
    }

    const assignment = await Assignment.findOne({ _id: id, deleted: { $ne: true } });
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    const result = await Result.findOne({ assignmentId: id });

    const payload: Record<string, unknown> = {
      assignment,
      result,
    };

    if (versionParam !== undefined && versionParam > 1) {
      payload.version = versionParam;
    }

    if (result) {
      await cacheService.set(cacheKey, JSON.stringify({ assignment, result }), 3600);
    }

    res.status(200).json({
      success: true,
      source: 'database',
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const regenerateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const assignment = await Assignment.findOne({ _id: id, deleted: { $ne: true } });

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    assignment.status = 'pending';
    await assignment.save();

    const job = await addGenerationJob(id);
    const jobPosition = await getJobPositionInQueue(job.id || id);

    await cacheService.delPattern('assignments:list:*');
    await cacheService.del(`result:${id}`);

    // Create activity log for regeneration
    const activity = new Activity({
      type: 'regenerated',
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      metadata: {
        subject: assignment.subject,
        className: assignment.className,
      },
    });
    await activity.save();

    emitToAssignment(id, 'job:queued', {
      assignmentId: id,
      position: jobPosition,
    });

    res.status(200).json({
      success: true,
      message: 'Assessment regeneration request queued successfully',
      assignment,
      jobPosition,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const assignment = await Assignment.findOne({ _id: id, deleted: { $ne: true } });

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    assignment.deleted = true;
    await assignment.save();

    // Invalidate caches
    await cacheService.delPattern('assignments:list:*');
    await cacheService.del(`result:${id}`);

    // Create activity log for delete
    const activity = new Activity({
      type: 'assignment_deleted',
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      metadata: {
        subject: assignment.subject,
        className: assignment.className,
      },
    });
    await activity.save();

    res.status(200).json({
      success: true,
      message: 'Assignment soft-deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const original = await Assignment.findOne({ _id: id, deleted: { $ne: true } });

    if (!original) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    const smartTitle = `${original.title} (Copy)`;

    const duplicated = new Assignment({
      title: smartTitle,
      subject: original.subject,
      className: original.className,
      schoolName: original.schoolName,
      timeAllowed: original.timeAllowed,
      dueDate: original.dueDate,
      questionTypes: original.questionTypes,
      difficultyDistribution: original.difficultyDistribution,
      additionalInstructions: original.additionalInstructions,
      uploadedFileUrl: original.uploadedFileUrl,
      extractedText: original.extractedText,
      includeAnswerKey: original.includeAnswerKey,
      status: 'pending',
    });

    await duplicated.save();

    const newJobId = duplicated._id.toString();
    const job = await addGenerationJob(newJobId);
    const jobPosition = await getJobPositionInQueue(job.id || newJobId);

    // Emit socket event for queued status
    emitToAssignment(newJobId, 'job:queued', {
      assignmentId: newJobId,
      position: jobPosition,
    });

    await cacheService.delPattern('assignments:list:*');

    // Create activity log
    const activity = new Activity({
      type: 'assignment_created',
      assignmentId: duplicated._id,
      assignmentTitle: duplicated.title,
      metadata: {
        duplicatedFrom: original._id,
        subject: duplicated.subject,
        className: duplicated.className,
      },
    });
    await activity.save();

    const sourceConfig = {
      subject: original.subject,
      grade: original.className,
      schoolName: original.schoolName || 'Veda International School',
      timeAllowed: original.timeAllowed || 60,
      difficulty: original.difficultyDistribution,
      includeAnswerKey: original.includeAnswerKey !== undefined ? original.includeAnswerKey : true,
      questionRows: original.questionTypes.map((qt) => ({
        type: qt.type,
        count: qt.count,
        marksPerQuestion: qt.marksPerQuestion,
      })),
    };

    res.status(201).json({
      success: true,
      newAssignmentId: newJobId,
      sourceConfig,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignments = await Assignment.find({ deleted: { $ne: true } });
    const totalAssignments = assignments.length;
    
    // Compute totalQuestions using the MongoDB aggregation on Result documents linked to non-deleted completed assignments
    const questionsResult = await Result.aggregate([
      {
        $lookup: {
          from: 'assignments',
          localField: 'assignmentId',
          foreignField: '_id',
          as: 'assignment'
        }
      },
      { $unwind: '$assignment' },
      {
        $match: {
          'assignment.deleted': { $ne: true },
          'assignment.status': 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalQuestions' }
        }
      }
    ]);
    const totalQuestions = questionsResult[0]?.total || 0;
    const avgQuestions = totalAssignments > 0 ? (totalQuestions / totalAssignments) : 0;
    
    const pendingCount = assignments.filter(a => a.status === 'pending').length;
    const processingCount = assignments.filter(a => a.status === 'processing').length;
    const failedCount = assignments.filter(a => a.status === 'failed').length;
    const completedCount = assignments.filter(a => a.status === 'completed').length;

    res.status(200).json({
      success: true,
      stats: {
        totalAssignments,
        totalQuestionsGenerated: totalQuestions,
        averageQuestionsPerAssignment: Math.round(avgQuestions * 100) / 100,
        pendingQueueCount: pendingCount,
        inProgressQueueCount: processingCount,
        failedCount,
        completedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAssignmentPDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }
    const answerKey = req.query.answerKey;
    const assignment = await Assignment.findOne({ _id: id, deleted: { $ne: true } });
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    const result = await Result.findOne({ assignmentId: id });
    if (!result || !result.pdfUrl) {
      res.status(404).json({
        success: false,
        message: 'PDF not generated for this assignment',
      });
      return;
    }

    // Log the pdf_downloaded activity event
    const activity = new Activity({
      type: 'pdf_downloaded',
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      metadata: {
        subject: assignment.subject,
        className: assignment.className,
      },
    });
    await activity.save();

    // A6: Add answer-key toggle header (MVP — PDF served as-is)
    if (answerKey === 'false') {
      res.setHeader('X-Answer-Key', 'excluded');
    }

    // A7: Version-aware PDF — include version in response header
    const versionParam = req.query.version;
    if (versionParam) {
      res.setHeader('X-Paper-Version', String(versionParam));
    }

    // Resolve the path to the uploads directory
    const uploadsDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
    const filename = path.basename(result.pdfUrl);
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      res.download(filePath, `${assignment.title.replace(/\s+/g, '_')}.pdf`);
    } else {
      res.redirect(result.pdfUrl);
    }
  } catch (error) {
    next(error);
  }
};

export const deleteAllAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Assignment.updateMany({}, { deleted: true });
    await cacheService.delPattern('assignments:list:*');
    
    // Log activity
    const activity = new Activity({
      type: 'assignment_deleted',
      metadata: { scope: 'all', count: result.modifiedCount }
    });
    await activity.save();

    res.status(200).json({ deletedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

export const getResultByVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
    const query: Record<string, unknown> = { assignmentId: id };
    if (version !== undefined && !isNaN(version)) query.version = version;
    
    let result = version
      ? await Result.findOne(query)
      : await Result.findOne({ assignmentId: id }).sort({ version: -1 });
      
    if (!result && version !== undefined) {
      result = await Result.findOne({ assignmentId: id }).sort({ version: -1 });
    }
      
    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
