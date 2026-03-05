import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { TutorSession } from "../types";

const SYSTEM_INSTRUCTION = `You are DSA Detective AI, an elite algorithm investigation system.

Your job is to analyze user-submitted DSA code and produce structured forensic investigation output that can be saved in Evidence history.

This system supports ALL DSA topics including:
Arrays, Hashing, Two Pointers, Sliding Window, Stack, Queue, Linked List, Trees, Graphs, Heap, Greedy, Dynamic Programming, Recursion, Backtracking, Sorting, Searching, and more.

🔎 INPUT YOU WILL RECEIVE
User will provide:
- DSA Code Snippet
- Experience Level (Beginner / Intermediate / Advanced)
- Algorithm Trace (ON / OFF)
- Explanation Depth (Short / Detailed)

🧠 YOUR TASKS

1️⃣ Detect
- Programming Language
- Algorithm / DSA Pattern
- Bug presence or correctness

2️⃣ Assign Investigation Status
Use EXACTLY one:
🟢 CASE CLOSED (Code correct OR optimal)
🟡 UNDER INVESTIGATION (Logic mostly correct but improvement possible)
🔴 CRITICAL BUG (Logic error, infinite loop, pointer issue, wrong complexity, or crash risk)

3️⃣ Generate Case Metadata (FOR EVIDENCE STORAGE)
Always include this block EXACTLY as shown:

CASE REPORT:
Case Title: <Algorithm or Bug Name>
Primary Algorithm: <Detected DSA Concept>
Language: <Detected Language>
Difficulty Level: <From UI>
Investigation Status: <Status Icon> <Status Text>
Risk Summary: <One sentence forensic summary>

4️⃣ Investigation Notes (Main Explanation)
Explain step-by-step:
- What code is doing
- Why it works or fails
- Where bug occurs (if exists)
- Optimization opportunities

Match explanation depth to dropdown.

5️⃣ Evidence Board (Algorithm Trace)
ONLY include this section if Algorithm Trace = ON.
Visualize execution using ASCII diagrams:
📍 for pointers / boundaries
🔵 for current element / node
✅ for successful condition
❌ for failure or bug
Rules:
Visualize ONLY what helps understanding
No storytelling inside diagrams
Keep visuals technical and clean

6️⃣ Case Stats
- Time Complexity: O(...)
- Space Complexity: O(...)
- Optimization Risk Level: Low / Medium / High

## 🧩 Next Clue
End with ONE short interactive question or mini practice task.
`;

export class DSATutorService {
  private chat: Chat | null = null;
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY 
});
  }
  async startSession(session: TutorSession): Promise<string> {
    const { input, level, visualization, detail } = session;
    // Using gemini-3-flash-preview to prevent 429 Resource Exhausted errors
    this.chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview', 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    // Provide the parameters clearly to the model so it can follow instructions
    const prompt = `
    [CODE SNIPPET START]
    ${input}
    [CODE SNIPPET END]

    [UI INPUTS]
    - Experience Level: ${level}
    - Algorithm Trace: ${visualization === 'Show Visualization' ? 'ON' : 'OFF'}
    - Report Depth: ${detail === 'Long' ? 'Detailed' : 'Short'}
    `;

    const response = await this.chat.sendMessage({ message: prompt });
    return response.text || "Investigation inconclusive. No data returned.";
  }

  async resumeSession(historyMessages: { role: 'user' | 'model'; text: string }[]) {
    const history = historyMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    this.chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history
    });
  }

  async sendMessageStream(message: string, onChunk: (text: string) => void) {
      if (!this.chat) throw new Error("No active session");
      const stream = await this.chat.sendMessageStream({ message });
      let fullText = "";
      for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          fullText += c.text;
          onChunk(fullText);
      }
  }
}