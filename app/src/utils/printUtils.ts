/**
 * Print utility using hidden iframe.
 * Prints directly from the current tab — no new window/tab opened.
 * Optimized for POS-80C thermal printers with auto-cutter support.
 */

const POS_PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: monospace;
    font-size: 12px;
    width: 80mm;
    margin: 0 auto;
  }
  @page {
    margin: 0;
  }
`;

/**
 * Print a single HTML document by temporarily overriding the body.
 * This ensures Chrome Kiosk mode (--kiosk-printing) intercepts it perfectly,
 * which often fails when using hidden iframes due to security policies.
 */
function printSingle(htmlContent: string): Promise<void> {
  return new Promise((resolve) => {
    // 1. Save original scroll position
    const scrollY = window.scrollY;

    // 2. Create the print container
    const printContainer = document.createElement('div');
    printContainer.id = '__print-container';
    
    // Style it to cover everything but only show print content during printing
    Object.assign(printContainer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'white',
      zIndex: '999999',
      padding: '0',
      margin: '0',
      display: 'block' // Will be visible momentarily
    });

    // 3. Inject styles into head (temporarily)
    const styleEl = document.createElement('style');
    styleEl.id = '__print-styles';
    styleEl.innerHTML = POS_PRINT_STYLES;
    document.head.appendChild(styleEl);

    // 4. Inject content
    printContainer.innerHTML = htmlContent;
    document.body.appendChild(printContainer);

    // 5. Hide everything else (except our print container)
    const bodyChildren = Array.from(document.body.children) as HTMLElement[];
    const hiddenElements: { el: HTMLElement; oldDisplay: string }[] = [];
    
    bodyChildren.forEach((child) => {
      if (child.id !== '__print-container' && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
        hiddenElements.push({ el: child, oldDisplay: child.style.display });
        child.style.display = 'none';
      }
    });

    // 6. Execute Print
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print failed:', err);
      } finally {
        // 7. Cleanup immediately after print dialog closes (or auto-prints in kiosk)
        document.body.removeChild(printContainer);
        document.head.removeChild(styleEl);
        
        // Restore all hidden elements
        hiddenElements.forEach(({ el, oldDisplay }) => {
          el.style.display = oldDisplay;
        });
        
        // Restore scroll
        window.scrollTo(0, scrollY);
        resolve();
      }
    }, 150); // Small delay for React/DOM to settle
  });
}

/**
 * Print a single HTML content as one bill.
 */
export function silentPrint(htmlContent: string) {
  printSingle(htmlContent);
}

/**
 * Print multiple bills as separate print jobs.
 * Each bill triggers a separate print command → POS auto-cutter cuts between bills.
 * User clicks Print once per bill.
 */
export async function silentPrintMultiple(pages: { html: string; title?: string }[]) {
  for (const page of pages) {
    await printSingle(page.html);
    // Small delay between print jobs
    await new Promise((r) => setTimeout(r, 500));
  }
}
