import mongoose from 'mongoose';

const PortfolioSchema = new mongoose.Schema(
  {
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String, // Cloudinary public_id for deletion
        caption: String,
      },
    ],
    beforeImages: [
      {
        url: String,
        publicId: String,
      },
    ],
    afterImages: [
      {
        url: String,
        publicId: String,
      },
    ],
    completedDate: {
      type: Date,
    },
    client: {
      type: String, // Client name (optional, for privacy)
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for artisan's portfolio queries
PortfolioSchema.index({ artisan: 1, isActive: 1 });

const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

export default Portfolio;