const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const {
  Player,
  useMainPlayer,
  useQueue,
} = require("discord-player");

const {
  DefaultExtractors,
} = require("@discord-player/extractor");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const player = new Player(client);

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Putar musik")
    .addStringOption(option =>
      option
        .setName("song")
        .setDescription("Nama lagu atau URL SoundCloud")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip lagu sekarang"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause lagu"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Lanjutkan lagu"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop musik dan kosongkan queue"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Lihat antrean lagu"),
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`🎵 ${client.user.tag} sudah online!`);

  await player.extractors.loadMulti(DefaultExtractors);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("✅ Slash commands berhasil didaftarkan!");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "play") {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply(
          "❌ Kamu harus masuk voice channel dulu!"
        );
      }

      const song = interaction.options.getString("song", true);
      const player = useMainPlayer();

      await interaction.deferReply();

      const result = await player.play(voiceChannel, song, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
          },
        },
      });

      return interaction.editReply(
        `🎵 **${result.track.title}** masuk ke queue!`
      );
    }

    const queue = useQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply("❌ Tidak ada musik yang sedang diputar.");
    }

    if (interaction.commandName === "skip") {
      queue.node.skip();
      return interaction.reply("⏭️ Lagu di-skip!");
    }

    if (interaction.commandName === "pause") {
      queue.node.setPaused(true);
      return interaction.reply("⏸️ Musik dipause.");
    }

    if (interaction.commandName === "resume") {
      queue.node.setPaused(false);
      return interaction.reply("▶️ Musik dilanjutkan.");
    }

    if (interaction.commandName === "stop") {
      queue.delete();
      return interaction.reply("⏹️ Musik dihentikan dan queue dikosongkan.");
    }

    if (interaction.commandName === "queue") {
      const tracks = queue.tracks.toArray();

      if (!tracks.length) {
        return interaction.reply("🎵 Queue kosong.");
      }

      const list = tracks
        .slice(0, 10)
        .map((track, i) => `${i + 1}. ${track.title}`)
        .join("\n");

      return interaction.reply(`📜 **Queue:**\n${list}`);
    }

  } catch (error) {
    console.error(error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "❌ Terjadi error saat menjalankan command."
      );
    } else {
      await interaction.reply(
        "❌ Terjadi error saat menjalankan command."
      );
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
