const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, "data.json");

const CANDIDATES = ["Aarav Sharma", "Meera Patel", "Kabir Verma"];

// Initialize data file if it doesn't exist
function initData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: [],
      votes: {
        "Aarav Sharma": 0,
        "Meera Patel": 0,
        "Kabir Verma": 0
      },
      votedUsers: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.votes) {
      parsed.votes = { "Aarav Sharma": 0, "Meera Patel": 0, "Kabir Verma": 0 };
    }
    for (const c of CANDIDATES) {
      if (typeof parsed.votes[c] !== "number") parsed.votes[c] = 0;
    }
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.votedUsers)) parsed.votedUsers = [];
    return parsed;
  } catch (e) {
    const initialData = {
      users: [],
      votes: { "Aarav Sharma": 0, "Meera Patel": 0, "Kabir Verma": 0 },
      votedUsers: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

let store = initData();

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=UTF-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (pathname.startsWith("/api/")) {
    try {
      if (pathname === "/api/register" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const { name, email, password } = body;
        if (!name || !email || !password) {
          return sendJson(res, 400, { error: "Name, email, and password are required" });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { error: "Password must be at least 6 characters" });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const existing = store.users.find(u => u.email.toLowerCase() === normalizedEmail);
        if (existing) {
          return sendJson(res, 400, { error: "An account with this email already exists" });
        }

        const newUser = { name: name.trim(), email: normalizedEmail, password };
        store.users.push(newUser);
        saveData(store);

        return sendJson(res, 201, {
          message: "Registration successful",
          user: { name: newUser.name, email: newUser.email }
        });
      }

      if (pathname === "/api/login" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const { email, password } = body;
        if (!email || !password) {
          return sendJson(res, 400, { error: "Email and password are required" });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = store.users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
        if (!user) {
          return sendJson(res, 401, { error: "Invalid email or password" });
        }
        return sendJson(res, 200, {
          message: "Login successful",
          user: { name: user.name, email: user.email }
        });
      }

      if (pathname === "/api/vote" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const { email, candidate } = body;
        if (!email || !candidate) {
          return sendJson(res, 400, { error: "Email and candidate choice are required" });
        }
        const normalizedEmail = email.trim().toLowerCase();
        if (store.votedUsers.includes(normalizedEmail)) {
          return sendJson(res, 400, { error: "You have already cast your vote in this election" });
        }
        if (!CANDIDATES.includes(candidate)) {
          return sendJson(res, 400, { error: "Invalid candidate selected" });
        }

        store.votes[candidate] = (store.votes[candidate] || 0) + 1;
        store.votedUsers.push(normalizedEmail);
        saveData(store);

        return sendJson(res, 200, { message: "Vote recorded successfully" });
      }

      if (pathname === "/api/results" && req.method === "GET") {
        let total = 0;
        const results = CANDIDATES.map(name => {
          const count = store.votes[name] || 0;
          total += count;
          return { candidate: name, votes: count };
        });

        return sendJson(res, 200, { results, total });
      }

      if (pathname === "/api/reset" && req.method === "POST") {
        store = {
          users: [],
          votes: { "Aarav Sharma": 0, "Meera Patel": 0, "Kabir Verma": 0 },
          votedUsers: []
        };
        saveData(store);
        return sendJson(res, 200, { message: "Election data reset successfully" });
      }

      return sendJson(res, 404, { error: "API endpoint not found" });
    } catch (err) {
      console.error("API error:", err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  // Static File Serving
  let filePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  filePath = path.join(__dirname, filePath);

  // Security check: make sure request does not break out of directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=UTF-8" });
      res.end("<h1>404 Not Found</h1><p><a href='/'>Return to Home</a></p>");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  E-Voting Server running successfully!`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
