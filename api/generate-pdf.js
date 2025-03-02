import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { htmlContent } = req.body;
    if (!htmlContent) {
        return res.status(400).json({ error: 'HTML content is required' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        
        // ✅ Ensure proper viewport size (fixes blank PDFs)
        await page.setViewport({ width: 1280, height: 900 });

        // ✅ Ensure HTML fully loads before generating PDF
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'  // Waits until all requests are complete
        });

        // ✅ Fix possible blank pages in PDF
        await page.evaluateHandle('document.fonts.ready');

        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        // ✅ Proper response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="generated.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        if (browser) await browser.close();
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
