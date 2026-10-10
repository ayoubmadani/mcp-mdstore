import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MDSTORE_ROUTES } from './mdstore.routes';

// خطأ أرجعته md-store-api — `message` هي رسالتها كما هي بدون تغيير.
export class MdstoreApiError extends Error {}

export interface CreateProductInput {
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
      // مطلوبان في CreateProductDto حتى لمنتج بدون متغيرات.
      attributes: [],
      variantDetails: [],
    });
  }

  // المنصة تجلب المنتج من AliExpress (الاسم، الوصف، الصور، الخصائص) وتنشئه بسعر البيع المعطى
  importAliexpressProduct(apiKey: string, storeId: string, input: ImportProductInput) {
    return this.request(apiKey, 'POST', MDSTORE_ROUTES.importAliexpressProduct(storeId), input);
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
    method: 'GET' | 'POST' | 'PUT',
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
