
import { GoogleGenAI } from "@google/genai";
import { Account } from "../types";

const getClient = () => {
  // Safe access to API Key
  const apiKey = process.env.API_KEY || '';
  // Note: In production, you would handle missing keys gracefully in UI
  return new GoogleGenAI({ apiKey });
};

export const analyzeFinancials = async (ledger: Account[], reportType: string, companyName: string, period: string): Promise<string> => {
  try {
    const ai = getClient();
    if (!process.env.API_KEY) {
       return "API Key is missing. Please configure your environment to use the AI features.";
    }
    
    // Prepare the data for the prompt
    // Sort for consistency
    const sortedLedger = [...ledger].sort((a,b) => a.code.localeCompare(b.code));
    
    const accountsData = sortedLedger.map(acc => 
      `${acc.code} ${acc.name} (${acc.type}) | Dr: $${acc.debit.toFixed(2)} | Cr: $${acc.credit.toFixed(2)}`
    ).join('\n');

    const prompt = `
      Act as a senior certified accountant (CPA) and financial auditor. 
      Analyze the following financial data for the "${reportType}" of '${companyName}' (${period}).
      
      -- LEDGER DATA START --
      ${accountsData}
      -- LEDGER DATA END --

      Instructions:
      1. Review the specific figures related to the ${reportType}.
      2. Provide a 3-part Markdown analysis:
         - **Executive Summary**: A brief 2-sentence health check.
         - **Key Insights**: Bullet points highlighting anomalies, strengths, or weaknesses (e.g., high liquidity, low margin, heavy debt).
         - **Recommendations**: Actionable advice for the business owner.
      
      Format with clear headers and bullet points. Be concise but professional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Analysis complete, but no text returned.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "The AI service is currently unavailable. Please try again later.";
  }
};
