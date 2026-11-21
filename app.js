const isHttp = window.location.protocol.startsWith("http");

// On Vercel or any live host, relative "/api" hits the serverless backend directly
const CANDIDATE_APIS = [
  isHttp ? "/api" : null,
  isHttp ? `${window.location.origin}/api` : null,
  "http://localhost:5000/api",
  "http://127.0.0.1:5000/api",
  "http://192.168.1.7:5000/api"
].filter(Boolean);

const UNIQUE_APIS = Array.from(new Set(CANDIDATE_APIS));
let activeAPI = UNIQUE_APIS[0] || "/api";

const $ = (id) => document.getElementById(id);

async function request(path, data) {
  let lastError = null;
  const apisToTry = [activeAPI, ...UNIQUE_APIS.filter(a => a !== activeAPI)];

  for (const api of apisToTry) {
    try {
      const response = await fetch(api + path, {
        method: data ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined
      });

      if (response.status === 404 && (api.includes(":5500") || api.includes(":3000"))) {
        continue;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonErr) {
        continue;
      }

      if (!response.ok) {
        throw new Error(result.error || "Request failed");
      }

      activeAPI = api;
      return result;
    } catch (err) {
      lastError = err;
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError") && !err.message.includes("Load failed") && !err.message.includes("Unexpected token")) {
        throw err;
      }
    }
  }
  throw new Error("Cannot reach backend server. Please open http://192.168.1.7:5000 on your phone or http://localhost:5000 on your PC.");
}
const user = () => JSON.parse(localStorage.getItem("evoteUser") || "null");
if ($("registerForm")) $("registerForm").addEventListener("submit", async e => {
  e.preventDefault(); $("message").textContent = "Creating account…";
  try {
    const r = await request("/register",{name:$("name").value,email:$("email").value,password:$("password").value});
    localStorage.setItem("evoteUser",JSON.stringify(r.user)); location.href="dashboard.html";
  } catch(err){$("message").textContent=err.message;}
});
if ($("loginForm")) $("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("message").textContent = "Signing in…";
  try {
    const r = await request("/login",{email:$("email").value,password:$("password").value});
    localStorage.setItem("evoteUser",JSON.stringify(r.user)); location.href="dashboard.html";
  } catch(err){$("message").textContent=err.message;}
});
if ($("welcomeName")) { if(!user()) location.href="login.html"; else $("welcomeName").textContent=user().name; }
if ($("logout")) $("logout").addEventListener("click",()=>{localStorage.removeItem("evoteUser");location.href="index.html";});
if ($("voteForm")) $("voteForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!user()){location.href="login.html";return;}
  const candidate=new FormData(e.target).get("candidate");
  try{
    await request("/vote",{email:user().email,candidate});
    $("message").style.color = "#12b76a";
    $("message").textContent="Your demo vote was recorded successfully! Redirecting to results...";
    e.target.reset();
    setTimeout(() => { location.href = "results.html"; }, 1500);
  }
  catch(err){
    $("message").style.color = "#b42318";
    $("message").textContent=err.message;
  }
});
async function loadResults() {
  if (!$("results")) return;
  try {
    const r = await request("/results");
    if (!r.results || r.results.length === 0) {
      $("results").innerHTML = "<p class='muted'>No candidates found.</p>";
      return;
    }
    $("results").innerHTML = r.results.map(x => {
      const pct = r.total > 0 ? Math.round((x.votes / r.total) * 100) : 0;
      return `
        <div class="result-row">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>${x.candidate}</b>
            <span><b>${x.votes}</b> votes (${pct}%)</span>
          </div>
          <div class="bar"><span style="width:${pct}%"></span></div>
        </div>
      `;
    }).join("") + `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
        <p class="muted" style="margin:0;">Total demo votes cast: <b>${r.total}</b></p>
        <button class="button secondary" style="padding:6px 14px; font-size:13px;" onclick="loadResults()">Refresh</button>
      </div>
    `;
  } catch (err) {
    $("results").innerHTML = `
      <div style="color:#b42318; padding:8px 0;">
        <p style="font-weight:600; margin:0 0 6px;">${err.message}</p>
        <p class="muted" style="font-size:13px; margin:0 0 12px;">If you are using a mobile phone, open <b>http://192.168.1.7:5000</b> in your phone browser.</p>
        <button class="button" style="padding:8px 16px; font-size:13px;" onclick="loadResults()">Try Again</button>
      </div>
    `;
  }
}

if ($("results")) {
  window.loadResults = loadResults;
  loadResults();
  setInterval(loadResults, 4000);
}

