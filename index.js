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

const { FFmpeg } = require("@discord-player/ffmpeg");

const ffmpegPath = require("ffmpeg-static");

// ========================================
// CONFIG
// ========================================

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = "1540915302370377749";

// ========================================
// CHECK TOKEN
// ========================================

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN tidak ditemukan!");
  process.exit(1);
}

// ========================================
// FFMPEG
// ========================================

console.log("================================");
console.log("🎬 FFMPEG CHECK");
console.log("================================");

console.log("FFmpeg path:", ffmpegPath);

if (!ffmpegPath) {
  console.error("❌ FFmpeg tidak ditemukan!");
  process.exit(1);
}

console.log("✅ FFmpeg tersedia!");

// ========================================
// CLIENT
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
// EVENTS
// ========================================

player.events.on("audioTrackAdd", (queue, track) => {
  console.log("➕ TRACK ADDED");
  console.log(track.title);
});

player.events.on("playerStart", (queue, track) => {
  console.log("");
  console.log("================================");
  console.log("▶️ PLAYER START");
  console.log(track.title);
  console.log("================================");
});

player.events.on("playerFinish", (queue, track) => {
  console.log("");
  console.log("================================");
  console.log("⏹️ PLAYER FINISH");
  console.log(track.title);
  console.log("================================");
});

player.events.on("emptyQueue", queue => {
  console.log("📭 QUEUE EMPTY");
});

player.events.on("error", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("❌ QUEUE ERROR");
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
  console.error("❌ CONNECTION ERROR");
  console.error("================================");
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

    // ====================================
    // LOAD EXTRACTORS
    // ====================================

    await player.extractors.loadMulti(
      DefaultExtractors
    );

    console.log("✅ Extractor berhasil dimuat!");

    // ====================================
    // FFMPEG
    // ====================================

    console.log("🎬 Initializing FFmpeg...");

    // Set FFmpeg path
    process.env.FFMPEG_PATH = ffmpegPath;

    console.log("FFMPEG_PATH:", process.env.FFMPEG_PATH);
    console.log("✅ FFmpeg pipeline siap!");

    // ====================================
    // REGISTER COMMANDS
    // ====================================

    const rest = new REST({
      version: "10",
    }).setToken(TOKEN);

    console.log("");
    console.log("🔧 Registering GUILD commands...");
    console.log(`Guild: ${GUILD_ID}`);

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
    console.log("✅ GUILD COMMANDS REGISTERED");
    console.log("================================");

  } catch (error) {
    console.error("❌ SETUP ERROR:");
    console.error(error);
  }
});

// ========================================
// INTERACTION
// ========================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) {
    return;
  }

  console.log("");
  console.log("================================");
  console.log("📥 INTERACTION RECEIVED");
  console.log(`Command: /${interaction.commandName}`);
  console.log(`User: ${interaction.user.tag}`);
  console.log(`Guild: ${interaction.guild?.name}`);
  console.log("================================");

  try {

    await interaction.deferReply();

    console.log("✅ Discord interaction acknowledged!");

    // ==================================
    // PLAY
    // ==================================

    if (interaction.commandName === "play") {

      const voiceChannel =
        interaction.member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.editReply(
          "❌ Masuk voice channel dulu!"
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
      console.log(`Guild: ${interaction.guild.name}`);
      console.log(`User: ${interaction.user.tag}`);
      console.log(`Voice: ${voiceChannel.name}`);
      console.log(`Voice ID: ${voiceChannel.id}`);
      console.log(`Song: ${song}`);
      console.log("================================");

      const mainPlayer = useMainPlayer();

      console.log("🔊 Connecting to voice...");

      const result = await mainPlayer.play(
        voiceChannel,
        song,
        {
          nodeOptions: {

            metadata: {
              channel: interaction.channel,
            },

            leaveOnEnd: false,
            leaveOnEmpty: false,
            leaveOnStop: false,

            volume: 100,
          },

          // Paksa proses audio melalui FFmpeg
          ffmpeg: {
            executable: ffmpegPath,
          },
        }
      );

      console.log("");
      console.log("================================");
      console.log("✅ PLAYER PLAY RESOLVED");
      console.log("================================");

      console.log("🎵 Track:", result.track.title);
      console.log("🔗 URL:", result.track.url);

      return interaction.editReply(
        `🎵 **${result.track.title}** sedang diputar!`
      );
    }

    // ==================================
    // QUEUE
    // ==================================

    const queue =
      useQueue(interaction.guildId);

    if (!queue) {
      return interaction.editReply(
        "❌ Tidak ada musik."
      );
    }

    // ==================================
    // SKIP
    // ==================================

    if (interaction.commandName === "skip") {

      if (!queue.currentTrack) {
        return interaction.editReply(
          "❌ Tidak ada lagu."
        );
      }

      queue.node.skip();

      return interaction.editReply(
        "⏭️ Lagu di-skip!"
      );
    }

    // ==================================
    // PAUSE
    // ==================================

    if (interaction.commandName === "pause") {

      queue.node.setPaused(true);

      return interaction.editReply(
        "⏸️ Musik dipause."
      );
    }

    // ==================================
    // RESUME
    // ==================================

    if (interaction.commandName === "resume") {

      queue.node.setPaused(false);

      return interaction.editReply(
        "▶️ Musik dilanjutkan."
      );
    }

    // ==================================
    // STOP
    // ==================================

    if (interaction.commandName === "stop") {

      queue.delete();

      return interaction.editReply(
        "⏹️ Musik dihentikan."
      );
    }

    // ==================================
    // QUEUE
    // ==================================

    if (interaction.commandName === "queue") {

      const current =
        queue.currentTrack;

      const tracks =
        queue.tracks.toArray();

      let output = "";

      if (current) {
        output +=
          `▶️ **Now Playing:** ${current.title}\n\n`;
      }

      if (!tracks.length) {
        output += "📭 Queue kosong.";
      } else {

        output += tracks
          .slice(0, 10)
          .map(
            (track, index) =>
              `${index + 1}. ${track.title}`
          )
          .join("\n");
      }

      return interaction.editReply(output);
    }

  } catch (error) {

    console.error("");
    console.error("================================");
    console.error("❌ COMMAND ERROR");
    console.error("================================");
    console.error(error);
    console.error("================================");

    try {

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        await interaction.editReply(
          `❌ Error: \`${error.message || error}\``
        );
      }

    } catch (replyError) {

      console.error(
        "❌ Failed to reply:"
      );

      console.error(replyError);
    }
  }
});

// ========================================
// CLIENT ERRORS
// ========================================

client.on("error", error => {
  console.error("❌ CLIENT ERROR:");
  console.error(error);
});

client.on("warn", warning => {
  console.warn("⚠️ WARNING:");
  console.warn(warning);
});

// ========================================
// LOGIN
// ========================================

console.log("🚀 Starting EnMusic...");

client.login(TOKEN);
