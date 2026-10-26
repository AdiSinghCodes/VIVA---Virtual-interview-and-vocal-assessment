const ApiCache = require("../models/ApiCache");

async function cached(key, ttlSeconds, loader) {
  const normalizedKey = String(key).toLowerCase().trim();
  const cachedEntry = await ApiCache.findOne({ key: normalizedKey }).lean();
  if (cachedEntry && cachedEntry.expireAt > new Date()) return cachedEntry.value;
  const value = await loader();
  if (value != null && (!Array.isArray(value) || value.length)) {
    await ApiCache.updateOne(
      { key: normalizedKey },
      { $set: { value, expireAt: new Date(Date.now() + ttlSeconds * 1000) } },
      { upsert: true },
    );
  }
  return value;
}

module.exports = { cached };
