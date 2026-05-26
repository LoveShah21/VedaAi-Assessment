import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  className: string;
  subject: string;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    studentCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
