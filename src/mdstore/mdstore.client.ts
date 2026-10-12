import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MDSTORE_ROUTES } from './mdstore.routes';

// خطأ أرجعته md-store-api — `message` هي رسالتها كما هي بدون تغيير.
export class MdstoreApiError extends Error {}

// إضافة اختيارية للمنتج (مثلاً: جبن إضافي +100) — id يُولَّد إن لم يُعطَ، ومرّره لإبقاء إضافة موجودة
export interface ProductAddonInput {
  id?: string;
  name: string;
  price: number;
  isActive?: boolean;
}

export interface ShippingPriceInput {
  wilayaId: number;
  priceHome?: number;
  priceOffice?: number;
  priceReturn?: number;
  isActive?: boolean;
}

export interface AdminThemeInput {
  name_en: string;
  name_ar: string;
  name_fr: string;
  slug: string;
  price: number;
  desc_en: string;
  desc_ar: string;
  desc_fr: string;
  imageUrl: string;
  tag?: string[];
  typeId: string;
}

export interface CreateProductInput {
  addons?: ProductAddonInput[];
  categoryId?: string;
  name: string;
  price: number;
  stock?: number;
  images?: string[];
  description?: string;
}

export interface ImportProductInput {
  url: string;
  price: number;
  stock?: number;
  name?: string;
  language?: string;
}

export interface CategoryInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateProductInput {
  addons?: ProductAddonInput[];
  categoryId?: string | null;
  name?: string;
  price?: number;
  originalPrice?: number;
  stock?: number;
  description?: string;
  isActive?: boolean;
  images?: string[];
}

export interface UpdateStoreInput {
  name?: string;
  language?: string;
  primaryColor?: string;
  secondaryColor?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  topBarText?: string;
  topBarEnabled?: boolean;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

const toAddons = (addons?: ProductAddonInput[]) =>
  addons?.map((a, i) => ({
    id: a.id ?? `ad-${Date.now().toString(36)}-${i}`,
    name: a.name,
    price: a.price,
    isActive: a.isActive ?? true,
  }));

// أنواع ثيمات لا تُقترح ولا تُطبَّق للتجار (مطابقة لـ HIDDEN_TYPE_NAMES في md-store-api)
const HIDDEN_THEME_TYPES = ['custom', 'testing'];

const defined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export interface StoreCategorySeed {
  name: string;
  imageUrl?: string;
}

export interface StoreProductSeed {
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  images?: string[];
  category?: string;
  stock?: number;
  addons?: ProductAddonInput[];
}

export interface CreateStoreInput {
  categories?: StoreCategorySeed[];
  products?: StoreProductSeed[];
  name: string;
  subdomain: string;
  language?: string;
  currency?: string;
  cart?: boolean;
  design?: { primaryColor?: string; secondaryColor?: string };
  hero?: { imageUrl?: string; title?: string; subtitle?: string };
  topBar?: { enabled?: boolean; text?: string; color?: string };
  themeId?: string;
}

export interface PageNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: PageNode[];
}

export interface CreateLandingPageInput {
  storeId: string;
  name: string;
  productId?: string;
  tree: PageNode[];
}

@Injectable()
export class MdstoreClient {
  constructor(private readonly http: HttpService) {}

