import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { writeFileSync, createReadStream, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');

        // Generate a temporary file path
        const pdfPath = join(tmpdir(), `generated-${Date.now()}.pdf`);
        
        // Generate and save PDF
        const pdfBuffer = await page.pdf({ format: 'A4' });
        writeFileSync(pdfPath, pdfBuffer);

        await browser.close();

        // Stream the file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="generated.pdf"');

        const fileStream = createReadStream(pdfPath);
        fileStream.pipe(res);

        // Delete file after streaming
        fileStream.on('end', () => unlinkSync(pdfPath));

    } catch (error) {
        console.error('Error generating PDF:', error);
        if (browser) await browser.close();
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
