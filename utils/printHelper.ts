
declare var html2pdf: any;

export const exportToPDF = (elementId: string, filename: string, landscape: boolean = false) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Add the class to style elements for PDF export (showing headers, hiding buttons)
  element.classList.add('pdf-export-mode');

  const opt = {
    margin: [0.5, 0.5, 0.8, 0.5], // Top, Left, Bottom (extra for footer), Right
    filename: filename.replace(/\s+/g, '_') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: landscape ? 'landscape' : 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  // Generate PDF
  if (typeof html2pdf !== 'undefined') {
    html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        // Add Page Numbers
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(100);
          
          // Add Footer Line
          pdf.setDrawColor(200);
          pdf.line(0.5, pageHeight - 0.5, pageWidth - 0.5, pageHeight - 0.5);
          
          // Add Page Number
          const text = `Page ${i} of ${totalPages}`;
          pdf.text(text, pageWidth - 1.2, pageHeight - 0.3);
          
          // Add Timestamp
          const dateStr = new Date().toLocaleString();
          pdf.text(dateStr, 0.5, pageHeight - 0.3);
        }
      })
      .save()
      .then(() => {
         // Cleanup: Remove the class after generation
         element.classList.remove('pdf-export-mode');
      })
      .catch((err: any) => {
         console.error("PDF generation failed:", err);
         element.classList.remove('pdf-export-mode');
         alert("Failed to generate PDF. Please try using the browser print option (Ctrl+P).");
      });
  } else {
    // Fallback if library didn't load
    element.classList.remove('pdf-export-mode');
    alert("PDF library not loaded. Falling back to system print.");
    window.print();
  }
};

// Keep existing handlePrint for backwards compatibility or fallback
export const handlePrint = (documentTitle: string) => {
  const originalTitle = document.title;
  document.title = documentTitle.replace(/\s+/g, '_');
  window.print();
  document.title = originalTitle;
};
