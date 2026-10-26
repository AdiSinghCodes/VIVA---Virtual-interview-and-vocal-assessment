const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    uploadedAt: { type: Date, default: null },
    text: { type: String, default: "" }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    targetRole: { type: String, default: "", trim: true },
    experienceLevel: { type: String, default: "Student", trim: true },
    yearsExperience: { type: String, default: "", trim: true },
    currentRole: { type: String, default: "", trim: true },
    summary: { type: String, default: "", trim: true },
    skills: { type: String, default: "", trim: true },
    interests: { type: [String], default: [] },
    degree: { type: String, default: "", trim: true },
    university: { type: String, default: "", trim: true },
    graduationYear: { type: String, default: "", trim: true },
    interviewType: { type: String, default: "Technical + Behavioral", trim: true },
    difficulty: { type: String, default: "Intermediate", trim: true },
    language: { type: String, default: "English", trim: true },
    linkedin: { type: String, default: "", trim: true },
    github: { type: String, default: "", trim: true },
    portfolio: { type: String, default: "", trim: true },
    resume: { type: resumeSchema, default: () => ({}) }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    companyName: { type: String, default: "", trim: true },
    profileCompleted: { type: Boolean, default: false },
    profile: { type: profileSchema, default: () => ({}) }
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);
