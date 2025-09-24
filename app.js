// ---------- 設定（あなたのLIFF ID） ----------
const LIFF_ID = "2008147271-LzY7e2KN"; // ここを変更しないでOK（あなたのID）
/* ------------------------------------------------- */

// LIFF初期化（LINE上で動かすときはログインを促します）
liff.init({ liffId: LIFF_ID })
  .then(() => {
    if (!liff.isLoggedIn()) liff.login();
  })
  .catch(err => console.error("LIFF init error:", err));

// ---------- DOM ----------
const monthPicker = document.getElementById("monthPicker");
const entryMonth = document.getElementById("entryMonth");
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
const KEY_RECORDS = "kakeibo_records_v2";
const KEY_CATEGORIES = "kakeibo_categories_v2";
const KEY_BUDGETS = "kakeibo_budgets_v2";

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

// 初期UI設定
function initUI() {
  // 月ピッカーは現在月に
  monthPicker.value = monthNow();
  entryMonth.value = monthNow();
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
  const date = entryMonth.value; // YYYY-MM
  const item = document.getElementById("item").value.trim();
  const amount = parseInt(document.getElementById("amount").value);
  const category = categorySelect.value;
  const memo = document.getElementById("memo").value.trim();

  if (!item) { alert("項目名を入力してください"); return; }
  if (isNaN(amount)) { alert("金額を入力してください"); return; }

  // レコード追加
  records.push({ type, date, item, amount, category, memo });
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  form.reset();
  entryMonth.value = date; // リセットしても月は維持
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
// 表示は「monthPicker」で選んだ月に基づく
function updateAllDisplays() {
  const showMonth = monthPicker.value || monthNow(); // YYYY-MM
  displayMonthLabel.textContent = showMonth;
  // 月別フィルタ
  const monthRecords = records.filter(r => r.date === showMonth);

  // テーブルの再描画
  tableBody.innerHTML = "";
  monthRecords.forEach((r, idx) => {
    // idxは月内インデックスだが削除は元配列インデックスが必要
    // find index in original records (first matching that hasn't been spliced)
    let globalIdx = -1;
    let matched = 0;
    for (let i=0;i<records.length;i++){
      if (records[i].date === showMonth) {
        if (matched === idx) { globalIdx = i; break; }
        matched++;
      }
    }

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

  // 削除ボタンにイベント付与
  document.querySelectorAll(".delete-btn").forEach(el => {
    el.onclick = () => {
      const idx = Number(el.getAttribute("data-idx"));
      deleteRecord(idx);
    };
  });

  // 合計計算（表示月）
  let income = 0, expense = 0;
  const categoryTotals = {}; // for chart
  categories.forEach(c => categoryTotals[c] = 0);

  monthRecords.forEach(r => {
    if (r.type === "収入") income += Number(r.amount);
    else {
      expense += Number(r.amount);
      if (!categoryTotals.hasOwnProperty(r.category)) categoryTotals[r.category] = 0;
      categoryTotals[r.category] += Number(r.amount);
    }
  });

  totalIncomeEl.textContent = income;
  totalExpenseEl.textContent = expense;

  // 予算表示と残額、アラート
  const budget = getBudgetForMonth(showMonth);
  budgetDisplay.textContent = budget;
  monthExpenseEl.textContent = expense;
  budgetRemainEl.textContent = budget - expense;

  // もし予算 > 0 かつ 支出が予算超過したら視覚・アラート
  if (budget > 0 && expense > budget) {
    // 画面上で目立たせる（赤くする）
    budgetRemainEl.style.color = "var(--danger)";
    // そして一度だけアラートを出す（localStorageフラグで制御）
    const alertKey = `budget_alerted_${showMonth}`;
    if (!localStorage.getItem(alertKey)) {
      localStorage.setItem(alertKey, "1");
      alert(`注意: ${showMonth} の支出が予算 ${budget} 円を超えています！`);
    }
  } else {
    budgetRemainEl.style.color = ""; // 元に戻す
  }

  // グラフ更新（支出のみ）
  renderExpenseChart(categoryTotals);
  // 保存（recordsは既に保存しているがカテゴリの変更を保存しておく）
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
}

// ---------- グラフ描画 ----------
function renderExpenseChart(categoryTotals) {
  const labels = Object.keys(categoryTotals);
  const data = labels.map(l => categoryTotals[l] || 0);

  // colors: 自動でHSLで割当（見やすく）
  const colors = labels.map((_, i) => `hsl(${(i*47)%360} 70% 55%)`.replace(/\s/g, ","));
  // Chart.js expects rgb/css colors; convert to standard hsl(...) form
  const cssColors = labels.map((_,i) => `hsl(${(i*47)%360} 70% 55%)`.replace(/,/g," "));

  if (chart) chart.destroy();
  chart = new Chart(expenseChartCanvas.getContext("2d"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: cssColors
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// ---------- イベント: 月変更で再描画 ----------
monthPicker.addEventListener("change", () => {
  // 月が切り替わったら "アラート既出" フラグは別月なので自然に再チェックされる
  updateAllDisplays();
});

// 初期描画
updateAllDisplays();
