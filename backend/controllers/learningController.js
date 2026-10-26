const axios = require("axios");
const User = require("../models/User");

/* ============================================================
   USER / PROFILE HELPERS
============================================================ */

function getUserId(req) {
  return (
    req.userId ||
    req.user?.id ||
    req.user?._id ||
    req.auth?.id ||
    req.auth?.userId
  );
}

function getName(user) {
  return (
    user?.profile?.fullName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`
  ).trim() || "Candidate";
}

function getProfile(user) {
  const p = user?.profile || {};

  let skills = p.skills || [];

  if (typeof skills === "string") {
    skills = skills
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(skills)) {
    skills = [];
  }

  return {
    name: getName(user),

    targetRole:
      p.targetRole ||
      user?.targetRole ||
      "Not specified",

    experience:
      p.experienceLevel ||
      p.experience ||
      "Not specified",

    yearsExperience:
      p.yearsExperience ||
      "",

    currentRole:
      p.currentRole ||
      "Not specified",

    skills,

    degree:
      p.degree ||
      "",

    university:
      p.university ||
      "",

    summary:
      p.summary ||
      "",
  };
}

function profileContext(user) {
  const p = getProfile(user);

  return [
    `Name: ${p.name}`,
    `Target role: ${p.targetRole}`,
    `Experience: ${p.experience} ${p.yearsExperience}`.trim(),
    `Current role: ${p.currentRole}`,
    `Skills: ${
      p.skills.length
        ? p.skills.join(", ")
        : "Not specified"
    }`,
    `Education: ${p.degree} ${p.university}`.trim(),
    `Summary: ${p.summary || "Not specified"}`,
  ].join("\n");
}

/* ============================================================
   GET PROFILE CONTEXT
============================================================ */

async function getProfileContext(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const user =
      await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const profile =
      getProfile(user);

    return res.json({
      profile,
      context:
        profileContext(user),
    });
  } catch (error) {
    console.error(
      "Profile context error:",
      error.message
    );

    return res.status(500).json({
      message:
        "Could not load profile context.",
    });
  }
}

/* ============================================================
   SIMPLE PROFILE LOADER
============================================================ */

async function loadUser(req) {
  const userId = getUserId(req);

  if (!userId) {
    throw new Error(
      "Authentication required."
    );
  }

  const user =
    await User.findById(userId).lean();

  if (!user) {
    throw new Error(
      "User not found."
    );
  }

  return user;
}

/* ============================================================
   CLEAN / ENCODE
============================================================ */

function clean(value = "") {
  return String(value)
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250);
}

function encode(value = "") {
  return encodeURIComponent(
    clean(value)
  );
}

/* ============================================================
   BUILD ZERO-API LEARNING RESOURCES
============================================================ */

/*
  IMPORTANT:

  This function DOES NOT call:

  - Google API
  - YouTube API
  - Serper
  - Bing API
  - DuckDuckGo
  - Any scraping service

  It simply creates search URLs.

  Therefore any search term works.
*/

function buildResources(query) {
  const search = clean(query);

  const q = encode(search);

  return [
    /* --------------------------------------------------------
       YOUTUBE TUTORIALS
    -------------------------------------------------------- */

    {
      id: "youtube-tutorials",

      title:
        `${search} Tutorials`,

      description:
        `Find YouTube tutorials for ${search}.`,

      type: "youtube",

      platform: "YouTube",

      source: "YouTube",

      icon: "play",

      url:
        `https://www.youtube.com/results?search_query=` +
        `${q}+tutorial`,

      external: true,
    },

    /* --------------------------------------------------------
       YOUTUBE PLAYLISTS
    -------------------------------------------------------- */

    {
      id: "youtube-playlists",

      title:
        `${search} Full Course Playlists`,

      description:
        `Find complete ${search} courses and playlists on YouTube.`,

      type:
        "youtube_playlist",

      platform:
        "YouTube",

      source:
        "YouTube",

      icon:
        "playlist",

      url:
        `https://www.youtube.com/results?search_query=` +
        `${q}+full+course+playlist`,

      external: true,
    },

    /* --------------------------------------------------------
       COURSERA
    -------------------------------------------------------- */

    {
      id: "coursera",

      title:
        `${search} Courses`,

      description:
        `Find structured ${search} courses on Coursera.`,

      type:
        "course",

      platform:
        "Coursera",

      source:
        "Coursera",

      icon:
        "graduation",

      url:
        `https://www.google.com/search?q=` +
        `site%3Acoursera.org+${q}+course`,

      external: true,
    },

    /* --------------------------------------------------------
       UDEMY
    -------------------------------------------------------- */

    {
      id: "udemy",

      title:
        `${search} Courses on Udemy`,

      description:
        `Find practical and project-based ${search} courses.`,

      type:
        "course",

      platform:
        "Udemy",

      source:
        "Udemy",

      icon:
        "book",

      url:
        `https://www.google.com/search?q=` +
        `site%3Audemy.com+${q}+course`,

      external: true,
    },

    /* --------------------------------------------------------
       EDX
    -------------------------------------------------------- */

    {
      id: "edx",

      title:
        `${search} Courses on edX`,

      description:
        `Find academic and professional ${search} courses.`,

      type:
        "course",

      platform:
        "edX",

      source:
        "edX",

      icon:
        "graduation",

      url:
        `https://www.google.com/search?q=` +
        `site%3Aedx.org+${q}+course`,

      external: true,
    },

    /* --------------------------------------------------------
       FREE COURSES
    -------------------------------------------------------- */

    {
      id: "free-courses",

      title:
        `Free ${search} Courses`,

      description:
        `Find free ${search} courses, tutorials and resources.`,

      type:
        "free",

      platform:
        "Web",

      source:
        "Google",

      icon:
        "sparkles",

      url:
        `https://www.google.com/search?q=` +
        `${q}+free+course+tutorial`,

      external: true,
    },

    /* --------------------------------------------------------
       DOCUMENTATION
    -------------------------------------------------------- */

    {
      id: "documentation",

      title:
        `${search} Documentation`,

      description:
        `Find official documentation and technical references.`,

      type:
        "docs",

      platform:
        "Web",

      source:
        "Google",

      icon:
        "book",

      url:
        `https://www.google.com/search?q=` +
        `${q}+official+documentation`,

      external: true,
    },

    /* --------------------------------------------------------
       GENERAL WEB
    -------------------------------------------------------- */

    {
      id: "web-search",

      title:
        `More ${search} Resources`,

      description:
        `Search the web for articles, guides, tutorials and resources.`,

      type:
        "web",

      platform:
        "Web",

      source:
        "Google",

      icon:
        "globe",

      url:
        `https://www.google.com/search?q=${q}`,

      external: true,
    },
  ];
}

