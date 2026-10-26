const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  section: { type: String, enum: ['verbal', 'coding', 'sql'], required: true },
  questionType: String,
  crossQuestion: Boolean,
  question: String,
  questionPayload: mongoose.Schema.Types.Mixed,
  answer: String,
  transcript: String,
  codingSubmission: mongoose.Schema.Types.Mixed,
  followUp: Boolean,
  followUpReason: String,
  evaluation: mongoose.Schema.Types.Mixed,
  score: Number,
  answeredAt: Date,
}, { _id: true });

const InterviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  setup: { type: mongoose.Schema.Types.Mixed, required: true },
  candidateResumeSummary: { type: String, default: '' },
  status: { type: String, enum: ['created', 'active', 'completed', 'cancelled'], default: 'created' },
  startedAt: Date,
  completedAt: Date,
  durationSeconds: Number,
  answers: [AnswerSchema],
  questionBank: [mongoose.Schema.Types.Mixed],
  preparedQuestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  preparedQuestionIndex: { type: Number, default: 0 },
  questionPreparationStatus: {
    type: String,
    enum: ['idle', 'preparing', 'ready', 'failed'],
    default: 'idle',
  },
  questionPreparationError: { type: String, default: '' },
  adaptiveBreakCompleted: { type: Boolean, default: false },
  summary: mongoose.Schema.Types.Mixed,
  finalScore: Number,
  questionCount: Number,
}, { timestamps: true });

module.exports = mongoose.model('Interview', InterviewSchema);
