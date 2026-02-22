import { describe, it, expect } from 'vitest';
import { filterProducts } from './filterProducts.js';

// Keep in sync with api/src/services/productService.js
const PRODUCTS = [
  { sku: 'SKU-IP15',  name: 'iPhone 15 Pro',                    brand: 'Apple',   category: 'Telefon', price: 49999 },
  { sku: 'SKU-S24',   name: 'Samsung Galaxy S24 Ultra',         brand: 'Samsung', category: 'Telefon', price: 54999 },
  { sku: 'SKU-P9',    name: 'Google Pixel 9 Pro',               brand: 'Google',  category: 'Telefon', price: 39999 },
  { sku: 'SKU-MBA',   name: 'MacBook Air M3',                   brand: 'Apple',   category: 'Laptop',  price: 44999 },
  { sku: 'SKU-TP14',  name: 'Lenovo ThinkPad X1 Carbon Gen 11', brand: 'Lenovo',  category: 'Laptop',  price: 52999 },
  { sku: 'SKU-XPS15', name: 'Dell XPS 15',                      brand: 'Dell',    category: 'Laptop',  price: 47999 },
];

describe('filterProducts', () => {
  it('should return only iPhone 15 Pro when search is "iphone"', () => {
    const result = filterProducts(PRODUCTS, { search: 'iphone', category: '', maxPrice: null });
    expect(result.map((p) => p.sku)).toEqual(['SKU-IP15']);
  });

  it('should return iPhone 15 Pro and MacBook Air M3 when search is "apple"', () => {
    const result = filterProducts(PRODUCTS, { search: 'apple', category: '', maxPrice: null });
    expect(result.map((p) => p.sku)).toEqual(['SKU-IP15', 'SKU-MBA']);
  });

  it('should be case-insensitive and return same results for "APPLE" as "apple"', () => {
    const result = filterProducts(PRODUCTS, { search: 'APPLE', category: '', maxPrice: null });
    expect(result.map((p) => p.sku)).toEqual(['SKU-IP15', 'SKU-MBA']);
  });

  it('should return the 3 laptop SKUs when category is "Laptop"', () => {
    const result = filterProducts(PRODUCTS, { search: '', category: 'Laptop', maxPrice: null });
    expect(result.map((p) => p.sku)).toEqual(['SKU-MBA', 'SKU-TP14', 'SKU-XPS15']);
  });

  it('should return only products with price <= 45000 when maxPrice is 45000', () => {
    const result = filterProducts(PRODUCTS, { search: '', category: '', maxPrice: 45000 });
    expect(result.map((p) => p.sku)).toEqual(['SKU-P9', 'SKU-MBA']);
  });

  it('should return only MacBook Air M3 when search is "apple" and category is "Laptop"', () => {
    const result = filterProducts(PRODUCTS, { search: 'apple', category: 'Laptop', maxPrice: null });
    expect(result.map((p) => p.sku)).toEqual(['SKU-MBA']);
  });

  it('should return an empty array when search matches no products', () => {
    const result = filterProducts(PRODUCTS, { search: 'xyz', category: '', maxPrice: null });
    expect(result).toEqual([]);
  });

  it('should treat whitespace-only search as empty and return all 6 products', () => {
    const result = filterProducts(PRODUCTS, { search: '   ', category: '', maxPrice: null });
    expect(result).toHaveLength(6);
  });

  it('should return empty array when samsung is in Telefon category with maxPrice 50000 (SKU-S24 is 54999)', () => {
    const result = filterProducts(PRODUCTS, { search: 'samsung', category: 'Telefon', maxPrice: 50000 });
    expect(result).toEqual([]);
  });

  it('should return SKU-S24 when search is "samsung", category is "Telefon", maxPrice is 55000', () => {
    const result = filterProducts(PRODUCTS, { search: 'samsung', category: 'Telefon', maxPrice: 55000 });
    expect(result.map((p) => p.sku)).toEqual(['SKU-S24']);
  });

  it('should return all 6 products when all criteria are empty/null (no-op filters)', () => {
    const result = filterProducts(PRODUCTS, { search: '', category: '', maxPrice: null });
    expect(result).toHaveLength(6);
  });
});
