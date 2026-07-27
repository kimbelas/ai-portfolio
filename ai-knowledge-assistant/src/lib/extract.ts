/**
 * Extract plain text from an uploaded file. Supports Markdown/plain text, PDF,
 * and Word (.docx). Used by the web server's upload endpoint so a client can
 * bring their own documents.
 */

import mammoth from "mammoth";
// Import the internal lib to avoid pdf-parse's debug block, which crashes on
// import under ESM (it tries to read a bundled test PDF).
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractText(filename: string, buf: Buffer): Promise<string> {
  const ext = (filename.toLowerCase().split(".").pop() || "").trim();
  if (ext === "md" || ext === "markdown" || ext === "txt") {
    return buf.toString("utf8");
  }
  if (ext === "pdf") {
    const data = await pdfParse(buf);
    return data.text;
  }
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  throw new Error(`unsupported file type ".${ext}" (use pdf, docx, md, or txt)`);
}
