// apps/backend/src/models/Result.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  number: number;
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
  answer: string;
}

export interface ISection {
  title: string;
  questionType: string;
  instruction: string;
  questions: IQuestion[];
}

export interface IResult extends Document {
  assignmentId: mongoose.Types.ObjectId;
  sections: ISection[];
  totalMarks: number;
  totalQuestions: number;
  generatedAt: Date;
  version: number;
  pdfUrl?: string;
}

const ResultSchema = new Schema<IResult>({
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  sections: [
    {
      title: { type: String, required: true },
      questionType: { type: String, required: true },
      instruction: { type: String, required: true },
      questions: [
        {
          number: { type: Number, required: true },
          text: { type: String, required: true },
          difficulty: {
            type: String,
            enum: ['Easy', 'Moderate', 'Hard'],
            required: true,
          },
          marks: { type: Number, required: true },
          answer: { type: String, required: true },
        },
      ],
    },
  ],
  totalMarks: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  generatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  pdfUrl: { type: String },
});

export const Result = mongoose.model<IResult>('Result', ResultSchema);
