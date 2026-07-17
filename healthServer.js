const express = require('express');

/**
 * Render'ın Free Web Service katmanı ayakta kalmak için bir portun
 * dinlendiğini görmek ister. Bu sunucu sadece "bot yaşıyor mu" bilgisi
 * döner; botun asıl işiyle (indirme/arşivleme) ilgisi yoktur.
 *
 * Background Worker kullanıyorsan bu sunucuya ihtiyacın yok — .env'de
 * ENABLE_HEALTH_SERVER=false yaparak kapatabilirsin.
 */
function startHealthServer(client) {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      bot: client.user ? client.user.tag : 'starting...',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.listen(port, () => {
    console.log(`🌐 Health-check sunucusu ${port} portunda dinliyor`);
  });
}

module.exports = { startHealthServer };
