const { getCart, addToCart, updateQuantity, removeFromCart } = require('./cartService');

describe('cartService', () => {
  /**
   * Generates a unique user ID for each test to avoid interdependence.
   * @returns {string} Unique user ID
   */
  const getUniqueUserId = () => `test-user-${Date.now()}-${Math.random()}`;

  describe('getCart', () => {
    it('should return empty cart for new user', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const cart = getCart(userId);

      // Assert
      expect(cart).toEqual({
        items: [],
        totalPrice: 0,
        currency: 'TRY',
      });
    });

    it('should return cart with TRY currency', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const cart = getCart(userId);

      // Assert
      expect(cart.currency).toBe('TRY');
    });

    it('should return cart with product details', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);

      // Act
      const cart = getCart(userId);

      // Assert
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]).toHaveProperty('sku', 'SKU-IP15');
      expect(cart.items[0]).toHaveProperty('name', 'iPhone 15 Pro');
      expect(cart.items[0]).toHaveProperty('price', 49999);
      expect(cart.items[0]).toHaveProperty('quantity', 2);
      expect(cart.items[0]).toHaveProperty('subtotal', 99998);
    });

    it('should calculate correct total price for single item', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 3);

      // Act
      const cart = getCart(userId);

      // Assert
      expect(cart.totalPrice).toBe(149997); // 49999 * 3
    });

    it('should calculate correct total price for multiple items', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2); // 49999 * 2 = 99998
      addToCart(userId, 'SKU-MBA', 1);  // 44999 * 1 = 44999

      // Act
      const cart = getCart(userId);

      // Assert
      expect(cart.totalPrice).toBe(144997); // 99998 + 44999
    });
  });

  describe('addToCart', () => {
    it('should add new product to cart', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const result = addToCart(userId, 'SKU-IP15', 1);

      // Assert
      expect(result.item).toHaveProperty('sku', 'SKU-IP15');
      expect(result.item).toHaveProperty('quantity', 1);
      expect(result.cart.items).toHaveLength(1);
    });

    it('should add product with lowercase SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const result = addToCart(userId, 'sku-ip15', 1);

      // Assert
      expect(result.item.sku).toBe('SKU-IP15');
    });

    it('should add multiple quantity of same product', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const result = addToCart(userId, 'SKU-S24', 5);

      // Assert
      expect(result.item.quantity).toBe(5);
      expect(result.cart.items[0].subtotal).toBe(274995); // 54999 * 5
    });

    it('should increment quantity when adding existing product', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);

      // Act
      const result = addToCart(userId, 'SKU-IP15', 3);

      // Assert
      expect(result.item.quantity).toBe(5); // 2 + 3
      expect(result.cart.items).toHaveLength(1);
    });

    it('should increment quantity regardless of SKU case', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 1);

      // Act
      const result = addToCart(userId, 'sku-ip15', 2);

      // Assert
      expect(result.item.quantity).toBe(3);
      expect(result.cart.items).toHaveLength(1);
    });

    it('should return updated cart after adding product', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 1);

      // Act
      const result = addToCart(userId, 'SKU-MBA', 2);

      // Assert
      expect(result.cart.items).toHaveLength(2);
      expect(result.cart.totalPrice).toBe(139997); // 49999 + (44999 * 2)
    });

    it('should throw error for unknown SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        addToCart(userId, 'SKU-UNKNOWN', 1);
      }).toThrow('Ürün bulunamadı');
    });

    it('should throw PRODUCT_NOT_FOUND error with correct code', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      try {
        addToCart(userId, 'SKU-INVALID', 1);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should handle adding same product to different users', () => {
      // Arrange
      const userId1 = getUniqueUserId();
      const userId2 = getUniqueUserId();

      // Act
      const result1 = addToCart(userId1, 'SKU-IP15', 2);
      const result2 = addToCart(userId2, 'SKU-IP15', 3);

      // Assert
      expect(result1.item.quantity).toBe(2);
      expect(result2.item.quantity).toBe(3);
      expect(getCart(userId1).items).toHaveLength(1);
      expect(getCart(userId2).items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity of existing product', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);

      // Act
      const result = updateQuantity(userId, 'SKU-IP15', 5);

      // Assert
      expect(result.item.quantity).toBe(5);
      expect(result.cart.items[0].quantity).toBe(5);
    });

    it('should update quantity with lowercase SKU', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);

      // Act
      const result = updateQuantity(userId, 'sku-ip15', 3);

      // Assert
      expect(result.item.quantity).toBe(3);
    });

    it('should remove item when quantity is 0', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);

      // Act
      const result = updateQuantity(userId, 'SKU-IP15', 0);

      // Assert
      expect(result.item).toBeNull();
      expect(result.cart.items).toHaveLength(0);
    });

    it('should keep other items when removing one with quantity 0', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);
      addToCart(userId, 'SKU-MBA', 1);

      // Act
      const result = updateQuantity(userId, 'SKU-IP15', 0);

      // Assert
      expect(result.cart.items).toHaveLength(1);
      expect(result.cart.items[0].sku).toBe('SKU-MBA');
    });

    it('should update total price after quantity change', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2); // 99998

      // Act
      const result = updateQuantity(userId, 'SKU-IP15', 5);

      // Assert
      expect(result.cart.totalPrice).toBe(249995); // 49999 * 5
    });

    it('should throw error when product not in cart', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        updateQuantity(userId, 'SKU-IP15', 5);
      }).toThrow('Ürün sepette bulunamadı');
    });

    it('should throw NOT_IN_CART error with correct code', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-S24', 1);

      // Act & Assert
      try {
        updateQuantity(userId, 'SKU-IP15', 5);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('NOT_IN_CART');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw error for unknown SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        updateQuantity(userId, 'SKU-UNKNOWN', 5);
      }).toThrow('Ürün bulunamadı');
    });

    it('should throw PRODUCT_NOT_FOUND error for invalid SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      try {
        updateQuantity(userId, 'SKU-INVALID', 5);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('removeFromCart', () => {
    it('should remove product from cart', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);

      // Act
      const result = removeFromCart(userId, 'SKU-IP15');

      // Assert
      expect(result.removedItem).toHaveProperty('sku', 'SKU-IP15');
      expect(result.removedItem).toHaveProperty('quantity', 2);
      expect(result.cart.items).toHaveLength(0);
    });

    it('should remove product with lowercase SKU', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 1);

      // Act
      const result = removeFromCart(userId, 'sku-ip15');

      // Assert
      expect(result.removedItem.sku).toBe('SKU-IP15');
    });

    it('should keep other items when removing one', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 2);
      addToCart(userId, 'SKU-MBA', 1);
      addToCart(userId, 'SKU-S24', 3);

      // Act
      const result = removeFromCart(userId, 'SKU-MBA');

      // Assert
      expect(result.cart.items).toHaveLength(2);
      const skus = result.cart.items.map((item) => item.sku);
      expect(skus).toContain('SKU-IP15');
      expect(skus).toContain('SKU-S24');
      expect(skus).not.toContain('SKU-MBA');
    });

    it('should update total price after removal', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-IP15', 1); // 49999
      addToCart(userId, 'SKU-MBA', 1);  // 44999

      // Act
      const result = removeFromCart(userId, 'SKU-IP15');

      // Assert
      expect(result.cart.totalPrice).toBe(44999); // Only MBA remains
    });

    it('should throw error when removing product not in cart', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        removeFromCart(userId, 'SKU-IP15');
      }).toThrow('Ürün sepette bulunamadı');
    });

    it('should throw NOT_IN_CART error with correct code', () => {
      // Arrange
      const userId = getUniqueUserId();
      addToCart(userId, 'SKU-S24', 1);

      // Act & Assert
      try {
        removeFromCart(userId, 'SKU-IP15');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('NOT_IN_CART');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw error for unknown SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        removeFromCart(userId, 'SKU-UNKNOWN');
      }).toThrow('Ürün bulunamadı');
    });

    it('should throw PRODUCT_NOT_FOUND error for invalid SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      try {
        removeFromCart(userId, 'SKU-INVALID');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should not affect other users when removing from cart', () => {
      // Arrange
      const userId1 = getUniqueUserId();
      const userId2 = getUniqueUserId();
      addToCart(userId1, 'SKU-IP15', 2);
      addToCart(userId2, 'SKU-IP15', 3);

      // Act
      removeFromCart(userId1, 'SKU-IP15');

      // Assert
      expect(getCart(userId1).items).toHaveLength(0);
      expect(getCart(userId2).items).toHaveLength(1);
      expect(getCart(userId2).items[0].quantity).toBe(3);
    });
  });
});
