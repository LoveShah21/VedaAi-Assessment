import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  teacherName: string;
  schoolName: string;
  city: string;
  board: string;
  defaultTimeAllowed: number;
  defaultDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  includeAnswerKeyDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema: Schema = new Schema(
  {
    teacherName: { type: String, default: 'John Doe' },
    schoolName: { type: String, default: '' },
    city: { type: String, default: '' },
    board: { type: String, default: 'CBSE' },
    defaultTimeAllowed: { type: Number, default: 60 },
    defaultDifficulty: {
      easy: { type: Number, default: 40 },
      medium: { type: Number, default: 40 },
      hard: { type: Number, default: 20 },
    },
    includeAnswerKeyDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
