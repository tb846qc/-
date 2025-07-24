const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Gaming System',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/config', (req, res) => {
    res.json({
        gameConfig: {
            defaultDuration: process.env.DEFAULT_GAME_DURATION || 1800,
            maxDuration: process.env.MAX_GAME_DURATION || 3600,
            maxScore: process.env.MAX_SCORE_PER_GAME || 1000000,
            leaderboardSize: process.env.LEADERBOARD_SIZE || 100,
            antiCheatEnabled: process.env.SCORE_VERIFICATION_ENABLED === 'true',
            achievementSystemEnabled: process.env.ACHIEVEMENT_SYSTEM_ENABLED === 'true'
        },
        features: {
            debugMode: process.env.DEBUG_MODE === 'true',
            gasReporting: process.env.REPORT_GAS === 'true'
        }
    });
});

app.get('/api/deployments', (req, res) => {
    res.json({
        contracts: {
            GamingSystem: {
                address: process.env.GAMING_CONTRACT_ADDRESS || 'Not deployed',
                network: process.env.NETWORK || 'localhost'
            }
        },
        lastDeployment: process.env.LAST_DEPLOYMENT_TIME || 'Never'
    });
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🎮 Gaming System Server running on http://localhost:${PORT}/`);
    console.log('\n📋 Available Pages:');
    console.log(`   🏠 Home: http://localhost:${PORT}/`);
    console.log(`   🎯 Gaming Interface: http://localhost:${PORT}/`);
    console.log('\n🔌 API Endpoints:');
    console.log(`   ❤️  Health: http://localhost:${PORT}/api/health`);
    console.log(`   ⚙️  Config: http://localhost:${PORT}/api/config`);
    console.log(`   📦 Deployments: http://localhost:${PORT}/api/deployments`);
    console.log('\n🚀 Ready for gaming!\n');
});

module.exports = app;