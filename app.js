// --- Constants ---
const COMMISSION_RATE = 0.001; // 0.1% prowizji giełdowej
const START_BALANCE = 100;     // startowe środki w PLN
const STATE_KEY = 'kryptosymulator_state';
const PRICE_KEY = 'kryptosymulator_last_price';
const PRICE_MAX_AGE_MS = 5 * 60 * 1000;   // starszy kurs blokuje handel
const CHART_CACHE_TTL_MS = 5 * 60 * 1000; // cache wykresów w pamięci
const FETCH_TIMEOUT_MS = 8000;

// --- Helpers: zaokrąglanie (unikamy błędów zmiennoprzecinkowych) ---
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round8 = (n) => Math.round((n + Number.EPSILON) * 1e8) / 1e8;

// --- State Management ---
function createDefaultState() {
  return {
    pln: START_BALANCE,
    btc: 0,
    totalInvestedPln: 0,
    totalBtcBought: 0,
    transactions: []
  };
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// Wczytuje stan z localStorage. Przy uszkodzonych lub niepoprawnych danych wraca do ustawień domyślnych.
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const valid =
      parsed &&
      isFiniteNumber(parsed.pln) && parsed.pln >= 0 &&
      isFiniteNumber(parsed.btc) && parsed.btc >= 0 &&
      isFiniteNumber(parsed.totalInvestedPln) &&
      isFiniteNumber(parsed.totalBtcBought) &&
      Array.isArray(parsed.transactions);
    if (!valid) throw new Error('Niepoprawna struktura stanu');
    return parsed;
  } catch (err) {
    console.warn('Nie udało się wczytać zapisanego stanu, używam domyślnego:', err);
    return createDefaultState();
  }
}

let state = loadState();

let currentBtcPrice = 0;
let priceChange24h = 0;
let priceTimestamp = 0; // kiedy ostatnio mamy kurs (ms)
let priceStatus = 'none'; // 'live' | 'stale' | 'none'
let currentTimeframe = '1'; // 1 day default
let btcChart = null;
let deferredPrompt = null;
let chartRequestId = 0;
const chartCache = {};

// Odtwórz ostatni znany kurs (oznaczony jako nieaktualny, dopóki nie przyjdzie świeży)
try {
  const saved = JSON.parse(localStorage.getItem(PRICE_KEY));
  if (saved && isFiniteNumber(saved.price) && saved.price > 0) {
    currentBtcPrice = saved.price;
    priceChange24h = isFiniteNumber(saved.change) ? saved.change : 0;
    priceTimestamp = isFiniteNumber(saved.ts) ? saved.ts : 0;
    priceStatus = 'stale';
  }
} catch (e) { /* brak zapisanego kursu */ }

// --- DOM Elements ---
const totalPortfolioEl = document.getElementById('total-portfolio-pln');
const portfolioPnlEl = document.getElementById('portfolio-pnl');
const walletPlnEl = document.getElementById('wallet-pln');
const walletBtcEl = document.getElementById('wallet-btc');
const walletBtcPlnEl = document.getElementById('wallet-btc-pln');
const avgBuyPriceEl = document.getElementById('avg-buy-price');
const currentBtcPriceEl = document.getElementById('current-btc-price');
const chartCurrentPriceEl = document.getElementById('chart-current-price');
const priceChange24hEl = document.getElementById('price-change-24h');
const priceStatusEl = document.getElementById('price-status');
const priceDotEl = document.getElementById('price-dot');
const chartErrorEl = document.getElementById('chart-error');
const buyAmountPlnEl = document.getElementById('buy-amount-pln');
const buyEstimateBtcEl = document.getElementById('buy-estimate-btc');
const buyEstimateFeeEl = document.getElementById('buy-estimate-fee');
const sellAmountBtcEl = document.getElementById('sell-amount-btc');
const sellEstimatePlnEl = document.getElementById('sell-estimate-pln');
const sellEstimateFeeEl = document.getElementById('sell-estimate-fee');
const transactionsTbody = document.getElementById('transactions-tbody');
const txCountEl = document.getElementById('tx-count');
const resetBtn = document.getElementById('reset-btn');
const installBtn = document.getElementById('install-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  updatePriceDisplay();
  initChart();
  fetchBtcData();

  // Refresh price every 60 seconds
  setInterval(fetchBtcData, 60000);

  // Odśwież kurs po powrocie do karty, jeśli jest już nieświeży
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - priceTimestamp > 60000) {
      fetchBtcData();
    }
  });

  // Przyciski zakresu wykresu
  document.querySelectorAll('.timeframe-btn').forEach((btn) => {
    btn.addEventListener('click', () => changeTimeframe(btn.dataset.days, btn));
  });

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
      if (confirm(`Czy na pewno chcesz zresetować portfel do kwoty startowej ${START_BALANCE} zł? Wszystkie transakcje zostaną usunięte.`)) {
        state = createDefaultState();
        saveState();
        updateUI();
        updateBuyEstimate();
        updateSellEstimate();
        showToast(`Portfel zresetowany do ${START_BALANCE} zł`, 'info');
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

  // Register Service Worker (updateViaCache: 'none' => sw.js zawsze sprawdzany w sieci)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        // Sprawdzaj aktualizacje także, gdy użytkownik wraca do aplikacji
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  }
});

