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

// ===============================
// DISCORD CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ===============================
// MUSIC PLAYER
// ===============================

const player = new Player(client);

// Player error logging
player.on("error", (queue, error) => {
  console.error("❌ PLAYER ERROR:");
  console.error(error);
});

// Queue error logging
player.events.on("error", (queue, error) => {
  console.error("❌ QUEUE ERROR:");
  console.error(error);
});

// ===============================
// SLASH COMMANDS
// ===============================

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
    .setDescription("Stop musik dan keluar voice"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Lihat antrean lagu"),
].map(command => command.toJSON());

// ===============================
// BOT READY
// ===============================

client.once("ready", async () => {
  console.log(`🎵 ${client.user.tag} sudah online!`);

  try {
    await player.extractors.loadMulti(DefaultExtractors);

    console.log("✅ Extractor berhasil dimuat!");

    const rest = new REST({ version: "10" })
      .setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands,
      }
    );

    console.log("✅ Slash commands berhasil didaftarkan!");
  } catch (error) {
    console.error("❌ READY ERROR:");
    console.error(error);
  }
});

// ===============================
// SLASH COMMAND HANDLER
// ===============================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {

    // ===========================
    // /PLAY
    // ===========================

    if (interaction.commandName === "play") {

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply(
          "❌ Kamu harus masuk voice channel dulu!"
        );
      }

      const song = interaction.options.getString(
        "song",
        true
      );

      await interaction.deferReply();

      console.log("🎵 PLAY REQUEST:");
      console.log("Guild:", interaction.guild?.name);
      console.log("Voice:", voiceChannel.name);
      console.log("Song:", song);

      const mainPlayer = useMainPlayer();

      try {

        const result = await mainPlayer.play(
          voiceChannel,
          song,
          {
            nodeOptions: {
              metadata: {
                channel: interaction.channel,
              },

              leaveOnEnd: true,
              leaveOnStop: true,
              leaveOnEmpty: true,

              selfDeaf: true,
            },
          }
        );

        console.log("✅ TRACK BERHASIL DITAMBAHKAN:");
        console.log(result.track.title);

        return interaction.editReply(
          `🎵 **${result.track.title}** masuk ke queue!`
        );

      } catch (error) {

        console.error("❌ PLAY ERROR:");
        console.error(error);

        return interaction.editReply(
          `❌ Gagal memutar lagu.\n\`${error.message}\``
        );
      }
    }

    // ===========================
    // GET QUEUE
    // ===========================

    const queue = useQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply(
        "❌ Tidak ada musik yang sedang diputar."
      );
    }

    // ===========================
    // /SKIP
    // ===========================

    if (interaction.commandName === "skip") {

      if (!queue.currentTrack) {
        return interaction.reply(
          "❌ Tidak ada lagu yang sedang diputar."
        );
      }

      queue.node.skip();

      return interaction.reply(
        "⏭️ Lagu di-skip!"
      );
    }

    // ===========================
    // /PAUSE
    // ===========================

    if (interaction.commandName === "pause") {

      queue.node.setPaused(true);

      return interaction.reply(
        "⏸️ Musik dipause."
      );
    }

    // ===========================
    // /RESUME
    // ===========================

    if (interaction.commandName === "resume") {

      queue.node.setPaused(false);

      return interaction.reply(
        "▶️ Musik dilanjutkan."
      );
    }

    // ===========================
    // /STOP
    // ===========================

    if (interaction.commandName === "stop") {

      queue.delete();

      return interaction.reply(
        "⏹️ Musik dihentikan dan bot keluar voice."
      );
    }

    // ===========================
    // /QUEUE
    // ===========================

    if (interaction.commandName === "queue") {

      const tracks = queue.tracks.toArray();

      if (!queue.currentTrack && tracks.length === 0) {
        return interaction.reply(
          "🎵 Queue kosong."
        );
      }

      let message = "📜 **Music Queue**\n\n";

      if (queue.currentTrack) {
        message +=
          `▶️ Sekarang: **${queue.currentTrack.title}**\n\n`;
      }

      if (tracks.length > 0) {

        const list = tracks
          .slice(0, 10)
          .map(
            (track, index) =>
              `${index + 1}. ${track.title}`
          )
          .join("\n");

        message += list;
      } else {
        message += "Tidak ada lagu berikutnya.";
      }

      return interaction.reply(message);
    }

  } catch (error) {

    console.error("❌ INTERACTION ERROR:");
    console.error(error);

    if (
      interaction.deferred ||
      interaction.replied
    ) {

      await interaction.editReply(
        `❌ Terjadi error:\n\`${error.message}\``
      );

    } else {

      await interaction.reply(
        `❌ Terjadi error:\n\`${error.message}\``
      );
    }
  }
});

// ===============================
// GLOBAL ERROR LOGGING
// ===============================

process.on("unhandledRejection", error => {
  console.error("❌ UNHANDLED REJECTION:");
  console.error(error);
});

process.on("uncaughtException", error => {
  console.error("❌ UNCAUGHT EXCEPTION:");
  console.error(error);
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.DISCORD_TOKEN);
