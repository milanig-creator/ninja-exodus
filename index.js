// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const app = express();

// ----- MongoDB Setup -----
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ----- User Schema -----
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user' },
  isConfirmed: { type: Boolean, default: false },
  confirmationToken: String,
  confirmationExpires: Date,
  resetToken: String,
  resetTokenExpires: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ----- Email Transporter -----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ----- Middleware -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----- GET Register Page -----
app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Register',
    error: null,
    success: null,
    username: '',
    email: ''
  });
});

// ----- POST Register Handler -----
app.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.render('register', {
      title: 'Register',
      error: 'All fields are required.',
      success: null,
      username,
      email
    });
  }

  if (password !== confirmPassword) {
    return res.render('register', {
      title: 'Register',
      error: 'Passwords do not match!',
      success: null,
      username,
      email
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      return res.render('register', {
        title: 'Register',
        error: 'Username or email already taken.',
        success: null,
        username,
        email
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = Date.now() + 24 * 60 * 60 * 1000;

    const newUser = new User({
      username,
      email,
      passwordHash,
      confirmationToken,
      confirmationExpires,
      isConfirmed: false,
    });

    await newUser.save();

    const confirmURL = `${process.env.BASE_URL}/confirm/${confirmationToken}`;

    await transporter.sendMail({
      from: `"Ninja Exodus" <${process.env.SMTP_USER}>`,
      to: newUser.email,
      subject: "Confirm your Ninja Exodus account ✔",
      text: `Click this link to confirm your account:\n\n${confirmURL}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #B22222; text-align: center;">Welcome to Ninja Exodus</h2>
          <p>Thanks for signing up, ${username}!</p>
          <p>Please confirm your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${confirmURL}" style="display: inline-block; background-color: #B22222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Confirm My Account
            </a>
          </p>
          <p>If you didn’t create this account, just ignore this message.</p>
          <p style="margin-top: 40px;">— The Ninja Exodus Team</p>
        </div>
      `
    });

    return res.render('register', {
      title: 'Register',
      error: null,
      success: 'Registration successful! Check your email to confirm your account.',
      username: '',
      email: ''
    });

  } catch (err) {
    console.error(err);
    return res.render('register', {
      title: 'Register',
      error: 'Server error. Please try again later.',
      success: null,
      username,
      email
    });
  }
});

// ----- Start Server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
