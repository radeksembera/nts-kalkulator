"use strict";

const ROWS = ["odber", "rocniKap", "mesicniKap", "rezPrikon", "maxVykon"];
const N = 12;

const fmtKc = n => Math.round(n).toLocaleString("cs-CZ") + " Kč";
const fmtNum = n => n.toLocaleString("cs-CZ", { maximumFractionDigits: 3 });

let chart = null;

// ---------------------------------------------------------------------------
// Výpočetní logika (reimplementace vzorců z listu "Výpočet")
// ---------------------------------------------------------------------------

/** Měsíční platba podle dosavadní struktury (vzorec D28). */
function oldMonthlyPayment(odber, rocniKap, mesicniKap, maxVykon, prices) {
  let payment = rocniKap * prices.rocniKap
              + mesicniKap * prices.mesicniKap
              + odber * prices.sit;

  const sjednano = rocniKap + mesicniKap;
  if (sjednano < maxVykon) {
    const prekroceni = Math.min(maxVykon - sjednano, 0.1 * rocniKap + 0.1 * mesicniKap);
    payment += prices.mesicniKap * prekroceni;
  }
  return payment;
}

/** Volba výhodnějšího tarifu T1/T2 pro daný měsíc nové struktury (vzorec D39). */
function chooseTariff(rezPrikon, maxVykon, prices) {
  const costT1 = prices.rpT1 * rezPrikon + prices.nmT1 * maxVykon;
  const costT2 = prices.rpT2 * rezPrikon + prices.nmT2 * maxVykon;
  return costT1 < costT2 ? "T1" : "T2";
}

/** Měsíční platba podle nové struktury (vzorec D46) pro zadaný rezervovaný příkon. */
function newMonthlyPayment(odber, rezPrikon, maxVykon, prices) {
  const tariff = chooseTariff(rezPrikon, maxVykon, prices);
  const cenaRP = tariff === "T1" ? prices.rpT1 : prices.rpT2;
  const cenaNM = tariff === "T1" ? prices.nmT1 : prices.nmT2;

  const payment = Math.max(maxVykon, 0.6 * rezPrikon) * cenaRP
                + maxVykon * cenaNM
                + odber * prices.sit;

  return { payment, tariff };
}

/** Spočítá roční platbu podle nové struktury pro zadanou (případně hypotetickou) řadu rez. příkonu. */
function annualNewPayment(odber, rezPrikonArr, maxVykonArr, prices) {
  let total = 0;
  for (let m = 0; m < N; m++) {
    total += newMonthlyPayment(odber[m], rezPrikonArr[m], maxVykonArr[m], prices).payment;
  }
  return total;
}

/**
 * Hlavní výpočetní funkce – vezme vstupy a vrátí kompletní výsledky
 * (obdoba celého listu "Výpočet").
 */
