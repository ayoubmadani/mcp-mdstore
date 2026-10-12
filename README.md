# mcp-mdstore

خادم MCP يربط Claude بمنصة MdStore عبر واجهة `md-store-api`.

يعمل بنقل **Streamable HTTP بدون جلسات**: كل طلب على `POST /mcp` يُنشئ خادم MCP جديداً، ويُغلقه عند انتهاء الطلب.

## الأدوات

| الأداة | الوظيفة |
|---|---|
| `create_product` | إنشاء منتج: معرّف المتجر، الاسم، السعر، المخزون، الصور، الوصف، الإضافات (مثل: دجاج إضافي +300) |
| `list_stores` | عرض متاجر المستخدم |
| `create_store` | إنشاء متجر جاهز بالثيم الأقرب لنشاطه: الاسم، الدومين، صورة هيرو، الألوان، الهيرو، الشريط العلوي، اللغة والعملة — بدون محتوى تجريبي، مع تصنيفات ومنتجات حقيقية خاصة بالنشاط يكتبها Claude وصورها من الإنترنت (تُحفظ في تخزين المنصة) |
| `create_landing_page` | إنشاء صفحة هبوط من أقسام `hero` و`productGrid` و`text` و`footer` |
| `import_product_from_link` | إنشاء منتج من رابط AliExpress: المنصة تجلب الاسم والوصف والصور والخصائص، وسعر البيع يحدده المستخدم |
| `list_products` | عرض منتجات متجر (الاسم، السعر، المخزون، الحالة) |
| `update_product` | تعديل منتج: الاسم، السعر، السعر قبل التخفيض، المخزون، الوصف، الظهور، الصور، الإضافات |
| `delete_product` | حذف منتج (قابل للاسترجاع) |
| `get_store` | عرض إعدادات متجر |
| `update_store` | تعديل متجر: الاسم، اللغة، الألوان، الهيرو (صورة/عنوان/وصف)، الشريط العلوي، التواصل |
| `list_landing_pages` | عرض صفحات الهبوط في متجر |
| `list_categories` | عرض تصنيفات متجر (مع الفرعية) |
| `create_category` | إنشاء تصنيف (أو تصنيف فرعي بـ parentId) |
| `update_category` | تعديل تصنيف: الاسم، الوصف، الصورة، الأب، الظهور |
| `delete_category` | حذف تصنيف مع فروعه (قابل للاسترجاع) |
| `list_available_themes` | الثيمات المتاحة للمستخدم بدون دفع: المشتراة + ضمن خطته، لاختيار الأقرب لنشاط المتجر |
| `browse_theme_catalog` | تصفح كل ثيمات المعرض (مع السعر وهل هي متاحة للمستخدم) لاقتراح ثيمات تناسب نشاط المتجر |
| `apply_theme` | تغيير ثيم متجر إلى ثيم متاح (لا يشتري ثيمات) |
| `list_domains` | عرض دومينات متجر وحالتها، مع حدّ الخطة والعدد المستعمل |
| `add_domain` | ربط دومين فرعي (xxx.mdstore.top، فوري) أو خارجي (يُرجع سجلات DNS)، اختيارياً لصفحة هبوط واحدة |
| `check_domain_status` | فحص ربط دومين خارجي (DNS والتحقق) وتحديث حالته |
| `delete_domain` | حذف دومين نهائياً |
| `assign_domain_to_landing_page` | تخصيص دومين لصفحة هبوط واحدة |
| `unassign_domain_from_landing_page` | إعادة الدومين ليعرض المتجر كاملاً |
| `list_shipping_profiles` | عرض حسابات الشحن (لكل حساب أسعاره وولاياته) والمتاجر التي تستعمل كل حساب |
| `create_shipping_profile` | إنشاء حساب شحن باسم، يبدأ بنسخة من أسعار حساب موجود |
| `set_store_shipping_profile` | اختيار حساب الشحن الذي يستعمله متجر (أو الرجوع للافتراضي) |
| `get_shipping_prices` | عرض أسعار التوصيل لكل ولاية في حساب شحن |
| `update_shipping_prices` | تعديل أسعار التوصيل وتفعيل/تعطيل الولايات في حساب شحن |
| `generate_product_images` | توليد صور منتج احترافية بالذكاء الاصطناعي (Higgsfield) من صورته الأصلية، تُحفظ وتُضاف للمنتج |

## أدوات مدير المنصة (مفتاح mdsa_)

مفتاح خاص بالأدمن يُنشأ من لوحة الأدمن ← الإعدادات ← «مفاتيح MCP للأدمن». مع هذا المفتاح تظهر **أدوات الأدمن فقط**، ومفتاح التاجر (`mdk_`) لا يراها أبداً.

| الأداة | الوظيفة |
|---|---|
| `admin_list_theme_types` | أنواع الثيمات (لاختيار typeId)، مع تمييز الأنواع المخفية عن التجار |
| `admin_create_theme_type` | إنشاء نوع ثيم جديد (مثل Food & Restaurants) |
| `admin_create_theme` | إنشاء سجل ثيم: Claude يصنع الأسماء والأوصاف (3 لغات) والـ slug والوسوم والصورة من فكرة القالب (غير مفعّل حتى يُرفع ملفه) |

كل عملية تعديل تطلب **PIN جديداً**: الاستدعاء الأول يرجع أسماء الرموز (مثل `ZZMMHH`)، يعطي المدير الرقم لـ Claude، ثم يُعاد الاستدعاء مع `pin` و`challenge_token`. التحدّي صالح 5 دقائق ولعملية واحدة، و5 أخطاء تقفل 15 دقيقة.

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
