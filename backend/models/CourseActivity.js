const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  action: { type: String, enum: ["view", "save", "complete", "dislike"], required: true },
}, { timestamps: true });

schema.index({ userId: 1, courseId: 1, action: 1 }, { unique: true });
module.exports = mongoose.model("CourseActivity", schema);
