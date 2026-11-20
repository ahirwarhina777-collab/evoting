const API = "http://localhost:18080/api";
const $ = (id) => document.getElementById(id);
async function request(path, data) {
  const response = await fetch(API + path, {
    method: data ? "POST" : "GET",
    headers: {"Content-Type":"application/json"},
    body: data ? JSON.stringify(data) : undefined
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
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
  try{await request("/vote",{email:user().email,candidate});$("message").textContent="Your demo vote was recorded.";e.target.reset();}
  catch(err){$("message").textContent=err.message;}
});
if ($("results")) (async()=>{try{
  const r=await request("/results");
  $("results").innerHTML=r.results.map(x=>`<div class="result-row"><b>${x.candidate}</b> — ${x.votes} votes<div class="bar"><span style="width:${r.total?x.votes/r.total*100:0}%"></span></div></div>`).join("")+`<p class="muted">Total demo votes: ${r.total}</p>`;
}catch(err){$("results").textContent="Cannot reach C++ server. Start the backend first.";}})();
