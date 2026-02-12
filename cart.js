// cart.js — offers (% OFF + BOGO) + taxes + coupons + instant badge updates

function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart:updated"));
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadges() {
  const count = cartCount();
  document.querySelectorAll("[data-cart-count]").forEach(el => (el.textContent = count));
}

function initCartBadges() {
  updateCartBadges();
  window.addEventListener("cart:updated", updateCartBadges);
  window.addEventListener("storage", (e) => {
    if (e.key === "cart") updateCartBadges();
  });
}

/* ---------- COUPON STORAGE ---------- */
function setCoupon(code) {
  localStorage.setItem("coupon", (code || "").trim().toUpperCase());
  window.dispatchEvent(new Event("cart:updated"));
}
function getCoupon() {
  return (localStorage.getItem("coupon") || "").trim().toUpperCase();
}
function clearCoupon() {
  localStorage.removeItem("coupon");
  window.dispatchEvent(new Event("cart:updated"));
}

/* ---------- CART OPS ---------- */
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((c) => c.key === item.key);
  if (existing) existing.qty += 1;
  else cart.push({ ...item, qty: 1 });

  saveCart(cart);
  alert("Added to cart ✅");
}

function removeFromCart(key) {
  saveCart(getCart().filter((i) => i.key !== key));
  if (typeof renderCart === "function") renderCart();
}

function changeQty(key, delta) {
  const cart = getCart();
  const item = cart.find((i) => i.key === key);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    saveCart(cart.filter((i) => i.key !== key));
  } else {
    saveCart(cart);
  }

  if (typeof renderCart === "function") renderCart();
}

function clearCart() {
  localStorage.removeItem("cart");
  window.dispatchEvent(new Event("cart:updated"));
  if (typeof renderCart === "function") renderCart();
}

/* ---------- BILL CALCULATION ---------- */
/*
Offer types:
- PERCENT: offerValue = 40 means 40% off
- BOGO: buy1get1 => pay for ceil(qty/2), discount = floor(qty/2) * price
Coupons (demo):
- SAVE10 => extra 10% off after offer discount
- SAVE20 => extra 20% off after offer discount
- FREEPLATFORM => platform fee waived
*/
function calculateBill(cart) {
  let itemTotal = 0;
  let offerDiscount = 0;

  cart.forEach((i) => {
    const line = i.price * i.qty;
    itemTotal += line;

    if (i.offerType === "PERCENT") {
      offerDiscount += line * (Number(i.offerValue || 0) / 100);
    } else if (i.offerType === "BOGO") {
      offerDiscount += Math.floor(i.qty / 2) * i.price;
    }
  });

  const afterOffer = Math.max(0, itemTotal - offerDiscount);

  // Coupon logic
  const coupon = getCoupon();
  let couponDiscount = 0;

  if (coupon === "SAVE10") couponDiscount = afterOffer * 0.10;
  else if (coupon === "SAVE20") couponDiscount = afterOffer * 0.20;

  const afterCoupon = Math.max(0, afterOffer - couponDiscount);

  const gst = afterCoupon * 0.05; // 5% GST
  let platformFee = cart.length ? 20 : 0;
  if (coupon === "FREEPLATFORM") platformFee = 0;

  return {
    itemTotal: Math.round(itemTotal),
    offerDiscount: Math.round(offerDiscount),
    coupon,
    couponDiscount: Math.round(couponDiscount),
    gst: Math.round(gst),
    platformFee,
    payable: Math.round(afterCoupon + gst + platformFee),
  };
}
