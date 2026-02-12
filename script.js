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
    {
      id: crypto.randomUUID(),
      name: "Spice Kingdom",
      items: seedItems("Spice Kingdom")
    },
    {
      id: crypto.randomUUID(),
      name: "Urban Biryani",
      items: seedItems("Urban Biryani")
    },
    {
      id: crypto.randomUUID(),
      name: "Sweet Haven",
      items: seedItems("Sweet Haven")
    }
  ]
});

function seedItems(rname){
  // 6 categories, at least 6 dishes each
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

  // create items with some offers/BOGO mixed
  let items = [];
  Object.entries(base).forEach(([cat, list], idx) => {
    list.forEach((d, i) => {
      const offerPercent = (i === 1 && idx % 2 === 0) ? 15 : 0;     // some 15% off
      const bogo = (i === 0 && idx % 3 === 0) ? true : false;       // some BOGO
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
  return JSON.parse(raw);
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getAppliedCoupon(){
  return JSON.parse(localStorage.getItem(COUPON_APPLIED_KEY) || "null");
}
function setAppliedCoupon(c){
  localStorage.setItem(COUPON_APPLIED_KEY, JSON.stringify(c));
}

// ---------------------- UI TOGGLES ----------------------
function showBuyer(){
  document.getElementById("buyerSection").classList.remove("d-none");
  document.getElementById("sellerSection").classList.add("d-none");
  renderBuyer();
}
function showSeller(){
  document.getElementById("sellerSection").classList.remove("d-none");
  document.getElementById("buyerSection").classList.add("d-none");
  renderSellerRestaurants();
  renderSellerCoupons();
  renderSellerItems();
}

// ---------------------- BUYER RENDER ----------------------
let activeRestaurantId = null;

function renderBuyer(){
  const db = getDB();
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();

  // restaurants list
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

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold">${r.name}</div>
            <div class="small-muted">Items: ${r.items.length}</div>
          </div>
          <span class="pill">Open</span>
        </div>
      `;

      col.appendChild(card);
      wrap.appendChild(col);
    });

  // menu
  const badge = document.getElementById("activeRestaurantBadge");
  const menuArea = document.getElementById("menuArea");

  if(!activeRestaurantId){
    badge.innerText = "Select a restaurant";
    menuArea.innerHTML = `<div class="text-muted">Choose a restaurant to see its menu.</div>`;
  } else {
    const r = db.restaurants.find(x => x.id === activeRestaurantId);
    badge.innerText = r ? r.name : "Restaurant";
    if(!r){
      menuArea.innerHTML = `<div class="text-muted">Restaurant not found.</div>`;
    } else {
      menuArea.innerHTML = renderMenuColumns(r, q);
      bindAddToCartButtons(r.id);
    }
  }

  renderCart();
  renderOffers();
}

function renderMenuColumns(restaurant, q){
  const categories = ["Starters","Soups","Biryanis","Desserts","Drinks","Specials"];

  const filtered = restaurant.items.filter(it => it.name.toLowerCase().includes(q) || restaurant.name.toLowerCase().includes(q));

  const byCat = {};
  categories.forEach(c => byCat[c] = []);
  filtered.forEach(it => {
    if(!byCat[it.category]) byCat[it.category] = [];
    byCat[it.category].push(it);
  });

  let html = `<div class="row g-3">`;

  categories.forEach(cat => {
    html += `
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="m-0">${cat}</h5>
              <span class="pill">${byCat[cat].length} items</span>
            </div>
            <div class="menu-grid">`;

    (byCat[cat] || []).forEach(it => {
      const offerLine = it.offerPercent > 0 ? `<span class="pill">🔥 ${it.offerPercent}% OFF</span>` : "";
      const bogoLine = it.bogo ? `<span class="pill">🎁 BOGO</span>` : "";
      const badges = (offerLine || bogoLine) ? `<div class="d-flex gap-2 flex-wrap mt-1">${offerLine}${bogoLine}</div>` : "";

      html += `
        <div class="menu-item">
          <div class="d-flex justify-content-between">
            <div class="fw-semibold">${it.name}</div>
            <div class="fw-bold">₹${it.price}</div>
          </div>
          ${badges}
          <button class="btn btn-sm btn-dark w-100 mt-2 addToCartBtn"
            data-rid="${restaurant.id}"
            data-iid="${it.id}">
            Add to Cart
          </button>
        </div>
      `;
    });

    html += `</div></div></div></div>`;
  });

  html += `</div>`;
  return html;
}

function bindAddToCartButtons(){
  document.querySelectorAll(".addToCartBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const rid = btn.dataset.rid;
      const iid = btn.dataset.iid;
      addToCart(rid, iid);
    });
  });
}

// ---------------------- CART LOGIC ----------------------
function addToCart(restaurantId, itemId){
  const db = getDB();
  const r = db.restaurants.find(x => x.id === restaurantId);
  if(!r) return;
  const it = r.items.find(x => x.id === itemId);
  if(!it) return;

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
  document.getElementById("couponInput").value = "";
  document.getElementById("couponMsg").innerHTML = "";
  renderCart();
  renderOffers();
}

// ---------------------- BILL CALC (OFFERS + BOGO + COUPONS) ----------------------
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

    // Base line total
    const lineBase = price * qty;

    // Item offer % discount
    const itemOfferDiscount = it.offerPercent ? (lineBase * (it.offerPercent / 100)) : 0;

    // ✅ BOGO FIX: for qty N, free items = floor(N/2)
    // e.g., buy 1 get 1 => pay for ceil(N/2)
    const freeCount = it.bogo ? Math.floor(qty / 2) : 0;
    const bogoDiscount = freeCount * price;

    const lineDiscount = itemOfferDiscount + bogoDiscount;
    const lineNet = lineBase - lineDiscount;

    subtotal += lineBase;
    discount += lineDiscount;

    return {
      restaurantName: r.name,
      itemName: it.name,
      price,
      qty,
      offerPercent: it.offerPercent,
      bogo: it.bogo,
      freeCount,
      lineBase,
      lineDiscount,
      lineNet
    };
  }).filter(Boolean);

  // Coupon discount applies on (subtotal - item discounts)
  const afterItemDiscount = Math.max(0, subtotal - discount);
  let couponDiscount = 0;

  if(appliedCoupon?.percent){
    couponDiscount = afterItemDiscount * (appliedCoupon.percent / 100);
  }

  const totalDiscount = discount + couponDiscount;

  const tax = (afterItemDiscount - couponDiscount) * db.settings.taxRate;
  const delivery = cart.length > 0 ? Number(db.settings.deliveryFee) : 0;
  const total = Math.max(0, (afterItemDiscount - couponDiscount) + tax + delivery);

  return {
    lines,
    subtotal,
    discount: totalDiscount,
    itemDiscount: discount,
    couponDiscount,
    tax,
    delivery,
    total,
    appliedCoupon
  };
}

function renderCart(){
  const db = getDB();
  const cart = getCart();
  const wrap = document.getElementById("cartItems");
  if(cart.length === 0){
    wrap.innerHTML = `<div class="text-muted">Cart is empty.</div>`;
    updateTotals();
    return;
  }

  const bill = computeBill();

  let html = "";
  bill.lines.forEach(line => {
    const offerText = [];
    if(line.offerPercent > 0) offerText.push(`${line.offerPercent}% OFF`);
    if(line.bogo) offerText.push(`BOGO (free: ${line.freeCount})`);

    html += `
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
          <button class="btn btn-sm btn-outline-dark" onclick="changeQty('${getCartKeySafe(line)}','${line.itemName}',0)" style="display:none"></button>
          <button class="btn btn-sm btn-outline-dark" onclick="changeQtyFromLine('${line.restaurantName}','${line.itemName}',-1)">-</button>
          <button class="btn btn-sm btn-outline-dark" onclick="changeQtyFromLine('${line.restaurantName}','${line.itemName}',1)">+</button>
        </div>
      </div>
    `;
  });

  wrap.innerHTML = html;
  updateTotals();
}

// helpers to change qty by finding ids safely
function changeQtyFromLine(restaurantName, itemName, delta){
  const db = getDB();
  const r = db.restaurants.find(x => x.name === restaurantName);
  if(!r) return;
  const it = r.items.find(x => x.name === itemName);
  if(!it) return;
  changeQty(r.id, it.id, delta);
}

function updateTotals(){
  const bill = computeBill();
  document.getElementById("subtotal").innerText = `₹${Math.round(bill.subtotal)}`;
  document.getElementById("discount").innerText = `- ₹${Math.round(bill.discount)}`;
  document.getElementById("tax").innerText = `₹${Math.round(bill.tax)}`;
  document.getElementById("delivery").innerText = `₹${Math.round(bill.delivery)}`;
  document.getElementById("total").innerText = `₹${Math.round(bill.total)}`;

  if(bill.appliedCoupon?.code){
    document.getElementById("couponMsg").innerHTML =
      `<span class="text-success">Applied: <b>${bill.appliedCoupon.code}</b> (${bill.appliedCoupon.percent}% off)</span>`;
  }
}

// ---------------------- OFFERS DISPLAY ----------------------
function renderOffers(){
  const db = getDB();
  const cart = getCart();
  const offersList = document.getElementById("offersList");
  if(cart.length === 0){
    offersList.innerHTML = `<div class="text-muted">No offers (cart empty).</div>`;
    return;
  }

  // show offers relevant to cart items
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

// ---------------------- COUPONS ----------------------
function applyCoupon(){
  const db = getDB();
  const input = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponMsg");

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

function checkout(){
  const cart = getCart();
  const msg = document.getElementById("checkoutMsg");
  if(cart.length === 0){
    msg.innerHTML = `<span class="text-danger">Cart is empty.</span>`;
    return;
  }
  const bill = computeBill();
  msg.innerHTML = `<span class="text-success">✅ Order placed! Total paid: <b>₹${Math.round(bill.total)}</b></span>`;
  // keep cart (or clear):
  // clearCart();
}

// ---------------------- SELLER AUTH ----------------------
let sellerAuthed = false;

function sellerLogin(){
  const u = document.getElementById("sellerUser").value.trim();
  const p = document.getElementById("sellerPass").value.trim();
  const msg = document.getElementById("sellerLoginMsg");

  if(u === "seller" && p === "1234"){
    sellerAuthed = true;
    msg.innerHTML = `<span class="text-success">Logged in.</span>`;
    document.getElementById("sellerPanel").classList.remove("d-none");
    renderSellerRestaurants();
    renderSellerCoupons();
    renderSellerItems();
    // load settings
    const db = getDB();
    document.getElementById("deliveryFeeInput").value = db.settings.deliveryFee;
  } else {
    msg.innerHTML = `<span class="text-danger">Wrong login.</span>`;
  }
}
function sellerLogout(){
  sellerAuthed = false;
  document.getElementById("sellerPanel").classList.add("d-none");
  document.getElementById("sellerLoginMsg").innerHTML = `<span class="text-muted">Logged out.</span>`;
}

// ---------------------- SELLER: RESTAURANTS ----------------------
function renderSellerRestaurants(){
  const db = getDB();
  const sel = document.getElementById("sellerRestaurantSelect");
  sel.innerHTML = db.restaurants.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
  if(!activeRestaurantId && db.restaurants[0]) activeRestaurantId = db.restaurants[0].id;
}

function addRestaurant(){
  if(!sellerAuthed) return;
  const name = document.getElementById("newRestaurantName").value.trim();
  if(!name) return;
  const db = getDB();
  db.restaurants.push({ id: crypto.randomUUID(), name, items: [] });
  saveDB(db);
  document.getElementById("newRestaurantName").value = "";
  renderSellerRestaurants();
  renderSellerItems();
  renderBuyer();
}

// ---------------------- SELLER: COUPONS & SETTINGS ----------------------
function renderSellerCoupons(){
  const db = getDB();
  const list = document.getElementById("couponAdminList");
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
  if(!sellerAuthed) return;
  const code = document.getElementById("newCouponCode").value.trim().toUpperCase();
  const percent = Number(document.getElementById("newCouponPercent").value);
  if(!code || !percent) return;

  const db = getDB();
  db.coupons.push({ code, percent });
  saveDB(db);

  document.getElementById("newCouponCode").value = "";
  document.getElementById("newCouponPercent").value = "";
  renderSellerCoupons();
}

function deleteCoupon(idx){
  if(!sellerAuthed) return;
  const db = getDB();
  db.coupons.splice(idx, 1);
  saveDB(db);
  renderSellerCoupons();
}

document.addEventListener("input", (e) => {
  if(e.target?.id === "deliveryFeeInput" && sellerAuthed){
    const db = getDB();
    db.settings.deliveryFee = Number(e.target.value || 0);
    saveDB(db);
    renderBuyer();
  }
});

// ---------------------- SELLER: ITEMS CRUD ----------------------
let editingItemId = null;

function renderSellerItems(){
  const db = getDB();
  const rid = document.getElementById("sellerRestaurantSelect")?.value;
  if(!rid) return;

  const r = db.restaurants.find(x => x.id === rid);
  const wrap = document.getElementById("sellerItemsTable");

  if(!r){
    wrap.innerHTML = `<div class="text-muted">Select a restaurant.</div>`;
    return;
  }

  if(r.items.length === 0){
    wrap.innerHTML = `<div class="text-muted">No items yet.</div>`;
    return;
  }

  wrap.innerHTML = `
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
  `;
}

function addOrUpdateItem(){
  if(!sellerAuthed) return;

  const rid = document.getElementById("sellerRestaurantSelect").value;
  const name = document.getElementById("itemName").value.trim();
  const price = Number(document.getElementById("itemPrice").value);
  const category = document.getElementById("itemCategory").value;
  const offerPercent = Number(document.getElementById("itemOfferPercent").value || 0);
  const bogo = document.getElementById("itemBogo").checked;

  const msg = document.getElementById("sellerItemMsg");

  if(!name || !price || price <= 0){
    msg.innerHTML = `<span class="text-danger">Enter valid item name and price.</span>`;
    return;
  }

  const db = getDB();
  const r = db.restaurants.find(x => x.id === rid);
  if(!r) return;

  if(editingItemId){
    const it = r.items.find(x => x.id === editingItemId);
    if(!it) return;
    it.name = name;
    it.price = price;
    it.category = category;
    it.offerPercent = offerPercent;
    it.bogo = bogo;
    msg.innerHTML = `<span class="text-success">Updated.</span>`;
  } else {
    r.items.push({ id: crypto.randomUUID(), name, price, category, offerPercent, bogo });
    msg.innerHTML = `<span class="text-success">Added.</span>`;
  }

  saveDB(db);
  clearItemForm();
  renderSellerItems();
  renderBuyer();
}

function editItem(itemId){
  if(!sellerAuthed) return;
  const db = getDB();
  const rid = document.getElementById("sellerRestaurantSelect").value;
  const r = db.restaurants.find(x => x.id === rid);
  const it = r?.items.find(x => x.id === itemId);
  if(!it) return;

  editingItemId = itemId;
  document.getElementById("itemName").value = it.name;
  document.getElementById("itemPrice").value = it.price;
  document.getElementById("itemCategory").value = it.category;
  document.getElementById("itemOfferPercent").value = it.offerPercent || 0;
  document.getElementById("itemBogo").checked = !!it.bogo;

  document.getElementById("sellerItemMsg").innerHTML = `<span class="text-muted">Editing item...</span>`;
}

function deleteItem(itemId){
  if(!sellerAuthed) return;
  const db = getDB();
  const rid = document.getElementById("sellerRestaurantSelect").value;
  const r = db.restaurants.find(x => x.id === rid);
  if(!r) return;
  r.items = r.items.filter(x => x.id !== itemId);
  saveDB(db);
  renderSellerItems();
  renderBuyer();
}

function clearItemForm(){
  editingItemId = null;
  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemOfferPercent").value = "";
  document.getElementById("itemBogo").checked = false;
  document.getElementById("sellerItemMsg").innerHTML = "";
}

// ---------------------- DEMO RESET ----------------------
function seedDemo(){
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(COUPON_APPLIED_KEY);
  activeRestaurantId = null;
  sellerAuthed = false;
  document.getElementById("sellerPanel").classList.add("d-none");
  showBuyer();
}

// ---------------------- INIT ----------------------
(function init(){
  getDB();      // ensure DB exists
  showBuyer();  // default view
})();
