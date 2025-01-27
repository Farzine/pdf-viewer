import React, { useState, useRef, useEffect } from "react";
import { AiOutlineGlobal } from "react-icons/ai";
import { FiMessageSquare, FiSend } from "react-icons/fi";
import html2canvas from "html2canvas";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  /**
   * 'content' is text from user or assistant
   */
  content: string;
  /**
   * 'image' is optional base64 screenshot for snips
   */
  image?: string;
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
      content: "Hi there! How can I help you today?",
      time: "Now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("en");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isHighQuality, setIsHighQuality] = useState(false);

  // "Snipping" mode
  const [isSnippingMode, setIsSnippingMode] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // For suggestion tabs
  const [activeTab, setActiveTab] = useState<"general" | "myQuestions">(
    "general"
  );
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);

  // For collecting prompt about the snipped image
  const [pendingSnip, setPendingSnip] = useState<string | null>(null);
  const [snipPrompt, setSnipPrompt] = useState("");
  const [showSnipPromptModal, setShowSnipPromptModal] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Close suggestions on outside click
   */
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Scroll chat to bottom when messages change
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Snipping (Math capture) effect
   */
  useEffect(() => {
    if (!isSnippingMode) return;

    // Create an overlay covering the entire screen
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0,0,0,0.3)";
    overlay.style.cursor = "crosshair";
    overlay.style.zIndex = "9999";

    overlayRef.current = overlay;

    // We'll store the user's initial mouse-down position
    let startX = 0;
    let startY = 0;
    let selectionBox: HTMLDivElement | null = null;

    // Mouse down: create a selection box
    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;

      selectionBox = document.createElement("div");
      selectionBox.style.position = "fixed";
      selectionBox.style.border = "2px dashed #2563eb";
      selectionBox.style.backgroundColor = "rgba(37, 99, 235, 0.1)";
      selectionBox.style.pointerEvents = "none";
      selectionBox.id = "selection-box";
      overlay.appendChild(selectionBox);

      // Attach mousemove and mouseup
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    // Mouse move: update selection box position/dimensions
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectionBox) return;
      const currentX = moveEvent.clientX;
      const currentY = moveEvent.clientY;

      const left = Math.min(currentX, startX);
      const top = Math.min(currentY, startY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    };

    // Mouse up: finalize the snipping region
    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (!selectionBox) return;

      // Calculate final rectangle
      const currentX = upEvent.clientX;
      const currentY = upEvent.clientY;

      const rectLeft = Math.min(currentX, startX);
      const rectTop = Math.min(currentY, startY);
      const rectWidth = Math.abs(currentX - startX);
      const rectHeight = Math.abs(currentY - startY);

      const rect = {
        left: rectLeft,
        top: rectTop,
        width: rectWidth,
        height: rectHeight,
      } as DOMRect;

      // Done snipping
      handleSnippingComplete(rect);
      cleanupSnippingMode();
    };

    // Listen for mousedown on the overlay
    overlay.addEventListener("mousedown", handleMouseDown);

    // Insert the overlay into the DOM
    document.body.appendChild(overlay);

    // Cleanup if the effect ends or we exit snipping
    return () => cleanupSnippingMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSnippingMode]);

  /**
   * Cleanup function for snipping mode
   */
  const cleanupSnippingMode = () => {
    if (overlayRef.current) {
      document.body.removeChild(overlayRef.current);
      overlayRef.current = null;
    }
    setIsSnippingMode(false);
  };

  /**
   * Called when the user finishes selecting the area to snip
   */
  const handleSnippingComplete = async (rect: DOMRect) => {
    try {
      // If the user just clicked (no actual region), skip
      if (rect.width < 5 || rect.height < 5) {
        return;
      }

      // Capture entire screen as a canvas
      const fullCanvas = await html2canvas(document.body);

      // Crop out just the selected region
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = rect.width;
      croppedCanvas.height = rect.height;

      const ctx = croppedCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(
        fullCanvas,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );

      // Convert croppedCanvas to base64 data URL
      const dataURL = croppedCanvas.toDataURL("image/png");

      // Instead of immediately adding to chat, let's store it and show a prompt
      setPendingSnip(dataURL);
      setSnipPrompt("");
      setShowSnipPromptModal(true);

    } catch (error) {
      console.error("Snipping error:", error);
    }
  };

  /**
   * Confirm the snip prompt => create a user message w/ text + image
   */
  const handleConfirmSnip = () => {
    if (!pendingSnip) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: snipPrompt || "(No prompt provided)",
      image: pendingSnip,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setPendingSnip(null);
    setSnipPrompt("");
    setShowSnipPromptModal(false);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Received snip + prompt:\n"${newMessage.content}"\n(Image attached)`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  /**
   * Cancel the snip prompt => discard the image
   */
  const handleCancelSnip = () => {
    setPendingSnip(null);
    setSnipPrompt("");
    setShowSnipPromptModal(false);
  };

  /**
   * Standard "send" method for normal text chat
   */
  const handleSend = () => {
    if (!inputText.trim()) return;

    // Create user message
    const newMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: inputText.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Also store question in "My questions" tab
    const newQuestion: Question = {
      id: Date.now(),
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMyQuestions((prev) => [newQuestion, ...prev]);

    // Add user's message to chat
    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setShowSuggestions(false);

    // Simulate a dummy assistant response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Response to: ${newMessage.content}`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  /**
   * Toggle "snipping" mode for math formula
   */
  const handleMathSnip = () => {
    // If user clicks again while isSnippingMode = true, cancel
    if (isSnippingMode) {
      cleanupSnippingMode();
    } else {
      setIsSnippingMode(true);
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-white">
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
          {/* a simple placeholder arrow icon (optional) */}
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
            className={`px-4 py-1 flex rounded-full items-center gap-1 transition-all duration-200 ${
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
              {/* If the message has an image, show both text and image. */}
              {message.image ? (
                <>
                  {message.content && (
                    <div className="text-sm mb-2 whitespace-pre-line">
                      {message.content}
                    </div>
                  )}
                  <img
                    src={message.image}
                    alt="snipped formula"
                    className="max-w-full max-h-80 rounded"
                  />
                </>
              ) : (
                // Otherwise just show the text
                <div className="text-sm">{message.content}</div>
              )}
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
          {/* Suggestions Dropdown */}
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
                        activeTab === "general"
                          ? "text-blue-500 border-b-2 border-blue-500"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("general")}
                    >
                      General ({SUGGESTIONS.length})
                    </button>
                    <button
                      className={`px-2 py-1 ${
                        activeTab === "myQuestions"
                          ? "text-blue-500 border-b-2 border-blue-500"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("myQuestions")}
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
                {activeTab === "general" ? (
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
                ) : myQuestions.length > 0 ? (
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
                )}
              </div>
            </div>
          )}

          {/* Main input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask any question..."
            className="w-full p-3 pr-24 rounded-lg border focus:outline-none focus:border-blue-500"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // If user starts typing while suggestions are open, close them
              if (showSuggestions && e.target.value.trim() !== "") {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              // If input is empty, show suggestions
              if (inputText.trim() === "") {
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

          {/* Buttons to the right of input */}
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <button
              className={`text-gray-400 hover:text-gray-600 flex items-center gap-1 ${
                isSnippingMode ? "text-blue-500" : ""
              }`}
              onClick={handleMathSnip}
              title={
                isSnippingMode
                  ? "Cancel math snipping"
                  : "Click to snip math formula"
              }
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

      {/** Modal for Snip Prompt */}
      {showSnipPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">Add a prompt about your snip</h2>
            {pendingSnip && (
              <img
                src={pendingSnip}
                alt="Snipped preview"
                className="max-w-full max-h-40 mb-2 border"
              />
            )}
            <textarea
              value={snipPrompt}
              onChange={(e) => setSnipPrompt(e.target.value)}
              placeholder="Write something about the snipped image..."
              className="w-full border rounded p-2 h-24 focus:outline-none"
            />
            <div className="flex justify-end mt-3 gap-2">
              <button
                onClick={handleConfirmSnip}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Confirm
              </button>
              <button
                onClick={handleCancelSnip}
                className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
