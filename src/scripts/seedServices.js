import mongoose from "mongoose";
import dotenv from "dotenv";
import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";
import connectDB from "../config/database.js";
import "colors";

dotenv.config();

const categories = [
  {
    name: "Plumbing",
    description: "Water pipes, drainage, taps, and plumbing repairs",
    icon: "plumbing-icon.png",
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "Carpentry",
    description: "Wood work, furniture, door repairs, and custom carpentry",
    icon: "carpentry-icon.png",
    displayOrder: 2,
    isActive: true,
  },
  {
    name: "Electrical Work",
    description: "Electrical installations, repairs, and wiring",
    icon: "electrical-icon.png",
    displayOrder: 3,
    isActive: true,
  },
  {
    name: "Painting & Decoration",
    description: "Interior and exterior painting services",
    icon: "painting-icon.png",
    displayOrder: 4,
    isActive: true,
  },
  {
    name: "Auto Mechanics",
    description: "Vehicle repairs and maintenance",
    icon: "mechanic-icon.png",
    displayOrder: 5,
    isActive: true,
  },
  {
    name: "Air Conditioning",
    description: "AC installation, repair, and maintenance",
    icon: "ac-icon.png",
    displayOrder: 6,
    isActive: true,
  },
  {
    name: "Cleaning Services",
    description: "Home and office cleaning services",
    icon: "cleaning-icon.png",
    displayOrder: 7,
    isActive: true,
  },
  {
    name: "Security Services",
    description: "Security guards, CCTV installation, and monitoring",
    icon: "security-icon.png",
    displayOrder: 8,
    isActive: true,
  },
];

