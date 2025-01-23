'use client'
import LeftPanel from "@/components/LeftPanel";
import { FC, useState } from "react";
import { BsThreeDots, BsGear, BsHandThumbsUp, BsHandThumbsDown, BsSearch, BsChevronUp, BsChevronDown } from "react-icons/bs";
import { CgMenuLeft, CgMenuRight } from "react-icons/cg";

const HomePage: FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = 3;
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(130);
  
    const handleZoomIn = () => {
        setZoomLevel((prev) => Math.min(200, prev + 10));
      };
    
      const handleZoomOut = () => {
        setZoomLevel((prev) => Math.max(50, prev - 10));
    };

      const handlePageChange = (newPage: number) => {
          if (newPage >= 1 && newPage <= totalPages) {
              setCurrentPage(newPage);
          }
      };

      const handleSidebarToggle = () => {
        setIsSidebarOpen(!isSidebarOpen);
      };

      const handleSearchToggle = () => {
        setIsSearchActive(!isSearchActive);
      };
  
    return (
      <div className="flex h-screen w-full overflow-hidden text-sm">
        {/* LEFT PANEL (PDF + toolbar) */}
        <LeftPanel />
        {/* RIGHT PANEL (Chat) */}
        <div className="w-full max-w-lg bg-white flex flex-col border border-gray-300 rounded shadow-sm">
          {/* Top bar with "Standard / High Quality" */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h2 className="font-medium text-gray-700">Chat</h2>
            <select className="border border-gray-300 rounded text-sm px-1 py-1 focus:outline-none">
              <option>Standard</option>
              <option>High Quality</option>
            </select>
          </div>
  
          {/* Main scrollable chat area */}
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* AI response bubble (light blue background, bullet points, etc.) */}
            <div className="bg-blue-50 p-4 rounded-md text-gray-800 shadow-sm">
              {/* Example bullet points and headings to match the screenshot */}
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>
                  The results showed that the best performance for the combinatorial model 
                  was a Top 1 accuracy of <strong>40.868%</strong> and a Top 2 accuracy 
                  of <strong>21.826%</strong>. For the ANN model, the Top 1 accuracy was 
                  <strong>40.803%</strong> and Top 2 accuracy was <strong>21.243%</strong>. 
                  Although these results were not ideal, they indicated that the methods were 
                  feasible for further exploration <span className="text-blue-500 font-medium">[4]</span>.
                </li>
              </ul>
  
              <h3 className="mt-4 font-semibold text-base">Step 8: Conclusion and Future Work</h3>
              <ul className="list-disc list-inside space-y-2 text-sm mt-2">
                <li>
                  The researchers concluded that while the accuracy of the models was not optimal, 
                  there is potential for improvement through further feature engineering and better 
                  handling of multiple categories. They suggested that future work should focus on 
                  these areas to enhance prediction accuracy 
                  <span className="text-blue-500 font-medium">[7]</span>.
                </li>
              </ul>
  
              <p className="text-sm mt-2">
                This step-by-step breakdown provides a clear understanding of the research process 
                undertaken in the paper, even for those without prior knowledge of the subject.
              </p>
  
              {/* Sources link */}
              <div className="mt-3 text-blue-600 text-sm font-medium cursor-pointer">
                7 Sources <span className="text-xs align-middle">▼</span>
              </div>
            </div>
  
            {/* Date under the bubble (as in screenshot) */}
            <div className="text-xs text-gray-400 pl-2">8 Jan 2025</div>
          </div>
  
          {/* Bar with "Save to Notebook", "Settings", Thumbs Up/Down */}
          <div className="flex items-center justify-between px-2 py-2 border-t bg-gray-50">
            <div className="flex items-center space-x-2">
              <button className="text-sm text-gray-700 border border-gray-300 px-2 py-1 rounded hover:bg-gray-100">
                Save to Notebook
              </button>
              {/* Settings icon */}
              <button className="border border-gray-300 p-2 rounded hover:bg-gray-100">
                <BsGear className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              {/* Thumbs up */}
              <button className="border border-gray-300 p-2 rounded hover:bg-gray-100">
                <BsHandThumbsUp className="h-4 w-4 text-gray-600" />
              </button>
              {/* Thumbs down */}
              <button className="border border-gray-300 p-2 rounded hover:bg-gray-100">
                <BsHandThumbsDown className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
  
          {/* Next row with the input placeholder "Generate summary... +13 more" */}
          <div className="px-2 py-2 border-t flex items-center bg-white">
            <input
              type="text"
              placeholder="Generate summary of this paper, Results of the paper, Concl"
              className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none"
            />
            <button className="text-sm text-gray-500 ml-2 hover:underline">+13 more</button>
          </div>
  
          {/* Bottom row with "Ask any question..." & "∑ MATH" button */}
          <div className="flex items-center border-t p-2">
            <input
              type="text"
              placeholder="Ask any question..."
              className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none"
            />
            <button className="ml-2 border border-gray-300 px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100">
              ∑ MATH
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default HomePage;