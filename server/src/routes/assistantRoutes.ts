import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { voiceAssistantService } from '../services/voiceAssistantService.js';
import { geminiAssistantService } from '../services/geminiService.js';
import { config } from '../config/env.js';

const router = Router();

/**
 * GET /api/assistant/status
 * Reports Gemini AI status and configuration state without leaking secrets
 */
router.get('/status', authenticateToken, (req: Request, res: Response): void => {
  const isConfigured = geminiAssistantService.isConfigured();
  res.json({
    status: 'ONLINE',
    aiProvider: isConfigured ? 'google_gemini' : 'local_deterministic',
    configured: isConfigured,
    geminiConfigured: isConfigured,
    model: process.env.GEMINI_MODEL || config.geminiModel || 'gemini-2.5-flash',
    supportedLanguages: ['en', 'ta']
  });
});

/**
 * POST /api/assistant/query
 * Secure, authenticated conversational assistant query endpoint with Gemini AI + database grounding
 */
router.post('/query', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query: userQuery, language = 'en', history = [] } = req.body;

    // 1. Input validation
    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      res.status(400).json({ error: 'Query text or voice transcription is required' });
      return;
    }

    if (userQuery.trim().length > 1000) {
      res.status(400).json({ error: 'Query exceeds maximum allowed length of 1000 characters' });
      return;
    }

    const sanitizedQuery = userQuery.trim();
    const effectiveLang: 'en' | 'ta' = language === 'ta' ? 'ta' : 'en';

    // 2. Check if Gemini AI is configured
    if (geminiAssistantService.isConfigured()) {
      try {
        const geminiResult = await geminiAssistantService.processQuery(
          sanitizedQuery,
          req.user!,
          Array.isArray(history) ? history : [],
          effectiveLang
        );

        res.json({
          query: sanitizedQuery,
          language: effectiveLang,
          detectedIntent: geminiResult.detectedIntent,
          answer: geminiResult.answerText,
          answerText: geminiResult.answerText,
          answerTamil: geminiResult.answerTamil,
          caseLinks: geminiResult.caseLinks,
          suggestedFollowUps: geminiResult.suggestedFollowUps,
          isAiGenerated: geminiResult.isAiGenerated,
          configured: geminiResult.configured,
          modelUsed: geminiResult.modelUsed
        });
        return;
      } catch (geminiErr: any) {
        console.warn('Gemini query processing encountered error, falling back to local engine:', geminiErr.message || geminiErr);
        // Fall back gracefully to deterministic rule engine below
      }
    }

    // 3. Fallback to deterministic local engine (or when Gemini key is not configured)
    const localResult = await voiceAssistantService.processQuery(sanitizedQuery, req.user!, effectiveLang);

    // If Gemini is unconfigured and the local intent was generic fallback, append guidance
    let finalAnswer = localResult.answerText;
    let warning: string | undefined = undefined;

    if (!geminiAssistantService.isConfigured()) {
      warning = 'GEMINI_API_KEY_MISSING';
      if (localResult.detectedIntent === 'GENERAL_ASSISTANCE') {
        const notice = effectiveLang === 'ta'
          ? '\n\n💡 குறிப்பு: விரிவான AI பதில்களை இயக்க backend .env கோப்பில் GEMINI_API_KEY ஐ உள்ளிடவும்.'
          : '\n\n💡 Note: To enable extended natural language reasoning across all repository topics, please configure GEMINI_API_KEY in your backend .env file.';
        finalAnswer += notice;
      }
    }

    res.json({
      query: sanitizedQuery,
      language: localResult.language,
      detectedIntent: localResult.detectedIntent,
      answer: finalAnswer,
      answerText: finalAnswer,
      answerTamil: localResult.answerTamil,
      caseLinks: localResult.caseLinks,
      suggestedFollowUps: localResult.suggestedFollowUps,
      isAiGenerated: false,
      configured: geminiAssistantService.isConfigured(),
      warning
    });
  } catch (err: any) {
    console.error('Assistant route error:', err);
    res.status(500).json({ error: 'Failed to process assistant query. Please try again.' });
  }
});

export default router;
