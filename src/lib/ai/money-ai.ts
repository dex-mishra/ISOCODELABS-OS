import { getAccessToken, fetchWithRetry } from './chat';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';

export interface FinancialAnalysis {
  summary: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;
  };
  top_categories: { name: string; amount: number; percentage: number }[];
  optimization_opportunities: string[];
  revenue_forecast: string;
  budget_recommendations: string[];
  action_items: string[];
}

/**
 * Helper to call Gemini Pro via Vertex AI rest endpoint.
 */
async function callGemini(prompt: string, maxTokens = 2048, temperature = 0.3): Promise<string | null> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
  }

  if (!GCP_PROJECT_ID || !accessToken) return null;

  try {
    const endpoint = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;

    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Gemini AI call failed:', errText);
      throw new Error(`Vertex AI API error: ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('callGemini error:', error);
    throw error;
  }
}

/**
 * Analyze financial data using Vertex AI Gemini.
 * Falls back to computed analysis from raw data when AI is unavailable.
 */
export async function analyzeFinancials(
  transactions: any[],
  invoices: any[]
): Promise<FinancialAnalysis> {
  // Pre-compute real numbers from data (used by both AI prompt context and fallback)
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? parseFloat(((netProfit / totalIncome) * 100).toFixed(2)) : 0;

  // Aggregate expenses by category
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + (t.amount || 0);
    });

  const sortedCategories = Object.entries(categoryMap)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? parseFloat(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Invoice stats for context
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
  const pendingInvoices = invoices.filter((i) => i.status === 'SENT' || i.status === 'DRAFT');
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);

  // Try AI-powered analysis
  const prompt = `You are a Financial Analyst AI for a software agency. Analyze the following financial data and provide actionable insights.

TRANSACTION SUMMARY (Last 6 Months):
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpenses.toFixed(2)}
- Net Profit: ₹${netProfit.toFixed(2)}
- Profit Margin: ${profitMargin}%
- Total Transactions: ${transactions.length}

EXPENSE BREAKDOWN BY CATEGORY:
${sortedCategories.map((c) => `- ${c.name}: ₹${c.amount.toFixed(2)} (${c.percentage}%)`).join('\n')}

INCOME TRANSACTIONS (recent):
${transactions.filter((t) => t.type === 'INCOME').slice(0, 10).map((t) => `- ₹${t.amount} | ${t.category} | ${t.date} | ${t.description || 'No description'}`).join('\n') || 'No income transactions'}

INVOICE SUMMARY:
- Total Invoiced: ₹${totalInvoiced.toFixed(2)}
- Total Paid: ₹${totalPaid.toFixed(2)}
- Total Overdue: ₹${totalOverdue.toFixed(2)} (${overdueInvoices.length} invoices)
- Pending: ${pendingInvoices.length} invoices
- Collection Rate: ${totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : 0}%

Provide your analysis in the following strict JSON format:
{
  "summary": {
    "total_income": <number>,
    "total_expenses": <number>,
    "net_profit": <number>,
    "profit_margin": <number as percentage>
  },
  "top_categories": [
    { "name": "<category>", "amount": <number>, "percentage": <number> }
  ],
  "optimization_opportunities": [
    "<string: specific actionable opportunity to reduce costs or increase revenue>"
  ],
  "revenue_forecast": "<string: 2-3 sentence forecast for next quarter revenue based on trends>",
  "budget_recommendations": [
    "<string: specific budget constraint or recommendation>"
  ],
  "action_items": [
    "<string: high-priority action item>"
  ]
}

Include 3-5 items for top_categories (or fewer if there are fewer categories).
Include 3-5 optimization opportunities, 3-5 budget recommendations, and 3-5 action items.
Base the revenue forecast on the actual data trends.
Respond ONLY with this JSON. No additional text or markdown formatting.`;

  try {
    const aiResponse = await callGemini(prompt, 2048, 0.3);
    if (aiResponse) {
      try {
        return JSON.parse(aiResponse) as FinancialAnalysis;
      } catch (e) {
        console.error('Failed to parse financial analysis JSON:', e);
      }
    }
  } catch (_error) {
    console.warn('Vertex AI unavailable for financial analysis, using computed fallback.');
  }

  // ── Smart Fallback: compute real analysis from raw transaction data ──

  const topCategories = sortedCategories.slice(0, 5);

  // Generate optimization opportunities based on real data
  const optimizationOpportunities: string[] = [];
  if (topCategories.length > 0) {
    optimizationOpportunities.push(
      `"${topCategories[0].name}" is your largest expense category at ${topCategories[0].percentage}% of total spend (₹${topCategories[0].amount.toFixed(2)}). Review for potential vendor renegotiation or consolidation.`
    );
  }
  if (overdueInvoices.length > 0) {
    optimizationOpportunities.push(
      `${overdueInvoices.length} overdue invoice(s) totaling ₹${totalOverdue.toFixed(2)}. Implement automated payment reminders to improve cash flow.`
    );
  }
  if (profitMargin < 20) {
    optimizationOpportunities.push(
      `Profit margin of ${profitMargin}% is below the 20% healthy threshold. Consider adjusting pricing or reducing discretionary spending.`
    );
  }
  const recurringExpenses = transactions.filter((t) => t.type === 'EXPENSE' && t.recurring);
  if (recurringExpenses.length > 0) {
    const recurringTotal = recurringExpenses.reduce((sum, t) => sum + t.amount, 0);
    optimizationOpportunities.push(
      `Recurring expenses total ₹${recurringTotal.toFixed(2)}/period across ${recurringExpenses.length} items. Audit subscriptions for unused or redundant services.`
    );
  }
  if (optimizationOpportunities.length === 0) {
    optimizationOpportunities.push('Financial data is limited. Continue tracking expenses to identify optimization opportunities.');
  }

  // Revenue forecast based on trend
  const monthlyIncome: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'INCOME')
    .forEach((t) => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      monthlyIncome[month] = (monthlyIncome[month] || 0) + t.amount;
    });
  const monthlyValues = Object.values(monthlyIncome);
  const avgMonthlyRevenue = monthlyValues.length > 0
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
    : 0;
  const forecastQuarterly = avgMonthlyRevenue * 3;

  const revenueForecast = monthlyValues.length > 0
    ? `Based on ${monthlyValues.length} months of data, average monthly revenue is ₹${avgMonthlyRevenue.toFixed(2)}. Projected next quarter revenue: ~₹${forecastQuarterly.toFixed(2)}. ${monthlyValues.length >= 3 && monthlyValues[monthlyValues.length - 1] > monthlyValues[0] ? 'Revenue shows an upward trend.' : 'Consider diversifying income streams to strengthen growth.'}`
    : 'Insufficient income data to project revenue. Begin tracking income transactions consistently.';

  // Budget recommendations
  const budgetRecommendations: string[] = [];
  if (totalExpenses > totalIncome * 0.8) {
    budgetRecommendations.push(
      `Expenses consume ${totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(0) : 'N/A'}% of income. Set a hard cap at 70% to ensure healthy margins.`
    );
  }
  topCategories.slice(0, 3).forEach((cat) => {
    const suggestedLimit = cat.amount * 0.9;
    budgetRecommendations.push(
      `Cap "${cat.name}" spending at ₹${suggestedLimit.toFixed(2)}/period (10% reduction from current ₹${cat.amount.toFixed(2)}).`
    );
  });
  if (budgetRecommendations.length === 0) {
    budgetRecommendations.push('Maintain current spending levels and revisit as more data becomes available.');
  }

  // Action items
  const actionItems: string[] = [];
  if (overdueInvoices.length > 0) {
    actionItems.push(`Follow up on ${overdueInvoices.length} overdue invoice(s) worth ₹${totalOverdue.toFixed(2)}.`);
  }
  if (pendingInvoices.length > 0) {
    actionItems.push(`Send ${pendingInvoices.filter((i) => i.status === 'DRAFT').length} draft invoice(s) to clients.`);
  }
  if (profitMargin < 15) {
    actionItems.push('Review pricing strategy — profit margin is critically low.');
  }
  if (transactions.length < 10) {
    actionItems.push('Improve financial data coverage by logging all income and expense transactions consistently.');
  }
  actionItems.push('Schedule monthly financial review to track progress against budget targets.');

  return {
    summary: {
      total_income: parseFloat(totalIncome.toFixed(2)),
      total_expenses: parseFloat(totalExpenses.toFixed(2)),
      net_profit: parseFloat(netProfit.toFixed(2)),
      profit_margin: profitMargin,
    },
    top_categories: topCategories,
    optimization_opportunities: optimizationOpportunities,
    revenue_forecast: revenueForecast,
    budget_recommendations: budgetRecommendations,
    action_items: actionItems,
  };
}
