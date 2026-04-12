import React, { useEffect, useMemo, useRef, useState } from 'react';

interface HomePageProps {
  onGetStarted: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  const [showHow, setShowHow] = useState(false);
  const statusLabel = useMemo(() => (showHow ? 'Hide' : 'How It Works'), [showHow]);
  const consoleLines = useMemo(
    () => [
      'agent@algosleuth:~/casefiles$ load_case',
      '>> analyzing: binary_search.cpp',
      '// evidence: off-by-one detected near mid update',
      '// recommendation: adjust boundary shift to mid - 1',
      '>> report ready - next clue issued',
    ],
    []
  );
  const headlinePrefix = 'Decode algorithms like ';
  const headlineVariants = useMemo(
    () => ['a forensic detective', 'a case analyst', 'an evidence hunter'],
    []
  );
  const [variantIndex, setVariantIndex] = useState(0);
  const [variantCharIndex, setVariantCharIndex] = useState(0);
  const [variantForward, setVariantForward] = useState(true);
  const [typedVariant, setTypedVariant] = useState('');
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [activeLine, setActiveLine] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const howItWorksRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (lineIndex >= consoleLines.length) {
      timeout = setTimeout(() => {
        setTypedLines([]);
        setActiveLine('');
        setLineIndex(0);
        setCharIndex(0);
      }, 2200);
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }

