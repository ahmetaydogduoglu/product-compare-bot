const { getProductsBySku } = require('./productService');

describe('getProductsBySku', () => {
  it('should return product data for valid SKUs', () => {
    const result = getProductsBySku(['SKU-IP15', 'SKU-S24']);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('iPhone 15 Pro');
    expect(result[1].name).toBe('Samsung Galaxy S24 Ultra');
  });

  it('should return error marker for unknown SKUs', () => {
    const result = getProductsBySku(['SKU-UNKNOWN']);

    expect(result).toHaveLength(1);
    expect(result[0].error).toBe('Ürün bulunamadı');
  });

  it('should handle mixed valid and invalid SKUs', () => {
    const result = getProductsBySku(['SKU-IP15', 'SKU-INVALID', 'SKU-MBA']);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('iPhone 15 Pro');
    expect(result[1].error).toBe('Ürün bulunamadı');
    expect(result[2].name).toBe('MacBook Air M3');
  });

  it('should handle case-insensitive SKU lookup', () => {
    const result = getProductsBySku(['sku-ip15']);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('iPhone 15 Pro');
  });

  it('should return empty array for empty input', () => {
    const result = getProductsBySku([]);
    expect(result).toHaveLength(0);
  });

  it('should include all required fields in product objects', () => {
    const result = getProductsBySku(['SKU-IP15']);
    const product = result[0];

    expect(product).toHaveProperty('sku');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('brand');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('currency', 'TRY');
    expect(product).toHaveProperty('category');
    expect(product).toHaveProperty('specs');
  });

  it('should include correct specs for phone products', () => {
    const result = getProductsBySku(['SKU-IP15']);
    const specs = result[0].specs;

    expect(specs).toHaveProperty('ekran');
    expect(specs).toHaveProperty('islemci');
    expect(specs).toHaveProperty('ram');
    expect(specs).toHaveProperty('depolama');
    expect(specs).toHaveProperty('kamera');
    expect(specs).toHaveProperty('batarya');
    expect(specs).toHaveProperty('agirlik');
  });

  it('should include correct specs for laptop products', () => {
    const result = getProductsBySku(['SKU-MBA']);
    const specs = result[0].specs;

    expect(specs).toHaveProperty('ekran');
    expect(specs).toHaveProperty('islemci');
    expect(specs).toHaveProperty('ram');
    expect(specs).toHaveProperty('depolama');
    expect(specs).toHaveProperty('batarya');
    expect(specs).toHaveProperty('agirlik');
    expect(specs).not.toHaveProperty('kamera');
  });
});
