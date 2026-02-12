// ---------------- AUTH (SESSION) ----------------
const SESSION_KEY = "foodPortal_session_v1";

function getSession(){
  return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
}
function requireAuth(){
  const s = getSession();
  if(!s?.role){
    window.location.href = "auth.html";
    return null;
  }
  return s;
}
function logout(){
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "auth.html";
}

// ---------------------- STORAGE KEYS ----------------------
const DB_KEY = "foodPortalDB_v1";
const CART_KEY = "foodPortalCart_v1";
const COUPON_APPLIED_KEY = "foodPortalCouponApplied_v1";

// ---------------------- DEFAULT DEMO DATA ----------------------
const demoDB = () => ({
  settings: { deliveryFee: 30, taxRate: 0.05 },
  coupons: [
    { code: "SAVE10", percent: 10 },
    { code: "FOOD20", percent: 20 }
  ],
  restaurants: [
    { id: crypto.randomUUID(), name: "Spice Kingdom", items: seedItems(), reviews: [] },
    { id: crypto.randomUUID(), name: "Urban Biryani", items: seedItems(), reviews: [] },
    { id: crypto.randomUUID(), name: "Sweet Haven", items: seedItems(), reviews: [] }
  ]
});

function seedItems(){
  const base = {
    Starters: [
      ["Gobi 65", 120], ["Paneer Tikka", 180], ["Chicken 65", 190],
      ["Spring Rolls", 140], ["Chilli Paneer", 170], ["Veg Manchuria", 150]
    ],
    Soups: [
      ["Tomato Soup", 90], ["Sweet Corn Soup", 110], ["Hot & Sour", 120],
      ["Chicken Clear Soup", 130], ["Mushroom Soup", 125], ["Veg Noodle Soup", 135]
    ],
    Biryanis: [
      ["Veg Biryani", 160], ["Chicken Dum Biryani", 220], ["Mutton Biryani", 290],
      ["Paneer Biryani", 210], ["Egg Biryani", 190], ["Fry Piece Biryani", 240]
    ],
    Desserts: [
      ["Gulab Jamun", 90], ["Double Ka Meetha", 110], ["Ice Cream", 80],
      ["Rasgulla", 95], ["Brownie", 130], ["Fruit Custard", 100]
    ],
    Drinks: [
      ["Lassi", 70], ["Cold Coffee", 110], ["Lemon Soda", 60],
      ["Mint Mojito", 120], ["Milkshake", 140], ["Buttermilk", 50]
    ],
    Specials: [
      ["Chef Special Thali", 240], ["Tandoori Platter", 320], ["Special Pasta", 210],
      ["Butter Chicken", 260], ["Veg Kebab Platter", 230], ["Special Fried Rice", 200]
    ]
  };

  let items = [];
  Object.entries(base).forEach(([cat, list], idx) => {
    list.forEach((d, i) => {
      const offerPercent = (i === 1 && idx % 2 === 0) ? 15 : 0;
      const bogo = (i === 0 && idx % 3 === 0) ? true : false;
      items.push({
        id: crypto.randomUUID(),
        name: d[0],
        price: d[1],
        category: cat,
        offerPercent,
        bogo
      });
    });
  });
  return items;
}

