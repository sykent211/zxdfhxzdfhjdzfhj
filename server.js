const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'currentlyConfig.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize config file
async function initializeConfig() {
    try {
        await fs.access(CONFIG_FILE);
    } catch {
        const defaultConfig = {
            code: 'print("Hi")',
            timestamp: new Date().toISOString(),
            version: "1.0"
        };
        await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
        console.log('📝 Created default configuration file');
    }
}

// GET - Serve configuration
app.get('/currentlyConfig.json', async (req, res) => {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        res.header('Content-Type', 'application/json');
        res.send(data);
        console.log('📤 Configuration sent');
    } catch (error) {
        res.status(500).json({ error: 'Failed to read configuration' });
    }
});

// POST - Update configuration
app.post('/set-config', async (req, res) => {
    try {
        const { code, timestamp, version } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const config = {
            code,
            timestamp: timestamp || new Date().toISOString(),
            version: version || "1.0"
        };

        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ Configuration updated');
        
        res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Start server
async function startServer() {
    await initializeConfig();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

startServer();