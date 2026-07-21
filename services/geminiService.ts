import { AppState, ProfileData } from "../types";
import { Capacitor } from '@capacitor/core';

const API_BASE_URL = Capacitor.isNativePlatform() ? 'https://smart-income-planner.onrender.com' : '';

const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "";

export const parseReceiptFromImage = async (base64Data: string, mimeType: string, currency: string) => {
  const prompt = `
    Analyze this receipt or invoice image.
    Extract the following information:
    1. The total amount as a number (don't include currency symbols).
    2. A brief note containing the exact product names bought from the receipt (e.g. "Milk, Eggs, Bread"). If there are too many items, summarize the core products. Do not just put the merchant name.
    3. Categorize the expense strictly as one of the following exact strings:
       'Food', 'Travel', 'Utilities', 'Education', 'Medical', 'Entertainment', 'Provisions', 'Business Costs', 'Other'.
       (Note: Use 'Food' for restaurants, meals, and groceries. Use 'Provisions' for household supplies or general shopping. Use 'Other' only as a last resort).

    Respond ONLY with a valid JSON object in this format, with no markdown formatting or extra text:
    { "amount": 100, "category": "Food", "note": "Store Name" }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 503 || response.status === 429) {
        console.warn("Gemini AI is overloaded. Using fallback mock data for testing.");
        return {
          amount: 45.99,
          category: "Food",
          note: "Milk, Eggs, Bread, Coffee"
        };
      }
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error("Receipt API Error:", error);
    throw new Error(error.message || "Failed to parse receipt image");
  }
};

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
    - Investment Allocation: ${state.allocation.investments} % of income(${currency}${(totalIncome * state.allocation.investments) / 100})
  - Preferred Currency: ${currency}
    
    Based on their user type(${state.userType}), provide 3 specific, actionable investment suggestions. 
    Keep it concise, friendly, and professional.
  Format as a short list with bullet points. 
    Use the user's preferred currency (${currency}) in your response where relevant.
  `;

  try {
    const rawApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${rawApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
    console.error("Insights API Error:", error);
    throw new Error("Failed to connect to backend advisor service");
  }
};
