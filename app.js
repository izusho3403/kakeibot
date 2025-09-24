// ---------- 設定（あなたのLIFF ID） ----------
const LIFF_ID = "2008147271-LzY7e2KN";
/* ------------------------------------------------- */

// LIFF初期化（LINE上で動かすときはログインを促します）
if (window.liff && typeof liff.init === "function") {
  liff.init({ liffId: LIFF_ID })
    .then(() => {
      if (!liff.isLoggedIn()) liff.login();
    })
    .catch(err => console.error("LIFF init error:", err));
}

// ---------- DOM ----------
const monthPicker = document.getElementById("monthPicker");
const entryDate = document.getElementById("entryDate");
const budgetInput = document.getElementById("budgetInput");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const budgetDisplay = document.getElementById("budgetDisplay");
const monthExpenseEl = document.getElementById("monthExpense");
const budgetRemainEl = document.getElementById("budgetRemain");
const displayMonthLabel = document.getElementById("displayMonthLabel");

const form = document.getElementById("kakeiboForm");
const categorySelect = document.getElementById("category");
const newCategoryInput = document.getElementById("newCategory");
const addCategoryBtn = document.getElementById("addCategoryBtn");

const tableBody = document.querySelector("#recordTable tbody");
const expenseChartCanvas = document.getElementById("expenseChart");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");

let chart = null;

// ---------- 保存キー ----------
const KEY_RECORDS = "kakeibo_records_v3";
const KEY_CATEGORIES = "kakeibo_categories_v3";
const KEY_BUDGETS = "kakeibo_budgets_v3";

// ---------- 初期データ ----------
let records = JSON.parse(localStorage.getItem(KEY_RECORDS)) || [];
let categories = JSON.parse(localStorage.getItem(KEY_CATEGORIES)) || ["食費","交通費","趣味","その他"];
let budgets = JSON.parse(localStorage.getItem(KEY_BUDGETS)) || {}; // { "2025-09": 30000, ... }

// ユーティリティ
function monthNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth()+1).toString().padStart(2,"0");
  return `${y}-${m}`;
}
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth()+1).toString().padStart(2,"0");
  const day = d.getDate().toString().padStart(2,"0");
  return `${y}-${m}-${day}`;
}

// 初期UI設定
function initUI() {
  monthPicker.value = monthNow();
  entryDate.value = todayStr();
  renderCategoryOptions();
  console.log("initUI: monthPicker=", monthPicker.value, "entryDate=", entryDate.value);
  updateAllDisplays();
}
initUI();

// ---------- カテゴリ ----------
function renderCategoryOptions() {
  categorySelect.innerHTML = "";
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}
addCategoryBtn.addEventListener("click", () => {
  const newCat = newCategoryInput.value.trim();
  if (!newCat) { alert("カテゴリ名を入力してください"); return; }
  if (categories.includes(newCat)) { alert("同名のカテゴリが既にあります"); return; }
  categories.push(newCat);
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
  renderCategoryOptions();
  newCategoryInput.value = "";
  console.log("Added category:", newCat);
  updateAllDisplays();
});

// ---------- 予算 ----------
function getBudgetForMonth(monthStr) {
  budgets = JSON.parse(localStorage.getItem(KEY_BUDGETS)) || {};
  return Object.prototype.hasOwnProperty.call(budgets, monthStr) ? Number(budgets[monthStr]) : 0;
}
saveBudgetBtn.addEventListener("click", () => {
  const m = monthPicker.value || monthNow();
  const raw = budgetInput.value;
  const val = raw === "" ? 0 : parseInt(raw, 10);
  if (isNaN(val) || val < 0) { alert("有効な予算を入力してください"); return; }
  budgets = JSON.parse(localStorage.getItem(KEY_BUDGETS)) || {};
  budgets[m] = val;
  localStorage.setItem(KEY_BUDGETS, JSON.stringify(budgets));
  budgetInput.value = val; // 確実に入力欄に反映
  console.log("Saved budget:", m, val, "all budgets:", budgets);
  updateAllDisplays();
  alert(`${m} の予算を ${val} 円に設定しました`);
});

