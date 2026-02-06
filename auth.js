const BUYERS_KEY = "foodPortal_buyers_v1";
const SESSION_KEY = "foodPortal_session_v1";

const SELLER_USERNAME = "seller";
const SELLER_PASSWORD = "1234";

function getBuyers(){
  return JSON.parse(localStorage.getItem(BUYERS_KEY) || "[]");
}
function saveBuyers(list){
  localStorage.setItem(BUYERS_KEY, JSON.stringify(list));
}

function setSession(session){
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function goPortal(){
  window.location.href = "portal.html";
}

function showBuyerMode(mode){
  const loginBox = document.getElementById("buyerLoginBox");
  const regBox = document.getElementById("buyerRegisterBox");
  const btnLogin = document.getElementById("btnBuyerLogin");
  const btnReg = document.getElementById("btnBuyerRegister");

  if(mode === "register"){
    loginBox.classList.add("d-none");
    regBox.classList.remove("d-none");
    btnLogin.classList.remove("btn-dark");
    btnLogin.classList.add("btn-outline-dark");
    btnReg.classList.remove("btn-outline-dark");
    btnReg.classList.add("btn-dark");
  } else {
    regBox.classList.add("d-none");
    loginBox.classList.remove("d-none");
    btnReg.classList.remove("btn-dark");
    btnReg.classList.add("btn-outline-dark");
    btnLogin.classList.remove("btn-outline-dark");
    btnLogin.classList.add("btn-dark");
  }
}

function buyerRegister(){
  const name = document.getElementById("buyerRegName").value.trim();
  const email = document.getElementById("buyerRegEmail").value.trim().toLowerCase();
  const pass = document.getElementById("buyerRegPass").value;

  const msg = document.getElementById("buyerRegMsg");
  msg.innerHTML = "";

  if(!name || !email || !pass){
    msg.innerHTML = `<span class="text-danger">Fill all fields.</span>`;
    return;
  }

  const buyers = getBuyers();
  if(buyers.some(b => b.email === email)){
    msg.innerHTML = `<span class="text-danger">Email already registered. Please login.</span>`;
    showBuyerMode("login");
    return;
  }

  buyers.push({ id: crypto.randomUUID(), name, email, pass });
  saveBuyers(buyers);

  msg.innerHTML = `<span class="text-success">Registered successfully! Now login.</span>`;
  showBuyerMode("login");

  document.getElementById("buyerRegName").value = "";
  document.getElementById("buyerRegEmail").value = "";
  document.getElementById("buyerRegPass").value = "";
}

function buyerLogin(){
  const email = document.getElementById("buyerLoginEmail").value.trim().toLowerCase();
  const pass = document.getElementById("buyerLoginPass").value;

  const msg = document.getElementById("buyerLoginMsg");
  msg.innerHTML = "";

  if(!email || !pass){
    msg.innerHTML = `<span class="text-danger">Enter email and password.</span>`;
    return;
  }

  const user = getBuyers().find(b => b.email === email && b.pass === pass);
  if(!user){
    msg.innerHTML = `<span class="text-danger">Invalid login. If new, please Register first.</span>`;
    return;
  }

  setSession({ role: "buyer", buyerEmail: user.email, buyerName: user.name, loginAt: Date.now() });
  goPortal();
}

function sellerLogin(){
  const u = document.getElementById("sellerUser").value.trim();
  const p = document.getElementById("sellerPass").value.trim();
  const msg = document.getElementById("sellerMsg");
  msg.innerHTML = "";

  if(u === SELLER_USERNAME && p === SELLER_PASSWORD){
    setSession({ role: "seller", loginAt: Date.now() });
    goPortal();
  } else {
    msg.innerHTML = `<span class="text-danger">Wrong seller credentials.</span>`;
  }
}

showBuyerMode("login");

// ✅ make these global for onclick safety
window.showBuyerMode = showBuyerMode;
window.buyerRegister = buyerRegister;
window.buyerLogin = buyerLogin;
window.sellerLogin = sellerLogin;
