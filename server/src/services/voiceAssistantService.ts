import { query, queryOne } from '../db/database.js';
import { AuthenticatedUser } from '../middleware/auth.js';

export interface AssistantQueryResult {
  query: string;
  language: 'en' | 'ta';
  detectedIntent: string;
  answerText: string;
  answerTamil?: string;
  caseLinks: Array<{
    fdrId: string;
    fdrNumber: string;
    institutionName: string;
    label: string;
  }>;
  sqlExecuted?: string;
  suggestedFollowUps: string[];
}

export class VoiceAssistantService {
  async processQuery(userInput: string, user: AuthenticatedUser, lang: 'en' | 'ta' = 'en'): Promise<AssistantQueryResult> {
    const q = (userInput || '').trim().toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString().split('T')[0];

    // Detect language if Tamil script present
    const hasTamil = /[\u0B80-\u0BFF]/.test(userInput);
    const effectiveLang = hasTamil ? 'ta' : lang;

    // Scope check: Institution Admin is strictly restricted to their own institution
    const isInstAdmin = user.role === 'INSTITUTION_ADMIN';
    const instScopeSql = isInstAdmin ? ` AND f.institution_id = '${user.institution_id}'` : '';

    // 1. INTENT: Maturing in X days / இந்த மாதம் maturity ஆகும் FDR-களை காட்டு
    if (
      q.includes('maturing') || q.includes('expire') || q.includes('expiry') ||
      q.includes('maturity ஆகும்') || q.includes('முதிர்வு') || q.includes('காலாவதி')
    ) {
      const days = q.includes('60') ? 60 : q.includes('90') ? 90 : 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureIso = futureDate.toISOString().split('T')[0];

      const records = await query<any>(
        `SELECT f.id, f.fdr_number, f.amount, f.maturity_date, f.bank_name, i.name as institution_name
         FROM fdr_instruments f
         JOIN institutions i ON f.institution_id = i.id
         WHERE f.is_archived = 0 AND f.maturity_date BETWEEN ? AND ? ${instScopeSql}
         ORDER BY f.maturity_date ASC`,
        [nowIso, futureIso]
      );

      const links = records.map(r => ({
        fdrId: r.id,
        fdrNumber: r.fdr_number,
        institutionName: r.institution_name,
        label: `${r.fdr_number} (₹${r.amount.toLocaleString('en-IN')}) - Matures ${r.maturity_date}`
      }));

      const enText = `Found ${records.length} FDR instrument(s) maturing within the next ${days} days (before ${futureIso}).`;
      const taText = `அடுத்த ${days} நாட்களில் முதிர்வு அடையும் ${records.length} FDR பத்திரங்கள் கண்டறியப்பட்டுள்ளன (தேதி: ${futureIso} வரை).`;

      return {
        query: userInput,
        language: effectiveLang,
        detectedIntent: 'UPCOMING_MATURITY_SEARCH',
        answerText: effectiveLang === 'ta' ? taText : enText,
        answerTamil: taText,
        caseLinks: links,
        suggestedFollowUps: effectiveLang === 'ta'
          ? ['Pending verification உள்ள FDR-களை காட்டு', 'High risk FDR-கள் எவை?']
          : ['Show cases with pending verification', 'Which FDRs have high risk scores?']
      };
    }

    // 2. INTENT: Pending Verification / சரிபார்ப்பு நிலுவை
    if (
      q.includes('pending verification') || q.includes('unverified') ||
      q.includes('சரிபார்ப்பு') || q.includes('verification pending')
    ) {
      const records = await query<any>(
        `SELECT f.id, f.fdr_number, f.amount, f.bank_name, i.name as institution_name
         FROM fdr_instruments f
         JOIN institutions i ON f.institution_id = i.id
         WHERE f.is_archived = 0 AND (f.current_status IN ('SUBMITTED', 'PENDING_VERIFICATION') OR f.verification_status = 'PENDING') ${instScopeSql}
         LIMIT 10`
      );

      const links = records.map(r => ({
        fdrId: r.id,
        fdrNumber: r.fdr_number,
        institutionName: r.institution_name,
        label: `${r.fdr_number} (${r.bank_name}) - ${r.institution_name}`
      }));

      const enText = `There are currently ${records.length} case(s) awaiting bank verification or initial regulatory scrutiny.`;
      const taText = `வங்கி சரிபார்ப்பு அல்லது ஆரம்ப பரிசீலனைக்காக ${records.length} வழக்குகள் தற்போது நிலுவையில் உள்ளன.`;

      return {
        query: userInput,
        language: effectiveLang,
        detectedIntent: 'PENDING_VERIFICATION_LIST',
        answerText: effectiveLang === 'ta' ? taText : enText,
        answerTamil: taText,
        caseLinks: links,
        suggestedFollowUps: effectiveLang === 'ta'
          ? ['என்னுடைய pending cases என்ன?', 'Renewal pending உள்ள நிறுவனங்கள்']
          : ['What are my pending tasks?', 'Show renewal requests pending review']
      };
    }

    // 3. INTENT: Why High Risk / ஏன் high risk
    if (
      q.includes('why high risk') || q.includes('risk score') ||
      q.includes('ஏன் high risk') || q.includes('அபாய அளவு') || q.includes('ரிஸ்க்')
    ) {
      // Find top high risk record
      const highRisk = await queryOne<any>(
        `SELECT f.id, f.fdr_number, f.risk_score, f.risk_level, i.name as institution_name, ra.factors
         FROM fdr_instruments f
         JOIN institutions i ON f.institution_id = i.id
         LEFT JOIN risk_assessments ra ON f.id = ra.fdr_id
         WHERE f.is_archived = 0 AND f.risk_score >= 60 ${instScopeSql}
         ORDER BY f.risk_score DESC
         LIMIT 1`
      );

      if (!highRisk) {
        return {
          query: userInput,
          language: effectiveLang,
          detectedIntent: 'EXPLAIN_RISK_FACTORS',
          answerText: effectiveLang === 'ta'
            ? 'தற்போது உங்கள் அதிகார வரம்பில் உயர் அபாய (High Risk) FDR-கள் ஏதும் இல்லை.'
            : 'No high-risk FDR instruments found within your authorized scope.',
          caseLinks: [],
          suggestedFollowUps: ['Show all active FDRs']
        };
      }

      let factorsList = 'Unresolved discrepancies and pending verification findings.';
      if (highRisk.factors) {
        try {
          const parsed = JSON.parse(highRisk.factors);
          factorsList = parsed.map((f: any) => `• ${f.name} (+${f.points} pts): ${f.evidence}`).join('\n');
        } catch (_) {}
      }

      const enText = `FDR ${highRisk.fdr_number} (${highRisk.institution_name}) has an elevated Risk Score of ${highRisk.risk_score}/100 (${highRisk.risk_level}).\n\nContributing Factors:\n${factorsList}`;
      const taText = `FDR ${highRisk.fdr_number} (${highRisk.institution_name}) அதிக அபாய மதிப்பீட்டை (${highRisk.risk_score}/100 - ${highRisk.risk_level}) பெற்றுள்ளது.\n\nகாரணங்கள்:\n${factorsList}`;

      return {
        query: userInput,
        language: effectiveLang,
        detectedIntent: 'EXPLAIN_RISK_FACTORS',
        answerText: effectiveLang === 'ta' ? taText : enText,
        answerTamil: taText,
        caseLinks: [{
          fdrId: highRisk.id,
          fdrNumber: highRisk.fdr_number,
          institutionName: highRisk.institution_name,
          label: `Open Case Evidence: ${highRisk.fdr_number} (Risk: ${highRisk.risk_score})`
        }],
        suggestedFollowUps: effectiveLang === 'ta'
          ? ['இந்த FDR-க்கு renewal pending இருக்கா?', 'Maturity ஆகும் FDR-கள்']
          : ['Open full decision evidence for this FDR', 'Show overdue cases']
      };
    }

    // 4. INTENT: My Pending Cases / என்னுடைய pending cases என்ன?
    if (
      q.includes('my pending') || q.includes('assigned to me') || q.includes('worklist') ||
      q.includes('என்னுடைய pending') || q.includes('எனக்கு ஒதுக்கப்பட்ட')
    ) {
      const records = await query<any>(
        `SELECT f.id, f.fdr_number, f.amount, f.current_status, i.name as institution_name
         FROM fdr_instruments f
         JOIN institutions i ON f.institution_id = i.id
         WHERE f.is_archived = 0 ${user.role === 'REGULATION_OFFICER' ? `AND f.assigned_officer_id = '${user.id}'` : instScopeSql}
         AND f.current_status NOT IN ('RELEASED', 'REJECTED')
         LIMIT 8`
      );

      const links = records.map(r => ({
        fdrId: r.id,
        fdrNumber: r.fdr_number,
        institutionName: r.institution_name,
        label: `${r.fdr_number} - Status: ${r.current_status} (${r.institution_name})`
      }));

      const enText = `You currently have ${records.length} active case(s) requiring your attention in the workbench.`;
      const taText = `உங்கள் பணிப்பட்டியலில் தற்போது ${records.length} வழக்குகள் உங்கள் கவனத்திற்காக நிலுவையில் உள்ளன.`;

      return {
        query: userInput,
        language: effectiveLang,
        detectedIntent: 'USER_WORKLIST',
        answerText: effectiveLang === 'ta' ? taText : enText,
        answerTamil: taText,
        caseLinks: links,
        suggestedFollowUps: effectiveLang === 'ta'
          ? ['அடுத்த 30 நாட்களில் முதிர்வு ஆகும் FDR-கள்', 'High risk வழக்குகள்']
          : ['Show cases maturing in 30 days', 'Show duplicate alerts']
      };
    }

    // 5. INTENT: Renewal Pending / புதுப்பித்தல் நிலுவை
    if (
      q.includes('renewal') || q.includes('replacement') ||
      q.includes('renewal pending') || q.includes('புதுப்பித்தல்')
    ) {
      const records = await query<any>(
        `SELECT r.id as renewal_id, f.id as fdr_id, f.fdr_number, i.name as institution_name, r.status, r.readiness_status
         FROM renewal_requests r
         JOIN fdr_instruments f ON r.original_fdr_id = f.id
         JOIN institutions i ON r.institution_id = i.id
         WHERE r.status = 'PENDING_REVIEW' ${instScopeSql}
         LIMIT 8`
      );

      const links = records.map(r => ({
        fdrId: r.fdr_id,
        fdrNumber: r.fdr_number,
        institutionName: r.institution_name,
        label: `Renewal: ${r.fdr_number} - Readiness: ${r.readiness_status} (${r.institution_name})`
      }));

      const enText = `There are ${records.length} renewal/replacement request(s) currently awaiting scrutiny decision.`;
      const taText = `${records.length} FDR புதுப்பித்தல் கோரிக்கைகள் தற்போது பரிசீலனை நிலுவையில் உள்ளன.`;

      return {
        query: userInput,
        language: effectiveLang,
        detectedIntent: 'RENEWAL_STATUS_QUERY',
        answerText: effectiveLang === 'ta' ? taText : enText,
        answerTamil: taText,
        caseLinks: links,
        suggestedFollowUps: effectiveLang === 'ta'
          ? ['Pending verification உள்ள FDR-கள்', '30 நாட்களில் முதிர்வு அடையும் FDR-கள்']
          : ['Show renewal readiness checklist', 'View Officer Workbench']
      };
    }

    // Fallback general guidance
    const enFallback = `I parsed your inquiry: "${userInput}". I can assist you with real-time repository queries in English and Tamil. Try asking:
• "Show FDRs maturing in the next 30 days"
• "Which cases have pending verification?"
• "Why does this FDR have a high risk score?"
• "Show my pending worklist items"`;

    const taFallback = `உங்கள் வினா: "${userInput}". தமிழ் மற்றும் ஆங்கிலத்தில் FDR SecureTrack தரவுகளை அறிந்துகொள்ள நான் உதவ முடியும். நீங்கள் கேட்கக்கூடியவை:
• "இந்த மாதம் maturity ஆகும் FDR-களை காட்டு"
• "Pending verification உள்ள வழக்குகள் எவை?"
• "இந்த FDR-க்கு ஏன் high risk வந்திருக்கிறது?"
• "என்னுடைய pending cases என்ன?"`;

    return {
      query: userInput,
      language: effectiveLang,
      detectedIntent: 'GENERAL_ASSISTANCE',
      answerText: effectiveLang === 'ta' ? taFallback : enFallback,
      answerTamil: taFallback,
      caseLinks: [],
      suggestedFollowUps: effectiveLang === 'ta'
        ? ['இந்த மாதம் maturity ஆகும் FDR-களை காட்டு', 'Pending verification உள்ள வழக்குகள்', 'என்னுடைய pending cases என்ன?']
        : ['Show FDRs maturing in the next 30 days', 'Which cases have pending verification?', 'What are my pending tasks?']
    };
  }
}

export const voiceAssistantService = new VoiceAssistantService();
