import React, { useState, useRef, useEffect } from 'react';
import { FamilyMember, LifeEvent } from '../types/family';
import {
  buildKnowledgeGraph,
  queryKnowledgeGraphRAG,
  CanvasWorkspace,
} from '../db/knowledgeGraphStore';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Volume2,
  Compass,
  ArrowRight,
  Layers,
  UserPlus,
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onAddMember: (memberData: any) => void;
  onEditMember: (memberData: any) => void;
  onLinkRelationship: (personAId: string, personBId: string, type: string) => void;
  onCreateWorkspace: (workspace: Omit<CanvasWorkspace, 'id' | 'createdAt'>) => void;
  onAddLifeEvent: (memberId: string, event: Omit<LifeEvent, 'id'>) => void;
  onSelectMember: (id: string | null) => void;
  onDeleteMember?: (id: string) => void;
  onClearAllRecords?: () => void;
  isReadOnly: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionsExecuted?: { name: string; details: string }[];
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  members,
  onAddMember,
  onEditMember,
  onLinkRelationship,
  onCreateWorkspace,
  onAddLifeEvent,
  onSelectMember,
  onDeleteMember,
  onClearAllRecords,
  isReadOnly,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Greetings. I am your Kinship Archive AI Genealogist. I have indexed the entire genealogical knowledge graph. You can speak or type to ask about ancestral histories, add relatives, edit archival vitals, or generate new generational canvas workspaces.',
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-stt-info-${Date.now()}`,
          sender: 'assistant',
          text: 'Speech recognition is not active in this browser iframe. You can type commands in the chat box below.',
          timestamp: new Date().toTimeString().slice(0, 5),
        },
      ]);
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
        setIsListening(false);
      }
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Execute Tool Actions returned by Gemini / Server
  const handleExecuteActions = (actions: any[]): { name: string; details: string }[] => {
    const executed: { name: string; details: string }[] = [];

    for (const act of actions) {
      const { name, args } = act;

      if (name === 'add_member' && !isReadOnly) {
        onAddMember(args);
        executed.push({
          name: 'Add Member',
          details: `Added ${args.firstName} ${args.lastName} (b. ${args.birthYear || '?'}) to database`,
        });
      } else if (name === 'edit_member' && !isReadOnly) {
        onEditMember(args);
        executed.push({
          name: 'Edit Member',
          details: `Updated record for member ID ${args.memberId}`,
        });
      } else if (name === 'link_relationship' && !isReadOnly) {
        onLinkRelationship(args.personAId, args.personBId, args.relationType);
        executed.push({
          name: 'Link Kinship',
          details: `Connected ${args.personAId} and ${args.personBId} (${args.relationType})`,
        });
      } else if (name === 'create_canvas_workspace') {
        const focal = members.find((m) => m.id === args.focalPersonId) || members[0];
        onCreateWorkspace({
          title: args.title || `${focal?.firstName || 'Lineage'} Generational Workspace`,
          description: args.description || `Workspace focusing on ${focal?.firstName || 'family'}`,
          focalPersonId: args.focalPersonId,
          includedNodeIds: members.map((m) => m.id), // or subset
          isDefault: false,
        });
        executed.push({
          name: 'Create Canvas Workspace',
          details: `Created workspace "${args.title}"`,
        });
      } else if (name === 'add_life_event' && !isReadOnly) {
        onAddLifeEvent(args.memberId, {
          year: args.year,
          title: args.title,
          description: args.description || '',
          location: args.location || '',
          category: args.category || 'other',
        });
        executed.push({
          name: 'Record Life Milestone',
          details: `Added "${args.title}" (${args.year})`,
        });
      } else if (name === 'highlight_lineage') {
        onSelectMember(args.memberId);
        executed.push({
          name: 'Highlight Lineage',
          details: `Focused canvas on lineage for member ID ${args.memberId}`,
        });
      } else if (name === 'delete_member' && !isReadOnly && onDeleteMember) {
        onDeleteMember(args.memberId);
        executed.push({
          name: 'Delete Member',
          details: `Removed member record from the family tree`,
        });
      } else if (name === 'clear_all_records' && !isReadOnly && onClearAllRecords) {
        onClearAllRecords();
        executed.push({
          name: 'Clear Canvas',
          details: 'Cleared all records to create a blank fresh canvas',
        });
      }
    }

    return executed;
  };

  // Submit User Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toTimeString().slice(0, 5),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // 1. Perform local Knowledge Graph RAG retrieval for relevant entity chunks
      const kg = buildKnowledgeGraph(members);
      const ragResults = queryKnowledgeGraphRAG(query, kg, 4);
      const ragContext = ragResults.map((r) => r.node.ragChunk).join('\n\n---\n\n');

      const memberList = members.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        birthYear: m.birthYear,
        occupation: m.occupation,
        generation: m.generation,
      }));

      // 2. Query Express Backend /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          ragContext,
          memberList,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const actionsExecuted = data.actions ? handleExecuteActions(data.actions) : [];

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || 'Request executed.',
        timestamp: new Date().toTimeString().slice(0, 5),
        actionsExecuted: actionsExecuted.length > 0 ? actionsExecuted : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Error contacting AI Assistant:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: `I encountered an issue processing your request: ${err.message}. Please ensure the full-stack server is active.`,
          timestamp: new Date().toTimeString().slice(0, 5),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-stone-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-800 text-amber-50 flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <span>AI Genealogist</span>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-sans font-semibold">
                RAG Graph
              </span>
            </h3>
            <p className="text-[11px] text-stone-500 font-serif">
              Conversational research & database actions
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2.5 bg-stone-50 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        {[
          'Who was the 1895 emigrant?',
          'Highlight Charles Montgomery',
          'Create workspace for Beatrice',
          'Add relative Liam born in 2012',
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200 rounded whitespace-nowrap transition-colors shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Flow */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-lg p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-stone-900 text-stone-50 rounded-br-none shadow-xs'
                  : 'bg-stone-100 text-stone-800 rounded-bl-none border border-stone-200 font-serif'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Render actions executed by AI */}
              {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-stone-200 font-sans space-y-1">
                  <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Database Action Executed:</span>
                  </div>
                  {msg.actionsExecuted.map((act, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] text-stone-700 bg-white/80 p-1.5 rounded border border-emerald-200"
                    >
                      <strong className="text-emerald-900">{act.name}:</strong> {act.details}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[10px] text-stone-400 mt-1 px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-stone-500 p-2 font-serif italic">
            <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            <span>Consulting Knowledge Graph & reasoning...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Voice Button */}
      <div className="p-3 bg-stone-100 border-t border-stone-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Speech Voice Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-md transition-colors border ${
              isListening
                ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                : 'bg-white text-stone-600 hover:text-stone-900 border-stone-300'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Click to talk (voice input)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            placeholder={isListening ? 'Listening to your voice...' : 'Ask question or instruct an action...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 text-xs p-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-800 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-stone-900 hover:bg-stone-800 text-white rounded-md disabled:opacity-40 transition-colors shadow-2xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="text-[10px] text-stone-500 font-serif text-center mt-1.5">
          Ask questions, say &quot;Add member...&quot;, or &quot;Create workspace for...&quot;
        </div>
      </div>
    </div>
  );
};
