"use client";

import { useEffect, useRef, useState } from "react";

// Helper function to convert PDFNet.Filter -> Uint8Array
async function filterToUint8Array(PDFNet: any, filter: any): Promise<Uint8Array> {
  const filterReader = await PDFNet.FilterReader.create(filter);
  const chunks: number[] = [];
  const CHUNK_SIZE = 1024;

  while (true) {
    const chunk = await filterReader.read(CHUNK_SIZE);
    if (chunk === 0) {
      break;
    }
    chunks.push(...chunk);
  }
  return new Uint8Array(chunks);
}

export default function PDFViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);

  // State variables
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [allPageText, setAllPageText] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");

  useEffect(() => {
    if (!viewerRef.current) return;

    (async () => {
      // Dynamically import WebViewer
      const WebViewerModule = await import("@pdftron/webviewer");
      const WebViewer = WebViewerModule.default;

      // Initialize with fullAPI
      const instance = await WebViewer(
        {
          path: "lib",
          initialDoc:
            "https://purdueglobalwriting.center/wp-content/uploads/2020/09/apasampleresearchpaper-1.pdf",
          fullAPI: true,
        },
        viewerRef.current as HTMLDivElement
      );

      const { Core } = instance;
      const docViewer = Core.documentViewer;

      // When the document is loaded, extract text, images, and handle text selection
      docViewer.addEventListener("documentLoaded", async () => {
        console.log("Document loaded!");
        await extractFullText();
        await extractImages();
      });

      // Listen for text selection and store selected text
      docViewer.addEventListener("textSelected", (quads, text, pageNumber) => {
        console.log(`User selected text (Page ${pageNumber}):`, text);
        setSelectedText(text);
      });

      /**
       * Extract text from all pages using the WebViewer doc interface.
       */
      async function extractFullText() {
        const doc = docViewer.getDocument();
        const pageCount = docViewer.getPageCount();
        let combinedText = "";

        for (let i = 1; i <= pageCount; i++) {
          const pageText = await doc.loadPageText(i);
          combinedText += `\n-- Page ${i} --\n` + pageText;
        }
        setAllPageText(combinedText);
        console.log("All page text extracted.", combinedText);
      }

      /**
       * Extract images using PDFNet APIs.
       */
      async function extractImages() {
        const { PDFNet } = Core;
        await PDFNet.initialize();

        const pdfDoc = await docViewer.getDocument().getPDFDoc();
        await pdfDoc.initSecurityHandler();
        await pdfDoc.lock();

        try {
          const reader = await PDFNet.ElementReader.create();
          const images: string[] = [];

          for (let itr = await pdfDoc.getPageIterator(); await itr.hasNext(); itr.next()) {
            const page = await itr.current();
            reader.beginOnPage(page);
            await processElements(reader, images);
            reader.end();
          }

          setExtractedImages(images);
          console.log("Extracted images:", images);
        } finally {
          pdfDoc.unlock();
        }
      }

      /**
       * Recursively read elements on a page to find images and forms.
       */
      async function processElements(reader: any, images: string[]) {
        const { PDFNet } = Core;
        for (
          let element = await reader.next();
          element !== null;
          element = await reader.next()
        ) {
          const elementType = await element.getType();
          switch (elementType) {
            case PDFNet.Element.Type.e_image: {
              const xObj = await element.getXObject();
              if (!xObj) {
                console.warn("Skipping null XObject");
                break;
              }

              if (!(xObj instanceof PDFNet.Obj)) {
                console.warn("Skipping invalid XObject:", xObj);
                break;
              }

              // Extract image data
              const image = await PDFNet.Image.createFromObj(xObj);
              const filter = await image.getImageData();
              const byteArray = await filterToUint8Array(PDFNet, filter);
              const blob = new Blob([byteArray], { type: "image/png" });
              const imageUrl = URL.createObjectURL(blob);

              images.push(imageUrl);
              break;
            }
            case PDFNet.Element.Type.e_form: {
              reader.formBegin();
              await processElements(reader, images);
              reader.end();
              break;
            }
            default:
              break;
          }
        }
      }
    })();
  }, []);

  return (
    <div>
      <div className="webviewer" ref={viewerRef} />
    </div>
  );
}
