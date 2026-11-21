import http.server
import socketserver
import json
import os
import sys
import urllib.parse

PORT = int(os.environ.get("PORT", 5000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")
CANDIDATES = ["Aarav Sharma", "Meera Patel", "Kabir Verma"]

def init_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "votes" not in data:
                data["votes"] = {c: 0 for c in CANDIDATES}
            for c in CANDIDATES:
                if c not in data["votes"]:
                    data["votes"][c] = 0
            if "users" not in data or not isinstance(data["users"], list):
                data["users"] = []
            if "votedUsers" not in data or not isinstance(data["votedUsers"], list):
                data["votedUsers"] = []
            return data
        except Exception:
            pass

    data = {
        "users": [],
        "votes": {c: 0 for c in CANDIDATES},
        "votedUsers": []
    }
    save_data(data)
    return data

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

store = init_data()

class EVotingHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def send_json(self, status_code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > 0:
            raw = self.rfile.read(length).decode("utf-8")
            return json.loads(raw)
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/results":
            total = sum(store["votes"].get(c, 0) for c in CANDIDATES)
            results = [{"candidate": c, "votes": store["votes"].get(c, 0)} for c in CANDIDATES]
            self.send_json(200, {"results": results, "total": total})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        try:
            body = self.parse_body()
        except Exception:
            self.send_json(400, {"error": "Invalid JSON body"})
            return

        try:
            if parsed.path == "/api/register":
                name = (body.get("name") or "").strip()
                email = (body.get("email") or "").strip().lower()
                password = body.get("password") or ""

                if not name or not email or not password:
                    self.send_json(400, {"error": "Name, email, and password are required"})
                    return
                if len(password) < 6:
                    self.send_json(400, {"error": "Password must be at least 6 characters"})
                    return

                if any(u.get("email", "").lower() == email for u in store["users"]):
                    self.send_json(400, {"error": "An account with this email already exists"})
                    return

                new_user = {"name": name, "email": email, "password": password}
                store["users"].append(new_user)
                save_data(store)
                self.send_json(201, {"message": "Registration successful", "user": {"name": name, "email": email}})
                return

            elif parsed.path == "/api/login":
                email = (body.get("email") or "").strip().lower()
                password = body.get("password") or ""

                if not email or not password:
                    self.send_json(400, {"error": "Email and password are required"})
                    return

                user = next((u for u in store["users"] if u.get("email", "").lower() == email and u.get("password") == password), None)
                if not user:
                    self.send_json(401, {"error": "Invalid email or password"})
                    return

                self.send_json(200, {"message": "Login successful", "user": {"name": user["name"], "email": user["email"]}})
                return

            elif parsed.path == "/api/vote":
                email = (body.get("email") or "").strip().lower()
                candidate = (body.get("candidate") or "").strip()

                if not email or not candidate:
                    self.send_json(400, {"error": "Email and candidate choice are required"})
                    return

                if email in store["votedUsers"]:
                    self.send_json(400, {"error": "You have already cast your vote in this election"})
                    return

                if candidate not in CANDIDATES:
                    self.send_json(400, {"error": "Invalid candidate selected"})
                    return

                store["votes"][candidate] = store["votes"].get(candidate, 0) + 1
                store["votedUsers"].append(email)
                save_data(store)
                self.send_json(200, {"message": "Vote recorded successfully"})
                return

            elif parsed.path == "/api/reset":
                store["users"] = []
                store["votes"] = {c: 0 for c in CANDIDATES}
                store["votedUsers"] = []
                save_data(store)
                self.send_json(200, {"message": "Election data reset successfully"})
                return

            self.send_json(404, {"error": "API endpoint not found"})
        except Exception as e:
            self.send_json(500, {"error": f"Internal server error: {str(e)}"})

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), EVotingHandler) as httpd:
        print(f"=========================================")
        print(f"  E-Voting Python Server running!")
        print(f"  Local URL: http://localhost:{PORT}")
        print(f"=========================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
