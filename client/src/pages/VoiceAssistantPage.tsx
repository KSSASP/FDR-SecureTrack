import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Sparkles,
  ExternalLink,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface CaseLink {
  fdrId: string;
  fdrNumber: string;
  institutionName: string;
  label: string;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  language: 'en' | 'ta';
  caseLinks?: CaseLink[];
  suggestedFollowUps?: string[];
  timestamp: string;
  isAiGenerated?: boolean;
  modelUsed?: string;
}

interface AssistantStatus {
  configured: boolean;
  model: string;
  aiProvider: string;
}

export const VoiceAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<'en' | 'ta'>('en');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<AssistantStatus | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'வணக்கம் / Welcome to FDR SecureTrack Assistant. I am grounded in your authorized repository database and powered by Google Gemini AI. You can ask me about approaching maturities, pending verifications, explainable risk scoring, duplicate collisions, renewal workflows, release requests, and audit history in English or தமிழ்.',
      language: 'en',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'Show FDRs maturing in the next 30 days',
        'Which cases have pending verification?',
        'Why does this FDR have a high risk score?',
        'Explain the duplicate collision on FDR-DUP-GLOBAL-777',
        'இந்த மாதம் maturity ஆகும் FDR-களை காட்டு'
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch Assistant & Gemini Configuration Status
  useEffect(() => {
    apiRequest<{ geminiConfigured: boolean; model: string; aiProvider: string }>('/assistant/status')
      .then(res => {
        setGeminiStatus({
          configured: res.geminiConfigured,
          model: res.model || 'gemini-2.5-flash',
          aiProvider: res.aiProvider
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLang === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [selectedLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please type your query in the input box.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = selectedLang === 'ta' ? 'ta-IN' : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string, lang: 'en' | 'ta') => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: query,
      language: selectedLang,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Format previous messages for conversation continuity
    const historyTurns = messages
      .filter(m => m.text)
      .slice(-6)
      .map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text
      }));

    try {
      const res = await apiRequest<{
        answerText: string;
        language: 'en' | 'ta';
        caseLinks: CaseLink[];
        suggestedFollowUps: string[];
        isAiGenerated?: boolean;
        modelUsed?: string;
        warning?: string;
      }>('/assistant/query', {
        method: 'POST',
        body: JSON.stringify({
          query,
          language: selectedLang,
          history: historyTurns
        })
      });

      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.answerText,
        language: res.language || selectedLang,
        caseLinks: res.caseLinks || [],
        suggestedFollowUps: res.suggestedFollowUps || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: res.isAiGenerated,
        modelUsed: res.modelUsed
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Communication notice: ${err.message || 'Unable to execute query at this time. Please try again.'}`,
          language: selectedLang,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-900/20">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">FDR Case Assistant</h1>
              {geminiStatus?.configured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Google Gemini Active ({geminiStatus.model})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-medium" title="Configure GEMINI_API_KEY in server/.env to activate Gemini API">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Gemini Ready (Add GEMINI_API_KEY in .env)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Grounded conversational regulatory intelligence with live database cross-checks and RBAC isolation.
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setSelectedLang('en')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              selectedLang === 'en' ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setSelectedLang('ta')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              selectedLang === 'ta' ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            தமிழ் (Tamil)
          </button>
        </div>
      </div>

      {/* Main Conversation Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[620px]">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-blue-700 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1.5 border-b pb-1.5 border-slate-100/40">
                  <span className="font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    {m.sender === 'user' ? (
                      <>
                        <User className="w-3 h-3 opacity-80" />
                        <span>Authorized User</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-blue-600" />
                        <span>FDR Regulatory Assistant</span>
                        {m.isAiGenerated && (
                          <span className="ml-1 inline-flex items-center gap-1 text-[9px] bg-blue-50 text-blue-700 font-mono px-1.5 py-0.2 rounded border border-blue-200 normal-case">
                            <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                            Gemini AI
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-75 font-mono">{m.timestamp}</span>
                    {m.sender === 'assistant' && (
                      <button
                        onClick={() => speakText(m.text, m.language)}
                        className="text-slate-400 hover:text-blue-600 p-0.5"
                        title="Read Aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="whitespace-pre-line text-xs font-normal">
                  {m.text}
                </div>

                {/* Clickable Verified Database Case Links */}
                {m.caseLinks && m.caseLinks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Database Instruments:</span>
                    </p>
                    <div className="space-y-1">
                      {m.caseLinks.map((link, lIdx) => (
                        <button
                          key={lIdx}
                          onClick={() => navigate(`/fdrs/${link.fdrId}`)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs flex items-center justify-between transition-colors group"
                        >
                          <span className="truncate font-medium">{link.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600 ml-2 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Follow-Ups */}
              {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && idx === messages.length - 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[85%]">
                  {m.suggestedFollowUps.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => handleSend(chip)}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-[11px] text-slate-700 hover:text-blue-700 transition-colors shadow-2xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-xs w-fit">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></div>
              <span>Grounding query with database and querying Gemini AI...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={isListening ? 'Stop Speech Recognition' : 'Start Speech Recognition'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={
                selectedLang === 'ta'
                  ? 'தமிழில் அல்லது ஆங்கிலத்தில் கேளுங்கள் (எ.கா. இந்த மாதம் maturity ஆகும் FDR-களை காட்டு)...'
                  : 'Ask about FDRs, maturities, risk factors, duplicates, renewals, or releases...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
