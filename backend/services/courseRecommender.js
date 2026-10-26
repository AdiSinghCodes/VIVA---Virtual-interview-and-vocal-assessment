const Course = require("../models/Course");

const WEIGHTS = { relevance: 0.55, quality: 0.3, level: 0.15 };
const levelBonus = (courseLevel, userLevel) => (!courseLevel || courseLevel === "All Levels") ? 0.6 : (courseLevel === userLevel ? 1 : 0.3);

function toDTO(course, finalScore, reason = "") {
  return {
    id: String(course._id), title: course.title, description: String(course.description || "").slice(0, 240),
    url: course.url, platform: course.platform, source: course.platform, type: course.type || "course",
    level: course.level, skills: course.skills || [], rating: course.rating || 0, reviews: course.reviews || 0,
    free: Boolean(course.free), reason, score: finalScore === undefined ? undefined : Number(finalScore.toFixed(3)),
    credentialType: course.credentialType || "none", credentialAuthority: course.credentialAuthority || "",
    credentialScore: course.credentialScore || 0,
  };
}

function rank(candidates, userLevel, limit) {
  if (!candidates.length) return [];
  const maxRel = Math.max(...candidates.map((course) => course._rel), 0.0001);
  return candidates.map((course) => ({
    course,
    score: WEIGHTS.relevance * (course._rel / maxRel)
      + WEIGHTS.quality * (course.qualityScore || 0)
      + WEIGHTS.level * levelBonus(course.level, userLevel),
  })).sort((a, b) => b.score - a.score).slice(0, limit)
    .map(({ course, score }) => {
      const why = course._topic ? `Matches ${course._topic.reason}` : "Popular learning resource";
      const rating = course.rating > 0 ? `, rated ${course.rating.toFixed(1)}${course.reviews ? ` by ${course.reviews.toLocaleString()} learners` : ""}` : "";
      return toDTO(course, score, `${why}${rating}${course.free ? ", free" : ""}`);
    });
}

async function searchCandidates(query, filters = {}) {
  const find = {};
  if (filters.free) find.free = true;
  if (filters.level) find.level = filters.level;
  if (filters.platform) find.platform = filters.platform;
  if (filters.excludeIds && filters.excludeIds.length) find._id = { $nin: filters.excludeIds };

  if (!query) return Course.find(find).sort({ qualityScore: -1, title: 1 }).limit(100).lean();
  try {
    return await Course.find({ ...find, $text: { $search: query } }, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } }).limit(100).lean();
  } catch (error) {
    if (error.code !== 27 && !String(error.message).toLowerCase().includes("text index")) throw error;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const docs = await Course.find(find).limit(500).lean();
    return docs.map((course) => {
      const searchable = `${course.title} ${course.description} ${(course.skills || []).join(" ")}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (searchable.includes(term) ? 1 : 0), 0);
      return { ...course, score };
    }).filter((course) => course.score > 0).sort((a, b) => b.score - a.score).slice(0, 100);
  }
}

async function recommendForProfile(profile, limit = 24) {
  const pool = new Map();
  for (const topic of profile.topics) {
    const hits = await searchCandidates(topic.text, { excludeIds: profile.excludeIds });
    for (const hit of hits) {
      const relevance = (hit.score || 0) * topic.weight;
      const key = String(hit._id);
      const previous = pool.get(key);
      if (!previous || relevance > previous._rel) pool.set(key, { ...hit, _rel: relevance, _topic: topic });
    }
  }
  return rank([...pool.values()], profile.level, limit);
}

async function searchForUser(query, filters, profile, limit = 30) {
  const hits = await searchCandidates(query, filters);
  return rank(hits.map((hit) => ({ ...hit, _rel: hit.score || 0, _topic: { reason: "your search" } })), profile.level, limit);
}

async function popular(limit = 24) {
  const docs = await Course.find().sort({ qualityScore: -1, title: 1 }).limit(limit).lean();
  return docs.map((doc) => toDTO(doc, undefined, "Popular learning resource"));
}

module.exports = { recommendForProfile, searchForUser, popular, toDTO };
