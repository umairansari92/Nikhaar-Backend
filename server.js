const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

const app = express();

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Email templates
const sendCustomerEmail = async (customerData) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerData.email,
        subject: 'Appointment Confirmation - Nikhaar Beauty Salon',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4267d;">Thank you for choosing Nikhaar Beauty Salon!</h2>
                <p>Dear ${customerData.name},</p>
                <p>Your appointment has been successfully booked. Here are your appointment details:</p>
                <ul>
                    <li><strong>Service:</strong> ${customerData.service}</li>
                    <li><strong>Date:</strong> ${customerData.date}</li>
                    <li><strong>Time:</strong> ${customerData.time}</li>
                </ul>
                <p>If you need to make any changes to your appointment, please contact us at:</p>
                <p>Phone: (+92) 307-2548318 or (+92) 319-7718769</p>
                <p>Email: nikhaar.glow@gmail.com</p>
                <p>We look forward to serving you!</p>
                <br>
                <p>Best regards,</p>
                <p>Team Nikhaar Beauty Salon</p>
            </div>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

const sendAdminEmail = async (customerData) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: 'New Appointment Booking - Nikhaar Beauty Salon',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4267d;">New Appointment Booking</h2>
                <p>A new appointment has been booked. Details:</p>
                <ul>
                    <li><strong>Customer Name:</strong> ${customerData.name}</li>
                    <li><strong>Email:</strong> ${customerData.email}</li>
                    <li><strong>Phone:</strong> ${customerData.phone}</li>
                    <li><strong>Service:</strong> ${customerData.service}</li>
                    <li><strong>Date:</strong> ${customerData.date}</li>
                    <li><strong>Time:</strong> ${customerData.time}</li>
                    <li><strong>Message:</strong> ${customerData.message || 'No message provided'}</li>
                </ul>
            </div>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

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

        // Send emails
        try {
            await Promise.all([
                sendCustomerEmail(req.body),
                sendAdminEmail(req.body)
            ]);
            console.log('Emails sent successfully');
        } catch (emailError) {
            console.error('Error sending emails:', emailError);
            // Don't return here, we still want to send success response as appointment was booked
        }

        console.log('Appointment saved to sheets:', sheetsResponse.data);

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