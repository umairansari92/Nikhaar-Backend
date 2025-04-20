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
            <html>
                <head>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            background-color: #f4f4f9;
                            color: #333;
                            margin: 0;
                            padding: 0;
                        }
                        .card-container {
                            max-width: 600px;
                            margin: 20px auto;
                            background-color: #ffffff;
                            border-radius: 10px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            overflow: hidden;
                            transition: all 0.3s ease;
                        }
                        .card-container:hover {
                            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                            transform: translateY(-5px);
                        }
                        .header {
                            background-color: #d4267d;
                            color: #ffffff;
                            padding: 20px;
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                        }
                        .sub-header {
                            font-size: 18px;
                            margin-top: 10px;
                            font-style: italic;
                            color: #ffffff;
                        }
                        .content {
                            padding: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        }
                        table, th, td {
                            border: 1px solid #dddddd;
                        }
                        th, td {
                            padding: 15px;
                            text-align: left;
                            font-size: 16px;
                            transition: all 0.3s ease;
                        }
                        th {
                            background-color: #d4267d;
                            color: white;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f2f6;
                        }
                        tr:hover {
                            background-color: #ffe6f2;
                        }
                        .contact-info {
                            margin-top: 20px;
                            padding: 15px;
                            background-color: #f9f2f6;
                            border-radius: 8px;
                            text-align: center;
                        }
                        .social-links {
                            margin: 20px 0;
                            text-align: center;
                        }
                        .social-links a {
                            display: inline-block;
                            margin: 0 10px;
                            color: #d4267d;
                            text-decoration: none;
                            font-weight: bold;
                            transition: all 0.3s ease;
                        }
                        .social-links a:hover {
                            color: #ff4d94;
                            transform: scale(1.1);
                        }
                        .footer {
                            padding: 20px;
                            background-color: #d4267d;
                            color: #ffffff;
                            text-align: center;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #d4267d;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 10px 0;
                            transition: all 0.3s ease;
                        }
                        .button:hover {
                            background-color: #ff4d94;
                            transform: scale(1.05);
                        }
                    </style>
                </head>
                <body>
                    <div class="card-container">
                        <div class="header">
                            Nikhaar Beauty Salon
                            <div class="sub-header">
                                Your Appointment is Confirmed!
                            </div>
                        </div>
                        <div class="content">
                            <p style="text-align: center; font-size: 18px;">Dear ${customerData.name},</p>
                            <p style="text-align: center;">Thank you for choosing Nikhaar Beauty Salon. Here are your appointment details:</p>
                            
                            <table>
                                <tr>
                                    <th>Service</th>
                                    <td>${customerData.service}</td>
                                </tr>
                                <tr>
                                    <th>Date</th>
                                    <td>${customerData.date}</td>
                                </tr>
                                <tr>
                                    <th>Time</th>
                                    <td>${customerData.time}</td>
                                </tr>
                                <tr>
                                    <th>Location</th>
                                    <td>House # A - 84 Tonesia Line, Jutt Lines , Near Hussaini Imambargah, Karachi, 74400, Pakistan</td>
                                </tr>
                            </table>

                            <div style="margin: 20px 0; text-align: center;">
                                <h3 style="color: #d4267d; margin-bottom: 15px;">Our Location</h3>
                                <div style="max-width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <iframe 
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.0238312182955!2d67.04038027607487!3d24.863035645153147!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x455853dd47330ad1%3A0x2196555ad066b6aa!2sNikhaar%20Beauty%20Parlor!5e0!3m2!1sen!2s!4v1745105263591!5m2!1sen!2s" 
                                        width="100%" 
                                        height="300" 
                                        style="border:0; border-radius: 8px;" 
                                        allowfullscreen="" 
                                        loading="lazy" 
                                        referrerpolicy="no-referrer-when-downgrade">
                                    </iframe>
                                </div>
                            </div>

                            <div class="contact-info">
                                <h3 style="color: #d4267d; margin-top: 0;">Need to make changes?</h3>
                                <p>📞 Whatsapp: (+92) 307-2548318 or (+92) 319-7718769</p>
                                <p>📧 Email: nikhaar.glow@gmail.com</p>
                                <p>📍 Address: House # A - 84 Tonesia Line, Jutt Lines , Near Hussaini Imambargah, Karachi, 74400, Pakistan</p>
                            </div>

                            <div style="text-align: center; margin-top: 20px;">
                                <a href="https://nikhaar.vercel.app" class="button">Visit Our Website</a>
                            </div>

                            <div class="social-links">
                                <a href="https://www.facebook.com/sahira.malik.9022">Facebook</a>
                                <a href="https://www.instagram.com/sahira5706">Instagram</a>
                            </div>
                        </div>
                        <div class="footer">
                            © 2024 Nikhaar Beauty Salon. All rights reserved.
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
    console.log('Using email credentials:', {
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_APP_PASSWORD
    });
    
    const mailOptions = {
        from: {
            name: 'Nikhaar Beauty Salon Booking System',
            address: process.env.EMAIL_USER
        },
        to: process.env.ADMIN_EMAIL,
        subject: 'New Appointment Booking - Nikhaar Beauty Salon',
        html: `
            <html>
                <head>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            background-color: #f4f4f9;
                            color: #333;
                            margin: 0;
                            padding: 0;
                        }
                        .card-container {
                            max-width: 600px;
                            margin: 20px auto;
                            background-color: #ffffff;
                            border-radius: 10px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            overflow: hidden;
                            transition: all 0.3s ease;
                        }
                        .card-container:hover {
                            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                            transform: translateY(-5px);
                        }
                        .header {
                            background-color: #d4267d;
                            color: #ffffff;
                            padding: 20px;
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                        }
                        .sub-header {
                            font-size: 18px;
                            margin-top: 10px;
                            font-style: italic;
                            color: #ffffff;
                        }
                        .content {
                            padding: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        }
                        table, th, td {
                            border: 1px solid #dddddd;
                        }
                        th, td {
                            padding: 15px;
                            text-align: left;
                            font-size: 16px;
                            transition: all 0.3s ease;
                        }
                        th {
                            background-color: #d4267d;
                            color: white;
                            width: 140px;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f2f6;
                        }
                        tr:hover {
                            background-color: #ffe6f2;
                        }
                        .message-box {
                            margin-top: 20px;
                            padding: 15px;
                            background-color: #f9f2f6;
                            border-radius: 8px;
                        }
                        .message-box h3 {
                            color: #d4267d;
                            margin-top: 0;
                        }
                        .footer {
                            padding: 20px;
                            background-color: #d4267d;
                            color: #ffffff;
                            text-align: center;
                        }
                        .booking-ref {
                            background-color: #ff4d94;
                            color: white;
                            padding: 5px 10px;
                            border-radius: 4px;
                            font-size: 14px;
                            margin-top: 10px;
                            display: inline-block;
                        }
                    </style>
                </head>
                <body>
                    <div class="card-container">
                        <div class="header">
                            New Appointment Booking
                            <div class="sub-header">
                                Booking Reference: #${Date.now().toString().slice(-6)}
                            </div>
                        </div>
                        <div class="content">
                            <table>
                                <tr>
                                    <th>Customer Name</th>
                                    <td>${customerData.name}</td>
                                </tr>
                                <tr>
                                    <th>Email</th>
                                    <td>${customerData.email}</td>
                                </tr>
                                <tr>
                                    <th>Phone</th>
                                    <td>${customerData.phone}</td>
                                </tr>
                                <tr>
                                    <th>Service</th>
                                    <td>${customerData.service}</td>
                                </tr>
                                <tr>
                                    <th>Date</th>
                                    <td>${customerData.date}</td>
                                </tr>
                                <tr>
                                    <th>Time</th>
                                    <td>${customerData.time}</td>
                                </tr>
                            </table>

                            <div class="message-box">
                                <h3>Customer Message</h3>
                                <p>${customerData.message || 'No message provided'}</p>
                            </div>

                            <div style="text-align: center; margin-top: 20px;">
                                <p>This booking has been automatically added to your Google Calendar and Sheets.</p>
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
    console.log('Environment variables check:', {
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPassword: !!process.env.EMAIL_APP_PASSWORD,
        hasAdminEmail: !!process.env.ADMIN_EMAIL
    });

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
            console.log('Starting email sending process...');
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
                // Log specific error details
                emailErrors.forEach((error, index) => {
                    console.error(`Email ${index + 1} error:`, {
                        message: error.message,
                        stack: error.stack
                    });
                });
            } else {
                console.log('All emails sent successfully');
            }
        } catch (emailError) {
            console.error('Error in email sending block:', emailError);
            console.error('Email error details:', {
                message: emailError.message,
                stack: emailError.stack
            });
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