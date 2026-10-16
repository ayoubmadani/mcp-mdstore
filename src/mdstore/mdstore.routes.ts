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
  storeSeo: (storeId: string) => `/stores/${encodeURIComponent(storeId)}/seo`,
  storeStatus: (storeId: string) => `/stores/${encodeURIComponent(storeId)}/status`,
  uploadImageBase64: () => '/images/upload-base64',
  splitTests: () => '/split-tests',
  landingPageProduct: (pageId: string) => `/builder-pages/${encodeURIComponent(pageId)}/product`,
  splitTest: (id: string) => `/split-tests/${encodeURIComponent(id)}`,
  splitTestStats: (id: string) => `/split-tests/${encodeURIComponent(id)}/stats`,
  splitTestWinner: (id: string) => `/split-tests/${encodeURIComponent(id)}/winner`,
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
  domainLimit: (storeId: string) => `/domain/limit/${encodeURIComponent(storeId)}`,
  shippingProfiles: () => '/shipping/profiles',
  storeShippingProfile: () => '/shipping/store-profile',
  shippingPrices: () => '/shipping/get-shipping',
  initShippingPrices: () => '/shipping/create-shipping',
  updateShippingPrices: () => '/shipping/update-shipping',
  addMissingWilayas: () => '/shipping/add-missing-shipping',
  shippingCommunes: (wilayaId: number) => `/shipping/communes/${wilayaId}`,
  createDomain: () => '/domain',
  domainDnsInstructions: (domain: string) => `/domain/setup-instructions/${encodeURIComponent(domain)}`,
  syncDomain: (domainId: string) => `/domain/sync/${encodeURIComponent(domainId)}`,
  deleteDomain: (domainId: string) => `/domain/delete/${encodeURIComponent(domainId)}`,
  assignDomainPage: (domainId: string) => `/domain/${encodeURIComponent(domainId)}/assign-page`,
  unassignDomainPage: (domainId: string) => `/domain/${encodeURIComponent(domainId)}/unassign-page`,
  availableThemes: () => '/theme/available',
  // معرض الثيمات العام (المفعّلة وغير المخفية) — للاقتراح على التاجر
  themeCatalog: () => '/theme?limit=200',
  // أدوات مدير المنصة — بمفتاح mdsa_ فقط، والتعديل بـ PIN في كل عملية
  adminPinChallenge: () => '/admin-mcp/pin-challenge',
  adminThemeTypes: () => '/admin-mcp/theme-types',
  adminCreateTheme: () => '/admin-mcp/themes',
  adminPublishThemeCode: () => '/admin-mcp/theme-code',
  adminThemes: () => '/admin-mcp/themes',
  adminUpdateTheme: (themeId: string) => `/admin-mcp/themes/${encodeURIComponent(themeId)}/update`,
  adminPlans: () => '/admin-mcp/plans',
  adminUpdatePlan: (planId: string) => `/admin-mcp/plans/${encodeURIComponent(planId)}/update`,
  adminPlanThemes: (planId: string) => `/admin-mcp/plans/${encodeURIComponent(planId)}/themes`,
  adminCountries: () => '/admin-mcp/locations/countries',
  adminCountryRegions: (cc: string) => `/admin-mcp/locations/countries/${encodeURIComponent(cc)}/regions`,
  adminCountryRegion: (cc: string) => `/admin-mcp/locations/countries/${encodeURIComponent(cc)}/region`,
  applyTheme: () => '/theme/apply',
  createStore: () => '/stores/create-full',
  createBuilderPage: () => '/builder-pages',
  updateBuilderPageTree: (pageId: string) =>
    `/builder-pages/${encodeURIComponent(pageId)}/tree`,
};
