import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Group } from '../models/Group';

export const createGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, className, subject, studentCount } = req.body;
    const group = new Group({
      name,
      className,
      subject,
      studentCount,
    });
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
};

export const getGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Group not found',
      });
      return;
    }
    const group = await Group.findByIdAndDelete(id);
    if (!group) {
      res.status(404).json({
        success: false,
        message: 'Group not found',
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
