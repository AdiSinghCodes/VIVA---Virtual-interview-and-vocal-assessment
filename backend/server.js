const dns = require("dns");

// ============================================================
// FIX MONGODB ATLAS SRV DNS RESOLUTION
// ============================================================

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_e) {
  // Ignore DNS override errors on Windows
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const liveInterviewRoutes = require("./routes/liveInterviewRoutes");

// NEW: Learning / Courses / AI routes
const learningRoutes = require("./routes/learningRoutes");
const Course = require("./models/Course");
const { buildStats, computeQuality } = require("./services/courseScoring");

// ============================================================
// CONFIG
// ============================================================

const PORT = Number(process.env.PORT || 4000);

const PROCTOR_PORT = Number(
  process.env.PROCTOR_PORT || 5000
);

const INTERVIEW_AGENT_PORT = Number(
  process.env.INTERVIEW_AGENT_PORT || 5100
);

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/viva_interview";

const CLIENT_URL =
  process.env.CLIENT_URL ||
  "http://localhost:8443";

function getPythonExecutable() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;

  const projectVenvPython = path.join(
    __dirname,
    "..",
    "myenv",
    "Scripts",
    "python.exe"
  );

  if (process.platform === "win32" && fs.existsSync(projectVenvPython)) {
    return projectVenvPython;
  }

  return process.platform === "win32" ? "python" : "python3";
}

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "10mb",
  })
);

// ============================================================
// STATIC UPLOADED FILES
// ============================================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "VIVA API",
    apiPort: PORT,
    proctorPort: PROCTOR_PORT,
    interviewAgentPort: INTERVIEW_AGENT_PORT,
    mongoConnected:
      mongoose.connection.readyState === 1,
  });
});

// ============================================================
// NORMAL ROUTES
// ============================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/resume",
  resumeRoutes
);

app.use(
  "/api/interviews",
  interviewRoutes
);

// ============================================================
// LIVE AI INTERVIEW ROUTES
// ============================================================

app.use(
  "/api/live-interviews",
  liveInterviewRoutes
);

// ============================================================
// LEARNING / COURSES / AI ROUTES
// ============================================================
//
// Available endpoints:
//
// GET  /api/learning/profile
// GET  /api/learning/courses
// GET  /api/learning/internet
// GET  /api/learning/files
// POST /api/learning/ask
//
// ============================================================

app.use(
  "/api/learning",
  learningRoutes
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (err, _req, res, _next) => {
    console.error(
      "Server error:",
      err
    );

    res.status(
      err.status || 400
    ).json({
      message:
        err.message ||
        "Request failed.",
    });
  }
);

// ============================================================
// PYTHON PROCESSES
// ============================================================

let proctor = null;
let interviewAgent = null;

// ============================================================
// PYTHON PROCESS READY STATES
// ============================================================

let proctorReady = false;
let interviewAgentReady = false;

// ============================================================
// WAIT FOR PORT
// ============================================================

function waitForPort(
  port,
  host = "127.0.0.1",
  timeout = 30000
) {
  return new Promise(
    (resolve, reject) => {
      const startTime = Date.now();

      function check() {
        const socket =
          new net.Socket();

        let finished = false;

        const cleanup = () => {
          socket.removeAllListeners();
          socket.destroy();
        };

        socket.setTimeout(1000);

        socket.once(
          "connect",
          () => {
            if (finished) return;

            finished = true;
            cleanup();

            resolve();
          }
        );

        socket.once(
          "error",
          () => {
            if (finished) return;

            finished = true;
            cleanup();

            if (
              Date.now() - startTime >=
              timeout
            ) {
              reject(
                new Error(
                  `Port ${port} did not become ready within ${
                    timeout / 1000
                  } seconds`
                )
              );
            } else {
              setTimeout(
                check,
                500
              );
            }
          }
        );

        socket.once(
          "timeout",
          () => {
            if (finished) return;

            finished = true;
            cleanup();

            if (
              Date.now() - startTime >=
              timeout
            ) {
              reject(
                new Error(
                  `Port ${port} did not become ready within ${
                    timeout / 1000
                  } seconds`
                )
              );
            } else {
              setTimeout(
                check,
                500
              );
            }
          }
        );

        socket.connect(
          port,
          host
        );
      }

      check();
    }
  );
}

