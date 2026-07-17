require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('indir')
    .setDescription('Bir Roblox asset linkini veya ID\'sini indirir ve arşivler')
    .addStringOption((opt) =>
      opt
        .setName('link')
        .setDescription('Roblox asset linki veya sayısal ID')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('arsiv')
    .setDescription('Bu sunucuda daha önce indirilen son asetleri listeler')
    .addIntegerOption((opt) =>
      opt.setName('adet').setDescription('Kaç kayıt gösterilsin (varsayılan 10)')
    ),
]
  .map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`Slash komutları '${guildId}' sunucusuna kaydedildi (anında aktif).`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Slash komutları global olarak kaydedildi (yayılması ~1 saat sürebilir).');
    }
  } catch (err) {
    console.error('Komut kaydı başarısız:', err);
  }
})();
