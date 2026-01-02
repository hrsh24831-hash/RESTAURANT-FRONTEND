const API = "https://my-restaurant-x9zw.onrender.com/";


const token = localStorage.getItem("token");
document.addEventListener("click", enableSound, { once: true });

let soundEnabled = true;

function requireUserAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
  }
}



function requireAdminAuth() {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    window.location.href = "admin-login.html";
  }
}
let currentOrderFilter = "ALL";
let cachedOrders = [];





/* =========================
   CART (SINGLE SOURCE)
========================= */
const cart = {
  thaliType: "NORMAL",
  basePrice: 70,
  sabzi: [],
  items: [],        // 🔥 REQUIRED
  instructions: ""
};
document.addEventListener("DOMContentLoaded", () => {
  const instructionsBox = document.getElementById("instructions");

  if (instructionsBox) {
    instructionsBox.addEventListener("input", e => {
      cart.instructions = e.target.value;
      console.log("INSTRUCTIONS LIVE:", cart.instructions);
      renderCartSummary();
    });
  }
});


/* =========================
   THALI SELECTION
========================= */
function selectThali(type) {
  cart.thaliType = type;
  cart.basePrice = type === "NORMAL" ? 70 : 80;
  cart.sabzi = [];

  updateTotal();
  loadCustomerMenu();
  renderCartSummary();
    renderCheckout();

}

/* =========================
   TOTAL
========================= */
function updateTotal() {
  let total = cart.basePrice;

(cart.items || []).forEach(item => {
  total += item.price * item.quantity;
});


  document.getElementById("total").innerText = total;
}


/* =========================
   SABZI RULES
========================= */
function canAddSabzi(item) {
  const limit = cart.thaliType === "NORMAL" ? 2 : 3;

  if (cart.thaliType === "NORMAL" && item.name.toLowerCase().includes("paneer")) {
    alert("Paneer is not allowed in Normal Thali");
    return false;
  }

  if (cart.sabzi.length >= limit) {
    alert(`You can select only ${limit} sabzi`);
    return false;
  }

  return true;
}

function toggleSabzi(name, checked, limit) {
  if (checked) {
    if (cart.sabzi.length >= limit) {
      alert(`You can select only ${limit} sabzi`);
      return;
    }

    if (!cart.sabzi.find(s => s.name === name)) {
      cart.sabzi.push({ name });
    }
  } else {
    cart.sabzi = cart.sabzi.filter(s => s.name !== name);
  }

  renderCheckout();
  renderCartSummary();
  updateTotal();
}



/* =========================
   LOAD MENU
========================= */
function loadCustomerMenu() {
  fetch(`${API}/menu`)
    .then(res => res.json())
    .then(menu => {
      renderItems(menu);
      renderSabzi(menu);
    });
}


function renderSabzi(menu) {
  const area = document.getElementById("menuArea");
  if (!area) return;

  area.innerHTML = "";

  const limit = cart.thaliType === "NORMAL" ? 2 : 3;

  menu.forEach(item => {
    if (item.type !== "SABZI") return;

    // ❌ Normal thali me paneer allow nahi
    if (
      cart.thaliType === "NORMAL" &&
      item.name.toLowerCase().includes("paneer")
    ) {
      return;
    }

    area.innerHTML += `
      <label class="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
        <input type="checkbox"
          onchange="toggleSabzi('${item.name}', this.checked, ${limit})"
        />
        <span class="font-medium">${item.name}</span>
      </label>
    `;
  });
}



/* =========================
   INSTRUCTIONS
========================= */
function updateInstructions(value) {
  cart.instructions = value;
  console.log("INSTRUCTIONS:", cart.instructions);
  renderCartSummary();
}


/* =========================
   CART SUMMARY
========================= */
function renderCartSummary() {
  const box = document.getElementById("cartSummary");

  const sabziText =
    cart.sabzi.length
      ? cart.sabzi.map(s => `• ${s.name}`).join("<br>")
      : "No sabzi selected";

  const itemsText =
    cart.items.length
      ? cart.items.map(i => `• ${i.name} × ${i.quantity}`).join("<br>")
      : "No extra items";

  box.innerHTML = `
    <p><b>Thali:</b> ${cart.thaliType}</p>
    <p><b>Sabzi:</b><br>${sabziText}</p>
    <p><b>Items:</b><br>${itemsText}</p>
    <p><b>Instructions:</b> ${cart.instructions || "None"}</p>
  `;
}


