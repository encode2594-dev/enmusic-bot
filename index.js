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

// Server Gemazzz
const GUILD_ID = "1540915302370377749";

// ========================================
// TOKEN CHECK
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
console.log("FFmpeg path:", ffmpegPath);

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
// PLAYER
// ========================================

const player = new Player(client);

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
    .setDescription("Pause musik"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Lanjutkan musik"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop musik"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Lihat queue"),
].map(command => command.toJSON());

// ========================================
// PLAYER EVENTS
// ========================================

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

player.events.on("emptyQueue", queue => {
  console.log("📭 QUEUE EMPTY");
});

player.events.on("error", (queue, error) => {
  console.error("❌ PLAYER ERROR:");
  console.error(error);
});

player.events.on("playerError", (queue, error) => {
  console.error("❌ PLAYER ERROR:");
  console.error(error);
});

player.events.on("connectionError", (queue, error) => {
  console.error("❌ VOICE CONNECTION ERROR:");
  console.error(error);
});

// ========================================
// READY
// ========================================

client.once("clientReady", async () => {
  console.log("");
  console.log("================================");
  console.log(`🎵 ${client.user.tag} ONLINE`);
  console.log("================================");

  try {
    // Load extractor
    await player.extractors.loadMulti(DefaultExtractors);

    console.log("✅ Extractor berhasil dimuat!");

    // Register commands
    const rest = new REST({
      version: "10",
    }).setToken(TOKEN);

    console.log("");
    console.log("🔧 Registering GUILD slash commands...");
    console.log(`🏠 Guild ID: ${GUILD_ID}`);

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID
      ),
      {
        body: commands,
      }
    );

    console.log("================================");
    console.log("✅ GUILD SLASH COMMANDS REGISTERED!");
    console.log("================================");

  } catch (error) {
    console.error("❌ Setup error:");
    console.error(error);
  }
});

// ========================================
// INTERACTION
// ========================================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log("");
  console.log("================================");
  console.log("📥 INTERACTION RECEIVED");
  console.log(`Command: /${interaction.commandName}`);
  console.log(`User: ${interaction.user.tag}`);
  console.log(`Guild: ${interaction.guild?.name}`);
  console.log("================================");

  try {

    // ACK CEPAT
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

      console.log("🔊 Mencoba connect ke voice...");

      const result = await mainPlayer.play(
        voiceChannel,
        song,
        {
          nodeOptions: {
            metadata: {
              channel: interaction.channel,
            },

            leaveOnEnd: false,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 300000,
            leaveOnStop: false,

            volume: 100,
          },
        }
      );

      console.log("✅ player.play() selesai!");
      console.log("🎵 TRACK:");
      console.log(result.track.title);

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

      let text = "";

      if (current) {
        text +=
          `▶️ **Sedang diputar:** ${current.title}\n\n`;
      }

      if (!tracks.length) {

        text += "📭 Queue berikutnya kosong.";

      } else {

        const list = tracks
          .slice(0, 10)
          .map(
            (track, index) =>
              `${index + 1}. ${track.title}`
          )
          .join("\n");

        text +=
          `📜 **Queue:**\n${list}`;
      }

      return interaction.editReply(text);
    }

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
          `❌ Error:\n\`${error.message || error}\``
        );
      }

    } catch (replyError) {
      console.error(
        "❌ Gagal mengirim error ke Discord:"
      );
      console.error(replyError);
    }
  }
});

// ========================================
// CLIENT ERROR
// ========================================

client.on("error", error => {
  console.error("❌ DISCORD CLIENT ERROR:");
  console.error(error);
});

client.on("warn", warning => {
  console.warn("⚠️ DISCORD WARNING:");
  console.warn(warning);
});

// ========================================
// LOGIN
// ========================================

console.log("🚀 Starting EnMusic...");

client.login(TOKEN);
