import React, { useState, useRef, useEffect } from "react";
import { AiOutlineGlobal } from "react-icons/ai";
import { FiMessageSquare, FiSend } from "react-icons/fi";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  time?: string;
}

interface Language {
  code: string;
  label: string;
}

interface Question {
  id: number;
  text: string;
  timestamp: string;
}

const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
];

const SUGGESTIONS = [
  "Generate summary of this paper",
  "Results of the paper",
  "Conclusions from the paper",
  "Explain Abstract of this paper",
  "What are the contributions of this paper",
  "Find Related Papers",
  "Explain the practical implications of this paper",
  "Summarise introduction of this paper",
  "Literature survey of this paper",
];

const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "The researchers collected data from the IEEE ISI World Cup 2019...",
      time: "Now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("en");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isHighQuality, setIsHighQuality] = useState(false);
  const [isSnippingMode, setIsSnippingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'myQuestions'>('general');
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [selection, setSelection] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 });
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Handle click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle snipping mode
  useEffect(() => {
    if (!isSnippingMode) return;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.3)';
    overlay.style.cursor = 'crosshair';
    overlay.style.zIndex = '9999';
    overlayRef.current = overlay;

    const handleMouseDown = (e: MouseEvent) => {
      setSelection({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY
      });
      
      const selectionBox = document.createElement('div');
      selectionBox.style.position = 'fixed';
      selectionBox.style.border = '2px dashed #2563eb';
      selectionBox.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
      selectionBox.style.pointerEvents = 'none';
      selectionBox.id = 'selection-box';
      overlay.appendChild(selectionBox);

      const handleMouseMove = (e: MouseEvent) => {
        setSelection(prev => ({
          ...prev,
          endX: e.clientX,
          endY: e.clientY
        }));

        const left = Math.min(e.clientX, selection.startX);
        const top = Math.min(e.clientY, selection.startY);
        const width = Math.abs(e.clientX - selection.startX);
        const height = Math.abs(e.clientY - selection.startY);

        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Get final coordinates
        const rect = {
          left: Math.min(selection.startX, selection.endX),
          top: Math.min(selection.startY, selection.endY),
          width: Math.abs(selection.endX - selection.startX),
          height: Math.abs(selection.endY - selection.startY),
        } as DOMRect;
        
        setSelectionRect(rect);
        handleSnippingComplete(rect);
        cleanupSnippingMode();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    overlay.addEventListener('mousedown', handleMouseDown);
    document.body.appendChild(overlay);

    return () => cleanupSnippingMode();
  }, [isSnippingMode, selection]);

  const cleanupSnippingMode = () => {
    if (overlayRef.current) {
      document.body.removeChild(overlayRef.current);
      overlayRef.current = null;
    }
    setIsSnippingMode(false);
  };

  const handleSnippingComplete = (rect: DOMRect) => {
    // Here you would normally capture the screen area and process the image
    // For demonstration, we'll just show the coordinates
    const newMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: `Math formula snipped from area: 
        X: ${rect.left}, Y: ${rect.top}, 
        Width: ${rect.width}, Height: ${rect.height}`,
      time: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText("");
    
    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Explanation for formula in selected area:
          This is a sample explanation for the formula located at:
          X: ${rect.left}, Y: ${rect.top}, 
          Width: ${rect.width}, Height: ${rect.height}`,
        time: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: inputText.trim(),
      time: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    // Add to myQuestions
    const newQuestion: Question = {
      id: Date.now(),
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
    setMyQuestions(prev => [newQuestion, ...prev]);

    setMessages(prev => [...prev, newMessage]);
    setInputText("");
    setShowSuggestions(false);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Response to: ${newMessage.content}`,
        time: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleMathSnip = () => {
    setIsSnippingMode(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <FiMessageSquare className="text-orange-500" size={20} />
          <span className="font-medium">Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <AiOutlineGlobal className="text-gray-600" />
            <select
              className="border-none text-sm focus:outline-none"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.code}
                </option>
              ))}
            </select>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Quality Toggle */}
      <div className="flex justify-center py-2 border-b">
        <div className="inline-flex rounded-full bg-gray-100 p-0.5">
          <button
            className={`px-4 py-1 rounded-full transition-all duration-200 ${
              !isHighQuality ? "bg-white shadow" : "text-gray-500"
            }`}
            onClick={() => setIsHighQuality(false)}
          >
            Standard
          </button>
          <button
            className={`px-4 py-1 flex items-center gap-1 transition-all duration-200 ${
              isHighQuality ? "bg-white shadow" : "text-gray-500"
            }`}
            onClick={() => setIsHighQuality(true)}
          >
            High Quality
            <span className="text-gray-400">🔒</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === "assistant" 
                  ? "bg-blue-50" 
                  : "bg-white shadow-sm"
              }`}
            >
              <div className="text-sm">{message.content}</div>
              {message.time && (
                <div className="text-xs text-gray-500 mt-2">{message.time}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="relative">
          {showSuggestions && (
            <div 
              ref={suggestionsRef}
              className="absolute bottom-full left-0 right-0 bg-white border shadow-lg rounded-t-lg"
            >
              <div className="p-3 border-b">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <button
                      className={`px-2 py-1 ${
                        activeTab === 'general'
                          ? 'text-blue-500 border-b-2 border-blue-500'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('general')}
                    >
                      General ({SUGGESTIONS.length})
                    </button>
                    <button
                      className={`px-2 py-1 ${
                        activeTab === 'myQuestions'
                          ? 'text-blue-500 border-b-2 border-blue-500'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('myQuestions')}
                    >
                      My questions ({myQuestions.length})
                    </button>
                  </div>
                  <span
                    className="text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={() => setShowSuggestions(false)}
                  >
                    esc ×
                  </span>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {activeTab === 'general' ? (
                  SUGGESTIONS.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => {
                        setInputText(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))
                ) : (
                  myQuestions.length > 0 ? (
                    myQuestions.map((question) => (
                      <div
                        key={question.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setInputText(question.text);
                          setShowSuggestions(false);
                        }}
                      >
                        <div>{question.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {question.timestamp}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500">
                      No previous questions yet
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            placeholder="Ask any question..."
            className="w-full p-3 pr-24 rounded-lg border focus:outline-none focus:border-blue-500"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (showSuggestions && e.target.value.trim() !== '') {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (inputText.trim() === '') {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
              if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <button 
              className={`text-gray-400 hover:text-gray-600 flex items-center gap-1 ${
                isSnippingMode ? 'text-blue-500' : ''
              }`}
              onClick={handleMathSnip}
              title={isSnippingMode ? "Cancel math snipping" : "Click to snip math formula"}
            >
              <span className="text-xl">Σ</span>
              <span className="text-sm">MATH</span>
            </button>
            <button
              onClick={handleSend}
              className="text-gray-400 hover:text-gray-600"
              title="Send Message"
            >
              <FiSend size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;