// apps/backend/src/models/Assignment.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionType {
  type: string;
  count: number;
  marksPerQuestion: number;
}

export interface IDifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface IAssignment extends Document {
  title: string;
  subject: string;
  className: string;
  schoolName: string;
  timeAllowed: number;
  dueDate: Date;
  questionTypes: IQuestionType[];
  difficultyDistribution: IDifficultyDistribution;
  additionalInstructions: string;
  uploadedFileUrl?: string;
  extractedText?: string;
  includeAnswerKey: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  jobId?: string;
  resultId?: mongoose.Types.ObjectId;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    className: { type: String, required: true },
    schoolName: { type: String, required: true },
    timeAllowed: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    questionTypes: [
      {
        type: { type: String, required: true },
        count: { type: Number, required: true },
        marksPerQuestion: { type: Number, required: true },
      },
    ],
    difficultyDistribution: {
      easy: { type: Number, required: true },
      medium: { type: Number, required: true },
      hard: { type: Number, required: true },
    },
    additionalInstructions: { type: String, default: '' },
    uploadedFileUrl: { type: String },
    extractedText: { type: String },
    includeAnswerKey: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    error: { type: String },

    jobId: { type: String },
    resultId: { type: Schema.Types.ObjectId, ref: 'Result' },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
