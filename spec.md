# Feature: Ürün Arama / Filtreleme (Product Search and Filtering)

**Status:** Approved
**Author:** PM Agent
**Date:** 2026-02-22
**Version:** 1.0

---

## 1. Problem Statement

Currently, users must scan all 6 product buttons to find what they want to compare. There is no way to narrow down by category or price, so users who arrive with a specific need — "show me only laptops" or "show me phones under 45,000 TL" — must manually inspect every product. This feature adds a text search input, category pill filters, and a price-range dropdown to the product selection area in `chat-widget/index.html`, so users can instantly find and select the right products to compare.

---

## 2. Goals

- Users can type a partial product name or brand name and see only matching products in real time (no server round-trip).
- Users can filter products by category ("Telefon" / "Laptop") with a single click.
- Users can filter products by a maximum price using a dropdown with predefined tiers.
- All three filters compose together (logical AND) and update the product list synchronously.
- The existing compare flow (select 2+ products, click "Karsilastir", chat opens) is fully preserved.

---

## 3. Non-Goals (Out of Scope)

- Server-side search — all filtering happens client-side against the 6 fixed SKUs.
- Adding new SKUs or connecting to a real product database.
- Persisting filter/search state across page refreshes.
- Sorting the product list (alphabetical, price asc/desc).
- Filtering inside the chat widget UI itself — filters live on the host page only.
- A new backend API endpoint for search.
- Multi-select category filters — only one category active at a time (or "Tümü").
- Mobile-responsive redesign of the host page beyond what is naturally needed.

---

## 4. User Stories

### Story 1: Search by name or brand

**As a** visitor to the product comparison page,
**I want to** type a product name or brand name into a search box,
**so that** I can quickly find the specific product I am looking for without scanning all buttons.

**Acceptance Criteria:**
- [ ] Given the search input is empty, when the page loads, then all 6 product buttons are visible.
- [ ] Given the user types "iphone" (case-insensitive), when the input changes, then only the iPhone 15 Pro button is visible.
- [ ] Given the user types "apple", when the input changes, then both iPhone 15 Pro and MacBook Air M3 buttons are visible.
- [ ] Given the user types a string that matches no product name or brand (e.g. "nokia"), when the input changes, then zero product buttons are shown and a "Ürün bulunamadı" empty-state message is displayed.
- [ ] Given the user clears the search input by deleting all characters, when the input becomes empty, then all 6 product buttons are shown again (subject to active category and price filters).
- [ ] Given the user has typed a search term, when they click the clear (×) button inside the search field, then the input is cleared and the product list rerenders based only on category and price filters.
- [ ] Given the search input contains only whitespace, when filters are applied, then it is treated as empty (all products pass the search check).
- [ ] Given the user types "APPLE" in uppercase, when filters are applied, then the same results as lowercase "apple" are shown (search is case-insensitive).

### Story 2: Filter by category

**As a** visitor who knows they want to compare only phones or only laptops,
**I want to** click a category filter pill ("Telefon" or "Laptop"),
**so that** I only see products in that category.

**Acceptance Criteria:**
- [ ] Given no category filter is active, when the page loads, then all 6 products are visible and the "Tümü" pill is in the active/selected state.
- [ ] Given the user clicks "Telefon", when the filter is applied, then only the 3 phone SKUs (SKU-IP15, SKU-S24, SKU-P9) are visible and the "Telefon" pill is in the active state.
- [ ] Given the user clicks "Laptop", when the filter is applied, then only the 3 laptop SKUs (SKU-MBA, SKU-TP14, SKU-XPS15) are visible and the "Laptop" pill is in the active state.
- [ ] Given the user clicks "Tümü", when the filter is applied, then the category restriction is removed and all products that pass search and price filters are shown.
- [ ] Given the "Telefon" filter is active and the user clicks "Telefon" again, when the toggle occurs, then the filter resets to "Tümü" (toggling an active category deactivates it).
- [ ] Given the "Telefon" filter is active and the user also has a search term that matches no phones, when filters are applied, then zero product buttons are shown and "Ürün bulunamadı" is displayed.

### Story 3: Filter by maximum price

**As a** budget-conscious user,
**I want to** select a maximum price threshold from a dropdown,
**so that** I only see products within my budget.

