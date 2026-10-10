import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MDSTORE_ROUTES } from './mdstore.routes';

// خطأ أرجعته md-store-api — `message` هي رسالتها كما هي بدون تغيير.
export class MdstoreApiError extends Error {}

export interface CreateProductInput {
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

const defined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export interface CreateStoreInput {
  name: string;
  subdomain: string;
  language?: string;
  currency?: string;
  cart?: boolean;
  design?: { primaryColor?: string; secondaryColor?: string };
  hero?: { imageUrl?: string; title?: string; subtitle?: string };
  topBar?: { enabled?: boolean; text?: string; color?: string };
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

  createProduct(apiKey: string, storeId: string, input: CreateProductInput) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.createProduct(storeId), {
      name: input.name,
      price: input.price,
      stock: input.stock,
      images: input.images,
      desc: input.description,
      categoryId: input.categoryId,
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

  // يسجّل في المنصة أن ذكاءً اصطناعياً (Claude / ChatGPT…) ارتبط بهذا المفتاح
  markConnected(apiKey: string, client: string) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.apiKeyConnection(), { client });
  }

  listStores(apiKey: string) {
    return this.request(apiKey, 'GET', MDSTORE_ROUTES.listStores());
  }

  createStore(apiKey: string, input: CreateStoreInput) {
    const clean = <T extends object>(o?: T) =>
      Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== ''));
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.createStore(), {
      store: clean({
        name: input.name,
        subdomain: input.subdomain,
        language: input.language,
        currency: input.currency,
        cart: input.cart,
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
