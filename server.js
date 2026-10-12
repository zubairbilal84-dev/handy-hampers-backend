import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Product Model Import
import Product from './models/product.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Route (Render status check)
app.get('/', (req, res) => {
  res.send('Handy Hampers API is Live and Running 🚀');
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Setup (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully 🍃'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// ==================== SCHEMAS & MODELS ====================

// 1. Banner Schema & Model
const bannerSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: [
      'heroDesktop', 
      'heroMobile', 
      'squareDesktop', 
      'squareMobile', 
      'reels', 
      'promoDesktop', 
      'promoMobile',
      'giftHampers',
      'giftHampersDesktop',
      'giftHampersMobile',
      'metalHampersDesktop',
      'metalHampersMobile',
      'festivalHampersDesktop',
      'festivalHampersMobile',
      'weddingHampersDesktop',
      'weddingHampersMobile',
      'corporateHampersDesktop',
      'corporateHampersMobile',
      'occasionsHampersDesktop',
      'occasionsHampersMobile'
    ]
  },
  title: { type: String, default: '' },
  link: { type: String, default: '' },
  slotIndex: { type: Number, default: null },
  image: { type: String, required: true },
  public_id: String
}, { timestamps: true });

const Banner = mongoose.model('Banner', bannerSchema);

// 2. Category Schema & Model
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'Main' },
  parent: { type: String, default: 'None' },
  status: { type: String, default: 'Active' },
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

// 3. Order Schema & Model
const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' }
  },
  paymentMethod: { type: String, default: 'Cash on Delivery' },
  items: [
    {
      id: String,
      name: String,
      price: Number,
      quantity: Number,
      img: String
    }
  ],
  totalItems: { type: Number, default: 1 },
  totalPrice: { type: Number, required: true },
  status: { type: String, default: 'Packed' },
  currentLocation: { type: String, default: 'Main Warehouse, Delhi' }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// 4. Review Schema & Model (With Google User ID & Email)
const reviewSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, default: '' },
  userId: { type: String, default: '' },
  productName: { type: String, default: 'Luxury Handcrafted Hamper' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  status: { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Approved' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

// 5. User Schema & Model (For Google OAuth Sync)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  picture: { type: String, default: '' },
  googleId: { type: String, default: '' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Helper function to upload Buffer directly to Cloudinary
const streamUpload = (fileBuffer, folderName = 'handy_hampers_uploads') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

// ==================== AUTH ROUTES ====================

// Google OAuth Sync
app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, picture, sub } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: name || 'Handy Customer',
        email,
        picture: picture || '',
        googleId: sub || ''
      });
      await user.save();
    } else {
      user.name = name || user.name;
      user.picture = picture || user.picture;
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== CATEGORIES ROUTES ====================

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== BANNERS ROUTES ====================

app.get('/api/banners', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/banners', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image file is missing' });
    const { type, title, link, slotIndex } = req.body;
    if (!type) return res.status(400).json({ message: 'Banner type is required' });

    if (slotIndex !== undefined && slotIndex !== null && slotIndex !== 'null' && slotIndex !== '') {
      const parsedSlot = Number(slotIndex);
      const existingSlot = await Banner.findOne({ type, slotIndex: parsedSlot });
      if (existingSlot) {
        if (existingSlot.public_id) {
          try { await cloudinary.uploader.destroy(existingSlot.public_id); } catch (cErr) { console.error(cErr); }
        }
        await Banner.findByIdAndDelete(existingSlot._id);
      }
    }

    const uploadResult = await streamUpload(req.file.buffer, 'handy_hampers_banners');

    const newBanner = new Banner({
      type,
      title: title || '',
      link: link || '',
      slotIndex: (slotIndex !== undefined && slotIndex !== null && slotIndex !== 'null' && slotIndex !== '') ? Number(slotIndex) : null,
      image: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });

    await newBanner.save();
    res.status(201).json(newBanner);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Upload Failed' });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    if (banner.public_id) await cloudinary.uploader.destroy(banner.public_id);
    await Banner.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PRODUCT ROUTES ====================

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const uploadResult = await streamUpload(req.file.buffer, 'handy_hampers_products');
    res.status(200).json({ url: uploadResult.secure_url, public_id: uploadResult.public_id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== ORDERS ROUTES ====================

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Update Order Error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete Order Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== REVIEWS ROUTES ====================

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Fetch Reviews Error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { userName, userEmail, userId, productName, rating, comment, status, date } = req.body;
    const newReview = new Review({
      userName,
      userEmail: userEmail || '',
      userId: userId || '',
      productName: productName || 'Luxury Handcrafted Hamper',
      rating: Number(rating) || 5,
      comment,
      status: status || 'Approved',
      date: date || new Date().toISOString().split('T')[0]
    });
    const saved = await newReview.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/reviews/:id', async (req, res) => {
  try {
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedReview) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json(updatedReview);
  } catch (error) {
    console.error('Update Review Error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete Review Error:', error);
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));