**Acceptance Criteria:**
- [ ] Given no price filter is selected, when the page loads, then the price dropdown shows "Tüm Fiyatlar" and all 6 products pass the price check.
- [ ] Given the user selects "50.000 TL'ye kadar", when the filter is applied, then only products with price <= 50,000 TL are shown (SKU-IP15 at 49,999 TL, SKU-P9 at 39,999 TL, SKU-MBA at 44,999 TL, SKU-XPS15 at 47,999 TL).
- [ ] Given the user selects "45.000 TL'ye kadar", when the filter is applied, then only SKU-P9 (39,999 TL) and SKU-MBA (44,999 TL) are shown.
- [ ] Given the user selects "Tüm Fiyatlar", when the filter is applied, then the price restriction is removed and all products that pass search and category filters are shown.
- [ ] Given price and category filters are both active, when both are applied together, then only products satisfying BOTH conditions are shown.

### Story 4: Combine all three filters simultaneously

**As a** user with specific requirements,
**I want to** use search, category, and price filters together,
**so that** I can narrow down exactly the products I am interested in.

**Acceptance Criteria:**
- [ ] Given category is "Telefon", price filter is "50.000 TL'ye kadar", and search is "samsung", when all filters are applied, then SKU-S24 (54,999 TL) is hidden because it exceeds 50,000 TL — zero results shown with "Ürün bulunamadı" message.
- [ ] Given category is "Telefon", price filter is "55.000 TL'ye kadar", and search is "samsung", when all filters are applied, then only SKU-S24 is visible.
- [ ] Given active filters produce at least one visible product, when the user selects 2+ of them and clicks "Karşılaştır", then the existing compare flow works exactly as before.

### Story 5: Selected-product count badge and persistent selection

**As a** user selecting products to compare,
**I want to** see how many products I have selected at all times even while filters are active,
**so that** I always know when I have enough (minimum 2) to trigger a comparison.

**Acceptance Criteria:**
- [ ] Given 0 products are selected, when the page loads, then the "Karşılaştır" button is disabled and shows the label "Karşılaştır" with no count.
- [ ] Given 1 product is selected, when the count is 1, then the "Karşılaştır" button is disabled and shows the label "Karşılaştır (1)".
- [ ] Given 2+ products are selected, when the count reaches 2, then the "Karşılaştır" button is enabled and shows "Karşılaştır (N)".
- [ ] Given a product button was selected and is then hidden by an active filter, when the filter is applied, then the product remains in the selected set (selection is not cleared by filtering).
- [ ] Given a product button is hidden by a filter but was selected, when the filter is cleared, then the button renders in its selected (highlighted) state.

---

## 5. UI/UX Flow

### Page layout (host page — `chat-widget/index.html`)

```
┌────────────────────────────────────────────────────────────┐
│ Ürün Seçimi                                                │
│                                                            │
│  [ 🔍 Ürün veya marka ara...                     ×  ]     │  ← text search
│                                                            │
│  [ Tümü* ] [ Telefon ] [ Laptop ]   [ Tüm Fiyatlar ▼ ]   │  ← category pills + price dropdown
│                                                            │
│  [ iPhone 15 Pro ]  [ Galaxy S24 Ultra ]  [ Pixel 9 Pro ] │  ← product buttons (filtered)
│  [ MacBook Air M3 ] [ ThinkPad X1 Carbon] [ Dell XPS 15 ] │
│                                                            │
│  (empty state: "Ürün bulunamadı" if 0 results)            │
│                                                            │
│  Seçili: SKU-IP15, SKU-S24        [ Karşılaştır (2) ]     │  ← existing selected list + button
└────────────────────────────────────────────────────────────┘
  * active pill shown with highlighted background
```

### Search input interaction

```
User types in #search-input
          ↓
applyFilters() runs (synchronous, client-side)
          ↓
Each .sku-btn checked against:
  nameOrBrand.includes(trimmedSearch)  AND
  product.category matches activeCategory  AND
  product.price <= maxPrice (if set)
          ↓
Matching buttons: display = ''  (visible)
Non-matching:     display = 'none'
          ↓
Count visible buttons
  0 → show #no-results, hide product grid
  ≥1 → hide #no-results, show product grid
          ↓
updateCompareButton()
```

