import type { CatalogItemType, StoreType } from "@rabbit/database";
import { prisma } from "./prisma";
import { resolveProductImage, getProductAssetPath } from "./catalog-images";

/** Merchant import template columns (merchant-import-template.csv). */
export type MerchantCatalogSeedRow = {
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  description: string;
  imageFile: string;
  /** Sector tag → administrative store-type hierarchy node. */
  sector: "kirana" | "dairy" | "bakery" | "veggies" | "fish";
  itemType?: CatalogItemType;
};

export type GlobalCatalogSeedResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  bySector: Record<string, number>;
  entries: Array<{ name: string; sku: string; action: "created" | "updated" | "skipped" }>;
};

const SECTOR_TO_STORE: Record<MerchantCatalogSeedRow["sector"], StoreType> = {
  kirana: "KIRANA",
  dairy: "DAIRY",
  bakery: "BAKERY",
  veggies: "VEGETABLE",
  fish: "FISH",
};

const CATEGORY_HIERARCHY: Record<string, string> = {
  instant: "Instant Foods",
  biscuits: "Biscuits",
  oils: "Oils",
  staples: "Staples",
  flours: "Flours",
  pulses: "Pulses",
  household: "Household",
  soaps: "Soaps",
  snacks: "Snacks",
  beverages: "Beverages",
  spices: "Spices",
  condiments: "Condiments",
  premium: "Premium Catch",
  shellfish: "Shellfish",
  local: "Local Catch",
  freshwater: "Freshwater",
  dried: "Dried Fish",
  imported: "Imported",
  vegetables: "Vegetables",
  leafy: "Leafy Greens",
  fruits: "Fruits",
  bread: "Bread",
  cakes: "Cakes",
  pastry: "Pastry",
  milk: "Milk",
  curd: "Curd",
  cheese: "Cheese",
  butter: "Butter",
  eggs: "Eggs",
  "personal-care": "Personal Care",
};

export function resolveImageUrl(
  imageFile: string,
  category = "general",
  sector = "kirana",
  productName?: string,
): string | null {
  // If a product name is available, use the deterministic /media/catalog/ path.
  // The web proxy will auto-resolve this to the correct CDN image via keyword matching,
  // giving each product its own stable, subcategory-specific URL.
  if (productName) {
    return getProductAssetPath(productName, category);
  }

  const trimmed = imageFile.trim();
  if (!trimmed) return null;
  return resolveProductImage(trimmed, category, sector, productName);
}

export function generateCatalogSku(name: string, sector: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `GC-${sector.toUpperCase()}-${slug}`;
}

function normalizeCategory(category: string): string {
  const key = category.trim().toLowerCase().replace(/\s+/g, "-");
  return CATEGORY_HIERARCHY[key] ? key : key || "general";
}

function inferItemType(row: MerchantCatalogSeedRow): CatalogItemType {
  if (row.itemType) return row.itemType;
  if (row.sector === "fish") return "NON_VEG";
  if (row.category === "eggs") return "EGG";
  if (row.sector === "bakery" && /eggless/i.test(row.description)) return "VEG";
  return "VEG";
}

export function mapSeedRowToMasterCatalog(row: MerchantCatalogSeedRow) {
  const storeType = SECTOR_TO_STORE[row.sector];
  const category = normalizeCategory(row.category);
  const sku = generateCatalogSku(row.name, row.sector);
  const stockNote = `Baseline stock template: ${row.stock} units.`;
  const description = row.description.includes("Baseline stock template")
    ? row.description
    : `${row.description.trim()} ${stockNote}`.trim();

  return {
    sku,
    name: row.name.trim(),
    storeType,
    category,
    subcategory: CATEGORY_HIERARCHY[category] ?? null,
    basePrice: row.price,
    defaultUnit: row.unit.trim() || "1 unit",
    description,
    imageUrl: resolveImageUrl(row.imageFile, category, row.sector, row.name),
    itemType: inferItemType(row),
  };
}

