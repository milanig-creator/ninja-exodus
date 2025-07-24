require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// User Schema (minimal for cleanup)
const userSchema = new mongoose.Schema({
  email: String,
  isConfirmed: Boolean,
  confirmationExpires: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Delete users whose confirmation has expired and are not confirmed
async function deleteExpiredUnconfirmedUsers() {
  try {
    const result = await User.deleteMany({
      isConfirmed: false,
      confirmationExpires: { $lt: new Date() }
    });

    console.log(`🧹 Deleted ${result.deletedCount} unconfirmed expired user(s).`);
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  } finally {
    mongoose.disconnect();
  }
}

deleteExpiredUnconfirmedUsers();
