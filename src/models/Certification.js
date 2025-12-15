import mongoose from 'mongoose';

const CertificationSchema = new mongoose.Schema(
  {
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide certification title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    issuingOrganization: {
      type: String,
      required: [true, 'Please provide issuing organization'],
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    credentialID: {
      type: String,
      trim: true,
    },
    credentialURL: {
      type: String,
      trim: true,
    },
    document: {
      url: String,
      publicId: String, // Cloudinary public_id
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for artisan's certifications
CertificationSchema.index({ artisan: 1, isActive: 1 });

const Certification = mongoose.model('Certification', CertificationSchema);

export default Certification;