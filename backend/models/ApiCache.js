const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  expireAt: { type: Date, required: true },
});
schema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("ApiCache", schema);
