"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  BsArrowClockwise,
  BsChevronLeft,
  BsChevronRight,
  BsDownload,
  BsFileEarmarkPdf,
  BsSearch,
  BsThreeDotsVertical,
  BsUpload,
  BsZoomIn,
  BsZoomOut,
} from "react-icons/bs";
import { FaBars } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { pdfjs, Document, Page } from "react-pdf";

// Point PDF.js to the worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const LeftPanel: React.FC = () => {
  // PDF states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  // UI states
  const [showSidebar, setShowSidebar] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1.3);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Refs for outside clicks
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // For text selection popup
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [selectionText, setSelectionText] = useState("");
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);

  // Refs for each page container so we can:
  //  - observe them with IntersectionObserver
  //  - scroll them into view on pageNumber change
  const pageDivRefs = useRef<HTMLDivElement[]>([]);

  /**
   * Handle PDF file upload
   */
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPdfFile(file);
      setPageNumber(1);

      // Create a local object URL
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
    }
  };

  /**
   * Called when the PDF loads successfully
   */
  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
  };

  /**
   * Toggle the page-list sidebar
   */
  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  /**
   * Page navigation (toolbar arrows / input)
   */
  const handlePageUp = () => {
    setPageNumber((prev) => (prev > 1 ? prev - 1 : prev));
  };
  const handlePageDown = () => {
    setPageNumber((prev) => (prev < numPages ? prev + 1 : prev));
  };
  const handlePageNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      setPageNumber(val);
    }
  };

  /**
   * Zoom in/out
   */
  const handleZoomIn = () => setZoom((prev) => prev + 0.1);
  const handleZoomOut = () => setZoom((prev) => (prev > 0.2 ? prev - 0.1 : prev));

  /**
   * 3-dot menu
   */
  const toggleMenu = () => setShowMenu((prev) => !prev);

  /**
   * Search bar
   */
  const toggleSearch = () => setShowSearch((prev) => !prev);

  /**
   * Close sidebar on outside click
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setShowSidebar(false);
      }
    };
    if (showSidebar) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSidebar]);

  /**
   * Close search bar on outside click
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };
    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  /**
   * Handle text selection popup
   */
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()?.toString() || "";
      if (selection && selection.trim().length > 0) {
        setSelectionText(selection);
        setShowSelectionPopup(true);

        // Place popup near the selection
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setPopupX(rect.x);
          setPopupY(window.scrollY + rect.y - 35);
        }
      } else {
        setShowSelectionPopup(false);
        setSelectionText("");
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  /**
   * IntersectionObserver to detect which page is currently in view.
   * This updates "pageNumber" so the toolbar and sidebar highlight remain in sync.
   */
  useEffect(() => {
    if (!pdfUrl || numPages < 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = pageDivRefs.current.findIndex((div) => div === entry.target);
            if (index >= 0) {
              setPageNumber(index + 1);
            }
          }
        });
      },
      {
        root: null, // viewport
        rootMargin: "0px",
        threshold: 0.5, // 50% visible
      }
    );

    pageDivRefs.current.forEach((div) => {
      if (div) observer.observe(div);
    });

    return () => {
      pageDivRefs.current.forEach((div) => {
        if (div) observer.unobserve(div);
      });
    };
  }, [pdfUrl, numPages]);

  /**
   * Whenever pageNumber changes (toolbar, sidebar click), we scroll that page into view.
   */
  useEffect(() => {
    if (!pdfUrl || numPages < 1) return;
    const targetDiv = pageDivRefs.current[pageNumber - 1];
    if (targetDiv) {
      targetDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pageNumber]);

  return (
    <div className="relative flex flex-col w-full h-full border-r border-gray-200">
      {/* -- Top Toolbar -- */}
      <div className="h-12 flex items-center justify-between px-3 border-b bg-white">
        {/* Left: Sidebar toggle + page nav */}
        <div className="flex items-center space-x-3 text-gray-600">
          <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded" title="Show Page Sidebar">
            <FaBars className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-1">
            <button onClick={handlePageUp} className="p-1 hover:bg-gray-100 rounded" title="Previous Page">
              <BsChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="number"
              className="border border-gray-300 rounded w-12 text-center text-sm focus:outline-none"
              value={pageNumber}
              onChange={handlePageNumberChange}
            />
            <span className="text-sm text-gray-600">/ {numPages}</span>
            <button onClick={handlePageDown} className="p-1 hover:bg-gray-100 rounded" title="Next Page">
              <BsChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle: search or icon + "Explain math & table" button */}
        <div ref={searchRef} className="flex items-center space-x-2">
          {showSearch ? (
            <div className="relative w-40">
              <input
                type="text"
                placeholder="Search..."
                className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:outline-none pr-8"
              />
              <button className="absolute inset-y-0 right-2 flex items-center text-gray-400">
                <BsSearch className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={toggleSearch} className="p-1 hover:bg-gray-100 rounded" title="Search">
              <BsSearch className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button
            className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
            title="Explain math & table"
          >
            Explain math & table
          </button>
        </div>

        {/* Right: Zoom + 3-dot menu */}
        <div className="flex items-center space-x-3 text-gray-600">
          <div className="flex items-center space-x-2">
            <button onClick={handleZoomOut} className="p-1 hover:bg-gray-100 rounded" title="Zoom Out">
              <BsZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:bg-gray-100 rounded" title="Zoom In">
              <BsZoomIn className="w-5 h-5" />
            </button>
          </div>
          {/* 3-dot menu */}
          <div className="relative">
            <button onClick={toggleMenu} className="p-1 hover:bg-gray-100 rounded" title="More Options">
              <BsThreeDotsVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg text-sm z-50">
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2">
                  <BsDownload />
                  <span>Download</span>
                </button>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2">
                  <BsArrowClockwise />
                  <span>Rotate</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -- Main PDF Area (scrollable) -- */}
      <div className="flex-1 overflow-auto relative bg-gray-50">
        {/* If NO PDF is loaded, show a centered overlay for uploading */}
        {!pdfUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
            <p className="text-gray-500 text-sm mb-2">No PDF uploaded</p>
            <label className="flex items-center space-x-2 px-3 py-2 bg-gray-200 text-gray-600 rounded cursor-pointer">
              <BsUpload className="w-5 h-5" />
              <span>Upload PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
            </label>
          </div>
        )}

        {/* Sidebar with thumbnails if PDF loaded */}
        {showSidebar && pdfUrl && (
          <div
            ref={sidebarRef}
            className="fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-gray-300 z-20"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-100 font-bold">
              <span className="text-sm font-semibold text-gray-700">Pages</span>
              <button onClick={toggleSidebar} className="p-1 hover:bg-gray-200 rounded">
                <IoMdClose className="w-5 h-5 text-gray-600" />
              </button>
           </div>

           <div className="overflow-auto h-full pt-12">
            <Document file={pdfUrl}>
              {Array.from({ length: numPages }, (_, i) => {
                const pageIndex = i + 1;
                const isActive = pageIndex === pageNumber;
                return (
                  <div
                    key={pageIndex}
                    onClick={() => setPageNumber(pageIndex)}
                    className={`p-2 px-5 border-b cursor-pointer ${
                      isActive ? "bg-gray-200" : "hover:bg-gray-100"
                    }`}
                  >
                    <Page
                      pageNumber={pageIndex}
                      scale={0.29} /* small scale for thumbnail */
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <p className="text-xs text-gray-500 mt-1 items-center justify-center flex">Page {pageIndex}</p>
                  </div>
                );
              })}
            </Document>
            </div>
          </div>
        )}
        

        {/* Main PDF rendering if pdfUrl is present */}
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => console.error("PDF load error:", err)}
          >
            {Array.from({ length: numPages }, (_, index) => {
              const pg = index + 1;
              return (
                <div
                  key={pg}
                  ref={(el) => {
                    // store ref to each page's container div
                    if (el) pageDivRefs.current[index] = el;
                  }}
                  className="flex flex-col items-center my-4"
                >
                  <Page
                    pageNumber={pg}
                    scale={zoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Page {pg} of {numPages}
                  </p>
                </div>
              );
            })}
          </Document>
        )}

        {/* Text selection popup */}
        {showSelectionPopup && (
          <div
            className="absolute bg-white border border-gray-300 rounded shadow-md text-sm p-2"
            style={{ top: popupY, left: popupX }}
          >
            <p className="text-xs font-semibold text-gray-600">Selected Text:</p>
            <p className="text-xs text-gray-700 italic mb-2 break-all max-w-[150px]">
              {selectionText}
            </p>
            <button className="bg-blue-500 text-white px-2 py-1 text-xs rounded mr-2 hover:bg-blue-600">
              Explain text
            </button>
            <button className="bg-green-500 text-white px-2 py-1 text-xs rounded mr-2 hover:bg-green-600">
              Summarize
            </button>
            <button className="bg-yellow-500 text-white px-2 py-1 text-xs rounded hover:bg-yellow-600">
              Highlight
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;