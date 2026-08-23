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

// ID SERVER GEMAZZZ
const GUILD_ID = "1540915302370377749";

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
    .setDescription("Pause musik"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Lanjutkan musik"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop musik"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Lihat antrean lagu"),
].map(command => command.toJSON());

// ========================================
// PLAYER EVENTS
// ========================================

player.events.on("playerStart", (queue, track) => {
  console.log("================================");
  console.log("▶️ PLAYER START");
  console.log(`🎵 ${track.title}`);
  console.log("================================");

  const channel = queue.metadata?.channel;

  if (channel) {
    channel.send(`▶️ Sekarang memutar **${track.title}**`).catch(() => {});
  }
});

player.events.on("audioTrackAdd", (queue, track) => {
  console.log("➕ TRACK ADDED:");
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

player.events.on("error", (queue, error) => {
  console.error("❌ QUEUE ERROR:");
  console.error(error);
});

// ========================================
// BOT READY
// ========================================

client.once("ready", async () => {
  console.log("================================");
  console.log(`🎵 ${client.user.tag} ONLINE`);
  console.log("================================");

  console.log("FFmpeg:", ffmpegPath);

  try {
    // LOAD EXTRACTORS
    await player.extractors.loadMulti(DefaultExtractors);

    console.log("✅ Extractor berhasil dimuat!");

    // REGISTER SLASH COMMANDS
    const rest = new REST({
      version: "10",
    }).setToken(TOKEN);

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
    console.log("✅ Slash commands registered!");
    console.log(`🏠 Guild: ${GUILD_ID}`);
    console.log("================================");

  } catch (error) {
    console.error("❌ Gagal setup bot:");
    console.error(error);
  }
});

// ========================================
// INTERACTIONS
// ========================================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ========================================
  // PLAY
  // ========================================

  if (interaction.commandName === "play") {
    const voiceChannel = interaction.member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Kamu harus masuk voice channel dulu!",
        ephemeral: true,
      });
    }

    const song = interaction.options.getString("song", true);

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

    try {
      await interaction.deferReply();

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

      await interaction.editReply(
        `🎵 **${result.track.title}** masuk ke queue!`
      );

    } catch (error) {
      console.error("❌ PLAY ERROR:");
      console.error(error);

      if (interaction.deferred) {
        await interaction.editReply(
          `❌ Gagal memutar musik.\n\`\`\`\n${error.message || error}\n\`\`\``
        ).catch(() => {});
      } else {
        await interaction.reply(
          `❌ Gagal memutar musik.\n\`\`\`\n${error.message || error}\n\`\`\``
        ).catch(() => {});
      }
    }

    return;
  }

  // ========================================
  // QUEUE
  // ========================================

  const queue = useQueue(interaction.guildId);

  if (!queue) {
    return interaction.reply({
      content: "❌ Tidak ada musik yang sedang diputar.",
      ephemeral: true,
    });
  }

  // ========================================
  // SKIP
  // ========================================

  if (interaction.commandName === "skip") {
    try {
      const skipped = queue.currentTrack;

      if (!skipped) {
        return interaction.reply("❌ Tidak ada lagu yang sedang diputar.");
      }

      queue.node.skip();

      return interaction.reply(
        `⏭️ Skip **${skipped.title}**`
      );

    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal skip lagu."
      );
    }
  }

  // ========================================
  // PAUSE
  // ========================================

  if (interaction.commandName === "pause") {
    try {
      queue.node.setPaused(true);

      return interaction.reply(
        "⏸️ Musik dipause."
      );

    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal pause musik."
      );
    }
  }

  // ========================================
  // RESUME
  // ========================================

  if (interaction.commandName === "resume") {
    try {
      queue.node.setPaused(false);

      return interaction.reply(
        "▶️ Musik dilanjutkan."
      );

    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal melanjutkan musik."
      );
    }
  }

  // ========================================
  // STOP
  // ========================================

  if (interaction.commandName === "stop") {
    try {
      queue.delete();

      return interaction.reply(
        "⏹️ Musik dihentikan dan queue dikosongkan."
      );

    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal menghentikan musik."
      );
    }
  }

  // ========================================
  // QUEUE
  // ========================================

  if (interaction.commandName === "queue") {
    try {
      const current = queue.currentTrack;
      const tracks = queue.tracks.toArray();

      let text = "";

      if (current) {
        text += `▶️ **Sedang diputar:** ${current.title}\n\n`;
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

        text += `📜 **Queue:**\n${list}`;
      }

      return interaction.reply(text);

    } catch (error) {
      console.error(error);

      return interaction.reply(
        "❌ Gagal membaca queue."
      );
    }
  }
});

// ========================================
// LOGIN
// ========================================

client.login(TOKEN);
