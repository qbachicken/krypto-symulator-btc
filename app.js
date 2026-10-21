// --- State Management ---
const COMMISSION_RATE = 0.002; // 0.2% prowizji giełdowej

const DEFAULT_STATE = {
  pln: 100.00,
  btc: 0.00000000,
  totalInvestedPln: 0.00,
  totalBtcBought: 0.00000000,
  transactions: []
};

let state = JSON.parse(localStorage.getItem('kryptosymulator_state')) || DEFAULT_STATE;

let currentBtcPrice = 0;
let priceChange24h = 0;
let currentTimeframe = '1'; // 1 day default
let btcChart = null;
let deferredPrompt = null;

// --- DOM Elements ---
const totalPortfolioEl = document.getElementById('total-portfolio-pln');
const portfolioPnlEl = document.getElementById('portfolio-pnl');
const walletPlnEl = document.getElementById('wallet-pln');
const walletBtcEl = document.getElementById('wallet-btc');
const walletBtcPlnEl = document.getElementById('wallet-btc-pln');
const avgBuyPriceEl = document.getElementById('avg-buy-price');
const currentBtcPriceEl = document.getElementById('current-btc-price');
const priceChange24hEl = document.getElementById('price-change-24h');
const buyAmountPlnEl = document.getElementById('buy-amount-pln');
const buyEstimateBtcEl = document.getElementById('buy-estimate-btc');
const sellAmountBtcEl = document.getElementById('sell-amount-btc');
const sellEstimatePlnEl = document.getElementById('sell-estimate-pln');
const transactionsTbody = document.getElementById('transactions-tbody');
const txCountEl = document.getElementById('tx-count');
const resetBtn = document.getElementById('reset-btn');
const installBtn = document.getElementById('install-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  initChart();
  fetchBtcData();

  // Refresh price every 60 seconds
  setInterval(fetchBtcData, 60000);

  // Input listeners for live estimates
  if (buyAmountPlnEl) {
    buyAmountPlnEl.addEventListener('input', updateBuyEstimate);
  }
  if (sellAmountBtcEl) {
    sellAmountBtcEl.addEventListener('input', updateSellEstimate);
  }

  // Reset button handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz zresetować portfel do kwoty startowej 100 zł? Wszystkie transakcje zostaną usunięte.')) {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState();
        updateUI();
        showToast('Portfel zresetowany do 100 zł', 'info');
      }
    });
  }

  // PWA Install prompt handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  }
});

// --- Save State ---
function saveState() {
  localStorage.setItem('kryptosymulator_state', JSON.stringify(state));
}

// --- Fetch BTC Price & Chart Data ---
async function fetchBtcData() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=pln&include_24hr_change=true');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    currentBtcPrice = data.bitcoin.pln;
    priceChange24h = data.bitcoin.pln_24h_change || 0;

    updatePriceDisplay();
    updateUI();
  } catch (err) {
    console.warn('CoinGecko API error, falling back or using simulated jitter:', err);
    if (currentBtcPrice === 0) {
      currentBtcPrice = 350000;
      priceChange24h = 1.25;
    }
    updatePriceDisplay();
    updateUI();
  }
}

function updatePriceDisplay() {
  if (currentBtcPriceEl) {
    currentBtcPriceEl.textContent = formatPLN(currentBtcPrice);
  }
  if (priceChange24hEl) {
    const isPositive = priceChange24h >= 0;
    priceChange24hEl.textContent = `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`;
    priceChange24hEl.className = `text-xs font-semibold px-2 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`;
  }
  updateBuyEstimate();
  updateSellEstimate();
}

