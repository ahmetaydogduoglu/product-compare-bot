const { getFavorites, addFavorite, removeFavorite } = require('./favoriteService');

describe('favoriteService', () => {
  /**
   * Generates a unique user ID for each test to avoid interdependence.
   * @returns {string} Unique user ID
   */
  const getUniqueUserId = () => `test-user-${Date.now()}-${Math.random()}`;

  describe('getFavorites', () => {
    it('should return empty array for user with no favorites', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const favorites = getFavorites(userId);

      // Assert
      expect(favorites).toEqual([]);
    });

    it('should return empty array for new user', () => {
      // Arrange
      const userId = 'completely-new-user-123';

      // Act
      const favorites = getFavorites(userId);

      // Assert
      expect(favorites).toBeInstanceOf(Array);
      expect(favorites).toHaveLength(0);
    });

    it('should return favorite products with full details', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');

      // Act
      const favorites = getFavorites(userId);

      // Assert
      expect(favorites).toHaveLength(1);
      expect(favorites[0]).toHaveProperty('sku', 'SKU-IP15');
      expect(favorites[0]).toHaveProperty('name', 'iPhone 15 Pro');
      expect(favorites[0]).toHaveProperty('price', 49999);
      expect(favorites[0]).toHaveProperty('specs');
    });

    it('should return multiple favorites in order', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');
      addFavorite(userId, 'SKU-MBA');

      // Act
      const favorites = getFavorites(userId);

      // Assert
      expect(favorites).toHaveLength(2);
      expect(favorites[0].sku).toBe('SKU-IP15');
      expect(favorites[1].sku).toBe('SKU-MBA');
    });
  });

  describe('addFavorite', () => {
    it('should add valid product to favorites', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const product = addFavorite(userId, 'SKU-IP15');

      // Assert
      expect(product).toHaveProperty('sku', 'SKU-IP15');
      expect(product).toHaveProperty('name', 'iPhone 15 Pro');
    });

    it('should add product with lowercase SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      const product = addFavorite(userId, 'sku-ip15');

      // Assert
      expect(product).toBeDefined();
      expect(product.sku).toBe('SKU-IP15');
    });

    it('should reflect added product in getFavorites', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act
      addFavorite(userId, 'SKU-S24');
      const favorites = getFavorites(userId);

      // Assert
      expect(favorites).toHaveLength(1);
      expect(favorites[0].sku).toBe('SKU-S24');
    });

    it('should throw error for unknown SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        addFavorite(userId, 'SKU-UNKNOWN');
      }).toThrow('Ürün bulunamadı');
    });

    it('should throw PRODUCT_NOT_FOUND error with correct code', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      try {
        addFavorite(userId, 'SKU-INVALID');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw error when adding duplicate favorite', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');

      // Act & Assert
      expect(() => {
        addFavorite(userId, 'SKU-IP15');
      }).toThrow('Ürün zaten favorilerde');
    });

    it('should throw ALREADY_IN_FAVORITES error with correct code', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-MBA');

      // Act & Assert
      try {
        addFavorite(userId, 'SKU-MBA');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('ALREADY_IN_FAVORITES');
        expect(error.statusCode).toBe(409);
      }
    });

    it('should detect duplicate regardless of SKU case', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');

      // Act & Assert
      expect(() => {
        addFavorite(userId, 'sku-ip15');
      }).toThrow('Ürün zaten favorilerde');
    });

    it('should allow same product for different users', () => {
      // Arrange
      const userId1 = getUniqueUserId();
      const userId2 = getUniqueUserId();

      // Act
      const product1 = addFavorite(userId1, 'SKU-IP15');
      const product2 = addFavorite(userId2, 'SKU-IP15');

      // Assert
      expect(product1.sku).toBe('SKU-IP15');
      expect(product2.sku).toBe('SKU-IP15');
    });
  });

  describe('removeFavorite', () => {
    it('should remove product from favorites', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');

      // Act
      const removed = removeFavorite(userId, 'SKU-IP15');

      // Assert
      expect(removed).toHaveProperty('sku', 'SKU-IP15');
      expect(getFavorites(userId)).toHaveLength(0);
    });

    it('should remove product with lowercase SKU', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');

      // Act
      const removed = removeFavorite(userId, 'sku-ip15');

      // Assert
      expect(removed.sku).toBe('SKU-IP15');
      expect(getFavorites(userId)).toHaveLength(0);
    });

    it('should throw error when removing product not in favorites', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        removeFavorite(userId, 'SKU-IP15');
      }).toThrow('Ürün favorilerde bulunamadı');
    });

    it('should throw NOT_IN_FAVORITES error with correct code', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-S24');

      // Act & Assert
      try {
        removeFavorite(userId, 'SKU-IP15');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('NOT_IN_FAVORITES');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw error for unknown SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      expect(() => {
        removeFavorite(userId, 'SKU-UNKNOWN');
      }).toThrow('Ürün bulunamadı');
    });

    it('should throw PRODUCT_NOT_FOUND error for invalid SKU', () => {
      // Arrange
      const userId = getUniqueUserId();

      // Act & Assert
      try {
        removeFavorite(userId, 'SKU-INVALID');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should keep other favorites after removing one', () => {
      // Arrange
      const userId = getUniqueUserId();
      addFavorite(userId, 'SKU-IP15');
      addFavorite(userId, 'SKU-MBA');
      addFavorite(userId, 'SKU-S24');

      // Act
      removeFavorite(userId, 'SKU-MBA');

      // Assert
      const favorites = getFavorites(userId);
      expect(favorites).toHaveLength(2);
      expect(favorites.map((f) => f.sku)).toContain('SKU-IP15');
      expect(favorites.map((f) => f.sku)).toContain('SKU-S24');
      expect(favorites.map((f) => f.sku)).not.toContain('SKU-MBA');
    });

    it('should not affect other users when removing favorite', () => {
      // Arrange
      const userId1 = getUniqueUserId();
      const userId2 = getUniqueUserId();
      addFavorite(userId1, 'SKU-IP15');
      addFavorite(userId2, 'SKU-IP15');

      // Act
      removeFavorite(userId1, 'SKU-IP15');

      // Assert
      expect(getFavorites(userId1)).toHaveLength(0);
      expect(getFavorites(userId2)).toHaveLength(1);
    });
  });
});
