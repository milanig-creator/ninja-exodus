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
  to: user.email,
  subject: "Reset your password",
  text: `Reset your password by visiting this link:\n\n${resetURL}`,
  html: `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #B22222; text-align: center;">Ninja Exodus</h2>
      <p>Hi there,</p>
      <p>You recently requested to reset your password. Click the button below to proceed:</p>
      <p style="text-align: center;">
        <a href="${resetURL}" style="display: inline-block; background-color: #B22222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Your Password
        </a>
      </p>
      <p>If you didn't request this, no action is needed. Your account is safe.</p>
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

// ----- GET Confirm Email -----
app.get('/confirm/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({
      confirmationToken: token,
      confirmationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.send('⚠️ Confirmation link is invalid or has expired.');
    }

    user.isConfirmed = true;
    user.confirmationToken = undefined;
    user.confirmationExpires = undefined;
    await user.save();

    return res.render('confirmationSuccess');
  } catch (err) {
    console.error(err);
    return res.status(500).send('❌ Server error during confirmation.');
  }
});

// ----- GET Login Page -----
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    error: null
  });
});

// ----- POST Login Handler -----
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.render('login', { title: 'Login', error: 'Email not found.' });
    }

    if (!user.isConfirmed) {
      return res.render('login', { title: 'Login', error: 'Please confirm your email first.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.render('login', { title: 'Login', error: 'Invalid password.' });
    }

    return res.send(`✅ Welcome, ${user.username}!`);
  } catch (err) {
    console.error(err);
    return res.render('login', { title: 'Login', error: 'Something went wrong.' });
  }
});

// ----- GET Forgot Password Page -----
app.get('/forgot-password', (req, res) => {
  res.render('forgotpassword', { title: 'Forgot Password', error: null, success: null });
});

// ----- POST Forgot Password Handler -----
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('forgotpassword', { title: 'Forgot Password', error: 'Email not found.', success: null });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    user.resetToken = hashed;
    user.resetTokenExpires = Date.now() + 3600000;
    await user.save();

    const resetURL = `${process.env.BASE_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: `"Ninja Exodus" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Reset your password",
      text: `Reset your password by visiting this link:\n\n${resetURL}`
    });

    res.render('forgotpassword', { title: 'Forgot Password', error: null, success: 'Reset link sent to your email.' });
  } catch (err) {
    console.error(err);
    res.render('forgotpassword', { title: 'Forgot Password', error: 'Server error.', success: null });
  }
});

// ----- GET Reset Password Form -----
app.get('/reset-password/:token', async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ resetToken: hashedToken, resetTokenExpires: { $gt: Date.now() } });

  if (!user) return res.send('⚠️ Reset link is invalid or has expired.');

  res.render('resetPassword', { title: 'Reset Password', token: req.params.token, error: null });
});

// ----- POST Reset Password Handler -----
app.post('/reset-password/:token', async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) return res.send('❌ Passwords do not match.');

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ resetToken: hashedToken, resetTokenExpires: { $gt: Date.now() } });

  if (!user) return res.send('⚠️ Reset link is invalid or expired.');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  res.render('passwordResetSuccess');
});

// ----- GET Root Route -----
app.get('/', (req, res) => {
  res.redirect('/login');
});

// ----- Start Server -----
app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);
});
