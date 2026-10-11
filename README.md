# mcp-mdstore

خادم MCP يربط Claude بمنصة MdStore عبر واجهة `md-store-api`.

يعمل بنقل **Streamable HTTP بدون جلسات**: كل طلب على `POST /mcp` يُنشئ خادم MCP جديداً، ويُغلقه عند انتهاء الطلب.

## الأدوات

| الأداة | الوظيفة |
|---|---|
| `create_product` | إنشاء منتج: معرّف المتجر، الاسم، السعر، المخزون، الصور، الوصف |
| `list_stores` | عرض متاجر المستخدم |
| `create_store` | إنشاء متجر جاهز: الاسم، الدومين، صورة هيرو يختارها Claude من الإنترنت (تُحفظ في تخزين المنصة)، الألوان، عنوان ووصف الهيرو، الشريط العلوي، اللغة والعملة |
| `create_landing_page` | إنشاء صفحة هبوط من أقسام `hero` و`productGrid` و`text` و`footer` |
| `import_product_from_link` | إنشاء منتج من رابط AliExpress: المنصة تجلب الاسم والوصف والصور والخصائص، وسعر البيع يحدده المستخدم |
| `list_products` | عرض منتجات متجر (الاسم، السعر، المخزون، الحالة) |
| `update_product` | تعديل منتج: الاسم، السعر، السعر قبل التخفيض، المخزون، الوصف، الظهور، الصور |
| `delete_product` | حذف منتج (قابل للاسترجاع) |
| `get_store` | عرض إعدادات متجر |
| `update_store` | تعديل متجر: الاسم، اللغة، الألوان، الهيرو (صورة/عنوان/وصف)، الشريط العلوي، التواصل |
| `list_landing_pages` | عرض صفحات الهبوط في متجر |
| `list_categories` | عرض تصنيفات متجر (مع الفرعية) |
| `create_category` | إنشاء تصنيف (أو تصنيف فرعي بـ parentId) |
| `update_category` | تعديل تصنيف: الاسم، الوصف، الصورة، الأب، الظهور |
| `delete_category` | حذف تصنيف مع فروعه (قابل للاسترجاع) |
| `list_domains` | عرض دومينات متجر وحالتها |
| `add_domain` | ربط دومين فرعي (xxx.mdstore.top، فوري) أو خارجي (يُرجع سجلات DNS)، اختيارياً لصفحة هبوط واحدة |
| `check_domain_status` | فحص ربط دومين خارجي (DNS والتحقق) وتحديث حالته |
| `delete_domain` | حذف دومين نهائياً |
| `assign_domain_to_landing_page` | تخصيص دومين لصفحة هبوط واحدة |
| `unassign_domain_from_landing_page` | إعادة الدومين ليعرض المتجر كاملاً |
| `generate_product_images` | توليد صور منتج احترافية بالذكاء الاصطناعي (Higgsfield) من صورته الأصلية، تُحفظ وتُضاف للمنتج |

## المصادقة

- يولّد المستخدم مفتاح API من لوحة تحكم MdStore، ويضعه في إعدادات الربط في Claude.
- يُرسَل المفتاح في الترويسة `Authorization: Bearer <المفتاح>`. إذا غابت الترويسة يرجع الخادم `401`.
- لا يخزّن المشروع المفتاح ولا يسجّله، بل يمرّره كما هو إلى `md-store-api`.
- أي خطأ ترجعه `md-store-api` (مفتاح غير صالح، بلوغ حد الخطة...) يصل إلى المستخدم برسالته كما هي.

## التشغيل المحلي

المتطلبات: Node.js 22 أو أحدث، و pnpm، و `md-store-api` تعمل.

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

متغيرات البيئة في `.env`:

| المتغير | الوصف |
|---|---|
| `MDSTORE_API_BASE_URL` | رابط `md-store-api`، مثلاً `http://localhost:7000` |
| `PORT` | منفذ هذا الخادم، الافتراضي `3000` |

يعمل الخادم على `http://localhost:3000/mcp`.

مسارات `md-store-api` المستعملة كلها في ملف واحد: `src/mdstore/mdstore.routes.ts`. عدّلها هناك لتطابق مساراتك.

## التجربة بأداة MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

في الصفحة التي تفتح في المتصفح:

1. **Transport Type:** اختر `Streamable HTTP`.
2. **URL:** `http://localhost:3000/mcp`
3. افتح **Authentication**، وأضف ترويسة اسمها `Authorization` وقيمتها `Bearer <المفتاح>`.
4. اضغط **Connect**، ثم **Tools ← List Tools**، واختر أداة لتجربتها.

أو من سطر الأوامر مباشرة:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:3000/mcp \
  --transport http \
  --header "Authorization: Bearer <المفتاح>" \
  --method tools/list
```

## الإضافة إلى Claude Code

```bash
claude mcp add --transport http mdstore <الرابط>/mcp --header "Authorization: Bearer <المفتاح>"
```

مثال محلي:

```bash
claude mcp add --transport http mdstore http://localhost:3000/mcp --header "Authorization: Bearer <المفتاح>"
```
