# PWA Icon Generation

## SVGからPNGアイコンを生成する手順

1. **SVGファイルの編集**
   - `public/icon.svg` を編集してアイコンデザインを変更

2. **アイコン生成HTMLファイルの作成**
   ```bash
   npm run generate-icons
   ```

3. **PNGアイコンの生成**
   - ブラウザで `public/generate-icon-192.html` を開く → `icon-192.png` がダウンロードされる
   - ブラウザで `public/generate-icon-512.html` を開く → `icon-512.png` がダウンロードされる

4. **生成されたPNGファイルを配置**
   - ダウンロードされた `icon-192.png` と `icon-512.png` を `public/` フォルダに配置

## ファイル構成

```
public/
├── icon.svg                    # 元となるSVGアイコン
├── generate-icon-192.html      # 192x192 PNG生成用HTML
├── generate-icon-512.html      # 512x512 PNG生成用HTML
├── icon-192.png               # 生成されたPWAアイコン (192x192)
├── icon-512.png               # 生成されたPWAアイコン (512x512)
├── manifest.json              # PWAマニフェスト
└── sw.js                      # Service Worker

scripts/
└── generate-icons.js          # アイコン生成スクリプト
```

## PWA対応完了項目

- ✅ PWAマニフェスト (`manifest.json`)
- ✅ Service Worker (`sw.js`) 
- ✅ HTMLメタタグ設定
- ✅ アイコン生成ワークフロー
- ⏳ アイコンファイル生成（手動実行が必要）