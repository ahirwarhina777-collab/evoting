const { CANDIDATES, saveData, setCors } = require("./_store");

module.exports = (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const fresh = {
    users: [],
    votes: { "Aarav Sharma": 0, "Meera Patel": 0, "Kabir Verma": 0 },
    votedUsers: []
  };
  saveData(fresh);
  return res.status(200).json({ message: "Election data reset successfully" });
};
