import { AppState, UserType, ProfileData } from "../types";
import { Capacitor } from '@capacitor/core';
const API_BASE_URL = Capacitor.isNativePlatform() ? 'https://smart-income-planner.onrender.com' : '';
import { Preferences } from '@capacitor/preferences';

// Fixed: changed state type to AppState & ProfileData to fix property access errors
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
    const { value: token } = await Preferences.get({ key: 'token' });
    const response = await fetch(`${API_BASE_URL}/api/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch insights from backend");
    }

    const data = await response.json();
    return data.result || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Backend Proxy Gemini Error:", error);
    return "Error generating smart insights. Please try again later.";
  }
};
