const { CANDIDATES, getData, saveData, setCors } = require("./_store");

module.exports = (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const { email, candidate } = body;
  if (!email || !candidate) {
    return res.status(400).json({ error: "Email and candidate choice are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const store = getData();

  if (store.votedUsers.includes(normalizedEmail)) {
    return res.status(400).json({ error: "You have already cast your vote in this election" });
  }
  if (!CANDIDATES.includes(candidate)) {
    return res.status(400).json({ error: "Invalid candidate selected" });
  }

  store.votes[candidate] = (store.votes[candidate] || 0) + 1;
  store.votedUsers.push(normalizedEmail);
  saveData(store);

  return res.status(200).json({ message: "Vote recorded successfully" });
};
