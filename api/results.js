const { CANDIDATES, getData, setCors } = require("./_store");

module.exports = (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const store = getData();
  let total = 0;
  const results = CANDIDATES.map(name => {
    const votes = (store.votes && typeof store.votes[name] === "number") ? store.votes[name] : 0;
    total += votes;
    return { candidate: name, votes };
  });

  return res.status(200).json({ results, total });
};
