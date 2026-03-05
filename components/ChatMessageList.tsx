import React, { useState } from 'react';
import { ChatMessage } from '../types';
import ComplexityDashboard from './ComplexityDashboard';

interface Props {
  messages: ChatMessage[];
  isTyping: boolean;
  onSuggestionClick?: (text: string) => void;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
     <div className="my-6 bg-black rounded-sm border border-[#333] overflow-hidden relative group shadow-lg transition-all hover:border-[#FFD700]/50 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]">
       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50"></div>
       <div className="flex justify-between items-center px-4 py-2 bg-[#141414] border-b border-[#333]">
           <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#333] group-hover:bg-[#FF3B3B] transition-colors"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#333] group-hover:bg-[#FFD700] transition-colors delay-75"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#333] group-hover:bg-[#00ff00] transition-colors delay-150"></div>
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[9px] text-[#FFD700] uppercase tracking-widest border border-[#FFD700] px-1.5 rounded-sm">Evidence Block</span>
              <button 
                onClick={handleCopy}
                className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                {copied ? <span className="text-green-400 font-bold">COPIED!</span> : 'COPY'}
              </button>
           </div>
       </div>
       <pre className="p-5 overflow-x-auto text-xs md:text-sm code-font text-[#e0e0e0] leading-relaxed custom-scrollbar">
         <code>{code}</code>
       </pre>
     </div>
  );
};

