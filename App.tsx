
import React, { useState, useRef, useEffect } from 'react';
import { TutorSession, ChatMessage, ExperienceLevel, VisualizationPreference, DetailPreference } from './types';
import { DSATutorService } from './services/DSATutorService';
import ChatMessageList from './components/ChatMessageList';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import LogoutButton from './components/LogoutButton';
import { loadCases, loadCaseMessages, saveCaseMessage, CaseRecord, CaseMessageRecord } from './services/evidence';
import { useAuth } from './contexts/AuthContext';

interface EvidenceFile {
  id: string;
  caseId: string;
  title: string;
  desc: string;
  difficulty: string;
  lang: string;
  code: string;
}

interface GuestCaseRecord {
  id: string;
  code: string;
  ai_response: string;
  level: string;
  visualization: string;
  detail: string;
  created_at: string;
  messages: ChatMessage[];
}

const GUEST_CASES_KEY = 'dsa_guest_cases';
const GUEST_USAGE_KEY = 'dsa_guest_usage_count';
const GUEST_TRY_LIMIT = 5;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractCaseField = (aiResponse: string, field: string): string => {
  const safeField = escapeRegExp(field);
  const patterns = [
    new RegExp(`^\\s*${safeField}:\\s*(.*)$`, 'im'),
    new RegExp(`^\\s*-\\s*\\*\\*${safeField}:\\*\\*\\s*(.*)$`, 'im'),
    new RegExp(`^\\s*\\*\\*${safeField}:\\*\\*\\s*(.*)$`, 'im'),
  ];

  for (const pattern of patterns) {
    const match = aiResponse.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
};

const mapCaseToEvidenceFile = (record: CaseRecord, index: number): EvidenceFile => {
  const dsaConcept = extractCaseField(record.ai_response, 'DSA Concept');
  const title =
    extractCaseField(record.ai_response, 'Case Title') ||
    (dsaConcept ? `${dsaConcept} Investigation` : `Case #${index + 1}`);
  const description =
    extractCaseField(record.ai_response, 'Risk Summary') ||
    extractCaseField(record.ai_response, 'Status') ||
    record.ai_response.slice(0, 120).replace(/\n/g, ' ').trim() ||
    'Investigation record stored.';
  const language = extractCaseField(record.ai_response, 'Language') || 'Unknown';

  return {
    id: `CASE-${record.id.slice(0, 8).toUpperCase()}`,
    caseId: record.id,
    title,
    desc: description,
    difficulty: record.level,
    lang: language,
    code: record.code,
  };
};

const mapStoredMessageToChat = (record: CaseMessageRecord): ChatMessage => ({
  role: record.role,
  text: record.text,
  isInitial: record.is_initial,
});

const readGuestCases = (): GuestCaseRecord[] => {
  try {
    const raw = localStorage.getItem(GUEST_CASES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestCaseRecord[]) : [];
  } catch (error) {
    console.error('Failed to parse guest cases:', error);
    return [];
  }
};

const writeGuestCases = (cases: GuestCaseRecord[]): void => {
  localStorage.setItem(GUEST_CASES_KEY, JSON.stringify(cases));
};

const saveGuestCase = (guestCase: GuestCaseRecord): void => {
  const existing = readGuestCases().filter((item) => item.id !== guestCase.id);
  writeGuestCases([guestCase, ...existing]);
};

const appendGuestCaseMessages = (caseId: string, newMessages: ChatMessage[]): void => {
  const updated = readGuestCases().map((item) =>
    item.id === caseId ? { ...item, messages: [...item.messages, ...newMessages] } : item
  );

  writeGuestCases(updated);
};

const loadGuestCaseById = (caseId: string): GuestCaseRecord | null => {
  return readGuestCases().find((item) => item.id === caseId) ?? null;
};

const getGuestUsageCount = (): number => {
  const raw = localStorage.getItem(GUEST_USAGE_KEY);
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const createGuestCaseId = (): string => {
  const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `guest-${Date.now()}-${suffix}`;
};

const BootScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const messages = [
    'INITIALIZING KERNEL...',
    'LOADING NEURAL MODULES...',
    'CONNECTING TO FORENSIC DATABASE...',
    'BYPASSING SECURITY PROTOCOLS...',
    'ACCESS GRANTED.',
  ];

  useEffect(() => {
    let delay = 0;
    messages.forEach((msg, index) => {
      delay += Math.random() * 500 + 300;
      setTimeout(() => {
        setLogs((prev) => [...prev, msg]);
        if (index === messages.length - 1) {
          setTimeout(onComplete, 800);
        }
      }, delay);
    });
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col justify-center items-center text-[#00ff00] font-mono p-10">
      <div className="w-full max-w-lg space-y-2">
        {logs.map((log, i) => (
          <div key={i} className="typewriter overflow-hidden whitespace-nowrap border-r-2 border-[#00ff00] animate-pulse">
            <span className="text-[#FFD700] mr-2">root@dsa-sys:~$</span>
            {log}
          </div>
        ))}
      </div>
      <div className="mt-8 text-xs text-gray-500 animate-pulse">PRESSING ANY KEY WILL NOT ACCELERATE PROCESS</div>
    </div>
  );
};

type AuthView = 'login' | 'register';

interface AuthScreenProps {
  view: AuthView;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  canClose?: boolean;
  onClose?: () => void;
  bannerMessage?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  view,
  onSwitchToLogin,
  onSwitchToRegister,
  canClose = false,
  onClose,
  bannerMessage,
}) => {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex items-center justify-center px-6 py-10 sm:px-10 border-b border-[#222] lg:border-b-0 lg:border-r">
          <div className="w-full max-w-md border border-[#333] bg-[#0a0a0a]/95 p-8 shadow-[0_0_35px_rgba(0,0,0,0.65)]">
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mb-4 text-xs uppercase tracking-wider text-gray-400 hover:text-[#FFD700]"
              >
                Back to app
              </button>
            )}

            {bannerMessage && (
              <div className="mb-4 border border-[#FF3B3B] bg-[#2a0d0d] px-3 py-2 text-xs text-red-200 font-mono">
                {bannerMessage}
              </div>
            )}

            <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#FF3B3B] mb-3">Secure Access Required</p>
            <h1 className="text-2xl font-bold text-[#FFD700] tracking-[0.2em] font-mono uppercase mb-2">Cyber Investigation Unit</h1>
            <p className="text-sm text-gray-400 mb-6">Authenticate to keep history in cloud and continue unlimited investigations.</p>

            {view === 'login' ? (
              <LoginForm onSwitchToRegister={onSwitchToRegister} />
            ) : (
              <RegisterForm onSwitchToLogin={onSwitchToLogin} />
            )}
          </div>
        </section>

        <section className="relative hidden overflow-hidden lg:block bg-[#070707]">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,215,0,0.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(255,59,59,0.14),transparent_40%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[420px] w-[420px] rounded-full border border-[#FFD700]/30">
              <div className="absolute inset-8 rounded-full border border-[#FFD700]/20" />
              <div className="absolute inset-16 rounded-full border border-[#FF3B3B]/25" />
              <div className="absolute left-1/2 top-0 h-1/2 w-[1px] -translate-x-1/2 bg-gradient-to-b from-[#FFD700] to-transparent" />
              <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [lastWarnedCount, setLastWarnedCount] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const [activeTab, setActiveTab] = useState('CRIME SCENE');

  const [inputData, setInputData] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Beginner');
  const [visualization, setVisualization] = useState<VisualizationPreference>('Text Only');
  const [detailLevel, setDetailLevel] = useState<DetailPreference>('Short');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);

  const tutorServiceRef = useRef<DSATutorService | null>(null);
  const storageKey = user ? `dsa_case_state_${user.id}` : 'dsa_case_state';
  const guestLocked = !user && guestUsageCount >= GUEST_TRY_LIMIT;
  const guestTriesLeft = Math.max(0, GUEST_TRY_LIMIT - guestUsageCount);

  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setSessionStarted(parsed.sessionStarted);
        setInputData(parsed.inputData);
        setMessages(parsed.messages);
        if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
        if (parsed.visualization) setVisualization(parsed.visualization);
        if (parsed.detailLevel) setDetailLevel(parsed.detailLevel);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        if (parsed.activeCaseId) setActiveCaseId(parsed.activeCaseId);

        if (parsed.sessionStarted) setBooted(true);
      } catch (e) {
        console.error('Failed to recover case file:', e);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        sessionStarted,
        inputData,
        messages,
        experienceLevel,
        visualization,
        detailLevel,
        activeTab,
        activeCaseId,
      })
    );
  }, [sessionStarted, inputData, messages, experienceLevel, visualization, detailLevel, activeTab, activeCaseId, storageKey]);

  useEffect(() => {
    if (!user) {
      setGuestUsageCount(getGuestUsageCount());
      return;
    }

    setGuestUsageCount(0);
    setShowGuestWarning(false);
    setLastWarnedCount(null);
    setShowAuthGate(false);
  }, [user]);

  useEffect(() => {
    if (user || guestLocked) {
      setShowGuestWarning(false);
      return;
    }

    const warnThreshold = Math.max(0, GUEST_TRY_LIMIT - 2);
    if (
      guestUsageCount >= warnThreshold &&
      guestUsageCount < GUEST_TRY_LIMIT &&
      guestUsageCount !== lastWarnedCount
    ) {
      setLastWarnedCount(guestUsageCount);
      setShowGuestWarning(true);
    }
  }, [user, guestLocked, guestUsageCount, lastWarnedCount]);

  const bumpGuestUsage = (): void => {
    if (user) {
      return;
    }

    setGuestUsageCount((current) => {
      const next = current + 1;
      localStorage.setItem(GUEST_USAGE_KEY, String(next));
      return next;
    });
  };

  const refreshEvidenceBoard = async () => {
    setIsEvidenceLoading(true);

    try {
      if (!user) {
        setEvidenceFiles([]);
        return;
      }

      const records = await loadCases();
      setEvidenceFiles(records.map(mapCaseToEvidenceFile));
    } catch (error) {
      console.error('Failed to load evidence records:', error);
      setEvidenceFiles([]);
    } finally {
      setIsEvidenceLoading(false);
    }
  };

  useEffect(() => {
    void refreshEvidenceBoard();
  }, [user]);

  const handleError = (error: any, defaultMsg: string): string => {
    console.error('API Error detected:', error);
    const errorString = JSON.stringify(error || {});
    const errorMessage = (error?.message || error?.error?.message || '').trim();
    const normalized = errorMessage.toLowerCase();

    if (
      errorMessage.includes('429') ||
      normalized.includes('quota') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorString.includes('"code":429') ||
      errorString.includes('RESOURCE_EXHAUSTED')
    ) {
      return 'SYSTEM OVERLOAD (429): Quota exceeded. Check Gemini billing/quota and retry.';
    }

    if (normalized.includes('api key') || normalized.includes('unauthorized') || normalized.includes('permission denied')) {
      return 'AUTH FAILURE: Verify VITE_GEMINI_API_KEY in .env and restart the dev server.';
    }

    if (normalized.includes('model') && (normalized.includes('not found') || normalized.includes('unsupported'))) {
      return 'MODEL ERROR: Set VITE_GEMINI_MODEL=gemini-2.5-flash in .env and restart.';
    }

    if (normalized.includes('no active session')) {
      return 'SESSION ERROR: The previous session failed to initialize. Start a new investigation.';
    }

    if (errorMessage) {
      return `${defaultMsg}\n\nDetails: ${errorMessage}`;
    }

    return defaultMsg;
  };

  const startInvestigation = async () => {
    if (isTyping || !inputData.trim()) return;

    if (guestLocked) {
      setAuthView('login');
      setShowAuthGate(true);
      return;
    }

    setIsTyping(true);
    setSessionStarted(true);
    setMessages([{ role: 'user', text: inputData, isInitial: true }]);

    try {
      if (!tutorServiceRef.current) {
        tutorServiceRef.current = new DSATutorService();
      }

      const session: TutorSession = { input: inputData, level: experienceLevel, visualization, detail: detailLevel };
      const response = await tutorServiceRef.current.startSession(session);
      const modelMessage: ChatMessage = { role: 'model', text: response };

      setMessages((prev) => [...prev, modelMessage]);

      if (user) {
        setActiveCaseId(tutorServiceRef.current.getActiveCaseId());
      } else {
        const guestCaseId = createGuestCaseId();
        setActiveCaseId(guestCaseId);

        saveGuestCase({
          id: guestCaseId,
          code: inputData,
          ai_response: response,
          level: experienceLevel,
          visualization,
          detail: detailLevel,
          created_at: new Date().toISOString(),
          messages: [
            { role: 'user', text: inputData, isInitial: true },
            modelMessage,
          ],
        });

        bumpGuestUsage();
      }

      await refreshEvidenceBoard();
    } catch (error) {
      setActiveCaseId(null);
      tutorServiceRef.current = null;
      setMessages((prev) => [...prev, { role: 'model', text: handleError(error, 'Investigation disrupted. Secure connection failed. Check protocol.') }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    if (guestLocked) {
      setAuthView('login');
      setShowAuthGate(true);
      return;
    }

    const messageText = text || followUpInput;
    if (!messageText.trim() || isTyping) return;

    setFollowUpInput('');
    setMessages((prev) => [...prev, { role: 'user', text: messageText }]);
    setIsTyping(true);

    try {
      if (!tutorServiceRef.current) {
        tutorServiceRef.current = new DSATutorService();
      }

      if (activeCaseId) {
        tutorServiceRef.current.setActiveCaseId(activeCaseId);
      }

      if (!tutorServiceRef.current.hasActiveSession()) {
        if (messages.length > 0) {
          await tutorServiceRef.current.resumeSession(messages);
        } else if (sessionStarted && inputData) {
          await tutorServiceRef.current.startSession({
            input: inputData,
            level: experienceLevel,
            visualization,
            detail: detailLevel,
          });

          setActiveCaseId(tutorServiceRef.current.getActiveCaseId());
        }
      }

      let fullResponse = '';
      await tutorServiceRef.current.sendMessageStream(messageText, (chunk) => {
        fullResponse = chunk;
      });

      const modelMessage: ChatMessage = { role: 'model', text: fullResponse };
      setMessages((prev) => [...prev, modelMessage]);

      if (user) {
        const caseId = tutorServiceRef.current.getActiveCaseId() || activeCaseId;
        if (caseId) {
          try {
            await saveCaseMessage({ case_id: caseId, role: 'user', text: messageText });
            await saveCaseMessage({ case_id: caseId, role: 'model', text: fullResponse });
            setActiveCaseId(caseId);
          } catch (persistError) {
            console.error('Failed to persist follow-up conversation:', persistError);
          }
        }
      } else {
        if (activeCaseId) {
          appendGuestCaseMessages(activeCaseId, [{ role: 'user', text: messageText }, modelMessage]);
        }

        bumpGuestUsage();
        await refreshEvidenceBoard();
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'model', text: handleError(error, 'Uplink severed. Re-establishing...') }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const loadEvidence = async (evidence: EvidenceFile) => {
    if (!user) {
      setAuthView('login');
      setShowAuthGate(true);
      return;
    }

    setActiveTab('CRIME SCENE');
    setIsTyping(true);
    setSessionStarted(true);
    setMessages([]);
    setInputData(evidence.code);
    setActiveCaseId(evidence.caseId);
    tutorServiceRef.current = null;

    try {
      if (user) {
        const storedMessages = await loadCaseMessages(evidence.caseId);
        if (storedMessages.length > 0) {
          setMessages(storedMessages.map(mapStoredMessageToChat));
          setSessionStarted(true);
        } else {
          setSessionStarted(false);
          setMessages([]);
        }
      } else {
        const guestCase = loadGuestCaseById(evidence.caseId);
        if (guestCase && guestCase.messages.length > 0) {
          setMessages(guestCase.messages);
          setSessionStarted(true);
        } else {
          setSessionStarted(false);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to load case conversation:', error);
      setMessages([]);
      setSessionStarted(false);
    } finally {
      setIsTyping(false);
    }
  };

  const reset = () => {
    setSessionStarted(false);
    setMessages([]);
    setInputData('');
    setActiveCaseId(null);
    tutorServiceRef.current = null;
    localStorage.removeItem(storageKey);
    setActiveTab('CRIME SCENE');
  };

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col justify-center items-center text-[#00ff00] font-mono p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-[#FFD700] animate-pulse">Authenticating Secure Channel...</p>
      </div>
    );
  }

  if (showAuthGate && !user) {
    return (
      <AuthScreen
        view={authView}
        onSwitchToLogin={() => setAuthView('login')}
        onSwitchToRegister={() => setAuthView('register')}
        canClose={!guestLocked}
        onClose={() => setShowAuthGate(false)}
        bannerMessage={guestLocked ? 'Guest trial limit reached. Sign in to continue this investigation.' : undefined}
      />
    );
  }

  if (!booted) return <BootScreen onComplete={() => setBooted(true)} />;
  const timelineItems = [
    {
      title: 'Arrays & Hashing',
      alias: 'FINGERPRINT ANALYSIS',
      status: 'SOLVED',
      desc: 'Identify duplicates and map suspect relations.',
      color: 'text-green-500',
      borderClass: 'border-green-500',
      hoverClass: 'hover:border-green-500',
    },
    {
      title: 'Two Pointers',
      alias: 'TRAJECTORY TRACKING',
      status: 'IN PROGRESS',
      desc: 'Track movement from multiple angles simultaneously.',
      color: 'text-[#FFD700]',
      borderClass: 'border-[#FFD700]',
      hoverClass: 'hover:border-[#FFD700]',
    },
    {
      title: 'Sliding Window',
      alias: 'SURVEILLANCE FRAME',
      status: 'PENDING',
      desc: 'Analyze data streams in real-time segments.',
      color: 'text-gray-500',
      borderClass: 'border-gray-700',
      hoverClass: 'hover:border-gray-500',
    },
    {
      title: 'Binary Search',
      alias: 'SUSPECT ELIMINATION',
      status: 'PENDING',
      desc: 'Divide and conquer suspect lists efficiently.',
      color: 'text-gray-500',
      borderClass: 'border-gray-700',
      hoverClass: 'hover:border-gray-500',
    },
    {
      title: 'Graphs',
      alias: 'NETWORK MAPPING',
      status: 'LOCKED',
      desc: 'Uncover hidden connections in complex networks.',
      color: 'text-red-900',
      borderClass: 'border-red-900',
      hoverClass: '',
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#e0e0e0] overflow-hidden font-sans selection:bg-[#FF3B3B] selection:text-white crt relative">
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {showGuestWarning && !user && !guestLocked && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md border border-[#333] bg-[#0a0a0a]/95 p-6 shadow-[0_0_35px_rgba(0,0,0,0.65)]">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#FF3B3B] mb-3">Guest Limit Warning</p>
            <h2 className="text-lg font-bold text-[#FFD700] tracking-[0.2em] font-mono uppercase mb-2">Free Tries Ending</h2>
            <p className="text-sm text-gray-300 mb-5">
              You have <span className="text-[#FFD700] font-bold">{guestTriesLeft}</span> free AI tries left. Create an
              account to keep private history and continue unlimited investigations.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => setShowGuestWarning(false)}
                className="rounded-sm border border-[#333] px-4 py-2 text-xs font-mono uppercase tracking-wider text-gray-300 hover:border-[#FFD700] hover:text-[#FFD700]"
              >
                Continue as guest
              </button>
              <button
                onClick={() => {
                  setAuthView('login');
                  setShowAuthGate(true);
                  setShowGuestWarning(false);
                }}
                className="rounded-sm border border-[#FFD700] px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#FFD700] hover:bg-[#FFD700]/10"
              >
                Login / Sign up
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#333] shrink-0 z-40 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50"></div>

        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center bg-[#1a1a1a] rounded-sm border border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] overflow-hidden">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,215,0,0.5)_360deg)] animate-[spin_4s_linear_infinite] rounded-full opacity-50"></div>
            <div className="absolute inset-0 rounded-full border border-[#FFD700] opacity-30 scale-75"></div>
            <span className="text-2xl relative z-10">??????</span>
          </div>
          <div>
            <h1 className="font-bold text-2xl text-[#FFD700] tracking-[0.2em] font-mono uppercase">CASE #DSA</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-[#FF3B3B] animate-pulse"></div>
                <div className="w-1 h-2 bg-[#FF3B3B] animate-pulse delay-75"></div>
                <div className="w-1 h-4 bg-[#FF3B3B] animate-pulse delay-150"></div>
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">LIVE FEED // SECURE</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {sessionStarted && (
            <button onClick={reset} className="group relative px-6 py-2 bg-transparent overflow-hidden rounded-sm">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="absolute inset-0 border border-[#FFD700] opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative text-xs font-bold text-[#FFD700] uppercase tracking-wider font-mono">New Case</span>
            </button>
          )}

          <div className="hidden md:flex flex-col items-end text-[10px] font-mono text-gray-600 max-w-[320px]">
            <span className="text-gray-400 truncate">
              USER: <span className="text-[#FFD700]">{user?.email ?? 'guest@agent'}</span>
            </span>
            {!user && (
              <span>
                GUEST TRIES LEFT:{' '}
                <span className={guestLocked ? 'text-[#FF3B3B]' : 'text-[#FFD700]'}>{guestTriesLeft}</span>
              </span>
            )}
            <span>
              CPU: <span className="text-green-500">12%</span>
            </span>
            <span>
              MEM: <span className="text-green-500">4.2GB</span>
            </span>
          </div>

          {user ? (
            <LogoutButton className="rounded-sm border border-[#333] px-4 py-2 text-xs font-mono uppercase tracking-wider text-gray-200 hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-50">
              Logout
            </LogoutButton>
          ) : (
            <button
              onClick={() => {
                setAuthView('login');
                setShowAuthGate(true);
              }}
              className="rounded-sm border border-[#333] px-4 py-2 text-xs font-mono uppercase tracking-wider text-gray-200 hover:border-[#FFD700] hover:text-[#FFD700]"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative z-10 scan-line">
        {!sessionStarted ? (
          <div className="flex-1 overflow-y-auto relative bg-[#0e0e0e]/80">
            <div className="sticky top-0 z-20 w-full h-6 bg-[#FFD700] text-black font-black font-mono text-xs flex items-center overflow-hidden border-b-2 border-black opacity-80">
              <div className="animate-[marquee_20s_linear_infinite] whitespace-nowrap">
                CRIME SCENE DO NOT CROSS // EVIDENCE DETECTED // AUTHORIZED PERSONNEL ONLY // CRIME SCENE DO NOT CROSS // EVIDENCE DETECTED // AUTHORIZED PERSONNEL ONLY //
              </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8 relative">
              {!user && (
                <div className={`mb-6 border px-4 py-3 text-xs font-mono ${guestLocked ? 'border-[#FF3B3B] bg-[#2a0d0d] text-red-200' : 'border-[#333] bg-[#141414] text-gray-300'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      {guestLocked
                        ? 'Guest trial limit reached. Sign in to continue and keep cloud history.'
                        : `Guest mode active. You have ${guestTriesLeft} free AI tries left before login is required.`}
                    </span>
                    <button
                      onClick={() => {
                        setAuthView('login');
                        setShowAuthGate(true);
                      }}
                      className="border border-[#FFD700] px-3 py-1 uppercase tracking-wider text-[#FFD700] hover:bg-[#FFD700]/10"
                    >
                      Login / Sign up
                    </button>
                  </div>
                </div>
              )}

              <div className="flex border-b border-[#333] mb-8 overflow-x-auto gap-4">
                {['CRIME SCENE', 'EVIDENCE', 'TIMELINE'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 font-mono text-sm font-bold tracking-widest cursor-pointer transition-all border-b-2 whitespace-nowrap relative group ${
                      activeTab === tab
                        ? 'text-[#FFD700] border-[#FFD700] bg-[#1a1a1a]'
                        : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-[#1a1a1a]/50'
                    }`}
                  >
                    {activeTab === tab && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF3B3B] rounded-full animate-ping"></span>}
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'CRIME SCENE' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#333] pb-2">
                      <h2 className="text-[#e0e0e0] font-bold text-xl tracking-wider flex items-center gap-3">
                        <span className="text-[#FFD700] text-2xl animate-pulse">??</span> SUSPECT PROFILE
                      </h2>
                      <span className="text-xs text-[#FF3B3B] font-mono border border-[#FF3B3B] px-2 py-0.5 rounded-sm animate-pulse">STATUS: AT LARGE</span>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700] via-[#FF3B3B] to-[#FFD700] rounded-sm opacity-20 group-hover:opacity-40 transition duration-1000 blur-md animate-pulse"></div>
                      <div className="relative bg-[#0f0f0f] border border-[#333] p-1 shadow-2xl">
                        <div className="absolute top-0 left-0 bg-[#333] text-[9px] text-gray-400 px-2 py-0.5 font-mono">input_stream.cpp</div>
                        <textarea
                          value={inputData}
                          onChange={(e) => setInputData(e.target.value)}
                          placeholder="// PASTE SUSPECT CODE HERE FOR FORENSIC ANALYSIS..."
                          className="w-full h-96 p-8 bg-[#0a0a0a] text-[#00ff00] font-mono text-sm outline-none resize-none placeholder-gray-700 leading-relaxed border-none focus:ring-0 custom-scrollbar"
                          spellCheck="false"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-[#333] pb-2">
                      <h2 className="text-[#e0e0e0] font-bold text-xl tracking-wider flex items-center gap-2">
                        <span className="text-[#FFD700]">??</span> MODUS OPERANDI
                      </h2>
                    </div>

                    <div className="bg-[#141414]/80 backdrop-blur border border-[#333] p-6 space-y-6 relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                      <div className="space-y-3 relative z-10">
                        <label className="text-[10px] uppercase tracking-widest text-[#FF3B3B] font-bold">Expertise Level</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Beginner', 'Intermediate'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setExperienceLevel(opt as ExperienceLevel)}
                              className={`py-2 text-xs font-mono border ${
                                experienceLevel === opt ? 'border-[#FFD700] text-[#FFD700]' : 'border-[#333] text-gray-400'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 relative z-10">
                        <label className="text-[10px] uppercase tracking-widest text-[#FF3B3B] font-bold">Visualization</label>
                        <select
                          value={visualization}
                          onChange={(e) => setVisualization(e.target.value as VisualizationPreference)}
                          className="w-full bg-[#0a0a0a] border border-[#333] text-gray-300 text-xs font-mono p-3 outline-none focus:border-[#FFD700]"
                        >
                          <option value="Text Only">TEXT DOSSIER ONLY</option>
                          <option value="Show Visualization">EVIDENCE BOARD (ASCII)</option>
                        </select>
                      </div>

                      <div className="space-y-3 relative z-10">
                        <label className="text-[10px] uppercase tracking-widest text-[#FF3B3B] font-bold">Detail Depth</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Short', 'Long'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setDetailLevel(opt as DetailPreference)}
                              className={`py-3 text-[10px] font-mono uppercase tracking-wider border ${
                                detailLevel === opt ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'text-gray-500 border-[#333]'
                              }`}
                            >
                              {opt === 'Short' ? 'Brief' : 'Full Rpt'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={startInvestigation}
                        disabled={!inputData.trim() || isTyping || guestLocked}
                        className="w-full py-5 bg-[#FF3B3B] text-white font-bold tracking-[0.2em] uppercase text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        INITIATE SCAN 
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'EVIDENCE' && (
                <div className="space-y-4">
                  {!user && (
                    <div className="bg-[#141414] border border-[#333] p-6 text-sm font-mono text-gray-400">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Login required to access evidence history.</span>
                        <button
                          onClick={() => {
                            setAuthView('login');
                            setShowAuthGate(true);
                          }}
                          className="border border-[#FFD700] px-3 py-1 uppercase tracking-wider text-[#FFD700] hover:bg-[#FFD700]/10"
                        >
                          Login / Sign up
                        </button>
                      </div>
                    </div>
                  )}
                  {user && isEvidenceLoading && (
                    <div className="bg-[#141414] border border-[#333] p-6 text-sm font-mono text-gray-400">
                      Loading evidence records...
                    </div>
                  )}

                  {user && !isEvidenceLoading && evidenceFiles.length === 0 && (
                    <div className="bg-[#141414] border border-[#333] p-6 text-sm font-mono text-gray-400">
                      No stored cases found yet. Start an investigation to generate your first evidence record.
                    </div>
                  )}

                  {user && !isEvidenceLoading && evidenceFiles.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {evidenceFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => void loadEvidence(file)}
                          className="bg-[#141414] border border-[#333] p-6 hover:border-[#FFD700] hover:bg-[#1a1a1a] transition-all cursor-pointer group relative overflow-hidden transform hover:-translate-y-1 hover:shadow-[0_5px_20px_rgba(0,0,0,0.5)]"
                        >
                          <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-mono text-[#FFD700]">??</span>
                          </div>
                          <div className="mb-4">
                            <span className="text-[10px] text-[#FF3B3B] border border-[#FF3B3B] px-2 py-0.5 uppercase tracking-widest">{file.id}</span>
                          </div>
                          <h3 className="text-[#e0e0e0] font-bold text-lg font-mono mb-2 group-hover:text-[#FFD700] transition-colors">{file.title}</h3>
                          <p className="text-xs text-gray-500 mb-4 line-clamp-2">{file.desc}</p>

                          <div className="flex justify-between items-center text-[10px] font-mono uppercase text-gray-600 border-t border-[#333] pt-3 group-hover:text-gray-400">
                            <span>Diff: {file.difficulty}</span>
                            <span>Lang: {file.lang}</span>
                          </div>

                          <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#FFD700] group-hover:w-full transition-all duration-700 ease-out"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'TIMELINE' && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 mb-8 border-b border-[#333] pb-4">
                    <span className="text-3xl">??</span>
                    <div>
                      <h2 className="text-xl font-bold text-[#FFD700] tracking-widest uppercase">Investigation Roadmap</h2>
                      <p className="text-xs text-gray-500 font-mono">MASTER THE ALGORITHMS TO CLOSE ALL CASES</p>
                    </div>
                  </div>

                  <div className="relative border-l-2 border-[#333] ml-4 md:ml-10 space-y-12 py-4">
                    {timelineItems.map((item, idx) => (
                      <div key={idx} className="relative pl-8 md:pl-12 group">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#050505] border-2 ${item.status === 'SOLVED' ? 'border-green-500 bg-green-500/20' : item.status === 'IN PROGRESS' ? 'border-[#FFD700] animate-pulse' : 'border-[#333]'}`}></div>

                        <div
                          className={`bg-[#141414] border p-6 rounded-sm relative overflow-hidden transition-all duration-300 hover:translate-x-2 ${
                            item.status === 'LOCKED' ? 'border-[#333] opacity-50' : `${item.borderClass} ${item.hoverClass}`
                          }`}
                        >
                          {item.status === 'IN PROGRESS' && <div className="absolute top-0 right-0 px-2 py-1 bg-[#FFD700] text-black text-[10px] font-bold font-mono">ACTIVE CASE</div>}
                          {item.status === 'SOLVED' && <div className="absolute top-0 right-0 px-2 py-1 bg-green-900 text-green-300 text-[10px] font-bold font-mono">CASE CLOSED</div>}

                          <h3 className={`text-lg font-bold font-mono uppercase mb-1 ${item.status === 'LOCKED' ? 'text-gray-700' : 'text-[#e0e0e0]'}`}>{item.title}</h3>
                          <div className="text-[10px] text-[#FF3B3B] uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                            <span className="w-1 h-1 bg-[#FF3B3B] rounded-full"></span> {item.alias}
                          </div>
                          <p className="text-sm text-gray-500 font-mono">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative z-20">
            <ChatMessageList messages={messages} isTyping={isTyping} onSuggestionClick={(text) => handleSendMessage(text)} />

            <div className="p-6 bg-[#0a0a0a] border-t border-[#333] z-30">
              {!user && guestLocked && (
                <div className="max-w-6xl mx-auto mb-4 border border-[#FF3B3B] bg-[#2a0d0d] px-4 py-3 text-xs font-mono text-red-200 flex flex-wrap items-center justify-between gap-3">
                  <span>Guest trial limit reached. Login to continue this investigation thread.</span>
                  <button
                    onClick={() => {
                      setAuthView('login');
                      setShowAuthGate(true);
                    }}
                    className="border border-[#FFD700] px-3 py-1 uppercase tracking-wider text-[#FFD700] hover:bg-[#FFD700]/10"
                  >
                    Login / Sign up
                  </button>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="max-w-6xl mx-auto flex gap-4">
                <div className="flex-1 relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FF3B3B] to-[#FFD700] rounded-sm opacity-50 group-hover:opacity-100 transition duration-500 blur-[2px]"></div>
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder="Enter command or query..."
                    className="relative w-full p-4 rounded-sm bg-[#050505] border border-[#333] text-[#e0e0e0] focus:text-white outline-none transition-all text-sm font-mono placeholder-gray-600 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!followUpInput.trim() || isTyping || guestLocked}
                  className="bg-[#FFD700] text-black font-bold px-8 rounded-sm hover:bg-[#ffe033] disabled:bg-[#333] disabled:text-gray-600 transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] uppercase tracking-wider text-sm flex items-center gap-2 group"
                >
                  <span>Transmit</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