/* =========================
   PLACE ORDER (NEXT STEP)
========================= */
function placeOrder() {
  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Please login first", "error");
    return;
  }

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true;
  btn.innerText = "Placing order...";

  fetch(`${API}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      thaliType: cart.thaliType,
      sabzi: cart.sabzi,
      items: cart.items,
      instructions: cart.instructions,
      totalAmount: Number(document.getElementById("total").innerText)
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Order failed");
    return res.json();
  })
  .then(order => {
    localStorage.setItem("orderId", order._id);
    showToast("Order placed successfully");
    window.location.href = "track.html";
  })
  .catch(err => {
    console.error(err);
    btn.disabled = false;
    btn.innerText = "Place Order";
    showToast("Order failed. Try again", "error");
  });
}



function renderItems(menu) {
  if (!Array.isArray(menu)) return;

  const area = document.getElementById("itemsArea");
  if (!area) return;

  area.innerHTML = "";

  menu.forEach(item => {
    if (item.type !== "ITEM") return;

    area.innerHTML += `
      <div class="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
        <div>
          <p class="font-semibold">${item.name}</p>
          <p class="text-sm text-slate-500">₹${item.price}</p>
        </div>
        <button
          class="bg-orange-500 text-white px-3 py-1 rounded-lg"
          onclick="addExtraItem('${item._id}', '${item.name}', ${item.price})">
          Add
        </button>
      </div>
    `;
  });
}









function toggleMenu(id) {
  fetch(`${API}/admin/toggle/${id}`, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("adminToken")
    }
  })
  .then(() => loadMenu())
  .catch(() => alert("Toggle failed"));
}


function loadMenu() {
  fetch(`${API}/menu`)
    .then(res => res.json())
    .then(menu => {
      const list = document.getElementById("menuList");
      list.innerHTML = "";

      menu.forEach(item => {
        list.innerHTML += `
          <div class="bg-white p-3 rounded shadow flex justify-between items-center">
            <div>
              <p class="font-bold">${item.name}</p>
              <p class="text-sm text-gray-500">
                ${item.type} ${item.type === "ITEM" ? `• ₹${item.price}` : ""}
              </p>
            </div>

            <button
              onclick="toggleMenu('${item._id}')"
              class="px-3 py-1 rounded text-white ${
                item.active ? "bg-red-500" : "bg-green-600"
              }">
              ${item.active ? "Disable" : "Enable"}
            </button>
          </div>
        `;
      });
    });
}



function addSabzi() {
  const name = document.getElementById("sabziName").value.trim();
  if (!name) return alert("Enter sabzi name");

  fetch(`${API}/admin/sabzi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("adminToken")
    },
    body: JSON.stringify({ name })
  })
  .then(res => res.json())
  .then(() => {
    document.getElementById("sabziName").value = "";
    loadMenu();
  })
  .catch(() => alert("Failed to add sabzi"));
}




function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const price = Number(document.getElementById("itemPrice").value);

  if (!name || price <= 0) {
    return alert("Enter valid item & price");
  }

  fetch(`${API}/admin/item`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("adminToken")
    },
    body: JSON.stringify({ name, price })
  })
  .then(res => res.json())
  .then(() => {
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    loadMenu();
  })
  .catch(() => alert("Failed to add item"));
}



function sendAdminOtp() {
  const email = document.getElementById("email").value;

  if (!email) {
    alert("Please enter admin email");
    return;
  }

  fetch(`${API}/auth/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    alert("OTP sent (check backend terminal)");
  })
  .catch(err => {
    console.error(err);
    alert("Failed to send OTP");
  });
}

function verifyAdminOtp() {
  const email = document.getElementById("email").value;
  const otp = document.getElementById("otp").value;

  fetch(`${API}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp })
  })
  .then(res => res.json())
  .then(async data => {
    if (!data.token) {
      alert("Invalid OTP");
      return;
    }

    localStorage.setItem("adminToken", data.token);

    // 🔔 IMPORTANT: ask permission BEFORE redirect
    await registerForPush(data.token);

    // ✅ redirect AFTER permission logic
    window.location.href = "admin.html";
  })
  .catch(err => {
    console.error(err);
    alert("OTP verification failed");
  });
}



