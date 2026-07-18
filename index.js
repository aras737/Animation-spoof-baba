require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  AttachmentBuilder,
  EmbedBuilder,
  REST,
  Routes,
} = require('discord.js');

const { extractAssetIds } = require('./src/detectLinks');
const { getAssetDetails, downloadAssetBuffer } = require('./src/robloxApi');
const { saveAsset, readIndex } = require('./src/archive');
const { startHealthServer } = require('./src/healthServer');
const { commands } = require('./src/commands');

const AUTO_DETECT = (process.env.AUTO_DETECT || 'true').toLowerCase() !== 'false';
const ENABLE_HEALTH_SERVER = (process.env.ENABLE_HEALTH_SERVER || 'true').toLowerCase() !== 'false';
const DISCORD_ATTACHMENT_LIMIT = 8 * 1024 * 1024; // 8MB (boost'suz sunucu limiti)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once('ready', async () => {
  console.log(`✅ Giriş yapıldı: ${client.user.tag}`);
  console.log(`   Otomatik link algılama: ${AUTO_DETECT ? 'AÇIK' : 'KAPALI'}`);

  // Slash komutlarını her başlangıçta otomatik kaydet (shell'e gerek kalmasın)
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const clientId = process.env.CLIENT_ID || client.user.id;
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`🔧 Slash komutları '${guildId}' sunucusuna kaydedildi (anında aktif).`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('🔧 Slash komutları global olarak kaydedildi (yayılması ~1 saat sürebilir).');
    }
  } catch (err) {
    console.error('⚠️ Slash komutları kaydedilemedi:', err.message);
  }

  if (ENABLE_HEALTH_SERVER) {
    startHealthServer(client);
  }
});

/**
 * Ortak indirme + arşivleme mantığı. Hem otomatik algılama hem de
 * /indir slash komutu bunu kullanır.
 */
async function processAssetId(assetId, { requestedBy, guildId, channelId }) {
  const details = await getAssetDetails(assetId);
  const { buffer, ext, sizeBytes, contentType } = await downloadAssetBuffer(assetId);

  const record = saveAsset({
    assetId,
    buffer,
    ext,
    details,
    requestedBy,
    guildId,
    channelId,
  });

  return { record, details, buffer, ext, sizeBytes, contentType };
}

function buildResultEmbed({ assetId, details, record }) {
  const embed = new EmbedBuilder()
    .setTitle(details?.name || `Asset ${assetId}`)
    .setColor(0x5865f2)
    .addFields(
      { name: 'Asset ID', value: String(assetId), inline: true },
      { name: 'Tür', value: details?.assetTypeName || 'Bilinmiyor', inline: true },
      { name: 'Boyut', value: `${(record.sizeBytes / 1024).toFixed(1)} KB`, inline: true },
      { name: 'Oluşturan', value: details?.creatorName || 'Bilinmiyor', inline: true },
      { name: 'Dosya', value: record.fileName, inline: false }
    )
    .setFooter({ text: 'Arşive kaydedildi' })
    .setTimestamp();

  return embed;
}

// ---- Otomatik link algılama ----
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!AUTO_DETECT) return;

  const assetIds = extractAssetIds(message.content);
  if (assetIds.length === 0) return;

  for (const assetId of assetIds) {
    try {
      const processing = await message.reply(`🔎 Asset \`${assetId}\` işleniyor...`);

      const { record, details, buffer, sizeBytes } = await processAssetId(assetId, {
        requestedBy: message.author.tag,
        guildId: message.guildId,
        channelId: message.channelId,
      });

      const embed = buildResultEmbed({ assetId, details, record });
      const files = [];
      if (sizeBytes <= DISCORD_ATTACHMENT_LIMIT) {
        files.push(new AttachmentBuilder(buffer, { name: record.fileName }));
      } else {
        embed.addFields({
          name: '⚠️ Not',
          value: 'Dosya Discord ek boyut limitini aştığı için sadece sunucu diskine kaydedildi.',
        });
      }

      await processing.edit({ content: '✅ İndirme tamamlandı', embeds: [embed], files });
    } catch (err) {
      console.error(`Asset ${assetId} indirilemedi:`, err.message);
      await message.reply(`❌ Asset \`${assetId}\` indirilemedi: ${err.message}`);
    }
  }
});

// ---- Slash komutları ----
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'indir') {
    const input = interaction.options.getString('link', true);
    const ids = extractAssetIds(input);
    const assetId = ids[0] || (/^\d+$/.test(input.trim()) ? input.trim() : null);

    if (!assetId) {
      await interaction.reply({
        content: '❌ Geçerli bir Roblox asset linki veya ID bulamadım.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const { record, details, buffer, sizeBytes } = await processAssetId(assetId, {
        requestedBy: interaction.user.tag,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      const embed = buildResultEmbed({ assetId, details, record });
      const files = [];
      if (sizeBytes <= DISCORD_ATTACHMENT_LIMIT) {
        files.push(new AttachmentBuilder(buffer, { name: record.fileName }));
      } else {
        embed.addFields({
          name: '⚠️ Not',
          value: 'Dosya Discord ek boyut limitini aştığı için sadece sunucu diskine kaydedildi.',
        });
      }

      await interaction.editReply({ embeds: [embed], files });
    } catch (err) {
      console.error(`Asset ${assetId} indirilemedi:`, err.message);
      await interaction.editReply(`❌ İndirme başarısız: ${err.message}`);
    }
  }

  if (interaction.commandName === 'arsiv') {
    const limit = interaction.options.getInteger('adet') || 10;
    const index = readIndex()
      .filter((r) => r.guildId === interaction.guildId)
      .slice(-limit)
      .reverse();

    if (index.length === 0) {
      await interaction.reply({ content: 'Bu sunucuda henüz arşivlenmiş bir asset yok.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Son ${index.length} arşivlenen asset`)
      .setColor(0x57f287)
      .setDescription(
        index
          .map(
            (r, i) =>
              `**${i + 1}.** [${r.assetId}] ${r.name || r.fileName} — ${r.assetType} — İsteyen: ${
                r.requestedBy || 'bilinmiyor'
              }\n_${new Date(r.downloadedAt).toLocaleString('tr-TR')}_`
          )
          .join('\n\n')
      );

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
