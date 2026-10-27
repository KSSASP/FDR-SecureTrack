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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please use text input.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Recognition error:', err);
      }
    }
  };

  const speakText = (text: string, lang: 'en' | 'ta') => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (queryToSend?: string) => {
    const query = queryToSend || inputText;
    if (!query || !query.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: query.trim(),
      language: selectedLang,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await apiRequest<{
        answer?: string;
        answerText?: string;
        language: 'en' | 'ta';
        caseLinks?: CaseLink[];
        suggestedFollowUps?: string[];
        isAiGenerated?: boolean;
        modelUsed?: string;
      }>('/assistant/query', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          language: selectedLang,
          history: historyPayload
        })
      });

      const replyText = res.answer || res.answerText || '';
      const assistantMsg: Message = {
        sender: 'assistant',
        text: replyText,
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
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">FDR Case Assistant</h1>
              {geminiStatus?.configured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Gemini Active ({geminiStatus.model})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-[10px] font-medium" title="Configure GEMINI_API_KEY in server/.env to activate Gemini API">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Gemini Ready (Add GEMINI_API_KEY in .env)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Grounded conversational regulatory intelligence with live database cross-checks and RBAC isolation.
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex items-center bg-[#15182D] p-1 rounded-xl border border-white/10 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setSelectedLang('en')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedLang === 'en' ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setSelectedLang('ta')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedLang === 'ta' ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            தமிழ் (Tamil)
          </button>
        </div>
      </div>

      {/* Main Conversation Container */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col h-[640px]">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0B0C15]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-xs leading-relaxed shadow-lg ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-rose-500/80 via-purple-600/90 to-indigo-600 text-white rounded-br-xs'
                    : 'bg-[#121528] text-slate-200 border border-white/5 rounded-bl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 border-b pb-1.5 border-white/10">
                  <span className="font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-rose-300">
                    {m.sender === 'user' ? (
                      <>
                        <User className="w-3 h-3 opacity-80" />
                        <span>Authorized User</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-rose-400" />
                        <span>FDR Regulatory Assistant</span>
                        {m.isAiGenerated && (
                          <span className="ml-1 inline-flex items-center gap-1 text-[9px] bg-rose-500/20 text-rose-200 font-mono px-2 py-0.5 rounded-full border border-rose-500/30 normal-case">
                            <Sparkles className="w-2.5 h-2.5 text-rose-400" />
                            Gemini AI
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">{m.timestamp}</span>
                    {m.sender === 'assistant' && (
                      <button
                        onClick={() => speakText(m.text, m.language)}
                        className="text-slate-400 hover:text-rose-300 transition-colors p-0.5"
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
                  <div className="mt-3.5 pt-2.5 border-t border-white/10 space-y-1.5">
                    <p className="text-[11px] font-semibold text-rose-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified Database Instruments:</span>
                    </p>
                    <div className="space-y-1">
                      {m.caseLinks.map((link, lIdx) => (
                        <button
                          key={lIdx}
                          onClick={() => navigate(`/fdrs/${link.fdrId}`)}
                          className="w-full text-left px-3 py-2 rounded-xl bg-[#181C35] hover:bg-[#202547] border border-white/10 text-rose-200 text-xs flex items-center justify-between transition-colors group"
                        >
                          <span className="truncate font-medium">{link.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-rose-400 ml-2 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
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
                      className="px-3 py-1 rounded-full bg-[#16192E] hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors shadow-sm"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#121528] p-3.5 rounded-xl border border-white/5 shadow-md w-fit">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
              <span>Grounding query with database and querying Gemini AI...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#121528] border-t border-white/10">
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
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : 'bg-[#1A1D33] hover:bg-[#252A47] text-slate-300 border-white/10'
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
              className="flex-1 px-4 py-2.5 text-xs bg-[#15182D] border border-[#2B2F4E] rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder:text-slate-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20 cursor-pointer"
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
