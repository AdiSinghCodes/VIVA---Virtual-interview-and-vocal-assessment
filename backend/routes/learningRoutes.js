const router = require("express").Router();

const {
  getProfileContext,
  searchInternet,
  searchFiles,
  recommendCourses,
  askAI,
} = require("../controllers/learningController");

const { requireAuth } = require("../middleware/authMiddleware");
const courses = require("../controllers/coursesController");

router.get("/recommendations", requireAuth, courses.recommendations);
router.get("/certificates", requireAuth, courses.certificates);
router.get("/search", requireAuth, courses.search);
router.get("/saved", requireAuth, courses.saved);
router.post("/interests", requireAuth, courses.saveInterests);
router.post("/courses/:id/:action", requireAuth, courses.addActivity);
router.delete("/courses/:id/:action", requireAuth, courses.removeActivity);

// ============================================================
// PROFILE
// ============================================================

router.get(
  "/profile",
  requireAuth,
  getProfileContext
);

// ============================================================
// PERSONALIZED COURSES
// ============================================================

router.get(
  "/courses",
  requireAuth,
  recommendCourses
);

// ============================================================
// INTERNET COURSE / RESOURCE SEARCH
// ============================================================

// Frontend uses:
// /api/learning/internet-courses?query=...

router.get(
  "/internet-courses",
  requireAuth,
  searchInternet
);

// Keep /internet as an alias as well.
router.get(
  "/internet",
  requireAuth,
  searchInternet
);

// ============================================================
// USER FILE SEARCH
// ============================================================

router.get(
  "/files",
  requireAuth,
  searchFiles
);

// ============================================================
// ASK YOUR AI
// ============================================================

router.post(
  "/ask",
  requireAuth,
  askAI
);

module.exports = router;
