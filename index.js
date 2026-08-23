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

const ffmpegPath = require("ffmpeg-static");

// ========================================
// CONFIG
// ========================================

const TOKEN = process.env.DISCORD_TOKEN;

// Optional:
// Kalau diisi, command langsung terdaftar di server tersebut.
// Ini lebih cepat daripada global command.
// Railway Variable: GUILD_ID
const GUILD_ID = process.env.GUILD_ID;

// ========================================
// CHECK TOKEN
// ========================================

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN tidak ditemukan!");
  process.exit(1);
}

// ========================================
// FFMPEG CHECK
// ========================================

console.log("================================");
console.log("🎬 FFMPEG CHECK");
console.log("================================");
console.log(`FFmpeg path: ${ffmpegPath}`);

if (ffmpegPath) {
  console.log("✅ FFmpeg tersedia!");
} else {
  console.error("❌ FFmpeg tidak ditemukan!");
}

// ========================================
// DISCORD CLIENT
// ========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ========================================
// DISCORD PLAYER
// ========================================

const player = new Player(client);

// ========================================
// SLASH COMMANDS
// ========================================

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Putar musik dari nama lagu atau URL")
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
    .setDescription("Pause musik"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Lanjutkan musik"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop musik"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Lihat antrean musik"),
].map(command => command.toJSON());

// ========================================
// PLAYER EVENTS
// ========================================

player.events.on("playerStart", (queue, track) => {
  console.log("");
  console.log("▶️ PLAYER START");
  console.log(`🎵 ${track.title}`);
});

player.events.on("playerFinish", (queue, track) => {
  console.log("");
  console.log("⏹️ PLAYER FINISH");
  console.log(`🎵 ${track.title}`);
});

player.events.on("audioTrackAdd", (queue, track) => {
  console.log("");
  console.log("➕ TRACK ADDED");
  console.log(`🎵 ${track.title}`);
});

player.events.on("emptyQueue", queue => {
  console.log("");
  console.log("📭 QUEUE EMPTY");
});

player.events.on("error", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("❌ PLAYER ERROR");
  console.error("================================");
  console.error(error);
});

player.events.on("playerError", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("❌ PLAYER ERROR");
  console.error("================================");
  console.error(error);
});

player.events.on("connectionError", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("❌ VOICE CONNECTION ERROR");
  console.error("================================");
  console.error(error);
});

// ========================================
// DISCORD READY
// ========================================

client.once("clientReady", async () => {
  console.log("");
  console.log("================================");
  console.log(`🎵 ${client.user.tag} ONLINE`);
  console.log("================================");

  try {
    // ------------------------------------
    // LOAD EXTRACTORS
    // ------------------------------------

    await player.extractors.loadMulti(DefaultExtractors);

    console.log("✅ Extractor berhasil dimuat!");

    // ------------------------------------
    // REGISTER SLASH COMMANDS
    // ------------------------------------

    const rest = new REST({
      version: "10",
    }).setToken(TOKEN);

    if (GUILD_ID) {
      console.log(`🔧 Register command ke Guild: ${GUILD_ID}`);

      await rest.put(
        Routes.applicationGuildCommands(
          client.user.id,
          GUILD_ID
        ),
        {
          body: commands,
        }
      );

      console.log("✅ Slash commands registered ke server!");
    } else {
      console.log("🌐 Register global slash commands...");

      await rest.put(
        Routes.applicationCommands(client.user.id),
        {
          body: commands,
        }
      );

      console.log("✅ Global slash commands registered!");
    }

  } catch (error) {
    console.error("");
    console.error("❌ Gagal setup player/commands:");
    console.error(error);
  }
});

