import { GoogleGenAI } from "@google/genai";
import { CsvRow } from "../types";
import { DataQualityReport } from "../utils/csvHelper";
import { logAI } from "../utils/logger";

// Helper to get specific lines for context
const getSampleRows = (data: CsvRow[], count: number = 5): string => {
  return JSON.stringify(data.slice(0, count));
};

// Helper to get random sample rows for better representation
const getRandomSampleRows = (data: CsvRow[], count: number = 10): CsvRow[] => {
  if (data.length <= count) return data;

  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * data.length));
  }

  return Array.from(indices).map(i => data[i]);
};

export interface EnhancedAuditResult {
  summary: string;
  score: number;
  issues: AuditIssue[];
  recommendations: string[];
  metaCompliance: {
    emailFormat: boolean;
    phoneFormat: boolean;
    noExcelArtifacts: boolean;
    columnsIdentifiable: boolean;
  };
}

export interface AuditIssue {
  type: 'error' | 'warning' | 'info';
  field: 'phone' | 'email' | 'general';
  message: string;
  count?: number;
  examples?: string[];
}

export const auditCsvData = async (apiKey: string, data: CsvRow[]): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  logAI.info('Starting basic audit', { rowCount: data.length });

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
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    logAI.info('Basic audit completed');
    return response.text || "No analysis could be generated.";
  } catch (error) {
    logAI.error('Basic audit failed', { error: String(error) });
    throw new Error("Failed to audit data with Gemini.");
  }
};

/**
 * Enhanced AI Audit with structured output and quality report integration
 */
export const enhancedAuditCsvData = async (
  apiKey: string,
  data: CsvRow[],
  qualityReport?: DataQualityReport
): Promise<EnhancedAuditResult> => {
  if (!apiKey) throw new Error("API Key is required");

  logAI.info('Starting enhanced audit', {
    rowCount: data.length,
    hasQualityReport: !!qualityReport
  });

  const ai = new GoogleGenAI({ apiKey });

  // Get both first rows and random samples for better coverage
  const firstRows = data.slice(0, 5);
  const randomRows = getRandomSampleRows(data, 5);
  const combinedSample = [...firstRows, ...randomRows];

  // Build context from quality report if available
  let qualityContext = '';
  if (qualityReport) {
    qualityContext = `
    **Pre-analyzed Quality Data:**
    - Quality Score: ${qualityReport.qualityScore}/100
    - Total Duplicate Rows: ${qualityReport.duplicates.totalDuplicateRows}
    - Phone Errors: ${qualityReport.errors.phone.map(e => `${e.type}: ${e.count}`).join(', ') || 'None'}
    - Email Errors: ${qualityReport.errors.email.map(e => `${e.type}: ${e.count}`).join(', ') || 'None'}
    `;
  }

  const prompt = `
    You are a Meta Ads Customer List compliance auditor specializing in Israeli market (+972).

    **Sample Data (10 rows - mix of first and random):**
    ${JSON.stringify(combinedSample, null, 2)}

    ${qualityContext}

    **Meta Customer List Requirements:**
    1. Emails: lowercase only, valid format, no spaces
    2. Phones: digits only, format 972XXXXXXXXX (12 digits for Israel), no symbols
    3. No Excel artifacts: no ="...", no scientific notation (E+)
    4. Columns must be clearly identifiable

    **Respond in this EXACT JSON format:**
    {
      "summary": "One sentence summary of data quality",
      "score": <number 0-100>,
      "issues": [
        {
          "type": "error|warning|info",
          "field": "phone|email|general",
          "message": "Description of issue",
          "count": <approximate count if known>,
          "examples": ["example1", "example2"]
        }
      ],
      "recommendations": ["recommendation 1", "recommendation 2"],
      "metaCompliance": {
        "emailFormat": true|false,
        "phoneFormat": true|false,
        "noExcelArtifacts": true|false,
        "columnsIdentifiable": true|false
      }
    }

    Be specific about issues found. Include actual problematic values as examples (max 3 per issue).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text || '';
    logAI.debug('Raw AI response', { responseLength: text.length });

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as EnhancedAuditResult;
      logAI.info('Enhanced audit completed', { score: parsed.score });
      return parsed;
    }

    // Fallback if JSON parsing fails
    logAI.warn('Failed to parse JSON, using fallback');
    return {
      summary: text.slice(0, 200),
      score: qualityReport?.qualityScore || 50,
      issues: [],
      recommendations: ['Unable to parse detailed analysis. Please review manually.'],
      metaCompliance: {
        emailFormat: true,
        phoneFormat: true,
        noExcelArtifacts: true,
        columnsIdentifiable: true
      }
    };
  } catch (error) {
    logAI.error('Enhanced audit failed', { error: String(error) });
    throw new Error("Failed to perform enhanced audit with Gemini.");
  }
};

/**
 * AI-powered column suggestion for ambiguous headers
 */
export const suggestColumnMapping = async (
  apiKey: string,
  headers: string[],
  sampleValues: Record<string, string[]>
): Promise<{ phone: string | null; email: string | null; confidence: number }> => {
  if (!apiKey) throw new Error("API Key is required");

  logAI.info('Requesting column mapping suggestion', { headers });

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze these CSV column headers and sample values to identify phone and email columns.
    Target: Israeli market (+972 phones)

    **Headers:** ${JSON.stringify(headers)}

    **Sample values per column:**
    ${Object.entries(sampleValues).map(([col, vals]) => `${col}: ${vals.slice(0, 3).join(', ')}`).join('\n')}

    **Respond in JSON:**
    {
      "phone": "column_name or null",
      "email": "column_name or null",
      "confidence": <0-100>
    }

    Consider:
    - Hebrew headers (טלפון = phone, אימייל = email)
    - Column content patterns over header names
    - Israeli phone formats: 05X, 972, ="05..."
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      logAI.info('Column mapping suggestion received', result);
      return result;
    }

    return { phone: null, email: null, confidence: 0 };
  } catch (error) {
    logAI.error('Column mapping suggestion failed', { error: String(error) });
    return { phone: null, email: null, confidence: 0 };
  }
};

/**
 * Generate human-readable audit report for export
 */
export const generateAuditReportText = async (
  apiKey: string,
  data: CsvRow[],
  qualityReport: DataQualityReport,
  auditResult: EnhancedAuditResult
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  logAI.info('Generating audit report text');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a professional audit report for a Meta Ads customer list.
    Write in clear, business-friendly language suitable for sending to a client.

    **Data Summary:**
    - Total Rows: ${data.length}
    - Quality Score: ${qualityReport.qualityScore}/100
    - Duplicates Found: ${qualityReport.duplicates.totalDuplicateRows}

    **AI Analysis:**
    ${JSON.stringify(auditResult, null, 2)}

    **Format the report as:**
    1. Executive Summary (2-3 sentences)
    2. Data Quality Score with explanation
    3. Issues Found (bulleted list)
    4. Recommendations (numbered list)
    5. Meta Compliance Status (✅/❌ for each requirement)
    6. Conclusion

    Keep it concise but thorough. Use emojis sparingly for visual clarity.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    logAI.info('Audit report text generated');
    return response.text || 'Failed to generate report text.';
  } catch (error) {
    logAI.error('Report generation failed', { error: String(error) });
    throw new Error("Failed to generate audit report.");
  }
};