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
    margin: [0.5, 0.5], // Top/Bottom, Left/Right
    filename: filename.replace(/\s+/g, '_') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: landscape ? 'landscape' : 'portrait' }
  };

  // Generate PDF
  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save().then(() => {
       // Cleanup: Remove the class after generation
       element.classList.remove('pdf-export-mode');
    }).catch((err: any) => {
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