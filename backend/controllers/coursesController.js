const mongoose = require("mongoose");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseActivity = require("../models/CourseActivity");
const { cached } = require("../services/apiCache");
const { searchYouTube } = require("../services/youtubeService");
const { buildCourseProfile } = require("../services/courseProfile");
const { recommendForProfile, searchForUser, popular, toDTO } = require("../services/courseRecommender");

const ACTIONS = ["view", "save", "complete", "dislike"];

exports.recommendations = async (req, res) => {
  try {
    const profile = await buildCourseProfile(req.userId);
    let items = profile.hasSignals ? await recommendForProfile(profile, 24) : [];
    if (!items.length) items = await popular(24);
    const saved = await CourseActivity.find({ userId: req.userId, action: "save" }).select("courseId").lean();
    res.json({ success: true, items, interests: profile.interests, savedIds: saved.map((item) => String(item.courseId)), basedOn: profile.topics.map((topic) => topic.text).slice(0, 8) });
  } catch (error) {
    console.error("Course recommendations error:", error.message);
    res.status(500).json({ message: "Could not load course recommendations." });
  }
};

exports.search = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim().slice(0, 120);
    if (!query && !req.query.platform && !req.query.level && req.query.free !== "true") return res.status(400).json({ message: "Search query or course filter is required." });
    const filters = {
      free: req.query.free === "true",
      level: ["Beginner", "Intermediate", "Advanced", "All Levels"].includes(req.query.level) ? req.query.level : "",
      platform: String(req.query.platform || "").trim().slice(0, 60),
    };
    const profile = await buildCourseProfile(req.userId);
    const items = await searchForUser(query, filters, profile, 30);
    let youtube = [];
    if (query) {
      try {
        youtube = await cached(`yt:${query}`, 24 * 60 * 60, () => searchYouTube(query, 8));
      } catch (youtubeError) {
        console.error("YouTube course search failed:", youtubeError.response?.data || youtubeError.message);
      }
    }
    res.json({ success: true, query, items, youtube });
  } catch (error) {
    console.error("Course search error:", error.message);
    res.status(500).json({ message: "Course search failed." });
  }
};

exports.certificates = async (_req, res) => {
  try {
    const items = await Course.find({ credentialType: { $in: ["academic", "professional", "completion"] } })
      .sort({ credentialScore: -1, qualityScore: -1, title: 1 }).lean();
    res.json({ success: true, items: items.map((course) => toDTO(course, undefined, "Credential-bearing course")) });
  } catch (error) {
    res.status(500).json({ message: "Could not load certificate courses." });
  }
};

exports.saveInterests = async (req, res) => {
  try {
    const raw = Array.isArray(req.body.interests) ? req.body.interests : [];
    const interests = [...new Set(raw.map((item) => String(item).trim().slice(0, 40)).filter(Boolean))].slice(0, 15);
    await User.findByIdAndUpdate(req.userId, { $set: { "profile.interests": interests } });
    res.json({ success: true, interests });
  } catch (error) {
    res.status(500).json({ message: "Could not save interests." });
  }
};

exports.addActivity = async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!mongoose.isValidObjectId(id) || !ACTIONS.includes(action)) return res.status(400).json({ message: "Invalid course activity." });
    if (!(await Course.exists({ _id: id }))) return res.status(404).json({ message: "Course not found." });
    await CourseActivity.updateOne({ userId: req.userId, courseId: id, action }, { $setOnInsert: { userId: req.userId, courseId: id, action } }, { upsert: true });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 11000) return res.json({ success: true });
    res.status(500).json({ message: "Could not save course activity." });
  }
};

exports.removeActivity = async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!mongoose.isValidObjectId(id) || !["save", "complete", "dislike"].includes(action)) return res.status(400).json({ message: "Invalid course activity." });
    await CourseActivity.deleteOne({ userId: req.userId, courseId: id, action });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Could not remove course activity." });
  }
};

exports.saved = async (req, res) => {
  try {
    const activities = await CourseActivity.find({ userId: req.userId, action: "save" }).sort({ createdAt: -1 }).select("courseId").lean();
    const courses = await Course.find({ _id: { $in: activities.map((activity) => activity.courseId) } }).lean();
    const byId = new Map(courses.map((course) => [String(course._id), course]));
    res.json({ success: true, items: activities.map((activity) => byId.get(String(activity.courseId))).filter(Boolean).map((course) => toDTO(course, undefined, "Saved by you")) });
  } catch (error) {
    res.status(500).json({ message: "Could not load saved courses." });
  }
};
