const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const {
  Player,
  useQueue,
} = require("discord-player");

const {
  DefaultExtractors,
} = require("@discord-player/extractor");

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const ffmpeg = require("ffmpeg-static");
const { execFile } = require("child_process");

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
// DEBUG EVENTS
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
  console.log("");
  console.log("================================");
  console.log(`🎵 ${client.user.tag} SUDAH ONLINE`);
  console.log("================================");

  try {
    await player.extractors.loadMulti(DefaultExtractors);

    console.log("✅ Extractor berhasil dimuat!");

    const rest = new REST({
      version: "10",
    }).setToken(process.env.DISCORD_TOKEN);

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
// INTERACTIONS
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
        interaction.options.getString(
          "song",
          true
        );

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

      // ==================================
      // MANUAL VOICE CONNECTION
      // ==================================

      console.log("");
      console.log("🔊 Membuat voice connection...");

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator:
          voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });

      console.log(
        "⏳ Menunggu voice connection READY..."
      );

      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        15000
      );

      console.log(
        "✅ Voice connection READY!"
      );

      // ==================================
      // DAVE DELAY
      // ==================================

      console.log(
        "⏳ Menunggu DAVE/MLS..."
      );

      await new Promise(resolve =>
        setTimeout(resolve, 2500)
      );

      console.log(
        "✅ DAVE delay selesai!"
      );

      // ==================================
      // PLAYER
      // ==================================

      const queue =
        useQueue(interaction.guildId);

      let result;

      try {

        console.log(
          "🎵 Menjalankan player.play()..."
        );

        result =
          await player.play(
            voiceChannel,
            song,
            {
              nodeOptions: {

                metadata: {
                  channel:
                    interaction.channel,
                },

                leaveOnEnd: false,
                leaveOnStop: false,
                leaveOnEmpty: false,

                selfDeaf: true,

                bufferingTimeout: 15000,

                skipOnNoStream: false,
              },
            }
          );

      } catch (error) {

        console.error(
          "❌ PLAYER PLAY ERROR:"
        );

        console.error(error);

        connection.destroy();

        throw error;
      }

      console.log(
        "✅ player.play() selesai!"
      );

      if (!result?.track) {

        return interaction.editReply(
          "❌ Track tidak ditemukan."
        );
      }

      console.log(
        "🎵 TRACK:",
        result.track.title
      );

      console.log(
        "🔗 URL:",
        result.track.url
      );

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
        "❌ Tidak ada musik."
      );
    }

    // ====================================
    // SKIP
    // ====================================

    if (interaction.commandName === "skip") {

      if (!queue.currentTrack) {
        return interaction.reply(
          "❌ Tidak ada lagu."
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
        "⏹️ Musik dihentikan."
      );
    }

    // ====================================
    // QUEUE
    // ====================================

    if (interaction.commandName === "queue") {

      const tracks =
        queue.tracks.toArray();

      let message =
        "📜 **QUEUE**\n\n";

      if (queue.currentTrack) {
        message +=
          `▶️ **${queue.currentTrack.title}**\n\n`;
      }

      if (!tracks.length) {
        message +=
          "📭 Queue kosong.";
      } else {

        message += tracks
          .slice(0, 10)
          .map(
            (track, index) =>
              `${index + 1}. ${track.title}`
          )
          .join("\n");
      }

      return interaction.reply(message);
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
        `❌ Error:\n\`${error.message}\``
      );

    } else {

      await interaction.reply(
        `❌ Error:\n\`${error.message}\``
      );
    }
  }
});

// ========================================
// FFMPEG
// ========================================

console.log("");
console.log("================================");
console.log("🎬 FFMPEG CHECK");
console.log("================================");

console.log(
  "FFmpeg path:",
  ffmpeg
);

if (ffmpeg) {

  execFile(
    ffmpeg,
    ["-version"],
    (error, stdout) => {

      if (error) {
        console.error(
          "❌ FFmpeg ERROR:",
          error
        );
        return;
      }

      console.log(
        "✅ FFmpeg BERHASIL!"
      );

      console.log(
        stdout.split("\n")[0]
      );
    }
  );
}

// ========================================
// GLOBAL ERRORS
// ========================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ UNHANDLED REJECTION:"
    );
    console.error(error);
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ UNCAUGHT EXCEPTION:"
    );
    console.error(error);
  }
);

// ========================================
// LOGIN
// ========================================

client.login(
  process.env.DISCORD_TOKEN
);
