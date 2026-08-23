```js
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
} = require("discord.js");

const {
  Player,
  useMainPlayer,
} = require("discord-player");

const {
  DefaultExtractors,
} = require("@discord-player/extractor");

const ffmpegPath = require("ffmpeg-static");

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || "1540915302370377749";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN / TOKEN belum diisi!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID / DISCORD_CLIENT_ID belum diisi!");
  process.exit(1);
}

// =====================================================
// FFmpeg
// =====================================================

process.env.FFMPEG_PATH = ffmpegPath;

console.log("================================");
console.log("🎬 FFMPEG CHECK");
console.log("================================");
console.log("FFmpeg path:", ffmpegPath);

if (!ffmpegPath) {
  console.error("❌ FFmpeg tidak ditemukan!");
  process.exit(1);
}

console.log("✅ FFmpeg tersedia!");

// =====================================================
// DISCORD CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// =====================================================
// DISCORD PLAYER
// =====================================================

const player = new Player(client);

console.log("🚀 Starting EnMusic...");

// =====================================================
// PLAYER DEBUG
// =====================================================

player.on("debug", (message) => {
  console.log("🐛 PLAYER:", message);
});

player.events.on("debug", (queue, message) => {
  console.log("🐛 QUEUE DEBUG:", message);
});

// =====================================================
// PLAYER EVENTS
// =====================================================

player.events.on("playerStart", (queue, track) => {
  console.log("================================");
  console.log("▶️ PLAYER START");
  console.log("🎵", track.title);
  console.log("🔗", track.url);
  console.log("================================");
});

player.events.on("playerFinish", (queue, track) => {
  console.log("================================");
  console.log("⏹️ PLAYER FINISH");
  console.log("🎵", track.title);
  console.log("📭 QUEUE EMPTY");
  console.log("================================");
});

player.events.on("error", (queue, error) => {
  console.error("================================");
  console.error("❌ PLAYER ERROR");
  console.error(error);
  console.error("================================");
});

player.events.on("playerError", (queue, error) => {
  console.error("================================");
  console.error("❌ PLAYER STREAM ERROR");
  console.error(error);
  console.error("================================");
});

player.events.on("emptyQueue", (queue) => {
  console.log("📭 Queue kosong");
});

player.events.on("disconnect", (queue) => {
  console.log("🔌 Bot disconnect dari voice channel");
});

player.events.on("connectionError", (queue, error) => {
  console.error("================================");
  console.error("❌ VOICE CONNECTION ERROR");
  console.error(error);
  console.error("================================");
});

// =====================================================
// SLASH COMMAND
// =====================================================

const playCommand = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Putar musik dari SoundCloud")
  .addStringOption((option) =>
    option
      .setName("song")
      .setDescription("URL SoundCloud atau nama lagu")
      .setRequired(true)
  );

const stopCommand = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Hentikan musik");

const skipCommand = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Lewati lagu sekarang");

const pauseCommand = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause musik");

const resumeCommand = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Lanjutkan musik");

const commands = [
  playCommand.toJSON(),
  stopCommand.toJSON(),
  skipCommand.toJSON(),
  pauseCommand.toJSON(),
  resumeCommand.toJSON(),
];

// =====================================================
// REGISTER COMMANDS
// =====================================================

async function registerCommands() {
  try {
    console.log("================================");
    console.log("🔧 Registering guild commands...");
    console.log("Guild:", GUILD_ID);
    console.log("================================");

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      {
        body: commands,
      }
    );

    console.log("================================");
    console.log("✅ GUILD COMMANDS REGISTERED");
    console.log("================================");
  } catch (error) {
    console.error("❌ Gagal register slash commands:");
    console.error(error);
  }
}

// =====================================================
// READY
// =====================================================

client.once("clientReady", async () => {
  console.log("================================");
  console.log(`🎵 ${client.user.tag} ONLINE`);
  console.log("================================");

  try {
    console.log("🔍 Loading default extractors...");

    await player.extractors.loadMulti(DefaultExtractors);

    console.log("✅ Extractor berhasil dimuat!");

    console.log("🎧 SoundCloud extractor siap!");
    console.log("🎬 FFmpeg:", process.env.FFMPEG_PATH);

    await registerCommands();

    console.log("================================");
    console.log("🟢 EnMusic SIAP DIGUNAKAN");
    console.log("================================");
  } catch (error) {
    console.error("❌ Gagal initialize player:");
    console.error(error);
  }
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log("================================");
  console.log("📥 INTERACTION RECEIVED");
  console.log("Command:", interaction.commandName);
  console.log("User:", interaction.user.username);
  console.log("Guild:", interaction.guild?.name);
  console.log("================================");

  // ===================================================
  // PLAY
  // ===================================================

  if (interaction.commandName === "play") {
    const voiceChannel = interaction.member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Kamu harus masuk voice channel dulu.",
        ephemeral: true,
      });
    }

    const botMember = interaction.guild.members.me;

    if (!botMember) {
      return interaction.reply({
        content: "❌ Tidak bisa mendapatkan data bot.",
        ephemeral: true,
      });
    }

    const permissions = voiceChannel.permissionsFor(botMember);

    if (
      !permissions ||
      !permissions.has(PermissionsBitField.Flags.Connect)
    ) {
      return interaction.reply({
        content: "❌ Bot tidak punya permission **Connect**.",
        ephemeral: true,
      });
    }

    if (
      !permissions.has(PermissionsBitField.Flags.Speak)
    ) {
      return interaction.reply({
        content: "❌ Bot tidak punya permission **Speak**.",
        ephemeral: true,
      });
    }

    const query = interaction.options.getString("song", true);

    console.log("================================");
    console.log("🎵 PLAY REQUEST");
    console.log("================================");
    console.log("Guild:", interaction.guild.name);
    console.log("User:", interaction.user.username);
    console.log("Voice:", voiceChannel.name);
    console.log("Voice ID:", voiceChannel.id);
    console.log("Song:", query);
    console.log("================================");

    await interaction.deferReply();

    try {
      const mainPlayer = useMainPlayer();

      console.log("🔊 Mencoba connect ke voice...");
      console.log("🔎 Query:", query);

      const result = await mainPlayer.play(
        voiceChannel,
        query,
        {
          nodeOptions: {
            metadata: {
              channel: interaction.channel,
              requestedBy: interaction.user,
            },

            bufferingTimeout: 15000,

            leaveOnStop: true,
            leaveOnStopCooldown: 5000,

            leaveOnEnd: true,
            leaveOnEndCooldown: 10000,

            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 300000,

            skipOnNoStream: false,
          },
        }
      );

      console.log("================================");
      console.log("➕ TRACK ADDED");
      console.log("🎵", result.track.title);
      console.log("🔗", result.track.url);
      console.log("================================");

      await interaction.editReply(
        `🎵 **${result.track.title}**\n🔗 ${result.track.url}`
      );

      console.log("✅ player.play() selesai!");
    } catch (error) {
      console.error("================================");
      console.error("❌ QUEUE ERROR");
      console.error(error);
      console.error("================================");

      const message =
        error?.message ||
        "Terjadi error saat memutar musik.";

      try {
        await interaction.editReply(
          `❌ Gagal memutar musik.\n\`${message}\``
        );
      } catch (replyError) {
        console.error("❌ Gagal mengirim error ke Discord:", replyError);
      }
    }

    return;
  }

  // ===================================================
  // STOP
  // ===================================================

  if (interaction.commandName === "stop") {
    try {
      const queue = player.nodes.get(interaction.guild.id);

      if (!queue) {
        return interaction.reply("❌ Tidak ada musik yang sedang diputar.");
      }

      queue.delete();

      return interaction.reply("⏹️ Musik dihentikan.");
    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal menghentikan musik."
      );
    }
  }

  // ===================================================
  // SKIP
  // ===================================================

  if (interaction.commandName === "skip") {
    try {
      const queue = player.nodes.get(interaction.guild.id);

      if (!queue || !queue.isPlaying()) {
        return interaction.reply(
          "❌ Tidak ada lagu yang sedang diputar."
        );
      }

      queue.node.skip();

      return interaction.reply("⏭️ Lagu dilewati.");
    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal skip lagu."
      );
    }
  }

  // ===================================================
  // PAUSE
  // ===================================================

  if (interaction.commandName === "pause") {
    try {
      const queue = player.nodes.get(interaction.guild.id);

      if (!queue || !queue.isPlaying()) {
        return interaction.reply(
          "❌ Tidak ada lagu yang sedang diputar."
        );
      }

      queue.node.pause();

      return interaction.reply("⏸️ Musik di-pause.");
    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal pause."
      );
    }
  }

  // ===================================================
  // RESUME
  // ===================================================

  if (interaction.commandName === "resume") {
    try {
      const queue = player.nodes.get(interaction.guild.id);

      if (!queue) {
        return interaction.reply(
          "❌ Tidak ada queue."
        );
      }

      queue.node.resume();

      return interaction.reply("▶️ Musik dilanjutkan.");
    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal resume."
      );
    }
  }
});

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN).catch((error) => {
  console.error("================================");
  console.error("❌ DISCORD LOGIN ERROR");
  console.error(error);
  console.error("================================");
});
```