/* ============================================================
   QUICK SEARCH LINKS
============================================================ */

function buildQuickSearches(query) {
  const q =
    encode(query);

  return {
    all:
      `https://www.google.com/search?q=${q}`,

    youtube:
      `https://www.youtube.com/results?search_query=${q}`,

    tutorials:
      `https://www.youtube.com/results?search_query=${q}+tutorial`,

    playlists:
      `https://www.youtube.com/results?search_query=${q}+playlist`,

    fullCourse:
      `https://www.youtube.com/results?search_query=${q}+full+course`,

    courses:
      `https://www.google.com/search?q=${q}+online+course`,

    coursera:
      `https://www.google.com/search?q=site%3Acoursera.org+${q}+course`,

    udemy:
      `https://www.google.com/search?q=site%3Audemy.com+${q}+course`,

    edx:
      `https://www.google.com/search?q=site%3Aedx.org+${q}+course`,

    free:
      `https://www.google.com/search?q=${q}+free+course`,

    documentation:
      `https://www.google.com/search?q=${q}+official+documentation`,
  };
}

/* ============================================================
   INTERNET SEARCH
============================================================ */

/*
  GET:

  /api/learning/internet?query=system%20design

  This does NOT use an API.
*/

async function internetCourses(req, res) {
  try {
    const query =
      clean(
        req.query.query ||
        ""
      );

    if (!query) {
      return res.status(400).json({
        message:
          "Search query is required.",
      });
    }

    console.log(
      `[Learning] Search: ${query}`
    );

    const resources =
      buildResources(query);

    const youtube =
      resources.filter(
        (item) =>
          item.type ===
            "youtube" ||
          item.type ===
            "youtube_playlist"
      );

    const courses =
      resources.filter(
        (item) =>
          item.type ===
          "course"
      );

    const free =
      resources.filter(
        (item) =>
          item.type ===
          "free"
      );

    const documentation =
      resources.filter(
        (item) =>
          item.type ===
          "docs"
      );

    const web =
      resources.filter(
        (item) =>
          item.type ===
          "web"
      );

    return res.json({
      success: true,

      query,

      total:
        resources.length,

      resources,

      youtube,

      courses,

      free,

      documentation,

      web,

      /*
        Compatibility aliases
      */

      videos:
        resources.filter(
          (item) =>
            item.type ===
            "youtube"
        ),

      playlists:
        resources.filter(
          (item) =>
            item.type ===
            "youtube_playlist"
        ),

      internetCourses:
        courses,

      quickSearch:
        buildQuickSearches(
          query
        ),

      mode:
        "zero-api",
    });
  } catch (error) {
    console.error(
      "Internet course search error:",
      error.message
    );

    return res.status(500).json({
      message:
        "Internet search failed.",
    });
  }
}

