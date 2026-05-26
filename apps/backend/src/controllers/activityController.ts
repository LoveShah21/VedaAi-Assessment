import { Request, Response, NextFunction } from 'express';
import { Activity } from '../models/Activity';

export const getActivities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};
