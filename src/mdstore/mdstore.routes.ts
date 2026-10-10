// كل مسارات md-store-api المستعملة في هذا المشروع — عدّلها هنا فقط
// لتطابق مسارات الواجهة الحقيقية.
export const MDSTORE_ROUTES = {
  createProduct: (storeId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products`,
  importAliexpressProduct: (storeId: string) =>
    `/stores/${encodeURIComponent(storeId)}/products/import-aliexpress`,
  listStores: () => '/stores/user/me',
  createStore: () => '/stores/create-full',
  createBuilderPage: () => '/builder-pages',
  updateBuilderPageTree: (pageId: string) =>
    `/builder-pages/${encodeURIComponent(pageId)}/tree`,
};
