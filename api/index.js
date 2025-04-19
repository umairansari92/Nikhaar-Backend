const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    if (req.body) {
        console.log('Request body:', req.body);
    }
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

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Test email configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

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

// Email sending functions
async function sendCustomerEmail(customerData) {
    console.log('Attempting to send customer email to:', customerData.email);
    
    const mailOptions = {
        from: {
            name: 'Nikhaar Beauty Salon',
            address: process.env.EMAIL_USER
        },
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
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Customer email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending customer email:', error);
        throw error;
    }
}

async function sendAdminEmail(customerData) {
    console.log('Attempting to send admin email to:', process.env.ADMIN_EMAIL);
    
    const mailOptions = {
        from: {
            name: 'Nikhaar Beauty Salon Booking System',
            address: process.env.EMAIL_USER
        },
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
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Admin email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending admin email:', error);
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

        // Send emails
        try {
            console.log('Attempting to send emails...');
            const emailResults = await Promise.allSettled([
                sendCustomerEmail(req.body),
                sendAdminEmail(req.body)
            ]);
            
            console.log('Email sending results:', emailResults);
            
            const emailErrors = emailResults
                .filter(result => result.status === 'rejected')
                .map(result => result.reason);
            
            if (emailErrors.length > 0) {
                console.error('Some emails failed to send:', emailErrors);
            }
        } catch (emailError) {
            console.error('Error in email sending block:', emailError);
        }

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

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        email_configured: !!transporter,
        sheets_configured: !!sheets
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