const services = [
  // ========================================
  // PLUMBING SERVICES
  // ========================================
  
  // Example: simple_fixed
  {
    name: "Tap Installation",
    categoryName: "Plumbing",
    description: "Install new taps, faucets, or replace old ones. Includes labor only.",
    shortDescription: "Install or replace taps",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 3000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 3000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: {
        enabled: true,
        multiplier: 1.5,
        description: "Same-day service",
      },
      emergency: {
        enabled: true,
        multiplier: 2.0,
        description: "Within 2 hours",
      },
      afterHours: {
        enabled: true,
        multiplier: 1.3,
        description: "6PM - 8AM",
      },
      weekend: {
        enabled: true,
        multiplier: 1.2,
        description: "Saturday/Sunday",
      },
    },
    commonTasks: ["Remove old tap", "Install new tap", "Test for leaks"],
    tags: ["plumbing", "tap", "faucet", "installation"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  // Example: unit_based
  {
    name: "Pipe Repair",
    categoryName: "Plumbing",
    description: "Fix leaking, burst, or damaged water pipes. Price per meter of pipe.",
    shortDescription: "Fix leaking or burst pipes",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 8000, // First meter
      pricePerAdditionalUnit: 5000, // Each additional meter
      unitName: "meter",
      unitLabel: "meters",
      bulkDiscount: {
        enabled: true,
        threshold: 5,
        discountedPrice: 4000, // After 5 meters
      },
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 8000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    commonTasks: ["Leak detection", "Pipe replacement", "Joint sealing"],
    tags: ["plumbing", "pipes", "leak", "water", "repair"],
    requiresPhotos: true,
    minPhotos: 2,
    isPopular: true,
    isActive: true,
  },

  // Example: tiered
  {
    name: "Toilet Repair",
    categoryName: "Plumbing",
    description: "Fix toilet flushing issues, leaks, or blockages. Price depends on complexity.",
    shortDescription: "Repair toilet problems",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Minor Issue",
          description: "Simple flush repair, replace chain/flapper",
          price: 4000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Moderate Issue",
          description: "Fix leak, replace valve or float",
          price: 8000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "Major Issue",
          description: "Replace internal mechanisms, fix severe blockage",
          price: 15000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 4000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["plumbing", "toilet", "repair", "flush", "blockage"],
    requiresPhotos: true,
    minPhotos: 1,
    isPopular: true,
    isActive: true,
  },

  // Example: component_based
  {
    name: "Complete Plumbing Package",
    categoryName: "Plumbing",
    description: "Comprehensive plumbing service - select what you need",
    shortDescription: "Custom plumbing service",
    pricingModel: "component_based",
    pricingConfig: {
      components: [
        {
          id: "comp_1",
          name: "Leak Detection",
          description: "Inspect and identify leak source",
          type: "required",
          pricing: {
            type: "fixed",
            price: 5000,
          },
          displayOrder: 1,
        },
        {
          id: "comp_2",
          name: "Pipe Replacement",
          description: "Replace damaged pipes",
          type: "optional",
          pricing: {
            type: "per_unit",
            pricePerUnit: 3000,
            unitName: "meter",
            minimumUnits: 1,
            maximumUnits: 20,
          },
          displayOrder: 2,
        },
        {
          id: "comp_3",
          name: "Valve Installation",
          description: "Install new shut-off valve",
          type: "optional",
          pricing: {
            type: "fixed",
            price: 7000,
          },
          displayOrder: 3,
        },
        {
          id: "comp_4",
          name: "Drain Cleaning",
          description: "Clear blocked drains",
          type: "optional",
          pricing: {
            type: "fixed",
            price: 6000,
          },
          displayOrder: 4,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 5000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["plumbing", "package", "comprehensive"],
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  // Example: inspection_required
  {
    name: "Water Heater Installation",
    categoryName: "Plumbing",
    description: "Install or repair water heaters and boilers. Requires on-site inspection for accurate quote.",
    shortDescription: "Install/repair water heaters",
    pricingModel: "inspection_required",
    pricingConfig: {
      inspectionFee: 5000,
      inspectionFeeRefundable: true,
      estimatedRange: {
        min: 15000,
        max: 50000,
      },
      message: "Final price will be provided after on-site inspection. Inspection fee refundable if you proceed.",
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 0,
      depositRequired: {
        enabled: true,
        percentage: 50,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["plumbing", "water heater", "boiler", "installation"],
    requiresInspection: true,
    requiresPhotos: true,
    minPhotos: 3,
    isActive: true,
  },

  {
    name: "Drain Cleaning",
    categoryName: "Plumbing",
    description: "Clear blocked drains and sewage systems",
    shortDescription: "Clear blocked drains",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 6000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 6000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["plumbing", "drain", "blockage", "cleaning", "sewage"],
    requiresPhotos: true,
    minPhotos: 1,
    isActive: true,
  },

  // ========================================
  // CARPENTRY SERVICES
  // ========================================

  // Example: unit_based
  {
    name: "Door Repair",
    categoryName: "Carpentry",
    description: "Fix broken doors, hinges, locks, or door frames. Price per door.",
    shortDescription: "Repair doors and hinges",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 8000, // First door
      pricePerAdditionalUnit: 6000, // Each additional door
      unitName: "door",
      unitLabel: "doors",
      bulkDiscount: {
        enabled: true,
        threshold: 3,
        discountedPrice: 5000,
      },
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 8000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["carpentry", "door", "repair", "hinges", "lock"],
    requiresPhotos: true,
    minPhotos: 2,
    isPopular: true,
    isActive: true,
  },

  {
    name: "Furniture Assembly",
    categoryName: "Carpentry",
    description: "Assemble flat-pack furniture, wardrobes, shelves. Price per item.",
    shortDescription: "Assemble furniture",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 8000,
      pricePerAdditionalUnit: 7000,
      unitName: "item",
      unitLabel: "items",
      bulkDiscount: {
        enabled: true,
        threshold: 5,
        discountedPrice: 6000,
      },
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 8000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["carpentry", "furniture", "assembly", "wardrobe"],
    requiresPhotos: false,
    minPhotos: 0,
    isActive: true,
  },

  // Example: fully_custom
  {
    name: "Custom Woodwork",
    categoryName: "Carpentry",
    description: "Custom furniture, cabinets, shelving, and wood projects. Price negotiable based on design and materials.",
    shortDescription: "Custom wood projects",
    pricingModel: "fully_custom",
    pricingConfig: {
      message: "Price varies based on design, materials, and complexity. Book a free consultation to discuss your project.",
      suggestedRange: {
        min: 20000,
        max: 500000,
      },
      requiresConsultation: true,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 0,
      depositRequired: {
        enabled: true,
        percentage: 50,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: false, multiplier: 1, description: "" },
    },
    tags: ["carpentry", "custom", "furniture", "cabinet", "wood"],
    requiresInspection: true,
    requiresPhotos: true,
    minPhotos: 3,
    isActive: true,
  },

  {
    name: "Window Repair",
    categoryName: "Carpentry",
    description: "Fix broken windows, frames, or sliding mechanisms",
    shortDescription: "Repair windows",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Minor Repair",
          description: "Fix lock, handle, or small crack",
          price: 6000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Frame Repair",
          description: "Repair or replace window frame",
          price: 15000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "Full Window Replacement",
          description: "Replace entire window unit",
          price: 25000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 6000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["carpentry", "window", "repair", "frame"],
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  // ========================================
  // ELECTRICAL WORK
  // ========================================

  {
    name: "Socket & Switch Installation",
    categoryName: "Electrical Work",
    description: "Install or replace electrical sockets and switches. Price per unit.",
    shortDescription: "Install sockets/switches",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 2500,
      pricePerAdditionalUnit: 2000,
      unitName: "socket",
      unitLabel: "sockets",
      bulkDiscount: {
        enabled: true,
        threshold: 10,
        discountedPrice: 1500,
      },
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 2500,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["electrical", "socket", "switch", "installation"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  {
    name: "Light Fixture Installation",
    categoryName: "Electrical Work",
    description: "Install ceiling lights, chandeliers, or outdoor lighting",
    shortDescription: "Install light fixtures",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Simple Light",
          description: "Basic ceiling light or bulb holder",
          price: 3000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Chandelier/Fan Light",
          description: "Chandelier or ceiling fan with light",
          price: 8000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "Complex Installation",
          description: "Multiple fixtures, outdoor lighting, or recessed lights",
          price: 15000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 3000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["electrical", "lighting", "chandelier", "fixture"],
    requiresPhotos: false,
    minPhotos: 0,
    isActive: true,
  },

  {
    name: "Electrical Wiring",
    categoryName: "Electrical Work",
    description: "Install new wiring, rewiring, or electrical installations. Requires inspection.",
    shortDescription: "Install or repair wiring",
    pricingModel: "inspection_required",
    pricingConfig: {
      inspectionFee: 8000,
      inspectionFeeRefundable: true,
      estimatedRange: {
        min: 30000,
        max: 200000,
      },
      message: "Wiring projects require inspection. We'll provide a detailed quote after assessing your property.",
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 0,
      depositRequired: {
        enabled: true,
        percentage: 40,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: false, multiplier: 1, description: "" },
    },
    tags: ["electrical", "wiring", "installation", "rewiring"],
    requiresInspection: true,
    requiresPhotos: true,
    minPhotos: 3,
    isActive: true,
  },

  {
    name: "Electrical Fault Diagnosis",
    categoryName: "Electrical Work",
    description: "Diagnose and fix electrical faults and power issues",
    shortDescription: "Fix electrical faults",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 7000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 7000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["electrical", "fault", "diagnosis", "repair", "power"],
    requiresPhotos: false,
    minPhotos: 0,
    isActive: true,
  },

  // ========================================
  // PAINTING SERVICES
  // ========================================

  // Example: area_based
  {
    name: "Interior Painting",
    categoryName: "Painting & Decoration",
    description: "Paint interior walls, ceilings, and rooms. Price per square meter.",
    shortDescription: "Paint interior spaces",
    pricingModel: "area_based",
    pricingConfig: {
      pricePerUnit: 800, // Per sqm
      unitName: "sqm",
      minimumArea: 10,
      maximumArea: 1000,
      minimumCharge: 15000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 15000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["painting", "interior", "walls", "ceiling"],
    requiresInspection: false,
    requiresPhotos: true,
    minPhotos: 3,
    isPopular: true,
    isActive: true,
  },

  {
    name: "Exterior Painting",
    categoryName: "Painting & Decoration",
    description: "Paint exterior walls, gates, and outdoor surfaces",
    shortDescription: "Paint exterior surfaces",
    pricingModel: "area_based",
    pricingConfig: {
      pricePerUnit: 1200, // Per sqm
      unitName: "sqm",
      minimumArea: 20,
      maximumArea: 2000,
      minimumCharge: 30000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 30000,
      depositRequired: {
        enabled: true,
        percentage: 40,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["painting", "exterior", "walls", "gate"],
    requiresInspection: false,
    requiresPhotos: true,
    minPhotos: 3,
    isActive: true,
  },

  {
    name: "Touch-up Painting",
    categoryName: "Painting & Decoration",
    description: "Touch up small areas, fix paint chips and scratches",
    shortDescription: "Touch up small areas",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 5000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 5000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["painting", "touch-up", "repair"],
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  {
    name: "Wallpaper Installation",
    categoryName: "Painting & Decoration",
    description: "Install or remove wallpaper. Price per square meter.",
    shortDescription: "Install wallpaper",
    pricingModel: "area_based",
    pricingConfig: {
      pricePerUnit: 1500,
      unitName: "sqm",
      minimumArea: 5,
      maximumArea: 200,
      minimumCharge: 10000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 10000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["painting", "wallpaper", "installation", "decoration"],
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  // ========================================
  // AUTO MECHANICS
  // ========================================

  {
    name: "Oil Change",
    categoryName: "Auto Mechanics",
    description: "Change engine oil and oil filter",
    shortDescription: "Change engine oil",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 8000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 8000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.3, description: "Same-day service" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["mechanic", "car", "oil", "maintenance"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  {
    name: "Battery Replacement",
    categoryName: "Auto Mechanics",
    description: "Replace car battery",
    shortDescription: "Replace car battery",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 5000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 5000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Roadside emergency" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["mechanic", "car", "battery", "replacement"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  {
    name: "Brake Repair",
    categoryName: "Auto Mechanics",
    description: "Repair or replace brake pads, discs, and brake systems",
    shortDescription: "Repair brakes",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Brake Pad Replacement",
          description: "Replace worn brake pads only",
          price: 15000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Brake Pads + Disc",
          description: "Replace brake pads and disc rotors",
          price: 30000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "Complete Brake System",
          description: "Full brake system overhaul including calipers",
          price: 50000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 15000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.3, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 1.8, description: "Immediate roadside" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["mechanic", "car", "brake", "repair"],
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  {
    name: "Car Engine Repair",
    categoryName: "Auto Mechanics",
    description: "Diagnose and repair engine problems. Requires inspection for accurate quote.",
    shortDescription: "Repair car engine",
    pricingModel: "inspection_required",
    pricingConfig: {
      inspectionFee: 10000,
      inspectionFeeRefundable: true,
      estimatedRange: {
        min: 20000,
        max: 500000,
      },
      message: "Engine repairs vary widely. We'll diagnose the issue and provide a detailed quote.",
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 0,
      depositRequired: {
        enabled: true,
        percentage: 50,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: false, multiplier: 1, description: "" },
    },
    tags: ["mechanic", "car", "engine", "repair"],
    requiresInspection: true,
    requiresPhotos: true,
    minPhotos: 3,
    isActive: true,
  },

  // ========================================
  // AIR CONDITIONING
  // ========================================

  {
    name: "AC Gas Refill",
    categoryName: "Air Conditioning",
    description: "Refill AC refrigerant gas. Price per kilogram.",
    shortDescription: "Refill AC gas",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 12000, // First kg
      pricePerAdditionalUnit: 10000, // Each additional kg
      unitName: "kg",
      unitLabel: "kilograms",
      bulkDiscount: {
        enabled: false,
        threshold: 0,
        discountedPrice: 0,
      },
    },
    universalFeatures: {
      materialsIncluded: true, // Gas is included
      minimumCharge: 12000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["ac", "air conditioning", "gas", "refill"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  {
    name: "AC Maintenance",
    categoryName: "Air Conditioning",
    description: "Regular AC servicing and maintenance - cleaning, filter replacement",
    shortDescription: "Service AC unit",
    pricingModel: "simple_fixed",
    pricingConfig: {
      basePrice: 8000,
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 8000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["ac", "air conditioning", "maintenance", "servicing"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  {
    name: "AC Repair",
    categoryName: "Air Conditioning",
    description: "Repair faulty air conditioning units",
    shortDescription: "Repair AC",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Minor Repair",
          description: "Fix simple issues like thermostat, remote, or drainage",
          price: 8000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Moderate Repair",
          description: "Compressor issues, refrigerant leak, or fan motor",
          price: 18000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "Major Repair",
          description: "Replace compressor, major electrical fault, or system overhaul",
          price: 35000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 8000,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Same-day service" },
      emergency: { enabled: true, multiplier: 2.0, description: "Within 2 hours" },
      afterHours: { enabled: true, multiplier: 1.3, description: "6PM - 8AM" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["ac", "air conditioning", "repair"],
    requiresPhotos: true,
    minPhotos: 2,
    isPopular: true,
    isActive: true,
  },

  {
    name: "AC Installation",
    categoryName: "Air Conditioning",
    description: "Install new air conditioning units. Includes mounting, piping, and electrical connection.",
    shortDescription: "Install AC unit",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Small AC (1-1.5HP)",
          description: "For small rooms, includes standard installation",
          price: 15000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Medium AC (2-2.5HP)",
          description: "For medium rooms, includes standard installation",
          price: 25000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "Large AC (3HP+)",
          description: "For large spaces, includes complex installation",
          price: 40000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: false,
      minimumCharge: 15000,
      depositRequired: {
        enabled: true,
        percentage: 40,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["ac", "air conditioning", "installation"],
    requiresInspection: false,
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  // ========================================
  // CLEANING SERVICES
  // ========================================

  {
    name: "Home Cleaning",
    categoryName: "Cleaning Services",
    description: "General home cleaning - dusting, mopping, vacuuming, kitchen, and bathroom cleaning",
    shortDescription: "Clean your home",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Studio/1-Bedroom",
          description: "Up to 50 sqm",
          price: 15000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "2-Bedroom",
          description: "50-80 sqm",
          price: 25000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "3-Bedroom",
          description: "80-120 sqm",
          price: 35000,
          displayOrder: 3,
        },
        {
          id: "tier_4",
          name: "4+ Bedroom/Large House",
          description: "120+ sqm",
          price: 50000,
          displayOrder: 4,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: true, // Cleaning supplies included
      minimumCharge: 15000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.3, description: "Same-day service" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["cleaning", "home", "housekeeping", "maid"],
    requiresPhotos: false,
    minPhotos: 0,
    isPopular: true,
    isActive: true,
  },

  {
    name: "Deep Cleaning",
    categoryName: "Cleaning Services",
    description: "Thorough deep cleaning including hard-to-reach areas, appliances, and detailed scrubbing",
    shortDescription: "Deep clean your space",
    pricingModel: "area_based",
    pricingConfig: {
      pricePerUnit: 600, // Per sqm
      unitName: "sqm",
      minimumArea: 20,
      maximumArea: 500,
      minimumCharge: 20000,
    },
    universalFeatures: {
      materialsIncluded: true,
      minimumCharge: 20000,
      depositRequired: {
        enabled: false,
        percentage: 0,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["cleaning", "deep cleaning", "thorough"],
    requiresPhotos: false,
    minPhotos: 0,
    isActive: true,
  },

  {
    name: "Post-Construction Cleaning",
    categoryName: "Cleaning Services",
    description: "Clean up after construction or renovation - remove dust, debris, and polish surfaces",
    shortDescription: "Post-construction cleanup",
    pricingModel: "inspection_required",
    pricingConfig: {
      inspectionFee: 5000,
      inspectionFeeRefundable: true,
      estimatedRange: {
        min: 30000,
        max: 200000,
      },
      message: "Construction cleanup varies by debris amount. We'll assess and provide a quote.",
    },
    universalFeatures: {
      materialsIncluded: true,
      minimumCharge: 0,
      depositRequired: {
        enabled: true,
        percentage: 30,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: false, multiplier: 1, description: "" },
    },
    tags: ["cleaning", "construction", "renovation", "debris"],
    requiresInspection: true,
    requiresPhotos: true,
    minPhotos: 3,
    isActive: true,
  },

  // ========================================
  // SECURITY SERVICES
  // ========================================

  {
    name: "Event Security",
    categoryName: "Security Services",
    description: "Professional security guards for events, parties, and gatherings. Price per guard per day.",
    shortDescription: "Security guards for events",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 15000, // First guard
      pricePerAdditionalUnit: 14000, // Each additional guard
      unitName: "guard",
      unitLabel: "guards",
      bulkDiscount: {
        enabled: true,
        threshold: 5,
        discountedPrice: 12000,
      },
    },
    universalFeatures: {
      materialsIncluded: true, // Uniforms and equipment included
      minimumCharge: 15000,
      depositRequired: {
        enabled: true,
        percentage: 50,
      },
    },
    modifiers: {
      urgent: { enabled: true, multiplier: 1.5, description: "Short notice (under 48hrs)" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: true, multiplier: 1.3, description: "Night shift (8PM-6AM)" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["security", "guard", "event", "protection"],
    requiresPhotos: false,
    minPhotos: 0,
    isActive: true,
  },

  {
    name: "CCTV Installation",
    categoryName: "Security Services",
    description: "Install CCTV cameras and surveillance systems. Price per camera.",
    shortDescription: "Install CCTV cameras",
    pricingModel: "unit_based",
    pricingConfig: {
      basePrice: 25000, // First camera + DVR setup
      pricePerAdditionalUnit: 15000, // Each additional camera
      unitName: "camera",
      unitLabel: "cameras",
      bulkDiscount: {
        enabled: true,
        threshold: 8,
        discountedPrice: 12000,
      },
    },
    universalFeatures: {
      materialsIncluded: false, // Cameras sold separately
      minimumCharge: 25000,
      depositRequired: {
        enabled: true,
        percentage: 50,
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: true, multiplier: 1.2, description: "Saturday/Sunday" },
    },
    tags: ["security", "cctv", "camera", "surveillance", "installation"],
    requiresInspection: false,
    requiresPhotos: true,
    minPhotos: 2,
    isActive: true,
  },

  {
    name: "Monthly Security Guard Service",
    categoryName: "Security Services",
    description: "Hire security guards on a monthly contract for your property",
    shortDescription: "Monthly security service",
    pricingModel: "tiered",
    pricingConfig: {
      tiers: [
        {
          id: "tier_1",
          name: "Day Shift Only",
          description: "One guard, 8AM-6PM, 30 days",
          price: 80000,
          displayOrder: 1,
        },
        {
          id: "tier_2",
          name: "Night Shift Only",
          description: "One guard, 6PM-8AM, 30 days",
          price: 90000,
          displayOrder: 2,
        },
        {
          id: "tier_3",
          name: "24/7 Coverage",
          description: "Two guards rotating, full coverage",
          price: 160000,
          displayOrder: 3,
        },
      ],
    },
    universalFeatures: {
      materialsIncluded: true,
      minimumCharge: 80000,
      depositRequired: {
        enabled: true,
        percentage: 50, // First month upfront
      },
    },
    modifiers: {
      urgent: { enabled: false, multiplier: 1, description: "" },
      emergency: { enabled: false, multiplier: 1, description: "" },
      afterHours: { enabled: false, multiplier: 1, description: "" },
      weekend: { enabled: false, multiplier: 1, description: "" },
    },
    tags: ["security", "guard", "monthly", "contract"],
    requiresPhotos: false,
    minPhotos: 0,
    isActive: true,
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("🗑️  Clearing existing data...".yellow);
    await Service.deleteMany({});
    await ServiceCategory.deleteMany({});

    console.log("📁 Creating categories...".cyan);
    const createdCategories = [];
    for (const catData of categories) {
      const category = new ServiceCategory(catData);
      await category.save(); // Triggers pre("save") → generates slug
      createdCategories.push(category);
    }
    console.log(`✅ ${createdCategories.length} categories created`.green);

    console.log("🛠️  Creating services...".cyan);
    const servicesWithCategories = services.map((service) => {
      const category = createdCategories.find(
        (cat) => cat.name === service.categoryName
      );
      if (!category) {
        throw new Error(`Category not found: ${service.categoryName}`);
      }
      const { categoryName, ...serviceData } = service;
      return {
        ...serviceData,
        category: category._id,
      };
    });

    const createdServices = await Service.insertMany(servicesWithCategories);
    console.log(`✅ ${createdServices.length} services created`.green);

    console.log("📊 Updating category statistics...".cyan);
    for (const category of createdCategories) {
      await category.updateServiceCount();
    }
    console.log("✅ Statistics updated".green);

    console.log("\n🎉 Database seeded successfully!".bgGreen.black);
    console.log(`\n📋 Summary:`.cyan);
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Services: ${createdServices.length}`);
    console.log(`\n💡 Pricing Models Used:`.cyan);
    
    const modelCounts = {};
    createdServices.forEach(service => {
      modelCounts[service.pricingModel] = (modelCounts[service.pricingModel] || 0) + 1;
    });
    
    Object.entries(modelCounts).forEach(([model, count]) => {
      console.log(`   - ${model}: ${count} services`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:".red, error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seedDatabase();