// --- Chart Initialization & Timeframes ---
async function initChart() {
  const ctx = document.getElementById('btcChart').getContext('2d');

  btcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Cena BTC (PLN)',
        data: [],
        borderColor: '#f59e0b',
        borderWidth: 2,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.0)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.25)');
          return gradient;
        },
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f59e0b',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#111827',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return ` Cena: ${formatPLN(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(30, 41, 59, 0.5)', drawBorder: false },
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: function(value) {
              return value >= 1000 ? (value / 1000).toFixed(0) + 'k zł' : value + ' zł';
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });

  loadChartData('1');
}

async function loadChartData(days) {
  try {
    let url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=pln&days=${days}`;
    if (days === 'max') {
      url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=pln&days=max`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chart data');
    const data = await res.json();
    const prices = data.prices;

    const labels = prices.map(item => {
      const date = new Date(item[0]);
      if (days === '1') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (days === '7' || days === '30') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString([], { year: 'numeric', month: 'short' });
      }
    });

    const priceValues = prices.map(item => item[1]);

    btcChart.data.labels = labels;
    btcChart.data.datasets[0].data = priceValues;
    btcChart.update();

    if (prices.length > 0 && currentBtcPrice === 0) {
      currentBtcPrice = prices[prices.length - 1][1];
      updatePriceDisplay();
    }
  } catch (err) {
    console.warn('Error loading chart from CoinGecko, generating fallback chart:', err);
    generateFallbackChart(days);
  }
}

function generateFallbackChart(days) {
  const points = days === '1' ? 24 : days === '7' ? 28 : 30;
  const labels = [];
  const priceValues = [];
  let basePrice = currentBtcPrice || 350000;

  for (let i = points; i >= 0; i--) {
    const d = new Date();
    d.setHours(d.getHours() - i * (days === '1' ? 1 : 6));
    labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const fluctuation = (Math.random() - 0.48) * (basePrice * 0.01);
    basePrice += fluctuation;
    priceValues.push(basePrice);
  }

  if (btcChart) {
    btcChart.data.labels = labels;
    btcChart.data.datasets[0].data = priceValues;
    btcChart.update();
  }
}

function changeTimeframe(days) {
  currentTimeframe = days;
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  loadChartData(days);
}

// --- Trading Logic with 0.2% Commission ---

function setBuyPercentage(pct) {
  const amount = state.pln * pct;
  if (buyAmountPlnEl) {
    buyAmountPlnEl.value = amount.toFixed(2);
    updateBuyEstimate();
  }
}

function setSellPercentage(pct) {
  const amount = state.btc * pct;
  if (sellAmountBtcEl) {
    sellAmountBtcEl.value = amount.toFixed(8);
    updateSellEstimate();
  }
}

function updateBuyEstimate() {
  if (!buyAmountPlnEl || !buyEstimateBtcEl) return;
  const plnVal = parseFloat(buyAmountPlnEl.value) || 0;
  if (currentBtcPrice > 0 && plnVal > 0) {
    const feePln = plnVal * COMMISSION_RATE;
    const netPln = plnVal - feePln;
    const btcVal = netPln / currentBtcPrice;
    buyEstimateBtcEl.textContent = `${btcVal.toFixed(8)} BTC (prowizja: ${formatPLN(feePln)})`;
  } else {
    buyEstimateBtcEl.textContent = '0.00000000 BTC';
  }
}

function updateSellEstimate() {
  if (!sellAmountBtcEl || !sellEstimatePlnEl) return;
  const btcVal = parseFloat(sellAmountBtcEl.value) || 0;
  if (currentBtcPrice > 0 && btcVal > 0) {
    const grossPln = btcVal * currentBtcPrice;
    const feePln = grossPln * COMMISSION_RATE;
    const netPln = grossPln - feePln;
    sellEstimatePlnEl.textContent = `${formatPLN(netPln)} (prowizja: ${formatPLN(feePln)})`;
  } else {
    sellEstimatePlnEl.textContent = '0,00 PLN';
  }
}

function executeBuy() {
  const plnVal = parseFloat(buyAmountPlnEl.value);
  if (!plnVal || plnVal <= 0) {
    showToast('Wprowadź poprawną kwotę PLN do zakupu', 'error');
    return;
  }
  if (plnVal > state.pln) {
    showToast('Brak wystarczających środków PLN w portfelu!', 'error');
    return;
  }
  if (currentBtcPrice <= 0) {
    showToast('Brak aktualnego kursu BTC. Spróbuj ponownie za chwilę.', 'error');
    return;
  }

  const feePln = plnVal * COMMISSION_RATE;
  const netPln = plnVal - feePln;
  const btcBougt = netPln / currentBtcPrice;

  state.pln -= plnVal;
  state.btc += btcBougt;
  state.totalInvestedPln += plnVal;
  state.totalBtcBought += btcBougt;

  state.transactions.unshift({
    type: 'KUPNO',
    date: new Date().toLocaleString('pl-PL'),
    price: currentBtcPrice,
    btc: btcBougt,
    pln: plnVal,
    fee: feePln
  });

  saveState();
  updateUI();
  buyAmountPlnEl.value = '';
  updateBuyEstimate();

  showToast(`Zakupiono ${btcBougt.toFixed(6)} BTC za ${formatPLN(plnVal)} (prowizja: ${formatPLN(feePln)})`, 'success');
}

function executeSell() {
  const btcVal = parseFloat(sellAmountBtcEl.value);
  if (!btcVal || btcVal <= 0) {
    showToast('Wprowadź poprawną ilość BTC do sprzedaży', 'error');
    return;
  }
  if (btcVal > state.btc) {
    showToast('Nie masz tylu BTC w portfelu!', 'error');
    return;
  }
  if (currentBtcPrice <= 0) {
    showToast('Brak aktualnego kursu BTC. Spróbuj ponownie za chwilę.', 'error');
    return;
  }

  const grossPln = btcVal * currentBtcPrice;
  const feePln = grossPln * COMMISSION_RATE;
  const netPln = grossPln - feePln;

  if (state.totalBtcBought > 0) {
    const ratio = btcVal / state.btc;
    state.totalInvestedPln -= state.totalInvestedPln * ratio;
    state.totalBtcBought -= btcVal;
  }

  state.btc -= btcVal;
  state.pln += netPln;

  state.transactions.unshift({
    type: 'SPRZEDAŻ',
    date: new Date().toLocaleString('pl-PL'),
    price: currentBtcPrice,
    btc: btcVal,
    pln: netPln,
    fee: feePln
  });

  saveState();
  updateUI();
  sellAmountBtcEl.value = '';
  updateSellEstimate();

  showToast(`Sprzedano ${btcVal.toFixed(6)} BTC za ${formatPLN(netPln)} (prowizja: ${formatPLN(feePln)})`, 'success');
}

function addCash(amount) {
  state.pln += amount;
  saveState();
  updateUI();
  showToast(`Dodano ${formatPLN(amount)} do portfela!`, 'success');
}

// --- UI Updates & Calculations ---

function updateUI() {
  const btcValueInPln = state.btc * currentBtcPrice;
  const totalPortfolioValue = state.pln + btcValueInPln;
  const netProfit = totalPortfolioValue - 100;
  const netProfitPercent = (netProfit / 100) * 100;

  if (totalPortfolioEl) totalPortfolioEl.textContent = formatPLN(totalPortfolioValue);
  if (walletPlnEl) walletPlnEl.textContent = formatPLN(state.pln);
  if (walletBtcEl) walletBtcEl.textContent = state.btc.toFixed(8) + ' BTC';
  if (walletBtcPlnEl) walletBtcPlnEl.textContent = `≈ ${formatPLN(btcValueInPln)}`;

  let avgPrice = 0;
  if (state.totalBtcBought > 0) {
    avgPrice = state.totalInvestedPln / state.totalBtcBought;
    avgBuyPriceEl.textContent = formatPLN(avgPrice);
  } else {
    avgBuyPriceEl.textContent = '-';
  }

  if (portfolioPnlEl) {
    const isProfit = netProfit >= 0;
    portfolioPnlEl.textContent = `${isProfit ? '+' : ''}${formatPLN(netProfit)} (${isProfit ? '+' : ''}${netProfitPercent.toFixed(2)}%)`;
    portfolioPnlEl.className = `font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`;
  }

  if (transactionsTbody && txCountEl) {
    txCountEl.textContent = `${state.transactions.length} transakcji`;
    if (state.transactions.length === 0) {
      transactionsTbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500 italic">Brak transakcji. Czas na pierwsze zakupy!</td></tr>`;
    } else {
      transactionsTbody.innerHTML = state.transactions.map(tx => `
        <tr class="hover:bg-slate-800/40 transition-colors">
          <td class="py-3 px-4 font-semibold ${tx.type === 'KUPNO' ? 'text-emerald-400' : 'text-rose-400'}">
            ${tx.type}
            <span class="block text-[10px] text-slate-500 font-normal">Prowizja: ${formatPLN(tx.fee)}</span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-400">${tx.date}</td>
          <td class="py-3 px-4 font-mono">${formatPLN(tx.price)}</td>
          <td class="py-3 px-4 font-mono">${tx.btc.toFixed(6)} BTC</td>
          <td class="py-3 px-4 text-right font-mono font-medium">${formatPLN(tx.pln)}</td>
        </tr>
      `).join('');
    }
  }
}

// --- Helpers ---
function formatPLN(amount) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600/90 border-emerald-500 text-white',
    error: 'bg-rose-600/90 border-rose-500 text-white',
    info: 'bg-slate-800/90 border-slate-700 text-white'
  };

  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-sm font-medium flex items-center gap-3 transition-all transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
