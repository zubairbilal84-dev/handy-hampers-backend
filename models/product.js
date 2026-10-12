import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  color: String,
  size: String,
  mrp: Number,
  price: Number,
  stock: { type: String, default: 'In Stock' },
  images: [String]
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String },
  categories: [{ type: String }],
  shortDesc: { type: String },
  longDesc: { type: String },
  stockStatus: { type: String, default: 'In Stock' },
  tags: [{ type: String }],
  isVariable: { type: Boolean, default: false },
  mainImage: { type: String, required: true },
  mrp: { type: Number },
  price: { type: Number },
  galleryImages: [{ type: String }],
  colors: [{ type: String }],
  sizes: [{ type: String }],
  variants: [variantSchema]
}, { timestamps: true });

export default mongoose.model('Product', productSchema);