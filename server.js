const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Debug: Print current directory
console.log('Current directory:', process.cwd());

// Load environment variables
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Debug: Print loaded environment variables
console.log('Loaded environment variables:', {
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || 'Not loaded',
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'Present (hidden)' : 'Not loaded',
  SPREADSHEET_ID: process.env.SPREADSHEET_ID || 'Not loaded'
});

require('dotenv').config({
  path: path.join(__dirname, '.env')
});

// Add this debug line
console.log('Env File Path:', path.join(__dirname, '.env'));

// Debug: Print all environment variables
console.log('Environment Variables:', {
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? "Exists" : "Missing",
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? "Exists" : "Missing",
  SPREADSHEET_ID: process.env.SPREADSHEET_ID ? "Exists" : "Missing"
});

console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL);
console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY);
console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID);

require('dotenv').config({
  path: 'D:\\My Courses\\Web Deveopment\\Projects & Assingments\\Nikhaar Beauty Saloon\\.env'
});
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

// Initialize Express
const app = express();

// Update CORS for Vercel
app.use(cors({
    origin: ['https://nikhaar.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Google Sheets Client
const sheets = google.sheets({ version: 'v4', auth });

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Add this helper function at the top of your server.js
function formatTime12Hour(time24) {
    try {
        if (time24.includes('AM') || time24.includes('PM')) {
            return time24;
        }
        const [hours24, minutes] = time24.split(':');
        const period = hours24 >= 12 ? 'PM' : 'AM';
        const hours12 = hours24 % 12 || 12;
        return `${hours12}:${minutes} ${period}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        return time24;
    }
}

// Save Appointment Function
async function saveAppointment(appointmentData) {
    try {
        console.log('Starting appointment save process...'); // Debug log

        // 1. First try to save to Google Sheets
        console.log('Saving to Google Sheets...');
        const sheetsResponse = await sheets.spreadsheets.values.append({
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
        console.log('Successfully saved to sheets:', sheetsResponse.data);

        // 2. Then try to send emails
        console.log('Sending emails...');
        await Promise.all([
            sendAppointmentEmail(appointmentData.email, appointmentData)
                .catch(error => console.error('Customer email failed:', error)),
            notifyAdmin(appointmentData)
                .catch(error => console.error('Admin email failed:', error))
        ]);

        return { 
            success: true, 
            sheetsResponse: sheetsResponse.data,
            emailsSent: true
        };
    } catch (error) {
        console.error('Error in saveAppointment:', {
            message: error.message,
            stack: error.stack,
            details: error
        });
        throw error;
    }
}

// Customer Email Template with Beautiful Design
async function sendAppointmentEmail(customerEmail, appointmentDetails) {
    try {
        const formattedTime = formatTime12Hour(appointmentDetails.time);
        const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Confirmation</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                    background-color: #fdf2f8;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #ff69b4, #ff1493);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: bold;
                }
                .header p {
                    margin: 10px 0 0;
                    font-size: 18px;
                    opacity: 0.9;
                }
                .content {
                    padding: 30px;
                    background: white;
                }
                .appointment-details {
                    margin: 20px 0;
                    border-collapse: collapse;
                    width: 100%;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
                }
                .appointment-details th,
                .appointment-details td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid #ffb6c1;
                }
                .appointment-details th {
                    background-color: #fff0f5;
                    color: #ff1493;
                    font-weight: bold;
                    width: 40%;
                }
                .appointment-details tr:last-child th,
                .appointment-details tr:last-child td {
                    border-bottom: none;
                }
                .footer {
                    background: linear-gradient(135deg, #ff69b4, #ff1493);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .footer p {
                    margin: 5px 0;
                }
                .social-links {
                    margin-top: 15px;
                }
                .social-links a {
                    color: white;
                    text-decoration: none;
                    margin: 0 10px;
                    font-weight: bold;
                }
                .thank-you {
                    text-align: center;
                    color: #ff1493;
                    font-size: 20px;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .logo {
                    width: 150px;
                    margin-bottom: 15px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Nikhaar Beauty Salon</h1>
                    <p>Your Appointment is Confirmed!</p>
                </div>
                
                <div class="content">
                    <p style="font-size: 18px;">Dear ${appointmentDetails.name},</p>
                    <p>Thank you for choosing Nikhaar Beauty Salon. We're excited to help you look and feel your best!</p>
                    
                    <table class="appointment-details">
                        <tr>
                            <th>Service</th>
                            <td>${appointmentDetails.service}</td>
                        </tr>
                        <tr>
                            <th>Date</th>
                            <td>${appointmentDetails.date}</td>
                        </tr>
                        <tr>
                            <th>Time</th>
                            <td>${formattedTime}</td>
                        </tr>
                        <tr>
                            <th>Phone</th>
                            <td>${appointmentDetails.phone}</td>
                        </tr>
                    </table>

                    <p class="thank-you">We look forward to serving you! ✨</p>
                </div>
                
                <div class="footer">
                    <p><strong>Contact Us</strong></p>
                    <p>📞 (+92) 307-2548318 | (+92) 319-7718769</p>
                    <p>📧 nikhaar.glow@gmail.com</p>
                    <div class="social-links">
                        Follow us on: 
                        <a href="#">Instagram</a> | 
                        <a href="#">Facebook</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        await transporter.sendMail({
            from: `"Nikhaar Beauty Salon" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: '✨ Your Beauty Appointment is Confirmed!',
            html: emailContent
        });
        console.log('Customer email sent successfully');
    } catch (error) {
        console.error('Error sending customer email:', error);
    }
}

// Admin Email Template with Beautiful Design
async function notifyAdmin(appointmentDetails) {
    try {
        const formattedTime = formatTime12Hour(appointmentDetails.time);
        const adminEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Booking Alert</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                    background-color: #fdf2f8;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #ff69b4, #ff1493);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: bold;
                }
                .header p {
                    margin: 10px 0 0;
                    font-size: 18px;
                    opacity: 0.9;
                }
                .content {
                    padding: 30px;
                    background: white;
                }
                .new-booking-alert {
                    background-color: #ff1493;
                    color: white;
                    padding: 15px;
                    text-align: center;
                    font-size: 18px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                }
                .appointment-details {
                    margin: 20px 0;
                    border-collapse: collapse;
                    width: 100%;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
                }
                .appointment-details th,
                .appointment-details td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid #ffb6c1;
                }
                .appointment-details th {
                    background-color: #fff0f5;
                    color: #ff1493;
                    font-weight: bold;
                    width: 40%;
                }
                .appointment-details tr:last-child th,
                .appointment-details tr:last-child td {
                    border-bottom: none;
                }
                .footer {
                    background: linear-gradient(135deg, #ff69b4, #ff1493);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Nikhaar Beauty Salon</h1>
                    <p>New Booking Alert!</p>
                </div>
                
                <div class="content">
                    <div class="new-booking-alert">
                        New appointment has been booked!
                    </div>
                    
                    <table class="appointment-details">
                        <tr>
                            <th>Customer Name</th>
                            <td>${appointmentDetails.name}</td>
                        </tr>
                        <tr>
                            <th>Service</th>
                            <td>${appointmentDetails.service}</td>
                        </tr>
                        <tr>
                            <th>Date</th>
                            <td>${appointmentDetails.date}</td>
                        </tr>
                        <tr>
                            <th>Time</th>
                            <td>${formattedTime}</td>
                        </tr>
                        <tr>
                            <th>Phone</th>
                            <td>${appointmentDetails.phone}</td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td>${appointmentDetails.email}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="footer">
                    <p>This is an automated notification from your booking system.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        await transporter.sendMail({
            from: `"Nikhaar Beauty Salon" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: '🔔 New Beauty Appointment Booking',
            html: adminEmailContent
        });
        console.log('Admin notification sent successfully');
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
}

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Appointment booking route
app.post('/api/appointments', async (req, res) => {
    console.log('Received appointment request:', req.body);
    
    try {
        const { name, email, phone, service, date, time, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !service || !date || !time) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Save appointment
        const result = await saveAppointment({
            name,
            email,
            phone,
            service,
            date,
            time,
            message: message || ''
        });

        res.json({
            success: true,
            message: 'Appointment booked successfully!'
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error, please try again'
        });
    }
});

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Nikhaar Beauty Salon API'
    });
});

// Update export for Vercel
module.exports = app;

// Only listen to port if not in Vercel
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5001;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Error handling
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});