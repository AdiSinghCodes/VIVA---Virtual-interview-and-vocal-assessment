const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Course = require("../models/Course");
const { buildStats, computeQuality } = require("../services/courseScoring");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function pick(row, names) {
  for (const name of names) if (row[name] !== undefined && row[name] !== "") return row[name];
  return "";
}
function number(value) {
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function level(value) {
  const text = String(value).toLowerCase();
  if (text.includes("begin")) return "Beginner";
  if (text.includes("inter")) return "Intermediate";
  if (text.includes("adv") || text.includes("expert")) return "Advanced";
  return "All Levels";
}
function mapRow(row, platform) {
  const title = pick(row, ["title", "course_title", "Course Name", "Title"]);
  const url = pick(row, ["url", "course_url", "Course URL", "URL"]);
  if (!title || !url || !/^https?:\/\//i.test(url)) return null;
  let rating = number(pick(row, ["rating", "course_rating", "Course Rating", "Rating"]));
  if (rating > 5 && rating <= 100) rating /= 20;
  const price = String(pick(row, ["price", "Price", "price_detail__amount"])).toLowerCase().trim();
  return {
    title: String(title).trim(), url: String(url).trim(), platform, source: "dataset", type: "course",
    description: String(pick(row, ["description", "Course Description", "course_description", "headline"])).slice(0, 600),
    level: level(pick(row, ["level", "course_difficulty", "Level", "Difficulty Level"])),
    skills: String(pick(row, ["skills", "Skills", "course_skills"])).split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean).slice(0, 12),
    rating, reviews: number(pick(row, ["reviews", "num_reviews", "course_students_enrolled", "Number of Reviews"])),
    free: price === "0" || price === "free" || price === "free course",
  };
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) throw new Error("Usage: node scripts/importCourseDataset.js <csv-path> [platform]");
  const file = path.resolve(fileArg);
  if (!fs.existsSync(file)) throw new Error(`CSV file not found: ${file}`);
  const courses = parseCsv(fs.readFileSync(file, "utf8"))
    .map((row) => mapRow(row, process.argv[3] || "Course Dataset")).filter(Boolean);
  if (!courses.length) throw new Error("No rows with recognized title and URL columns were found.");
  const stats = buildStats(courses);
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/viva_interview";
  await mongoose.connect(uri);
  await Course.init();
  const operations = courses.map((course) => ({ updateOne: {
    filter: { url: course.url },
    update: { $set: { ...course, qualityScore: computeQuality(course, stats) } },
    upsert: true,
  } }));
  for (let index = 0; index < operations.length; index += 1000) {
    await Course.bulkWrite(operations.slice(index, index + 1000), { ordered: false });
  }
  console.log(`Imported or updated ${courses.length} courses. Total catalog size: ${await Course.countDocuments()}.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exitCode = 1;
});
