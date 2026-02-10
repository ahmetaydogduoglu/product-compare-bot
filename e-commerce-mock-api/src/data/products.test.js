const { getAll, getBySku } = require('./products');

describe('products data module', () => {
  describe('getAll', () => {
    it('should return all 6 products as an array', () => {
      // Act
      const products = getAll();

      // Assert
      expect(products).toBeInstanceOf(Array);
      expect(products).toHaveLength(6);
    });

    it('should return products with all required fields', () => {
      // Act
      const products = getAll();

      // Assert
      products.forEach((product) => {
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('brand');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('currency');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('specs');
      });
    });

    it('should include SKU-IP15 in the products list', () => {
      // Act
      const products = getAll();

      // Assert
      const iphone = products.find((p) => p.sku === 'SKU-IP15');
      expect(iphone).toBeDefined();
      expect(iphone.name).toBe('iPhone 15 Pro');
      expect(iphone.price).toBe(49999);
    });

    it('should include all expected SKUs', () => {
      // Arrange
      const expectedSkus = ['SKU-IP15', 'SKU-S24', 'SKU-P9', 'SKU-MBA', 'SKU-TP14', 'SKU-XPS15'];

      // Act
      const products = getAll();
      const actualSkus = products.map((p) => p.sku);

      // Assert
      expect(actualSkus.sort()).toEqual(expectedSkus.sort());
    });
  });

  describe('getBySku', () => {
    it('should return correct product for valid SKU', () => {
      // Act
      const product = getBySku('SKU-IP15');

      // Assert
      expect(product).toBeDefined();
      expect(product.sku).toBe('SKU-IP15');
      expect(product.name).toBe('iPhone 15 Pro');
      expect(product.brand).toBe('Apple');
      expect(product.price).toBe(49999);
    });

    it('should return product for lowercase SKU', () => {
      // Act
      const product = getBySku('sku-ip15');

      // Assert
      expect(product).toBeDefined();
      expect(product.sku).toBe('SKU-IP15');
    });

    it('should return product for mixed case SKU', () => {
      // Act
      const product = getBySku('SkU-iP15');

      // Assert
      expect(product).toBeDefined();
      expect(product.sku).toBe('SKU-IP15');
    });

    it('should return null for unknown SKU', () => {
      // Act
      const product = getBySku('SKU-UNKNOWN');

      // Assert
      expect(product).toBeNull();
    });

    it('should return null for empty string', () => {
      // Act
      const product = getBySku('');

      // Assert
      expect(product).toBeNull();
    });

    it('should return product with complete specs', () => {
      // Act
      const product = getBySku('SKU-MBA');

      // Assert
      expect(product.specs).toBeDefined();
      expect(product.specs.ekran).toBe('13.6 inç Liquid Retina');
      expect(product.specs.islemci).toBe('Apple M3');
      expect(product.specs.ram).toBe('8 GB');
    });

    it('should return correct product for each known SKU', () => {
      // Arrange
      const testCases = [
        { sku: 'SKU-S24', name: 'Samsung Galaxy S24 Ultra', price: 54999 },
        { sku: 'SKU-P9', name: 'Google Pixel 9 Pro', price: 39999 },
        { sku: 'SKU-TP14', name: 'Lenovo ThinkPad X1 Carbon Gen 11', price: 52999 },
        { sku: 'SKU-XPS15', name: 'Dell XPS 15', price: 47999 },
      ];

      testCases.forEach(({ sku, name, price }) => {
        // Act
        const product = getBySku(sku);

        // Assert
        expect(product).toBeDefined();
        expect(product.name).toBe(name);
        expect(product.price).toBe(price);
      });
    });
  });
});
