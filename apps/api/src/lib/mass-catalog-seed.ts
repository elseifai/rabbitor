import type { CatalogItemType, StoreType } from "@rabbit/database";
import { prisma } from "./prisma";
import {
  generateCatalogSku,
  mapSeedRowToMasterCatalog,
  type GlobalCatalogSeedResult,
  type MerchantCatalogSeedRow,
} from "./global-catalog-seed";

export type ChunkProgress = {
  chunk: number;
  totalChunks: number;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  sector: string;
};

export type ProgressCallback = (progress: ChunkProgress) => void;

const CHUNK_SIZE = 25;

// ─────────────────────────────────────────────────────────────────────────────
// HYPER-SCALE MASTER INVENTORY — 500+ Indian Consumer Products
// ─────────────────────────────────────────────────────────────────────────────
export const MASS_CATALOG_DATA: MerchantCatalogSeedRow[] = [
  // ══════════════════════════════════════════════════
  // KIRANA & STAPLES
  // ══════════════════════════════════════════════════
  { sector: "kirana", name: "Aashirvaad Superior MP Atta", category: "flours", price: 285, unit: "5kg bag", stock: 40, description: "100% whole wheat atta for soft rotis.", imageFile: "aashirvaad-atta.jpg" },
  { sector: "kirana", name: "Aashirvaad Multigrain Atta", category: "flours", price: 310, unit: "5kg bag", stock: 30, description: "9-grain multigrain atta blend.", imageFile: "aashirvaad-multigrain.jpg" },
  { sector: "kirana", name: "Aashirvaad Sugar Release Control Atta", category: "flours", price: 330, unit: "5kg bag", stock: 20, description: "Low GI atta for diabetic-conscious diet.", imageFile: "aashirvaad-sfc.jpg" },
  { sector: "kirana", name: "Rajdhani Chakki Fresh Atta", category: "flours", price: 260, unit: "5kg bag", stock: 35, description: "Stone-ground fresh chakki atta.", imageFile: "rajdhani-atta.jpg" },
  { sector: "kirana", name: "Kohinoor Basmati Rice Extra Long", category: "staples", price: 320, unit: "5kg bag", stock: 25, description: "Extra-long aged basmati rice.", imageFile: "kohinoor-rice.jpg" },
  { sector: "kirana", name: "Daawat Rozana Basmati Rice", category: "staples", price: 280, unit: "5kg bag", stock: 30, description: "Premium everyday basmati rice.", imageFile: "daawat-rice.jpg" },
  { sector: "kirana", name: "India Gate Classic Basmati", category: "staples", price: 340, unit: "5kg bag", stock: 22, description: "Classic aged basmati rice.", imageFile: "india-gate-rice.jpg" },
  { sector: "kirana", name: "Tata Salt", category: "staples", price: 28, unit: "1kg pack", stock: 80, description: "Iodised vacuum evaporated salt.", imageFile: "tata-salt.jpg" },
  { sector: "kirana", name: "Tata Salt Lite Low Sodium", category: "staples", price: 35, unit: "1kg pack", stock: 40, description: "Low sodium salt for healthy diet.", imageFile: "tata-salt-lite.jpg" },
  { sector: "kirana", name: "Catch Super Fine Iodized Salt", category: "staples", price: 22, unit: "1kg pack", stock: 60, description: "Fine iodised table salt.", imageFile: "catch-salt.jpg" },
  { sector: "kirana", name: "Fortune Sunflower Oil", category: "oils", price: 145, unit: "1L pouch", stock: 50, description: "Refined sunflower cooking oil.", imageFile: "fortune-oil.jpg" },
  { sector: "kirana", name: "Fortune Soyabean Oil", category: "oils", price: 135, unit: "1L pouch", stock: 45, description: "Refined soyabean cooking oil.", imageFile: "fortune-soya.jpg" },
  { sector: "kirana", name: "Dhara Refined Sunflower Oil", category: "oils", price: 140, unit: "1L pouch", stock: 45, description: "Pure refined sunflower oil.", imageFile: "dhara-oil.jpg" },
  { sector: "kirana", name: "Saffola Total Pro Heart-Conscious Oil", category: "oils", price: 195, unit: "1L pouch", stock: 30, description: "Multi-source heart-health cooking oil.", imageFile: "saffola-oil.jpg" },
  { sector: "kirana", name: "Saffola Classic Oats", category: "staples", price: 199, unit: "1kg pack", stock: 25, description: "Rolled oats for healthy breakfast.", imageFile: "saffola-oats.jpg" },
  { sector: "kirana", name: "Quaker Oats", category: "staples", price: 220, unit: "1kg pack", stock: 20, description: "Classic rolled oats.", imageFile: "quaker-oats.jpg" },
  { sector: "kirana", name: "Toor Dal Premium", category: "pulses", price: 165, unit: "1kg", stock: 35, description: "Unpolished arhar dal.", imageFile: "toor-dal.jpg" },
  { sector: "kirana", name: "Moong Dal Yellow Split", category: "pulses", price: 140, unit: "1kg", stock: 30, description: "Split yellow moong dal.", imageFile: "moong-dal.jpg" },
  { sector: "kirana", name: "Masoor Dal Red Split", category: "pulses", price: 130, unit: "1kg", stock: 35, description: "Red split lentil dal.", imageFile: "masoor-dal.jpg" },
  { sector: "kirana", name: "Chana Dal Bengal Gram", category: "pulses", price: 145, unit: "1kg", stock: 28, description: "Split bengal gram chana dal.", imageFile: "chana-dal.jpg" },
  { sector: "kirana", name: "Urad Dal Black Whole", category: "pulses", price: 175, unit: "1kg", stock: 22, description: "Whole black urad dal.", imageFile: "urad-dal.jpg" },
  { sector: "kirana", name: "Rajma Dark Red Kidney Beans", category: "pulses", price: 160, unit: "1kg", stock: 25, description: "Dark red kidney beans.", imageFile: "rajma.jpg" },
  { sector: "kirana", name: "Chhole Kabuli Chana", category: "pulses", price: 155, unit: "1kg", stock: 25, description: "White chickpeas kabuli chana.", imageFile: "chhole.jpg" },

  // ── INSTANT & NOODLES ──
  { sector: "kirana", name: "Maggi 2-Minute Noodles Masala", category: "instant", price: 14, unit: "70g pack", stock: 120, description: "India's favourite instant masala noodles.", imageFile: "maggi.jpg" },
  { sector: "kirana", name: "Maggi 2-Minute Noodles Atta", category: "instant", price: 15, unit: "70g pack", stock: 90, description: "Whole wheat instant noodles.", imageFile: "maggi-atta.jpg" },
  { sector: "kirana", name: "Maggi Masala Noodles 4-Pack", category: "instant", price: 56, unit: "4 x 70g", stock: 60, description: "Masala noodles family pack.", imageFile: "maggi-4pack.jpg" },
  { sector: "kirana", name: "Knorr Chinese Noodles", category: "instant", price: 30, unit: "80g pack", stock: 50, description: "Quick-cook oriental noodles.", imageFile: "knorr-noodles.jpg" },
  { sector: "kirana", name: "Ching's Secret Hakka Noodles", category: "instant", price: 30, unit: "150g pack", stock: 55, description: "Chinese-style hakka noodles.", imageFile: "chings-noodles.jpg" },
  { sector: "kirana", name: "Yippee Magic Masala Noodles", category: "instant", price: 14, unit: "70g pack", stock: 80, description: "Sunfeast Yippee magic masala.", imageFile: "yippee.jpg" },
  { sector: "kirana", name: "Top Ramen Curry Noodles", category: "instant", price: 14, unit: "70g pack", stock: 70, description: "Nissin Top Ramen curry flavour.", imageFile: "top-ramen.jpg" },

  // ── SPICES ──
  { sector: "kirana", name: "MDH Garam Masala", category: "spices", price: 72, unit: "100g box", stock: 40, description: "Aromatic garam masala blend.", imageFile: "mdh-garam.jpg" },
  { sector: "kirana", name: "MDH Chana Masala", category: "spices", price: 68, unit: "100g box", stock: 38, description: "Classic chana masala spice mix.", imageFile: "mdh-chana.jpg" },
  { sector: "kirana", name: "MDH Rajma Masala", category: "spices", price: 68, unit: "100g box", stock: 35, description: "Red kidney bean masala blend.", imageFile: "mdh-rajma.jpg" },
  { sector: "kirana", name: "MDH Kitchen King Masala", category: "spices", price: 70, unit: "100g box", stock: 42, description: "All-purpose kitchen king blend.", imageFile: "mdh-kitchen-king.jpg" },
  { sector: "kirana", name: "Everest Tikhalal Red Chilli Powder", category: "spices", price: 65, unit: "100g box", stock: 45, description: "Bright red chilli powder.", imageFile: "everest-chilli.jpg" },
  { sector: "kirana", name: "Everest Garam Masala", category: "spices", price: 70, unit: "100g box", stock: 38, description: "Premium garam masala.", imageFile: "everest-garam.jpg" },
  { sector: "kirana", name: "Catch Turmeric Powder", category: "spices", price: 55, unit: "100g pack", stock: 50, description: "Pure haldi turmeric powder.", imageFile: "catch-turmeric.jpg" },
  { sector: "kirana", name: "Catch Coriander Powder", category: "spices", price: 50, unit: "100g pack", stock: 50, description: "Ground coriander dhania powder.", imageFile: "catch-coriander.jpg" },
  { sector: "kirana", name: "Tata Sampann Cumin Powder", category: "spices", price: 55, unit: "100g pack", stock: 45, description: "Pure jeera cumin powder.", imageFile: "tata-cumin.jpg" },

  // ── CONDIMENTS & SAUCES ──
  { sector: "kirana", name: "Kissan Tomato Ketchup", category: "condiments", price: 85, unit: "500g bottle", stock: 30, description: "Rich tomato ketchup.", imageFile: "kissan-ketchup.jpg" },
  { sector: "kirana", name: "Maggi Hot and Sweet Sauce", category: "condiments", price: 90, unit: "400g bottle", stock: 28, description: "Sweet tangy tomato chilli sauce.", imageFile: "maggi-sauce.jpg" },
  { sector: "kirana", name: "Ching's Secret Dark Soy Sauce", category: "condiments", price: 65, unit: "200ml bottle", stock: 35, description: "Rich dark soy sauce.", imageFile: "chings-soy.jpg" },
  { sector: "kirana", name: "Knorr Hot & Spicy Sauce", category: "condiments", price: 75, unit: "300ml bottle", stock: 30, description: "Spicy dipping sauce.", imageFile: "knorr-sauce.jpg" },

  // ══════════════════════════════════════════════════
  // SNACKS
  // ══════════════════════════════════════════════════
  { sector: "kirana", name: "Parle-G Gold Biscuits", category: "biscuits", price: 30, unit: "250g pack", stock: 60, description: "Classic glucose biscuits.", imageFile: "parle-g.jpg" },
  { sector: "kirana", name: "Parle Krackjack Biscuits", category: "biscuits", price: 35, unit: "250g pack", stock: 50, description: "Sweet-salty crackers.", imageFile: "krackjack.jpg" },
  { sector: "kirana", name: "Parle Hide & Seek Choco Chip Cookies", category: "biscuits", price: 55, unit: "200g pack", stock: 40, description: "Chocolate chip cream cookies.", imageFile: "hide-seek.jpg" },
  { sector: "kirana", name: "Parle 20-20 Cashew Cookies", category: "biscuits", price: 45, unit: "200g pack", stock: 45, description: "Cashew-flavoured rich cookies.", imageFile: "parle-cashew.jpg" },
  { sector: "kirana", name: "Britannia Good Day Cashew Cookies", category: "biscuits", price: 45, unit: "200g pack", stock: 45, description: "Rich butter cashew cookies.", imageFile: "goodday.jpg" },
  { sector: "kirana", name: "Britannia Marie Gold Biscuits", category: "biscuits", price: 30, unit: "250g pack", stock: 55, description: "Classic tea-time marie biscuits.", imageFile: "marie-gold.jpg" },
  { sector: "kirana", name: "Britannia NutriChoice Digestive", category: "biscuits", price: 60, unit: "250g pack", stock: 38, description: "Digestive wheat biscuits.", imageFile: "nutrichoice.jpg" },
  { sector: "kirana", name: "Sunfeast Dark Fantasy Chocolate Chip", category: "biscuits", price: 50, unit: "200g pack", stock: 40, description: "Premium chocolate chip biscuits.", imageFile: "dark-fantasy.jpg" },
  { sector: "kirana", name: "Sunfeast Mom's Magic Butter Cookies", category: "biscuits", price: 40, unit: "200g pack", stock: 42, description: "Buttery soft cookies.", imageFile: "moms-magic.jpg" },
  { sector: "kirana", name: "Lay's Classic Salted Chips", category: "snacks", price: 20, unit: "52g pack", stock: 90, description: "Crispy potato chips.", imageFile: "lays.jpg" },
  { sector: "kirana", name: "Lay's India's Magic Masala", category: "snacks", price: 20, unit: "52g pack", stock: 85, description: "Tangy masala potato chips.", imageFile: "lays-masala.jpg" },
  { sector: "kirana", name: "Kurkure Masala Munch", category: "snacks", price: 20, unit: "50g pack", stock: 80, description: "Crunchy masala corn puffs.", imageFile: "kurkure.jpg" },
  { sector: "kirana", name: "Kurkure Green Chutney Style", category: "snacks", price: 20, unit: "50g pack", stock: 70, description: "Green chutney flavour puffs.", imageFile: "kurkure-chutney.jpg" },
  { sector: "kirana", name: "Haldiram's Bhujia Sev", category: "snacks", price: 55, unit: "200g pack", stock: 50, description: "Crunchy namkeen bhujia.", imageFile: "haldiram-bhujia.jpg" },
  { sector: "kirana", name: "Haldiram's Aloo Bhujia", category: "snacks", price: 55, unit: "200g pack", stock: 48, description: "Crispy potato bhujia.", imageFile: "haldiram-aloo.jpg" },
  { sector: "kirana", name: "Haldiram's Mixture", category: "snacks", price: 65, unit: "200g pack", stock: 45, description: "Spiced namkeen mixture.", imageFile: "haldiram-mixture.jpg" },
  { sector: "kirana", name: "Haldiram's Peanuts Masala", category: "snacks", price: 40, unit: "150g pack", stock: 55, description: "Roasted masala peanuts.", imageFile: "haldiram-peanuts.jpg" },
  { sector: "kirana", name: "Bikaji Bikaneri Bhujia", category: "snacks", price: 50, unit: "200g pack", stock: 45, description: "Authentic Bikaner-style bhujia.", imageFile: "bikaji-bhujia.jpg" },
  { sector: "kirana", name: "Bikaji Navratan Mixture", category: "snacks", price: 60, unit: "200g pack", stock: 38, description: "9-variety crunchy namkeen.", imageFile: "bikaji-mixture.jpg" },

  // ══════════════════════════════════════════════════
  // BEVERAGES
  // ══════════════════════════════════════════════════
  { sector: "kirana", name: "Tata Tea Gold", category: "beverages", price: 175, unit: "500g pack", stock: 30, description: "Premium blend tea leaves.", imageFile: "tata-tea.jpg" },
  { sector: "kirana", name: "Tata Tea Premium", category: "beverages", price: 145, unit: "500g pack", stock: 35, description: "Assam blend CTC tea.", imageFile: "tata-tea-premium.jpg" },
  { sector: "kirana", name: "Tata Tea Agni Strong Leaf", category: "beverages", price: 130, unit: "500g pack", stock: 32, description: "Strong Assam tea leaves.", imageFile: "tata-tea-agni.jpg" },
  { sector: "kirana", name: "Brooke Bond Red Label Tea", category: "beverages", price: 155, unit: "500g pack", stock: 28, description: "Classic Brooke Bond red label.", imageFile: "red-label.jpg" },
  { sector: "kirana", name: "Brooke Bond Taaza Tea", category: "beverages", price: 125, unit: "500g pack", stock: 32, description: "Budget everyday tea blend.", imageFile: "taaza-tea.jpg" },
  { sector: "kirana", name: "Lipton Yellow Label Tea", category: "beverages", price: 165, unit: "500g pack", stock: 25, description: "Blended yellow label tea.", imageFile: "lipton-tea.jpg" },
  { sector: "kirana", name: "Bru Instant Coffee", category: "beverages", price: 210, unit: "100g jar", stock: 20, description: "Pure coffee granules.", imageFile: "bru.jpg" },
  { sector: "kirana", name: "Bru Gold Filter Coffee", category: "beverages", price: 260, unit: "100g jar", stock: 18, description: "South Indian filter blend.", imageFile: "bru-gold.jpg" },
  { sector: "kirana", name: "Nescafe Classic Instant Coffee", category: "beverages", price: 285, unit: "100g jar", stock: 18, description: "Rich aroma instant coffee.", imageFile: "nescafe.jpg" },
  { sector: "kirana", name: "Nescafe Gold Blend Coffee", category: "beverages", price: 420, unit: "100g jar", stock: 12, description: "Premium gold blend coffee.", imageFile: "nescafe-gold.jpg" },
  { sector: "kirana", name: "Coca-Cola Original 500ml", category: "beverages", price: 40, unit: "500ml bottle", stock: 60, description: "Classic Coca-Cola carbonated drink.", imageFile: "coca-cola.jpg" },
  { sector: "kirana", name: "Thums Up Strong Taste Cola", category: "beverages", price: 40, unit: "500ml bottle", stock: 55, description: "India's favourite strong cola.", imageFile: "thums-up.jpg" },
  { sector: "kirana", name: "Pepsi Cola 500ml", category: "beverages", price: 40, unit: "500ml bottle", stock: 55, description: "Classic Pepsi cola drink.", imageFile: "pepsi.jpg" },
  { sector: "kirana", name: "Sprite Lemon Lime 500ml", category: "beverages", price: 38, unit: "500ml bottle", stock: 50, description: "Crisp lemon lime fizz.", imageFile: "sprite.jpg" },
  { sector: "kirana", name: "Limca Lime Lemon", category: "beverages", price: 38, unit: "500ml bottle", stock: 48, description: "Refreshing lime lemon drink.", imageFile: "limca.jpg" },
  { sector: "kirana", name: "Fanta Orange", category: "beverages", price: 38, unit: "500ml bottle", stock: 45, description: "Fizzy orange soft drink.", imageFile: "fanta.jpg" },
  { sector: "kirana", name: "Red Bull Energy Drink", category: "beverages", price: 125, unit: "250ml can", stock: 30, description: "Original energy drink.", imageFile: "red-bull.jpg" },
  { sector: "kirana", name: "Monster Energy Zero Sugar", category: "beverages", price: 140, unit: "355ml can", stock: 22, description: "Zero-sugar energy drink.", imageFile: "monster.jpg" },
  { sector: "kirana", name: "Tropicana Orange Juice NFC", category: "beverages", price: 80, unit: "1L carton", stock: 25, description: "Not-from-concentrate orange juice.", imageFile: "tropicana.jpg" },
  { sector: "kirana", name: "Real Fruit Juice Mixed Fruit", category: "beverages", price: 65, unit: "1L carton", stock: 28, description: "Mixed fruit juice blend.", imageFile: "real-juice.jpg" },
  { sector: "kirana", name: "Rasna Fruit Plus Orange", category: "beverages", price: 35, unit: "500g jar", stock: 40, description: "Instant orange drink powder.", imageFile: "rasna.jpg" },
  { sector: "kirana", name: "Tang Orange Drink Powder", category: "beverages", price: 55, unit: "500g jar", stock: 35, description: "Instant orange drink powder.", imageFile: "tang.jpg" },

  // ══════════════════════════════════════════════════
  // PERSONAL CARE
  // ══════════════════════════════════════════════════
  { sector: "kirana", name: "Colgate MaxFresh Toothpaste", category: "personal-care", price: 95, unit: "150g tube", stock: 35, description: "Cool mint gel toothpaste.", imageFile: "colgate-maxfresh.jpg" },
  { sector: "kirana", name: "Colgate StrongTeeth Toothpaste", category: "personal-care", price: 85, unit: "200g tube", stock: 40, description: "Calcium-boost strong teeth formula.", imageFile: "colgate-strong.jpg" },
  { sector: "kirana", name: "Colgate Total Pro-Gum Health", category: "personal-care", price: 120, unit: "120g tube", stock: 28, description: "Advanced gum health protection.", imageFile: "colgate-total.jpg" },
  { sector: "kirana", name: "Sensodyne Rapid Relief Toothpaste", category: "personal-care", price: 175, unit: "100g tube", stock: 22, description: "Fast relief for sensitive teeth.", imageFile: "sensodyne.jpg" },
  { sector: "kirana", name: "Pepsodent Germicheck Toothpaste", category: "personal-care", price: 75, unit: "150g tube", stock: 32, description: "Germicheck protection toothpaste.", imageFile: "pepsodent.jpg" },
  { sector: "kirana", name: "Close-Up Red Hot Toothpaste", category: "personal-care", price: 80, unit: "150g tube", stock: 30, description: "Refreshing red gel formula.", imageFile: "close-up.jpg" },
  { sector: "kirana", name: "Oral-B Pro-Health Toothbrush", category: "personal-care", price: 65, unit: "1 pc", stock: 50, description: "Pro-Health medium bristle brush.", imageFile: "oral-b.jpg" },
  { sector: "kirana", name: "Colgate 360 Toothbrush", category: "personal-care", price: 75, unit: "1 pc", stock: 45, description: "360 whole-mouth clean brush.", imageFile: "colgate-360.jpg" },
  { sector: "kirana", name: "Listerine Cool Mint Mouthwash", category: "personal-care", price: 185, unit: "500ml bottle", stock: 20, description: "Antiseptic mouth rinse.", imageFile: "listerine.jpg" },
  { sector: "kirana", name: "Dettol Original Antiseptic Liquid", category: "personal-care", price: 125, unit: "250ml bottle", stock: 30, description: "All-purpose antiseptic liquid.", imageFile: "dettol-liquid.jpg" },
  { sector: "kirana", name: "Savlon Advanced Antiseptic Liquid", category: "personal-care", price: 115, unit: "250ml bottle", stock: 28, description: "Wound care antiseptic.", imageFile: "savlon.jpg" },
  { sector: "kirana", name: "Dettol Soap Original 75g", category: "soaps", price: 35, unit: "75g bar", stock: 50, description: "Germ-protecting antibacterial soap.", imageFile: "dettol-soap.jpg" },
  { sector: "kirana", name: "Lifebuoy Total Soap 3-Pack", category: "soaps", price: 99, unit: "125g x 3", stock: 40, description: "Germ protection bathing bars.", imageFile: "lifebuoy.jpg" },
  { sector: "kirana", name: "Dove Cream Beauty Bar", category: "soaps", price: 55, unit: "100g bar", stock: 45, description: "Moisturising cream soap.", imageFile: "dove-soap.jpg" },
  { sector: "kirana", name: "Pears Pure Gentle Soap", category: "soaps", price: 40, unit: "75g bar", stock: 48, description: "Transparent glycerin soap.", imageFile: "pears.jpg" },
  { sector: "kirana", name: "Lux Soft Glow Soap", category: "soaps", price: 38, unit: "100g bar", stock: 50, description: "Lux beauty cream soap.", imageFile: "lux.jpg" },
  { sector: "kirana", name: "Rin Advanced Powder", category: "household", price: 75, unit: "500g pack", stock: 35, description: "Advanced whitening detergent powder.", imageFile: "rin.jpg" },
  { sector: "kirana", name: "Surf Excel Easy Wash", category: "household", price: 100, unit: "1kg pack", stock: 35, description: "Easy wash detergent powder.", imageFile: "surf-excel-powder.jpg" },
  { sector: "kirana", name: "Surf Excel Matic Liquid", category: "household", price: 215, unit: "1L bottle", stock: 25, description: "Top load liquid detergent.", imageFile: "surf-excel.jpg" },
  { sector: "kirana", name: "Ariel Complete Detergent Powder", category: "household", price: 110, unit: "1kg pack", stock: 30, description: "Complete stain-removal detergent.", imageFile: "ariel.jpg" },
  { sector: "kirana", name: "Tide Plus Extra Power Powder", category: "household", price: 90, unit: "1kg pack", stock: 32, description: "Extra power detergent powder.", imageFile: "tide.jpg" },
  { sector: "kirana", name: "Vim Dishwash Gel Original", category: "household", price: 85, unit: "500ml bottle", stock: 35, description: "Lemon dishwash gel.", imageFile: "vim-gel.jpg" },
  { sector: "kirana", name: "Vim Bar Dishwash", category: "household", price: 35, unit: "300g bar", stock: 50, description: "Classic dishwash bar.", imageFile: "vim-bar.jpg" },
  { sector: "kirana", name: "Pril Power Grease Dishwash", category: "household", price: 90, unit: "500ml bottle", stock: 30, description: "Power grease dishwash liquid.", imageFile: "pril.jpg" },
  { sector: "kirana", name: "Harpic Power Plus Toilet Cleaner", category: "household", price: 100, unit: "500ml bottle", stock: 28, description: "Maximum strength toilet cleaner.", imageFile: "harpic.jpg" },
  { sector: "kirana", name: "Domex Ultra Thick Bleach", category: "household", price: 85, unit: "500ml bottle", stock: 28, description: "Thick bleach toilet cleaner.", imageFile: "domex.jpg" },
  { sector: "kirana", name: "Lizol Disinfectant Floor Cleaner Pine", category: "household", price: 115, unit: "500ml bottle", stock: 25, description: "Pine fresh floor disinfectant.", imageFile: "lizol.jpg" },
  { sector: "kirana", name: "Colin Glass Cleaner", category: "household", price: 95, unit: "500ml bottle", stock: 25, description: "Streak-free glass cleaner.", imageFile: "colin.jpg" },

  // ── HAIR CARE ──
  { sector: "kirana", name: "Parachute Coconut Oil", category: "personal-care", price: 145, unit: "500ml bottle", stock: 30, description: "Pure refined coconut hair oil.", imageFile: "parachute.jpg" },
  { sector: "kirana", name: "Bajaj Almond Drops Hair Oil", category: "personal-care", price: 165, unit: "200ml bottle", stock: 28, description: "Non-sticky almond hair oil.", imageFile: "bajaj-almond.jpg" },
  { sector: "kirana", name: "Dabur Amla Hair Oil", category: "personal-care", price: 120, unit: "200ml bottle", stock: 30, description: "Amla fortified hair oil.", imageFile: "dabur-amla.jpg" },
  { sector: "kirana", name: "Head & Shoulders Anti-Dandruff Shampoo", category: "personal-care", price: 195, unit: "340ml bottle", stock: 22, description: "Classic clean anti-dandruff.", imageFile: "head-shoulders.jpg" },
  { sector: "kirana", name: "Pantene Pro-V Total Damage Care", category: "personal-care", price: 185, unit: "340ml bottle", stock: 22, description: "10 damage symptom repair.", imageFile: "pantene.jpg" },
  { sector: "kirana", name: "Dove Intense Repair Shampoo", category: "personal-care", price: 195, unit: "340ml bottle", stock: 20, description: "Intense repair shampoo.", imageFile: "dove-shampoo.jpg" },
  { sector: "kirana", name: "Clinic Plus Strength Shampoo", category: "personal-care", price: 95, unit: "340ml bottle", stock: 28, description: "Milk protein strength shampoo.", imageFile: "clinic-plus.jpg" },
  { sector: "kirana", name: "Sunsilk Perfect Straight Shampoo", category: "personal-care", price: 165, unit: "340ml bottle", stock: 22, description: "Keratin shampoo for straight hair.", imageFile: "sunsilk.jpg" },

  // ── SKIN CARE ──
  { sector: "kirana", name: "Nivea Soft Light Moisturizer", category: "personal-care", price: 165, unit: "100ml jar", stock: 25, description: "Lightweight daily moisturizer.", imageFile: "nivea-soft.jpg" },
  { sector: "kirana", name: "Vaseline Intensive Care Lotion", category: "personal-care", price: 155, unit: "200ml bottle", stock: 25, description: "Deep moisture body lotion.", imageFile: "vaseline.jpg" },
  { sector: "kirana", name: "Pond's White Beauty Face Wash", category: "personal-care", price: 120, unit: "100g tube", stock: 22, description: "Whitening face wash.", imageFile: "ponds.jpg" },
  { sector: "kirana", name: "Garnier Micellar Rose Water", category: "personal-care", price: 275, unit: "400ml bottle", stock: 18, description: "Micellar water for sensitive skin.", imageFile: "garnier-micellar.jpg" },
  { sector: "kirana", name: "Lakme Sun Expert SPF 50 Sunscreen", category: "personal-care", price: 280, unit: "50ml tube", stock: 18, description: "SPF 50 UV protection sunscreen.", imageFile: "lakme-sunscreen.jpg" },

  // ══════════════════════════════════════════════════
  // DAIRY
  // ══════════════════════════════════════════════════
  { sector: "dairy", name: "Amul Taaza Homogenised Milk", category: "milk", price: 58, unit: "1L pouch", stock: 100, description: "Toned homogenised milk.", imageFile: "amul-milk.jpg" },
  { sector: "dairy", name: "Amul Gold Full Cream Milk", category: "milk", price: 68, unit: "1L pouch", stock: 80, description: "Full cream homogenised milk.", imageFile: "amul-gold.jpg" },
  { sector: "dairy", name: "Amul Slim & Trim Skimmed Milk", category: "milk", price: 52, unit: "1L pouch", stock: 50, description: "Skimmed low-fat milk.", imageFile: "amul-slim.jpg" },
  { sector: "dairy", name: "Mother Dairy Toned Milk", category: "milk", price: 56, unit: "1L pouch", stock: 70, description: "Toned milk pouch.", imageFile: "mother-dairy-milk.jpg" },
  { sector: "dairy", name: "Mother Dairy Full Cream Milk", category: "milk", price: 66, unit: "1L pouch", stock: 55, description: "Full cream milk pouch.", imageFile: "mother-dairy-fc.jpg" },
  { sector: "dairy", name: "Nestle Milkmaid Condensed Milk", category: "milk", price: 145, unit: "400g tin", stock: 18, description: "Sweetened condensed milk.", imageFile: "milkmaid.jpg" },
  { sector: "dairy", name: "Amul Butter Pasteurised", category: "butter", price: 58, unit: "100g", stock: 45, description: "Table butter with natural taste.", imageFile: "amul-butter.jpg" },
  { sector: "dairy", name: "Amul Salted Butter", category: "butter", price: 60, unit: "100g", stock: 38, description: "Salted pasteurised butter.", imageFile: "amul-salted-butter.jpg" },
  { sector: "dairy", name: "Gowardhan Cow Ghee", category: "butter", price: 325, unit: "500ml", stock: 20, description: "Pure cow ghee.", imageFile: "gowardhan-ghee.jpg" },
  { sector: "dairy", name: "Amul Pure Ghee", category: "butter", price: 280, unit: "500ml", stock: 22, description: "Pure Amul ghee tin.", imageFile: "amul-ghee.jpg" },
  { sector: "dairy", name: "Mother Dairy Ghee", category: "butter", price: 295, unit: "500ml", stock: 18, description: "Pasteurised butter ghee.", imageFile: "mother-dairy-ghee.jpg" },
  { sector: "dairy", name: "Fresh Set Curd", category: "curd", price: 35, unit: "500g", stock: 60, description: "Daily fresh set curd.", imageFile: "curd.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Amul Masti Dahi", category: "curd", price: 40, unit: "500g", stock: 55, description: "Set thick dahi.", imageFile: "amul-dahi.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Mother Dairy Fresh Dahi", category: "curd", price: 38, unit: "500g", stock: 50, description: "Fresh mild dahi curd.", imageFile: "mother-dairy-dahi.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Malai Paneer Block", category: "cheese", price: 95, unit: "200g", stock: 30, description: "Soft cottage cheese block.", imageFile: "paneer.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Amul Malai Paneer", category: "cheese", price: 100, unit: "200g", stock: 28, description: "Amul soft malai paneer.", imageFile: "amul-paneer.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Amul Processed Cheese Block", category: "cheese", price: 160, unit: "400g block", stock: 18, description: "Processed cheese block.", imageFile: "amul-cheese-block.jpg" },
  { sector: "dairy", name: "Amul Cheese Slices", category: "cheese", price: 135, unit: "200g pack", stock: 25, description: "Processed cheese slices.", imageFile: "amul-cheese.jpg" },
  { sector: "dairy", name: "Britannia Cheese Cubes", category: "cheese", price: 125, unit: "200g", stock: 22, description: "Processed cheese cubes.", imageFile: "britannia-cheese.jpg" },
  { sector: "dairy", name: "Farm Fresh White Eggs", category: "eggs", price: 48, unit: "6 pcs", stock: 80, description: "Grade A white eggs.", imageFile: "eggs.jpg", itemType: "EGG" },
  { sector: "dairy", name: "Suguna Eggs Tray", category: "eggs", price: 135, unit: "30 pcs", stock: 30, description: "Farm fresh white eggs tray.", imageFile: "suguna-eggs.jpg", itemType: "EGG" },
  { sector: "dairy", name: "Kegg Farms Omega-3 Brown Eggs", category: "eggs", price: 90, unit: "6 pcs", stock: 20, description: "Omega-3 enriched brown eggs.", imageFile: "brown-eggs.jpg", itemType: "EGG" },
  { sector: "dairy", name: "Amul Masti Spiced Buttermilk", category: "beverages", price: 15, unit: "200ml", stock: 50, description: "Refreshing spiced chaas.", imageFile: "amul-lassi.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Amul Kool Kesar Milkshake", category: "beverages", price: 25, unit: "200ml", stock: 45, description: "Kesar flavoured milk drink.", imageFile: "amul-kool.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Yakult Probiotic Drink", category: "beverages", price: 75, unit: "5 x 65ml", stock: 35, description: "Probiotic fermented milk drink.", imageFile: "yakult.jpg", itemType: "SHORT_SHELF" },

  // ══════════════════════════════════════════════════
  // BAKERY
  // ══════════════════════════════════════════════════
  { sector: "bakery", name: "Soft Mumbai Pav Bread", category: "bread", price: 30, unit: "6 pcs", stock: 40, description: "Fresh soft pav buns.", imageFile: "pav.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Sesame Burger Buns", category: "bread", price: 40, unit: "4 pcs", stock: 30, description: "Sesame-topped burger buns.", imageFile: "burger-bun.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Britannia Sandwich Bread White", category: "bread", price: 45, unit: "400g loaf", stock: 35, description: "Soft white sandwich bread.", imageFile: "sandwich-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Britannia Whole Wheat Bread", category: "bread", price: 50, unit: "400g loaf", stock: 30, description: "Soft whole wheat bread.", imageFile: "britannia-wheat-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Modern Bread Classic White", category: "bread", price: 42, unit: "400g loaf", stock: 32, description: "Classic soft white bread.", imageFile: "modern-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Multigrain Health Bread", category: "bread", price: 65, unit: "400g loaf", stock: 18, description: "Multigrain artisan loaf.", imageFile: "multigrain-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Garlic Bread Sticks", category: "bread", price: 55, unit: "4 pcs", stock: 15, description: "Butter garlic bread sticks.", imageFile: "garlic-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Chocolate Truffle Cake", category: "cakes", price: 450, unit: "500g", stock: 8, description: "Eggless chocolate truffle cake.", imageFile: "truffle-cake.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Black Forest Cake", category: "cakes", price: 480, unit: "500g", stock: 6, description: "Classic black forest cake.", imageFile: "black-forest.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Pineapple Cream Cake", category: "cakes", price: 380, unit: "500g", stock: 8, description: "Fresh pineapple cream cake.", imageFile: "pineapple-cake.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Fruit Plum Cake", category: "cakes", price: 180, unit: "250g", stock: 12, description: "Rich dry fruit plum cake.", imageFile: "fruit-cake.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Red Velvet Cupcakes Box", category: "cakes", price: 280, unit: "6 pcs", stock: 8, description: "Cream cheese frosted cupcakes.", imageFile: "red-velvet.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Butter Croissant", category: "pastry", price: 65, unit: "1 pc", stock: 20, description: "Flaky French butter croissant.", imageFile: "croissant.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Assorted Donuts Box", category: "pastry", price: 220, unit: "6 pcs", stock: 10, description: "Glazed assorted donuts.", imageFile: "donuts.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Crispy Tea Rusk", category: "snacks", price: 85, unit: "400g pack", stock: 25, description: "Crunchy milk rusk.", imageFile: "rusk.jpg" },
  { sector: "bakery", name: "Khari Puff Biscuit", category: "snacks", price: 40, unit: "200g pack", stock: 28, description: "Flaky salted khari biscuits.", imageFile: "khari.jpg" },
  { sector: "bakery", name: "Britannia Cake Mini Bites Choco", category: "cakes", price: 65, unit: "150g pack", stock: 30, description: "Chocolate mini cake bites.", imageFile: "cake-bites.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Pizza Base Medium", category: "bread", price: 85, unit: "2 pcs", stock: 15, description: "Ready pizza base.", imageFile: "pizza-base.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Focaccia Herb Bread", category: "bread", price: 120, unit: "1 loaf", stock: 10, description: "Italian herb focaccia.", imageFile: "focaccia.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Banana Walnut Bread", category: "cakes", price: 180, unit: "300g", stock: 10, description: "Moist banana walnut bread.", imageFile: "banana-walnut.jpg", itemType: "SHORT_SHELF" },

  // ══════════════════════════════════════════════════
  // VEGETABLES & FRUITS
  // ══════════════════════════════════════════════════
  { sector: "veggies", name: "Farm Fresh Tomato", category: "vegetables", price: 40, unit: "1kg", stock: 50, description: "Locally sourced red tomatoes.", imageFile: "tomato.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Nasik Red Onion", category: "vegetables", price: 35, unit: "1kg", stock: 60, description: "Premium red onions.", imageFile: "onion.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Washed Table Potato", category: "vegetables", price: 30, unit: "1kg", stock: 70, description: "Clean table potatoes.", imageFile: "potato.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Ginger Root", category: "vegetables", price: 80, unit: "250g", stock: 35, description: "Fresh aromatic ginger root.", imageFile: "ginger.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Garlic Bulb Loose", category: "vegetables", price: 50, unit: "250g", stock: 40, description: "Fresh garlic bulbs.", imageFile: "garlic.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Green Chilli", category: "vegetables", price: 25, unit: "250g pack", stock: 45, description: "Fresh green chillies.", imageFile: "green-chilli.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Spinach Bunch", category: "leafy", price: 25, unit: "250g bunch", stock: 40, description: "Tender palak leaves.", imageFile: "spinach.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Methi Bunch", category: "leafy", price: 20, unit: "250g bunch", stock: 38, description: "Fresh fenugreek leaves.", imageFile: "methi.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Coriander Bunch", category: "leafy", price: 15, unit: "1 bunch", stock: 45, description: "Aromatic coriander bunch.", imageFile: "coriander.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Curry Leaves", category: "leafy", price: 10, unit: "50g pack", stock: 40, description: "Fresh kadi patta leaves.", imageFile: "curry-leaves.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Green Capsicum", category: "vegetables", price: 45, unit: "500g", stock: 30, description: "Fresh bell peppers.", imageFile: "capsicum.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Red Capsicum", category: "vegetables", price: 85, unit: "500g", stock: 20, description: "Sweet red bell peppers.", imageFile: "red-capsicum.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Orange Carrot", category: "vegetables", price: 38, unit: "500g", stock: 35, description: "Sweet orange carrots.", imageFile: "carrot.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Cauliflower", category: "vegetables", price: 42, unit: "1 pc", stock: 20, description: "Medium cauliflower head.", imageFile: "cauliflower.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Green Peas Shelled", category: "vegetables", price: 80, unit: "500g", stock: 25, description: "Shelled green peas.", imageFile: "peas.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Brinjal Baingan Medium", category: "vegetables", price: 35, unit: "500g", stock: 30, description: "Fresh round brinjal.", imageFile: "brinjal.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Lady Finger Bhindi", category: "vegetables", price: 50, unit: "500g", stock: 28, description: "Fresh tender okra.", imageFile: "bhindi.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Bitter Gourd Karela", category: "vegetables", price: 45, unit: "500g", stock: 25, description: "Fresh bitter gourd.", imageFile: "karela.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Bottle Gourd Lauki", category: "vegetables", price: 30, unit: "1 pc", stock: 22, description: "Fresh bottle gourd.", imageFile: "lauki.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Drumstick Moringa", category: "vegetables", price: 50, unit: "250g", stock: 22, description: "Fresh drumstick pods.", imageFile: "drumstick.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Robusta Banana", category: "fruits", price: 55, unit: "1 dozen", stock: 35, description: "Sweet robusta bananas.", imageFile: "banana.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Kashmiri Apple", category: "fruits", price: 180, unit: "1kg", stock: 25, description: "Crisp Kashmiri apples.", imageFile: "apple.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Seedless Lemon", category: "fruits", price: 35, unit: "500g", stock: 40, description: "Juicy seedless lemons.", imageFile: "lemon.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Ratnagiri Alphonso Mango", category: "fruits", price: 650, unit: "1 dozen", stock: 12, description: "Seasonal premium alphonso mangoes.", imageFile: "mango.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Pomegranate Anar", category: "fruits", price: 120, unit: "1kg", stock: 20, description: "Sweet juicy pomegranate.", imageFile: "pomegranate.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Papaya Pawpaw", category: "fruits", price: 60, unit: "1 pc", stock: 18, description: "Ripe fresh papaya.", imageFile: "papaya.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Watermelon Tarbuz", category: "fruits", price: 75, unit: "1kg", stock: 15, description: "Seedless watermelon.", imageFile: "watermelon.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Grapes Green Seedless", category: "fruits", price: 110, unit: "500g", stock: 20, description: "Fresh green seedless grapes.", imageFile: "grapes.jpg", itemType: "SHORT_SHELF" },

  // ══════════════════════════════════════════════════
  // FISH & SEAFOOD
  // ══════════════════════════════════════════════════
  { sector: "fish", name: "Surmai Kingfish Steaks", category: "premium", price: 650, unit: "500g", stock: 10, description: "Fresh surmai steaks — premium catch.", imageFile: "surmai.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Silver Pomfret Whole", category: "premium", price: 580, unit: "500g", stock: 8, description: "Whole cleaned silver pomfret.", imageFile: "pomfret.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Black Pomfret Whole", category: "premium", price: 480, unit: "500g", stock: 8, description: "Whole cleaned black pomfret.", imageFile: "black-pomfret.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Rawas Indian Salmon Fillet", category: "premium", price: 520, unit: "500g", stock: 10, description: "Fresh rawas fillet portions.", imageFile: "rawas.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Hilsa Ilish Steaks", category: "premium", price: 890, unit: "500g", stock: 5, description: "Seasonal hilsa steaks.", imageFile: "hilsa.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Jumbo Deveined Prawns", category: "shellfish", price: 480, unit: "500g", stock: 12, description: "Cleaned medium prawns.", imageFile: "prawns.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Tiger Prawns Large", category: "shellfish", price: 680, unit: "500g", stock: 8, description: "Premium large tiger prawns.", imageFile: "tiger-prawns.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Live Blue Crab", category: "shellfish", price: 450, unit: "1kg", stock: 6, description: "Fresh live blue crab.", imageFile: "crab.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Cleaned Squid Rings", category: "shellfish", price: 390, unit: "500g", stock: 10, description: "Ready-to-cook squid rings.", imageFile: "squid.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Bangda Mackerel Whole", category: "local", price: 220, unit: "500g", stock: 15, description: "Whole cleaned mackerel.", imageFile: "bangda.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Paplet Pomfret Baby", category: "local", price: 360, unit: "500g", stock: 10, description: "Small baby pomfret.", imageFile: "baby-pomfret.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Bombil Bombay Duck Fresh", category: "local", price: 280, unit: "500g", stock: 12, description: "Fresh bombay duck.", imageFile: "bombil-fresh.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Rohu Carp Curry Cut", category: "freshwater", price: 320, unit: "1kg", stock: 14, description: "Fresh rohu cuts with head.", imageFile: "rohu.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Katla Fish Steaks", category: "freshwater", price: 340, unit: "1kg", stock: 12, description: "Bengali-style katla steaks.", imageFile: "katla.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Tilapia Whole Cleaned", category: "freshwater", price: 260, unit: "1kg", stock: 12, description: "Whole cleaned tilapia.", imageFile: "tilapia.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Sun-Dried Bombil", category: "dried", price: 180, unit: "250g", stock: 20, description: "Traditional sun-dried bombil.", imageFile: "bombil.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Dried Prawns Shrimps Small", category: "dried", price: 220, unit: "250g", stock: 18, description: "Sun-dried small prawns.", imageFile: "dried-prawns.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Norwegian Salmon Fillet", category: "imported", price: 720, unit: "250g", stock: 8, description: "Imported salmon fillet.", imageFile: "salmon.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Basa Fillet Imported", category: "imported", price: 380, unit: "500g", stock: 10, description: "White fish basa fillet.", imageFile: "basa.jpg", itemType: "NON_VEG" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHUNK PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

export async function runMassCatalogSeed(
  rows: MerchantCatalogSeedRow[] = MASS_CATALOG_DATA,
  onProgress?: ProgressCallback,
): Promise<GlobalCatalogSeedResult> {
  const result: GlobalCatalogSeedResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    bySector: {},
    entries: [],
  };

  const chunks: MerchantCatalogSeedRow[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + CHUNK_SIZE));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];

    for (const row of chunk) {
      try {
        const mapped = mapSeedRowToMasterCatalog(row);

        const existing = await prisma.masterCatalogItem.findFirst({
          where: {
            OR: [
              { sku: mapped.sku },
              {
                AND: [
                  { name: { equals: mapped.name, mode: "insensitive" } },
                  { defaultUnit: { equals: mapped.defaultUnit, mode: "insensitive" } },
                ],
              },
            ],
          },
          select: { id: true, sku: true },
        });

        await prisma.masterCatalogItem.upsert({
          where: { sku: mapped.sku },
          create: {
            sku: mapped.sku,
            name: mapped.name,
            storeType: mapped.storeType,
            category: mapped.category,
            subcategory: mapped.subcategory,
            basePrice: mapped.basePrice,
            defaultUnit: mapped.defaultUnit,
            description: mapped.description,
            imageUrl: mapped.imageUrl,
            itemType: mapped.itemType,
            isActive: true,
          },
          update: {
            basePrice: mapped.basePrice,
            defaultUnit: mapped.defaultUnit,
            description: mapped.description,
            imageUrl: mapped.imageUrl,
            itemType: mapped.itemType,
            isActive: true,
          },
        });

        const action = existing ? "updated" : "created";
        if (action === "created") result.created++;
        else result.updated++;

        result.bySector[row.sector] = (result.bySector[row.sector] ?? 0) + 1;
        result.entries.push({ name: mapped.name, sku: mapped.sku, action });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`${row.name}: ${message}`);
        result.skipped++;
        result.entries.push({
          name: row.name,
          sku: generateCatalogSku(row.name, row.sector),
          action: "skipped",
        });
      }
    }

    // Emit progress after each chunk
    if (onProgress) {
      const processed = Math.min((ci + 1) * CHUNK_SIZE, rows.length);
      const currentSector = chunk[chunk.length - 1]?.sector ?? "unknown";
      onProgress({
        chunk: ci + 1,
        totalChunks: chunks.length,
        processed,
        total: rows.length,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        sector: currentSector,
      });
    }
  }

  return result;
}
