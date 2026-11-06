import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';
import Category from '../models/Category';
import Collection from '../models/Collection';
import Occasion from '../models/Occasion';
import FitType from '../models/FitType';
import Product from '../models/Product';

if (process.platform === 'win32') {
  try {
    dns.setDefaultResultOrder?.('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set in .env');

    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB Atlas...');

    const toSlug = (text: string) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // ─── 1. SEED CATEGORIES ──────────────────────────────────────────────────
    const categoriesData = [
      { name: 'Kurtis', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80' },
      { name: 'Sarees', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80' },
      { name: 'Co-ord Sets', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80' },
      { name: 'Anarkalis & Gowns', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80' },
      { name: 'Maxi Dresses', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80' },
    ];

    const categoryMap = new Map<string, any>();
    for (const cat of categoriesData) {
      const doc = await Category.findOneAndUpdate(
        { name: cat.name },
        { $set: { name: cat.name, slug: toSlug(cat.name), image: cat.image, isDeleted: false } },
        { upsert: true, returnDocument: 'after' }
      );
      categoryMap.set(cat.name, doc);
    }
    console.log(` Created/Updated ${categoryMap.size} Categories`);

    // ─── 2. SEED COLLECTIONS ─────────────────────────────────────────────────
    const collectionsData = [
      {
        name: 'Summer Bloom 2026',
        description: 'Breathable mulmul and hand-printed florals crafted for effortless sunlit days.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Royal Silk Heritage',
        description: 'Opulent Banarasi weaves, pure Kanjivarams, and regal zari borders.',
        image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Festive Edit 2026',
        description: 'Vibrant celebratory hues featuring intricate thread work and mirror embellishments.',
        image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Ethereal Pastels',
        description: 'Dreamy blush tones, soothing lilacs, and subtle organza textures.',
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80',
      },
    ];

    const collectionMap = new Map<string, any>();
    for (const col of collectionsData) {
      const doc = await Collection.findOneAndUpdate(
        { name: col.name },
        { $set: { name: col.name, slug: toSlug(col.name), description: col.description, image: col.image, isDeleted: false } },
        { upsert: true, returnDocument: 'after' }
      );
      collectionMap.set(col.name, doc);
    }
    console.log(` Created/Updated ${collectionMap.size} Collections`);

    // ─── 3. SEED OCCASIONS ───────────────────────────────────────────────────
    const occasionsData = [
      { name: 'Festive Celebration', description: 'Traditional and joyous festivities like Diwali, Eid, and Onam.' },
      { name: 'Wedding / Bridal', description: 'Grand celebrations, sangeet, and luxury bridal gatherings.' },
      { name: 'Evening Party', description: 'Sophisticated silhouettes for cocktail evenings and celebrations.' },
      { name: 'Casual Daywear', description: 'Effortless everyday grace with comfortable breathable fabrics.' },
      { name: 'Office & Formal', description: 'Refined, polished ethnic aesthetics suitable for professional wear.' },
    ];

    const occasionMap = new Map<string, any>();
    for (const occ of occasionsData) {
      const doc = await Occasion.findOneAndUpdate(
        { name: occ.name },
        { $set: { name: occ.name, slug: toSlug(occ.name), description: occ.description, isDeleted: false } },
        { upsert: true, returnDocument: 'after' }
      );
      occasionMap.set(occ.name, doc);
    }
    console.log(` Created/Updated ${occasionMap.size} Occasions`);

    // ─── 4. SEED FIT TYPES ───────────────────────────────────────────────────
    const fitTypesData = [
      { name: 'A-Line', description: 'Fitted at the bodice and softly flared towards the hemline.' },
      { name: 'Flared Anarkali', description: 'Voluminous multi-kalidar circular flare for royal drape.' },
      { name: 'Straight Cut', description: 'Classic clean vertical silhouette with side slits.' },
      { name: 'Relaxed Fit', description: 'Loose, airy, and roomy design prioritizing comfort.' },
      { name: 'Tailored Fit', description: 'Contoured to gently accentuate body structure.' },
    ];

    const fitTypeMap = new Map<string, any>();
    for (const fit of fitTypesData) {
      const doc = await FitType.findOneAndUpdate(
        { name: fit.name },
        { $set: { name: fit.name, slug: toSlug(fit.name), description: fit.description, isDeleted: false } },
        { upsert: true, returnDocument: 'after' }
      );
      fitTypeMap.set(fit.name, doc);
    }
    console.log(` Created/Updated ${fitTypeMap.size} Fit Types`);

    // ─── 5. SEED 10 LUXURY APPAREL PRODUCTS ──────────────────────────────────
    const productsData = [
      // 1. Blush Pink Anarkali Set
      {
        name: 'Blush Pink Hand-Embroidered Anarkali Set',
        shortDescription: 'Chanderi silk anarkali kurti paired with tonal pants and an embroidered organza dupatta.',
        mainDescription: 'Exude understated royalty in this ethereal Blush Pink Anarkali Set. Tailored in pure Chanderi silk, the yoke features delicate threadwork and subtle sequin highlights. Accompanied by comfortable straight trousers and a sheer scallop-bordered organza dupatta.',
        productStory: 'Inspired by the floral courtyards of the Amber Palace, this piece brings regal elegance into contemporary festive evenings.',
        productDetails: [
          'Fabric: Pure Chanderi Silk with Cotton Lining',
          'Set Includes: Anarkali Kurti, Straight Pants, Organza Dupatta',
          'Sleeve Length: Full Sleeves with Gota Detailing',
          'Neckline: Sweetheart Neck with Hand Zari Work',
        ],
        category: categoryMap.get('Anarkalis & Gowns')._id,
        collectionId: collectionMap.get('Ethereal Pastels')._id,
        occasion: occasionMap.get('Festive Celebration')._id,
        fitType: fitTypeMap.get('Flared Anarkali')._id,
        fabric: 'Pure Chanderi Silk with Organza Dupatta',
        careInstructions: ['Dry clean only', 'Store in a cool, dry place', 'Iron on low reverse side'],
        weight: 650,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Blush Pink',
            images: [
              'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
              'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'XS', price: 2999, originalPrice: 4999, stock: 6 },
              { size: 'S', price: 2999, originalPrice: 4999, stock: 12 },
              { size: 'M', price: 2999, originalPrice: 4999, stock: 15 },
              { size: 'L', price: 2999, originalPrice: 4999, stock: 8 },
              { size: 'XL', price: 3199, originalPrice: 5299, stock: 5 },
            ],
          },
          {
            color: 'Sage Mint',
            images: [
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 2999, originalPrice: 4999, stock: 10 },
              { size: 'M', price: 2999, originalPrice: 4999, stock: 14 },
              { size: 'L', price: 2999, originalPrice: 4999, stock: 7 },
            ],
          },
        ],
        sizeChart: [
          { size: 'XS', bust: 34, waist: 30, hip: 36, length: 48, shoulder: 14 },
          { size: 'S', bust: 36, waist: 32, hip: 38, length: 48, shoulder: 14.5 },
          { size: 'M', bust: 38, waist: 34, hip: 40, length: 48, shoulder: 15 },
          { size: 'L', bust: 40, waist: 36, hip: 42, length: 48, shoulder: 15.5 },
          { size: 'XL', bust: 42, waist: 38, hip: 44, length: 48, shoulder: 16 },
        ],
      },

      // 2. Kanjivaram Silk Saree
      {
        name: 'Kanjivaram Silk Banarasi Saree in Emerald Green',
        shortDescription: 'Pure handwoven soft silk saree with antique golden zari pallu and brocade blouse piece.',
        mainDescription: 'An heirloom treasure handwoven by master artisans. Drenched in a rich emerald green hue, this saree features all-over floral jaal motifs woven with pure zari. Perfect for wedding ceremonies and grand celebrations.',
        productStory: 'A tribute to South Indian heritage weaving traditions, preserving timeless temple motifs in pure mulberry silk.',
        productDetails: [
          'Fabric: 100% Pure Kanjivaram Soft Silk',
          'Blouse Piece: Unstitched 80cm brocade fabric included',
          'Saree Length: 5.5 meters with rich zari pallu',
          'Weave: Handloom Zari Jacquard',
        ],
        category: categoryMap.get('Sarees')._id,
        collectionId: collectionMap.get('Royal Silk Heritage')._id,
        occasion: occasionMap.get('Wedding / Bridal')._id,
        fitType: fitTypeMap.get('Tailored Fit')._id,
        fabric: 'Pure Kanjivaram Mulberry Silk',
        careInstructions: ['Dry clean only', 'Keep wrapped in muslin cloth', 'Do not spray perfume directly on zari'],
        weight: 850,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Emerald Green',
            images: [
              'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [{ size: 'Free Size', price: 4499, originalPrice: 7999, stock: 9 }],
          },
          {
            color: 'Deep Crimson',
            images: [
              'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [{ size: 'Free Size', price: 4499, originalPrice: 7999, stock: 6 }],
          },
        ],
      },

      // 3. Ivory Floral Cotton Co-ord Set
      {
        name: 'Ivory Floral Hand-Block Mulmul Co-ord Set',
        shortDescription: 'Airy summer tunic shirt paired with relaxed flared culottes in hand-block floral print.',
        mainDescription: 'Designed for effortless chic. Crafted from featherlight, breathable mulmul cotton, this two-piece co-ord set features delicate botanical hand-block prints in earthy pastels with pearl button accents.',
        productStory: 'Created for balmy tropical afternoons and weekend escapes where breathable comfort is paramount.',
        productDetails: [
          'Fabric: 100% Organic Mulmul Cotton',
          'Fit: Comfort Relaxed Silhouette',
          'Features: Elasticated waistband with drawstring & side pockets',
        ],
        category: categoryMap.get('Co-ord Sets')._id,
        collectionId: collectionMap.get('Summer Bloom 2026')._id,
        occasion: occasionMap.get('Casual Daywear')._id,
        fitType: fitTypeMap.get('Relaxed Fit')._id,
        fabric: 'Organic Mulmul Cotton',
        careInstructions: ['Gentle hand wash in cold water', 'Dry in shade', 'Warm iron'],
        weight: 420,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Ivory Floral',
            images: [
              'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 1899, originalPrice: 2999, stock: 14 },
              { size: 'M', price: 1899, originalPrice: 2999, stock: 20 },
              { size: 'L', price: 1899, originalPrice: 2999, stock: 12 },
              { size: 'XL', price: 1899, originalPrice: 2999, stock: 7 },
            ],
          },
        ],
        sizeChart: [
          { size: 'S', bust: 38, waist: 34, hip: 40, length: 28, shoulder: 15 },
          { size: 'M', bust: 40, waist: 36, hip: 42, length: 28.5, shoulder: 15.5 },
          { size: 'L', bust: 42, waist: 38, hip: 44, length: 29, shoulder: 16 },
        ],
      },

      // 4. Mustard Yellow Mirror Work Straight Kurti Set
      {
        name: 'Mustard Yellow Mirror Work Straight Kurti Set',
        shortDescription: 'Straight-cut cotton silk kurti with real mirror embroidery, pants, and chiffon dupatta.',
        mainDescription: 'Celebrate auspicious occasions with radiant warmth. This mustard yellow kurti is decorated with authentic foil mirror embroidery along the neckline and cuffs. Complete with matching cigarette pants.',
        productStory: 'A modern tribute to Rajasthani mirror work, refined with clean geometric alignments.',
        productDetails: [
          'Fabric: Cotton Silk with Gotta Patti Border',
          'Embroidery: Mirror & Resham Threadwork',
          'Sleeve: 3/4th Sleeves with Contrast Piping',
        ],
        category: categoryMap.get('Kurtis')._id,
        collectionId: collectionMap.get('Festive Edit 2026')._id,
        occasion: occasionMap.get('Festive Celebration')._id,
        fitType: fitTypeMap.get('Straight Cut')._id,
        fabric: 'Cotton Silk Blend',
        careInstructions: ['Dry clean first wash', 'Gentle hand wash thereafter'],
        weight: 550,
        isFeatured: false,
        mainImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Mustard Yellow',
            images: [
              'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 1699, originalPrice: 2599, stock: 8 },
              { size: 'M', price: 1699, originalPrice: 2599, stock: 15 },
              { size: 'L', price: 1699, originalPrice: 2599, stock: 11 },
              { size: 'XL', price: 1699, originalPrice: 2599, stock: 6 },
              { size: 'XXL', price: 1799, originalPrice: 2799, stock: 4 },
            ],
          },
          {
            color: 'Rani Pink',
            images: [
              'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 1699, originalPrice: 2599, stock: 7 },
              { size: 'M', price: 1699, originalPrice: 2599, stock: 12 },
              { size: 'L', price: 1699, originalPrice: 2599, stock: 9 },
            ],
          },
        ],
        sizeChart: [
          { size: 'S', bust: 36, waist: 32, hip: 38, length: 44, shoulder: 14.5 },
          { size: 'M', bust: 38, waist: 34, hip: 40, length: 44, shoulder: 15 },
          { size: 'L', bust: 40, waist: 36, hip: 42, length: 44, shoulder: 15.5 },
          { size: 'XL', bust: 42, waist: 38, hip: 44, length: 44, shoulder: 16 },
        ],
      },

      // 5. Powder Blue Organza Saree
      {
        name: 'Powder Blue Organza Saree with Pearl Scallop Border',
        shortDescription: 'Delicate sheer organza saree with hand-stitched pearl scalloped edges and silk blouse fabric.',
        mainDescription: 'Drape yourself in modern minimalism. Spun from featherlight sheer organza in a calming powder blue shade, finished with delicate white pearl hand-embroidery along the entire scalloped border.',
        productStory: 'Designed for the modern woman who embraces subtle luxury and timeless pastel shades.',
        productDetails: [
          'Fabric: Sheer Tissue Organza',
          'Border: Pearl & Cutdana Scallop Detailing',
          'Blouse Piece: Raw silk blouse piece included (85cm)',
        ],
        category: categoryMap.get('Sarees')._id,
        collectionId: collectionMap.get('Ethereal Pastels')._id,
        occasion: occasionMap.get('Evening Party')._id,
        fitType: fitTypeMap.get('Tailored Fit')._id,
        fabric: 'Pure Sheer Organza',
        careInstructions: ['Dry clean only', 'Do not wring or steam press directly'],
        weight: 480,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Powder Blue',
            images: [
              'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [{ size: 'Free Size', price: 3299, originalPrice: 5499, stock: 11 }],
          },
        ],
      },

      // 6. Lilac Chiffon Pleated Tiered Maxi Dress
      {
        name: 'Lilac Chiffon Pleated Tiered Maxi Dress',
        shortDescription: 'Flattering tiered maxi dress in airy lilac chiffon with micro-pleats and bishop sleeves.',
        mainDescription: 'Grace every room with ethereal charm. This lilac maxi dress showcases finely gathered tiers, cinched waist with an optional tie belt, and sheer bishop sleeves. Fully lined in buttery soft crepe.',
        productStory: 'A fairytale silhouette tailored for sunset brunches, destination weddings, and birthday soirees.',
        productDetails: [
          'Fabric: Poly Georgette Chiffon with Micro Pleating',
          'Lining: Full butter crepe lining',
          'Closure: Concealed back zipper',
        ],
        category: categoryMap.get('Maxi Dresses')._id,
        collectionId: collectionMap.get('Summer Bloom 2026')._id,
        occasion: occasionMap.get('Evening Party')._id,
        fitType: fitTypeMap.get('A-Line')._id,
        fabric: 'Chiffon with Butter Crepe Lining',
        careInstructions: ['Machine wash cold gentle cycle', 'Hang to dry'],
        weight: 520,
        isFeatured: false,
        mainImage: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Lilac Dream',
            images: [
              'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'XS', price: 2199, originalPrice: 3499, stock: 5 },
              { size: 'S', price: 2199, originalPrice: 3499, stock: 14 },
              { size: 'M', price: 2199, originalPrice: 3499, stock: 16 },
              { size: 'L', price: 2199, originalPrice: 3499, stock: 9 },
              { size: 'XL', price: 2299, originalPrice: 3699, stock: 4 },
            ],
          },
        ],
        sizeChart: [
          { size: 'XS', bust: 32, waist: 26, hip: 36, length: 52, shoulder: 13.5 },
          { size: 'S', bust: 34, waist: 28, hip: 38, length: 52, shoulder: 14 },
          { size: 'M', bust: 36, waist: 30, hip: 40, length: 52.5, shoulder: 14.5 },
          { size: 'L', bust: 38, waist: 32, hip: 42, length: 53, shoulder: 15 },
        ],
      },

      // 7. Sage Green Linen Formal Office Kurti
      {
        name: 'Sage Green Linen Blend Formal Office Kurti',
        shortDescription: 'Minimalist mandarin collar straight kurti in organic linen blend with practical side pockets.',
        mainDescription: 'Sophisticated elegance for the modern workday. Woven from breathable slub linen blend in calm sage green, featuring wooden buttons down the placket, three-quarter sleeves, and deep side pockets.',
        productStory: 'Conceived to bridge the gap between crisp professional authority and relaxed Indian elegance.',
        productDetails: [
          'Fabric: 60% Linen, 40% Cotton Slub',
          'Collar: Mandarin Stand Collar',
          'Utility: 2 functional side pockets',
        ],
        category: categoryMap.get('Kurtis')._id,
        collectionId: collectionMap.get('Summer Bloom 2026')._id,
        occasion: occasionMap.get('Office & Formal')._id,
        fitType: fitTypeMap.get('Straight Cut')._id,
        fabric: 'Organic Slub Linen',
        careInstructions: ['Machine wash with mild detergent', 'Warm iron while slightly damp'],
        weight: 380,
        isFeatured: false,
        mainImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Sage Green',
            images: [
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 1299, originalPrice: 1999, stock: 12 },
              { size: 'M', price: 1299, originalPrice: 1999, stock: 18 },
              { size: 'L', price: 1299, originalPrice: 1999, stock: 14 },
              { size: 'XL', price: 1299, originalPrice: 1999, stock: 9 },
              { size: 'XXL', price: 1399, originalPrice: 2099, stock: 6 },
            ],
          },
        ],
        sizeChart: [
          { size: 'S', bust: 36, waist: 32, hip: 38, length: 42, shoulder: 14.5 },
          { size: 'M', bust: 38, waist: 34, hip: 40, length: 42, shoulder: 15 },
          { size: 'L', bust: 40, waist: 36, hip: 42, length: 42.5, shoulder: 15.5 },
        ],
      },

      // 8. Crimson Floral Printed Georgette Anarkali
      {
        name: 'Crimson Floral Printed Georgette Anarkali Gown',
        shortDescription: 'Flowing floor-length Anarkali in lightweight georgette with artisan floral prints.',
        mainDescription: 'Make an entrance in striking crimson red. Tailored with a 48-kali expansive circular flare that twirls effortlessly, accompanied by gold dori tie-ups and an embroidered border hem.',
        productStory: 'Celebrating the romance of deep red hues adorned with rich festive marigold prints.',
        productDetails: [
          'Fabric: Pure Faux Georgette with Shantoon Silk Lining',
          'Flare: Massive 4.5 meter circumference sweep',
          'Includes: Matching dupatta with tassels',
        ],
        category: categoryMap.get('Anarkalis & Gowns')._id,
        collectionId: collectionMap.get('Festive Edit 2026')._id,
        occasion: occasionMap.get('Festive Celebration')._id,
        fitType: fitTypeMap.get('Flared Anarkali')._id,
        fabric: 'Georgette with Shantoon Lining',
        careInstructions: ['Dry clean recommended', 'Steam iron only'],
        weight: 700,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Crimson Red',
            images: [
              'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 2799, originalPrice: 4299, stock: 10 },
              { size: 'M', price: 2799, originalPrice: 4299, stock: 15 },
              { size: 'L', price: 2799, originalPrice: 4299, stock: 8 },
              { size: 'XL', price: 2899, originalPrice: 4499, stock: 5 },
            ],
          },
        ],
        sizeChart: [
          { size: 'S', bust: 36, waist: 32, hip: 38, length: 54, shoulder: 14.5 },
          { size: 'M', bust: 38, waist: 34, hip: 40, length: 54, shoulder: 15 },
          { size: 'L', bust: 40, waist: 36, hip: 42, length: 54, shoulder: 15.5 },
        ],
      },

      // 9. Midnight Black Sequin Embroidered Party Co-ord Set
      {
        name: 'Midnight Black Sequin Embroidered Party Co-ord Set',
        shortDescription: 'Glamorous jacket-style crop top and high-waisted palazzo pants embellished with micro-sequins.',
        mainDescription: 'Own the night in pitch-black shimmer. Featuring a tailored structured blazer top adorned with tonal matte sequins that catch the light subtly, paired with fluid high-waisted wide-leg trousers.',
        productStory: 'Contemporary Indo-western power dressing made for gala nights and cocktail parties.',
        productDetails: [
          'Fabric: Poly Crepe with Matte Tone-on-Tone Micro Sequins',
          'Top: Structured Lapel Collar with hook closure',
          'Pants: High-rise wide leg with concealed side zip',
        ],
        category: categoryMap.get('Co-ord Sets')._id,
        collectionId: collectionMap.get('Festive Edit 2026')._id,
        occasion: occasionMap.get('Evening Party')._id,
        fitType: fitTypeMap.get('Tailored Fit')._id,
        fabric: 'Poly Crepe with Sequin Embroidery',
        careInstructions: ['Dry clean only', 'Do not iron on sequins'],
        weight: 580,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Midnight Black',
            images: [
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 2499, originalPrice: 3999, stock: 8 },
              { size: 'M', price: 2499, originalPrice: 3999, stock: 12 },
              { size: 'L', price: 2499, originalPrice: 3999, stock: 6 },
            ],
          },
        ],
        sizeChart: [
          { size: 'S', bust: 34, waist: 28, hip: 38, length: 38, shoulder: 14.5 },
          { size: 'M', bust: 36, waist: 30, hip: 40, length: 38.5, shoulder: 15 },
          { size: 'L', bust: 38, waist: 32, hip: 42, length: 39, shoulder: 15.5 },
        ],
      },

      // 10. Royal Burgundy Velvet Heavy Bridal Lehenga
      {
        name: 'Royal Burgundy Velvet Handcrafted Wedding Lehenga',
        shortDescription: 'Opulent micro-velvet lehenga with intricate zardozi, dori, and sequin hand embroidery.',
        mainDescription: 'The crowning glory of bridal couture. Sumptuous royal burgundy micro-velvet embellished with heavy zardozi, metallic dori cords, and sparkling crystals. Comes with an embroidered sweetheart blouse and double net dupattas.',
        productStory: 'A timeless bridal masterpiece inspired by Mughal architectural carvings and royal heritage.',
        productDetails: [
          'Fabric: Heavy Micro 9000 Velvet with Satin Silk Lining & Double Can-Can',
          'Work: Handcrafted Zardozi, Dori & Sequin Work',
          'Dupatta: Two Dupattas (1 Heavy Velvet Bridal Dupatta + 1 Light Organza Veil)',
        ],
        category: categoryMap.get('Anarkalis & Gowns')._id,
        collectionId: collectionMap.get('Royal Silk Heritage')._id,
        occasion: occasionMap.get('Wedding / Bridal')._id,
        fitType: fitTypeMap.get('Flared Anarkali')._id,
        fabric: 'Micro Velvet with Zardozi Work',
        careInstructions: ['Dry clean only by wedding couture specialists', 'Keep in velvet dustbag'],
        weight: 1800,
        isFeatured: true,
        mainImage: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
        variants: [
          {
            color: 'Royal Burgundy',
            images: [
              'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
            ],
            sizes: [
              { size: 'S', price: 8999, originalPrice: 14999, stock: 4 },
              { size: 'M', price: 8999, originalPrice: 14999, stock: 6 },
              { size: 'L', price: 8999, originalPrice: 14999, stock: 3 },
            ],
          },
        ],
        sizeChart: [
          { size: 'S', bust: 34, waist: 28, hip: 38, length: 42, shoulder: 14 },
          { size: 'M', bust: 36, waist: 30, hip: 40, length: 42, shoulder: 14.5 },
          { size: 'L', bust: 38, waist: 32, hip: 42, length: 42, shoulder: 15 },
        ],
      },
    ];

    let createdCount = 0;
    for (const p of productsData) {
      const slug = p.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await Product.findOneAndUpdate(
        { slug },
        { $set: { ...p, slug, isDeleted: false } },
        { upsert: true, returnDocument: 'after' }
      );
      createdCount++;
    }

    console.log(`🎉 SUCCESS: ${createdCount} luxury apparel products seeded successfully!`);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log(' Disconnected from MongoDB.');
  }
};

seedDatabase();
