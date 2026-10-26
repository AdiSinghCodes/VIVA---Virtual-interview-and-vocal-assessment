function buildStats(courses) {
  const rated = courses.filter((course) => course.rating > 0);
  const meanRating = rated.length ? rated.reduce((sum, course) => sum + course.rating, 0) / rated.length : 4;
  const maxReviews = courses.reduce((max, course) => Math.max(max, course.reviews || 0), 0);
  return { meanRating, maxReviews };
}

function computeQuality(course, stats, priorReviews = 50) {
  if (course.source === "curated") return 0.85;
  const count = course.reviews || 0;
  const bayesian = (count / (count + priorReviews)) * (course.rating || 0)
    + (priorReviews / (count + priorReviews)) * stats.meanRating;
  const ratingPart = Math.min(1, bayesian / 5);
  const popularity = stats.maxReviews ? Math.log10(1 + count) / Math.log10(1 + stats.maxReviews) : 0;
  return Number((0.7 * ratingPart + 0.3 * popularity).toFixed(4));
}

module.exports = { buildStats, computeQuality };
