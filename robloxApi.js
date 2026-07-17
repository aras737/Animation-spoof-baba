const axios = require('axios');

const DETAILS_URL = (id) => `https://economy.roblox.com/v2/assets/${id}/details`;
const DELIVERY_URL = (id) => `https://assetdelivery.roblox.com/v1/asset/?id=${id}`;

// Roblox AssetTypeId -> okunabilir isim (en yaygın olanlar)
const ASSET_TYPE_NAMES = {
  1: 'Image',
  2: 'T-Shirt',
  3: 'Audio',
  4: 'Mesh',
  5: 'Lua',
  8: 'Hat',
  9: 'Place',
  10: 'Model',
  11: 'Shirt',
  12: 'Pants',
  13: 'Decal',
  17: 'Head',
  18: 'Face',
  19: 'Gear',
  24: 'Animation',
  27: 'Torso',
  28: 'RightArm',
  29: 'LeftArm',
  30: 'LeftLeg',
  31: 'RightLeg',
  32: 'Package',
  38: 'MeshPart',
  40: 'FontFace',
  61: 'Animation',
};

// content-type -> dosya uzantısı
const CONTENT_TYPE_EXT = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/bmp': 'bmp',
  'model/x.roblox.rbxm': 'rbxm',
  'application/octet-stream': 'rbxm',
  'text/xml': 'rbxm.xml',
  'application/xml': 'rbxm.xml',
};

/**
 * Asset hakkında meta bilgi çeker (isim, tür, oluşturan vb.)
 * Bu endpoint bazı assetler için 403/404 dönebilir; o durumda null döneriz
 * ve sadece dosyayı indiririz.
 */
async function getAssetDetails(assetId) {
  try {
    const { data } = await axios.get(DETAILS_URL(assetId), {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (SoundDownloaderBot)' },
    });
    return {
      id: assetId,
      name: data.Name || `asset_${assetId}`,
      description: data.Description || '',
      assetTypeId: data.AssetTypeId,
      assetTypeName: ASSET_TYPE_NAMES[data.AssetTypeId] || 'Unknown',
      creatorName: data.Creator?.Name || 'Unknown',
      created: data.Created,
      updated: data.Updated,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Asset dosyasının ham içeriğini indirir.
 * Roblox assetdelivery endpoint'i genelde 302 ile CDN'e yönlendirir,
 * axios bunu otomatik takip eder.
 */
async function downloadAssetBuffer(assetId) {
  const response = await axios.get(DELIVERY_URL(assetId), {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (SoundDownloaderBot)' },
    validateStatus: (status) => status === 200,
  });

  const contentType = (response.headers['content-type'] || '').split(';')[0].trim();
  const ext = CONTENT_TYPE_EXT[contentType] || 'bin';

  return {
    buffer: Buffer.from(response.data),
    contentType,
    ext,
    sizeBytes: response.data.byteLength,
  };
}

module.exports = { getAssetDetails, downloadAssetBuffer };
