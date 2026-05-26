// apps/backend/src/controllers/settingsController.ts
import { Request, Response, NextFunction } from 'express';
import { UserSettings } from '../models/UserSettings';

export const getSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await UserSettings.findOne({});
    res.status(200).json(settings ?? {});
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await UserSettings.findOneAndUpdate(
      {},
      req.body,
      { upsert: true, new: true, runValidators: true }
    );
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};
