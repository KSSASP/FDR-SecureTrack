import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ExternalLink,
  Languages,
  CheckCircle2,
  Bot
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
}

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<'en' | 'ta'>('en');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'வணக்கம் / Welcome to FDR Voice Assistant. Ask me about approaching maturities, pending verifications, explainable risk factors, or renewals in English or தமிழ்.',
      language: 'en',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'Show FDRs maturing in next 30 days',
        'Which cases have pending verification?',
        'இந்த மாதம் maturity ஆகும் FDR-களை காட்டு',
        'Why does this FDR have a high risk score?'
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Speech Recognition Setup (Web Speech API)
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
        handleSendQuery(transcript);
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
        console.error('Recognition start error:', err);
      }
    }
  };

  // Text-to-Speech Synthesis
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

  const handleSendQuery = async (queryToSend?: string) => {
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to process query at this moment. Please verify server connectivity.',
          language: selectedLang,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121528] rounded-2xl shadow-2xl border border-white/10 w-full max-w-2xl h-[650px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0E1020] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                FDR Case Assistant
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  Google Gemini + Database Grounded
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Deterministic Database-Backed Repository Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center bg-[#15182D] rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setSelectedLang('en')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedLang === 'en' ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLang('ta')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedLang === 'ta' ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B0C15]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-rose-500/90 via-purple-600/90 to-indigo-600 text-white rounded-br-none'
                    : 'bg-[#121528] text-slate-200 border border-white/5 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1.5 border-b pb-1 border-white/10">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-rose-300">
                    {m.sender === 'user' ? 'You' : 'FDR Intelligence'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                    {m.sender === 'assistant' && (
                      <button
                        onClick={() => speakText(m.text, m.language)}
                        className="text-slate-400 hover:text-rose-300 transition-colors"
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

                {/* Clickable Case Links */}
                {m.caseLinks && m.caseLinks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                    <p className="text-[11px] font-semibold text-rose-300">Matching Repository Cases:</p>
                    <div className="space-y-1">
                      {m.caseLinks.map((link, lIdx) => (
                        <button
                          key={lIdx}
                          onClick={() => {
                            onClose();
                            navigate(`/fdrs/${link.fdrId}`);
                          }}
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

              {/* Follow-up suggestions */}
              {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && idx === messages.length - 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[85%]">
                  {m.suggestedFollowUps.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => handleSendQuery(chip)}
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
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#121528] p-3 rounded-xl border border-white/5 w-fit">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
              <span>Querying verified database repository...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Query Input Bar */}
        <div className="p-3 bg-[#121528] border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
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
              title={isListening ? 'Stop Recording' : 'Start Speech Recognition'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={
                selectedLang === 'ta'
                  ? 'தமிழில் அல்லது ஆங்கிலத்தில் கேளுங்கள் (எ.கா. முதிர்வு அடையும் FDR-கள்...)'
                  : 'Ask in English or Tamil (e.g. Show FDRs maturing in next 30 days)...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-xs bg-[#1A1D33] border border-[#2B2F4E] rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder:text-slate-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
            <span>Powered by Natural Language Intent Layer</span>
            <span>Microphone Web Speech API • Speech Synthesis Audio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