// ============================================================
// START PYTHON PROCTOR
// ============================================================

function startProctor() {
  if (
    process.env.START_PROCTOR ===
    "false"
  ) {
    console.log(
      "Python proctor disabled."
    );

    proctorReady = false;

    return;
  }

  const script =
    path.join(
      __dirname,
      "proctor_server.py"
    );

  if (!fs.existsSync(script)) {
    console.warn(
      "proctor_server.py not found. Proctor was not started."
    );

    proctorReady = false;

    return;
  }

  const python = getPythonExecutable();

  console.log(
    `Starting Python proctor on port ${PROCTOR_PORT}...`
  );

  proctor = spawn(
    python,
    [script],
    {
      cwd: __dirname,

      env: {
        ...process.env,

        PROCTOR_PORT:
          String(PROCTOR_PORT),
      },

      stdio: "inherit",
    }
  );

  proctor.on(
    "error",
    (error) => {
      proctorReady = false;

      console.error(
        "Could not start proctor:",
        error.message
      );
    }
  );

  proctor.on(
    "exit",
    (code, signal) => {
      proctorReady = false;

      console.log(
        `Proctor exited code=${code} signal=${signal}`
      );

      proctor = null;
    }
  );

  waitForPort(
    PROCTOR_PORT
  )
    .then(() => {
      proctorReady = true;

      console.log(
        `Python proctor is ready on port ${PROCTOR_PORT}.`
      );
    })
    .catch((error) => {
      proctorReady = false;

      console.error(
        "Python proctor startup failed:",
        error.message
      );
    });
}

// ============================================================
// START AI INTERVIEW AGENT
// ============================================================

function startInterviewAgent() {
  if (
    process.env.START_INTERVIEW_AGENT ===
    "false"
  ) {
    console.log(
      "AI interview agent disabled."
    );

    interviewAgentReady = false;

    return;
  }

  const script =
    path.join(
      __dirname,
      "python",
      "interview.py"
    );

  if (!fs.existsSync(script)) {
    console.warn(
      "python/interview.py not found. AI interview agent was not started."
    );

    interviewAgentReady = false;

    return;
  }

  const python = getPythonExecutable();

  console.log(
    `Starting AI interview agent on port ${INTERVIEW_AGENT_PORT}...`
  );

  interviewAgent =
    spawn(
      python,
      [script],
      {
        cwd: path.join(
          __dirname,
          "python"
        ),

        env: {
          ...process.env,

          INTERVIEW_AGENT_PORT:
            String(
              INTERVIEW_AGENT_PORT
            ),
        },

        stdio: "inherit",
      }
    );

  interviewAgent.on(
    "error",
    (error) => {
      interviewAgentReady = false;

      console.error(
        "Could not start AI interview agent:",
        error.message
      );
    }
  );

  interviewAgent.on(
    "exit",
    (code, signal) => {
      interviewAgentReady = false;

      console.log(
        `AI interview agent exited code=${code} signal=${signal}`
      );

      interviewAgent = null;
    }
  );

  // ----------------------------------------------------------
  // IMPORTANT:
  // Python can take several seconds to start.
  // Wait until port 5100 is actually listening.
  // ----------------------------------------------------------

  waitForPort(
    INTERVIEW_AGENT_PORT,
    "127.0.0.1",
    60000
  )
    .then(() => {
      interviewAgentReady = true;

      console.log(
        `AI Interview Agent is ready on port ${INTERVIEW_AGENT_PORT}.`
      );
    })
    .catch((error) => {
      interviewAgentReady = false;

      console.error(
        "AI Interview Agent startup failed:",
        error.message
      );
    });
}

// ============================================================
// START SERVER
// ============================================================

