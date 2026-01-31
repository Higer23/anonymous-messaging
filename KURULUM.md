# 🚀 Ultra-Premium Anonymes Nachrichtensystem - Kurulum Rehberi

## 📋 İçindekiler
1. [Gereksinimler](#gereksinimler)
2. [Supabase Kurulumu](#supabase-kurulumu)
3. [Vercel Kurulumu](#vercel-kurulumu)
4. [Yerel Geliştirme](#yerel-geliştirme)
5. [Yayına Alma](#yayına-alma)
6. [Sorun Giderme](#sorun-giderme)

---

## 1️⃣ Gereksinimler

### Gerekli Hesaplar:
- ✅ **Supabase Hesabı** (Ücretsiz): https://supabase.com
- ✅ **Vercel Hesabı** (Ücretsiz): https://vercel.com
- ✅ **GitHub Hesabı** (Ücretsiz): https://github.com

### Bilgisayarınızda Olması Gerekenler:
- ✅ **Node.js** (v18 veya üzeri): https://nodejs.org
- ✅ **Git**: https://git-scm.com
- ✅ **Kod Editörü** (VS Code önerilir): https://code.visualstudio.com

---

## 2️⃣ Supabase Kurulumu (Veritabanı)

### Adım 1: Supabase Projesi Oluşturma

1. **Supabase'e Giriş Yapın**
   - https://supabase.com adresine gidin
   - "Start your project" butonuna tıklayın
   - GitHub ile giriş yapın

2. **Yeni Proje Oluşturun**
   - "New Project" butonuna tıklayın
   - Proje bilgilerini girin:
     ```
     Name: anonymous-messaging
     Database Password: [Güçlü bir şifre seçin ve KAYDEDIN!]
     Region: Europe West (Frankfurt) - Almanya'ya en yakın
     Plan: Free
     ```
   - "Create new project" butonuna tıklayın
   - ⏱️ Kurulum 1-2 dakika sürebilir

### Adım 2: Veritabanı Tablosu Oluşturma

1. **SQL Editor'ü Açın**
   - Sol menüden "SQL Editor" seçeneğine tıklayın
   - "New query" butonuna tıklayın

2. **Aşağıdaki SQL Kodunu Yapıştırın ve Çalıştırın:**

```sql
-- Ana mesajlar tablosu
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  character_count INTEGER NOT NULL,
  
  -- Yeni gelişmiş alanlar
  sentiment VARCHAR(20) DEFAULT 'neutral',
  tags TEXT[] DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  is_spam BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  admin_note TEXT,
  ip_hash VARCHAR(64),
  
  -- Metadata
  battery_level INTEGER,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  city VARCHAR(100),
  country VARCHAR(100),
  timezone VARCHAR(50),
  screen_resolution VARCHAR(20),
  language VARCHAR(10)
);

-- Performans için indeksler
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_spam ON messages(is_spam);
CREATE INDEX idx_messages_is_archived ON messages(is_archived);
CREATE INDEX idx_messages_is_starred ON messages(is_starred);
CREATE INDEX idx_messages_sentiment ON messages(sentiment);

-- Row Level Security (RLS) aktif et
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Herkese okuma izni ver
CREATE POLICY "Public read access" ON messages
  FOR SELECT USING (true);

-- Herkese yazma izni ver
CREATE POLICY "Public insert access" ON messages
  FOR INSERT WITH CHECK (true);

-- Admin tablosu (IP yasaklama için)
CREATE TABLE blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL UNIQUE,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);

CREATE INDEX idx_blocked_ips_hash ON blocked_ips(ip_hash);

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read blocked_ips" ON blocked_ips
  FOR SELECT USING (true);
```

3. **"RUN" Butonuna Basın** (Ctrl+Enter)
4. ✅ "Success. No rows returned" mesajını görmelisiniz

### Adım 3: API Anahtarlarını Kopyalama

1. **Settings > API** sayfasına gidin
2. Aşağıdaki bilgileri kopyalayıp bir yere kaydedin:

```
Project URL: https://xxxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **ÖNEMLİ**: Bu anahtarları güvenli bir yerde saklayın! Vercel kurulumunda kullanacaksınız.

---

## 3️⃣ Vercel Kurulumu (Hosting)

### Adım 1: Projeyi GitHub'a Yükleme

1. **GitHub'da Yeni Repo Oluşturun**
   - https://github.com/new adresine gidin
   - Repository name: `anonymous-messaging`
   - Public seçeneğini seçin
   - "Create repository" butonuna tıklayın

2. **Bilgisayarınızda Terminal Açın**
   - Windows: `cmd` veya `PowerShell`
   - Mac/Linux: `Terminal`

3. **Proje Klasörünü Oluşturun ve Dosyaları Yerleştirin**

```bash
# Masaüstünde klasör oluştur
cd Desktop
mkdir anonymous-messaging
cd anonymous-messaging

# Git'i başlat
git init

# Dosyaları ekle (bu rehberdeki tüm dosyaları bu klasöre kopyalayın)
# index.html, mesajlar.html, package.json, vercel.json
# ve api/ klasörü içindeki tüm dosyalar

# Git'e ekle
git add .
git commit -m "Initial commit: Ultra-premium messaging system"

# GitHub'a bağlan (KENDI KULLANICI ADıNıZı YAZIN)
git remote add origin https://github.com/KULLANICI_ADINIZ/anonymous-messaging.git
git branch -M main
git push -u origin main
```

### Adım 2: Vercel'e Deploy Etme

1. **Vercel'e Giriş Yapın**
   - https://vercel.com adresine gidin
   - "Sign Up" butonuna tıklayın
   - GitHub ile giriş yapın

2. **Yeni Proje Oluşturun**
   - "Add New..." > "Project" seçeneğine tıklayın
   - GitHub repo'nuzu seçin: `anonymous-messaging`
   - "Import" butonuna tıklayın

3. **Environment Variables Ekleyin**
   - "Environment Variables" bölümünü açın
   - Aşağıdaki değişkenleri ekleyin:

```
Name: SUPABASE_URL
Value: [Supabase'den kopyaladığınız Project URL]

Name: SUPABASE_KEY
Value: [Supabase'den kopyaladığınız anon public key]
```

4. **Deploy Edin**
   - "Deploy" butonuna tıklayın
   - ⏱️ Deploy işlemi 1-2 dakika sürer
   - ✅ "Congratulations!" mesajını görünce hazırsınız!

5. **Sitenizi Ziyaret Edin**
   - Vercel size otomatik bir URL verecek: `https://anonymous-messaging.vercel.app`
   - Bu linke tıklayarak sitenizi açabilirsiniz!

---

## 4️⃣ Yerel Geliştirme (Opsiyonel)

Sitenizde değişiklik yapmak istiyorsanız:

### Adım 1: Vercel CLI Kurulumu

```bash
npm install -g vercel
```

### Adım 2: Projeyi Yerel Olarak Çalıştırma

```bash
# Proje klasörüne gidin
cd anonymous-messaging

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
vercel dev
```

### Adım 3: Tarayıcıda Açın

- http://localhost:3000 adresine gidin
- Değişikliklerinizi yapın
- Sayfa otomatik olarak yenilenecek

### Adım 4: Değişiklikleri Yayınlama

```bash
# Değişiklikleri kaydet
git add .
git commit -m "Değişiklik açıklaması"
git push

# Vercel otomatik olarak yeni versiyonu yayınlayacak!
```

---

## 5️⃣ Admin Panel Erişimi

### Admin Şifresi

Varsayılan admin şifresi: `19105887638`

⚠️ **GÜVENLİK**: Şifreyi mutlaka değiştirin!

### Şifreyi Değiştirme:

1. `api/messages.js` dosyasını açın
2. Satır 3'teki şifreyi değiştirin:
```javascript
const ADMIN_PASSWORD = 'YENİ_ŞİFRENİZ';
```
3. Dosyayı kaydedin ve GitHub'a pushlayın

### Admin Panel'e Erişim:

```
https://SITENIZ.vercel.app/mesajlar
```

---

## 6️⃣ Özellik Açıklamaları

### Ana Sayfa (index.html) Özellikleri:
- ✅ Almanca arayüz
- ✅ Mobil optimize
- ✅ Karanlık premium tema
- ✅ Sesli mesaj (Speech-to-Text)
- ✅ Örnek sorular butonu
- ✅ Haptik feedback (titreşim)
- ✅ Rate limiting (30 saniye bekleme)
- ✅ Karakter sayacı (5-300 karakter)
- ✅ Spam filtresi
- ✅ Cihaz bilgisi toplama

### Admin Panel (mesajlar.html) Özellikleri:
- ✅ Şifreli giriş
- ✅ İstatistik dashboard
- ✅ Tüm mesajları görüntüleme
- ✅ Mesajları resim olarak indirme
- ✅ Story modu (metadata gizleme)
- ✅ Mesaj filtreleme
- ✅ Bulk işlemler
- ✅ IP banlama
- ✅ Sentiment analizi

---

## 7️⃣ Sorun Giderme

### Mesajlar Gönderilmiyor

**Sebep**: Supabase anahtarları yanlış

**Çözüm**:
1. Vercel Dashboard > Settings > Environment Variables
2. `SUPABASE_URL` ve `SUPABASE_KEY` değerlerini kontrol edin
3. Yanlışsa düzeltin ve "Redeploy" butonuna basın

### Admin Panel'e Girilemyor

**Sebep**: Şifre yanlış

**Çözüm**:
1. `api/messages.js` dosyasında şifrenizi kontrol edin
2. Varsayılan şifre: `19105887638`

### API Hataları

**Sebep**: Supabase RLS (Row Level Security) ayarları

**Çözüm**:
1. Supabase SQL Editor'ü açın
2. Yukarıdaki SQL kodunu tekrar çalıştırın
3. "Success" mesajını görene kadar bekleyin

### Vercel Build Hatası

**Sebep**: `package.json` eksik

**Çözüm**:
1. Proje klasöründe `package.json` dosyasının olduğundan emin olun
2. `npm install` komutunu çalıştırın
3. `git add . && git commit -m "Fix" && git push`

---

## 8️⃣ Güvenlik Tavsiyeleri

### ✅ Yapmanız Gerekenler:

1. **Admin Şifresini Değiştirin**
   ```javascript
   // api/messages.js içinde
   const ADMIN_PASSWORD = 'çok-güçlü-şifre-123!@#';
   ```

2. **Rate Limiting'i Ayarlayın**
   ```javascript
   // api/send.js içinde (satır 89)
   if (clientData && (now - clientData.lastRequest < 30000)) {
   // 30000 = 30 saniye. İstediğiniz değere değiştirebilirsiniz
   ```

3. **Profanity Filter'ı Genişletin**
   ```javascript
   // api/send.js içinde (satır 8)
   const profanityList = ['kelime1', 'kelime2', 'kelime3'];
   ```

### ⚠️ Yapmamanız Gerekenler:

- ❌ Admin şifresini paylaşmayın
- ❌ Supabase anahtarlarını public repo'da paylaşmayın
- ❌ Rate limiting'i devre dışı bırakmayın

---

## 9️⃣ Domain Bağlama (Opsiyonel)

Kendi domain'inizi kullanmak için:

1. **Vercel Dashboard** > Projeniz > "Settings" > "Domains"
2. "Add" butonuna tıklayın
3. Domain'inizi girin (örn: `mesajlar.com`)
4. DNS ayarlarını yapın (Vercel size gösterecek)
5. ✅ 24 saat içinde aktif olacak

---

## 🎉 Tebrikler!

Sisteminiz artık hazır! 

**Ana Sayfa**: `https://SITENIZ.vercel.app`  
**Admin Panel**: `https://SITENIZ.vercel.app/mesajlar`

### Destek

Sorun yaşarsanız:
1. Vercel logs'u kontrol edin: Dashboard > Deployments > Logs
2. Supabase logs'u kontrol edin: Dashboard > Logs
3. Browser console'u açın: F12 tuşuna basın

---

## 📚 Ek Kaynaklar

- Vercel Dokümantasyon: https://vercel.com/docs
- Supabase Dokümantasyon: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Chart.js: https://www.chartjs.org/docs

---

**Hazırlayan**: Claude (Anthropic)  
**Versiyon**: 2.0 Ultra-Premium  
**Son Güncelleme**: 2026  
