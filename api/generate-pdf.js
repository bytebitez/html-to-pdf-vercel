import chromium from 'chrome-aws-lambda';
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
            executablePath: await chromium.executablePath || '/usr/bin/chromium-browser',
            headless: true,
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=generated.pdf');
        return res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        if (browser) await browser.close();
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
