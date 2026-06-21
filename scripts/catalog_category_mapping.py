#!/usr/bin/env python3
"""
Shared Zepto/Rabbitor source category → display segment mapping.
Used by align_catalog_categories.py and catalog_import.py.
"""

from __future__ import annotations

# Source Category (CSV) → Display Category (home-feed tile label)
CATEGORY_MAPPING: dict[str, str] = {
    # Grocery & Kitchen
    "Fresh Vegetables": "Fruits & Vegetables",
    "Fresh Fruits": "Fruits & Vegetables",
    "Milk & Paneer": "Dairy, Bread & Eggs",
    "Butter & Cheese": "Dairy, Bread & Eggs",
    "Curd & Yoghurt": "Dairy, Bread & Eggs",
    "Bread & Bakery": "Dairy, Bread & Eggs",
    "Eggs": "Dairy, Bread & Eggs",
    "Rice & Atta": "Atta, Rice, Oil & Dals",
    "Dal & Lentils": "Atta, Rice, Oil & Dals",
    "Cooking Oil": "Atta, Rice, Oil & Dals",
    "Chicken & Mutton": "Meat, Fish & Eggs",
    "Fish & Seafood": "Meat, Fish & Eggs",
    "Sugar, Salt & Spices": "Masala & Dry Fruits",
    "Herbs & Leafy Greens": "Masala & Dry Fruits",
    "Dry Fruits & Nuts": "Masala & Dry Fruits",
    "Breakfast Cereal": "Breakfast & Sauces",
    "Muesli & Oats": "Breakfast & Sauces",
    "Jams & Spreads": "Breakfast & Sauces",
    "Sauces & Condiments": "Breakfast & Sauces",
    "Ready to Eat": "Packaged Food",
    "Frozen Food": "Frozen Food",
    # Snacks & Drinks
    "Tea & Coffee": "Tea, Coffee & More",
    "Ice Cream": "Ice Creams & More",
    "Sweets & Mithai": "Sweet Cravings",
    "Chocolate & Candy": "Sweet Cravings",
    "Cold Drinks & Juices": "Cold Drinks & Juices",
    "Energy Drinks": "Cold Drinks & Juices",
    "Water": "Cold Drinks & Juices",
    "Chips & Crisps": "Munchies",
    "Munchies": "Munchies",
    "Biscuits & Cookies": "Biscuits & Cookies",
    "Noodles & Pasta": "Noodles & Pasta",
}

# Display label → URL segment slug (matches apps/web essentials-catalog-segments.ts)
DISPLAY_TO_SEGMENT_SLUG: dict[str, str] = {
    "Fruits & Vegetables": "veggies",
    "Dairy, Bread & Eggs": "dairy",
    "Atta, Rice, Oil & Dals": "atta-rice-oil-dals",
    "Meat, Fish & Eggs": "meat-fish-eggs",
    "Masala & Dry Fruits": "masala-dry-fruits",
    "Breakfast & Sauces": "breakfast-sauces",
    "Packaged Food": "packaged-food",
    "Frozen Food": "frozen-food",
    "Tea, Coffee & More": "tea-coffee",
    "Ice Creams & More": "ice-cream",
    "Sweet Cravings": "sweet-cravings",
    "Cold Drinks & Juices": "cold-drinks",
    "Munchies": "munchies",
    "Biscuits & Cookies": "biscuits-cookies",
    "Noodles & Pasta": "noodles-pasta",
    "Spreads & Dips": "spreads-dips",
}

STORE_TYPE_MAP: dict[str, str] = {
    "fresh vegetables": "VEGETABLE",
    "fresh fruits": "VEGETABLE",
    "herbs & leafy greens": "KIRANA",
    "milk & paneer": "DAIRY",
    "curd & yoghurt": "DAIRY",
    "butter & cheese": "DAIRY",
    "eggs": "DAIRY",
    "bread & bakery": "DAIRY",
    "rice & atta": "KIRANA",
    "dal & lentils": "KIRANA",
    "cooking oil": "KIRANA",
    "chicken & mutton": "MEAT",
    "fish & seafood": "FISH",
    "sugar, salt & spices": "KIRANA",
    "dry fruits & nuts": "KIRANA",
    "breakfast cereal": "KIRANA",
    "muesli & oats": "KIRANA",
    "jams & spreads": "KIRANA",
    "sauces & condiments": "KIRANA",
    "ready to eat": "KIRANA",
    "frozen food": "KIRANA",
    "tea & coffee": "KIRANA",
    "ice cream": "DAIRY",
    "sweets & mithai": "KIRANA",
    "chocolate & candy": "KIRANA",
    "cold drinks & juices": "GENERAL",
    "energy drinks": "GENERAL",
    "water": "GENERAL",
    "chips & crisps": "KIRANA",
    "munchies": "KIRANA",
    "biscuits & cookies": "KIRANA",
    "noodles & pasta": "KIRANA",
}

ITEM_TYPE_MAP: dict[str, str] = {
    "chicken & mutton": "NON_VEG",
    "fish & seafood": "NON_VEG",
    "eggs": "EGG",
}

NON_ESSENTIALS_SOURCE_CATEGORIES = frozenset({
    "Baby Care",
    "Pet Care",
    "Shampoo & Conditioner",
    "Feminine Hygiene",
    "Mobile Accessories",
    "Cigarettes",
    "Air Fresheners",
    "Sexual Wellness",
    "Garbage Bags",
    "Floor & Surface Cleaners",
    "Deodorant & Perfume",
    "Soap & Body Wash",
    "Face Care",
    "Oral Care",
    "Paan Corner",
    "Detergents & Dishwash",
})


def display_category(source: str) -> str:
    return CATEGORY_MAPPING.get(source, source)


def segment_slug(source: str) -> str:
    label = display_category(source)
    return DISPLAY_TO_SEGMENT_SLUG.get(label, label.lower().replace(" ", "-"))


def store_type(source: str) -> str:
    return STORE_TYPE_MAP.get(source.lower(), "GENERAL")


def item_type(source: str) -> str:
    return ITEM_TYPE_MAP.get(source.lower(), "VEG")