function sendOtp() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Please enter email");
    return;
  }

  fetch(`${API}/auth/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(() => {
    alert("OTP sent (check backend terminal)");
  })
  .catch(err => {
    console.error(err);
    alert("Failed to send OTP");
  });
}



async function verifyOtp() {
  const email = document.getElementById("email").value.trim();
  const otp = document.getElementById("otp").value.trim();

  if (!email || !otp) {
    alert("Email and OTP required");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, otp })
    });

    const data = await res.json();

    if (!data.token) {
      alert("Invalid OTP");
      return;
    }

    // ✅ Save token
    localStorage.setItem("token", data.token);

    // 🔔 Ask permission + register service worker BEFORE redirect
    await registerForPush(data.token);

    // ✅ Redirect AFTER permission logic
fetch(`${API}/user/me`, {
  headers: {
    Authorization: "Bearer " + data.token
  }
})
.then(res => res.json())
.then(user => {
  if (!user.name || !user.phone) {
    window.location.href = "profile.html";
  } else {
    window.location.href = "thali.html";
  }
});

  } catch (err) {
    console.error(err);
    alert("OTP verification failed");
  }
}

/* =========================
   ADMIN – SOUND & UI HELPERS
========================= */



function playAdminSound() {
  if (!soundEnabled) return;

  const audio = new Audio("/frontend/sounds/new-order.wav");
  audio.play().catch(() => {});
}


function resetNewOrderCount() {
  unseenOrders = 0;
  const badge = document.getElementById("newOrderCount");
  if (badge) badge.innerText = "0";
}

function loadOrders() {
  const token = localStorage.getItem("adminToken");
  if (!token) return;

  fetch(`${API}/admin/orders`, {
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.json())
    .then(orders => {
      const pendingDiv = document.getElementById("pendingOrders");
      const readyDiv = document.getElementById("readyOrders");
      const completedDiv = document.getElementById("completedOrders");

      if (!pendingDiv || !readyDiv || !completedDiv) return;

      pendingDiv.innerHTML = "";
      readyDiv.innerHTML = "";
      completedDiv.innerHTML = "";

      let pending = 0;
      let delivered = 0;

      orders.forEach(order => {
        const card = `
          <div class="order-card bg-white p-4 rounded-xl shadow">
            <p class="font-bold text-lg">₹${order.totalAmount}</p>
            <p class="text-sm text-slate-500 mb-1">Thali: ${order.thaliType || "Normal"}</p>
            <p class="text-sm mb-2">Status: <b>${order.status}</b></p>

            <p class="text-sm font-semibold mt-2">Sabzi:</p>
            <ul class="ml-4 list-disc text-sm">
              ${(order.sabzi || []).map(s => `<li>${s.name}</li>`).join("")}
            </ul>

            <p class="text-sm font-semibold mt-2">Items:</p>
            <ul class="ml-4 list-disc text-sm">
              ${(order.items || []).map(i => `<li>${i.name} × ${i.quantity}</li>`).join("")}
            </ul>

            <select
              class="mt-4 border rounded p-1 w-full"
              onchange="updateOrderStatus('${order._id}', this.value)">
              ${["RECEIVED","PREPARING","PACKED","OUT_FOR_DELIVERY","DELIVERED"]
                .map(s => `<option ${order.status === s ? "selected" : ""}>${s}</option>`)
                .join("")}
            </select>
          </div>
        `;

        if (order.status === "DELIVERED") {
          completedDiv.innerHTML += card;
          delivered++;
        } 
        else if (order.status === "PREPARING" || order.status === "PACKED") {
          readyDiv.innerHTML += card;
        } 
        else {
          pendingDiv.innerHTML += card;
          pending++;
        }
      });

      // update top stats (single source)
      
    })
    .catch(err => {
      console.error("Failed to load orders:", err);
    });
     highlightNewOrder()
  
     loadDailyStats();
}



function updateOrderStatus(orderId, status) {
  fetch(`${API}/admin/order-status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("adminToken")
    },
    body: JSON.stringify({ orderId, status })
  })
  .then(() => loadOrders())
  .catch(err => console.error("Status update failed", err));
}