function calculate(input) {
  const { distributor, voltage, odber, rocniKap, mesicniKap, rezPrikon, maxVykon } = input;
  const prices = PRICE_TABLE[distributor][voltage];

  const months = [];
  let oldTotal = 0;
  let newTotal = 0;

  for (let m = 0; m < N; m++) {
    const oldPay = oldMonthlyPayment(odber[m], rocniKap[m], mesicniKap[m], maxVykon[m], prices.old);
    const { payment: newPay, tariff } = newMonthlyPayment(odber[m], rezPrikon[m], maxVykon[m], prices.new);

    oldTotal += oldPay;
    newTotal += newPay;

    months.push({ oldPay, newPay, tariff, diff: newPay - oldPay });
  }

  const annualConsumption = odber.reduce((a, b) => a + b, 0);

  // --- Doporučení k optimalizaci rezervovaného příkonu (D51-D54) ---
  const maxMeasured = Math.max(...maxVykon);
  const decemberRP = rezPrikon[N - 1];
  const ratio = maxMeasured > 0 ? decemberRP / maxMeasured : null;

  let optimization = null;
  const constantRP = rezPrikon.every(v => v === rezPrikon[0]);
  if (ratio !== null && ratio > 2.5 && constantRP && maxMeasured > 0) {
    const rp2x = maxVykon.map(() => 2 * maxMeasured);
    const rp15x = maxVykon.map(() => 1.5 * maxMeasured);
    const payment2x = annualNewPayment(odber, rp2x, maxVykon, prices.new);
    const payment15x = annualNewPayment(odber, rp15x, maxVykon, prices.new);
    optimization = {
      ratio,
      saving2x: newTotal - payment2x,
      saving15x: newTotal - payment15x,
      rp2x: 2 * maxMeasured,
      rp15x: 1.5 * maxMeasured
    };
  }

  // --- Alternativní jednosložková cena (D60, D63, E63) ---
  const singleRatePayment = prices.new.jednoslozkova * annualConsumption;
  const singleRateThreshold = prices.new.jednoslozkova > 0
    ? Math.round(newTotal / prices.new.jednoslozkova)
    : null;

  // --- Validační hlášení (obdoba listu "Pomocné") ---
  const warnings = [];
  for (let m = 0; m < N; m++) {
    const sjednano = rocniKap[m] + mesicniKap[m];
    if (maxVykon[m] > 1.1 * sjednano) {
      warnings.push(`${MONTH_NAMES[m]}: max. odebraný výkon překračuje sjednanou rezervovanou kapacitu o více než 10 % – ve staré struktuře bude pravděpodobně účtována platba za překročení.`);
    }
    if (sjednano > rezPrikon[m]) {
      warnings.push(`${MONTH_NAMES[m]}: součet sjednané roční a měsíční rezervované kapacity je vyšší než zadaný rezervovaný příkon – zkontrolujte zadané hodnoty.`);
    }
    if (maxVykon[m] > rezPrikon[m]) {
      warnings.push(`${MONTH_NAMES[m]}: max. naměřený odebraný výkon překračuje rezervovaný příkon – v nové struktuře hrozí dodatečná platba za překročení rezervovaného příkonu (není v této kalkulaci zahrnuta).`);
    }
  }
  if (singleRatePayment < newTotal) {
    warnings.push("Při zadané spotřebě by alternativní jednosložková cena vyšla levněji než nová tarifní struktura – zvažte tuto variantu (viz sekce 6).");
  }

  return {
    months,
    oldTotal,
    newTotal,
    diffTotal: newTotal - oldTotal,
    annualConsumption,
    ratio,
    optimization,
    singleRatePayment,
    singleRateThreshold,
    warnings
  };
}

// ---------------------------------------------------------------------------
// UI – sestavení formuláře, čtení vstupů, vykreslení výsledků
// ---------------------------------------------------------------------------

function buildSelectors() {
  const distributorSel = document.getElementById("distributor");
  const voltageSel = document.getElementById("voltage");

  Object.keys(PRICE_TABLE).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    distributorSel.appendChild(opt);
  });

  function refreshVoltages() {
    const dist = distributorSel.value;
    const voltages = Object.keys(PRICE_TABLE[dist]);
    voltageSel.innerHTML = "";
    voltages.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      voltageSel.appendChild(opt);
    });
  }

  distributorSel.addEventListener("change", () => { refreshVoltages(); recalculate(); });
  voltageSel.addEventListener("change", recalculate);

  refreshVoltages();
}

function buildInputTable() {
  const tbody = document.querySelector("#input-table tbody");
  ROWS.forEach(rowKey => {
    const tr = tbody.querySelector(`tr[data-row="${rowKey}"]`);
    for (let m = 0; m < N; m++) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "any";
      input.value = "0";
      input.dataset.row = rowKey;
      input.dataset.month = m;
      input.addEventListener("input", recalculate);
      td.appendChild(input);
      tr.appendChild(td);
    }
    const fillTd = document.createElement("td");
    const fillBtn = document.createElement("button");
    fillBtn.textContent = "↔";
    fillBtn.title = "Vyplnit hodnotou z ledna do všech měsíců";
    fillBtn.type = "button";
    fillBtn.className = "fill-btn";
    fillBtn.addEventListener("click", () => {
      const inputs = tr.querySelectorAll("input");
      const value = inputs[0].value;
      inputs.forEach(inp => { inp.value = value; });
      recalculate();
    });
    fillTd.appendChild(fillBtn);
    tr.appendChild(fillTd);
  });
}

function readInputs() {
  const get = rowKey => {
    const arr = [];
    document.querySelectorAll(`#input-table input[data-row="${rowKey}"]`).forEach(input => {
      arr[+input.dataset.month] = parseFloat(input.value) || 0;
    });
    return arr;
  };

  return {
    distributor: document.getElementById("distributor").value,
    voltage: document.getElementById("voltage").value,
    odber: get("odber"),
    rocniKap: get("rocniKap"),
    mesicniKap: get("mesicniKap"),
    rezPrikon: get("rezPrikon"),
    maxVykon: get("maxVykon")
  };
}

