import yahooFinance from 'yahoo-finance2';

yahooFinance.suppressNotices(['yahooSurvey']);

// ─── Quote helper ───
async function quoteMany(symbols) {
  const quotes = await yahooFinance.quote(symbols);
  const arr = Array.isArray(quotes) ? quotes : [quotes];
  return arr.map(q => ({
    symbol: q.symbol,
    price: q.regularMarketPrice,
    changePercent: q.regularMarketChangePercent?.toFixed(2),
    change: q.regularMarketChange?.toFixed(2),
    name: q.longName || q.shortName,
  }));
}

// ─── Get stock fundamentals ───
export async function getFundamentals({ symbol }) {
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: [
      'assetProfile', 'financialData', 'defaultKeyStatistics',
      'summaryDetail', 'price', 'recommendationTrend',
    ],
  });

  const p = summary.price || {};
  const fd = summary.financialData || {};
  const ks = summary.defaultKeyStatistics || {};
  const sd = summary.summaryDetail || {};
  const ap = summary.assetProfile || {};

  return {
    symbol: p.symbol,
    name: p.longName || p.shortName,
    sector: ap.sector,
    industry: ap.industry,
    valuation: {
      marketCap: p.marketCap,
      peRatio: sd.trailingPE,
      forwardPE: sd.forwardPE,
      pegRatio: ks.pegRatio,
      priceToBook: ks.priceToBook,
      evToEbitda: ks.enterpriseToEbitda,
      dividendYield: sd.dividendYield,
    },
    profitability: {
      grossMargin: fd.grossMargins,
      operatingMargin: fd.operatingMargins,
      profitMargin: fd.profitMargins,
      returnOnEquity: fd.returnOnEquity,
    },
    growth: {
      revenueGrowthYoY: fd.revenueGrowth,
      earningsGrowthYoY: fd.earningsGrowth,
    },
    financialHealth: {
      totalCash: fd.totalCash,
      totalDebt: fd.totalDebt,
      debtToEquity: fd.debtToEquity,
      currentRatio: fd.currentRatio,
      freeCashflow: fd.freeCashflow,
    },
    analysts: {
      recommendationKey: fd.recommendationKey,
      targetMean: fd.targetMeanPrice,
      targetHigh: fd.targetHighPrice,
      targetLow: fd.targetLowPrice,
      currentPrice: fd.currentPrice,
      numberOfAnalysts: fd.numberOfAnalystOpinions,
    },
  };
}

// ─── Get market overview ───
const US_INDICES = ['^GSPC', '^IXIC', '^DJI', '^VIX'];
const SECTOR_ETFS = ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU', 'XLRE', 'XLC'];
const BOND_ETFS = ['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG'];
const TA_INDICES = ['TA35.TA', 'TA125.TA'];

export async function getMarketOverview({ markets = ['us'] } = {}) {
  const result = {};
  if (markets.includes('us')) {
    const [indices, sectors, bonds] = await Promise.all([
      quoteMany(US_INDICES),
      quoteMany(SECTOR_ETFS),
      quoteMany(BOND_ETFS),
    ]);
    result.us = { indices, sectors, bonds };
  }
  if (markets.includes('ta')) {
    result.ta = { indices: await quoteMany(TA_INDICES) };
  }
  return result;
}

// ─── Search stocks by sector/theme ───
const SECTOR_STOCKS = {
  technology: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'CRM', 'ADBE', 'ORCL', 'INTC', 'AMD', 'AVGO', 'QCOM', 'NOW'],
  healthcare: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'AMGN', 'MDT', 'ISRG', 'GILD', 'VRTX', 'BMY', 'REGN'],
  finance: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'C', 'SCHW', 'AXP', 'V', 'MA', 'BRK-B', 'MET', 'PNC', 'USB'],
  energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'VLO', 'PSX', 'OXY'],
  consumer: ['WMT', 'COST', 'PG', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX', 'TGT', 'HD', 'LOW'],
  realestate: ['AMT', 'PLD', 'CCI', 'EQIX', 'SPG', 'O', 'DLR', 'PSA', 'WELL', 'AVB'],
  industrial: ['CAT', 'DE', 'HON', 'UPS', 'RTX', 'BA', 'LMT', 'GE', 'MMM', 'UNP'],
};

const INDEX_FUNDS = {
  us_total: { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  sp500: { symbol: 'SPY', name: 'S&P 500 ETF' },
  nasdaq100: { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  smallcap: { symbol: 'IWM', name: 'Russell 2000 ETF' },
  international: { symbol: 'VXUS', name: 'Vanguard International ETF' },
  emerging: { symbol: 'VWO', name: 'Emerging Markets ETF' },
  dividend: { symbol: 'VYM', name: 'High Dividend Yield ETF' },
  growth: { symbol: 'VUG', name: 'Vanguard Growth ETF' },
  value: { symbol: 'VTV', name: 'Vanguard Value ETF' },
};

export async function getSectorStocks({ sector }) {
  const symbols = SECTOR_STOCKS[sector];
  if (!symbols) return { error: `סקטור לא מוכר: ${sector}. סקטורים: ${Object.keys(SECTOR_STOCKS).join(', ')}` };

  const quotes = await yahooFinance.quote(symbols);
  const arr = Array.isArray(quotes) ? quotes : [quotes];
  return arr.map(q => ({
    symbol: q.symbol,
    name: q.longName || q.shortName,
    price: q.regularMarketPrice,
    changePercent: q.regularMarketChangePercent?.toFixed(2),
    marketCap: q.marketCap,
    fiftyTwoWeekChangePercent: q.fiftyTwoWeekChangePercent?.toFixed(2),
    peRatio: q.trailingPE,
    dividendYield: q.dividendYield,
  }));
}

// ─── Get index/ETF data ───
export async function getETFData({ symbols }) {
  const quotes = await yahooFinance.quote(symbols);
  const arr = Array.isArray(quotes) ? quotes : [quotes];
  return arr.map(q => ({
    symbol: q.symbol,
    name: q.longName || q.shortName,
    price: q.regularMarketPrice,
    changePercent: q.regularMarketChangePercent?.toFixed(2),
    ytdReturn: q.ytdReturn,
    fiftyTwoWeekChangePercent: q.fiftyTwoWeekChangePercent?.toFixed(2),
    dividendYield: q.dividendYield,
  }));
}

// ─── Tool handlers map ───
export const TOOL_HANDLERS = {
  get_fundamentals: getFundamentals,
  get_market_overview: getMarketOverview,
  get_sector_stocks: getSectorStocks,
  get_etf_data: getETFData,
};