/** Master inventory matrix — 60 essential Indian retail products. */
export const MASTER_INVENTORY_DATA: MerchantCatalogSeedRow[] = [
  // —— Kirana ——
  { sector: "kirana", name: "Maggi 2-Minute Noodles Masala", category: "instant", price: 14, unit: "70g pack", stock: 120, description: "India's favourite instant masala noodles.", imageFile: "maggi.jpg" },
  { sector: "kirana", name: "Aashirvaad Superior MP Atta", category: "flours", price: 285, unit: "5kg bag", stock: 40, description: "100% whole wheat atta for soft rotis.", imageFile: "aashirvaad-atta.jpg" },
  { sector: "kirana", name: "Tata Salt", category: "staples", price: 28, unit: "1kg pack", stock: 80, description: "Iodised vacuum evaporated salt.", imageFile: "tata-salt.jpg" },
  { sector: "kirana", name: "Fortune Sunflower Oil", category: "oils", price: 145, unit: "1L pouch", stock: 50, description: "Refined sunflower cooking oil.", imageFile: "fortune-oil.jpg" },
  { sector: "kirana", name: "Toor Dal Premium", category: "pulses", price: 165, unit: "1kg", stock: 35, description: "Unpolished arhar dal.", imageFile: "toor-dal.jpg" },
  { sector: "kirana", name: "Parle-G Gold Biscuits", category: "biscuits", price: 30, unit: "250g pack", stock: 60, description: "Classic glucose biscuits.", imageFile: "parle-g.jpg" },
  { sector: "kirana", name: "Britannia Good Day Cashew Cookies", category: "biscuits", price: 45, unit: "200g pack", stock: 45, description: "Rich butter cashew cookies.", imageFile: "goodday.jpg" },
  { sector: "kirana", name: "Surf Excel Matic Liquid", category: "household", price: 215, unit: "1L bottle", stock: 25, description: "Top load liquid detergent.", imageFile: "surf-excel.jpg" },
  { sector: "kirana", name: "Lifebuoy Total Soap", category: "soaps", price: 99, unit: "125g x 3", stock: 40, description: "Germ protection bathing bars.", imageFile: "lifebuoy.jpg" },
  { sector: "kirana", name: "Colgate MaxFresh Toothpaste", category: "personal-care", price: 95, unit: "150g tube", stock: 35, description: "Cool mint gel toothpaste.", imageFile: "colgate.jpg" },
  { sector: "kirana", name: "Lay's Classic Salted Chips", category: "snacks", price: 20, unit: "52g pack", stock: 90, description: "Crispy potato chips.", imageFile: "lays.jpg" },
  { sector: "kirana", name: "Bru Instant Coffee", category: "beverages", price: 210, unit: "100g jar", stock: 20, description: "Pure coffee granules.", imageFile: "bru.jpg" },
  { sector: "kirana", name: "Tata Tea Gold", category: "beverages", price: 175, unit: "500g pack", stock: 30, description: "Premium blend tea leaves.", imageFile: "tata-tea.jpg" },
  { sector: "kirana", name: "MDH Garam Masala", category: "spices", price: 72, unit: "100g box", stock: 40, description: "Aromatic garam masala blend.", imageFile: "mdh-garam-masala.jpg" },
  { sector: "kirana", name: "Haldiram's Bhujia Sev", category: "snacks", price: 55, unit: "200g pack", stock: 50, description: "Crunchy namkeen bhujia.", imageFile: "haldiram-bhujia.jpg" },
  { sector: "kirana", name: "Kissan Tomato Ketchup", category: "condiments", price: 85, unit: "500g bottle", stock: 30, description: "Rich tomato ketchup.", imageFile: "kissan-ketchup.jpg" },
  { sector: "kirana", name: "Saffola Classic Oats", category: "staples", price: 199, unit: "1kg pack", stock: 25, description: "Rolled oats for healthy breakfast.", imageFile: "saffola-oats.jpg" },
  { sector: "kirana", name: "Moong Dal", category: "pulses", price: 140, unit: "1kg", stock: 30, description: "Split green gram dal.", imageFile: "moong-dal.jpg" },
  // —— Dairy ——
  { sector: "dairy", name: "Amul Taaza Homogenised Milk", category: "milk", price: 58, unit: "1L pouch", stock: 100, description: "Toned homogenised milk.", imageFile: "amul-milk.jpg" },
  { sector: "dairy", name: "Amul Butter Pasteurised", category: "butter", price: 58, unit: "100g", stock: 45, description: "Table butter with natural taste.", imageFile: "amul-butter.jpg" },
  { sector: "dairy", name: "Fresh Set Curd (Dahi)", category: "curd", price: 35, unit: "500g", stock: 60, description: "Daily fresh set curd.", imageFile: "curd.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Malai Paneer Block", category: "cheese", price: 95, unit: "200g", stock: 30, description: "Soft cottage cheese block.", imageFile: "paneer.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Farm Fresh White Eggs", category: "eggs", price: 48, unit: "6 pcs", stock: 80, description: "Grade A white eggs.", imageFile: "eggs.jpg", itemType: "EGG" },
  { sector: "dairy", name: "Amul Cheese Slices", category: "cheese", price: 135, unit: "200g pack", stock: 25, description: "Processed cheese slices.", imageFile: "amul-cheese.jpg" },
  { sector: "dairy", name: "Mother Dairy Toned Milk", category: "milk", price: 56, unit: "1L pouch", stock: 70, description: "Toned milk pouch.", imageFile: "mother-dairy-milk.jpg" },
  { sector: "dairy", name: "Amul Masti Spiced Buttermilk", category: "beverages", price: 15, unit: "200ml", stock: 50, description: "Refreshing spiced chaas.", imageFile: "amul-lassi.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Gowardhan Cow Ghee", category: "butter", price: 325, unit: "500ml", stock: 20, description: "Pure cow ghee.", imageFile: "gowardhan-ghee.jpg" },
  { sector: "dairy", name: "Yakult Probiotic Drink", category: "beverages", price: 75, unit: "5 x 65ml", stock: 35, description: "Probiotic fermented milk drink.", imageFile: "yakult.jpg", itemType: "SHORT_SHELF" },
  { sector: "dairy", name: "Britannia Cheese Cubes", category: "cheese", price: 125, unit: "200g", stock: 22, description: "Processed cheese cubes.", imageFile: "britannia-cheese.jpg" },
  { sector: "dairy", name: "Nestle Milkmaid Sweetened Condensed Milk", category: "milk", price: 145, unit: "400g tin", stock: 18, description: "Sweetened condensed milk.", imageFile: "milkmaid.jpg" },
  // —— Bakery ——
  { sector: "bakery", name: "Soft Mumbai Pav Bread", category: "bread", price: 30, unit: "6 pcs", stock: 40, description: "Fresh soft pav buns.", imageFile: "pav.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Sesame Burger Buns", category: "bread", price: 40, unit: "4 pcs", stock: 30, description: "Sesame-topped burger buns.", imageFile: "burger-bun.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Chocolate Truffle Cake", category: "cakes", price: 450, unit: "500g", stock: 8, description: "Eggless chocolate truffle cake.", imageFile: "truffle-cake.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Butter Croissant", category: "pastry", price: 65, unit: "1 pc", stock: 20, description: "Flaky French butter croissant.", imageFile: "croissant.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Crispy Tea Rusk", category: "snacks", price: 85, unit: "400g pack", stock: 25, description: "Crunchy milk rusk.", imageFile: "rusk.jpg" },
  { sector: "bakery", name: "Britannia Sandwich Bread", category: "bread", price: 45, unit: "400g loaf", stock: 35, description: "Soft white sandwich bread.", imageFile: "sandwich-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Garlic Bread Sticks", category: "bread", price: 55, unit: "4 pcs", stock: 15, description: "Butter garlic bread sticks.", imageFile: "garlic-bread.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Fruit Plum Cake", category: "cakes", price: 180, unit: "250g", stock: 12, description: "Rich dry fruit plum cake.", imageFile: "fruit-cake.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Khari Puff Biscuit", category: "snacks", price: 40, unit: "200g pack", stock: 28, description: "Flaky salted khari biscuits.", imageFile: "khari.jpg" },
  { sector: "bakery", name: "Assorted Donuts Box", category: "pastry", price: 220, unit: "6 pcs", stock: 10, description: "Glazed assorted donuts.", imageFile: "donuts.jpg", itemType: "SHORT_SHELF" },
  { sector: "bakery", name: "Multigrain Health Bread", category: "bread", price: 65, unit: "400g loaf", stock: 18, description: "Multigrain artisan loaf.", imageFile: "multigrain-bread.jpg", itemType: "SHORT_SHELF" },
  // —— Veggies ——
  { sector: "veggies", name: "Farm Fresh Tomato (Tamatar)", category: "vegetables", price: 40, unit: "1kg", stock: 50, description: "Locally sourced red tomatoes.", imageFile: "tomato.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Nasik Red Onion (Pyaz)", category: "vegetables", price: 35, unit: "1kg", stock: 60, description: "Premium red onions.", imageFile: "onion.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Washed Table Potato (Aloo)", category: "vegetables", price: 30, unit: "1kg", stock: 70, description: "Clean table potatoes.", imageFile: "potato.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Spinach (Palak) Bunch", category: "leafy", price: 25, unit: "250g bunch", stock: 40, description: "Tender palak leaves.", imageFile: "spinach.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Robusta Banana (Kela)", category: "fruits", price: 55, unit: "1 dozen", stock: 35, description: "Sweet robusta bananas.", imageFile: "banana.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Kashmiri Apple (Seb)", category: "fruits", price: 180, unit: "1kg", stock: 25, description: "Crisp Kashmiri apples.", imageFile: "apple.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Green Capsicum (Shimla Mirch)", category: "vegetables", price: 45, unit: "500g", stock: 30, description: "Fresh bell peppers.", imageFile: "capsicum.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Orange Carrot (Gajar)", category: "vegetables", price: 38, unit: "500g", stock: 35, description: "Sweet orange carrots.", imageFile: "carrot.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Cauliflower (Phool Gobhi)", category: "vegetables", price: 42, unit: "1 pc", stock: 20, description: "Medium cauliflower head.", imageFile: "cauliflower.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Green Peas (Matar)", category: "vegetables", price: 80, unit: "500g", stock: 25, description: "Shelled green peas.", imageFile: "peas.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Fresh Coriander (Dhaniya) Bunch", category: "leafy", price: 15, unit: "1 bunch", stock: 45, description: "Aromatic coriander bunch.", imageFile: "coriander.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Seedless Lemon (Nimbu)", category: "fruits", price: 35, unit: "500g", stock: 40, description: "Juicy seedless lemons.", imageFile: "lemon.jpg", itemType: "SHORT_SHELF" },
  { sector: "veggies", name: "Ratnagiri Alphonso Mango", category: "fruits", price: 650, unit: "1 dozen", stock: 12, description: "Seasonal premium alphonso mangoes.", imageFile: "mango.jpg", itemType: "SHORT_SHELF" },
  // —— Fish ——
  { sector: "fish", name: "Surmai (Kingfish) Steaks", category: "premium", price: 650, unit: "500g", stock: 10, description: "Fresh surmai steaks — premium catch.", imageFile: "surmai.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Jumbo Deveined Prawns", category: "shellfish", price: 480, unit: "500g", stock: 12, description: "Cleaned medium prawns.", imageFile: "prawns.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Bangda (Mackerel) Whole", category: "local", price: 220, unit: "500g", stock: 15, description: "Whole cleaned mackerel.", imageFile: "bangda.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Rohu (Carp) Curry Cut", category: "freshwater", price: 320, unit: "1kg", stock: 14, description: "Fresh rohu cuts with head.", imageFile: "rohu.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Silver Pomfret Whole", category: "premium", price: 580, unit: "500g", stock: 8, description: "Whole cleaned pomfret.", imageFile: "pomfret.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Sun-Dried Bombil (Bombay Duck)", category: "dried", price: 180, unit: "250g", stock: 20, description: "Traditional sun-dried bombil.", imageFile: "bombil.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Cleaned Squid Rings", category: "shellfish", price: 390, unit: "500g", stock: 10, description: "Ready-to-cook squid rings.", imageFile: "squid.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Katla Fish Steaks", category: "freshwater", price: 340, unit: "1kg", stock: 12, description: "Bengali-style katla steaks.", imageFile: "katla.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Live Blue Crab", category: "shellfish", price: 450, unit: "1kg", stock: 6, description: "Fresh live blue crab.", imageFile: "crab.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Norwegian Salmon Fillet", category: "imported", price: 720, unit: "250g", stock: 8, description: "Imported salmon fillet.", imageFile: "salmon.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Rawas (Indian Salmon) Fillet", category: "premium", price: 520, unit: "500g", stock: 10, description: "Fresh rawas fillet portions.", imageFile: "rawas.jpg", itemType: "NON_VEG" },
  { sector: "fish", name: "Hilsa (Ilish) Steaks", category: "premium", price: 890, unit: "500g", stock: 5, description: "Seasonal hilsa steaks.", imageFile: "hilsa.jpg", itemType: "NON_VEG" },
];

export async function runGlobalCatalogSeed(
  rows: MerchantCatalogSeedRow[] = MASTER_INVENTORY_DATA,
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

  for (const row of rows) {
    try {
      const mapped = mapSeedRowToMasterCatalog(row);

      const duplicate = await prisma.masterCatalogItem.findFirst({
        where: {
          OR: [
            { sku: mapped.sku },
            {
              AND: [
                { name: { equals: mapped.name, mode: "insensitive" } },
                { storeType: mapped.storeType },
              ],
            },
          ],
        },
        select: { id: true, sku: true },
      });

      if (duplicate && duplicate.sku !== mapped.sku) {
        result.skipped++;
        result.entries.push({ name: mapped.name, sku: mapped.sku, action: "skipped" });
        continue;
      }

      const existing = await prisma.masterCatalogItem.findUnique({
        where: { sku: mapped.sku },
        select: { id: true },
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

  return result;
}
