import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';
import ComplexityDashboard from './ComplexityDashboard';

interface Props {
  messages: ChatMessage[];
  isTyping: boolean;
  onSuggestionClick?: (text: string) => void;
}

interface CaseReportFields {
  title: string;
  algorithm: string;
  language: string;
  difficulty: string;
  status: string;
  riskSummary: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeFieldValue = (value: string): string =>
  value
    .replace(/\*\*/g, '')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();

const normalizeMojibake = (value: string): string => value;

const extractField = (block: string, labels: string[]): string => {
  for (const label of labels) {
    const safeLabel = escapeRegExp(label);
    const inlineMatch = block.match(new RegExp(`^\\s*(?:[-*>]\\s*)?(?:\\*\\*)?${safeLabel}(?:\\*\\*)?\\s*:\\s*(.+)$`, 'im'));
    if (inlineMatch?.[1]) {
      return normalizeFieldValue(inlineMatch[1]);
    }

    const twoLineMatch = block.match(
      new RegExp(
        `^\\s*(?:[-*>]\\s*)?(?:\\*\\*)?${safeLabel}(?:\\*\\*)?\\s*$[\\r\\n]+\\s*(?:[-*>]\\s*)?(?:\\*\\*)?([^\\n]+)(?:\\*\\*)?`,
        'im'
      )
    );

    if (twoLineMatch?.[1]) {
      return normalizeFieldValue(twoLineMatch[1]);
    }
  }

  return '';
};

const parseCaseReportFields = (block: string): CaseReportFields => ({
  title: extractField(block, ['Case Title']),
  algorithm: extractField(block, ['Primary Algorithm', 'Primary Algo']),
  language: extractField(block, ['Language']),
  difficulty: extractField(block, ['Difficulty Level', 'Difficulty']),
  status: extractField(block, ['Investigation Status', 'Status']),
  riskSummary: extractField(block, ['Risk Summary', 'Risk Factor']),
});

const hasCaseReportData = (fields: CaseReportFields): boolean => {
  const populated = [fields.title, fields.algorithm, fields.language, fields.difficulty, fields.status, fields.riskSummary].filter(
    (value) => value.length > 0 && value.toLowerCase() !== 'unknown'
  );

  return populated.length >= 3;
};

const getStatusClass = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized.includes('closed')) return 'text-green-400';
  if (normalized.includes('critical')) return 'text-red-400';
  if (normalized.includes('investigation')) return 'text-yellow-400';
  return 'text-gray-300';
};

const findFirstIndex = (value: string, patterns: RegExp[]): number => {
  const indexes = patterns
    .map((pattern) => {
      const match = value.match(pattern);
      return match?.index ?? -1;
    })
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
};

const extractCaseReportSegment = (value: string): { before: string; block: string; after: string } | null => {
  const start = findFirstIndex(value, [
    /^\s*####\s*3[^\n]*CASE REPORT:?/im,
    /^\s*3[^\n]*CASE REPORT:?/im,
    /^\s*Case Title\s*:/im,
  ]);

  if (start < 0) {
    return null;
  }
  const tail = value.slice(start);

  const endOffset = findFirstIndex(tail, [
    /^\s*####\s*[4-9]\b/im,
    /^\s*##\s*(?:Investigation Notes|Evidence Board|Case Stats|Next Clue)\b/im,
    /^\s*Next Clue\b/im,
  ]);

  const end = endOffset >= 0 ? start + endOffset : value.length;
  return {
    before: value.slice(0, start),
    block: value.slice(start, end),
    after: value.slice(end),
  };
};