    const currentLine = consoleLines[lineIndex];
    if (charIndex < currentLine.length) {
      timeout = setTimeout(() => {
        setActiveLine(currentLine.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, 32);
    } else {
      timeout = setTimeout(() => {
        setTypedLines((prev) => [...prev, currentLine]);
        setActiveLine('');
        setCharIndex(0);
        setLineIndex((prev) => prev + 1);
      }, 520);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [charIndex, consoleLines, lineIndex]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const currentVariant = headlineVariants[variantIndex];
    if (variantForward) {
      if (variantCharIndex < currentVariant.length) {
        timeout = setTimeout(() => {
          const nextIndex = variantCharIndex + 1;
          setVariantCharIndex(nextIndex);
          setTypedVariant(currentVariant.slice(0, nextIndex));
        }, 26);
      } else {
        timeout = setTimeout(() => {
          setVariantForward(false);
        }, 1300);
      }
    } else {
      if (variantCharIndex > 0) {
        timeout = setTimeout(() => {
          const nextIndex = variantCharIndex - 1;
          setVariantCharIndex(nextIndex);
          setTypedVariant(currentVariant.slice(0, nextIndex));
        }, 16);
      } else {
        timeout = setTimeout(() => {
          setVariantForward(true);
          setVariantIndex((prev) => (prev + 1) % headlineVariants.length);
        }, 500);
      }
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [headlineVariants, variantCharIndex, variantForward, variantIndex]);

  return (
    <div className="h-screen bg-[var(--app-bg)] text-[var(--app-text)] overflow-y-auto overflow-x-hidden relative crt">
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-12 left-12 h-2 w-2 rounded-full bg-[#FFD700] shadow-[0_0_14px_rgba(255,215,0,0.7)] animate-pulse" />
        <div className="absolute bottom-16 right-20 h-2 w-2 rounded-full bg-[#FF3B3B] shadow-[0_0_14px_rgba(255,59,59,0.7)] animate-pulse" />
        <div className="absolute left-1/2 top-24 h-[1px] w-[280px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#FFD700]/70 to-transparent opacity-70" />
      </div>

      <header className="relative z-10 max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-sm border border-[#FFD700] bg-[#0f0f0f] flex items-center justify-center font-mono text-[#FFD700] text-sm">
            AS
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.4em] text-[#FFD700]">AlgoSleuth</p>
            <h1 className="text-base font-bold tracking-widest text-[#e5e5e5] uppercase">DSA Detective Lab</h1>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-500">Secure Intake</div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <section className="flex flex-col items-center text-center gap-6 pt-10">
          <div className="space-y-6 max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.5em] text-[#FFD700]">ALGOSLEUTH</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              <span className="text-white">{headlinePrefix}</span>
              <span className="text-[#FFD700]">{typedVariant}</span>
              <span className="typing-caret" />
            </h2>
            <p className="text-base sm:text-lg text-gray-400">
              AlgoSleuth turns every DSA problem into a case file. Paste code, receive structured forensic analysis,
              evidence boards, and clear next steps tailored to your skill level.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="px-7 py-3 bg-[#FFD700] text-black font-semibold uppercase tracking-widest text-xs hover:brightness-95 shadow-[0_0_24px_rgba(255,215,0,0.35)]"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!showHow) {
                    setShowHow(true);
                    setTimeout(() => {
                      howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setTimeout(() => {
                        window.scrollBy({ top: 160, behavior: 'smooth' });
                      }, 220);
                    }, 80);
                  } else {
                    setShowHow(false);
                  }
                }}
                className="px-7 py-3 border border-[#1f2937] text-gray-300 font-mono uppercase tracking-widest text-xs hover:border-[#FFD700] hover:text-[#FFD700] hover:shadow-[0_0_24px_rgba(255,215,0,0.25)]"
              >
                {statusLabel}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-6 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 via-transparent to-[#FF3B3B]/20 blur-2xl opacity-60" />
            <div className="border border-[#1f2937] bg-[#0a0a0a] rounded-xl overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.6)] pulse-border relative">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#101010] border-b border-[#1f2937]">
                <span className="h-3 w-3 rounded-full bg-[#FF3B3B]" />
                <span className="h-3 w-3 rounded-full bg-[#FFD700]" />
                <span className="h-3 w-3 rounded-full bg-[#34D399]" />
                <span className="ml-3 text-xs font-mono uppercase tracking-widest text-gray-400">
                  AlgoSleuth Case Console
                </span>
              </div>
              <div className="px-6 py-6 font-mono text-sm text-gray-400 space-y-2 min-h-[150px]">
                {typedLines.map((line) => (
                  <p key={line}>
                    {line.startsWith('>>') ? (
                      <span className="text-[#FFD700]">{line}</span>
                    ) : line.startsWith('//') ? (
                      <span className="text-gray-500">{line}</span>
                    ) : (
                      <>
                        <span className="text-[#FFD700]">{line.split('$')[0]}</span>${line.includes('$') ? line.split('$')[1] : ''}
                      </>
                    )}
                  </p>
                ))}
                {lineIndex < consoleLines.length && (
                  <p>
                    <span className="text-[#FFD700]">{activeLine}</span>
                    <span className="typing-caret" />
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14" ref={howItWorksRef}>
          <div
            className={`transition-all duration-300 ${
              showHow ? 'opacity-100 max-h-[999px]' : 'opacity-0 max-h-0 overflow-hidden'
            }`}
          >
            <div className="border border-[#1f2937] bg-[#0b0b0b] p-6 md:p-8 text-left">
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-[#FFD700]">How It Works</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2">Case flow in three steps</h3>
              <p className="text-sm text-gray-400 mt-3">
                Paste your code, tune the Modus Operandi settings, and run the scan to receive a forensic report with
                evidence, fixes, and next-step clues.
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Paste the code',
                    step: '01',
                    desc: 'Paste your code into the Suspect Profile input box. The lab reads the language and intent instantly.',
                    tilt: '-3deg',
                  },
                  {
                    title: 'Configure Modus Operandi',
                    step: '02',
                    desc: 'Use the Modus Operandi panel to set Expertise Level, Visualization style, and Detail Depth before scanning.',
                    tilt: '2deg',
                  },
                  {
                    title: 'Initiate the scan',
                    step: '03',
                    desc: 'Run the case to receive evidence boards, fixes, and next-step clues tailored to you.',
                    tilt: '-1deg',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="relative"
                    style={{ transform: `rotate(${item.tilt})` }}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="h-4 w-4 rounded-full bg-[#FF3B3B] shadow-[0_0_12px_rgba(255,59,59,0.8)] block" />
                    </div>
                    <div className="border border-[#d6d6d6] bg-[#f7f4ea] rounded-md shadow-[0_18px_35px_rgba(0,0,0,0.45)]">
                      <div
                        className="h-40 border-b border-[#e5e1d5] relative overflow-hidden"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(255,215,0,0.08), transparent 45%), repeating-linear-gradient(0deg, rgba(17,17,17,0.08) 0 1px, transparent 1px 18px), #ffffff',
                        }}
                      >
                        <div className="absolute top-3 left-4 text-[10px] font-mono uppercase tracking-[0.3em] text-[#9a3412]">
                          Case File
                        </div>
                        <div className="absolute top-8 left-4 right-4 text-[11px] text-[#111] opacity-60">
                          Suspect profile snapshot
                        </div>
                        <div className="absolute top-12 left-4 right-4 h-16 bg-black/10 rounded-sm blur-[0.5px]" />
                        <div className="absolute top-14 left-6 right-12 h-2 bg-black/25 rounded-sm" />
                        <div className="absolute top-18 left-6 right-8 h-2 bg-black/20 rounded-sm" />
                        <div className="absolute top-22 left-6 right-20 h-2 bg-black/20 rounded-sm" />
                        <div className="absolute bottom-4 right-4 rotate-[-10deg] border border-[#b91c1c] text-[#b91c1c] text-[9px] font-mono uppercase tracking-[0.25em] px-2 py-1">
                          Evidence
                        </div>
                        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-[#9ca3af]">
                          // evidence preview
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#b45309]">Step {item.step}</p>
                        <h4 className="text-base font-semibold text-[#111] mt-1">{item.title}</h4>
                        <p className="text-sm text-[#4b4b4b] mt-2">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border border-[#1f2937] bg-[#0e0e0e] p-5 text-sm text-gray-300 shadow-[0_0_20px_rgba(255,215,0,0.12)]">
                <p className="text-xs font-mono uppercase tracking-widest text-[#FFD700]">Modus Operandi Settings</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-gray-300">Expertise Level</p>
                    <p className="text-sm text-gray-400">
                      Beginner explains fundamentals step-by-step. Intermediate assumes basics and stays concise.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-gray-300">Visualization</p>
                    <p className="text-sm text-gray-400">
                      Text Only gives a narrative report. Visual adds evidence-style diagrams and step traces.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-gray-300">Detail Depth</p>
                    <p className="text-sm text-gray-400">
                      Brief delivers the fix fast. Full Report adds deeper reasoning, complexity, and edge cases.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default HomePage;
