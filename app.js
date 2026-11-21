const CANDIDATE_APIS = [
  window.location.protocol.startsWith("http") ? `${window.location.origin}/api` : null,
  "http://localhost:5000/api",
  "http://127.0.0.1:5000/api",
  "http://localhost:8000/api"
].filter(Boolean);

let activeAPI = CANDIDATE_APIS[0] || "http://localhost:5000/api";

const $ = (id) => document.getElementById(id);

async function request(path, data) {
  let lastError = null;
  const apisToTry = [activeAPI, ...CANDIDATE_APIS.filter(a => a !== activeAPI)];

  for (const api of apisToTry) {
    try {
      const response = await fetch(api + path, {
        method: data ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Request failed");
      }
      activeAPI = api;
      return result;
    } catch (err) {
      lastError = err;
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError") && !err.message.includes("Load failed")) {
        throw err;
      }
    }
  }
  throw new Error("Cannot reach backend server. Please make sure the server is running on http://localhost:5000.");
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
if ($("results")) (async()=>{try{
  const r=await request("/results");
  $("results").innerHTML=r.results.map(x=>`<div class="result-row"><b>${x.candidate}</b> — ${x.votes} votes<div class="bar"><span style="width:${r.total?x.votes/r.total*100:0}%"></span></div></div>`).join("")+`<p class="muted">Total demo votes: ${r.total}</p>`;
}catch(err){$("results").textContent="Cannot reach backend server. Please make sure the server is running on http://localhost:5000.";}})();

