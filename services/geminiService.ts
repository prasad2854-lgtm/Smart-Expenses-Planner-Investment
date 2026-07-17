import { AppState, ProfileData } from "../types";

export const getSmartInvestmentInsights = async (state: AppState & ProfileData) => {
  const totalIncome = state.incomeSources.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = totalIncome - totalExpenses;
  const currency = state.currency || '₹';

  const prompt = `
    Act as a professional financial advisor. 
    Analyze the following financial profile:
    - User Type: ${state.userType}
    - Monthly Total Income: ${totalIncome}
    - Monthly Total Expenses: ${totalExpenses}
    - Remaining Balance: ${remaining}
    - Investment Allocation: ${state.allocation.investments}% of income (${currency}${(totalIncome * state.allocation.investments) / 100})
    - Preferred Currency: ${currency}
    
    Based on their user type (${state.userType}), provide 3 specific, actionable investment suggestions. 
    Keep it concise, friendly, and professional. 
    Format as a short list with bullet points. 
    Use the user's preferred currency (${currency}) in your response where relevant.
  `;

  try {
    const rawApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${rawApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Native REST Gemini Error:", error);
    return "Error generating smart insights. Please try again later.";
  }
};