const extractStatsSegment = (value: string): { before: string; block: string; after: string } | null => {
  const start = findFirstIndex(value, [/^\s*####\s*6[^\n]*Case Stats/im, /^\s*##\s*.*Case Stats/im, /^\s*Resource Analysis/im]);

  const hasComplexityLines = /Time Complexity\s*:/i.test(value) && /Space Complexity\s*:/i.test(value);
  if (start < 0 && !hasComplexityLines) {
    return null;
  }

  const actualStart = start >= 0 ? start : findFirstIndex(value, [/Time Complexity\s*:/i]);
  if (actualStart < 0) {
    return null;
  }

  const tail = value.slice(actualStart);
  const endOffset = findFirstIndex(tail, [/^\s*##\s*.*Next Clue/im, /^\s*####\s*7/im]);
  const end = endOffset >= 0 ? actualStart + endOffset : value.length;

  return {
    before: value.slice(0, actualStart),
    block: value.slice(actualStart, end),
    after: value.slice(end),
  };
};
const extractEvidenceSegment = (value: string): { before: string; block: string; after: string } | null => {
  const start = findFirstIndex(value, [
    /^\s*####\s*5[^\n]*Evidence Board/im,
    /^\s*##\s*.*Evidence Board/im,
    /^\s*Evidence Board\b/im,
  ]);

  if (start < 0) {
    return null;
  }

  const tail = value.slice(start);
  const endOffset = findFirstIndex(tail, [
    /^\s*####\s*[6-9]\b/im,
    /^\s*##\s*(?:Case Stats|Next Clue)\b/im,
    /^\s*(?:Case Stats|Next Clue)\b/im,
  ]);
  const end = endOffset >= 0 ? start + endOffset : value.length;

  return {
    before: value.slice(0, start),
    block: value.slice(start, end),
    after: value.slice(end),
  };
};


const extractComplexity = (statsBlock: string): { time: string; space: string } | null => {
  const timeMatch = statsBlock.match(/Time Complexity\s*:\s*([^\n]+)/i);
  const spaceMatch = statsBlock.match(/Space Complexity\s*:\s*([^\n]+)/i);

  if (!timeMatch?.[1] || !spaceMatch?.[1]) {
    const lines = statsBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const findValueAfterLabel = (label: RegExp): string | null => {
      const labelIndex = lines.findIndex((line) => label.test(line));
      if (labelIndex < 0) {
        return null;
      }

      for (let i = labelIndex + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^input size\b/i.test(line)) {
          break;
        }
        const complexityMatch = line.match(/O\([^)]*\)/i);
        if (complexityMatch?.[0]) {
          return normalizeFieldValue(complexityMatch[0]);
        }
        if (!label.test(line)) {
          return normalizeFieldValue(line);
        }
      }

      return null;
    };

    const fallbackTime = findValueAfterLabel(/^Time Complexity\b/i);
    const fallbackSpace = findValueAfterLabel(/^Space Complexity\b/i);

    if (!fallbackTime || !fallbackSpace) {
      return null;
    }

    return { time: fallbackTime, space: fallbackSpace };
  }

  return {
    time: normalizeFieldValue(timeMatch[1]),
    space: normalizeFieldValue(spaceMatch[1]),
  };
};

const wrapInvestigationNotes = (html: string): string =>
  html.replace(
    /(<h3[^>]*>Investigation Notes<\/h3>)([\s\S]*?)(?=<h3[^>]*>|<h2[^>]*>|$)/g,
    '$1<div class="text-justify">$2</div>'
  );

const formatPartToHtml = (part: string): string => {
  const safe = escapeHtml(part);

  const formatted = safe
    .replace(/^###\s*(?:[^\n]*?)CASE ANALYSIS:\s*(.*)$/gim, '<h2 class="text-2xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-4">CASE ANALYSIS: $1</h2>')
    .replace(/^####\s*2[^\n]*Investigation Status.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">2. Investigation Status</h3>')
    .replace(/^\s*CASE REPORT\s*:?\s*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-8">CASE REPORT</h3>')
    .replace(/^####\s*4[^\n]*Investigation Notes.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Investigation Notes</h3>')
    .replace(/^####\s*5[^\n]*Evidence Board.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Evidence Board (Algorithm Trace)</h3>')
    .replace(/^##\s*.*Case Stats.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Case Stats</h3>')
    .replace(/^##\s*.*Next Clue.*$/gim, '<h3 class="text-xl font-bold text-[#FF3B3B] border-b-2 border-[#333] pb-3 mb-6 mt-10">Next Clue</h3>')
    .replace(/^####\s*6[^\n]*Case Stats.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Case Stats</h3>')
    .replace(/^##\s*.*CASE FILE.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Case File</h3>')
    .replace(/^##\s*.*Investigation Notes.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Investigation Notes</h3>')
    .replace(/^##\s*.*Evidence Board.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Evidence Board (Algorithm Trace)</h3>')
    .replace(/^\s*Investigation Notes.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Investigation Notes</h3>')
    .replace(/^\s*Evidence Board.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Evidence Board (Algorithm Trace)</h3>')
    .replace(/^\s*Case Stats.*$/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10">Case Stats</h3>')
    .replace(/^\s*Next Clue.*$/gim, '<h3 class="text-xl font-bold text-[#FF3B3B] border-b-2 border-[#333] pb-3 mb-6 mt-10">Next Clue</h3>')
    .replace(/^\s*[-*]\s+/gm, '<span class="text-[#FF3B3B] mr-2 inline-block font-bold">&gt;</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold bg-[#FFD700]/10 px-1 rounded-sm">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="text-[#FFD700] bg-[#1a1a1a] px-1 rounded">$1</code>')
    .replace(/\n/g, '<br />');

  return wrapInvestigationNotes(formatted);
};

const formatEvidenceMarkdown = (value: string): string => {
  const safe = escapeHtml(value);
  return safe
    .replace(/`([^`]+)`/g, '<code class="text-gray-200 bg-[#0f0f0f] border border-[#333] px-1 rounded">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br />');
};

const CodeBlock: React.FC<{ code: string; allowMarkdown?: boolean }> = ({ code, allowMarkdown = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 w-full bg-black rounded-sm border border-[#333] overflow-hidden relative group shadow-lg transition-all hover:border-[#FFD700]/50 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-4 py-2 bg-[#141414] border-b border-[#333]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#333] group-hover:bg-[#FF3B3B] transition-colors" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#333] group-hover:bg-[#FFD700] transition-colors delay-75" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#333] group-hover:bg-[#00ff00] transition-colors delay-150" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px] sm:text-[9px] text-[#FFD700] uppercase tracking-widest border border-[#FFD700] px-1.5 rounded-sm">Evidence Block</span>
          <button onClick={handleCopy} className="text-[8px] sm:text-[10px] text-gray-400 hover:text-white uppercase tracking-wider transition-colors">
            {copied ? <span className="text-green-400 font-bold">Copied</span> : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="p-3 sm:p-5 overflow-x-auto text-[10px] sm:text-[11px] md:text-xs lg:text-sm code-font text-[#e0e0e0] leading-relaxed custom-scrollbar">
        <code>
          {allowMarkdown ? (
            <span dangerouslySetInnerHTML={{ __html: formatEvidenceMarkdown(code) }} />
          ) : (
            code
          )}
        </code>
      </pre>
    </div>
  );
};

const renderFormattedText = (text: string, onSuggestionClick?: (text: string) => void) => {
  const cleanedText = normalizeMojibake(text);
  const suggestionRegex = /Ask me:\s*['"](.*?)['"]/gi;
  const suggestions: string[] = [];
  let suggestionMatch: RegExpExecArray | null;

  while ((suggestionMatch = suggestionRegex.exec(cleanedText)) !== null) {
    suggestions.push(suggestionMatch[1]);
  }

  const parts = cleanedText.split(/(```[\s\S]*?```)/g);
  let nodeIndex = 0;
  const nextKey = (prefix: string): string => `${prefix}-${nodeIndex++}`;

  const renderTextChunk = (chunk: string): React.ReactNode[] => {
    if (!chunk.trim()) {
      return [];
    }

    const caseSegment = extractCaseReportSegment(chunk);
    if (caseSegment) {
      const fields = parseCaseReportFields(caseSegment.block);
      const nodes: React.ReactNode[] = [];

      nodes.push(...renderTextChunk(caseSegment.before));

      if (hasCaseReportData(fields)) {
        nodes.push(
          <div key={nextKey('case-report')} className="bg-[#141414] border border-[#333] p-0 rounded-sm my-6 relative overflow-hidden group shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]" />

            <div className="p-4 border-b border-[#333] flex justify-between items-start bg-black/50">
              <div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">Evidence Record</div>
                <h2 className="text-lg font-bold text-[#FFD700] font-mono tracking-wider">{fields.title || 'Case Summary'}</h2>
              </div>
              <div className={`text-xs border border-[#333] px-3 py-1 bg-black rounded-sm font-bold ${getStatusClass(fields.status)}`}>
                {fields.status || 'Under Investigation'}
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4 text-xs font-mono text-gray-400 border-b border-[#333]">
              <div>
                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Primary Algo</span>
                <span className="text-white">{fields.algorithm || 'Not provided'}</span>
              </div>
              <div>
                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Language</span>
                <span className="text-white">{fields.language || 'Not provided'}</span>
              </div>
              <div>
                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Difficulty</span>
                <span className="text-white">{fields.difficulty || 'Not provided'}</span>
              </div>
              <div>
                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Risk Factor</span>
                <span className="text-white">{fields.riskSummary || 'Not provided'}</span>
              </div>
            </div>

            <div className="p-4 bg-[#0a0a0a]">
              <span className="text-[10px] text-[#FF3B3B] uppercase font-bold block mb-2">Risk Summary</span>
              <p className="text-sm text-gray-300 italic">"{fields.riskSummary || 'No risk summary provided.'}"</p>
            </div>
          </div>
        );
      } else {
        nodes.push(
          <div key={nextKey('plain-case')} dangerouslySetInnerHTML={{ __html: formatPartToHtml(caseSegment.block) }} />
        );
      }

      nodes.push(...renderTextChunk(caseSegment.after));
      return nodes;
    }

    const evidenceSegment = extractEvidenceSegment(chunk);
    if (evidenceSegment) {
      const nodes: React.ReactNode[] = [];

      nodes.push(...renderTextChunk(evidenceSegment.before));

      const headingMatch = evidenceSegment.block.match(/^[^\n]*Evidence Board[^\n]*/im);
      const headingLine = headingMatch?.[0] ?? 'Evidence Board (Algorithm Trace)';
      const body = evidenceSegment.block.replace(headingLine, '').replace(/^\s*[\r\n]+/, '').trim();

      nodes.push(
        <div key={nextKey('evidence-heading')} dangerouslySetInnerHTML={{ __html: formatPartToHtml(headingLine) }} />
      );

      if (body) {
        nodes.push(<CodeBlock key={nextKey('evidence-block')} code={body} allowMarkdown />);
      }

      nodes.push(...renderTextChunk(evidenceSegment.after));
      return nodes;
    }

    const statsSegment = extractStatsSegment(chunk);
    if (statsSegment) {
      const nodes: React.ReactNode[] = [];
      const complexity = extractComplexity(statsSegment.block);

      nodes.push(...renderTextChunk(statsSegment.before));

      if (complexity) {
        nodes.push(<ComplexityDashboard key={nextKey('complexity')} time={complexity.time} space={complexity.space} />);
      } else {
        nodes.push(<div key={nextKey('plain-stats')} dangerouslySetInnerHTML={{ __html: formatPartToHtml(statsSegment.block) }} />);
      }

      nodes.push(...renderTextChunk(statsSegment.after));
      return nodes;
    }

    return [<div key={nextKey('plain')} dangerouslySetInnerHTML={{ __html: formatPartToHtml(chunk) }} />];
  };

  return (
    <div className="space-y-6">
      {(() => {
        const renderedParts: React.ReactNode[] = [];

        parts.forEach((part) => {
          if (!part.trim()) {
            return;
          }

          if (part.startsWith('```')) {
            const content = part.replace(/```/g, '').trim();
            const lines = content.split('\n');
            if (lines.length > 0 && /^[a-z]+$/i.test(lines[0])) {
              lines.shift();
            }

            renderedParts.push(<CodeBlock key={nextKey('code')} code={lines.join('\n')} />);
            return;
          }

          renderedParts.push(...renderTextChunk(part));
        });

        return renderedParts;
      })()}

      {suggestions.length > 0 && onSuggestionClick && (
        <div className="pt-8 border-t border-[#333] mt-6 flex flex-wrap gap-4">
          {suggestions.map((suggestion) => (
            <button
              key={nextKey('suggestion')}
              onClick={() => onSuggestionClick(suggestion)}
              className="group relative px-5 py-3 bg-[#1a1a1a] overflow-hidden rounded-sm border border-[#333] hover:border-[#FFD700] transition-all"
            >
              <div className="absolute inset-0 w-0 bg-[#FFD700] opacity-10 group-hover:w-full transition-all duration-300" />
              <div className="relative flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FFD700]">
                <span className="text-[#FF3B3B] group-hover:translate-x-1 transition-transform">&gt;</span>
                {suggestion}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatMessageList: React.FC<Props> = ({ messages, isTyping, onSuggestionClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#050505] p-3 sm:p-4 md:p-6 custom-scrollbar relative">
      <div
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        {messages.map((msg, index) => {
          const isModel = msg.role === 'model';

          return (
            <div
              key={`${msg.role}-${index}-${msg.text.length}`}
              className={`flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 ${isModel ? 'sm:flex-row' : 'sm:flex-row-reverse'} animate-in fade-in slide-in-from-bottom-4 duration-500 group`}
            >
              <div
                className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 mt-1 rounded-sm flex items-center justify-center border-2 transition-all duration-300 relative overflow-hidden ${
                  isModel
                    ? 'bg-[#1a1a1a] border-[#FF3B3B] shadow-[0_0_15px_rgba(255,59,59,0.3)] text-xs font-bold group-hover:scale-105'
                    : 'bg-[#FFD700] border-[#FFD700] text-black text-[10px] font-bold tracking-tighter'
                }`}
              >
                {isModel && <div className="absolute inset-0 bg-[#FF3B3B] opacity-10 animate-pulse" />}
                {isModel ? '🕵️‍♂️' : 'YOU'}
              </div>

              <div className={`flex-1 min-w-0 ${isModel ? '' : 'flex justify-end'}`}>
                {isModel ? (
                  <div className="w-full">
                    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#333]/50">
                      <span className="text-[#FF3B3B] font-bold text-xs uppercase tracking-[0.2em] drop-shadow-[0_0_5px_rgba(255,59,59,0.5)]">
                        Cyber Investigation Unit
                      </span>
                      <span className="text-gray-600 text-[10px] font-mono">
                        CASE-ID-{1000 + index} // <span className="text-green-500">DECRYPTED</span>
                      </span>
                    </div>

                    <div className="prose prose-invert prose-xs sm:prose-sm md:prose-base max-w-none leading-relaxed text-gray-300">
                      {renderFormattedText(normalizeMojibake(msg.text), onSuggestionClick)}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-full sm:max-w-[85%] bg-[#1a1a1a] text-[#FFD700] px-4 sm:px-6 py-3 sm:py-4 rounded-sm border-r-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.15)] font-mono text-xs sm:text-sm whitespace-pre-wrap text-left relative transition-transform hover:-translate-x-1 duration-300">
                    <div className="absolute top-0 right-0 -mr-[2px] w-[2px] h-full bg-[#FFD700] opacity-50" />
                    <div className="absolute -left-1 top-4 w-1 h-4 bg-[#FFD700]" />
                    {normalizeMojibake(msg.text)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 animate-in fade-in duration-300">
            <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 mt-1 rounded-sm bg-[#1a1a1a] border border-[#FF3B3B] flex items-center justify-center text-lg sm:text-xl shadow-[0_0_15px_rgba(255,59,59,0.3)]">
              <span className="animate-pulse">...</span>
            </div>
            <div className="flex items-center h-12">
              <div className="flex gap-1.5 px-4 sm:px-6 py-2 sm:py-3 bg-[#1a1a1a]/50 border-l-2 border-[#FF3B3B] rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF3B3B]/10 to-transparent animate-[shimmer_2s_infinite]" />
                <span className="w-2 h-2 bg-[#FF3B3B] rounded-full animate-[bounce_1s_infinite_0ms]" />
                <span className="w-2 h-2 bg-[#FF3B3B] rounded-full animate-[bounce_1s_infinite_200ms]" />
                <span className="w-2 h-2 bg-[#FF3B3B] rounded-full animate-[bounce_1s_infinite_400ms]" />
                <span className="ml-3 text-xs text-[#FF3B3B] uppercase tracking-widest font-bold animate-pulse">Running diagnostics...</span>
              </div>
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
};

export default ChatMessageList;