function addExtraItem(id, name, price) {
  const existing = cart.items.find(i => i.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({
      id,
      name,
      price,
      quantity: 1
    });
  }

  renderCheckout();
  renderCartSummary();
  updateTotal();
}



function renderCheckout() {
  const box = document.getElementById("checkoutItems");
  if (!box) return;

  box.innerHTML = "";

  // SABZI
  if (cart.sabzi.length > 0) {
    box.innerHTML += `<p class="font-semibold mt-2">Sabzi:</p>`;
    cart.sabzi.forEach(s => {
      box.innerHTML += `<p class="text-sm">• ${s.name}</p>`;
    });
  }

  // EXTRA ITEMS
  if (cart.items.length > 0) {
    box.innerHTML += `<p class="font-semibold mt-2">Extra Items:</p>`;
    cart.items.forEach(i => {
      box.innerHTML += `
        <p class="text-sm flex justify-between">
          <span>${i.name} × ${i.quantity}</span>
          <span>₹${i.price * i.quantity}</span>
        </p>
      `;
    });
  }

  // EMPTY
  if (cart.sabzi.length === 0 && cart.items.length === 0) {
    box.innerHTML = `<p class="text-sm text-slate-400">No items selected</p>`;
  }
}



function trackOrder() {
  const token = localStorage.getItem("token");
  const orderId = localStorage.getItem("orderId");
  if (!orderId) return;

  fetch(`${API}/order/${orderId}`, {
    headers: { Authorization: "Bearer " + token }
  })
  .then(res => res.json())
  .then(order => {
    // 🔥 THIS WAS MISSING
    document.getElementById("status").innerText =
      order.status.replace(/_/g, " ");

    // 🔥 ALSO STORE RAW STATUS
    window.currentOrderStatus = order.status;
  });
}



function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}


function saveProfile() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!name || !phone) {
    alert("Name and phone are required");
    return;
  }

  fetch(`${API}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ name, phone })
  })
  .then(res => res.json())
  .then(() => {
    window.location.href = "thali.html";
  })
  .catch(() => alert("Failed to save profile"));
}




function loadAccount() {
  fetch(`${API}/user/me`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  })
  .then(res => res.json())
  .then(user => {
    document.getElementById("email").innerText = user.email || "-";
    document.getElementById("name").value = user.name || "";
    document.getElementById("phone").value = user.phone || "";
  })
  .catch(() => alert("Failed to load account"));
}



function updateProfile() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!name || !phone) {
    alert("Name and phone are required");
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    alert("Enter valid 10-digit phone number");
    return;
  }

  fetch(`${API}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ name, phone })
  })
  .then(res => res.json())
  .then(() => {
    showToast("Profile updated");

  })
  .catch(() => alert("Update failed"));
}



function loadRecentOrders() {
  const list = document.getElementById("ordersList");
list.innerHTML = "<p class='text-center text-slate-400'>Loading orders...</p>";

  fetch(`${API}/order/my/recent`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  })
  .then(res => res.json())
  .then(orders => {
    const list = document.getElementById("ordersList");
    const empty = document.getElementById("emptyState");

    list.innerHTML = "";

    if (!orders.length) {
      empty.classList.remove("hidden");
      return;
    }

    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleString();

      list.innerHTML += `
        <div onclick="openOrder('${order._id}')"
             class="bg-white p-4 rounded-xl shadow cursor-pointer hover:bg-slate-50">
          <div class="flex justify-between items-center">
            <p class="font-semibold">₹${order.totalAmount}</p>
            <span class="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
              ${order.status.replace(/_/g, " ")}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">${date}</p>
        </div>
      `;
    });
  })
  .catch(() => alert("Failed to load orders"));
}


