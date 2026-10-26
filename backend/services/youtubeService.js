const axios = require("axios");

function durationMinutes(duration) {
  const match = String(duration || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0) + Number(match[3] || 0) / 60;
}

async function searchYouTube(query, maxResults = 8) {
  const key = String(process.env.YOUTUBE_API_KEY || "").trim();
  if (!key) return [];
  const base = "https://www.googleapis.com/youtube/v3";
  const searchResponse = await axios.get(`${base}/search`, {
    params: { key, part: "snippet", q: `${query} full course tutorial`, type: "video", videoDuration: "long", maxResults, relevanceLanguage: "en", safeSearch: "strict" },
    timeout: 10000,
  });
  const ids = (searchResponse.data.items || []).map((item) => item.id.videoId).filter(Boolean);
  if (!ids.length) return [];
  const videoResponse = await axios.get(`${base}/videos`, {
    params: { key, part: "snippet,statistics,contentDetails", id: ids.join(",") }, timeout: 10000,
  });
  return (videoResponse.data.items || []).map((item) => {
    const views = Number(item.statistics.viewCount || 0);
    const minutes = durationMinutes(item.contentDetails.duration);
    return {
      id: `yt-${item.id}`, title: item.snippet.title,
      description: String(item.snippet.description || "").slice(0, 200),
      url: `https://www.youtube.com/watch?v=${item.id}`, platform: "YouTube",
      source: item.snippet.channelTitle, type: "youtube", level: "All Levels",
      free: true, reviews: views, rating: 0,
      durationMinutes: minutes,
      duration: minutes ? `${Math.round(minutes)} min` : "",
      quality: Number((Math.min(1, Math.log10(1 + views) / 7)).toFixed(3)),
    };
  }).filter((item) => item.durationMinutes >= 20)
    .sort((a, b) => b.quality - a.quality)
    .map(({ durationMinutes: _minutes, ...item }) => item);
}

module.exports = { searchYouTube };
