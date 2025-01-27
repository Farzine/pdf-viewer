"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  BsArrowClockwise,
  BsChevronLeft,
  BsChevronRight,
  BsDownload,
  BsSearch,
  BsThreeDotsVertical,
  BsUpload,
  BsZoomIn,
  BsZoomOut,
  BsPencilSquare,
  BsEraser,
} from "react-icons/bs";
import { FaBars } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type TabMode = "pdf" | "summary";

/* For storing highlight overlays */
interface HighlightOverlay {
  id: number;
  page: number;
  color: string;
  top: number;
  left: number;
  width: number;
  height: number;
  text: string;
}

/* For storing text boxes placed on the PDF */
interface TextBoxOverlay {
  id: number;
  page: number;
  x: number;
  y: number;
  content: string;
}

/* For a floating input (temporary) when user clicks in "Add Text" mode */
interface TempTextInput {
  page: number;
  x: number;
  y: number;
  value: string;
  show: boolean;
}

interface IHighlight {
  content: {
    text?: string;
    image?: string;
  };
  position: {
    boundingRect: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
      pageNumber: number;
    };
    rects: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
    }>;
    pageNumber: number;
  };
  comment?: string;
  id: string;
}

const LeftPanel: React.FC = () => {
  // PDF states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  // UI states
  const [showSidebar, setShowSidebar] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1.6);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [rotation, setRotation] = useState<number>(0);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabMode>("pdf");

  // Refs
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageDivRefs = useRef<HTMLDivElement[]>([]);

  // Overlays for highlighting and text
  const [highlights, setHighlights] = useState<HighlightOverlay[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBoxOverlay[]>([]);

  // States for "Add Text" or "Erase" modes
  const [isAddingText, setIsAddingText] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  // We'll store a single floating text input
  const [tempTextInput, setTempTextInput] = useState<TempTextInput>({
    page: 0,
    x: 0,
    y: 0,
    value: "",
    show: false,
  });
  const tempInputRef = useRef<HTMLInputElement>(null);

  // Text selection popup
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [selectionText, setSelectionText] = useState("");
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [showHighlightColors, setShowHighlightColors] = useState(false);

  // PDF Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPdfFile(file);
      setPageNumber(1);
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
      // Reset tab to PDF view if user re-uploads
      setActiveTab("pdf");
    }
  };

  //Called when the PDF loads successfully
  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
  };

  // Toggle the page-list sidebar
  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  // Page navigation
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

  //Zoom in/out
  const handleZoomIn = () => setZoom((prev) => prev + 0.1);
  const handleZoomOut = () =>
    setZoom((prev) => (prev > 0.2 ? prev - 0.1 : prev));

  //3-dot menu
  const toggleMenu = () => setShowMenu((prev) => !prev);

  // Rotation of pdf
  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateAnticlockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  //Search bar
  const toggleSearch = () => setShowSearch((prev) => !prev);

  //Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
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

  //Close search bar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
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

  // Text Selection
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // If we're adding text or erasing, skip text selection
      if (isAddingText || isErasing) return;

      const selection = window.getSelection();
      if (!selection) return;
      const selectedText = selection.toString() || "";
      if (selectedText.trim().length > 0) {
        setSelectionText(selectedText.trim());
        setShowSelectionPopup(true);

        // We get bounding rect of the selection to position the popup
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          // Calculate position relative to the PDF container
          const containerRect = document
            .querySelector(".pdf-container")
            ?.getBoundingClientRect();
          if (containerRect) {
            setPopupX(rect.x - containerRect.left);
            setPopupY(rect.y - containerRect.top - 40); // Adjust as needed
          } else {
            setPopupX(rect.x);
            setPopupY(window.scrollY + rect.y - 40);
          }
        }
      } else {
        // No text selected => hide popup
        setShowSelectionPopup(false);
        setSelectionText("");
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isAddingText, isErasing]);

  // Close the popup if user clicks outside the popup itself
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowSelectionPopup(false);
      }
    }
    if (showSelectionPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSelectionPopup]);

  /**
   * IntersectionObserver for main PDF
   */
  useEffect(() => {
    if (!pdfUrl || numPages < 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = pageDivRefs.current.findIndex(
              (div) => div === entry.target
            );
            if (index >= 0) {
              setPageNumber(index + 1);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.5,
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
   * Whenever pageNumber changes, scroll that page into view
   */
  useEffect(() => {
    if (!pdfUrl || numPages < 1) return;
    const targetDiv = pageDivRefs.current[pageNumber - 1];
    if (targetDiv) {
      targetDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pageNumber, pdfUrl, numPages]);

  /**
   * Auto-scroll sidebar thumbnail
   */
  useEffect(() => {
    if (showSidebar && thumbRefs.current[pageNumber - 1]) {
      thumbRefs.current[pageNumber - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [showSidebar, pageNumber]);

  /**
   * Cleanup object URL
   */
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Tab switching
  const switchToPdf = () => setActiveTab("pdf");
  const switchToSummary = () => setActiveTab("summary");

  // Text selection popup actions
  const handleExplainText = () => {
    console.log("Explain text:", selectionText);
    setShowSelectionPopup(false);
  };

  const handleChatWithAI = () => {
    console.log("Chat with AI about:", selectionText);
    setShowSelectionPopup(false);
  };

  const handleSummarizeText = () => {
    console.log("Summarize text:", selectionText);
    setShowSelectionPopup(false);
  };

  // Toggle the highlight color row
  const handleHighlightClick = () => {
    setShowHighlightColors((prev) => !prev);
  };

  // Actually apply a highlight color
  const handleHighlightColor = (color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount < 1) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Identify which page the highlight belongs to
    let pageIndex = pageNumber - 1;
    let bestDist = Infinity;
    const centerY = rect.y + rect.height / 2;
    const centerX = rect.x + rect.width / 2;

    pageDivRefs.current.forEach((div, i) => {
      const divRect = div?.getBoundingClientRect();
      if (!divRect) return;
      if (
        centerX >= divRect.left &&
        centerX <= divRect.right &&
        centerY >= divRect.top &&
        centerY <= divRect.bottom
      ) {
        pageIndex = i;
        bestDist = 0;
      } else {
        const dx = centerX - (divRect.left + divRect.width / 2);
        const dy = centerY - (divRect.top + divRect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          pageIndex = i;
        }
      }
    });

    const pageContainer = pageDivRefs.current[pageIndex];
    if (!pageContainer) return;
    const containerRect = pageContainer.getBoundingClientRect();

    const overlayLeft = rect.left - containerRect.left;
    const overlayTop = rect.top - containerRect.top;
    const overlayWidth = rect.width;
    const overlayHeight = rect.height;

    const newHighlight: HighlightOverlay = {
      id: Date.now(),
      page: pageIndex + 1,
      color,
      top: overlayTop,
      left: overlayLeft,
      width: overlayWidth,
      height: overlayHeight,
      text: selectionText,
    };

    setHighlights((prev) => [...prev, newHighlight]);
    console.log(
      `Highlighting text: "${selectionText}" on page ${
        pageIndex + 1
      } with color ${color}`
    );

    setShowHighlightColors(false);
    setShowSelectionPopup(false);
    setSelectionText("");
    selection.removeAllRanges();
  };

  // Add Text & Floating Input
  const toggleAddTextMode = () => {
    setIsAddingText((prev) => !prev);
    setIsErasing(false);
    setShowSelectionPopup(false);
    // hide any open floating input
    setTempTextInput({ page: 0, x: 0, y: 0, value: "", show: false });
  };

  //If user clicks on PDF page while isAddingText = true => show input box
  const handlePageClickForText = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    if (!isAddingText) return;

    // If there's already an open input, finalize or discard it
    if (tempTextInput.show) {
      finalizeTempInput();
    }

    const containerRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;

    setTempTextInput({
      page: pageIndex,
      x: clickX,
      y: clickY,
      value: "",
      show: true,
    });
    setTimeout(() => {
      tempInputRef.current?.focus();
    }, 50);
  };

  /**
   * Clicking outside the input or pressing Enter finalizes
   */
  const finalizeTempInput = () => {
    if (!tempTextInput.show) return;
    const content = tempTextInput.value.trim();
    if (content.length > 0) {
      // Create a new text box
      const newBox: TextBoxOverlay = {
        id: Date.now(),
        page: tempTextInput.page,
        x: tempTextInput.x,
        y: tempTextInput.y,
        content,
      };
      setTextBoxes((prev) => [...prev, newBox]);
    }
    // Hide the input
    setTempTextInput({ page: 0, x: 0, y: 0, value: "", show: false });
  };

  /**
   * If user clicks outside the floating input, finalize
   */
  const floatingInputContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        floatingInputContainerRef.current &&
        !floatingInputContainerRef.current.contains(e.target as Node)
      ) {
        finalizeTempInput();
      }
    }
    if (tempTextInput.show) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempTextInput.show]);

  // Eraser Mode
  const toggleEraserMode = () => {
    setIsErasing((prev) => !prev);
    setIsAddingText(false);
    setShowSelectionPopup(false);
    // hide floating input if any
    setTempTextInput({ page: 0, x: 0, y: 0, value: "", show: false });
  };

  /**
   * If user clicks a highlight or text box while erasing => remove that overlay
   */
  const handleHighlightClickErase = (id: number) => {
    if (!isErasing) return;
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleTextBoxClickErase = (id: number) => {
    if (!isErasing) return;
    setTextBoxes((prev) => prev.filter((tb) => tb.id !== id));
  };

  // Color mapping for highlights
  const colorMap: { [key: string]: { r: number; g: number; b: number } } = {
    yellow: { r: 1, g: 1, b: 0 },
    green: { r: 0, g: 1, b: 0 },
    pink: { r: 1, g: 0.6, b: 0.8 },
    blue: { r: 0, g: 0, b: 1 },
    red: { r: 1, g: 0, b: 0 },
    "rgb(255,200,0)": { r: 255 / 255, g: 200 / 255, b: 0 / 255 },
  };

  const handleDownload = async () => {
    if (!pdfFile) {
      alert("No PDF file to download.");
      return;
    }

    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

      // Process highlights
      highlights.forEach((highlight) => {
        const page = pdfDoc.getPage(highlight.page - 1);
        const { width, height } = page.getSize();
        let { left, top, width: w, height: h } = highlight;

        // Convert color
        const color = colorMap[highlight.color] || { r: 1, g: 1, b: 0 };

        // Adjust coordinates based on rotation
        let x, y;
        switch (rotation) {
          case 90:
            x = height - top - h;
            y = left;
            [w, h] = [h, w]; // Swap dimensions
            break;
          case 180:
            x = width - left - w;
            y = height - top - h;
            break;
          case 270:
            x = top;
            y = width - left - w;
            [w, h] = [h, w]; // Swap dimensions
            break;
          default: // 0 degrees
            x = left;
            y = height - top - h;
        }

        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          color: rgb(color.r, color.g, color.b),
          opacity: 0.5,
        });
      });

      // Process text boxes
      textBoxes.forEach((box) => {
        const page = pdfDoc.getPage(box.page - 1);
        const { width, height } = page.getSize();
        let { x, y } = box;

        // Adjust coordinates based on rotation
        switch (rotation) {
          case 90:
            [x, y] = [height - y, x];
            break;
          case 180:
            [x, y] = [width - x, height - y];
            break;
          case 270:
            [x, y] = [y, width - x];
            break;
          default:
            y = height - y;
        }

        page.drawText(box.content, {
          x,
          y,
          size: 12,
          font,
          color: rgb(0, 0, 0), // Default black text
        });
      });

      // Apply rotation to all pages
      pdfDoc.getPages().forEach((page) => {
        page.setRotation(degrees(rotation));
      });

      // Trigger download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "annotated.pdf";
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error during PDF download:", error);
      alert("An error occurred while downloading the PDF.");
    }
  };

  return (
    <div className="relative flex flex-col w-full h-full border-r border-gray-200 pdf-container">
      {/* -- Tab Buttons at top */}
      <div className="flex justify-between space-x-4 border-b bg-white px-3 py-1 items-center">
        <div className="">
          <button
            className={`text-sm font-medium px-4 py-1 ${
              activeTab === "pdf"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-600"
            }`}
            onClick={switchToPdf}
          >
            PDF file
          </button>
          <button
            className={`text-sm font-medium px-4 py-1 ${
              activeTab === "summary"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-600"
            }`}
            onClick={switchToSummary}
          >
            Summary
          </button>
        </div>
        {pdfUrl ? (
          <label className="flex items-end justify-end space-x-2 px-3 py-2 bg-gray-200 text-gray-600 rounded cursor-pointer">
            <BsUpload className="w-5 h-5" />
            <span>Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
          </label>
        ) : (
          <></>
        )}
      </div>

      {activeTab === "pdf" ? (
        <>
          {/* -- Top Toolbar -- */}
          <div className="h-12 flex items-center justify-between px-3 border-b bg-white">
            {/* Left: Sidebar toggle + page nav */}
            <div className="flex items-center space-x-3 text-gray-600">
              <button
                onClick={toggleSidebar}
                className="p-1 hover:bg-gray-100 rounded"
                title="Show Page Sidebar"
              >
                <FaBars className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePageUp}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Previous Page"
                >
                  <BsChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  className="border border-gray-300 rounded w-12 text-center text-sm focus:outline-none"
                  value={pageNumber}
                  onChange={handlePageNumberChange}
                />
                <span className="text-sm text-gray-600">/ {numPages}</span>
                <button
                  onClick={handlePageDown}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Next Page"
                >
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
                <button
                  onClick={toggleSearch}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Search"
                >
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
              {/* Add Text toggle */}
              <button
                onClick={toggleAddTextMode}
                className={`text-xs px-2 py-1 rounded border hover:bg-gray-100 flex items-center gap-1 ${
                  isAddingText ? "bg-yellow-100 border-yellow-300" : ""
                }`}
                title="Add text to PDF (click on the page)"
              >
                <BsPencilSquare className="w-4 h-4" />
              </button>

              {/* Eraser toggle */}
              <button
                onClick={toggleEraserMode}
                className={`text-xs px-2 py-1 rounded border hover:bg-gray-100 flex items-center gap-1 ${
                  isErasing ? "bg-red-100 border-red-300" : ""
                }`}
                title="Erase highlights or text boxes"
              >
                <BsEraser className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Zoom Out"
                >
                  <BsZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Zoom In"
                >
                  <BsZoomIn className="w-5 h-5" />
                </button>
              </div>
              {/* 3-dot menu */}
              <div className="relative">
                <button
                  onClick={toggleMenu}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="More Options"
                >
                  <BsThreeDotsVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg text-sm z-50">
                    <button
                      onClick={handleDownload}
                      className=" w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <BsDownload />
                      <span>Download</span>
                    </button>
                    <div className="relative group">
                      <button className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2">
                        <BsChevronRight className="w-4 h-4" />
                        <span>Rotate</span>
                      </button>
                      <div className="absolute right-0 top-0 mt-0 ml-6 w-32 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-xs">
                        <button
                          onClick={rotateClockwise}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <BsArrowClockwise />
                          <span>Clockwise</span>
                        </button>
                        <button
                          onClick={rotateAnticlockwise}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <BsArrowClockwise className="transform -rotate-90" />
                          <span>Anticlockwise</span>
                        </button>
                      </div>
                    </div>
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
                  <span className="text-sm font-semibold text-gray-700">
                    Pages
                  </span>
                  <button
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <IoMdClose className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="overflow-auto h-full pt-12">
                  <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                    {Array.from({ length: numPages }, (_, i) => {
                      const pageIndex = i + 1;
                      const isActive = pageIndex === pageNumber;
                      return (
                        <div
                          key={pageIndex}
                          ref={(el) => {
                            if (el) thumbRefs.current[i] = el;
                          }}
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
                          <p className="text-xs text-gray-500 mt-1 items-center justify-center flex">
                            Page {pageIndex}
                          </p>
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
                    // Wrap each page in a relative container so we can place overlays
                    <div
                      key={pg}
                      ref={(el) => {
                        if (el) pageDivRefs.current[index] = el;
                      }}
                      className="relative flex flex-col items-center my-4"
                      onClick={(e) => {
                        // If adding text or erasing, handle that
                        if (isErasing) return; // don't place text
                        handlePageClickForText(e, pg);
                      }}
                    >
                      <Page
                        pageNumber={pg}
                        scale={zoom}
                        rotate={rotation}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}

                        // Keeping renderTextLayer as default to enable text selection
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Page {pg} of {numPages}
                      </p>

                      {/** Render highlight overlays for this page */}
                      {highlights
                        .filter((h) => h.page === pg)
                        .map((h) => (
                          <div
                            key={h.id}
                            className={`absolute opacity-70 z-20 ${
                              isErasing
                                ? "cursor-pointer"
                                : "pointer-events-none"
                            }`}
                            style={{
                              top: h.top,
                              left: h.left,
                              width: h.width,
                              height: h.height,
                              backgroundColor: h.color,
                            }}
                            title={h.text}
                            onClick={() => handleHighlightClickErase(h.id)}
                          />
                        ))}

                      {/** Render text boxes for this page */}
                      {textBoxes
                        .filter((tb) => tb.page === pg)
                        .map((tb) => (
                          <div
                            key={tb.id}
                            className={`absolute bg-yellow-100 border border-yellow-300 rounded px-2 py-1 text-xs z-20 ${
                              isErasing ? "cursor-pointer" : ""
                            }`}
                            style={{
                              top: tb.y,
                              left: tb.x,
                            }}
                            onClick={() => handleTextBoxClickErase(tb.id)}
                          >
                            {tb.content}
                          </div>
                        ))}

                      {/** If this page has the floating text input */}
                      {tempTextInput.show && tempTextInput.page === pg && (
                        <div
                          ref={floatingInputContainerRef}
                          className="absolute"
                          style={{
                            top: tempTextInput.y,
                            left: tempTextInput.x,
                          }}
                        >
                          <input
                            ref={tempInputRef}
                            type="text"
                            className="border border-gray-400 rounded px-1 text-xs bg-white"
                            value={tempTextInput.value}
                            onChange={(e) =>
                              setTempTextInput((prev) => ({
                                ...prev,
                                value: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                finalizeTempInput();
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </Document>
            )}

            {/* Text selection popup */}
            {showSelectionPopup && selectionText && (
              <div
                ref={popupRef}
                className="absolute z-50 bg-white border border-gray-300 rounded shadow-md text-sm p-2"
                style={{ top: popupY, left: popupX }}
              >
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Selected Text:
                </p>
                <p className="text-xs text-gray-700 italic mb-2 break-all max-w-[150px]">
                  {selectionText}
                </p>

                <div className="flex flex-col space-y-1 w-40">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600"
                    onClick={handleExplainText}
                  >
                    Explain
                  </button>
                  <button
                    className="bg-indigo-500 text-white px-2 py-1 text-xs rounded hover:bg-indigo-600"
                    onClick={handleChatWithAI}
                  >
                    Chat with AI
                  </button>
                  <button
                    className="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600"
                    onClick={handleSummarizeText}
                  >
                    Summarize
                  </button>

                  {/* Highlight button toggles color choices */}
                  <div className="relative">
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 text-xs rounded hover:bg-yellow-600 w-full text-left"
                      onClick={handleHighlightClick}
                    >
                      Highlight
                    </button>
                    {showHighlightColors && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-md p-2 flex flex-wrap gap-1">
                        {/* Example color palette */}
                        {[
                          "yellow",
                          "green",
                          "pink",
                          "blue",
                          "red",
                          "rgb(255,200,0)",
                        ].map((col) => (
                          <button
                            key={col}
                            className="w-5 h-5 rounded-full border hover:opacity-80"
                            style={{ backgroundColor: col }}
                            onClick={() => handleHighlightColor(col)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // =============== If activeTab === "summary"
        <div className="flex-1 overflow-auto bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">AI-generated Summary</h2>
            {/* Right side: "Upload PDF" button */}
            <label className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-600 rounded cursor-pointer text-sm hover:bg-gray-300">
              <BsUpload className="w-4 h-4" />
              <span>Upload PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
            </label>
          </div>

          <p className="text-sm text-gray-700">
            This is a <strong>dummy summary</strong> of the PDF content.
            <br />
            (Imagine an AI model summarized the entire PDF here.)
          </p>
          <p className="text-sm text-gray-700 mt-2">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
            vel lorem vitae ligula faucibus blandit. In luctus, neque eget
            commodo dictum, quam arcu fermentum est, vel malesuada sapien elit
            sed purus. Pellentesque habitant morbi tristique senectus et netus
            et malesuada fames ac turpis egestas.
          </p>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;
