const fs = require("fs");
const path = require("path");

// In Vercel serverless, /tmp is the only writable directory
const DATA_FILE = process.env.VERCEL
  ? path.join("/tmp", "evoting_data.json")
  : path.join(__dirname, "..", "data.json");

const CANDIDATES = ["Aarav Sharma", "Meera Patel", "Kabir Verma"];

let memoryStore = {
  users: [],
  votes: {
    "Aarav Sharma": 0,
    "Meera Patel": 0,
    "Kabir Verma": 0
  },
  votedUsers: []
};

function getData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.votes) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch (e) {
    console.error("Error reading data file:", e);
  }
  return memoryStore;
}

function saveData(data) {
  memoryStore = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving data file:", e);
  }
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
}

module.exports = {
  CANDIDATES,
  getData,
  saveData,
  setCors
};