// --- Save State ---
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Nie udało się zapisać stanu:', err);
    showToast('Nie udało się zapisać portfela w przeglądarce', 'error');
  }
}

// --- Network helper z limitem czasu ---
async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// --- Cena: aktualna / nieaktualna / brak ---
function isPriceFresh() {
  return currentBtcPrice > 0 && Date.now() - priceTimestamp <= PRICE_MAX_AGE_MS;
}

function refreshPriceStatus() {
  if (currentBtcPrice <= 0) priceStatus = 'none';
  else priceStatus = isPriceFresh() ? 'live' : 'stale';
}

// --- Fetch BTC Price & Chart Data ---
async function fetchBtcData() {
  try {
    const data = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=pln&include_24hr_change=true');
    const price = data && data.bitcoin && data.bitcoin.pln;
    if (!isFiniteNumber(price) || price <= 0) throw new Error('Niepoprawna odpowiedź API');

    currentBtcPrice = price;
    priceChange24h = data.bitcoin.pln_24h_change || 0;
    priceTimestamp = Date.now();
    try {
      localStorage.setItem(PRICE_KEY, JSON.stringify({ price: currentBtcPrice, change: priceChange24h, ts: priceTimestamp }));
    } catch (e) { /* ignoruj */ }
  } catch (err) {
    // Nie zmyślamy kursu: zostaje ostatni znany (oznaczony jako nieaktualny) albo brak
    console.warn('CoinGecko API error:', err);
  }

  refreshPriceStatus();
  updatePriceDisplay();
  updateUI();
}

function updatePriceDisplay() {
  refreshPriceStatus();

  if (currentBtcPriceEl) {
    currentBtcPriceEl.textContent = currentBtcPrice > 0 ? formatPLN(currentBtcPrice) : 'Brak kursu';
  }
  if (chartCurrentPriceEl) {
    chartCurrentPriceEl.textContent = currentBtcPrice > 0 ? formatPLN(currentBtcPrice) : '—';
  }
  if (priceChange24hEl) {
    if (currentBtcPrice > 0) {
      const isPositive = priceChange24h >= 0;
      priceChange24hEl.textContent = `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`;
      priceChange24hEl.className = `ticker-change ${isPositive ? 'is-up' : 'is-down'}`;
    } else {
      priceChange24hEl.textContent = '--';
      priceChange24hEl.className = 'ticker-change is-flat';
    }
  }
  if (priceStatusEl) {
    if (priceStatus === 'live') {
      priceStatusEl.textContent = 'Kurs na żywo (CoinGecko)';
    } else if (priceStatus === 'stale') {
      const when = priceTimestamp ? new Date(priceTimestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '?';
      priceStatusEl.textContent = `Kurs nieaktualny (z ${when}) — handel wstrzymany`;
    } else {
      priceStatusEl.textContent = 'Brak połączenia z CoinGecko — handel wstrzymany';
    }
  }
  if (priceDotEl) {
    priceDotEl.className = `dot ${priceStatus === 'live' ? 'dot-live' : priceStatus === 'stale' ? 'dot-stale' : 'dot-none'}`;
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
        borderColor: '#f2a33c',
        borderWidth: 2,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(242, 163, 60, 0.0)');
          gradient.addColorStop(1, 'rgba(242, 163, 60, 0.22)');
          return gradient;
        },
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f2a33c',
        pointHoverBorderColor: '#08090b',
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
          backgroundColor: '#0d0f12',
          titleColor: '#f1f3f5',
          bodyColor: '#a7b0bd',
          borderColor: '#2a3038',
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
          ticks: { color: '#7d8794', font: { size: 10, family: "'JetBrains Mono', monospace" }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(29, 33, 40, 0.85)', drawBorder: false },
          ticks: {
            color: '#7d8794',
            font: { size: 10, family: "'JetBrains Mono', monospace" },
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

  loadChartData(currentTimeframe);
}

function buildChartLabels(prices, days) {
  return prices.map((item) => {
    const date = new Date(item[0]);
    if (days === '1') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === '7' || days === '30') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'short' });
  });
}

