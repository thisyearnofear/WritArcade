declare module 'pdfmake/src/printer' {
  import type { TDocumentDefinitions } from 'pdfmake/interfaces'

  class PdfPrinter {
    constructor(fonts: Record<string, Record<string, Buffer | string>>)
    createPdfKitDocument(
      docDefinition: TDocumentDefinitions
    ): NodeJS.ReadableStream & { end(): void }
  }

  export = PdfPrinter
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>
  export default vfs
}
