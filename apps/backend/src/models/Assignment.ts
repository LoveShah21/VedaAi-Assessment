import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  questionType: 'mcq' | 'short' | 'long' | 'mixed';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  sourceMaterial?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    gradeLevel: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    numberOfQuestions: { type: Number, required: true, min: 1 },
    questionType: { type: String, enum: ['mcq', 'short', 'long', 'mixed'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    error: { type: String },
    sourceMaterial: { type: String },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
