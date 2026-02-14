const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

// Paths to data files
const DATA_DIR = path.join(__dirname, '../src/data');
const ADVERTISERS_FILE = path.join(DATA_DIR, 'advertisers.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Middleware
// Middleware
app.use(cors({
    origin: '*', // Allow all origins (for local dev with varying ports)
    methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(bodyParser.json());

// Request Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Helper to read JSON
const readJson = (file) => {
    if (!fs.existsSync(file)) return [];
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading file:', file, err);
        return [];
    }
};

// Helper to write JSON
const writeJson = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing file:', file, err);
        return false;
    }
};

// Helper to run shell command as promise
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Command failed: ${command}`, stderr);
                // Specifically for git commit, if "nothing to commit", we can proceed
                if (command.includes('commit') && (stdout.includes('nothing to commit') || stderr.includes('nothing to commit'))) {
                    resolve(stdout);
                } else {
                    reject(stderr || error.message);
                }
            } else {
                resolve(stdout);
            }
        });
    });
};

// --- API Endpoints ---

// 1. Advertisers
app.get('/api/advertisers', (req, res) => {
    const data = readJson(ADVERTISERS_FILE);
    res.json(data);
});

app.post('/api/advertisers', (req, res) => {
    const success = writeJson(ADVERTISERS_FILE, req.body);
    if (success) res.json({ message: 'Advertisers saved' });
    else res.status(500).json({ error: 'Failed to save advertisers' });
});

// 2. Campaigns
app.get('/api/campaigns', (req, res) => {
    const data = readJson(CAMPAIGNS_FILE);
    res.json(data);
});

app.post('/api/campaigns', (req, res) => {
    const success = writeJson(CAMPAIGNS_FILE, req.body);
    if (success) res.json({ message: 'Campaigns saved' });
    else res.status(500).json({ error: 'Failed to save campaigns' });
});

// 2.5 Settings
app.get('/api/settings', (req, res) => {
    const data = readJson(SETTINGS_FILE);
    // Return default if empty or file doesn't exist
    if (Object.keys(data).length === 0) {
        return res.json({
            placements: {
                header: true,
                footer: true,
                'sidebar-left': true,
                'sidebar-right': true,
                interstitial: true
            }
        });
    }
    res.json(data);
});

app.post('/api/settings', (req, res) => {
    const success = writeJson(SETTINGS_FILE, req.body);
    if (success) res.json({ message: 'Settings saved' });
    else res.status(500).json({ error: 'Failed to save settings' });
});

// 3. Images (Local File Scanner)
app.get('/api/images', (req, res) => {
    const adsDir = path.join(__dirname, '../public/ads');
    // Recursive function to find all images
    const getImagesRecursively = (dir, fileList = []) => {
        if (!fs.existsSync(dir)) return fileList;
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                getImagesRecursively(filePath, fileList);
            } else {
                if (/\.(jpg|jpeg|png|gif|svg|webp|mp4|webm)$/i.test(file)) {
                    // Infer placement from path
                    // config/ads/desktop/header/img.png -> placement: header
                    // config/ads/sidebar/sidebar-left/img.png -> placement: sidebar-left

                    let placement = 'unknown';
                    const relativePath = path.relative(adsDir, filePath).replace(/\\/g, '/');

                    if (relativePath.includes('sidebar-left')) placement = 'sidebar-left';
                    else if (relativePath.includes('sidebar-right')) placement = 'sidebar-right';
                    else if (relativePath.includes('header')) placement = 'header';
                    else if (relativePath.includes('footer')) placement = 'footer';

                    fileList.push({
                        placement: placement,
                        filename: file,
                        path: `/ads/${relativePath}`
                    });
                }
            }
        });
        return fileList;
    };

    const images = getImagesRecursively(adsDir);

    res.json(images);
});

// Helper to generate dummy advertisers for public deployment
const generateDummyAdvertisers = (realAdvertisers) => {
    return realAdvertisers.map((adv, index) => ({
        ...adv,
        companyName: `Advertiser ${index + 1}`,
        contactName: `Contact ${index + 1}`,
        email: `advertiser${index + 1}@example.com`,
        notes: 'Private notes hidden for public deployment.',
        website: 'https://example.com'
    }));
};

// 4. Deployment (Git Push) with Secure Data Swap
app.post('/api/deploy', async (req, res) => {
    console.log('Starting deployment sequence with SAFE DATA SWAP...');
    const backupPath = path.join(DATA_DIR, 'advertisers.backup.json');

    try {
        // 1. Backup Real Data
        const realAdvertisers = readJson(ADVERTISERS_FILE);
        if (!writeJson(backupPath, realAdvertisers)) {
            throw new Error('Failed to create backup of advertisers data.');
        }
        console.log('Step 1: Backed up real advertiser data.');

        // 2. Generate and Save Dummy Data
        const dummyAdvertisers = generateDummyAdvertisers(realAdvertisers);
        if (!writeJson(ADVERTISERS_FILE, dummyAdvertisers)) {
            throw new Error('Failed to swap in dummy advertiser data.');
        }
        console.log('Step 2: Swapped in dummy advertiser data.');

        // 3. Git Operations
        // We add the files (now containing dummy data for advertisers)
        await runCommand('git add src/data/advertisers.json src/data/campaigns.json src/data/settings.json');

        try {
            await runCommand('git commit -m "Update ads via Admin Dashboard (Secure Push)"');
        } catch (e) {
            console.log('Nothing to commit, proceeding to push...');
        }

        await runCommand('git push');
        console.log('Step 3: Deployment successful!');

        res.json({ success: true, message: 'Deployed to GitHub successfully with dummy data!' });

    } catch (error) {
        console.error('Deployment failed:', error);
        res.status(500).json({ success: false, error: 'Deployment failed', details: error.toString() });
    } finally {
        // 4. Restore Real Data
        // This runs whether the try block succeeded or failed, ensuring we don't lose data
        if (fs.existsSync(backupPath)) {
            const realData = readJson(backupPath);
            if (writeJson(ADVERTISERS_FILE, realData)) {
                fs.unlinkSync(backupPath); // Delete backup file only if restore succeeded
                console.log('Step 4: Restored real advertiser data.');
            } else {
                console.error('CRITICAL ERROR: Failed to restore real advertiser data from backup!');
            }
        } else {
            console.warn('Warning: No backup file found to restore.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`\nLocal Admin Server running at http://localhost:${PORT}`);
    console.log(`Ready to manage ads!\n`);
});

// Keep process alive hack (shouldn't be needed but debugging exit issue)
setInterval(() => { }, 10000);