// ========================================
// INTERACTION HANDLER
// ========================================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  console.log("");
  console.log("================================");
  console.log("📥 INTERACTION RECEIVED");
  console.log(`Command : /${interaction.commandName}`);
  console.log(`User    : ${interaction.user.tag}`);
  console.log(`Guild   : ${interaction.guild?.name}`);
  console.log("================================");

  try {

    // ====================================
    // ACK DISCORD SECEPAT MUNGKIN
    // ====================================

    await interaction.deferReply();

    console.log("✅ Discord interaction acknowledged!");

    // ====================================
    // PLAY
    // ====================================

    if (interaction.commandName === "play") {

      const voiceChannel =
        interaction.member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.editReply(
          "❌ Kamu harus masuk voice channel dulu!"
        );
      }

      const song =
        interaction.options.getString(
          "song",
          true
        );

      console.log("");
      console.log("================================");
      console.log("🎵 PLAY REQUEST");
      console.log("================================");
      console.log(`Guild: ${interaction.guild?.name}`);
      console.log(`User: ${interaction.user.tag}`);
      console.log(`Voice: ${voiceChannel.name}`);
      console.log(`Voice ID: ${voiceChannel.id}`);
      console.log(`Song: ${song}`);
      console.log("================================");

      const mainPlayer = useMainPlayer();

      console.log("🔊 Memulai player.play()...");

      const result = await mainPlayer.play(
        voiceChannel,
        song,
        {
          nodeOptions: {

            metadata: {
              channel: interaction.channel,
            },

            // ------------------------------
            // QUEUE SETTINGS
            // ------------------------------

            leaveOnEnd: false,

            leaveOnEmpty: true,

            leaveOnEmptyCooldown: 300000,

            leaveOnStop: false,

            // ------------------------------
            // AUDIO
            // ------------------------------

            volume: 100,
          },
        }
      );

      console.log("");
      console.log("================================");
      console.log("✅ PLAY BERHASIL");
      console.log("================================");
      console.log(`🎵 Track: ${result.track.title}`);
      console.log(`🔗 URL: ${result.track.url}`);
      console.log("================================");

      return interaction.editReply(
        `🎵 **${result.track.title}** masuk ke queue!`
      );
    }

    // ====================================
    // GET QUEUE
    // ====================================

    const queue = useQueue(
      interaction.guildId
    );

    if (!queue) {
      return interaction.editReply(
        "❌ Tidak ada musik yang sedang diputar."
      );
    }

    // ====================================
    // SKIP
    // ====================================

    if (interaction.commandName === "skip") {

      if (!queue.currentTrack) {
        return interaction.editReply(
          "❌ Tidak ada lagu yang sedang diputar."
        );
      }

      const title =
        queue.currentTrack.title;

      queue.node.skip();

      return interaction.editReply(
        `⏭️ Skip **${title}**`
      );
    }

    // ====================================
    // PAUSE
    // ====================================

    if (interaction.commandName === "pause") {

      queue.node.setPaused(true);

      return interaction.editReply(
        "⏸️ Musik dipause."
      );
    }

    // ====================================
    // RESUME
    // ====================================

    if (interaction.commandName === "resume") {

      queue.node.setPaused(false);

      return interaction.editReply(
        "▶️ Musik dilanjutkan."
      );
    }

    // ====================================
    // STOP
    // ====================================

    if (interaction.commandName === "stop") {

      queue.delete();

      return interaction.editReply(
        "⏹️ Musik dihentikan dan queue dikosongkan."
      );
    }

    // ====================================
    // QUEUE
    // ====================================

    if (interaction.commandName === "queue") {

      const current =
        queue.currentTrack;

      const tracks =
        queue.tracks.toArray();

      let message = "";

      if (current) {
        message +=
          `▶️ **Sedang diputar:** ${current.title}\n\n`;
      }

      if (!tracks.length) {

        message +=
          "📭 Queue berikutnya kosong.";

      } else {

        const list = tracks
          .slice(0, 10)
          .map(
            (track, index) =>
              `${index + 1}. ${track.title}`
          )
          .join("\n");

        message +=
          `📜 **Queue:**\n${list}`;
      }

      return interaction.editReply(
        message
      );
    }

    // ====================================
    // UNKNOWN COMMAND
    // ====================================

    return interaction.editReply(
      "❌ Command tidak dikenal."
    );

  } catch (error) {

    console.error("");
    console.error("================================");
    console.error("❌ INTERACTION ERROR");
    console.error("================================");
    console.error(error);
    console.error("================================");

    try {

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        await interaction.editReply(
          `❌ Terjadi error:\n\`${error.message || error}\``
        );

      }

    } catch (replyError) {

      console.error(
        "❌ Gagal mengirim pesan error:"
      );

      console.error(replyError);
    }
  }
});

// ========================================
// CLIENT ERRORS
// ========================================

client.on("error", error => {
  console.error("");
  console.error("❌ DISCORD CLIENT ERROR");
  console.error(error);
});

client.on("warn", warning => {
  console.warn("⚠️ DISCORD WARNING");
  console.warn(warning);
});

// ========================================
// LOGIN
// ========================================

console.log("🚀 Starting EnMusic...");

client.login(TOKEN);
