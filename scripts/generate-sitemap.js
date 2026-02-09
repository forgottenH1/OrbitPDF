import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Replicate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// IMPORTANT: Replace this with your actual domain name before deploying (e.g., https://my-app.netlify.app)
const BASE_URL = 'https://orbitpdf.pages.dev';
const LANGUAGES = ['en', 'es', 'fr', 'ar', 'ja', 'zh', 'de', 'ru', 'pt', 'uk', 'tr', 'it'];

// Paths
const TOOLS_PATH = path.join(__dirname, '../src/data/tools.ts');
const TRANSLATION_PATH = path.join(__dirname, '../src/locales/en/translation.json');
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap.xml');

// Helper to extract Tool IDs from TS file using Regex
function getToolIds() {
    try {
        const content = fs.readFileSync(TOOLS_PATH, 'utf8');
        // Look for { id: 'something'
        const regex = /id:\s*['"]([^'"]+)['"]/g;
        const ids = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            ids.push(match[1]);
        }
        return ids;
    } catch (e) {
        console.error('Error reading tools.ts:', e);
        return [];
    }
}

// Helper to extract Guide IDs from translation.json
function getGuideIds() {
    try {
        const content = fs.readFileSync(TRANSLATION_PATH, 'utf8');
        const json = JSON.parse(content);
        if (json.guidesData) {
            return Object.keys(json.guidesData);
        }
        return [];
    } catch (e) {
        console.error('Error reading translation.json:', e);
        return [];
    }
}

function generateSitemap() {
    const toolIds = getToolIds();
    const guideIds = getGuideIds();

    console.log(`Found ${toolIds.length} tools and ${guideIds.length} guides.`);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 1. Static Pages (Home, Contact, etc.)
    const staticPages = [
        { path: '/', priority: '1.0' },
        { path: '/contact.html', priority: '0.4' },
        { path: '/advertise.html', priority: '0.6' },
        { path: '/guides.html', priority: '0.7' } // Main guides hub
    ];

    // Helper to add URL entry
    const addUrl = (loc, priority = '0.5', changefreq = 'weekly') => {
        // Escape special characters for XML (primarily & -> &amp;)
        const escapedLoc = loc.replace(/&/g, '&amp;');
        xml += `
  <url>
    <loc>${escapedLoc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    };

    // Generate URLs
    LANGUAGES.forEach(lang => {
        const qs = `lng=${lang}`;

        // A. Static Pages
        staticPages.forEach(page => {
            const separator = page.path.includes('?') ? '&' : '?';
            const url = `${BASE_URL}${page.path}${separator}${qs}`;
            addUrl(url, page.priority);
        });

        // B. Tools
        toolIds.forEach(toolId => {
            const url = `${BASE_URL}/?tool=${toolId}&${qs}`;
            addUrl(url, '0.8');
        });

        // C. Guides
        guideIds.forEach(guideId => {
            const url = `${BASE_URL}/guides.html?id=${guideId}&${qs}`;
            addUrl(url, '0.7');
        });
    });

    xml += `
</urlset>`;

    fs.writeFileSync(OUTPUT_PATH, xml);
    console.log(`Sitemap generated at ${OUTPUT_PATH}`);
}

generateSitemap();
