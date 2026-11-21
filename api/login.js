const { getData, setCors } = require("./_store");

module.exports = (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const { email, password } = body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const store = getData();
  const user = store.users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  return res.status(200).json({
    message: "Login successful",
    user: { name: user.name, email: user.email }
  });
};
