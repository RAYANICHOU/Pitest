import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseQuestionText } from "./questionTextParser.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export { parseQuestionText };

export async function extractPdfQuestions(file, category, language = "en") {
  const bytes = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item) => "str" in item && item.str.trim())
        .map((item) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
        }))
        .sort((first, second) => second.y - first.y || first.x - second.x);
      const lines = [];
      for (const item of items) {
        let line = lines.find((candidate) => Math.abs(candidate.y - item.y) < 3);
        if (!line) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      }
      pages.push({
        page: pageNumber,
        text: lines
          .sort((first, second) => second.y - first.y)
          .map((line) => line.items.sort((first, second) => first.x - second.x).map((item) => item.text).join(" "))
          .join("\n"),
      });
    }
    return parseQuestionText(pages, category, language);
  } finally {
    await document.destroy();
  }
}
