const { getData, saveData, setCors } = require("./_store");

module.exports = (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const { name, email, password } = body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const store = getData();
  if (store.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: "An account with this email already exists" });
  }

  const newUser = { name: name.trim(), email: normalizedEmail, password };
  store.users.push(newUser);
  saveData(store);

  return res.status(201).json({
    message: "Registration successful",
    user: { name: newUser.name, email: newUser.email }
  });
};
