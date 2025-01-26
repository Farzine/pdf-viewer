"use client";
import ChatWidget from "@/components/ChatWidget";
import LeftPanel from "@/components/LeftPanel";
import { FC, useState } from "react";

const HomePage: FC = () => {
  const [showChat, setShowChat] = useState(true); // Set to true by default to match the image

  return (
    <div className="relative w-full h-screen bg-gray-100">
      <div className="flex h-full w-full">
        {/* LEFT PANEL (PDF Viewer) */}
        <div
          className={`bg-white border-r border-gray-200 transition-all duration-300 ${
            showChat ? "w-[65%]" : "w-full"
          }`}
        >
          <LeftPanel />
        </div>

        {/* RIGHT PANEL (Chat) */}
        <div
          className={`bg-white transition-all duration-300 ${
            showChat ? "w-[35%]" : "w-0"
          }`}
        >
          {showChat && <ChatWidget />}
        </div>
      </div>

      {/* Chat Toggle Button (only show when chat is hidden) */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 focus:outline-none"
        >
          Open Chat
        </button>
      )}
    </div>
  );
};

export default HomePage;