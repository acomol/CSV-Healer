import { GoogleGenAI } from "@google/genai";
import { CsvRow } from "../types";

// Helper to get specific lines for context
const getSampleRows = (data: CsvRow[], count: number = 5): string => {
  return JSON.stringify(data.slice(0, count));
};

export const auditCsvData = async (apiKey: string, data: CsvRow[]): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  const ai = new GoogleGenAI({ apiKey });
  const sample = getSampleRows(data, 10);
  
  const prompt = `
    I am an auditor for Facebook (Meta) Ads Customer Lists.
    Target Location: **Israel** (+972).
    
    Analyze the following CSV sample (first 10 rows) against "Meta Customer list formatting guidelines":
    ${sample}

    **Strict Verification Rules:**
    1. **Emails**: Must be **lowercase** and trimmed. No uppercase letters allowed.
    2. **Phones**: Must be digits only. Format: Country Code + Number (e.g., 972501234567). No symbols (+, -), no leading zeros.
    3. **Excel Artifacts**: Verify no '="..."' formulas or scientific notation remain.
    4. **Columns**: Are 'email' and 'phone' columns clearly identifiable?

    Output a concise report. If clean, say "PASSED: Ready for Meta Upload". If not, bullet point specific rows/values that fail.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini Audit Error:", error);
    throw new Error("Failed to audit data with Gemini.");
  }
};