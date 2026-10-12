import mongoose from 'mongoose';

const giftBannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  publicId: { type: String }, // Cloudinary se delete karne ke liye
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('GiftBanner', giftBannerSchema);