const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// WARNING: Render free tier has ephemeral storage!
// Files created here will be deleted on restart.
// For production, use a database or external storage.
const CONFIG_FILE = path.join(__dirname, 'currentlyConfig.json');

// In-memory storage as fallback
let memoryConfig = {
    code: 'print("Hi")',
    timestamp: new Date().toISOString(),
    version: "1.0"
};

// Middleware
app.use(cors());
app.use(express.json());

// Initialize config file
async function initializeConfig() {
    try {
        await fs.access(CONFIG_FILE);
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        memoryConfig = JSON.parse(data);
        console.log('Loaded existing configuration file');
    } catch {
        const defaultConfig = {
            code: 'print("Hi")',
            timestamp: new Date().toISOString(),
            version: "1.0"
        };
        memoryConfig = defaultConfig;
        try {
            await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
            console.log('Created default configuration file');
        } catch (writeErr) {
            console.log('Could not write to disk, using memory storage only');
        }
    }
}

// GET - Serve configuration
app.get('/currentlyConfig.json', async (req, res) => {
    try {
        // Always serve from memory (most up-to-date)
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(memoryConfig, null, 2));
        console.log('Configuration sent:', memoryConfig.code.substring(0, 50) + '...');
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

        // Update memory first
        memoryConfig = config;
        console.log('configuration updated');
        console.log('New Script:', code.substring(0, 100) + '...');

        // Try to write to disk (will fail on Render free tier after restart)
        try {
            await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log('Configuration also saved to disk');
        } catch (writeErr) {
            console.log('Disk write failed (expected on Render free tier), using memory only');
        }
        
        res.json({ success: true, message: 'Configuration updated', note: 'Using in-memory storage' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// GET - Root route with web interface
app.get('/', async (req, res) => {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roblox Live Configuration Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            max-width: 900px;
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .status {
            display: inline-block;
            background: rgba(72, 187, 120, 0.2);
            color: #68d391;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .content {
            padding: 40px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #f7fafc;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }
        
        .info-card h3 {
            color: #2d3748;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .info-card p {
            color: #4a5568;
            font-size: 1.1em;
            font-weight: 600;
        }
        
        .code-section {
            margin-top: 30px;
        }
        
        .code-section h2 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        
        .code-display {
            background: #1a202c;
            color: #68d391;
            padding: 25px;
            border-radius: 12px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
            border: 2px solid #2d3748;
        }
        
        .endpoints {
            margin-top: 30px;
            background: #edf2f7;
            padding: 25px;
            border-radius: 12px;
        }
        
        .endpoints h2 {
            color: #2d3748;
            margin-bottom: 15px;
        }
        
        .endpoint {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 3px solid #4299e1;
        }
        
        .endpoint code {
            background: #2d3748;
            color: #68d391;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .method {
            display: inline-block;
            background: #4299e1;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.85em;
            margin-right: 10px;
        }
        
        .method.post {
            background: #48bb78;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            background: #f7fafc;
            color: #718096;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>triton</h1>
            <p>Live Configuration System</p>
            <div class="status">Online & Running</div>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <h3>Version</h3>
                    <p>${config.version || 'N/A'}</p>
                </div>
                <div class="info-card">
                    <h3>Last Updated</h3>
                    <p>${config.timestamp ? new Date(config.timestamp).toLocaleString() : 'Never'}</p>
                </div>
                <div class="info-card">
                    <h3>Code Length</h3>
                    <p>${config.code ? config.code.length : 0} chars</p>
                </div>
            </div>
            
            <div class="code-section">
                <h2>current configuration script</h2>
                <div class="code-display">${config.code || 'No code set'}</div>
            </div>
            
            <div class="endpoints">
                <h2>Endpoints</h2>
                <div class="endpoint">
                    <span class="method">GET</span>
                    <code>/currentlyConfig.json</code>
                    <p style="margin-top: 8px; color: #4a5568;">Fetch the current configuration</p>
                </div>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <code>/set-config</code>
                    <p style="margin-top: 8px; color: #4a5568;">Update the configuration (JSON body required)</p>
                </div>
            </div>
        </div>
        
        <div class="footer">
            Server running on port ${PORT} | Auto-refreshes every 30 seconds
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
        `;
        
        res.send(html);
    } catch (error) {
        res.status(500).send('<h1>Error loading configuration</h1>');
    }
});

// Start server
async function startServer() {
    await initializeConfig();
    app.listen(PORT, () => {
        console.log(`port ${PORT}`);
    });
}

startServer();