function openOrder(orderId) {
  localStorage.setItem("orderId", orderId);
  window.location.href = "track.html";
}


function showToast(message, type = "success") {
  const toast = document.createElement("div");

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-slate-800"
  };

  toast.className = `
    fixed bottom-6 left-1/2 -translate-x-1/2
    ${colors[type]}
    text-white px-4 py-2 rounded-xl shadow-lg
    z-50 text-sm
  `;

  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}


let unseenOrders = 0;


let lastOrderTimestamp = Date.now();



function highlightNewOrder() {
  const container = document.getElementById("pendingOrders");
  if (!container) return;

  container.classList.add("ring-4", "ring-red-300");

  setTimeout(() => {
    container.classList.remove("ring-4", "ring-red-300");
  }, 2000);
}


function enableSound() {
  const audio = new Audio("/frontend/sounds/new-order.wav");
  audio.muted = true;
  audio.play().then(() => {
    audio.pause();
    audio.muted = false;
    soundEnabled = true;
  });
}


function setOrderFilter(filter) {
  currentOrderFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.classList.remove("active")
  );

  const activeBtn = [...document.querySelectorAll(".filter-btn")]
    .find(b => b.innerText.replace(" ", "_").toUpperCase() === filter);

  if (activeBtn) activeBtn.classList.add("active");

  renderFilteredOrders();
}


function renderFilteredOrders() {
  const pendingDiv = document.getElementById("pendingOrders");
  const readyDiv = document.getElementById("readyOrders");
  const completedDiv = document.getElementById("completedOrders");

  pendingDiv.innerHTML = "";
  readyDiv.innerHTML = "";
  completedDiv.innerHTML = "";

  cachedOrders.forEach(order => {
    if (!matchesFilter(order)) return;

    const card = buildOrderCard(order);

    if (order.status === "DELIVERED") {
      completedDiv.innerHTML += card;
    } else if (["PACKED", "OUT_FOR_DELIVERY"].includes(order.status)) {
      readyDiv.innerHTML += card;
    } else {
      pendingDiv.innerHTML += card;
    }
  });
}


function buildOrderCard(order) {
  return `
    <div class="bg-white p-4 rounded shadow mb-3">
      <p class="font-bold">₹${order.totalAmount}</p>
      <p>Status: ${order.status}</p>

      <p class="mt-2 font-semibold">Items:</p>
      <ul class="ml-4 list-disc">
        ${(order.items || []).map(i => `<li>${i.name} × ${i.quantity}</li>`).join("")}
      </ul>
      ${order.instructions ? `
  <p class="mt-2 text-sm">
    <b>Instructions:</b> ${order.instructions}
  </p>
` : ""}


      <select class="mt-3 border p-1"
        onchange="updateOrderStatus('${order._id}', this.value)">
        ${["RECEIVED","PREPARING","PACKED","OUT_FOR_DELIVERY","DELIVERED"]
          .map(s => `<option ${order.status === s ? "selected" : ""}>${s}</option>`)
          .join("")}
      </select>
    </div>
  `;
}



function matchesFilter(order) {
  if (currentOrderFilter === "ALL") return true;

  if (currentOrderFilter === "PENDING") {
    return ["RECEIVED", "PREPARING"].includes(order.status);
  }

  if (currentOrderFilter === "IN_PROGRESS") {
    return ["PACKED", "OUT_FOR_DELIVERY"].includes(order.status);
  }

  if (currentOrderFilter === "DELIVERED") {
    return order.status === "DELIVERED";
  }

  return true;
}


function loadDailyStats() {
  const token = localStorage.getItem("adminToken");
  if (!token) return;

  fetch(`${API}/admin/daily-stats`, {
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("statOrders").innerText = data.totalOrders;
      document.getElementById("statRevenue").innerText = data.revenue;
      document.getElementById("statPending").innerText = data.pending;
      document.getElementById("statDelivered").innerText = data.delivered;
    })
    .catch(err => console.error("Stats load failed", err));
}
setInterval(() => {
  loadDailyStats();
}, 5000);





