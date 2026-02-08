const products = {
  'SKU-IP15': {
    sku: 'SKU-IP15',
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    price: 49999,
    currency: 'TRY',
    category: 'Telefon',
    specs: {
      ekran: '6.1 inç Super Retina XDR OLED',
      islemci: 'A17 Pro',
      ram: '8 GB',
      depolama: '256 GB',
      kamera: '48 MP + 12 MP + 12 MP',
      batarya: '3274 mAh',
      agirlik: '187 g',
    },
  },
  'SKU-S24': {
    sku: 'SKU-S24',
    name: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    price: 54999,
    currency: 'TRY',
    category: 'Telefon',
    specs: {
      ekran: '6.8 inç Dynamic AMOLED 2X',
      islemci: 'Snapdragon 8 Gen 3',
      ram: '12 GB',
      depolama: '256 GB',
      kamera: '200 MP + 50 MP + 12 MP + 10 MP',
      batarya: '5000 mAh',
      agirlik: '232 g',
    },
  },
  'SKU-P9': {
    sku: 'SKU-P9',
    name: 'Google Pixel 9 Pro',
    brand: 'Google',
    price: 39999,
    currency: 'TRY',
    category: 'Telefon',
    specs: {
      ekran: '6.3 inç Super Actua LTPO OLED',
      islemci: 'Tensor G4',
      ram: '16 GB',
      depolama: '128 GB',
      kamera: '50 MP + 48 MP + 48 MP',
      batarya: '4700 mAh',
      agirlik: '199 g',
    },
  },
  'SKU-MBA': {
    sku: 'SKU-MBA',
    name: 'MacBook Air M3',
    brand: 'Apple',
    price: 44999,
    currency: 'TRY',
    category: 'Laptop',
    specs: {
      ekran: '13.6 inç Liquid Retina',
      islemci: 'Apple M3',
      ram: '8 GB',
      depolama: '256 GB SSD',
      batarya: '18 saat',
      agirlik: '1.24 kg',
    },
  },
  'SKU-TP14': {
    sku: 'SKU-TP14',
    name: 'Lenovo ThinkPad X1 Carbon Gen 11',
    brand: 'Lenovo',
    price: 52999,
    currency: 'TRY',
    category: 'Laptop',
    specs: {
      ekran: '14 inç 2.8K OLED',
      islemci: 'Intel Core i7-1365U',
      ram: '16 GB',
      depolama: '512 GB SSD',
      batarya: '15 saat',
      agirlik: '1.12 kg',
    },
  },
  'SKU-XPS15': {
    sku: 'SKU-XPS15',
    name: 'Dell XPS 15',
    brand: 'Dell',
    price: 47999,
    currency: 'TRY',
    category: 'Laptop',
    specs: {
      ekran: '15.6 inç 3.5K OLED',
      islemci: 'Intel Core i7-13700H',
      ram: '16 GB',
      depolama: '512 GB SSD',
      batarya: '13 saat',
      agirlik: '1.86 kg',
    },
  },
};

/**
 * Returns product details for the given SKU list.
 * Unknown SKUs are returned with a "not found" marker.
 * @param {string[]} skuList
 * @returns {object[]}
 */
function getProductsBySku(skuList) {
  return skuList.map((sku) => {
    const upper = sku.toUpperCase();
    if (products[upper]) {
      return products[upper];
    }
    return { sku, error: 'Ürün bulunamadı' };
  });
}

module.exports = { getProductsBySku };
