declare module 'pdfmake' {
  import type {
    TDocumentDefinitions,
    TFontDictionary,
    BufferOptions,
    TCreatedPdf,
  } from 'pdfmake/interfaces'

  interface PdfMakeSingleton {
    createPdf(
      documentDefinitions: TDocumentDefinitions,
      options?: BufferOptions
    ): TCreatedPdf
    setFonts(fonts: TFontDictionary): void
    addFonts(fonts: TFontDictionary): void
  }

  const pdfMake: PdfMakeSingleton
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>
  export default vfs
}
