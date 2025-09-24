// ---------- 設定（あなたのLIFF ID） ----------
const LIFF_ID = "2008147271-LzY7e2KN";
/* ------------------------------------------------- */

// LIFF初期化
liff.init({ liffId: LIFF_ID })
  .then(() => {
    if (!liff.isLoggedIn()) liff.login();
  })
  .catch(err => console.error("LIFF init error:", err));

// ---------- DOM ----------
const monthPicker = document.getElementById("monthPicker");
const entryDate = document.getElementById("entryDate"); // ✅ 日付入力
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
  entryDate.value = todayStr(); // ✅ 今日の日付をデフォルトに
  renderCategoryOptions();
  updateAllDisplays();
}
initUI();

// ---------- カテゴリ操作 ----------
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
  alert(`カテゴリ「${newCat}」を追加しました`);
  updateAllDisplays();
});

// ---------- 予算操作 ----------
function getBudgetForMonth(monthStr) {
  return budgets[monthStr] ? Number(budgets[monthStr]) : 0;
}
saveBudgetBtn.addEventListener("click", () => {
  const m = monthPicker.value || monthNow();
  const val = parseInt(budgetInput.value);
  if (isNaN(val) || val < 0) { alert("有効な予算を入力してください"); return; }
  budgets[m] = val;
  localStorage.setItem(KEY_BUDGETS, JSON.stringify(budgets));
  updateAllDisplays();
  alert(`${m} の予算を ${val} 円に設定しました`);
});

// ---------- データ追加 ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = form.type.value;
  const date = entryDate.value; // ✅ YYYY-MM-DD
  const item = document.getElementById("item").value.trim();
  const amount = parseInt(document.getElementById("amount").value);
  const category = categorySelect.value;
  const memo = document.getElementById("memo").value.trim();

  if (!item) { alert("項目名を入力してください"); return; }
  if (isNaN(amount)) { alert("金額を入力してください"); return; }

  records.push({ type, date, item, amount, category, memo });
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  form.reset();
  entryDate.value = todayStr(); // ✅ リセット後も日付は今日に戻す
  updateAllDisplays();
});

// ---------- 削除 ----------
function deleteRecord(indexAll) {
  if (!confirm("この項目を削除しますか？")) return;
  records.splice(indexAll, 1);
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  updateAllDisplays();
}

// ---------- 表示更新 ----------
function updateAllDisplays() {
  const showMonth = monthPicker.value || monthNow(); // YYYY-MM
  displayMonthLabel.textContent = showMonth;
  const monthRecords = records.filter(r => r.date.startsWith(showMonth)); // ✅ 月でフィルタ

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

  // 合計
  let income = 0, expense = 0;
  const categoryTotals = {};
  categories.forEach(c => categoryTotals[c] = 0);

  monthRecords.forEach(r => {
    if (r.type === "収入") income += r.amount;
    else {
      expense += r.amount;
      if (!categoryTotals[r.category]) categoryTotals[r.category] = 0;
      categoryTotals[r.category] += r.amount;
    }
  });

  totalIncomeEl.textContent = income;
  totalExpenseEl.textContent = expense;

  // 予算
  const budget = getBudgetForMonth(showMonth);
  budgetDisplay.textContent = budget;
  monthExpenseEl.textContent = expense;
  budgetRemainEl.textContent = budget - expense;
  budgetInput.value = budget;

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

// 初期描画
updateAllDisplays();
