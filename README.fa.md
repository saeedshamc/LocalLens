# LocalLens

افزونهٔ خصوصی و آفلاین‌محور کروم (Manifest V3) که با سرور محلی [Ollama](https://ollama.com) صفحه را ترجمه می‌کند، عناصر را بررسی می‌کند و دربارهٔ محتوای صفحه گفتگو می‌کند — همه روی دستگاه خودتان.

**README انگلیسی:** [README.md](./README.md)

## قابلیت‌ها

- **ترجمهٔ کل صفحه** — معنایی، تنبل برای بلوک‌های دیده‌شده، و پایش محتوای پویا
- **انتخابگر عنصر** — شبیه Inspect با ترجمه / توضیح / خلاصه / پرسش در چت / بلندخوانی / ترجمه و بلندخوانی
- **چت پانل کناری** — پاسخ‌های استریم‌شده بر اساس صفحه (با embeddings برای صفحات بلند)؛ ورودی صوتی و خواندن پاسخ اختیاری
- **صدا** — بلندخوانی با TTS سیستم؛ دیکتهٔ گفتگو با تشخیص گفتار مرورگر (نکتهٔ حریم خصوصی را ببینید)
- **تنظیمات و راهنما** — میزبان Ollama، مدل‌ها، پرامپت‌ها، راه‌اندازی `OLLAMA_ORIGINS` برای هر سیستم‌عامل
- **حریم خصوصی** — بدون API ابری، بدون تله‌متری، بدون کد از راه دور

## پیش‌نیازها

- Google Chrome (یا Chromium) با پشتیبانی Manifest V3
- [Ollama](https://ollama.com/download) در حال اجرا روی دستگاه (پیش‌فرض `http://localhost:11434`)
- حداقل یک مدل گفتگو/ترجمه، مثلاً `ollama pull llama3.2`
- برای چت صفحات بلند: مدل embedding، مثلاً `ollama pull bge-m3`

## نصب (توسعه)

```bash
npm install
npm run dev
```

در صورت نیاز افزونه را از `.output/chrome-mv3` به‌صورت unpacked بارگذاری کنید.

### بیلد تولید / زیپ

```bash
npm run build
npm run zip
```

- بیلد unpacked: `.output/chrome-mv3`
- آرشیو zip: خروجی `npm run zip` در `.output/`

سپس در کروم: Extensions → Developer mode → **Load unpacked** → انتخاب `.output/chrome-mv3`.

### فایرفاکس (موقت)

```bash
npm run build:firefox
# یا: npm run zip:firefox
```

1. `about:debugging#/runtime/this-firefox` را باز کنید
2. **Load Temporary Add-on…**
3. فایل `.output/firefox-mv3/manifest.json` را انتخاب کنید

پشتیبانی side panel به نسخهٔ فایرفاکس بستگی دارد؛ در صورت نبودن، از popup و Settings استفاده کنید.

## راه‌اندازی CORS برای Ollama

افزونه‌های کروم از مبدأ `chrome-extension://` به Ollama درخواست می‌زنند. اگر **HTTP 403** دیدید، `OLLAMA_ORIGINS` را طوری تنظیم کنید که شناسهٔ این افزونه را شامل شود.

1. LocalLens را نصب کنید و **Help** را باز کنید (در نصب اول خودکار باز می‌شود).
2. دستور مخصوص سیستم‌عامل خود را کپی کنید (با شناسهٔ واقعی افزونه).
3. Ollama را کامل راه‌اندازی مجدد کنید.
4. در **Settings** روی **Test connection** بزنید.

### مثال سریع ویندوز

```bat
setx OLLAMA_ORIGINS "chrome-extension://YOUR_EXTENSION_ID"
```

سپس Ollama را از tray ببندید و دوباره اجرا کنید.

## استفاده

1. مدل‌ها را در **Settings** تنظیم کنید (با Test connection لیست مدل‌ها را بگیرید).
2. یک صفحهٔ عادی `http(s)` باز کنید (نه `chrome://` و نه فروشگاه کروم).
3. از **popup** برای ترجمه، بازگردانی متن اصلی، یا شروع انتخابگر استفاده کنید.
4. **Side panel** را برای گفتگو دربارهٔ صفحه باز کنید.
5. میانبر: **Alt+Shift+L** انتخابگر را تغییر وضعیت می‌دهد (`chrome://extensions/shortcuts`).

## اسکریپت‌ها

| اسکریپت                | توضیح                         |
|------------------------|-------------------------------|
| `npm run dev`          | حالت توسعه WXT                |
| `npm run build`        | بیلد تولید (کروم)             |
| `npm run build:firefox`| بیلد تولید (فایرفاکس)         |
| `npm run zip`          | بسته‌بندی zip کروم            |
| `npm run zip:firefox`  | بسته‌بندی zip فایرفاکس        |
| `npm run icons`        | بازتولید آیکن‌ها              |
| `npm run lint`         | ESLint                        |
| `npm run typecheck`    | TypeScript                    |
| `npm run test`         | تست‌های Vitest                |

## حریم خصوصی

LocalLens فقط با میزبان Ollama که تنظیم کرده‌اید صحبت می‌کند (پیش‌فرض localhost). متن صفحه و گفتگو روی دستگاه شما می‌ماند. هیچ تحلیلی و هیچ وابستگی شبکه‌ای بیرونی جز همان میزبان وجود ندارد.

سیاست کامل: [docs/PRIVACY.md](./docs/PRIVACY.md). چک‌لیست استور: [docs/STORE.md](./docs/STORE.md).

## مجوز

[MIT](./LICENSE) © ۲۰۲۶ Saeed shamsi
