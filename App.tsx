import React, { useState, useRef, useEffect } from 'react';
import { TutorSession, ChatMessage, ExperienceLevel, VisualizationPreference, DetailPreference } from './types';
import { DSATutorService } from './services/gemini';
import ChatMessageList from './components/ChatMessageList';

const EVIDENCE_FILES = [
  {
    id: 'CASE-042',
    title: 'Binary Search Loop',
    desc: 'Suspected infinite loop in search logic. Boundary checks failed.',
    difficulty: 'Beginner',
    lang: 'Python',
    code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`
  },
  {
    id: 'CASE-099',
    title: 'Linked List Cycle',
    desc: 'Pointer tracking anomaly detected. Memory leak potential.',
    difficulty: 'Intermediate',
    lang: 'Python',
    code: `class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

def hasCycle(head):
    if not head or not head.next:
        return False
    slow = head
    fast = head.next
    while slow != fast:
        if not fast or not fast.next:
            return False
        slow = slow.next
        fast = fast.next.next
    return True`
  },
  {
     id: 'CASE-108',
     title: 'Merge Sort Chaos',
     desc: 'Recursion depth overflow imminent. Sorting stability compromised.',
     difficulty: 'Advanced',
     lang: 'C++',
     code: `void mergeSort(int arr[], int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSort(arr, l, m);
        mergeSort(arr, m + 1, r);
        merge(arr, l, m, r);
    }
}`
  }
];

const BootScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const messages = [
    "INITIALIZING KERNEL...",
    "LOADING NEURAL MODULES...",
    "CONNECTING TO FORENSIC DATABASE...",
    "BYPASSING SECURITY PROTOCOLS...",
    "ACCESS GRANTED."
  ];

  useEffect(() => {
    let delay = 0;
    messages.forEach((msg, index) => {
      delay += Math.random() * 500 + 300;
      setTimeout(() => {
        setLogs(prev => [...prev, msg]);
        if (index === messages.length - 1) {
          setTimeout(onComplete, 800);
        }
      }, delay);
    });
  }, []);

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

const App: React.FC = () => {
  const [booted, setBooted] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('CRIME SCENE');

  // Input State
  const [inputData, setInputData] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Beginner');
  const [visualization, setVisualization] = useState<VisualizationPreference>('Text Only');
  const [detailLevel, setDetailLevel] = useState<DetailPreference>('Short');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  
  const tutorServiceRef = useRef<DSATutorService | null>(null);

  // Load state from LocalStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('dsa_case_state');
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
        
        // Skip boot if restoring session
        if (parsed.sessionStarted) setBooted(true);
      } catch (e) {
        console.error("Failed to recover case file:", e);
      }
    }
  }, []);

  // Save state to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('dsa_case_state', JSON.stringify({
      sessionStarted,
      inputData,
      messages,
      experienceLevel,
      visualization,
      detailLevel,
      activeTab
    }));
  }, [sessionStarted, inputData, messages, experienceLevel, visualization, detailLevel, activeTab]);

  const handleError = (error: any, defaultMsg: string): string => {
    console.error("API Error detected:", error);
    const errorString = JSON.stringify(error || {});
    const errorMessage = error?.message || error?.error?.message || '';

    if (
        errorMessage.includes('429') || 
        errorMessage.toLowerCase().includes('quota') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorString.includes('"code":429') ||
        errorString.includes('RESOURCE_EXHAUSTED')
    ) {
      return "⚠️ SYSTEM OVERLOAD (429): Quota Exceeded. The investigation unit has hit its rate limit. Please check your API billing or try again later.";
    }
    return defaultMsg;
  };

  const startInvestigation = async () => {
    if (!inputData.trim()) return;
    setIsTyping(true);
    setSessionStarted(true);
    setMessages([{ role: 'user', text: inputData, isInitial: true }]);

    try {
      if (!tutorServiceRef.current) {
        tutorServiceRef.current = new DSATutorService();
      }
      const session: TutorSession = { input: inputData, level: experienceLevel, visualization: visualization, detail: detailLevel };
      const response = await tutorServiceRef.current.startSession(session);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: handleError(error, "Investigation disrupted. Secure connection failed. Check protocol.") }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || followUpInput;
    if (!messageText.trim() || isTyping) return;

    setFollowUpInput('');
    setMessages(prev => [...prev, { role: 'user', text: messageText }]);
    setIsTyping(true);

    try {
      if (!tutorServiceRef.current) {
        tutorServiceRef.current = new DSATutorService();
        if (messages.length > 0) {
          await tutorServiceRef.current.resumeSession(messages);
        } else if (sessionStarted && inputData) {
           await tutorServiceRef.current.startSession({ input: inputData, level: experienceLevel, visualization: visualization, detail: detailLevel });
        }
      }
      let fullResponse = '';
      await tutorServiceRef.current.sendMessageStream(messageText, (chunk) => {
          fullResponse = chunk;
      });
      setMessages(prev => [...prev, { role: 'model', text: fullResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: handleError(error, "Uplink severed. Re-establishing...") }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const loadEvidence = (code: string) => {
    setInputData(code);
    setActiveTab('CRIME SCENE');
  };

  const reset = () => {
    setSessionStarted(false);
    setMessages([]);
    setInputData('');
    tutorServiceRef.current = null;
    localStorage.removeItem('dsa_case_state');
    setActiveTab('CRIME SCENE');
  };

  if (!booted) return <BootScreen onComplete={() => setBooted(true)} />;

  // Timeline Data with explicit hover classes to ensure Tailwind picks them up
  const timelineItems = [
    { 
      title: 'Arrays & Hashing', 
      alias: 'FINGERPRINT ANALYSIS', 
      status: 'SOLVED', 
      desc: 'Identify duplicates and map suspect relations.', 
      color: 'text-green-500', 
      borderClass: 'border-green-500', 
      hoverClass: 'hover:border-green-500' 
    },
    { 
      title: 'Two Pointers', 
      alias: 'TRAJECTORY TRACKING', 
      status: 'IN PROGRESS', 
      desc: 'Track movement from multiple angles simultaneously.', 
      color: 'text-[#FFD700]', 
      borderClass: 'border-[#FFD700]', 
      hoverClass: 'hover:border-[#FFD700]' 
    },
    { 
      title: 'Sliding Window', 
      alias: 'SURVEILLANCE FRAME', 
      status: 'PENDING', 
      desc: 'Analyze data streams in real-time segments.', 
      color: 'text-gray-500', 
      borderClass: 'border-gray-700', 
      hoverClass: 'hover:border-gray-500' 
    },
    { 
      title: 'Binary Search', 
      alias: 'SUSPECT ELIMINATION', 
      status: 'PENDING', 
      desc: 'Divide and conquer suspect lists efficiently.', 
      color: 'text-gray-500', 
      borderClass: 'border-gray-700', 
      hoverClass: 'hover:border-gray-500' 
    },
    { 
      title: 'Graphs', 
      alias: 'NETWORK MAPPING', 
      status: 'LOCKED', 
      desc: 'Uncover hidden connections in complex networks.', 
      color: 'text-red-900', 
      borderClass: 'border-red-900', 
      hoverClass: '' // No hover for locked items
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#e0e0e0] overflow-hidden font-sans selection:bg-[#FF3B3B] selection:text-white crt relative">
      
      {/* Background Matrix/Grid Effect */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 1px, transparent 1px)', 
             backgroundSize: '30px 30px' 
           }}>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#333] shrink-0 z-40 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50"></div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center bg-[#1a1a1a] rounded-sm border border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] overflow-hidden">
             {/* Radar Sweep Animation */}
             <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,215,0,0.5)_360deg)] animate-[spin_4s_linear_infinite] rounded-full opacity-50"></div>
             <div className="absolute inset-0 rounded-full border border-[#FFD700] opacity-30 scale-75"></div>
             <span className="text-2xl relative z-10">🕵️‍♂️</span>
          </div>
          <div>
            <h1 className="font-bold text-2xl text-[#FFD700] tracking-[0.2em] font-mono uppercase glitch-hover cursor-default">CASE #DSA</h1>
            <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-0.5">
                   <div className="w-1 h-3 bg-[#FF3B3B] animate-pulse"></div>
                   <div className="w-1 h-2 bg-[#FF3B3B] animate-pulse delay-75"></div>
                   <div className="w-1 h-4 bg-[#FF3B3B] animate-pulse delay-150"></div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] tech-font">LIVE FEED // SECURE</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            {sessionStarted && (
            <button 
                onClick={reset}
                className="group relative px-6 py-2 bg-transparent overflow-hidden rounded-sm"
            >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="absolute inset-0 border border-[#FFD700] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative text-xs font-bold text-[#FFD700] uppercase tracking-wider font-mono">New Case</span>
            </button>
            )}
            <div className="hidden md:flex flex-col items-end text-[10px] font-mono text-gray-600">
                <span>CPU: <span className="text-green-500">12%</span></span>
                <span>MEM: <span className="text-green-500">4.2GB</span></span>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 relative z-10 scan-line">
        {!sessionStarted ? (
          <div className="flex-1 overflow-y-auto relative bg-[#0e0e0e]/80">
            {/* Caution Tape */}
            <div className="sticky top-0 z-20 w-full h-6 bg-[#FFD700] text-black font-black font-mono text-xs flex items-center overflow-hidden border-b-2 border-black opacity-80">
               <div className="animate-[marquee_20s_linear_infinite] whitespace-nowrap">
                  CRIME SCENE DO NOT CROSS // EVIDENCE DETECTED // AUTHORIZED PERSONNEL ONLY // CRIME SCENE DO NOT CROSS // EVIDENCE DETECTED // AUTHORIZED PERSONNEL ONLY //
               </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8 relative">
              
              {/* Navigation Tabs */}
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
                  
                  {/* SUSPECT INPUT */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#333] pb-2">
                      <h2 className="text-[#e0e0e0] font-bold text-xl tracking-wider flex items-center gap-3">
                        <span className="text-[#FFD700] text-2xl animate-pulse">📂</span> SUSPECT PROFILE
                      </h2>
                      <span className="text-xs text-[#FF3B3B] font-mono border border-[#FF3B3B] px-2 py-0.5 rounded-sm animate-pulse">STATUS: AT LARGE</span>
                    </div>

                    <div className="relative group">
                        {/* Glow Effect behind textarea */}
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
                        {/* High-tech corners */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]"></div>
                      </div>
                    </div>
                  </div>

                  {/* SETTINGS PANEL */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-[#333] pb-2">
                      <h2 className="text-[#e0e0e0] font-bold text-xl tracking-wider flex items-center gap-2">
                        <span className="text-[#FFD700]">⚙️</span> MODUS OPERANDI
                      </h2>
                    </div>

                    <div className="bg-[#141414]/80 backdrop-blur border border-[#333] p-6 space-y-8 relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                      {/* Decorative Line */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-[#333] pointer-events-none opacity-20"></div>

                      <div className="space-y-3 relative z-10">
                          <label className="text-[10px] uppercase tracking-widest text-[#FF3B3B] font-bold flex items-center gap-2">
                              <span className="w-2 h-2 bg-[#FF3B3B] rounded-full"></span> Expertise Level
                          </label>
                          <div className="flex flex-col gap-2">
                            {['Beginner', 'Intermediate'].map(opt => (
                              <label key={opt} className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-all duration-300 group ${experienceLevel === opt ? 'border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_10px_rgba(255,215,0,0.1)]' : 'border-[#333] hover:border-gray-500 bg-[#0a0a0a]'}`}>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${experienceLevel === opt ? 'border-[#FFD700]' : 'border-gray-600'}`}>
                                    {experienceLevel === opt && <div className="w-2 h-2 bg-[#FFD700] rounded-full"></div>}
                                </div>
                                <span className={`text-xs font-mono uppercase tracking-wider ${experienceLevel === opt ? 'text-[#FFD700] font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>{opt}</span>
                              </label>
                            ))}
                          </div>
                      </div>

                      <div className="space-y-3 relative z-10">
                          <label className="text-[10px] uppercase tracking-widest text-[#FF3B3B] font-bold flex items-center gap-2">
                             <span className="w-2 h-2 bg-[#FF3B3B] rounded-full"></span> Visualization
                          </label>
                          <select 
                            value={visualization} 
                            onChange={(e) => setVisualization(e.target.value as VisualizationPreference)}
                            className="w-full bg-[#0a0a0a] border border-[#333] text-gray-300 text-xs font-mono p-3 outline-none focus:border-[#FFD700] transition-colors appearance-none cursor-pointer hover:bg-[#1a1a1a]"
                          >
                            <option value="Text Only">TEXT DOSSIER ONLY</option>
                            <option value="Show Visualization">EVIDENCE BOARD (ASCII)</option>
                          </select>
                      </div>

                      <div className="space-y-3 relative z-10">
                          <label className="text-[10px] uppercase tracking-widest text-[#FF3B3B] font-bold flex items-center gap-2">
                             <span className="w-2 h-2 bg-[#FF3B3B] rounded-full"></span> Detail Depth
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                              {['Short', 'Long'].map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => setDetailLevel(opt as DetailPreference)}
                                  className={`py-3 text-[10px] font-mono uppercase tracking-wider border transition-all duration-300 relative overflow-hidden ${detailLevel === opt ? 'bg-[#FFD700] text-black border-[#FFD700] font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'bg-transparent text-gray-500 border-[#333] hover:border-gray-500'}`}
                                >
                                  {opt === 'Short' ? 'Brief' : 'Full Rpt'}
                                </button>
                              ))}
                          </div>
                      </div>

                      <button
                        onClick={startInvestigation}
                        disabled={!inputData.trim()}
                        className="w-full py-5 bg-[#FF3B3B] text-white font-bold tracking-[0.2em] uppercase text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden clip-path-polygon hover:shadow-[0_0_25px_rgba(255,59,59,0.6)]"
                      >
                        <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.2)_10px,rgba(0,0,0,0.2)_20px)] opacity-30"></div>
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          INITIATE SCAN <span className="group-hover:translate-x-2 transition-transform">→</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'EVIDENCE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {EVIDENCE_FILES.map((file) => (
                    <div 
                      key={file.id} 
                      onClick={() => loadEvidence(file.code)}
                      className="bg-[#141414] border border-[#333] p-6 hover:border-[#FFD700] hover:bg-[#1a1a1a] transition-all cursor-pointer group relative overflow-hidden transform hover:-translate-y-1 hover:shadow-[0_5px_20px_rgba(0,0,0,0.5)]"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-100 transition-opacity">
                         <span className="text-4xl grayscale group-hover:grayscale-0 transition-all">📂</span>
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
                      
                      {/* Animated bottom border */}
                      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#FFD700] group-hover:w-full transition-all duration-700 ease-out"></div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'TIMELINE' && (
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-8 border-b border-[#333] pb-4">
                        <span className="text-3xl">📅</span>
                        <div>
                            <h2 className="text-xl font-bold text-[#FFD700] tracking-widest uppercase">Investigation Roadmap</h2>
                            <p className="text-xs text-gray-500 font-mono">MASTER THE ALGORITHMS TO CLOSE ALL CASES</p>
                        </div>
                    </div>

                    <div className="relative border-l-2 border-[#333] ml-4 md:ml-10 space-y-12 py-4">
                        {/* Timeline Items */}
                        {timelineItems.map((item, idx) => (
                            <div key={idx} className="relative pl-8 md:pl-12 group">
                                {/* Dot on line */}
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#050505] border-2 ${item.status === 'SOLVED' ? 'border-green-500 bg-green-500/20' : item.status === 'IN PROGRESS' ? 'border-[#FFD700] animate-pulse' : 'border-[#333]'}`}></div>
                                
                                <div className={`bg-[#141414] border p-6 rounded-sm relative overflow-hidden transition-all duration-300 hover:translate-x-2 ${
                                    item.status === 'LOCKED' 
                                    ? 'border-[#333] opacity-50' 
                                    : `${item.borderClass} ${item.hoverClass}`
                                }`}>
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
            <ChatMessageList 
              messages={messages} 
              isTyping={isTyping} 
              onSuggestionClick={(text) => handleSendMessage(text)}
            />
            
            <div className="p-6 bg-[#0a0a0a] border-t border-[#333] z-30">
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
                  disabled={!followUpInput.trim() || isTyping}
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