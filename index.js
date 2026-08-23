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

const ffmpeg = require("ffmpeg-static");
const { execFile } = require("child_process");

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
// MUSIC PLAYER
// ========================================

const player = new Player(client);

// ========================================
// PLAYER DEBUG
// ========================================

player.events.on("debug", (queue, message) => {
  console.log("🐛 PLAYER DEBUG:");
  console.log(message);
});

player.events.on("audioTrackAdd", (queue, track) => {
  console.log("");
  console.log("➕ TRACK ADDED:");
  console.log(track.title);
});

player.events.on("playerStart", (queue, track) => {
  console.log("");
  console.log("▶️ PLAYER START:");
  console.log(track.title);
});

player.events.on("playerFinish", (queue, track) => {
  console.log("");
  console.log("⏹️ PLAYER FINISH:");
  console.log(track.title);
});

player.events.on("playerError", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("❌ PLAYER ERROR");
  console.error("================================");
  console.error(error);
  console.error("================================");
});

player.events.on("error", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("❌ QUEUE ERROR");
  console.error("================================");
  console.error(error);
  console.error("================================");
});

player.events.on("connectionError", (queue, error) => {
  console.error("");
  console.error("================================");
  console.error("🔌 CONNECTION ERROR");
  console.error("================================");
  console.error(error);
  console.error("================================");
});

player.events.on("emptyQueue", queue => {
  console.log("");
  console.log("📭 QUEUE EMPTY");
});

// ========================================
// SLASH COMMANDS
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
    .setDescription("Skip lagu sekarang"),

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
    .setDescription("Lihat antrean lagu"),
].map(command => command.toJSON());

// ========================================
// BOT READY
// ========================================

client.once("ready", async () => {
  console.log("");
  console.log("================================");
  console.log(`🎵 ${client.user.tag} SUDAH ONLINE`);
  console.log("================================");

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
    console.error("");
    console.error("❌ READY ERROR:");
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

  try {

    // ====================================
    // /PLAY
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

      console.log(
        "Guild:",
        interaction.guild?.name
      );

      console.log(
        "User:",
        interaction.user.tag
      );

      console.log(
        "Voice:",
        voiceChannel.name
      );

      console.log(
        "Voice ID:",
        voiceChannel.id
      );

      console.log(
        "Song:",
        song
      );

      const mainPlayer =
        useMainPlayer();

      try {

        // ==================================
        // DAVE / VOICE DELAY
        // ==================================

        console.log("");
        console.log(
          "🔊 Mencoba connect ke voice..."
        );

        console.log(
          "⏳ Menunggu voice/DAVE handshake..."
        );

        await new Promise(resolve =>
          setTimeout(resolve, 2500)
        );

        console.log(
          "✅ Delay selesai."
        );

        console.log(
          "🎵 Memulai player..."
        );

        // ==================================
        // PLAY
        // ==================================

        const result =
          await mainPlayer.play(
            voiceChannel,
            song,
            {
              nodeOptions: {

                metadata: {
                  channel:
                    interaction.channel,
                },

                // --------------------------
                // BUFFERING
                // --------------------------

                bufferingTimeout: 15000,

                // --------------------------
                // VOICE LIFECYCLE
                // --------------------------

                leaveOnEnd: false,
                leaveOnStop: false,
                leaveOnEmpty: false,

                // --------------------------
                // VOICE
                // --------------------------

                selfDeaf: true,

                // --------------------------
                // STREAM
                // --------------------------

                skipOnNoStream: false,
              },
            }
          );

        console.log("");
        console.log(
          "✅ player.play() selesai!"
        );

        if (!result?.track) {

          console.log(
            "⚠️ Tidak ada track dari player."
          );

          return interaction.editReply(
            "⚠️ Track tidak ditemukan."
          );
        }

        console.log("");
        console.log("🎵 TRACK:");
        console.log(
          result.track.title
        );

        console.log(
          "🔗 URL:",
          result.track.url
        );

        return interaction.editReply(
          `🎵 **${result.track.title}** masuk ke queue!`
        );

      } catch (error) {

        console.error("");
        console.error("================================");
        console.error("❌ PLAY ERROR");
        console.error("================================");

        console.error(error);

        console.error("================================");

        return interaction.editReply(
          `❌ Gagal memutar lagu:\n\`${error.message}\``
        );
      }
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
    // /SKIP
    // ====================================

    if (interaction.commandName === "skip") {

      if (!queue.currentTrack) {

        return interaction.reply(
          "❌ Tidak ada lagu yang sedang diputar."
        );
      }

      console.log(
        "⏭️ SKIP:",
        queue.currentTrack.title
      );

      queue.node.skip();

      return interaction.reply(
        "⏭️ Lagu di-skip!"
      );
    }

    // ====================================
    // /PAUSE
    // ====================================

    if (interaction.commandName === "pause") {

      queue.node.setPaused(true);

      console.log(
        "⏸️ PAUSE"
      );

      return interaction.reply(
        "⏸️ Musik dipause."
      );
    }

    // ====================================
    // /RESUME
    // ====================================

    if (interaction.commandName === "resume") {

      queue.node.setPaused(false);

      console.log(
        "▶️ RESUME"
      );

      return interaction.reply(
        "▶️ Musik dilanjutkan."
      );
    }

    // ====================================
    // /STOP
    // ====================================

    if (interaction.commandName === "stop") {

      console.log(
        "⏹️ STOP"
      );

      queue.delete();

      return interaction.reply(
        "⏹️ Musik dihentikan."
      );
    }

    // ====================================
    // /QUEUE
    // ====================================

    if (interaction.commandName === "queue") {

      let message =
        "📜 **MUSIC QUEUE**\n\n";

      // Lagu sekarang

      if (queue.currentTrack) {

        message +=
          `▶️ Sekarang: **${queue.currentTrack.title}**\n\n`;

      } else {

        message +=
          "▶️ Sekarang: Tidak ada\n\n";
      }

      // Lagu berikutnya

      const tracks =
        queue.tracks.toArray();

      if (tracks.length === 0) {

        message +=
          "📭 Tidak ada lagu berikutnya.";

      } else {

        const list =
          tracks
            .slice(0, 10)
            .map(
              (track, index) =>
                `${index + 1}. ${track.title}`
            )
            .join("\n");

        message += list;
      }

      return interaction.reply(
        message
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
// FFMPEG CHECK
// ========================================

console.log("");
console.log("================================");
console.log("🎬 FFMPEG CHECK");
console.log("================================");

console.log(
  "FFmpeg path:",
  ffmpeg
);

if (!ffmpeg) {

  console.error(
    "❌ FFmpeg binary tidak ditemukan!"
  );

} else {

  execFile(
    ffmpeg,
    ["-version"],
    (error, stdout, stderr) => {

      if (error) {

        console.error(
          "❌ FFmpeg ERROR:"
        );

        console.error(
          error
        );

        if (stderr) {
          console.error(stderr);
        }

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
// GLOBAL ERROR HANDLING
// ========================================

process.on(
  "unhandledRejection",
  error => {

    console.error("");
    console.error(
      "❌ UNHANDLED REJECTION"
    );

    console.error(error);
  }
);

process.on(
  "uncaughtException",
  error => {

    console.error("");
    console.error(
      "❌ UNCAUGHT EXCEPTION"
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
