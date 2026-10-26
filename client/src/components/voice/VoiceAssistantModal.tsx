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

  const handleSendQuery = async (queryToSend?: string) => {
    const text = (queryToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text,
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
      }>('/assistant/query', {
        method: 'POST',
        body: JSON.stringify({
          query: text,
          language: selectedLang,
          history: historyTurns
        })
      });

      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.answerText,
        language: res.language,
        caseLinks: res.caseLinks || [],
        suggestedFollowUps: res.suggestedFollowUps || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Automatically speak response if desired
      if (isSpeaking) {
        speakText(res.answerText, res.language);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error retrieving repository data: ${err.message || 'Service unavailable'}`,
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[650px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                FDR Voice Assistant
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-200 border border-blue-700">
                  Tamil & English
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">Deterministic Database-Backed Repository Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setSelectedLang('en')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  selectedLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLang('ta')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  selectedLang === 'ta' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-blue-700 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 border-b pb-1 border-slate-100/30">
                  <span className="font-semibold text-[10px] uppercase opacity-75">
                    {m.sender === 'user' ? 'You' : 'SecureTrack Intelligence'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] opacity-75">{m.timestamp}</span>
                    {m.sender === 'assistant' && (
                      <button
                        onClick={() => speakText(m.text, m.language)}
                        className="text-slate-400 hover:text-blue-600"
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
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600">Matching Repository Cases:</p>
                    <div className="space-y-1">
                      {m.caseLinks.map((link, lIdx) => (
                        <button
                          key={lIdx}
                          onClick={() => {
                            onClose();
                            navigate(`/fdrs/${link.fdrId}`);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs flex items-center justify-between transition-colors group"
                        >
                          <span className="truncate font-medium">{link.label}</span>
                          <ExternalLink className="w-3 h-3 text-blue-600 ml-2 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-up suggestions */}
              {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && idx === messages.length - 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                  {m.suggestedFollowUps.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => handleSendQuery(chip)}
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
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200 w-fit">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
              <span>Querying verified database repository...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Query Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
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
              className={`p-2.5 rounded-lg border transition-all ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
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
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>Powered by Natural Language Intent Layer</span>
            <span>Microphone Web Speech API • Speech Synthesis Audio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
