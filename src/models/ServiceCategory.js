import mongoose from "mongoose";
import Artisan from "./Artisan.js";

const ServiceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide category name"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String, // URL to icon image
      default: "default-category-icon.png",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    totalServices: {
      type: Number,
      default: 0,
    },
    totalArtisans: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create slug from name before saving
ServiceCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// Virtual populate services
ServiceCategorySchema.virtual("services", {
  ref: "Service",
  localField: "_id",
  foreignField: "category",
});

// Update totalServices count
ServiceCategorySchema.methods.updateServiceCount = async function () {
  const Service = mongoose.model("Service");
  this.totalServices = await Service.countDocuments({
    category: this._id,
    isActive: true,
  });
  await this.save();
};

// Update totalArtisans count
ServiceCategorySchema.methods.updateArtisanCount = async function () {
  // const Artisan = mongoose.model("Artisan");
  this.totalArtisans = await Artisan.countDocuments({
    serviceCategories: this._id,
    isActive: true,
  });
  await this.save();
};

const ServiceCategory = mongoose.model(
  "ServiceCategory",
  ServiceCategorySchema
);

export default ServiceCategory;
