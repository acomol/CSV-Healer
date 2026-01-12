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
    I have a CSV file uploaded for a marketing contact list. 
    Here are the first 10 rows of the data in JSON format:
    ${sample}

    Please analyze this sample and provide a brief data quality report (maximum 150 words).
    1. Identify the likely language/region of the names (e.g., Hebrew, Russian, English).
    2. Check if the 'Phone' or contact columns look correctly formatted (look for standard country codes).
    3. Note any obvious inconsistencies between columns (e.g. name column has email).
    
    Output as a clean markdown list.
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