// ---------------------- DB HELPERS ----------------------
function getDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw){
    const fresh = demoDB();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  const db = JSON.parse(raw);
  db.restaurants = (db.restaurants || []).map(r => ({ ...r, reviews: r.reviews || [] }));
  return db;
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function getCart(){ return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function getAppliedCoupon(){ return JSON.parse(localStorage.getItem(COUPON_APPLIED_KEY) || "null"); }
function setAppliedCoupon(c){ localStorage.setItem(COUPON_APPLIED_KEY, JSON.stringify(c)); }

// ---------------------- REVIEWS ----------------------
function stars(n){
  n = Math.max(0, Math.min(5, Number(n || 0)));
  return "⭐".repeat(n) + "☆".repeat(5 - n);
}
function getRestaurantAvgRating(restaurant){
  const revs = restaurant.reviews || [];
  if(revs.length === 0) return { avg: 0, count: 0 };
  const sum = revs.reduce((a, r) => a + Number(r.rating || 0), 0);
  return { avg: sum / revs.length, count: revs.length };
}

function renderReviews(){
  const session = getSession();
  const db = getDB();

  const list = document.getElementById("reviewsList");
  const avgBadge = document.getElementById("avgRatingBadge");
  const formArea = document.getElementById("reviewFormArea");
  const msg = document.getElementById("reviewMsg");
  if(msg) msg.innerHTML = "";

  if(!list || !avgBadge || !formArea) return;

  if(!activeRestaurantId){
    avgBadge.innerText = "Avg: -";
    list.innerHTML = `<div class="text-muted">Select a restaurant to see reviews.</div>`;
    formArea.classList.add("d-none");
    return;
  }

  const r = db.restaurants.find(x => x.id === activeRestaurantId);
  if(!r){
    avgBadge.innerText = "Avg: -";
    list.innerHTML = `<div class="text-muted">Restaurant not found.</div>`;
    formArea.classList.add("d-none");
    return;
  }

  const { avg, count } = getRestaurantAvgRating(r);
  avgBadge.innerText = count ? `Avg: ${avg.toFixed(1)} (${count})` : "Avg: -";

  const reviews = (r.reviews || []).slice().sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  list.innerHTML = reviews.length
    ? reviews.map(rv => `
      <div class="border rounded-3 p-2 mb-2 bg-white">
        <div class="d-flex justify-content-between align-items-center">
          <div class="fw-semibold">${rv.buyerName || "Customer"}</div>
          <div class="small">${stars(rv.rating)}</div>
        </div>
        <div class="small-muted">${new Date(rv.createdAt).toLocaleString()}</div>
        <div class="mt-1">${String(rv.text || "").replace(/</g,"&lt;")}</div>
      </div>
    `).join("")
    : `<div class="text-muted">No reviews yet. Be the first!</div>`;

  if(session?.role === "buyer") formArea.classList.remove("d-none");
  else formArea.classList.add("d-none");
}

function submitReview(){
  const session = getSession();
  if(session?.role !== "buyer"){ alert("Only buyers can submit reviews."); return; }
  if(!activeRestaurantId){ alert("Select a restaurant first."); return; }

  const rating = Number(document.getElementById("reviewRating").value);
  const text = document.getElementById("reviewText").value.trim();
  const msg = document.getElementById("reviewMsg");
  msg.innerHTML = "";

  if(!text){
    msg.innerHTML = `<span class="text-danger">Please write a review.</span>`;
    return;
  }

  const db = getDB();
  const r = db.restaurants.find(x => x.id === activeRestaurantId);
  if(!r) return;

  r.reviews.push({
    id: crypto.randomUUID(),
    buyerEmail: session.buyerEmail,
    buyerName: session.buyerName,
    rating,
    text,
    createdAt: Date.now()
  });

  saveDB(db);
  document.getElementById("reviewText").value = "";
  msg.innerHTML = `<span class="text-success">✅ Review submitted!</span>`;

  renderBuyer();
  renderReviews();
}

// ---------------------- BUYER RENDER ----------------------
let activeRestaurantId = null;

function renderBuyer(){
  const db = getDB();
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();

  const wrap = document.getElementById("restaurantList");
  wrap.innerHTML = "";

  db.restaurants
    .filter(r => r.name.toLowerCase().includes(q) || r.items.some(it => it.name.toLowerCase().includes(q)))
    .forEach(r => {
      const col = document.createElement("div");
      col.className = "col-md-4";

      const card = document.createElement("div");
      card.className = "restaurant-card" + (activeRestaurantId === r.id ? " active" : "");
      card.onclick = () => { activeRestaurantId = r.id; renderBuyer(); };

      const rt = getRestaurantAvgRating(r);

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold">${r.name}</div>
            <div class="small-muted">
              Items: ${r.items.length} • ⭐ ${rt.count ? rt.avg.toFixed(1) : "-"} (${rt.count})
            </div>
          </div>
          <span class="pill">Open</span>
        </div>
      `;

      col.appendChild(card);
      wrap.appendChild(col);
    });

  const badge = document.getElementById("activeRestaurantBadge");
  const menuArea = document.getElementById("menuArea");

  if(!activeRestaurantId){
    badge.innerText = "Select a restaurant";
    menuArea.innerHTML = `<div class="text-muted">Choose a restaurant to see its menu.</div>`;
  } else {
    const r = db.restaurants.find(x => x.id === activeRestaurantId);
    badge.innerText = r ? r.name : "Restaurant";
    menuArea.innerHTML = r ? renderMenuColumns(r, q) : `<div class="text-muted">Not found.</div>`;
    bindAddToCartButtons();
  }

  renderCart();
  renderOffers();
  renderReviews();
}

function renderMenuColumns(restaurant, q){
  const categories = ["Starters","Soups","Biryanis","Desserts","Drinks","Specials"];
  const filtered = restaurant.items.filter(it => it.name.toLowerCase().includes(q) || restaurant.name.toLowerCase().includes(q));

  const byCat = {};
  categories.forEach(c => byCat[c] = []);
  filtered.forEach(it => (byCat[it.category] ||= []).push(it));

  let html = `<div class="row g-3">`;
  categories.forEach(cat => {
    html += `
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="m-0">${cat}</h5>
              <span class="pill">${(byCat[cat]||[]).length} items</span>
            </div>
            <div class="menu-grid">
              ${(byCat[cat]||[]).map(it => {
                const offerLine = it.offerPercent > 0 ? `<span class="pill">🔥 ${it.offerPercent}% OFF</span>` : "";
                const bogoLine = it.bogo ? `<span class="pill">🎁 BOGO</span>` : "";
                const badges = (offerLine || bogoLine) ? `<div class="d-flex gap-2 flex-wrap mt-1">${offerLine}${bogoLine}</div>` : "";
                return `
                  <div class="menu-item">
                    <div class="d-flex justify-content-between">
                      <div class="fw-semibold">${it.name}</div>
                      <div class="fw-bold">₹${it.price}</div>
                    </div>
                    ${badges}
                    <button class="btn btn-sm btn-dark w-100 mt-2 addToCartBtn"
                      data-rid="${restaurant.id}" data-iid="${it.id}">
                      Add to Cart
                    </button>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  return html;
}

function bindAddToCartButtons(){
  document.querySelectorAll(".addToCartBtn").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset.rid, btn.dataset.iid));
  });
}

// ---------------------- CART + BILL ----------------------
function addToCart(restaurantId, itemId){
  const cart = getCart();
  const existing = cart.find(x => x.restaurantId === restaurantId && x.itemId === itemId);
  if(existing) existing.qty += 1;
  else cart.push({ restaurantId, itemId, qty: 1 });
  saveCart(cart);
  renderCart();
  renderOffers();
}

function changeQty(restaurantId, itemId, delta){
  const cart = getCart();
  const idx = cart.findIndex(x => x.restaurantId === restaurantId && x.itemId === itemId);
  if(idx === -1) return;
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(cart);
  renderCart();
  renderOffers();
}

function clearCart(){
  saveCart([]);
  setAppliedCoupon(null);
  const c = document.getElementById("couponInput");
  const cm = document.getElementById("couponMsg");
  if(c) c.value = "";
  if(cm) cm.innerHTML = "";
  renderCart();
  renderOffers();
}

function computeBill(){
  const db = getDB();
  const cart = getCart();
  const appliedCoupon = getAppliedCoupon();

  let subtotal = 0;
  let discount = 0;

  const lines = cart.map(ci => {
    const r = db.restaurants.find(x => x.id === ci.restaurantId);
    const it = r?.items.find(x => x.id === ci.itemId);
    if(!r || !it) return null;

    const price = Number(it.price);
    const qty = Number(ci.qty);
    const lineBase = price * qty;

    const itemOfferDiscount = it.offerPercent ? (lineBase * (it.offerPercent / 100)) : 0;
    const freeCount = it.bogo ? Math.floor(qty / 2) : 0;
    const bogoDiscount = freeCount * price;

    const lineDiscount = itemOfferDiscount + bogoDiscount;
    const lineNet = lineBase - lineDiscount;

    subtotal += lineBase;
    discount += lineDiscount;

    return { restaurantId: r.id, itemId: it.id, restaurantName: r.name, itemName: it.name, price, qty, freeCount, offerPercent: it.offerPercent, bogo: it.bogo, lineNet };
  }).filter(Boolean);

  const afterItemDiscount = Math.max(0, subtotal - discount);
  const couponDiscount = appliedCoupon?.percent ? (afterItemDiscount * (appliedCoupon.percent / 100)) : 0;

  const totalDiscount = discount + couponDiscount;
  const tax = (afterItemDiscount - couponDiscount) * db.settings.taxRate;
  const delivery = cart.length > 0 ? Number(db.settings.deliveryFee) : 0;
  const total = Math.max(0, (afterItemDiscount - couponDiscount) + tax + delivery);

  return { lines, subtotal, discount: totalDiscount, tax, delivery, total, appliedCoupon };
}

function renderCart(){
  const wrap = document.getElementById("cartItems");
  const cart = getCart();
  if(!wrap) return;

  if(cart.length === 0){
    wrap.innerHTML = `<div class="text-muted">Cart is empty.</div>`;
    updateTotals();
    return;
  }

  const bill = computeBill();
  wrap.innerHTML = bill.lines.map(line => {
    const offerText = [];
    if(line.offerPercent > 0) offerText.push(`${line.offerPercent}% OFF`);
    if(line.bogo) offerText.push(`BOGO (free: ${line.freeCount})`);

    return `
      <div class="border rounded-3 p-2 mb-2 bg-white">
        <div class="d-flex justify-content-between">
          <div>
            <div class="fw-semibold">${line.itemName}</div>
            <div class="small-muted">${line.restaurantName}</div>
            ${offerText.length ? `<div class="small text-success">${offerText.join(" • ")}</div>` : ""}
          </div>
          <div class="text-end">
            <div class="fw-bold">₹${Math.round(line.lineNet)}</div>
            <div class="small-muted">${line.qty} × ₹${line.price}</div>
          </div>
        </div>
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-sm btn-outline-dark" onclick="changeQty('${line.restaurantId}','${line.itemId}',-1)">-</button>
          <button class="btn btn-sm btn-outline-dark" onclick="changeQty('${line.restaurantId}','${line.itemId}',1)">+</button>
        </div>
      </div>
    `;
  }).join("");

  updateTotals();
}

function updateTotals(){
  const bill = computeBill();
  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
  setText("subtotal", `₹${Math.round(bill.subtotal)}`);
  setText("discount", `- ₹${Math.round(bill.discount)}`);
  setText("tax", `₹${Math.round(bill.tax)}`);
  setText("delivery", `₹${Math.round(bill.delivery)}`);
  setText("total", `₹${Math.round(bill.total)}`);

  const msg = document.getElementById("couponMsg");
  if(msg && bill.appliedCoupon?.code){
    msg.innerHTML = `<span class="text-success">Applied: <b>${bill.appliedCoupon.code}</b> (${bill.appliedCoupon.percent}% off)</span>`;
  }
}

function renderOffers(){
  const db = getDB();
  const cart = getCart();
  const offersList = document.getElementById("offersList");
  if(!offersList) return;

  if(cart.length === 0){
    offersList.innerHTML = `<div class="text-muted">No offers (cart empty).</div>`;
    return;
  }

  const offers = [];
  cart.forEach(ci => {
    const r = db.restaurants.find(x => x.id === ci.restaurantId);
    const it = r?.items.find(x => x.id === ci.itemId);
    if(!it) return;
    if(it.offerPercent > 0) offers.push(`🔥 ${it.name}: ${it.offerPercent}% OFF`);
    if(it.bogo) offers.push(`🎁 ${it.name}: Buy 1 Get 1`);
  });

  offersList.innerHTML = offers.length
    ? offers.map(o => `<div>• ${o}</div>`).join("")
    : `<div class="text-muted">No item offers in your cart.</div>`;
}

function applyCoupon(){
  const db = getDB();
  const input = document.getElementById("couponInput")?.value.trim().toUpperCase() || "";
  const msg = document.getElementById("couponMsg");
  if(!msg) return;

  if(!input){
    setAppliedCoupon(null);
    msg.innerHTML = `<span class="text-muted">Enter a coupon code.</span>`;
    updateTotals();
    return;
  }

  const c = db.coupons.find(x => x.code.toUpperCase() === input);
  if(!c){
    setAppliedCoupon(null);
    msg.innerHTML = `<span class="text-danger">Invalid coupon.</span>`;
    updateTotals();
    return;
  }

  setAppliedCoupon({ code: c.code.toUpperCase(), percent: Number(c.percent) });
  msg.innerHTML = `<span class="text-success">Coupon applied.</span>`;
  updateTotals();
}

// ✅ FIXED CHECKOUT
function checkout(){
  const msg = document.getElementById("checkoutMsg");
  const cart = getCart();

  if(!msg){
    alert("checkoutMsg element missing in HTML.");
    return;
  }

  if(cart.length === 0){
    msg.innerHTML = `<span class="text-danger">Cart is empty.</span>`;
    return;
  }

  const bill = computeBill();
  msg.innerHTML = `<span class="text-success">✅ Order placed! Total paid: <b>₹${Math.round(bill.total)}</b></span>`;

  // ✅ Clear cart after checkout (enabled)
  saveCart([]);
  setAppliedCoupon(null);
  const c = document.getElementById("couponInput");
  const cm = document.getElementById("couponMsg");
  if(c) c.value = "";
  if(cm) cm.innerHTML = "";
  renderCart();
  renderOffers();
}

// ---------------------- SELLER (same as before) ----------------------
let editingItemId = null;

function renderSellerRestaurants(){
  const db = getDB();
  const sel = document.getElementById("sellerRestaurantSelect");
  if(!sel) return;
  sel.innerHTML = db.restaurants.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
}

function addRestaurant(){
  const name = document.getElementById("newRestaurantName")?.value.trim();
  if(!name) return;
  const db = getDB();
  db.restaurants.push({ id: crypto.randomUUID(), name, items: [], reviews: [] });
  saveDB(db);
  document.getElementById("newRestaurantName").value = "";
  renderSellerRestaurants();
  renderSellerItems();
}

function renderSellerCoupons(){
  const db = getDB();
  const list = document.getElementById("couponAdminList");
  if(!list) return;

  list.innerHTML = db.coupons.length
    ? db.coupons.map((c, i) => `
      <div class="d-flex justify-content-between align-items-center border rounded-3 p-2 mb-1 bg-white">
        <div><b>${c.code}</b> <span class="small-muted">(${c.percent}% off)</span></div>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCoupon(${i})">Delete</button>
      </div>
    `).join("")
    : `<div class="text-muted">No coupons.</div>`;
}

function addCoupon(){
  const code = document.getElementById("newCouponCode")?.value.trim().toUpperCase();
  const percent = Number(document.getElementById("newCouponPercent")?.value);
  if(!code || !percent) return;

  const db = getDB();
  db.coupons.push({ code, percent });
  saveDB(db);

  document.getElementById("newCouponCode").value = "";
  document.getElementById("newCouponPercent").value = "";
  renderSellerCoupons();
}

function deleteCoupon(idx){
  const db = getDB();
  db.coupons.splice(idx, 1);
  saveDB(db);
  renderSellerCoupons();
}

document.addEventListener("input", (e) => {
  if(e.target?.id === "deliveryFeeInput"){
    const db = getDB();
    db.settings.deliveryFee = Number(e.target.value || 0);
    saveDB(db);
  }
});

function renderSellerItems(){
  const db = getDB();
  const rid = document.getElementById("sellerRestaurantSelect")?.value;
  const wrap = document.getElementById("sellerItemsTable");
  if(!rid || !wrap) return;

  const r = db.restaurants.find(x => x.id === rid);
  if(!r){
    wrap.innerHTML = `<div class="text-muted">Select a restaurant.</div>`;
    return;
  }

  wrap.innerHTML = r.items.length ? `
    <table class="table align-middle">
      <thead>
        <tr>
          <th>Name</th><th>Category</th><th>Price</th><th>Offer</th><th>BOGO</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${r.items.map(it => `
          <tr>
            <td class="fw-semibold">${it.name}</td>
            <td>${it.category}</td>
            <td>₹${it.price}</td>
            <td>${it.offerPercent ? it.offerPercent + "%" : "-"}</td>
            <td>${it.bogo ? "Yes" : "No"}</td>
            <td class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-dark" onclick="editItem('${it.id}')">Edit</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${it.id}')">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<div class="text-muted">No items yet.</div>`;
}

function addOrUpdateItem(){
  const rid = document.getElementById("sellerRestaurantSelect")?.value;
  const name = document.getElementById("itemName")?.value.trim();
  const price = Number(document.getElementById("itemPrice")?.value);
  const category = document.getElementById("itemCategory")?.value;
  const offerPercent = Number(document.getElementById("itemOfferPercent")?.value || 0);
  const bogo = !!document.getElementById("itemBogo")?.checked;

  const msg = document.getElementById("sellerItemMsg");
  if(msg) msg.innerHTML = "";

  if(!rid || !name || !price || price <= 0){
    if(msg) msg.innerHTML = `<span class="text-danger">Enter valid item name and price.</span>`;
    return;
  }

  const db = getDB();
  const r = db.restaurants.find(x => x.id === rid);
  if(!r) return;

  if(editingItemId){
    const it = r.items.find(x => x.id === editingItemId);
    if(!it) return;
    Object.assign(it, { name, price, category, offerPercent, bogo });
    if(msg) msg.innerHTML = `<span class="text-success">Updated.</span>`;
  } else {
    r.items.push({ id: crypto.randomUUID(), name, price, category, offerPercent, bogo });
    if(msg) msg.innerHTML = `<span class="text-success">Added.</span>`;
  }

  saveDB(db);
  clearItemForm();
  renderSellerItems();
}

function editItem(itemId){
  const db = getDB();
  const rid = document.getElementById("sellerRestaurantSelect")?.value;
  const r = db.restaurants.find(x => x.id === rid);
  const it = r?.items.find(x => x.id === itemId);
  if(!it) return;

  editingItemId = itemId;
  document.getElementById("itemName").value = it.name;
  document.getElementById("itemPrice").value = it.price;
  document.getElementById("itemCategory").value = it.category;
  document.getElementById("itemOfferPercent").value = it.offerPercent || 0;
  document.getElementById("itemBogo").checked = !!it.bogo;
}

function deleteItem(itemId){
  const db = getDB();
  const rid = document.getElementById("sellerRestaurantSelect")?.value;
  const r = db.restaurants.find(x => x.id === rid);
  if(!r) return;
  r.items = r.items.filter(x => x.id !== itemId);
  saveDB(db);
  renderSellerItems();
}

function clearItemForm(){
  editingItemId = null;
  const ids = ["itemName","itemPrice","itemOfferPercent"];
  ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
  const b = document.getElementById("itemBogo"); if(b) b.checked = false;
}

function seedDemo(){
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(COUPON_APPLIED_KEY);
  activeRestaurantId = null;
  initPortal();
}

// ---------------------- INIT + ROLE BASED VIEW ----------------------
function initPortal(){
  const session = requireAuth();
  if(!session) return;

  const who = document.getElementById("whoAmI");
  if(who){
    who.innerText = session.role === "buyer" ? `Buyer: ${session.buyerName}` : `Seller (Company)`;
  }

  if(session.role === "buyer"){
    document.getElementById("buyerSection").classList.remove("d-none");
    document.getElementById("sellerSection").classList.add("d-none");
    getDB();
    renderBuyer();
  } else {
    document.getElementById("sellerSection").classList.remove("d-none");
    document.getElementById("buyerSection").classList.add("d-none");
    const db = getDB();
    const fee = document.getElementById("deliveryFeeInput");
    if(fee) fee.value = db.settings.deliveryFee;
    renderSellerRestaurants();
    renderSellerCoupons();
    renderSellerItems();
  }
}

initPortal();

// ✅ IMPORTANT: make onclick functions always available globally
window.logout = logout;
window.renderBuyer = renderBuyer;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.clearCart = clearCart;
window.applyCoupon = applyCoupon;
window.checkout = checkout;
window.submitReview = submitReview;

window.seedDemo = seedDemo;
window.addRestaurant = addRestaurant;
window.addCoupon = addCoupon;
window.deleteCoupon = deleteCoupon;
window.renderSellerItems = renderSellerItems;
window.addOrUpdateItem = addOrUpdateItem;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.clearItemForm = clearItemForm;
