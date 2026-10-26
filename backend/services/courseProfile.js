const User = require("../models/User");
const Interview = require("../models/Interview");
const CourseActivity = require("../models/CourseActivity");

function levelFromProfile(profile) {
  const experience = String(profile.experienceLevel || "").toLowerCase();
  if (experience.includes("student") || experience.includes("fresh") || experience.includes("entry")) return "Beginner";
  if (experience.includes("senior") || experience.includes("lead")) return "Advanced";
  return "Intermediate";
}

async function buildCourseProfile(userId) {
  const user = await User.findById(userId).lean();
  const profile = (user && user.profile) || {};
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  const topics = [];
  const add = (text, weight, reason) => {
    const clean = String(text || "").trim();
    if (clean && clean.toLowerCase() !== "not specified") topics.push({ text: clean, weight, reason });
  };

  interests.forEach((interest) => add(interest, 1, "your interests"));
  add(profile.targetRole, 0.9, "your target role");
  String(profile.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 6)
    .forEach((skill) => add(skill, 0.6, "your resume skills"));

  const interviews = await Interview.find({ userId, status: "completed" })
    .sort({ completedAt: -1 }).limit(5).select("answers").lean();
  const weakAreas = [];
  for (const interview of interviews) {
    for (const answer of interview.answers || []) {
      const missing = answer.evaluation && answer.evaluation.missingPoints;
      if (Array.isArray(missing) && missing.length) {
        weakAreas.push({ score: Number(answer.score) || 0, text: missing.slice(0, 2).join(" ") });
      }
    }
  }
  weakAreas.sort((a, b) => a.score - b.score).slice(0, 4)
    .forEach((area) => add(area.text, 1, "gaps found in your interviews"));

  const activities = await CourseActivity.find({ userId, action: { $in: ["complete", "dislike"] } }).select("courseId").lean();
  return {
    interests, topics, level: levelFromProfile(profile),
    excludeIds: activities.map((activity) => activity.courseId), hasSignals: topics.length > 0,
  };
}

module.exports = { buildCourseProfile };