/* ============================================================
   SEARCH INTERNET ALIAS
============================================================ */

async function searchInternet(
  req,
  res
) {
  return internetCourses(
    req,
    res
  );
}

/* ============================================================
   PERSONALIZED COURSES
============================================================ */

async function recommendCourses(
  req,
  res
) {
  try {
    const user =
      await loadUser(req);

    const profile =
      getProfile(user);

    const topics = [];

    /*
      Target role
    */

    if (
      profile.targetRole &&
      profile.targetRole !==
        "Not specified"
    ) {
      topics.push(
        profile.targetRole
      );
    }

    /*
      User skills
    */

    for (
      const skill of profile.skills
    ) {
      if (skill) {
        topics.push(skill);
      }
    }

    /*
      Defaults
    */

    if (!topics.length) {
      topics.push(
        "software development",
        "programming",
        "web development"
      );
    }

    /*
      Remove duplicates
    */

    const uniqueTopics = [
      ...new Set(
        topics.map(clean)
      ),
    ].filter(Boolean);

    /*
      Maximum 8 recommendation
      topics
    */

    const recommendations =
      uniqueTopics
        .slice(0, 8)
        .map((topic) => ({
          topic,

          resources:
            buildResources(
              topic
            ),
        }));

    return res.json({
      success: true,

      profile,

      recommendations,

      total:
        recommendations.length,

      mode:
        "zero-api",
    });
  } catch (error) {
    console.error(
      "Recommend courses error:",
      error.message
    );

    return res.status(500).json({
      message:
        "Could not generate personalized courses.",
    });
  }
}

/* ============================================================
   FILE / RESUME SEARCH
============================================================ */

async function fileSearch(req, res) {
  try {
    const user =
      await loadUser(req);

    const query =
      String(
        req.query.query ||
        ""
      )
        .trim()
        .toLowerCase();

    const text =
      String(
        user.profile?.resume
          ?.text ||
        ""
      );

    const fileName =
      user.profile?.resume
        ?.fileName ||
      "Resume";

    /*
      No resume
    */

    if (!text) {
      return res.json({
        query,

        results: [],

        message:
          "No uploaded resume content found.",
      });
    }

    /*
      Empty query
    */

    if (!query) {
      return res.json({
        query: "",

        results: [
          {
            title:
              fileName,

            snippet:
              text.slice(
                0,
                1200
              ),

            match:
              "Resume",
          },
        ],
      });
    }

    /*
      Search terms
    */

    const terms =
      query
        .split(/\s+/)
        .filter(
          (term) =>
            term.length > 1
        );

    /*
      Split resume into
      sentences/lines
    */

    const sentences =
      text
        .replace(
          /\r/g,
          " "
        )
        .split(
          /(?<=[.!?])\s+|\n+/
        );

    /*
      Score sentences
    */

    const scored =
      sentences
        .map(
          (sentence) => {
            const lower =
              sentence.toLowerCase();

            const score =
              terms.reduce(
                (
                  total,
                  term
                ) =>
                  total +
                  (
                    lower.includes(
                      term
                    )
                      ? 1
                      : 0
                  ),
                0
              );

            return {
              sentence,
              score,
            };
          }
        )
        .filter(
          (item) =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        )
        .slice(0, 8);

    return res.json({
      query,

      results:
        scored.map(
          (item) => ({
            title:
              fileName,

            snippet:
              item.sentence
                .trim()
                .slice(
                  0,
                  900
                ),

            match:
              `${item.score} matching term${
                item.score > 1
                  ? "s"
                  : ""
              }`,
          })
        ),
    });
  } catch (error) {
    console.error(
      "File search error:",
      error.message
    );

    return res.status(500).json({
      message:
        "File search failed.",
    });
  }
}