function applyChartData(days, prices) {
  btcChart.data.labels = buildChartLabels(prices, days);
  btcChart.data.datasets[0].data = prices.map((item) => item[1]);
  btcChart.update();
  if (chartErrorEl) chartErrorEl.classList.add('hidden');
}

async function loadChartData(days) {
  const requestId = ++chartRequestId;

  const cached = chartCache[days];
  if (cached && Date.now() - cached.ts < CHART_CACHE_TTL_MS) {
    applyChartData(days, cached.prices);
    return;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=pln&days=${days}`;
    const data = await fetchJson(url);
    const prices = data && data.prices;
    if (!Array.isArray(prices) || prices.length === 0) throw new Error('Pusta odpowiedź wykresu');

    chartCache[days] = { ts: Date.now(), prices };

    // Ignoruj spóźnioną odpowiedź, jeśli użytkownik zdążył wybrać inny zakres
    if (requestId !== chartRequestId) return;
    applyChartData(days, prices);

    if (currentBtcPrice === 0) {
      currentBtcPrice = prices[prices.length - 1][1];
      priceTimestamp = Date.now();
      updatePriceDisplay();
      updateUI();
    }
  } catch (err) {
    console.warn('Error loading chart from CoinGecko:', err);
    if (requestId !== chartRequestId) return;
    // Zamiast losowego wykresu pokazujemy czytelny komunikat; użyj starych danych z cache, jeśli są
    if (cached) {
      applyChartData(days, cached.prices);
    } else {
      btcChart.data.labels = [];
      btcChart.data.datasets[0].data = [];
      btcChart.update();
      if (chartErrorEl) chartErrorEl.classList.remove('hidden');
    }
  }
}

function changeTimeframe(days, btn) {
  currentTimeframe = days;
  document.querySelectorAll('.timeframe-btn').forEach((b) => {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  loadChartData(days);
}

// --- Trading Logic with 0.1% Commission ---

function calcBuy(plnVal) {
  const feePln = round2(plnVal * COMMISSION_RATE);
  const netPln = plnVal - feePln;
  const btc = round8(netPln / currentBtcPrice);
  return { feePln, netPln, btc };
}

function calcSell(btcVal) {
  const grossPln = btcVal * currentBtcPrice;
  const feePln = round2(grossPln * COMMISSION_RATE);
  const netPln = round2(grossPln - feePln);
  return { grossPln, feePln, netPln };
}

function setBuyPercentage(pct) {
  let amount = pct === 1.0 ? state.pln : Math.floor(state.pln * pct * 100) / 100;
  if (buyAmountPlnEl) {
    buyAmountPlnEl.value = amount > 0 ? amount.toFixed(2) : '';
    updateBuyEstimate();
  }
}

function setSellPercentage(pct) {
  let amount = pct === 1.0 ? state.btc : Math.floor(state.btc * pct * 1e8) / 1e8;
  if (sellAmountBtcEl) {
    sellAmountBtcEl.value = amount > 0 ? amount.toFixed(8) : '';
    updateSellEstimate();
  }
}

function updateBuyEstimate() {
  if (!buyAmountPlnEl || !buyEstimateBtcEl) return;
  const plnVal = parseFloat(buyAmountPlnEl.value) || 0;
  if (currentBtcPrice > 0 && plnVal > 0) {
    const { feePln, btc } = calcBuy(plnVal);
    buyEstimateBtcEl.textContent = `${btc.toFixed(8)} BTC`;
    if (buyEstimateFeeEl) buyEstimateFeeEl.textContent = `prowizja ${formatPLN(feePln)}`;
  } else {
    buyEstimateBtcEl.textContent = '0.00000000 BTC';
    if (buyEstimateFeeEl) buyEstimateFeeEl.textContent = 'prowizja 0,00 zł';
  }
}

function updateSellEstimate() {
  if (!sellAmountBtcEl || !sellEstimatePlnEl) return;
  const btcVal = parseFloat(sellAmountBtcEl.value) || 0;
  if (currentBtcPrice > 0 && btcVal > 0) {
    const { feePln, netPln } = calcSell(btcVal);
    sellEstimatePlnEl.textContent = formatPLN(netPln);
    if (sellEstimateFeeEl) sellEstimateFeeEl.textContent = `prowizja ${formatPLN(feePln)}`;
  } else {
    sellEstimatePlnEl.textContent = '0,00 zł';
    if (sellEstimateFeeEl) sellEstimateFeeEl.textContent = 'prowizja 0,00 zł';
  }
}

// Zwraca true, jeśli można handlować; w przeciwnym razie pokazuje komunikat
function ensureTradablePrice() {
  refreshPriceStatus();
  if (currentBtcPrice <= 0) {
    showToast('Brak aktualnego kursu BTC. Spróbuj ponownie za chwilę.', 'error');
    return false;
  }
  if (!isPriceFresh()) {
    showToast('Kurs BTC jest nieaktualny. Handel wznowi się po odświeżeniu kursu.', 'error');
    fetchBtcData();
    return false;
  }
  return true;
}

function executeBuy() {
  let plnVal = parseFloat(buyAmountPlnEl.value);
  if (!plnVal || plnVal <= 0) {
    showToast('Wprowadź poprawną kwotę PLN do zakupu', 'error');
    return;
  }
  plnVal = round2(plnVal);
  if (plnVal > state.pln && plnVal <= state.pln + 0.01) {
    plnVal = state.pln;
  }
  if (plnVal > state.pln) {
    showToast('Brak wystarczających środków PLN w portfelu!', 'error');
    return;
  }
  if (!ensureTradablePrice()) return;

  const { feePln, btc: btcBought } = calcBuy(plnVal);
  if (btcBought <= 0) {
    showToast('Kwota jest zbyt mała, żeby kupić jakąkolwiek ilość BTC', 'error');
    return;
  }

  state.pln = round2(state.pln - plnVal);
  state.btc = round8(state.btc + btcBought);
  state.totalInvestedPln = round2(state.totalInvestedPln + plnVal);
  state.totalBtcBought = round8(state.totalBtcBought + btcBought);

  // Handle tiny remaining dust if pln was effectively all-in
  if (state.pln < 0.01) {
    state.pln = 0;
  }

  state.transactions.unshift({
    type: 'KUPNO',
    ts: Date.now(),
    price: currentBtcPrice,
    btc: btcBought,
    pln: plnVal,
    fee: feePln
  });

  saveState();
  updateUI();
  buyAmountPlnEl.value = '';
  updateBuyEstimate();

  showToast(`Zakupiono ${btcBought.toFixed(6)} BTC za ${formatPLN(plnVal)} (prowizja: ${formatPLN(feePln)})`, 'success');
}

function executeSell() {
  let btcVal = parseFloat(sellAmountBtcEl.value);
  if (!btcVal || btcVal <= 0) {
    showToast('Wprowadź poprawną ilość BTC do sprzedaży', 'error');
    return;
  }
  btcVal = round8(btcVal);
  // Allow tiny floating point tolerance for dust/all-in
  if (btcVal > state.btc && btcVal <= state.btc + 1e-7) {
    btcVal = state.btc;
  }
  if (btcVal > state.btc) {
    showToast('Nie masz tylu BTC w portfelu!', 'error');
    return;
  }
  if (!ensureTradablePrice()) return;

  const { feePln, netPln } = calcSell(btcVal);

  if (state.totalBtcBought > 0 && state.btc > 0) {
    const ratio = btcVal / state.btc;
    state.totalInvestedPln = Math.max(0, round2(state.totalInvestedPln - state.totalInvestedPln * ratio));
    state.totalBtcBought = Math.max(0, round8(state.totalBtcBought - btcVal));
  }

  state.btc = round8(state.btc - btcVal);
  state.pln = round2(state.pln + netPln);

  // If selling all or remaining dust
  if (state.btc < 1e-8) {
    state.btc = 0;
    state.totalBtcBought = 0;
    state.totalInvestedPln = 0;
  }

  state.transactions.unshift({
    type: 'SPRZEDAŻ',
    ts: Date.now(),
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


// --- UI Updates & Calculations ---

function updateUI() {
  const btcValueInPln = state.btc * currentBtcPrice;
  const totalPortfolioValue = state.pln + btcValueInPln;
  const netProfit = totalPortfolioValue - START_BALANCE;
  const netProfitPercent = (netProfit / START_BALANCE) * 100;

  if (totalPortfolioEl) totalPortfolioEl.textContent = formatPLN(totalPortfolioValue);
  if (walletPlnEl) walletPlnEl.textContent = formatPLN(state.pln);
  if (walletBtcEl) walletBtcEl.textContent = state.btc.toFixed(8) + ' BTC';
  if (walletBtcPlnEl) walletBtcPlnEl.textContent = `≈ ${formatPLN(btcValueInPln)}`;

  if (avgBuyPriceEl) {
    if (state.totalBtcBought > 0) {
      avgBuyPriceEl.textContent = formatPLN(state.totalInvestedPln / state.totalBtcBought);
    } else {
      avgBuyPriceEl.textContent = '-';
    }
  }

  if (portfolioPnlEl) {
    const isProfit = netProfit >= 0;
    portfolioPnlEl.textContent = `${isProfit ? '+' : ''}${formatPLN(netProfit)} (${isProfit ? '+' : ''}${netProfitPercent.toFixed(2)}%)`;
    portfolioPnlEl.className = `pnl ${isProfit ? 'is-up' : 'is-down'}`;
  }

  if (transactionsTbody && txCountEl) {
    txCountEl.textContent = `${state.transactions.length} transakcji`;
    if (state.transactions.length === 0) {
      transactionsTbody.innerHTML = `<tr class="empty-row"><td colspan="5"><span class="empty-title">Brak transakcji</span><span class="empty-sub">Zacznij od zakupu BTC — portfel startowy to 100 zł.</span></td></tr>`;
    } else {
      transactionsTbody.innerHTML = state.transactions.map(tx => {
        const isBuy = tx.type === 'KUPNO';
        const dateText = tx.ts ? new Date(tx.ts).toLocaleString('pl-PL') : tx.date;
        return `
        <tr>
          <td>
            <span class="tx-type ${isBuy ? 'tx-buy' : 'tx-sell'}">${isBuy ? 'KUPNO' : 'SPRZEDAŻ'}</span>
            <span class="tx-fee">prowizja ${formatPLN(Number(tx.fee) || 0)}</span>
          </td>
          <td class="tx-date">${escapeHtml(dateText)}</td>
          <td class="num">${formatPLN(Number(tx.price) || 0)}</td>
          <td class="num">${(Number(tx.btc) || 0).toFixed(6)} BTC</td>
          <td class="num">${formatPLN(Number(tx.pln) || 0)}</td>
        </tr>
      `;
      }).join('');
    }
  }
}

// --- Helpers ---
function formatPLN(amount) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const variants = { success: 'toast-success', error: 'toast-error', info: 'toast-info' };
  toast.className = `toast ${variants[type] || variants.info}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-in');
  });

  setTimeout(() => {
    toast.classList.remove('is-in');
    toast.classList.add('is-out');
    setTimeout(() => toast.remove(), 260);
  }, 3500);
}
