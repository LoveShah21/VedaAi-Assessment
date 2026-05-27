// apps/backend/src/controllers/resultController.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Result } from '../models/Result';
import { Assignment, IAssignment } from '../models/Assignment';
import { cacheService } from '../services/cacheService';
import * as pdfService from '../services/pdfService';

export const getResultById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Result not found',
      });
      return;
    }

    const result = await Result.findById(id);
    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Result not found',
      });
      return;
    }

    // Check Redis cache keyed by assignmentId
    const cacheKey = `result:${result.assignmentId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      res.status(200).json({
        success: true,
        source: 'cache',
        result: parsed.result ?? result,
      });
      return;
    }

    res.status(200).json({
      success: true,
      source: 'database',
      result,
    });
  } catch (error) {
    next(error);
  }
};

export const getResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    const cacheKey = `result:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }
    const result = await Result.findById(id);
    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const streamPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    const result = await Result.findById(id).populate('assignmentId');
    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    const assignment = result.assignmentId as unknown as IAssignment;
    
    // Override includeAnswerKey if query param provided
    const includeAnswerKey =
      req.query.includeAnswerKey !== undefined
        ? req.query.includeAnswerKey === 'true'
        : assignment.includeAnswerKey;
        
    const pdfBuffer = await pdfService.generatePdf(result, assignment, includeAnswerKey);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="question-paper.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
