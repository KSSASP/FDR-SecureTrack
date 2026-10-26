import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { query, queryOne } from '../db/database.js';
import { AuthenticatedUser } from '../middleware/auth.js';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiAssistantResponse {
  answerText: string;
  answerTamil?: string;
  detectedIntent: string;
  caseLinks: Array<{
    fdrId: string;
    fdrNumber: string;
    institutionName: string;
    label: string;
  }>;
  suggestedFollowUps: string[];
  isAiGenerated: boolean;
  configured: boolean;
  modelUsed?: string;
  warning?: string;
}

export class GeminiAssistantService {
  private aiClient: GoogleGenAI | null = null;
  private currentApiKey: string = '';

  private getClient(): GoogleGenAI | null {
    const apiKey = (process.env.GEMINI_API_KEY || config.geminiApiKey || '').trim();
    if (!apiKey) {
      return null;
    }
    if (!this.aiClient || this.currentApiKey !== apiKey) {
      this.currentApiKey = apiKey;
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  /**
   * Check if Gemini API is configured
   */
  isConfigured(): boolean {
    const apiKey = (process.env.GEMINI_API_KEY || config.geminiApiKey || '').trim();
    return Boolean(apiKey && apiKey.length > 5);
  }

  /**
   * Retrieve authorized database context tailored strictly to the user's role and query
   */
  private async getAuthorizedDatabaseContext(user: AuthenticatedUser, userQuery: string): Promise<{
    contextSummary: string;
    matchedRecords: any[];
  }> {
    const isInstAdmin = user.role === 'INSTITUTION_ADMIN';
    const instId = user.institution_id;
    const nowIso = new Date().toISOString().split('T')[0];

    // 1. Fetch authorized FDR records (limit 35 to prevent token bloat)
    let fdrQuery = `
      SELECT f.id, f.fdr_number, f.institution_id, f.bank_name, f.branch_name, f.amount, f.issue_date, f.maturity_date,
             f.interest_rate, f.current_status, f.verification_status, f.risk_score, f.risk_level,
             f.linked_application_ref, i.name as institution_name, i.code as institution_code
      FROM fdr_instruments f
      JOIN institutions i ON f.institution_id = i.id
      WHERE f.is_archived = 0
    `;
    const fdrParams: any[] = [];

    if (isInstAdmin) {
      fdrQuery += ` AND f.institution_id = ?`;
      fdrParams.push(instId);
    }

    fdrQuery += ` ORDER BY f.maturity_date ASC LIMIT 35`;
    const fdrs = await query<any>(fdrQuery, fdrParams);

    // 2. Fetch authorized renewal requests
    let renewalQuery = `
      SELECT r.id, f.fdr_number, r.status, r.request_date, i.name as institution_name
      FROM renewal_requests r
      JOIN fdr_instruments f ON r.original_fdr_id = f.id
      JOIN institutions i ON r.institution_id = i.id
    `;
    const renewalParams: any[] = [];
    if (isInstAdmin) {
      renewalQuery += ` WHERE r.institution_id = ?`;
      renewalParams.push(instId);
    }
    renewalQuery += ` ORDER BY r.created_at DESC LIMIT 10`;
    const renewals = await query<any>(renewalQuery, renewalParams);

    // 3. Fetch authorized release requests
    let releaseQuery = `
      SELECT rel.id, f.fdr_number, f.amount as requested_amount, rel.reason, rel.status, rel.request_type,
             i.name as institution_name
      FROM release_requests rel
      JOIN fdr_instruments f ON rel.fdr_id = f.id
      JOIN institutions i ON rel.institution_id = i.id
    `;
    const releaseParams: any[] = [];
    if (isInstAdmin) {
      releaseQuery += ` WHERE rel.institution_id = ?`;
      releaseParams.push(instId);
    }
    releaseQuery += ` ORDER BY rel.created_at DESC LIMIT 10`;
    const releases = await query<any>(releaseQuery, releaseParams);

    // 4. Fetch duplicate findings (Super Admin & Officers only)
    let duplicates: any[] = [];
    if (!isInstAdmin) {
      duplicates = await query<any>(`
        SELECT df.id, df.fdr_id, df.matched_fdr_id, df.match_category, df.similarity_score, df.reason, df.status,
               f1.fdr_number as source_number, i1.name as source_institution,
               f2.fdr_number as target_number, i2.name as target_institution
        FROM duplicate_findings df
        JOIN fdr_instruments f1 ON df.fdr_id = f1.id
        JOIN institutions i1 ON df.institution_id = i1.id
        JOIN fdr_instruments f2 ON df.matched_fdr_id = f2.id
        JOIN institutions i2 ON df.matched_institution_id = i2.id
        LIMIT 10
      `);
    }

    // 5. Aggregate metrics
    const totalInstruments = fdrs.length;
    const activeInstruments = fdrs.filter(f => f.current_status === 'VERIFIED' || f.current_status === 'ACTIVE').length;
    const highRiskCases = fdrs.filter(f => f.risk_level === 'HIGH' || f.risk_level === 'CRITICAL').length;
    const pendingVerification = fdrs.filter(f => f.verification_status === 'PENDING' || f.current_status === 'SUBMITTED').length;

    // Look up institution name if user is institution admin
    let userInstName = '';
    if (instId) {
      const inst = await queryOne<any>(`SELECT name FROM institutions WHERE id = ?`, [instId]);
      if (inst) userInstName = inst.name;
    }

    // Build concise structured context
    let context = `=== CURRENT SYSTEM DATE: ${nowIso} ===\n`;
    context += `=== AUTHORIZED USER IDENTITY & ROLE ===\n`;
    context += `User: ${user.name} (${user.email})\n`;
    context += `Role: ${user.role}\n`;
    if (isInstAdmin) {
      context += `Assigned Institution: ${userInstName || user.institution_id || 'Own Institution'} (ID: ${user.institution_id})\n`;
      context += `TENANT ISOLATION RULE: This user is an Institution Administrator. They CANNOT see or access data of any other institution. If they query about other colleges/institutions, politely state that access is restricted to their own institution.\n`;
    } else {
      context += `Jurisdiction: Global Regulatory Oversight (Access to all institutions within regulatory scope)\n`;
    }

    context += `\n=== REPOSITORY METRICS (AUTHORIZED SCOPE) ===\n`;
    context += `- Total Instruments In Scope: ${totalInstruments}\n`;
    context += `- Active/Compliant Instruments: ${activeInstruments}\n`;
    context += `- Pending Initial/Bank Verification: ${pendingVerification}\n`;
    context += `- High/Critical Risk Instruments: ${highRiskCases}\n`;

    context += `\n=== AUTHORIZED FDR INSTRUMENTS ===\n`;
    for (const f of fdrs.slice(0, 20)) {
      context += `• ID: ${f.id} | Ref: ${f.fdr_number} | Inst: ${f.institution_name} | Bank: ${f.bank_name} (${f.branch_name}) | Amount: INR ${Number(f.amount).toLocaleString('en-IN')} | Issue: ${f.issue_date} | Maturity: ${f.maturity_date} | Status: ${f.current_status} | Verif: ${f.verification_status} | Risk: ${f.risk_score}/100 (${f.risk_level})\n`;
    }

    if (renewals.length > 0) {
      context += `\n=== RENEWAL / REPLACEMENT REQUESTS ===\n`;
      for (const r of renewals.slice(0, 5)) {
        context += `• Renewal ID: ${r.id} | FDR: ${r.fdr_number} | Inst: ${r.institution_name} | Status: ${r.status} | Requested: ${r.request_date}\n`;
      }
    }

    if (releases.length > 0) {
      context += `\n=== RELEASE / REFUND REQUESTS ===\n`;
      for (const rel of releases.slice(0, 5)) {
        context += `• Release ID: ${rel.id} | FDR: ${rel.fdr_number} | Inst: ${rel.institution_name} | Type: ${rel.request_type} | Status: ${rel.status} | Reason: ${rel.reason}\n`;
      }
    }

    if (duplicates.length > 0) {
      context += `\n=== DUPLICATE FINDINGS & COLLISION SCENARIOS ===\n`;
      for (const d of duplicates.slice(0, 5)) {
        context += `• Duplicate Collision: Match Category: ${d.match_category} (Score: ${d.similarity_score}%) between "${d.source_number}" (${d.source_institution}) and "${d.target_number}" (${d.target_institution}) | Status: ${d.status}\n`;
      }
    }

    return {
      contextSummary: context,
      matchedRecords: fdrs
    };
  }

  /**
   * Main query handler for Gemini-powered Assistant
   */
  async processQuery(
    userInput: string,
    user: AuthenticatedUser,
    history: ChatMessage[] = [],
    preferredLang: 'en' | 'ta' = 'en'
  ): Promise<GeminiAssistantResponse> {
    const trimmedInput = (userInput || '').trim();
    if (!trimmedInput) {
      return {
        answerText: 'Please enter a question or topic about FDR instruments, regulatory compliance, risk scores, or system operations.',
        detectedIntent: 'EMPTY_INPUT',
        caseLinks: [],
        suggestedFollowUps: [
          'Show FDRs maturing in the next 30 days',
          'Which cases have pending verification?',
          'Why does an FDR get a high risk score?'
        ],
        isAiGenerated: false,
        configured: this.isConfigured()
      };
    }

    // Input length protection
    const sanitizedInput = trimmedInput.slice(0, 1000);

    // Detect if question contains Tamil characters
    const hasTamil = /[\u0B80-\u0BFF]/.test(sanitizedInput);
    const targetLang = hasTamil ? 'ta' : preferredLang;

    // Check if Gemini API is configured
    const client = this.getClient();
    if (!client) {
      return {
        answerText: targetLang === 'ta'
          ? 'Gemini API விசை கட்டமைக்கப்படவில்லை (.env கோப்பில் GEMINI_API_KEY ஐ உள்ளிடவும்). உங்கள் வசதிக்காக உள்ளூர் வினாவிடை அமைப்பு இயக்கத்தில் உள்ளது.'
          : 'Gemini AI API key is not configured. Please add GEMINI_API_KEY in the backend .env file to enable full conversational intelligence. In the meantime, local rule-based assistant queries (maturities, pending cases, risk factors) remain available.',
        detectedIntent: 'GEMINI_NOT_CONFIGURED',
        caseLinks: [],
        suggestedFollowUps: targetLang === 'ta'
          ? ['அடுத்த 30 நாட்களில் முதிர்வு ஆகும் FDR-கள்', 'High risk வழக்குகள்', 'என்னுடைய pending cases என்ன?']
          : ['Show FDRs maturing in the next 30 days', 'Which cases have pending verification?', 'Why does this FDR have a high risk score?'],
        isAiGenerated: false,
        configured: false,
        warning: 'GEMINI_API_KEY_MISSING'
      };
    }

    // Retrieve authorized database context
    const { contextSummary, matchedRecords } = await this.getAuthorizedDatabaseContext(user, sanitizedInput);

    // Model selection
    const modelName = (process.env.GEMINI_MODEL || config.geminiModel || 'gemini-2.5-flash').trim();

    // Construct system instructions
    const systemInstruction = `You are the official AI Assistant for "FDR SecureTrack" (Intelligent Security Deposit and Fixed Deposit Receipt Lifecycle Management System).
Your role is to assist authorized government regulatory officers, super administrators, and institutional administrators with compliance verification, FDR instruments, duplicate detection, risk assessment, maturity monitoring, renewals, release requests, and audit transparency.

CRITICAL INSTRUCTIONS & GROUNDING RULES:
1. STRICT DATA ACCURACY: Base your factual statements about FDRs, institutions, amounts, dates, and cases ONLY on the provided AUTHORIZED REPOSITORY CONTEXT. Never fabricate FDR numbers, monetary sums, bank verification decrees, or statistics.
2. MULTI-TENANT ACCESS CONTROL:
   - If the user is an INSTITUTION_ADMIN, they can ONLY view and inquire about their own assigned institution. They are forbidden from learning about other institutions. If they ask about other institutions, refuse politely and state that institutional isolation policies prohibit access.
   - If the user is a REGULATION_OFFICER or SUPER_ADMIN, they have oversight access to all institutions within their jurisdiction.
3. CLEAR SIMULATION DISCLOSURE:
   - Bank verification checks in this prototype use the SimulatedCoreBankingGateway-v2.1 adapter. Do NOT claim that real commercial bank core systems or government RTGS wire transfers were executed.
   - Explain the difference between transparent rule-based risk scoring (0-100) and proof of fraud. Risk scores are administrative prioritization indicators.
4. TWO-TIER APPROVAL WORKFLOW:
   - Release and refund requests require two-tier administrative authorization: Tier 1 Regulatory Officer Scrutiny + Tier 2 Super Admin Competent Authority approval.
5. LANGUAGE SUPPORT:
   - If the question is in Tamil or the user specifies Tamil, respond fluently in standard Tamil with technical terms explained clearly.
   - If the question is in English, respond in professional, concise, polished English.
6. FORMATTING:
   - Use clean, structured bullet points and bold headers. Keep answers informative, direct, and actionable.

AUTHORIZED REPOSITORY CONTEXT:
${contextSummary}
`;

    // Format conversation history (limit to last 6 turns)
    const historyTurns = (history || []).slice(-6).map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    try {
      // Build content for Gemini
      const promptText = `User Question: "${sanitizedInput}"\n\nPlease answer accurately based on the authorized context above. If the question refers to specific records, cite the exact FDR Reference Number and bank.`;

      const response = await client.models.generateContent({
        model: modelName,
        contents: [
          ...historyTurns,
          { role: 'user', parts: [{ text: promptText }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      const generatedText = response.text || 'I processed your query, but no textual response was generated by the model.';

      // Extract clickable case links from matched records referenced in the answer
      const caseLinks: Array<{ fdrId: string; fdrNumber: string; institutionName: string; label: string }> = [];
      const seenFdrIds = new Set<string>();

      for (const rec of matchedRecords) {
        if (
          (generatedText.includes(rec.fdr_number) || sanitizedInput.includes(rec.fdr_number) ||
           (rec.id && sanitizedInput.toLowerCase().includes(rec.id.toLowerCase()))) &&
          !seenFdrIds.has(rec.id)
        ) {
          seenFdrIds.add(rec.id);
          caseLinks.push({
            fdrId: rec.id,
            fdrNumber: rec.fdr_number,
            institutionName: rec.institution_name,
            label: `Inspect ${rec.fdr_number} (${rec.bank_name}) - INR ${Number(rec.amount).toLocaleString('en-IN')}`
          });
        }
      }

      // Generate context-aware follow-up suggestions
      const suggestedFollowUps: string[] = [];
      if (targetLang === 'ta') {
        suggestedFollowUps.push('அடுத்த 30 நாட்களில் முதிர்வு ஆகும் FDR-கள்');
        suggestedFollowUps.push('உயர் அபாய மதிப்பீடு (High Risk) கொண்ட வழக்குகள்');
        suggestedFollowUps.push('புதுப்பித்தல் நிலுவையில் உள்ள கோரிக்கைகள்');
      } else {
        if (caseLinks.length > 0) {
          suggestedFollowUps.push(`Explain the risk factors for ${caseLinks[0].fdrNumber}`);
          suggestedFollowUps.push('What are the required steps to resolve this case?');
        } else {
          suggestedFollowUps.push('Show FDRs maturing in the next 30 days');
          suggestedFollowUps.push('Which cases have pending verification?');
          suggestedFollowUps.push('What causes duplicate collisions between institutions?');
        }
      }

      return {
        answerText: generatedText,
        answerTamil: targetLang === 'ta' ? generatedText : undefined,
        detectedIntent: 'GEMINI_CONVERSATIONAL_RESPONSE',
        caseLinks: caseLinks.slice(0, 5),
        suggestedFollowUps: suggestedFollowUps.slice(0, 4),
        isAiGenerated: true,
        configured: true,
        modelUsed: modelName
      };
    } catch (apiErr: any) {
      console.error('Gemini API Invocation Error (sanitized):', apiErr.message || apiErr);

      // Distinguish specific API error conditions
      const errMsg = apiErr?.message || '';
      let userFriendlyMessage = 'An error occurred while communicating with Google Gemini API.';

      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401') || errMsg.includes('403')) {
        userFriendlyMessage = 'Gemini API authentication failed. Please verify that your GEMINI_API_KEY in server/.env is valid and active on Google AI Studio.';
      } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        userFriendlyMessage = 'Gemini API rate limit temporarily exceeded. Please wait a brief moment before sending your next question.';
      } else if (errMsg.includes('NOT_FOUND') || errMsg.includes('model')) {
        userFriendlyMessage = `The configured Gemini model "${modelName}" was not found or is unavailable. Please check GEMINI_MODEL in server/.env (e.g., gemini-2.5-flash or gemini-1.5-flash).`;
      } else {
        userFriendlyMessage = `Gemini AI service unavailable (${apiErr.status || 'Network Error'}). Please check your internet connection or server/.env configuration.`;
      }

      return {
        answerText: targetLang === 'ta'
          ? `Gemini API பிழை: ${userFriendlyMessage} உள்ளூர் உதவியாளரைப் பயன்படுத்தி தொடரலாம்.`
          : `${userFriendlyMessage}\n\nYou can still query approaching maturities, pending cases, and risk factors using built-in repository commands.`,
        detectedIntent: 'GEMINI_ERROR_FALLBACK',
        caseLinks: [],
        suggestedFollowUps: [
          'Show FDRs maturing in the next 30 days',
          'Which cases have pending verification?',
          'Why does this FDR have a high risk score?'
        ],
        isAiGenerated: false,
        configured: true,
        warning: errMsg
      };
    }
  }
}

export const geminiAssistantService = new GeminiAssistantService();
