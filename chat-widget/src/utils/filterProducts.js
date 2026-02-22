/**
 * Filters a product list by search term, category, and maximum price.
 * All criteria are combined with logical AND.
 * An empty/whitespace search term matches all products.
 * A null or undefined maxPrice matches all products.
 * An empty string category matches all products.
 * @param {Array<{sku: string, name: string, brand: string, category: string, price: number}>} products
 * @param {{ search: string, category: string, maxPrice: number|null }} criteria
 * @returns {Array} Filtered subset of the products array
 */
export function filterProducts(products, criteria) {
  const { search, category, maxPrice } = criteria;
  const term = (search || '').trim().toLowerCase();

  return products.filter((product) => {
    const matchesSearch =
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.brand.toLowerCase().includes(term);

    const matchesCategory = !category || product.category === category;

    const matchesPrice = !maxPrice || product.price <= maxPrice;

    return matchesSearch && matchesCategory && matchesPrice;
  });
}
