import { Request, Response, NextFunction } from 'express';
import { Assignment } from '../models/Assignment';
import { Result } from '../models/Result';
import { addGenerationJob, getJobPositionInQueue } from '../queues/generationQueue';
import { cacheService } from '../services/cacheService';
import { parseFileContent } from '../utils/fileParser';
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
    let sourceMaterial = req.body.sourceMaterial || '';

    if (req.file) {
      console.log(`📁 Processing uploaded file: ${req.file.originalname}`);
      try {
        const extractedText = await parseFileContent(req.file);
        sourceMaterial = extractedText.trim();
      } catch (parseErr: unknown) {
        res.status(400).json({
          success: false,
          message: `Failed to parse file: ${getErrorMessage(parseErr)}`,
        });
        return;
      }
    }

    const { title, subject, gradeLevel, topic, difficulty, numberOfQuestions, questionType } = req.body;

    const assignment = new Assignment({
      title,
      subject,
      gradeLevel,
      topic,
      difficulty,
      numberOfQuestions,
      questionType,
      sourceMaterial,
      status: 'pending',
    });

    await assignment.save();

    const jobId = assignment._id.toString();
    const job = await addGenerationJob(jobId);
    const jobPosition = await getJobPositionInQueue(job.id || jobId);

    emitToAssignment(jobId, 'job:queued', {
      assignmentId: jobId,
      position: jobPosition,
    });

    await cacheService.del('assignments:list');

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
    const cacheKey = 'assignments:list';
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      res.status(200).json({
        success: true,
        source: 'cache',
        assignments: JSON.parse(cachedData),
      });
      return;
    }

    const assignments = await Assignment.find().sort({ createdAt: -1 });

    await cacheService.set(cacheKey, JSON.stringify(assignments), 300);

    res.status(200).json({
      success: true,
      source: 'database',
      assignments,
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
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      assignment,
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
    const cacheKey = `result:${id}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      res.status(200).json({
        success: true,
        source: 'cache',
        ...JSON.parse(cachedData),
      });
      return;
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    const result = await Result.findOne({ assignmentId: id });

    const payload = {
      assignment,
      result,
    };

    if (result) {
      await cacheService.set(cacheKey, JSON.stringify(payload), 3600);
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
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
      return;
    }

    assignment.status = 'pending';
    assignment.error = undefined;
    await assignment.save();

    const job = await addGenerationJob(id);
    const jobPosition = await getJobPositionInQueue(job.id || id);

    await cacheService.del('assignments:list');
    await cacheService.del(`result:${id}`);

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
