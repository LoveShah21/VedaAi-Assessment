import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cognitiveLevel?: string;
}

export interface IResult extends Document {
  assignmentId: mongoose.Types.ObjectId;
  questions: IQuestion[];
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  questionText: { type: String, required: true },
  options: { type: [String] },
  correctAnswer: { type: String },
  explanation: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  cognitiveLevel: { type: String },
});

const ResultSchema: Schema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, unique: true },
    questions: { type: [QuestionSchema], required: true },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

export const Result = mongoose.model<IResult>('Result', ResultSchema);
