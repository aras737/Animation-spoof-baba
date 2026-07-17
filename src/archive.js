const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const INDEX_FILE = path.join(DOWNLOAD_DIR, 'archive-index.json');

function ensureDir() {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}

function readIndex() {
  ensureDir();
  if (!fs.existsSync(INDEX_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeIndex(index) {
  ensureDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

/**
 * Dosyayı diske kaydeder ve arşiv index.json'a bir kayıt ekler.
 */
function saveAsset({ assetId, buffer, ext, details, requestedBy, guildId, channelId }) {
  ensureDir();

  const baseName = details?.name ? sanitizeFilename(details.name) : `asset_${assetId}`;
  const fileName = `${assetId}_${baseName}.${ext}`;
  const filePath = path.join(DOWNLOAD_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  const record = {
    assetId,
    fileName,
    filePath,
    sizeBytes: buffer.length,
    assetType: details?.assetTypeName || 'Unknown',
    name: details?.name || null,
    creator: details?.creatorName || null,
    requestedBy,
    guildId,
    channelId,
    downloadedAt: new Date().toISOString(),
  };

  const index = readIndex();
  index.push(record);
  writeIndex(index);

  return record;
}

module.exports = { saveAsset, readIndex, DOWNLOAD_DIR };