  createProduct(apiKey: string, storeId: string, input: CreateProductInput & { originalPrice?: number; importExternalImages?: boolean }) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.createProduct(storeId), {
      name: input.name,
      price: input.price,
      priceOriginal: input.originalPrice,
      importExternalImages: input.importExternalImages,
      stock: input.stock,
      images: input.images,
      desc: input.description,
      categoryId: input.categoryId,
      addons: toAddons(input.addons),
      // مطلوبان في CreateProductDto حتى لمنتج بدون متغيرات.
      attributes: [],
      variantDetails: [],
    });
  }

  // المنصة تجلب المنتج من AliExpress (الاسم، الوصف، الصور، الخصائص) وتنشئه بسعر البيع المعطى
  importAliexpressProduct(apiKey: string, storeId: string, input: ImportProductInput) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.importAliexpressProduct(storeId), input);
  }

  // قائمة مختصرة (الاسم/السعر/المخزون/الحالة) — بيانات المنتج الكاملة طويلة جداً
  async listProducts(apiKey: string, storeId: string, search?: string, page = 1) {
    const qs = new URLSearchParams({ page: String(page), limit: '50', ...(search ? { search } : {}) });
    const res = await this.request<any>(apiKey, 'GET', `${MDSTORE_ROUTES.products(storeId)}?${qs}`);
    const items: any[] = res?.products ?? res?.data ?? (Array.isArray(res) ? res : []);
    return {
      total: res?.total ?? res?.meta?.total ?? items.length,
      products: items.map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), stock: p.stock, isActive: p.isActive,
      })),
    };
  }

  updateProduct(apiKey: string, storeId: string, productId: string, input: UpdateProductInput) {
    return this.request(apiKey, 'PATCH', MDSTORE_ROUTES.product(storeId, productId), defined({
      name: input.name,
      price: input.price,
      priceOriginal: input.originalPrice,
      stock: input.stock,
      desc: input.description,
      isActive: input.isActive,
      images: input.images,
      categoryId: input.categoryId,
      addons: toAddons(input.addons),
    }));
  }

  // حذف ناعم — يمكن استرجاع المنتج من لوحة التحكم
  deleteProduct(apiKey: string, storeId: string, productId: string) {
    return this.request(apiKey, 'DELETE', MDSTORE_ROUTES.product(storeId, productId));
  }

  async getStore(apiKey: string, storeId: string) {
    const res = await this.request<any>(apiKey, 'GET', MDSTORE_ROUTES.store(storeId));
    const s = res?.data ?? res;
    return {
      id: s.id, name: s.name, subdomain: s.subdomain, language: s.language, currency: s.currency,
      design: s.design && { primaryColor: s.design.primaryColor, secondaryColor: s.design.secondaryColor, logoUrl: s.design.logoUrl },
      hero: s.hero && { imageUrl: s.hero.imageUrl, title: s.hero.title, subtitle: s.hero.subtitle },
      topBar: s.topBar && { enabled: s.topBar.enabled, text: s.topBar.text },
      contact: s.contact && { phone: s.contact.phone, whatsapp: s.contact.whatsapp, email: s.contact.email },
    };
  }

  // PATCH /stores/:id يتطلب name و subdomain داخل قسم store — نأخذهما من المتجر الحالي
  async updateStore(apiKey: string, storeId: string, input: UpdateStoreInput) {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined || input.language !== undefined) {
      const cur = await this.getStore(apiKey, storeId);
      body.store = defined({ name: input.name ?? cur.name, subdomain: cur.subdomain, language: input.language });
    }
    const design = defined({ primaryColor: input.primaryColor, secondaryColor: input.secondaryColor });
    const hero = defined({ imageUrl: input.heroImageUrl, title: input.heroTitle, subtitle: input.heroSubtitle });
    const topBar = defined({ text: input.topBarText, enabled: input.topBarEnabled ?? (input.topBarText ? true : undefined) });
    const contact = defined({ phone: input.phone, whatsapp: input.whatsapp, email: input.email });
    if (Object.keys(design).length) body.design = design;
    if (Object.keys(hero).length) body.hero = hero;
    if (Object.keys(topBar).length) body.topBar = topBar;
    if (Object.keys(contact).length) body.contact = contact;
    await this.request(apiKey, 'PATCH', MDSTORE_ROUTES.store(storeId), body);
    return this.getStore(apiKey, storeId);
  }

  // شجرة التصنيفات مسطّحة (مع المستوى والأب) — مختصرة
  async listCategories(apiKey: string, storeId: string) {
    const res = await this.request<any>(apiKey, 'GET', MDSTORE_ROUTES.categories(storeId));
    const roots: any[] = res?.data ?? (Array.isArray(res) ? res : []);
    const out: any[] = [];
    const walk = (nodes: any[], level: number) => {
      for (const c of nodes ?? []) {
        out.push({ id: c.id, name: c.name, parentId: c.parentId ?? null, level, isActive: c.isActive });
        walk(c.children, level + 1);
      }
    };
    walk(roots, 0);
    return out;
  }

  createCategory(apiKey: string, storeId: string, input: CategoryInput & { name: string }) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.categories(storeId), defined({ ...input }));
  }

  updateCategory(apiKey: string, storeId: string, categoryId: string, input: CategoryInput) {
    return this.request(apiKey, 'PATCH', MDSTORE_ROUTES.category(storeId, categoryId), defined({ ...input }));
  }

  // حذف ناعم (مع التصنيفات الفرعية) — يمكن الاسترجاع من لوحة التحكم
  deleteCategory(apiKey: string, storeId: string, categoryId: string) {
    return this.request(apiKey, 'DELETE', MDSTORE_ROUTES.category(storeId, categoryId));
  }

  async listLandingPages(apiKey: string, storeId: string) {
    const res = await this.request<any>(apiKey, 'GET', MDSTORE_ROUTES.storeLandingPages(storeId));
    const items: any[] = res?.data ?? (Array.isArray(res) ? res : []);
    return items.map((p) => ({ id: p.id, name: p.name, productId: p.productId, isPublished: p.isPublished ?? p.status }));
  }

  // ثيمات التاجر المشتراة + ثيمات خطته — مختصرة (الوصف بلغة واحدة) لاختيار الأقرب للنشاط
  async listAvailableThemes(apiKey: string, language = 'ar') {
    const items = await this.request<any[]>(apiKey, 'GET', MDSTORE_ROUTES.availableThemes());
    const lang = ['ar', 'fr', 'en'].includes(language) ? language : 'ar';
    return (items ?? []).filter((t) => !HIDDEN_THEME_TYPES.includes(t.type)).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name?.[lang] || t.name?.en,
      description: t.description?.[lang] || t.description?.en,
      tags: t.tags,
      type: t.type,
      source: t.source, // owned = اشتراه، plan = ضمن خطته
    }));
  }

  // كل ثيمات المعرض مع حالة كل ثيم للتاجر: available = يملكه أو ضمن خطته (يُطبَّق مباشرة)،
  // وإلا يحتاج شراءه (price) من صفحة القوالب أو ترقية الخطة
  async browseThemeCatalog(apiKey: string, language = 'ar', search?: string) {
    const lang = ['ar', 'fr', 'en'].includes(language) ? language : 'ar';
    const [catalog, available] = await Promise.all([
      this.request<any>(apiKey, 'GET', MDSTORE_ROUTES.themeCatalog()),
      this.request<any[]>(apiKey, 'GET', MDSTORE_ROUTES.availableThemes()).catch(() => []),
    ]);
    const owned = new Map(
      (available ?? []).filter((t: any) => !HIDDEN_THEME_TYPES.includes(t.type)).map((t: any) => [t.id, t.source]),
    );
    const q = search?.trim().toLowerCase();
    const rows: any[] = catalog?.data ?? (Array.isArray(catalog) ? catalog : []);
    return rows
      // مفعّل فقط، ولا أنواع مخفية (custom، testing) — حتى لو أرجعها الخادم
      .filter((t) => t.isActive !== false && !HIDDEN_THEME_TYPES.includes(t.type?.name))
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t[`name_${lang}`] || t.name_ar || t.name_en,
        description: t[`desc_${lang}`] || t.desc_ar || t.desc_en,
        tags: t.tag ?? [],
        type: t.type?.name ?? null,
        price: Number(t.price ?? 0),
        imageUrl: t.imageUrl,
        available: owned.has(t.id),
        source: owned.get(t.id) ?? null,
      }))
      .filter((t) => !q || [t.name, t.description, t.slug, t.type, ...t.tags].join(' ').toLowerCase().includes(q));
  }

  applyTheme(apiKey: string, storeId: string, themeId: string) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.applyTheme(), { storeId, themeId });
  }

  // الدومينات + حدّ الخطة (كل دومينات المتجر، فرعية وخاصة، للمتجر ولصفحات الهبوط، تُحسب معاً)
  async listDomains(apiKey: string, storeId: string) {
    const [res, usage] = await Promise.all([
      this.request<any>(apiKey, 'GET', MDSTORE_ROUTES.storeDomains(storeId)),
      // نسخة API قديمة بلا هذا المسار: نعرض الدومينات بدون الحد
      this.request<{ limit: number; used: number }>(apiKey, 'GET', MDSTORE_ROUTES.domainLimit(storeId)).catch(() => null),
    ]);
    const items: any[] = res?.data ?? (Array.isArray(res) ? res : []);
    return {
      limit: usage?.limit,
      used: usage?.used ?? items.length,
      domains: items.map((d) => ({
        id: d.id, domain: d.domain, isActive: d.isActive, isSub: d.isSub,
        scope: d.scope, builderPageId: d.builderPageId ?? null,
      })),
    };
  }

  // حسابات الشحن: لكل حساب أسعاره وولاياته، وكل متجر يستعمل حساباً (الافتراضي إن لم يُختر)
  listShippingProfiles(apiKey: string) {
    return this.request(apiKey, 'GET', MDSTORE_ROUTES.shippingProfiles());
  }

  createShippingProfile(apiKey: string, name: string, copyFromId?: string) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.shippingProfiles(), defined({ name, copyFromId }));
  }

  setStoreShippingProfile(apiKey: string, storeId: string, profileId: string | null) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.storeShippingProfile(), { storeId, profileId });
  }

  // أسعار حساب (الافتراضي إن لم يُحدَّد)؛ إن لم تكن له أسعار بعد تُنشأ كل الولايات بسعر 0
  async getShippingPrices(apiKey: string, profileId?: string) {
    const qs = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
    let rows = await this.request<any[]>(apiKey, 'GET', `${MDSTORE_ROUTES.shippingPrices()}${qs}`);
    if (!rows?.length) rows = await this.request<any[]>(apiKey, 'GET', `${MDSTORE_ROUTES.initShippingPrices()}${qs}`);
    return (rows ?? []).map((w) => ({
      wilayaId: w.id, name: w.name, ar_name: w.ar_name,
      priceHome: Number(w.livraisonHome), priceOffice: Number(w.livraisonOfice),
      priceReturn: Number(w.livraisonReturn), isActive: w.isActive,
    }));
  }

  async updateShippingPrices(apiKey: string, prices: ShippingPriceInput[], profileId?: string) {
    const qs = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
    // الولايات المحذوفة من الحساب تُضاف أولاً (بسعر 0) حتى يمكن تحديث سعرها
    await this.request(apiKey, 'POST', `${MDSTORE_ROUTES.addMissingWilayas()}${qs}`, {
      wilayaIds: prices.map((p) => p.wilayaId),
    });
    await this.request(apiKey, 'POST', `${MDSTORE_ROUTES.updateShippingPrices()}${qs}`, prices);
    return this.getShippingPrices(apiKey, profileId);
  }

  /* مدير المنصة (مفتاح mdsa_) */

  // أسماء الرموز المطلوبة (مثل ZZMMHH) + توكن التحدّي — صالح 5 دقائق ولعملية واحدة
  adminPinChallenge(apiKey: string) {
    return this.request<{ label: string; challenge_token: string }>(apiKey, 'POST', MDSTORE_ROUTES.adminPinChallenge());
  }

  async adminListThemeTypes(apiKey: string) {
    const rows = await this.request<any[]>(apiKey, 'GET', MDSTORE_ROUTES.adminThemeTypes());
    return (rows ?? []).map((t) => ({ id: t.id, name: t.name, hidden: !!t.hidden }));
  }

  adminCreateThemeType(apiKey: string, name: string, pin: string, challengeToken: string) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.adminThemeTypes(), { name, pin, challenge_token: challengeToken });
  }

  adminCreateTheme(apiKey: string, theme: AdminThemeInput, pin: string, challengeToken: string) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.adminCreateTheme(), {
      pin,
      challenge_token: challengeToken,
      theme,
    });
  }

  // دومين فرعي (xxx.mdstore.top) يعمل فوراً؛ الدومين الخارجي يحتاج سجلات DNS نرجعها معه
  async addDomain(
    apiKey: string,
    input: { storeId: string; domain: string; builderPageId?: string },
  ) {
    const created = await this.request<any>(apiKey, 'POST', MDSTORE_ROUTES.createDomain(), defined({
      storeId: input.storeId,
      domain: input.domain,
      scope: input.builderPageId ? 'landing_page' : undefined,
      builderPageId: input.builderPageId,
    }));
    if (created?.isSub) return created;
    const dns = await this.request<any>(apiKey, 'GET', MDSTORE_ROUTES.domainDnsInstructions(created.domain));
    return { ...created, dns };
  }

  checkDomainStatus(apiKey: string, domainId: string) {
    return this.request(apiKey, 'PATCH', MDSTORE_ROUTES.syncDomain(domainId));
  }

  async deleteDomain(apiKey: string, storeId: string, domainId: string) {
    await this.request(apiKey, 'POST', MDSTORE_ROUTES.deleteDomain(domainId), { storeId });
    return { deleted: true, domainId };
  }

  assignDomainToPage(apiKey: string, storeId: string, domainId: string, builderPageId: string) {
    return this.request(apiKey, 'PATCH', MDSTORE_ROUTES.assignDomainPage(domainId), { storeId, builderPageId });
  }

  unassignDomainFromPage(apiKey: string, storeId: string, domainId: string) {
    return this.request(apiKey, 'PATCH', MDSTORE_ROUTES.unassignDomainPage(domainId), { storeId });
  }

  // يسجّل في المنصة أن ذكاءً اصطناعياً (Claude / ChatGPT…) ارتبط بهذا المفتاح
  markConnected(apiKey: string, client: string) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.apiKeyConnection(), { client });
  }

  // صور منتج بالذكاء الاصطناعي (Higgsfield) — تُحفظ في تخزين المنصة وتُضاف للمنتج
  generateProductImages(
    apiKey: string,
    storeId: string,
    productId: string,
    input: { prompt?: string; count?: number; aspectRatio?: string; addToProduct?: boolean },
  ) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.productAiImages(storeId, productId), input);
  }

  listStores(apiKey: string) {
    return this.request(apiKey, 'GET', MDSTORE_ROUTES.listStores());
  }

  // المتجر يُنشأ أولاً ثم يُطبَّق الثيم — فشل الثيم لا يلغي المتجر، يُرجَع مع الخطأ
  // متجر بلا محتوى تجريبي + ثيم + تصنيفات ومنتجات خاصة بنشاطه (صورها تُحفظ في تخزين المنصة).
  // فشل عنصر (مثلاً حد الخطة) لا يوقف الباقي — يُذكر في النتيجة.
  async createStore(apiKey: string, input: CreateStoreInput) {
    const created = await this.createStoreOnly(apiKey, input);
    const storeId: string | undefined = created?.data?.id ?? created?.id;
    if (!storeId) return created;
    const result: Record<string, unknown> = { ...created };
    const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

    if (input.themeId) {
      try {
        const applied = await this.applyTheme(apiKey, storeId, input.themeId);
        result.theme = (applied as any)?.theme ?? applied;
      } catch (err) {
        result.themeError = errMsg(err);
      }
    }

    // نسخة API قديمة تتجاهل skipDemoContent: نحذف المحتوى التجريبي بأنفسنا
    try {
      const [cats, prods] = await Promise.all([
        this.listCategories(apiKey, storeId),
        this.listProducts(apiKey, storeId),
      ]);
      await Promise.all([
        ...prods.products.map((p) => this.deleteProduct(apiKey, storeId, p.id).catch(() => undefined)),
        ...cats.filter((c) => c.level === 0).map((c) => this.deleteCategory(apiKey, storeId, c.id).catch(() => undefined)),
      ]);
    } catch {
      /* المتجر أُنشئ — التنظيف ليس ضرورياً لنجاحه */
    }

    const categoryIds = new Map<string, string>();
    const categories: unknown[] = [];
    for (const c of input.categories ?? []) {
      try {
        const res = await this.request<any>(apiKey, 'POST', MDSTORE_ROUTES.categories(storeId), defined({ name: c.name, imageUrl: c.imageUrl }));
        const id = res?.data?.id ?? res?.id;
        if (id) categoryIds.set(c.name.trim().toLowerCase(), id);
        categories.push({ name: c.name, id });
      } catch (err) {
        categories.push({ name: c.name, error: errMsg(err) });
      }
    }

    const products: unknown[] = [];
    for (const p of input.products ?? []) {
      try {
        const res = await this.createProduct(apiKey, storeId, {
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          description: p.description,
          images: p.images,
          stock: p.stock ?? 100,
          addons: p.addons,
          categoryId: p.category ? categoryIds.get(p.category.trim().toLowerCase()) : undefined,
          importExternalImages: true,
        });
        products.push({ name: p.name, id: (res as any)?.id ?? (res as any)?.data?.id });
      } catch (err) {
        products.push({ name: p.name, error: errMsg(err) });
      }
    }

    if (input.categories?.length) result.categories = categories;
    if (input.products?.length) result.products = products;
    return result;
  }

  private createStoreOnly(apiKey: string, input: CreateStoreInput) {
    const clean = <T extends object>(o?: T) =>
      Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== ''));
    return this.request<any>(apiKey, 'POST', MDSTORE_ROUTES.createStore(), {
      store: clean({
        name: input.name,
        subdomain: input.subdomain,
        language: input.language,
        currency: input.currency,
        cart: input.cart,
        // بدون منتجات وتصنيفات تجريبية — المحتوى الحقيقي يُنشأ بعد المتجر
        skipDemoContent: true,
      }),
      // الحقول غير المحددة تُحذف لتأخذ القيم الافتراضية في CreateFullStoreDto
      design: clean(input.design),
      topBar: clean(input.topBar),
      contact: {},
      hero: clean(input.hero),
    });
  }

  // builder-pages تنشئ الصفحة فارغة، ثم تُحفظ شجرتها في طلب ثانٍ.
  async createLandingPage(apiKey: string, input: CreateLandingPageInput) {
    const page = await this.request<{ id: string }>(
      apiKey,
      'POST',
      MDSTORE_ROUTES.createBuilderPage(),
      { name: input.name, storeId: input.storeId, productId: input.productId },
    );
    return this.request(
      apiKey,
      'PUT',
      MDSTORE_ROUTES.updateBuilderPageTree(page.id),
      { tree: input.tree },
    );
  }

  // المفتاح يُمرَّر كما هو في كل طلب، ولا يُخزَّن ولا يُسجَّل.
  private async request<T = unknown>(
    apiKey: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown,
  ): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.request<T>({
          method,
          url,
          data,
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
      return res.data;
    } catch (err) {
      throw new MdstoreApiError(extractApiMessage(err));
    }
  }
}

// يستخرج رسالة md-store-api كما هي. NestJS يرجع `message` إما نصاً أو
// مصفوفة نصوص (أخطاء التحقق).
function extractApiMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)
      ?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
    if (err.response) return `md-store-api: HTTP ${err.response.status}`;
    return `تعذر الاتصال بـ md-store-api: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}