async function seedCuratedCourses() {
  if (mongoose.connection.readyState !== 1) return;
  const curatedPath = path.join(__dirname, "data", "curated_courses.json");
  if (!fs.existsSync(curatedPath)) return;
  const courses = JSON.parse(fs.readFileSync(curatedPath, "utf8"));
  const stats = buildStats(courses);
  const operations = courses.map((course) => ({
    updateOne: {
      filter: { url: course.url },
      update: { $set: { ...course, source: "curated", qualityScore: computeQuality({ ...course, source: "curated" }, stats) } },
      upsert: true,
    },
  }));
  if (operations.length) await Course.bulkWrite(operations, { ordered: false });
  await Course.init();
  console.log(`Loaded ${courses.length} curated courses.`);
}

async function startServer() {
  try {
    // --------------------------------------------------------
    // CONNECT MONGODB
    // --------------------------------------------------------

    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    } catch (mongoErr) {
      console.warn("⚠️ Local MongoDB connection failed:", mongoErr.message);
      console.log("⚡ Starting MongoDB In-Memory Server fallback...");
      try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create({
          instance: {
            dbName: "viva_interview"
          }
        });
        const memoryUri = mongod.getUri();
        await mongoose.connect(memoryUri);
        console.log("✅ MongoDB connected via In-Memory Server at:", memoryUri);
      } catch (inMemErr) {
        console.error("❌ Could not start In-Memory MongoDB:", inMemErr.message);
      }
    }

    try {
      await seedCuratedCourses();
    } catch (seedError) {
      console.error("Course catalog startup seed failed:", seedError.message);
    }

    // --------------------------------------------------------
    // START EXPRESS
    // --------------------------------------------------------

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log("");

        console.log(
          "========================================"
        );

        console.log(
          "        VIVA INTERVIEW SERVER"
        );

        console.log(
          "========================================"
        );

        console.log(
          `API: http://localhost:${PORT}`
        );

        // IMPORTANT:
        // Do NOT print the MongoDB URI.
        // It may contain your database credentials.

        console.log(
          "MongoDB: connected"
        );

        console.log(
          `Client: ${CLIENT_URL}`
        );

        console.log(
          `Proctor: http://localhost:${PROCTOR_PORT}`
        );

        console.log(
          `AI Interview Agent: http://localhost:${INTERVIEW_AGENT_PORT}`
        );

        console.log(
          `Learning API: http://localhost:${PORT}/api/learning`
        );

        console.log(
          "========================================"
        );

        console.log("");

        // ----------------------------------------------------
        // START PYTHON SERVICES
        // ----------------------------------------------------

        startProctor();

        startInterviewAgent();
      }
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

function shutdown() {
  console.log(
    "\nShutting down VIVA server..."
  );

  // ----------------------------------------------------------
  // STOP PROCTOR
  // ----------------------------------------------------------

  if (proctor) {
    console.log(
      "Stopping Python proctor..."
    );

    try {
      proctor.kill();
    } catch (error) {
      console.error(
        "Error stopping proctor:",
        error.message
      );
    }

    proctor = null;
    proctorReady = false;
  }

  // ----------------------------------------------------------
  // STOP INTERVIEW AGENT
  // ----------------------------------------------------------

  if (interviewAgent) {
    console.log(
      "Stopping AI interview agent..."
    );

    try {
      interviewAgent.kill();
    } catch (error) {
      console.error(
        "Error stopping interview agent:",
        error.message
      );
    }

    interviewAgent = null;
    interviewAgentReady = false;
  }

  // ----------------------------------------------------------
  // CLOSE MONGODB
  // ----------------------------------------------------------

  mongoose.connection
    .close()
    .catch(() => {})
    .finally(() => {
      process.exit(0);
    });
}

// ============================================================
// PROCESS SIGNALS
// ============================================================

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);

// ============================================================
// UNHANDLED ERRORS
// ============================================================

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Uncaught exception:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "Unhandled promise rejection:",
      reason
    );
  }
);

// ============================================================
// RUN
// ============================================================

startServer();
