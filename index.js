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

// ========================================
// DEBUG
// ========================================

player.events.on("debug", (queue, message) => {
  console.log("🐛 PLAYER DEBUG:");
  console.log(message);
});

player.events.on("audioTrackAdd", (queue, track) => {
  console.log("➕ TRACK ADDED:");
  console.log(track.title);
});

player.events.on("playerStart", (queue, track) => {
  console.log("▶️ PLAYER START:");
  console.log(track.title);
});

player.events.on("playerFinish", (queue, track) => {
  console.log("⏹️ PLAYER FINISH:");
  console.log(track.title);
});

player.events.on("emptyQueue", () => {
  console.log("📭 QUEUE EMPTY");
});

player.events.on("playerError", (queue, error) => {
  console.error("❌ PLAYER ERROR:");
  console.error(error);
});

player.events.on("error", (queue, error) => {
  console.error("❌ QUEUE ERROR:");
  console.error(error);
});

player.events.on("connectionError", (queue, error) => {
  console.error("🔌 CONNECTION ERROR:");
  console.error(error);
});

// ========================================
// COMMANDS
// ========================================

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
    .setDescription("Skip lagu"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause lagu"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Lanjutkan lagu"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop musik"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Lihat queue"),
].map(command => command.toJSON());

// ========================================
// READY
// ========================================

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

// ========================================
// INTERACTION
// ========================================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {

    // ====================================
    // PLAY
    // ====================================

    if (interaction.commandName === "play") {

      const voiceChannel =
        interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply(
          "❌ Kamu harus masuk voice channel dulu!"
        );
      }

      const song =
        interaction.options.getString("song", true);

      await interaction.deferReply();

      console.log("");
      console.log("================================");
      console.log("🎵 PLAY REQUEST");
      console.log("================================");
      console.log("Guild:", interaction.guild?.name);
      console.log("User:", interaction.user.tag);
      console.log("Voice:", voiceChannel.name);
      console.log("Voice ID:", voiceChannel.id);
      console.log("Song:", song);
      console.log("🔊 Mencoba connect ke voice...");

      const mainPlayer = useMainPlayer();

      const result = await mainPlayer.play(
        voiceChannel,
        song,
        {
          nodeOptions: {
            metadata: {
              channel: interaction.channel,
            },

            leaveOnEnd: false,
            leaveOnStop: false,
            leaveOnEmpty: false,

            bufferingTimeout: 15000,

            selfDeaf: true,

            skipOnNoStream: false,
          },
        }
      );

      console.log("✅ player.play() selesai!");

      if (!result?.track) {
        return interaction.editReply(
          "❌ Track tidak ditemukan."
        );
      }

      console.log("🎵 TRACK:");
      console.log(result.track.title);

      console.log("🔗 URL:");
      console.log(result.track.url);

      return interaction.editReply(
        `🎵 **${result.track.title}** masuk ke queue!`
      );
    }

    // ====================================
    // QUEUE
    // ====================================

    const queue =
      useQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply(
        "❌ Tidak ada musik yang sedang diputar."
      );
    }

    // ====================================
    // SKIP
    // ====================================

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

    // ====================================
    // PAUSE
    // ====================================

    if (interaction.commandName === "pause") {

      queue.node.setPaused(true);

      return interaction.reply(
        "⏸️ Musik dipause."
      );
    }

    // ====================================
    // RESUME
    // ====================================

    if (interaction.commandName === "resume") {

      queue.node.setPaused(false);

      return interaction.reply(
        "▶️ Musik dilanjutkan."
      );
    }

    // ====================================
    // STOP
    // ====================================

    if (interaction.commandName === "stop") {

      queue.delete();

      return interaction.reply(
        "⏹️ Musik dihentikan dan queue dikosongkan."
      );
    }

    // ====================================
    // QUEUE
    // ====================================

    if (interaction.commandName === "queue") {

      const tracks =
        queue.tracks.toArray();

      if (!tracks.length) {
        return interaction.reply(
          "📭 Queue kosong."
        );
      }

      const list = tracks
        .slice(0, 10)
        .map(
          (track, index) =>
            `${index + 1}. ${track.title}`
        )
        .join("\n");

      return interaction.reply(
        `📜 **Queue:**\n${list}`
      );
    }

  } catch (error) {

    console.error("");
    console.error("================================");
    console.error("❌ INTERACTION ERROR");
    console.error("================================");
    console.error(error);
    console.error("================================");

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

// ========================================
// GLOBAL ERROR
// ========================================

process.on("unhandledRejection", error => {
  console.error("❌ UNHANDLED REJECTION:");
  console.error(error);
});

process.on("uncaughtException", error => {
  console.error("❌ UNCAUGHT EXCEPTION:");
  console.error(error);
});

// ========================================
// LOGIN
// ========================================

client.login(process.env.DISCORD_TOKEN);
