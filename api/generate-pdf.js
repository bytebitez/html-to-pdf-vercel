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
        
        await page.setViewport({ width: 1280, height: 900 });

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'  
        });

        await page.evaluateHandle('document.fonts.ready');

        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        // Return the PDF buffer as JSON (Base64 encoded)
        res.status(200).json({ pdf: pdfBuffer.toString('base64') });

    } catch (error) {
        console.error('Error generating PDF:', error);
        if (browser) await browser.close();
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