/*
  Alias used by routes
*/

async function searchFiles(
  req,
  res
) {
  return fileSearch(
    req,
    res
  );
}

/* ============================================================
   ASK YOUR DOUBT AI
   *** GROQ IS PRESERVED ***
============================================================ */

/*
  POST:

  /api/learning/ask

  Body:

  {
    "question": "Explain system design"
  }

  This DOES use Groq.
*/

async function askAI(req, res) {
  try {
    const question =
      String(
        req.body?.question ||
        ""
      ).trim();

    if (!question) {
      return res.status(400).json({
        message:
          "Question is required.",
      });
    }

    /*
      Load user
    */

    const user =
      await loadUser(req);

    /*
      Groq API key
    */

    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message:
          "GROQ_API_KEY is not configured in backend/.env",
      });
    }

    /*
      Candidate context
    */

    const context =
      profileContext(user);

    /*
      AI system prompt
    */

    const systemPrompt = `
You are VIVA, an AI learning assistant inside
an interview preparation platform.

Your job is to help the student understand:

- Programming
- Computer Science
- Software Engineering
- Coding
- SQL
- System Design
- Machine Learning
- Web Development
- Cloud
- DevOps
- Interviews
- Career topics

Give clear, accurate and practical answers.

For technical questions:
- Explain concepts simply.
- Give examples when useful.
- Give interview-ready explanations.
- Mention time and space complexity when relevant.
- Explain trade-offs when relevant.
- For SQL questions, provide correct SQL.
- For coding questions, provide correct code.
- For system design questions, explain architecture,
  components, data flow and trade-offs.
- Do not make up information.
- Do not claim to have accessed information
  that you did not access.
- Keep the answer focused on the student's question.

Student profile:

${context}
`;

    /*
      GROQ REQUEST
    */

    const response =
      await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",

        {
          model:
            process.env.GROQ_MODEL ||
            process.env.INTERVIEW_LLM_MODEL ||
            "openai/gpt-oss-120b",

          messages: [
            {
              role:
                "system",

              content:
                systemPrompt,
            },

            {
              role:
                "user",

              content:
                question,
            },
          ],

          temperature:
            0.4,

          max_tokens:
            2000,
        },

        {
          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",
          },

          timeout:
            60000,
        }
      );

    /*
      Extract answer
    */

    const answer =
      response.data
        ?.choices?.[0]
        ?.message
        ?.content
        ?.trim() ||
      "I could not generate an answer.";

    /*
      Return answer
    */

    return res.json({
      answer,

      user: {
        id:
          user._id,

        name:
          getName(user),
      },

      model:
        response.data?.model ||
        process.env.GROQ_MODEL ||
        process.env.INTERVIEW_LLM_MODEL ||
        "openai/gpt-oss-120b",
    });
  } catch (error) {
    console.error(
      "Ask AI error:",

      error.response
        ?.data ||
        error.message
    );

    return res.status(500).json({
      message:
        "Failed to get AI response.",

      error:
        error.response
          ?.data
          ?.error
          ?.message ||
        error.message ||
        "Unknown error",
    });
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getProfileContext,

  searchInternet,

  internetCourses,

  searchFiles,

  fileSearch,

  recommendCourses,

  askAI,
};