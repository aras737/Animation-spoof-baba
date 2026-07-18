const { SlashCommandBuilder } = require('discord.js');

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
].map((c) => c.toJSON());

module.exports = { commands };
