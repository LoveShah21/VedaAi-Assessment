// apps/backend/src/models/Activity.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  type: 'assignment_created' | 'paper_generated' | 'pdf_downloaded' | 'regenerated' | 'assignment_deleted';
  assignmentId?: mongoose.Types.ObjectId;
  assignmentTitle?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivitySchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['assignment_created', 'paper_generated', 'pdf_downloaded', 'regenerated', 'assignment_deleted'],
      required: true,
    },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    assignmentTitle: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  }
);

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
