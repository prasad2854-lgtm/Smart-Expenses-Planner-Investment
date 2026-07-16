
import { GoogleGenAI } from "@google/genai";
// Fixed imports: added ProfileData to access nested financial properties
import { AppState, UserType, ProfileData } from "../types";

// Always initialize with the named apiKey parameter from process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Correct usage of generateContent with model name and prompt
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    // Use the .text property directly to extract content
    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating smart insights. Please try again later.";
  }
};
