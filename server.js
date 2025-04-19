const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// CORS configuration
const corsOptions = {
    origin: ['https://nikhaar.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware with increased limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Google Sheets
let sheets;
try {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('Google Sheets initialized successfully');
} catch (error) {
    console.error('Google Sheets initialization error:', error);
}

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Nikhaar Beauty Salon API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sheets_status: !!sheets
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Test endpoint working',
        env: process.env.NODE_ENV,
        google_sheets: !!sheets,
        timestamp: new Date().toISOString()
    });
});

// Favicon
app.get('/favicon.ico', (_, res) => {
    res.status(204).end();
});

// Save appointment to Google Sheets
async function saveToSheets(appointmentData) {
    if (!sheets) {
        throw new Error('Google Sheets not initialized');
    }

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "'Nikhaar Beauty Salon'!A:H",
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    new Date().toLocaleString(),
                    appointmentData.name,
                    appointmentData.email,
                    appointmentData.phone,
                    appointmentData.service,
                    appointmentData.date,
                    appointmentData.time,
                    appointmentData.message || ''
                ]]
            }
        });
        return response.data;
    } catch (error) {
        console.error('Google Sheets error:', error);
        throw error;
    }
}

// Appointment booking route
app.post('/api/appointments', async (req, res) => {
    console.log('Received appointment request:', req.body);
    
    try {
        const { name, email, phone, service, date, time, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !service || !date || !time) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields',
                received: { name, email, phone, service, date, time }
            });
        }

        // Save to Google Sheets
        if (!sheets) {
            throw new Error('Google Sheets not initialized');
        }

        const sheetsResponse = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "'Nikhaar Beauty Salon'!A:H",
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    new Date().toLocaleString(),
                    name,
                    email,
                    phone,
                    service,
                    date,
                    time,
                    message || ''
                ]]
            }
        });

        console.log('Appointment saved to sheets:', sheetsResponse.data);

        // Set CORS headers explicitly for this route
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Credentials', true);

        res.json({
            status: 'success',
            message: 'Appointment booked successfully',
            appointment: {
                name,
                email,
                phone,
                service,
                date,
                time
            }
        });
    } catch (error) {
        console.error('Appointment booking error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process appointment',
            error: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Not Found',
        path: req.path
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path
    });
    
    res.status(500).json({ 
        status: 'error',
        message: 'Internal server error',
        details: err.message
    });
});

// Export the Express app
module.exports = app;

// Start server if not in production (Vercel)
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5001;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}