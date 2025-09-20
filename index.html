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

// データ取得
let records = JSON.parse(localStorage.getItem("kakeibo")) || [];
let chart;

// 表示更新関数
function updateDisplay() {
  tableBody.innerHTML = "";
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = { "食費":0, "交通費":0, "趣味":0, "その他":0 };

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
      categoryTotals[rec.category] += rec.amount;
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

  // 円グラフ描画
  if (chart) chart.destroy();
  chart = new Chart(expenseChart, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#A9A9A9']
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