### Category pill click interaction

```
User clicks a .cat-btn
          ↓
If clicked pill's data-category === activeCategory
  → reset activeCategory = '' (toggle off → Tümü)
Else
  → activeCategory = pill's data-category
          ↓
Update .cat-btn active styling
          ↓
applyFilters()
```

### Price dropdown change interaction

```
User changes #price-filter select
          ↓
maxPrice = parseInt(selectedOption.value) || null
          ↓
applyFilters()
```

### Compare button flow (unchanged)

```
User has selectedSkus.size >= 2 AND clicks "Karşılaştır"
          ↓
document.dispatchEvent(
  new CustomEvent('set-skus', { detail: { skus: [...selectedSkus] } })
)
          ↓
ChatWidget receives event, opens, auto-sends "Bu ürünleri karşılaştır"
```

---

## 6. Technical Design

### 6.1 API Changes

No API changes. All filtering is client-side. The existing `POST /api/chat` endpoint is unchanged.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|---------|
| —      | —        | No changes  | —            | —       |

### 6.2 Frontend Changes

**Modified files:**
- `chat-widget/index.html` — add search input, category pill buttons, price dropdown, empty-state message element, and rewrite the inline JavaScript product-selection logic.

**New utility file:**
- `chat-widget/src/utils/filterProducts.js` — pure function `filterProducts(products, criteria)` extracted for testability.

**New test file:**
- `chat-widget/src/utils/filterProducts.test.js` — Vitest unit tests for the filter function.

**No new Svelte components or stores are required.** The chat widget itself (`ChatWidget.svelte`) is unchanged. The `chatService.js` is unchanged.

#### `filterProducts.js` function signature
evet 
```js
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
export function filterProducts(products, criteria) { ... }
```

#### HTML elements to add to `index.html`

```html
<!-- Search bar -->
<div style="position: relative; display: inline-flex; align-items: center;">
  <input type="text" id="search-input" placeholder="Ürün veya marka ara..."
         style="padding: 8px 32px 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px;" />
  <button id="search-clear" aria-label="Aramayı temizle"
          style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; display: none;">×</button>
</div>

<!-- Category pills -->
<div style="display: flex; gap: 6px; align-items: center;">
  <button class="cat-btn active" data-category="">Tümü</button>
  <button class="cat-btn" data-category="Telefon">Telefon</button>
  <button class="cat-btn" data-category="Laptop">Laptop</button>

  <!-- Price dropdown -->
  <select id="price-filter" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px;">
    <option value="">Tüm Fiyatlar</option>
    <option value="40000">40.000 TL'ye kadar</option>
    <option value="45000">45.000 TL'ye kadar</option>
    <option value="50000">50.000 TL'ye kadar</option>
    <option value="55000">55.000 TL'ye kadar</option>
  </select>
</div>

<!-- Product button grid (existing buttons stay, wrapped in a container) -->
<div id="product-grid" style="display: flex; gap: 8px; flex-wrap: wrap;">
  <!-- existing .sku-btn buttons -->
</div>

<!-- Empty state -->
<div id="no-results" style="display: none; font-size: 13px; color: #6b7280; padding: 8px 0;">
  Ürün bulunamadı
</div>
```

#### Inline JavaScript structure in `index.html`

