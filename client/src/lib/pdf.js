import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Captures `el` and downloads it as a single-page PDF sized exactly to its content
// at the given physical width in mm (e.g. 80mm for a thermal receipt) — avoids
// relying on browser print CSS, which can't reliably isolate one element on a
// page full of other content (modals, sidebars, etc).
export async function downloadElementAsFittedPdf(el, filename, widthMm = 80) {
  const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
  const heightMm = (canvas.height * widthMm) / canvas.width;
  const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm] });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm);
  pdf.save(filename);
}

// Captures `el` and downloads it as a paginated A4 PDF, splitting the image
// across pages if it's taller than a single sheet.
export async function downloadElementAsA4Pdf(el, filename) {
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
