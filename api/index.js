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
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        font-family: 'Arial', sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #d4267d, #b4005f);
                        color: white;
                        padding: 20px;
                        border-radius: 8px 8px 0 0;
                        text-align: center;
                    }
                    .content {
                        padding: 20px;
                        background-color: #fff;
                    }
                    .appointment-details {
                        background-color: #f9f2f6;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .detail-item {
                        padding: 10px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                    }
                    .detail-label {
                        color: #d4267d;
                        font-weight: bold;
                    }
                    .contact-info {
                        background-color: #f5f5f5;
                        padding: 15px;
                        border-radius: 8px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-size: 14px;
                    }
                    .social-links {
                        margin: 20px 0;
                        text-align: center;
                    }
                    .button {
                        background-color: #d4267d;
                        color: white;
                        padding: 12px 25px;
                        text-decoration: none;
                        border-radius: 5px;
                        display: inline-block;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1 style="margin:0;">Appointment Confirmed!</h1>
                        <p style="margin:10px 0 0;">Thank you for choosing Nikhaar Beauty Salon</p>
                    </div>
                    
                    <div class="content">
                        <p>Dear ${customerData.name},</p>
                        <p>We're delighted to confirm your appointment at Nikhaar Beauty Salon. Here are your booking details:</p>
                        
                        <div class="appointment-details">
                            <div class="detail-item">
                                <span class="detail-label">Service:</span>
                                <span>${customerData.service}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date:</span>
                                <span>${customerData.date}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Time:</span>
                                <span>${customerData.time}</span>
                            </div>
                        </div>
                        
                        <div class="contact-info">
                            <h3 style="color: #d4267d; margin-top:0;">Need to make changes?</h3>
                            <p>Contact us through:</p>
                            <p>📞 Phone: (+92) 307-2548318 or (+92) 319-7718769</p>
                            <p>📧 Email: nikhaar.glow@gmail.com</p>
                            <p>📍 Location: 5/528 Liaquatabad No. 5, Karachi, Pakistan</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #d4267d; font-size: 18px;">We look forward to pampering you!</p>
                            <a href="https://nikhaar.vercel.app" class="button">Visit Our Website</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Follow us on social media for beauty tips and updates!</p>
                        <div class="social-links">
                            <a href="https://www.facebook.com/sahira.malik.9022" style="margin: 0 10px; color: #d4267d; text-decoration: none;">Facebook</a>
                            <a href="https://www.instagram.com/sahira5706" style="margin: 0 10px; color: #d4267d; text-decoration: none;">Instagram</a>
                        </div>
                        <p style="margin-top: 20px; font-size: 12px; color: #999;">© 2024 Nikhaar Beauty Salon. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
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
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        font-family: 'Arial', sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #d4267d, #b4005f);
                        color: white;
                        padding: 20px;
                        border-radius: 8px 8px 0 0;
                        text-align: center;
                    }
                    .content {
                        padding: 20px;
                    }
                    .booking-details {
                        background-color: #f9f2f6;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .detail-row {
                        padding: 12px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                    }
                    .detail-label {
                        color: #d4267d;
                        font-weight: bold;
                        width: 140px;
                    }
                    .detail-value {
                        flex: 1;
                        text-align: right;
                    }
                    .message-box {
                        background-color: #f5f5f5;
                        padding: 15px;
                        border-radius: 8px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-size: 14px;
                        border-top: 1px solid #eee;
                        margin-top: 20px;
                    }
                    .priority-high {
                        background-color: #fff3f7;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1 style="margin:0;">New Appointment Booking</h1>
                        <p style="margin:10px 0 0;">Booking Reference: #${Date.now().toString().slice(-6)}</p>
                    </div>
                    
                    <div class="content">
                        <div class="booking-details">
                            <div class="detail-row priority-high">
                                <span class="detail-label">Customer Name:</span>
                                <span class="detail-value">${customerData.name}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${customerData.email}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${customerData.phone}</span>
                            </div>
                            <div class="detail-row priority-high">
                                <span class="detail-label">Service:</span>
                                <span class="detail-value">${customerData.service}</span>
                            </div>
                            <div class="detail-row priority-high">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${customerData.date}</span>
                            </div>
                            <div class="detail-row priority-high">
                                <span class="detail-label">Time:</span>
                                <span class="detail-value">${customerData.time}</span>
                            </div>
                        </div>
                        
                        <div class="message-box">
                            <h3 style="color: #d4267d; margin-top:0;">Customer Message:</h3>
                            <p style="margin:0;">${customerData.message || 'No message provided'}</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #666;">This booking has been automatically added to your Google Calendar and Sheets.</p>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>© 2024 Nikhaar Beauty Salon Booking System</p>
                        <p style="font-size: 12px;">This is an automated message, please do not reply directly.</p>
                    </div>
                </div>
            </body>
            </html>
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