```js
// Keep in sync with api/src/services/productService.js
const PRODUCTS = [
  { sku: 'SKU-IP15',  name: 'iPhone 15 Pro',                    brand: 'Apple',   category: 'Telefon', price: 49999 },
  { sku: 'SKU-S24',   name: 'Samsung Galaxy S24 Ultra',         brand: 'Samsung', category: 'Telefon', price: 54999 },
  { sku: 'SKU-P9',    name: 'Google Pixel 9 Pro',               brand: 'Google',  category: 'Telefon', price: 39999 },
  { sku: 'SKU-MBA',   name: 'MacBook Air M3',                   brand: 'Apple',   category: 'Laptop',  price: 44999 },
  { sku: 'SKU-TP14',  name: 'Lenovo ThinkPad X1 Carbon Gen 11', brand: 'Lenovo',  category: 'Laptop',  price: 52999 },
  { sku: 'SKU-XPS15', name: 'Dell XPS 15',                      brand: 'Dell',    category: 'Laptop',  price: 47999 },
];

// Filter state
let activeCategory = '';
let maxPrice = null;
// selectedSkus and its logic remain the same as today

const applyFilters = () => {
  const term = document.getElementById('search-input').value.trim().toLowerCase();
  let visibleCount = 0;

  document.querySelectorAll('.sku-btn').forEach((btn) => {
    const sku = btn.dataset.sku;
    const product = PRODUCTS.find((p) => p.sku === sku);
    const matchesSearch = !term || product.name.toLowerCase().includes(term) || product.brand.toLowerCase().includes(term);
    const matchesCategory = !activeCategory || product.category === activeCategory;
    const matchesPrice = !maxPrice || product.price <= maxPrice;

    const visible = matchesSearch && matchesCategory && matchesPrice;
    btn.style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });

  document.getElementById('no-results').style.display = visibleCount === 0 ? '' : 'none';
  document.getElementById('product-grid').style.display = visibleCount === 0 ? 'none' : '';
};

const updateCompareButton = () => {
  const btn = document.getElementById('compare-btn');
  const count = selectedSkus.size;
  btn.disabled = count < 2;
  btn.textContent = count > 0 ? `Karşılaştır (${count})` : 'Karşılaştır';
};
```

### 6.3 Backend Changes

No backend changes required.

**New services / functions:** none.

**Modified services:** none.

---

## 7. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-----------------|
| Search term matches a product hidden by the active category filter | Product remains hidden. All three filter conditions are ANDed — no condition can override another. |
| All 6 products are filtered out | Show `#no-results` ("Ürün bulunamadı"); product grid is hidden; "Karşılaştır" button retains its current state (selected set is not cleared). |
| A previously selected product button is hidden by an active filter | The SKU stays in `selectedSkus`; `updateCompareButton()` still counts it; when the filter is removed the button renders with its selected (highlighted) style. |
| User clears search while category filter is still active | `applyFilters()` reruns with `term = ''`; only category and price filters apply; matching products reappear. |
| User has 2 selected products, applies a filter that hides both, then clicks "Karşılaştır" | Button remains enabled (selectedSkus.size === 2); the comparison still fires with those SKUs — filtering does not deselect. |
| Price dropdown reverts to "Tüm Fiyatlar" | `maxPrice = null`; all products pass the price check; `applyFilters()` reruns. |
| Search input contains only whitespace | `term = ''` after `.trim()`; treated as no search term; all products pass the search check. |
| User types in search while chat is open | No conflict — the product selection panel and the chat widget are independent DOM elements. Filters do not reset when the widget opens or closes. |
| `#search-clear` button visibility | The × button is shown only when the input has a non-empty value (`input.value.length > 0`). It is hidden on page load and after clearing. |

---

## 8. Testing Requirements

### Unit tests (Vitest — `chat-widget/src/utils/filterProducts.test.js`)

The `filterProducts` pure function covers all filter logic and is the primary unit under test.

- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'iphone', category: '', maxPrice: null })` returns exactly `[SKU-IP15]`.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'apple', category: '', maxPrice: null })` returns `[SKU-IP15, SKU-MBA]`.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'APPLE', category: '', maxPrice: null })` returns `[SKU-IP15, SKU-MBA]` (case-insensitive).
- [ ] Unit test: `filterProducts(PRODUCTS, { search: '', category: 'Laptop', maxPrice: null })` returns the 3 laptop SKUs.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: '', category: '', maxPrice: 45000 })` returns `[SKU-P9, SKU-MBA]`.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'apple', category: 'Laptop', maxPrice: null })` returns only `[SKU-MBA]`.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'xyz', category: '', maxPrice: null })` returns `[]`.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: '   ', category: '', maxPrice: null })` returns all 6 products (whitespace treated as empty).
- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'samsung', category: 'Telefon', maxPrice: 50000 })` returns `[]` (SKU-S24 is 54,999 TL).
- [ ] Unit test: `filterProducts(PRODUCTS, { search: 'samsung', category: 'Telefon', maxPrice: 55000 })` returns `[SKU-S24]`.
- [ ] Unit test: `filterProducts(PRODUCTS, { search: '', category: '', maxPrice: null })` returns all 6 products (no-op filters).

