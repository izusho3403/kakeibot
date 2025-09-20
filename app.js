// LIFF初期化
liff.init({ liffId: "2008147271-LzY7e2KN" })
  .then(() => {
    if (!liff.isLoggedIn()) liff.login();
  })
  .catch(err => console.error(err));

// DOM取得
const form = document.getElementById("kakeiboForm");
const tableBody = document.querySelector("#recordTable tbody");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const expenseChart = document.getElementById("expenseChart");
const categorySelect = document.getElementById("category");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const newCategoryInput = document.getElementById("newCategory");

// 初期カテゴリ
let categories = JSON.parse(localStorage.getItem("categories")) || ["食費","交通費","趣味","その他"];
let records = JSON.parse(localStorage.getItem("kakeibo")) || [];
let chart;

// カテゴリをセレクトに反映
function renderCategories() {
  categorySelect.innerHTML = "";
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}
renderCategories();

// カテゴリ追加
addCategoryBtn.onclick = () => {
  const newCat = newCategoryInput.value.trim();
  if (newCat && !categories.includes(newCat)) {
    categories.push(newCat);
    localStorage.setItem("categories", JSON.stringify(categories));
    renderCategories();
    newCategoryInput.value = "";
    alert(`カテゴリ「${newCat}」を追加しました`);
  } else {
    alert("カテゴリ名が空か既存のカテゴリです");
  }
};

// 表示更新
function updateDisplay() {
  tableBody.innerHTML = "";
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};
  categories.forEach(cat => categoryTotals[cat] = 0);

  records.forEach((rec, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rec.type}</td>
      <td>${rec.item}</td>
      <td>${rec.category}</td>
      <td>${rec.amount}</td>
      <td>${rec.memo || ""}</td>
      <td><span class="delete-btn" data-idx="${idx}">×</span></td>
    `;
    tableBody.appendChild(tr);

    if (rec.type === "収入") totalIncome += rec.amount;
    else {
      totalExpense += rec.amount;
      if(categoryTotals.hasOwnProperty(rec.category)) categoryTotals[rec.category] += rec.amount;
    }
  });

  totalIncomeEl.textContent = totalIncome;
  totalExpenseEl.textContent = totalExpense;
  localStorage.setItem("kakeibo", JSON.stringify(records));

  // 削除ボタン
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute("data-idx");
      records.splice(idx, 1);
      updateDisplay();
    };
  });

  // 円グラフ描画（色を自動割り当て）
  const colors = categories.map((_,i) => `hsl(${i*50 % 360},70%,60%)`);
  if (chart) chart.destroy();
  chart = new Chart(expenseChart, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        data: categories.map(cat => categoryTotals[cat]),
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// フォーム送信
form.addEventListener("submit", e => {
  e.preventDefault();
  const type = form.type.value;
  const item = document.getElementById("item").value;
  const amount = parseInt(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const memo = document.getElementById("memo").value;

  if (item && !isNaN(amount)) {
    records.push({ type, item, amount, category, memo });
    updateDisplay();
    form.reset();
  }
});

// 初期表示
updateDisplay();
