// Array to store student records
let students = [];

// Elements
const form = document.getElementById("studentForm");
const tbody = document.getElementById("tbody");
const successMsg = document.getElementById("successMsg");

const nameEl = document.getElementById("name");
const rollEl = document.getElementById("roll");
const marksEl = document.getElementById("marks");
const deptEl = document.getElementById("dept");
const searchEl = document.getElementById("search");
const clearBtn = document.getElementById("clearBtn");
const statsEl = document.getElementById("stats");

// Error elements
const nameErr = document.getElementById("nameErr");
const rollErr = document.getElementById("rollErr");
const marksErr = document.getElementById("marksErr");
const deptErr = document.getElementById("deptErr");

// Grade calculation using if-else
function calculateGrade(marks) {
  let grade, result;

  if (marks >= 90) grade = "A+";
  else if (marks >= 80) grade = "A";
  else if (marks >= 70) grade = "B";
  else if (marks >= 60) grade = "C";
  else if (marks >= 50) grade = "D";
  else grade = "F";

  if (marks >= 50) result = "PASS";
  else result = "FAIL";

  return { grade, result };
}

function clearErrors() {
  nameErr.textContent = "";
  rollErr.textContent = "";
  marksErr.textContent = "";
  deptErr.textContent = "";
  successMsg.textContent = "";
}

function validateInputs() {
  clearErrors();

  const name = nameEl.value.trim();
  const roll = rollEl.value.trim();
  const marks = Number(marksEl.value);
  const dept = deptEl.value;

  let ok = true;

  if (name.length < 3) {
    nameErr.textContent = "Name must be at least 3 characters.";
    ok = false;
  }

  if (roll.length < 2) {
    rollErr.textContent = "Enter a valid roll number.";
    ok = false;
  }

  if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
    marksErr.textContent = "Marks must be between 0 and 100.";
    ok = false;
  }

  if (!dept) {
    deptErr.textContent = "Please select a department.";
    ok = false;
  }

  // Check duplicate roll number using loop
  for (let i = 0; i < students.length; i++) {
    if (students[i].roll.toLowerCase() === roll.toLowerCase()) {
      rollErr.textContent = "Roll number already exists.";
      ok = false;
      break;
    }
  }

  return ok;
}

// Display student records dynamically using loops
function renderTable(list) {
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No records found.</td></tr>`;
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const s = list[i];

    const badgeClass = s.result === "PASS" ? "pass" : "fail";
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.roll}</td>
      <td>${s.dept}</td>
      <td>${s.marks}</td>
      <td>${s.grade}</td>
      <td><span class="badge ${badgeClass}">${s.result}</span></td>
      <td><button class="icon-btn" data-roll="${s.roll}">Delete</button></td>
    `;

    tbody.appendChild(row);
  }
}

function renderStats() {
  const total = students.length;

  let passCount = 0;
  let sum = 0;
  let top = -1;

  // Loop to compute stats
  for (let i = 0; i < students.length; i++) {
    sum += students[i].marks;
    if (students[i].result === "PASS") passCount++;
    if (students[i].marks > top) top = students[i].marks;
  }

  const failCount = total - passCount;
  const avg = total === 0 ? 0 : (sum / total).toFixed(2);

  statsEl.innerHTML = `
    <div class="stat">Total: <strong>${total}</strong></div>
    <div class="stat">Pass: <strong>${passCount}</strong></div>
    <div class="stat">Fail: <strong>${failCount}</strong></div>
    <div class="stat">Average: <strong>${avg}</strong></div>
    <div class="stat">Top Marks: <strong>${top < 0 ? "-" : top}</strong></div>
  `;
}

// Add record
form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validateInputs()) return;

  const name = nameEl.value.trim();
  const roll = rollEl.value.trim();
  const marks = Number(marksEl.value);
  const dept = deptEl.value;

  const { grade, result } = calculateGrade(marks);

  // Add student object into array
  students.push({ name, roll, dept, marks, grade, result });

  successMsg.textContent = "✅ Student record added!";

  form.reset();
  renderStats();
  renderTable(students);
});

// Delete record (event delegation)
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-roll]");
  if (!btn) return;

  const roll = btn.getAttribute("data-roll");

  // Remove student using loop + array rebuild
  let newList = [];
  for (let i = 0; i < students.length; i++) {
    if (students[i].roll !== roll) newList.push(students[i]);
  }
  students = newList;

  renderStats();
  applySearchFilter();
});

// Search filter
function applySearchFilter() {
  const q = searchEl.value.trim().toLowerCase();

  if (!q) {
    renderTable(students);
    return;
  }

  const filtered = [];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const combined = `${s.name} ${s.roll} ${s.dept}`.toLowerCase();
    if (combined.includes(q)) filtered.push(s);
  }
  renderTable(filtered);
}

searchEl.addEventListener("input", applySearchFilter);

// Clear all
clearBtn.addEventListener("click", () => {
  students = [];
  clearErrors();
  renderStats();
  renderTable(students);
});

// Initial render
renderStats();
renderTable(students);