const ChatMessageList: React.FC<Props> = ({ messages, isTyping, onSuggestionClick }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#050505] p-4 md:p-6 custom-scrollbar relative">
       {/* Subtle grid background for chat area */}
       <div className="absolute inset-0 opacity-5 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
       
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {messages.map((msg, i) => {
          const isModel = msg.role === 'model';
          return (
            <div
              key={i}
              className={`flex gap-4 md:gap-6 ${isModel ? 'flex-row' : 'flex-row-reverse'} animate-in fade-in slide-in-from-bottom-4 duration-500 group`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 mt-1 rounded-sm flex items-center justify-center border-2 transition-all duration-300 relative overflow-hidden ${
                isModel 
                  ? 'bg-[#1a1a1a] border-[#FF3B3B] shadow-[0_0_15px_rgba(255,59,59,0.3)] text-xl group-hover:scale-105' 
                  : 'bg-[#FFD700] border-[#FFD700] text-black text-[10px] font-bold tracking-tighter'
              }`}>
                {isModel && <div className="absolute inset-0 bg-[#FF3B3B] opacity-10 animate-pulse"></div>}
                {isModel ? '🕵️‍♂️' : 'YOU'}
              </div>

              {/* Message Content */}
              <div className={`flex-1 min-w-0 ${isModel ? '' : 'flex justify-end'}`}>
                 {isModel ? (
                   <div className="w-full">
                      {/* Model Header */}
                      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#333]/50">
                          <span className="text-[#FF3B3B] font-bold text-xs uppercase tracking-[0.2em] shadow-[#FF3B3B] drop-shadow-[0_0_5px_rgba(255,59,59,0.5)]">Cyber Investigation Unit</span>
                          <span className="text-gray-600 text-[10px] font-mono">CASE-ID-{1000 + i} // <span className="text-green-500">DECRYPTED</span></span>
                      </div>
                      
                      {/* Model Text */}
                      <div className="prose prose-invert prose-sm md:prose-base max-w-none leading-relaxed text-gray-300">
                         {renderFormattedText(msg.text, onSuggestionClick)}
                      </div>
                   </div>
                 ) : (
                   <div className="max-w-[85%] bg-[#1a1a1a] text-[#FFD700] px-6 py-4 rounded-sm border-r-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.15)] font-mono text-sm whitespace-pre-wrap text-left relative transition-transform hover:-translate-x-1 duration-300">
                      {/* User decorative blip */}
                      <div className="absolute top-0 right-0 -mr-[2px] w-[2px] h-full bg-[#FFD700] opacity-50"></div>
                      <div className="absolute -left-1 top-4 w-1 h-4 bg-[#FFD700]"></div>
                      {msg.text}
                   </div>
                 )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-4 md:gap-6 flex-row animate-in fade-in duration-300">
             <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 mt-1 rounded-sm bg-[#1a1a1a] border border-[#FF3B3B] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,59,59,0.3)]">
                <span className="animate-spin">⏳</span>
             </div>
             <div className="flex items-center h-12">
                <div className="flex gap-1.5 px-6 py-3 bg-[#1a1a1a]/50 border-l-2 border-[#FF3B3B] rounded-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF3B3B]/10 to-transparent animate-[shimmer_2s_infinite]"></div>
                   <span className="w-2 h-2 bg-[#FF3B3B] rounded-full animate-[bounce_1s_infinite_0ms]"></span>
                   <span className="w-2 h-2 bg-[#FF3B3B] rounded-full animate-[bounce_1s_infinite_200ms]"></span>
                   <span className="w-2 h-2 bg-[#FF3B3B] rounded-full animate-[bounce_1s_infinite_400ms]"></span>
                   <span className="ml-3 text-xs text-[#FF3B3B] uppercase tracking-widest font-bold animate-pulse">Running Diagnostics...</span>
                </div>
             </div>
          </div>
        )}
        
        <div className="h-4"></div>
      </div>
    </div>
  );
};

// Extracted text formatter
const formatPartToHtml = (part: string) => {
    return part
        .replace(/^4️⃣\s*Investigation Notes.*/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10 flex items-center gap-3"><span class="animate-pulse">🧠</span> Investigation Notes</h3>')
        .replace(/^5️⃣\s*Evidence Board.*/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10 flex items-center gap-3"><span class="animate-pulse">🧷</span> Evidence Board</h3>')
        .replace(/^6️⃣\s*Case Stats.*/gim, '<h3 class="text-xl font-bold text-[#FFD700] border-b-2 border-[#333] pb-3 mb-6 mt-10 flex items-center gap-3">📊 Case Stats</h3>')
        .replace(/^##\s*🧩\s*Next Clue/gim, '<h3 class="text-xl font-bold text-[#FF3B3B] border-b-2 border-[#333] pb-3 mb-6 mt-10 flex items-center gap-3">🧩 Next Clue</h3>')
        // List items with arrows
        .replace(/\n- /g, '<br/><span class="text-[#FF3B3B] mr-2 inline-block font-bold">››</span>')
        // Bold text highlighting
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold bg-[#FFD700]/10 px-1 rounded-sm">$1</strong>')
        .replace(/\n/g, '<br />');
};

const renderFormattedText = (text: string, onSuggestionClick?: (text: string) => void) => {
  // Suggestions regex
  const suggestionRegex = /Ask me: ['"](.*?)['"]/gi;
  const suggestions: string[] = [];
  let match;
  while ((match = suggestionRegex.exec(text)) !== null) {
    suggestions.push(match[1]);
  }

  const parts = text.split(/(\`\`\`[\s\S]*?\`\`\`)/g);
  
  return (
    <div className="space-y-6">
      {parts.map((part, i) => {
        // CODE BLOCKS
        if (part.startsWith('```')) {
          const content = part.replace(/\`\`\`/g, '').trim();
          const lines = content.split('\n');
          if (lines.length > 0 && !lines[0].includes(' ') && !lines[0].includes('=')) {
             lines.shift(); 
          }
          return <CodeBlock key={i} code={lines.join('\n')} />;
        }
        
        // CHECK FOR CASE REPORT
        const reportMatch = part.match(/(CASE REPORT:[\s\S]*?)(?=4️⃣|$)/);
        if (reportMatch) {
            const reportBlock = reportMatch[0];
            const textBefore = part.substring(0, reportMatch.index);
            const textAfter = part.substring((reportMatch.index || 0) + reportBlock.length);
            
            // Parse fields
            const getField = (name: string) => {
                const match = reportBlock.match(new RegExp(`${name}:\\s*(.*)`, 'i'));
                return match ? match[1].trim() : 'Unknown';
            };

            const title = getField('Case Title');
            const algorithm = getField('Primary Algorithm');
            const language = getField('Language');
            const difficulty = getField('Difficulty Level');
            const statusRaw = getField('Investigation Status');
            const risk = getField('Risk Summary');

            // Parse Status
            let statusColor = 'text-gray-400';
            if (statusRaw.includes('🟢')) statusColor = 'text-green-500';
            if (statusRaw.includes('🟡')) statusColor = 'text-yellow-500';
            if (statusRaw.includes('🔴')) statusColor = 'text-red-500';

            return (
                <React.Fragment key={i}>
                    {textBefore && <div dangerouslySetInnerHTML={{ __html: formatPartToHtml(textBefore) }} />}
                    <div className="bg-[#141414] border border-[#333] p-0 rounded-sm my-6 relative overflow-hidden group shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                         <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]"></div>
                         
                         <div className="p-4 border-b border-[#333] flex justify-between items-start bg-black/50">
                            <div>
                                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">EVIDENCE RECORD</div>
                                <h2 className="text-lg font-bold text-[#FFD700] font-mono tracking-wider">{title}</h2>
                            </div>
                            <div className={`text-xs border border-[#333] px-3 py-1 bg-black rounded-sm font-bold ${statusColor}`}>
                                {statusRaw}
                            </div>
                         </div>
                         
                         <div className="p-4 grid grid-cols-2 gap-4 text-xs font-mono text-gray-400 border-b border-[#333]">
                             <div>
                                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Primary Algo</span>
                                <span className="text-white">{algorithm}</span>
                             </div>
                             <div>
                                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Language</span>
                                <span className="text-white">{language}</span>
                             </div>
                             <div>
                                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Difficulty</span>
                                <span className="text-white">{difficulty}</span>
                             </div>
                             <div>
                                <span className="block text-[#FF3B3B] text-[9px] uppercase tracking-widest mb-1">Risk Factor</span>
                                <span className="text-white truncate">{risk}</span>
                             </div>
                         </div>
                         
                         <div className="p-4 bg-[#0a0a0a]">
                            <span className="text-[10px] text-[#FF3B3B] uppercase font-bold block mb-2">Risk Summary</span>
                            <p className="text-sm text-gray-300 italic">"{risk}"</p>
                         </div>
                    </div>
                    {textAfter && <div dangerouslySetInnerHTML={{ __html: formatPartToHtml(textAfter) }} />}
                </React.Fragment>
            );
        }

        // TEXT BLOCKS - Check for CASE STATS section
        // Regex looks for "6️⃣ Case Stats" or similar
        const statsMatch = part.match(/(6️⃣\s*Case Stats[\s\S]*?)(?=##|$)/);
        
        if (statsMatch) {
            const statsBlock = statsMatch[0];
            const textBefore = part.substring(0, statsMatch.index);
            const textAfter = part.substring((statsMatch.index || 0) + statsBlock.length);

            // Extract Time and Space
            const timeMatch = statsBlock.match(/Time Complexity:[\s\*]*([^\n]*)/i);
            const spaceMatch = statsBlock.match(/Space Complexity:[\s\*]*([^\n]*)/i);
            const timeVal = timeMatch ? timeMatch[1].replace(/\*\*/g, '').trim() : 'Unknown';
            const spaceVal = spaceMatch ? spaceMatch[1].replace(/\*\*/g, '').trim() : 'Unknown';

            return (
                <React.Fragment key={i}>
                    {textBefore && <div dangerouslySetInnerHTML={{ __html: formatPartToHtml(textBefore) }} />}
                    <ComplexityDashboard time={timeVal} space={spaceVal} />
                    {textAfter && <div dangerouslySetInnerHTML={{ __html: formatPartToHtml(textAfter) }} />}
                </React.Fragment>
            );
        }

        // Standard Text Block (No Stats)
        return (
          <div key={i} dangerouslySetInnerHTML={{ __html: formatPartToHtml(part) }} />
        );
      })}

      {suggestions.length > 0 && onSuggestionClick && (
        <div className="pt-8 border-t border-[#333] mt-6 flex flex-wrap gap-4">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSuggestionClick(s)}
              className="group relative px-5 py-3 bg-[#1a1a1a] overflow-hidden rounded-sm border border-[#333] hover:border-[#FFD700] transition-all"
            >
              <div className="absolute inset-0 w-0 bg-[#FFD700] opacity-10 group-hover:w-full transition-all duration-300"></div>
              <div className="relative flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FFD700]">
                 <span className="text-[#FF3B3B] group-hover:translate-x-1 transition-transform">▶</span> 
                 {s}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;