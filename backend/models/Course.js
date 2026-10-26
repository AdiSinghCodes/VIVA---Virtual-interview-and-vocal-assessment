const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  platform: { type: String, default: "Unknown" },
  source: { type: String, default: "curated" },
  url: { type: String, required: true },
  type: { type: String, default: "course" },
  level: { type: String, default: "All Levels" },
  skills: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  free: { type: Boolean, default: false },
  qualityScore: { type: Number, default: 0 },
  credentialType: { type: String, enum: ["academic", "professional", "completion", "none"], default: "none" },
  credentialAuthority: { type: String, default: "" },
  credentialScore: { type: Number, default: 0 },
}, { timestamps: true });

courseSchema.index({ url: 1 }, { unique: true });
courseSchema.index({ title: "text", skills: "text", description: "text" }, { weights: { title: 5, skills: 4, description: 1 } });

module.exports = mongoose.model("Course", courseSchema);
