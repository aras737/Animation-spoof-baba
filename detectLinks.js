/**
 * Bir mesaj içindeki Roblox asset ID'lerini (ses, model, decal vb.) yakalar.
 * Desteklenen formatlar:
 *  - https://www.roblox.com/library/123456789/Isim
 *  - https://www.roblox.com/asset/?id=123456789
 *  - https://www.roblox.com/catalog/123456789/Isim
 *  - https://create.roblox.com/store/asset/123456789/Isim
 *  - Sadece rakam (örn. !download 123456789 komutunda kullanılır)
 */

const LINK_PATTERNS = [
  /roblox\.com\/library\/(\d+)/gi,
  /roblox\.com\/asset\/\?id=(\d+)/gi,
  /roblox\.com\/catalog\/(\d+)/gi,
  /create\.roblox\.com\/store\/asset\/(\d+)/gi,
  /roblox\.com\/games\/\d+\/[^\s]*[?&]assetId=(\d+)/gi,
];

function extractAssetIds(text) {
  if (!text) return [];

  const ids = new Set();

  for (const pattern of LINK_PATTERNS) {
    // regex nesnelerini her seferinde sıfırla (global flag lastIndex biriktirir)
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      ids.add(match[1]);
    }
  }

  return Array.from(ids);
}

module.exports = { extractAssetIds };
