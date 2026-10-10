// كل مسارات md-store-api المستعملة في هذا المشروع — عدّلها هنا فقط
// لتطابق مسارات الواجهة الحقيقية.
export const MDSTORE_ROUTES = {
  createProduct: (storeId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products`,
  importAliexpressProduct: (storeId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products/import-aliexpress`,
  listStores: () => '/stores/user/me',
  apiKeyConnection: () => '/api-keys/connection',
  store: (storeId: string) => `/stores/${encodeURIComponent(storeId)}`,
  products: (storeId: string) => `/stores/${encodeURIComponent(storeId)}/products`,
  product: (storeId: string, productId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`,
  categories: (storeId: string) => `/stores/${encodeURIComponent(storeId)}/categories`,
  category: (storeId: string, categoryId: string) =>
    `/stores/${encodeURIComponent(storeId)}/categories/${encodeURIComponent(categoryId)}`,
  storeLandingPages: (storeId: string) => `/builder-pages/store/${encodeURIComponent(storeId)}`,
  createStore: () => '/stores/create-full',
  createBuilderPage: () => '/builder-pages',
  updateBuilderPageTree: (pageId: string) =>
    `/builder-pages/${encodeURIComponent(pageId)}/tree`,
};
