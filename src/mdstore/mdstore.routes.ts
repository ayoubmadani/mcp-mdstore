// كل مسارات md-store-api المستعملة في هذا المشروع — عدّلها هنا فقط
// لتطابق مسارات الواجهة الحقيقية.
export const MDSTORE_ROUTES = {
  createProduct: (storeId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products`,
  importAliexpressProduct: (storeId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products/import-aliexpress`,
  listStores: () => '/stores/user/me',
  store: (storeId: string) => `/stores/${encodeURIComponent(storeId)}`,
  products: (storeId: string) => `/stores/${encodeURIComponent(storeId)}/products`,
  product: (storeId: string, productId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`,
  storeLandingPages: (storeId: string) => `/builder-pages/store/${encodeURIComponent(storeId)}`,
  createStore: () => '/stores/create-full',
  createBuilderPage: () => '/builder-pages',
  updateBuilderPageTree: (pageId: string) =>
    `/builder-pages/${encodeURIComponent(pageId)}/tree`,
};
