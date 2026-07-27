// pdf-parse ships no type declarations, and we import its internal lib entry
// (`pdf-parse/lib/pdf-parse.js`) to sidestep the package's debug block that
// crashes on import under ESM. This minimal ambient declaration keeps `tsc`
// happy without pulling an out-of-date @types package.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(buffer: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdfParse;
}
