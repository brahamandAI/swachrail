import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], required: true },
    station: { type: String, required: true },
    adminLock: { type: String },
    profile: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)
UserSchema.index({ adminLock: 1 }, { unique: true, sparse: true })

const TrainSchema = new Schema(
  {
    station: { type: String, required: true },
    number: { type: String, required: true },
  },
  { timestamps: true }
)
TrainSchema.index({ station: 1, number: 1 }, { unique: true })

const RecordSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    kind: { type: String, default: '' },
    station: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    at: { type: Date, required: true },
    by: { type: String, default: '' },
    byName: { type: String, default: '' },
    name: String,
    phone: String,
    pnr: String,
    train: String,
    coachType: String,
    coachNo: String,
    berth: String,
    quota: String,
    areas: [String],
    grades: Schema.Types.Mixed,
    rating: String,
    message: String,
    shift: String,
    designation: String,
    grade: String,
    janitorName: String,
    area: String,
    note: String,
    imagePath: String,
    beforePath: String,
    afterPath: String,
    lat: Number,
    lng: Number,
    placeName: String,
    coach: String,
    checks: Schema.Types.Mixed,
    platform: String,
    machine: Boolean,
    waste: Boolean,
    washed: Boolean,
    drain: Boolean,
  },
  { timestamps: true }
)

const SessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dutyDate: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const User = models.User || model('User', UserSchema)
export const Train = models.Train || model('Train', TrainSchema)
export const Record = models.Record || model('Record', RecordSchema)
export const Session = models.Session || model('Session', SessionSchema)