function renderResultTable(result) {
  const setRow = (rowKey, values, formatter) => {
    const tr = document.querySelector(`#result-table tr[data-row="${rowKey}"]`);
    // odstranit staré buňky kromě popisku
    while (tr.children.length > 1) tr.removeChild(tr.lastChild);
    values.forEach(v => {
      const td = document.createElement("td");
      td.textContent = formatter(v);
      tr.appendChild(td);
    });
  };

  setRow("oldPay", [...result.months.map(m => m.oldPay), result.oldTotal], fmtKc);
  setRow("newPay", [...result.months.map(m => m.newPay), result.newTotal], fmtKc);
  setRow("tariff", [...result.months.map(m => m.tariff), "–"], v => v);
  setRow("diffPay", [...result.months.map(m => m.diff), result.diffTotal],
    v => (v >= 0 ? "+" : "") + fmtKc(v));
}

function renderChart(result) {
  const ctx = document.getElementById("diff-chart");
  const data = result.months.map(m => Math.round(m.diff));
  const colors = data.map(v => v > 0 ? "rgba(214, 69, 65, 0.75)" : "rgba(46, 139, 87, 0.75)");

  if (chart) {
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
    return;
  }

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"],
      datasets: [{
        label: "Rozdíl nová − stará platba [Kč]",
        data,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => v.toLocaleString("cs-CZ") + " Kč" } }
      }
    }
  });
}

function renderSummary(result) {
  document.getElementById("result-old").textContent = fmtKc(result.oldTotal);
  document.getElementById("result-new").textContent = fmtKc(result.newTotal);

  const diffEl = document.getElementById("result-diff");
  const diff = result.diffTotal;
  diffEl.textContent = (diff >= 0 ? "+" : "−") + fmtKc(Math.abs(diff));
  diffEl.classList.toggle("negative", diff > 0);
  diffEl.classList.toggle("positive", diff < 0);

  document.getElementById("result-single").textContent = fmtKc(result.singleRatePayment);
  document.getElementById("result-single-threshold").textContent =
    result.singleRateThreshold !== null
      ? `${fmtNum(result.singleRateThreshold)} MWh / rok`
      : "–";
}

function renderOptimization(result) {
  const box = document.getElementById("optimization-box");
  box.innerHTML = "";

  if (result.ratio !== null) {
    const p = document.createElement("p");
    p.textContent = `Poměr prosincového rezervovaného příkonu k maximálnímu naměřenému výkonu v roce: ${fmtNum(result.ratio)}.`;
    box.appendChild(p);
  }

  if (result.optimization) {
    const o = result.optimization;
    const p1 = document.createElement("p");
    p1.className = "recommendation";
    p1.textContent = "Zadaný poměr přesahuje doporučenou hranici 2,5 – zvažte snížení sjednaného rezervovaného příkonu " +
      "(viz Manuál pro zákazníka na webu ERÚ). Orientační odhad úspory:";
    box.appendChild(p1);

    const ul = document.createElement("ul");
    [
      [`snížení na ${fmtNum(o.rp2x)} MW (2× max. výkon)`, o.saving2x],
      [`snížení na ${fmtNum(o.rp15x)} MW (1,5× max. výkon)`, o.saving15x]
    ].forEach(([label, saving]) => {
      const li = document.createElement("li");
      li.textContent = `${label}: úspora cca ${fmtKc(saving)} ročně`;
      ul.appendChild(li);
    });
    box.appendChild(ul);
  } else if (result.ratio !== null) {
    const p = document.createElement("p");
    p.textContent = "Poměr je v doporučeném rozmezí, snížení rezervovaného příkonu se v tuto chvíli nedoporučuje.";
    box.appendChild(p);
  } else {
    box.innerHTML = "<p>—</p>";
  }
}

function renderWarnings(result) {
  const container = document.getElementById("warnings");
  container.innerHTML = "";
  if (result.warnings.length === 0) return;

  const title = document.createElement("p");
  title.className = "warning-title";
  title.textContent = "Upozornění:";
  container.appendChild(title);

  const ul = document.createElement("ul");
  ul.className = "warning-list";
  result.warnings.forEach(w => {
    const li = document.createElement("li");
    li.textContent = w;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function recalculate() {
  const input = readInputs();
  if (!input.distributor || !input.voltage) return;

  const result = calculate(input);

  renderSummary(result);
  renderResultTable(result);
  renderChart(result);
  renderOptimization(result);
  renderWarnings(result);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  buildSelectors();
  buildInputTable();
  recalculate();
});
