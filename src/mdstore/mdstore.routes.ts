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
  productAiImages: (storeId: string, productId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/ai-images`,
  storeLandingPages: (storeId: string) => `/builder-pages/store/${encodeURIComponent(storeId)}`,
  storeDomains: (storeId: string) => `/domain/store/${encodeURIComponent(storeId)}`,
  createDomain: () => '/domain',
  domainDnsInstructions: (domain: string) => `/domain/setup-instructions/${encodeURIComponent(domain)}`,
  syncDomain: (domainId: string) => `/domain/sync/${encodeURIComponent(domainId)}`,
  deleteDomain: (domainId: string) => `/domain/delete/${encodeURIComponent(domainId)}`,
  assignDomainPage: (domainId: string) => `/domain/${encodeURIComponent(domainId)}/assign-page`,
  unassignDomainPage: (domainId: string) => `/domain/${encodeURIComponent(domainId)}/unassign-page`,
  createStore: () => '/stores/create-full',
  createBuilderPage: () => '/builder-pages',
  updateBuilderPageTree: (pageId: string) =>
    `/builder-pages/${encodeURIComponent(pageId)}/tree`,
};