### Manual test checklist

- [ ] Load `index.html` in a browser; confirm all 6 product buttons are visible and "Karşılaştır" is disabled.
- [ ] Type "galaxy" in search; confirm only Galaxy S24 Ultra button is visible and no empty-state message.
- [ ] Type "nokia" in search; confirm 0 buttons visible and "Ürün bulunamadı" message appears.
- [ ] Clear search with the × button; confirm all 6 buttons reappear and × button hides itself.
- [ ] Click "Laptop" category pill; confirm only 3 laptop buttons are visible, "Laptop" pill is highlighted.
- [ ] Click "Laptop" pill again; confirm it resets to "Tümü" and all 6 buttons reappear.
- [ ] Select "50.000 TL'ye kadar" from price dropdown; confirm 4 products visible (≤50,000 TL).
- [ ] Type "lenovo" with price filter "50.000 TL'ye kadar" active; confirm 0 results and empty-state message.
- [ ] Select iPhone 15 Pro and Galaxy S24 Ultra; confirm button label changes to "Karşılaştır (2)" and is enabled.
- [ ] With 2 products selected, apply "Laptop" category filter (which hides both); confirm button still shows "Karşılaştır (2)" and remains enabled.
- [ ] Clear the category filter; confirm both previously selected buttons reappear in their highlighted (selected) state.
- [ ] Click "Karşılaştır (2)"; confirm the chat widget opens and the comparison message fires correctly.

---

## 9. Open Questions

- [ ] **Price tiers confirmation**: Proposed tiers are 40,000 / 45,000 / 50,000 / 55,000 TL. These were chosen to create meaningful splits across the 6 current products. Confirm or adjust before implementation.
- [ ] **Selection persistence assumption**: This spec assumes filtering does NOT clear previously selected products. If the desired behavior is to automatically deselect hidden products, revise the acceptance criteria in Story 5 accordingly.
- [ ] **`index.html` import strategy**: `index.html` is served by Vite during development and supports `<script type="module">`, so `filterProducts` can be imported from `chat-widget/src/utils/filterProducts.js`. Confirm this is the preferred approach vs. inlining the function.

---

## 10. Implementation Notes for Developer

- Follow all conventions in `CLAUDE.md`.
- All user-facing strings must be in Turkish: "Ürün veya marka ara...", "Aramayı temizle", "Tümü", "Telefon", "Laptop", "Tüm Fiyatlar", "40.000 TL'ye kadar", "45.000 TL'ye kadar", "50.000 TL'ye kadar", "55.000 TL'ye kadar", "Ürün bulunamadı", "Karşılaştır", "Seçili:".
- All code (variable names, function names, comments) must be in English.
- The `filterProducts` function must be in `chat-widget/src/utils/filterProducts.js`, exported, JSDoc-documented, and have zero DOM side effects (pure function — takes array and criteria object, returns filtered array).
- `index.html` imports `filterProducts` via `<script type="module">` from `/src/utils/filterProducts.js`. The `PRODUCTS` constant in `index.html` must be kept in sync with `api/src/services/productService.js` — add the comment `// Keep in sync with api/src/services/productService.js`.
- The search is case-insensitive: use `.toLowerCase()` on both the search term and the product name/brand before calling `.includes()`.
- `updateCompareButton()` must be called after every SKU selection/deselection AND after `applyFilters()`. The label logic: `count > 0 ? \`Karşılaştır (${count})\` : 'Karşılaştır'`.
- The × clear button (`#search-clear`) must be shown/hidden based on whether the search input has a value. Show on `input` event when `value.length > 0`; hide when `value.length === 0`.
- `activeCategory` toggling: if the user clicks the already-active category pill, reset `activeCategory` to `''` (deselect); update all `.cat-btn` active classes accordingly.
- No new npm packages are required — this is pure DOM and Vite-served ESM module.
- The existing `set-skus` custom event dispatch and its handler in `ChatWidget.svelte` are unchanged.
- `ChatWidget.svelte` is not modified. `chatService.js` is not modified. `productService.js` is not modified.
- Test file path: `chat-widget/src/utils/filterProducts.test.js` (Vitest).
- Use `const` for all declarations; use arrow functions for callbacks; semicolons required; single quotes.
