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

// ─── Financial calculator ───
export function calculateFinancialPlan({ type, params }) {
  const p = params || {};

  if (type === 'retirement') {
    const age = p.age || 30;
    const retireAge = p.retirement_age || 67;
    const yearsToRetire = retireAge - age;
    const monthlyExpenses = p.monthly_expenses || 15000;
    const currentSavings = p.current_savings || 0;
    const monthlySaving = p.monthly_saving || 0;
    const annualReturn = (p.expected_return || 6) / 100;
    const monthlyReturn = annualReturn / 12;

    // Target: 25x annual expenses (4% rule)
    const annualExpenses = monthlyExpenses * 12;
    const targetAmount = annualExpenses * 25;

    // Future value of current savings
    const fvCurrent = currentSavings * Math.pow(1 + annualReturn, yearsToRetire);

    // Future value of monthly contributions
    const months = yearsToRetire * 12;
    const fvContributions = monthlySaving * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

    const projectedTotal = fvCurrent + fvContributions;
    const gap = targetAmount - projectedTotal;

    // Required monthly saving to reach target
    const requiredMonthly = gap > 0
      ? gap * monthlyReturn / (Math.pow(1 + monthlyReturn, months) - 1)
      : 0;

    return {
      type: 'retirement_plan',
      currentAge: age,
      retirementAge: retireAge,
      yearsToRetire,
      monthlyExpenses,
      targetAmount: Math.round(targetAmount),
      currentSavings,
      monthlySaving,
      projectedTotal: Math.round(projectedTotal),
      gap: Math.round(gap),
      requiredMonthlySaving: Math.round(requiredMonthly),
      onTrack: gap <= 0,
      assumptions: `תשואה שנתית ${(annualReturn * 100).toFixed(1)}%, כלל 4% לפרישה`,
    };
  }

  if (type === 'mortgage') {
    const amount = p.mortgage_amount || 1000000;
    const rate = (p.mortgage_rate || 4.5) / 100;
    const years = p.mortgage_years || 25;
    const monthlyRate = rate / 12;
    const months = years * 12;

    // Monthly payment (PMT formula)
    const monthly = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                    (Math.pow(1 + monthlyRate, months) - 1);
    const totalPaid = monthly * months;
    const totalInterest = totalPaid - amount;

    // Compare with different rates
    const comparisons = [3.5, 4, 4.5, 5, 5.5, 6].map(r => {
      const mr = r / 100 / 12;
      const mp = amount * (mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1);
      return { rate: r + '%', monthlyPayment: Math.round(mp), totalInterest: Math.round(mp * months - amount) };
    });

    return {
      type: 'mortgage_calculation',
      loanAmount: amount,
      annualRate: (rate * 100).toFixed(2) + '%',
      years,
      monthlyPayment: Math.round(monthly),
      totalPaid: Math.round(totalPaid),
      totalInterest: Math.round(totalInterest),
      interestToLoanRatio: ((totalInterest / amount) * 100).toFixed(1) + '%',
      comparisons,
      recommendation: monthly > (p.monthly_income || Infinity) * 0.3
        ? 'ההחזר החודשי עולה על 30% מההכנסה — מומלץ לשקול סכום נמוך יותר או תקופה ארוכה יותר'
        : 'ההחזר החודשי בגבולות הסבירים (מתחת ל-30% מההכנסה)',
    };
  }

  if (type === 'pension_fees') {
    const balance = p.pension_balance || 500000;
    const fee = (p.management_fee_percent || 0.5) / 100;
    const age = p.age || 35;
    const retireAge = p.retirement_age || 67;
    const years = retireAge - age;
    const annualReturn = (p.expected_return || 5) / 100;

    // Impact of fees over time
    const scenarios = [0.15, 0.25, 0.35, 0.5, 0.75, 1.0].map(feePercent => {
      const netReturn = annualReturn - feePercent / 100;
      const futureValue = balance * Math.pow(1 + netReturn, years);
      return {
        feePercent: feePercent + '%',
        futureValue: Math.round(futureValue),
        monthlyPension: Math.round(futureValue / (20 * 12)), // ~20 years of pension
      };
    });

    const currentFV = balance * Math.pow(1 + annualReturn - fee, years);
    const bestFV = balance * Math.pow(1 + annualReturn - 0.0015, years);
    const feeCost = bestFV - currentFV;

    return {
      type: 'pension_fee_impact',
      currentBalance: balance,
      currentFee: (fee * 100).toFixed(2) + '%',
      yearsToRetirement: years,
      costOfCurrentFees: Math.round(feeCost),
      scenarios,
      recommendation: fee > 0.003
        ? `דמי הניהול שלך גבוהים! מעבר מ-${(fee * 100).toFixed(2)}% ל-0.15% יחסוך לך ₪${Math.round(feeCost).toLocaleString()} עד הפרישה`
        : 'דמי הניהול שלך סבירים',
    };
  }

  if (type === 'savings') {
    const monthly = p.monthly_saving || 2000;
    const years = p.mortgage_years || 10;
    const annualReturn = (p.expected_return || 5) / 100;
    const monthlyReturn = annualReturn / 12;
    const months = years * 12;
    const initial = p.current_savings || 0;

    const futureValue = initial * Math.pow(1 + annualReturn, years) +
      monthly * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);
    const totalDeposited = initial + monthly * months;

    return {
      type: 'savings_projection',
      monthlySaving: monthly,
      years,
      initialAmount: initial,
      totalDeposited: Math.round(totalDeposited),
      futureValue: Math.round(futureValue),
      totalReturn: Math.round(futureValue - totalDeposited),
      returnPercent: (((futureValue - totalDeposited) / totalDeposited) * 100).toFixed(1) + '%',
    };
  }

  if (type === 'tax_benefit') {
    const income = p.annual_income || 200000;
    // Israeli tax brackets 2024
    const brackets = [
      [84120, 0.10], [120720, 0.14], [193800, 0.20],
      [269280, 0.31], [560280, 0.35], [721560, 0.47], [Infinity, 0.50],
    ];

    let tax = 0;
    let prev = 0;
    for (const [limit, rate] of brackets) {
      if (income <= prev) break;
      const taxable = Math.min(income, limit) - prev;
      tax += taxable * rate;
      prev = limit;
    }

    const marginalRate = brackets.find(([l]) => income <= l)?.[1] || 0.50;

    // Tax credits
    const creditPoints = 2.75; // base for male
    const creditValue = creditPoints * 2904; // 2024 value per point
    const netTax = Math.max(0, tax - creditValue);

    // Pension tax benefit (section 47)
    const pensionDeposit = Math.min(income * 0.07, 12000 * 12 * 0.07);
    const pensionCredit = pensionDeposit * 0.35;

    return {
      type: 'tax_calculation',
      annualIncome: income,
      monthlyIncome: Math.round(income / 12),
      grossTax: Math.round(tax),
      creditPoints,
      creditValue: Math.round(creditValue),
      netTax: Math.round(netTax),
      effectiveRate: ((netTax / income) * 100).toFixed(1) + '%',
      marginalRate: (marginalRate * 100) + '%',
      pensionTaxCredit: Math.round(pensionCredit),
      tip: `הפקדה של ₪${Math.round(pensionDeposit).toLocaleString()} לפנסיה חוסכת ₪${Math.round(pensionCredit).toLocaleString()} במס`,
    };
  }

  return { error: 'סוג חישוב לא מוכר' };
}

// ─── Tool handlers map ───
export const TOOL_HANDLERS = {
  get_fundamentals: getFundamentals,
  get_market_overview: getMarketOverview,
  get_sector_stocks: getSectorStocks,
  get_etf_data: getETFData,
  calculate_financial_plan: calculateFinancialPlan,
};