// ---------- データ追加 ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = form.type.value;
  let dateRaw = entryDate.value; // expecting YYYY-MM-DD
  // fallback if empty or wrong format
  if (!dateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    console.warn("entryDate empty or invalid, using today:", dateRaw);
    dateRaw = todayStr();
  }
  const item = document.getElementById("item").value.trim();
  const amount = parseInt(document.getElementById("amount").value, 10);
  const category = categorySelect.value;
  const memo = document.getElementById("memo").value.trim();

  if (!item) { alert("項目名を入力してください"); return; }
  if (isNaN(amount)) { alert("金額を入力してください"); return; }

  const rec = { type, date: dateRaw, item, amount, category, memo };
  records.push(rec);
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  console.log("Added record:", rec, "total records:", records.length);
  form.reset();
  entryDate.value = todayStr(); // keep date sensible
  updateAllDisplays();
});

// ---------- 削除 ----------
function deleteRecord(indexAll) {
  if (!confirm("この項目を削除しますか？")) return;
  console.log("Deleting record index:", indexAll, "record:", records[indexAll]);
  records.splice(indexAll, 1);
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  updateAllDisplays();
}

// ---------- 表示更新 ----------
function updateAllDisplays() {
  budgets = JSON.parse(localStorage.getItem(KEY_BUDGETS)) || {};
  records = JSON.parse(localStorage.getItem(KEY_RECORDS)) || records; // reload in case changed elsewhere
  console.log("updateAllDisplays: recordsLen=", records.length, "budgets=", budgets);

  const showMonth = monthPicker.value || monthNow(); // YYYY-MM
  displayMonthLabel.textContent = showMonth;
  const monthRecords = records.filter(r => typeof r.date === "string" && r.date.startsWith(showMonth));
  console.log("showMonth:", showMonth, "monthRecords count:", monthRecords.length, monthRecords);

  // テーブル描画
  tableBody.innerHTML = "";
  monthRecords.forEach((r, idx) => {
    const globalIdx = records.indexOf(r);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.type}</td>
      <td>${r.item}</td>
      <td>${r.category}</td>
      <td>${r.amount}</td>
      <td>${r.memo || ""}</td>
      <td><span class="delete-btn" data-idx="${globalIdx}">×</span></td>
    `;
    tableBody.appendChild(tr);
  });

  document.querySelectorAll(".delete-btn").forEach(el => {
    el.onclick = () => {
      const idx = Number(el.getAttribute("data-idx"));
      deleteRecord(idx);
    };
  });

  // 合計計算
  let income = 0, expense = 0;
  const categoryTotals = {};
  categories.forEach(c => categoryTotals[c] = 0);

  monthRecords.forEach(r => {
    if (r.type === "収入") income += Number(r.amount);
    else {
      expense += Number(r.amount);
      if (!categoryTotals[r.category]) categoryTotals[r.category] = 0;
      categoryTotals[r.category] += Number(r.amount);
    }
  });

  totalIncomeEl.textContent = income;
  totalExpenseEl.textContent = expense;

  // 予算表示
  const budget = getBudgetForMonth(showMonth);
  budgetDisplay.textContent = budget;
  monthExpenseEl.textContent = expense;
  budgetRemainEl.textContent = (budget - expense);
  budgetInput.value = budget; // reflect in input

  if (budget > 0 && expense > budget) {
    budgetRemainEl.style.color = "red";
    const alertKey = `budget_alerted_${showMonth}`;
    if (!localStorage.getItem(alertKey)) {
      localStorage.setItem(alertKey, "1");
      alert(`注意: ${showMonth} の支出が予算 ${budget} 円を超えています！`);
    }
  } else {
    budgetRemainEl.style.color = "";
  }

  renderExpenseChart(categoryTotals);
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
}

// ---------- グラフ ----------
function renderExpenseChart(categoryTotals) {
  const labels = Object.keys(categoryTotals);
  const data = labels.map(l => categoryTotals[l] || 0);
  const colors = labels.map((_, i) => `hsl(${(i*47)%360},70%,55%)`);

  if (chart) chart.destroy();
  chart = new Chart(expenseChartCanvas.getContext("2d"), {
    type: "pie",
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

// ---------- イベント ----------
monthPicker.addEventListener("change", updateAllDisplays);

// 開発用ヘルパー（コンソールから呼べます）
window._dbg = {
  dumpRecords: () => console.log("records:", JSON.parse(localStorage.getItem(KEY_RECORDS))),
  dumpBudgets: () => console.log("budgets:", JSON.parse(localStorage.getItem(KEY_BUDGETS))),
  clearBudgets: () => { localStorage.removeItem(KEY_BUDGETS); console.log("budgets cleared"); updateAllDisplays(); }
};

// 初期描画
updateAllDisplays();
