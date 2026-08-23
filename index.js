const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const {
  Connectors,
  Kazagumo,
} = require("kazagumo");

// ========================================
// CONFIG
// ========================================

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1540915302370377749";

// Railway internal hostname.
// Service Railway kamu bernama "lavalink".
const LAVALINK_HOST = "lavalink.railway.internal";

const LAVALINK_PORT = 2333;

const LAVALINK_PASSWORD = "enmusic2026";

// ========================================
// CHECK TOKEN
// ========================================

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN tidak ditemukan!");
  process.exit(1);
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
// LAVALINK NODE
// ========================================

const Nodes = [
  {
    name: "Railway-Lavalink",
    url: `${LAVALINK_HOST}:${LAVALINK_PORT}`,
    auth: LAVALINK_PASSWORD,
    secure: false,
  },
];

// ========================================
// KAZAGUMO
// ========================================

const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: "soundcloud",

    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        console.error(
          `❌ Guild ${guildId} tidak ditemukan saat mengirim voice payload.`
        );
        return;
      }

      guild.shard.send(payload);
    },
  },

  new Connectors.DiscordJS(client),

  Nodes
);

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
        .setDescription("URL SoundCloud atau nama lagu")
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
// READY
// ========================================

client.once("ready", async () => {

  console.log("");
  console.log("================================");
  console.log(`🎵 ${client.user.tag} ONLINE`);
  console.log("================================");

  console.log(
    `🔊 Lavalink: ${LAVALINK_HOST}:${LAVALINK_PORT}`
  );

  console.log(
    "🎧 Connecting to Lavalink..."
  );

  try {

    kazagumo.shoukaku.on(
      "ready",
      name => {

        console.log("");
        console.log("================================");
        console.log("🟢 LAVALINK READY");
        console.log(`Node: ${name}`);
        console.log("================================");

      }
    );

    kazagumo.shoukaku.on(
      "error",
      (name, error) => {

        console.error("");
        console.error("================================");
        console.error("❌ LAVALINK ERROR");
        console.error(`Node: ${name}`);
        console.error("================================");
        console.error(error);

      }
    );

    kazagumo.shoukaku.on(
      "close",
      (name, code, reason) => {

        console.warn("");
        console.warn("================================");
        console.warn("⚠️ LAVALINK CLOSED");
        console.warn(`Node: ${name}`);
        console.warn(`Code: ${code}`);
        console.warn(`Reason: ${reason || "Tidak ada alasan"}`);
        console.warn("================================");

      }
    );

    kazagumo.shoukaku.on(
      "disconnect",
      (name, count) => {

        console.warn(
          `⚠️ Lavalink disconnected: ${name} (${count})`
        );

      }
    );

    kazagumo.shoukaku.on(
      "debug",
      (name, info) => {

        console.log(
          `[LAVALINK DEBUG] ${name}: ${info}`
        );

      }
    );

    // Initialize Kazagumo
    kazagumo.shoukaku;

    console.log(
      "🎧 Lavalink client initialized!"
    );

  } catch (error) {

    console.error(
      "❌ Lavalink initialization error:"
    );

    console.error(error);

  }

  // ======================================
  // REGISTER GUILD COMMANDS
  // ======================================

  try {

    const rest = new REST({
      version: "10",
    }).setToken(TOKEN);

    console.log(
      "🔧 Registering guild commands..."
    );

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID
      ),
      {
        body: commands,
      }
    );

    console.log(
      "================================"
    );

    console.log(
      "✅ GUILD COMMANDS REGISTERED"
    );

    console.log(
      "================================"
    );

  } catch (error) {

    console.error(
      "❌ Command registration error:"
    );

    console.error(error);

  }

});

// ========================================
// LAVALINK EVENTS
// ========================================

kazagumo.on(
  "playerStart",
  (player, track) => {

    console.log("");
    console.log("================================");
    console.log("▶️ PLAYER START");
    console.log(`🎵 ${track.title}`);
    console.log(`🔗 ${track.uri}`);
    console.log("================================");

  }
);

kazagumo.on(
  "playerEnd",
  (player, track) => {

    console.log("");
    console.log("================================");
    console.log("⏹️ PLAYER END");
    console.log(`🎵 ${track.title}`);
    console.log("================================");

  }
);

kazagumo.on(
  "playerEmpty",
  player => {

    console.log("");
    console.log("================================");
    console.log("📭 PLAYER EMPTY");
    console.log(
      `Guild: ${player.guildId}`
    );
    console.log("================================");

  }
);

kazagumo.on(
  "playerClosed",
  player => {

    console.log(
      `🔌 Player closed: ${player.guildId}`
    );

  }
);

// ========================================
// INTERACTION
// ========================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    console.log("");
    console.log("================================");
    console.log("📥 INTERACTION");
    console.log(`Command: /${interaction.commandName}`);
    console.log(`User: ${interaction.user.tag}`);
    console.log(`Guild: ${interaction.guild?.name}`);
    console.log("================================");

    try {

      // ==================================
      // PLAY
      // ==================================

      if (
        interaction.commandName === "play"
      ) {

        const voiceChannel =
          interaction.member.voice.channel;

        if (!voiceChannel) {

          return interaction.reply(
            "❌ Kamu harus masuk voice channel dulu!"
          );

        }

        const query =
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
          `Guild: ${interaction.guild.name}`
        );
        console.log(
          `User: ${interaction.user.tag}`
        );
        console.log(
          `Voice: ${voiceChannel.name}`
        );
        console.log(
          `Voice ID: ${voiceChannel.id}`
        );
        console.log(
          `Song: ${query}`
        );
        console.log("================================");

        // --------------------------------
        // CREATE PLAYER
        // --------------------------------

        let player =
          kazagumo.players.get(
            interaction.guildId
          );

        if (!player) {

          console.log(
            "🔊 Membuat Lavalink player..."
          );

          player =
            await kazagumo.createPlayer({

              guildId:
                interaction.guildId,

              textId:
                interaction.channelId,

              voiceId:
                voiceChannel.id,

              volume: 100,

              deaf: true,

            });

          console.log(
            "✅ Lavalink player berhasil dibuat!"
          );

        } else {

          // Jika player sudah ada tetapi pindah voice
          if (
            player.voiceId !==
            voiceChannel.id
          ) {

            console.log(
              "🔄 Memindahkan voice channel..."
            );

            await player.setVoiceChannel(
              voiceChannel.id
            );

          }

        }

        // --------------------------------
        // SEARCH
        // --------------------------------

        console.log(
          "🔎 Mencari track..."
        );

        let searchQuery = query;

        // Kalau bukan URL, cari di SoundCloud.
        if (
          !query.includes(
            "soundcloud.com/"
          )
        ) {

          searchQuery =
            `scsearch:${query}`;

        }

        console.log(
          `🔎 Query Lavalink: ${searchQuery}`
        );

        const result =
          await kazagumo.search(
            searchQuery,
            {
              requester:
                interaction.user,
            }
          );

        console.log(
          `📦 Search result: ${result.type}`
        );

        console.log(
          `🎵 Tracks: ${result.tracks.length}`
        );

        if (
          !result.tracks.length
        ) {

          return interaction.editReply(
            "❌ Lagu tidak ditemukan."
          );

        }

        // --------------------------------
        // ADD TRACK
        // --------------------------------

        const track =
          result.tracks[0];

        console.log("");
        console.log(
          "➕ TRACK ADDED"
        );
        console.log(
          `🎵 ${track.title}`
        );
        console.log(
          `👤 ${track.author}`
        );
        console.log(
          `🔗 ${track.uri}`
        );

        player.queue.add(track);

        // --------------------------------
        // START
        // --------------------------------

        if (
          !player.playing &&
          !player.paused
        ) {

          console.log(
            "▶️ Memulai playback..."
          );

          await player.play();

          console.log(
            "✅ player.play() selesai!"
          );

        } else {

          console.log(
            "📥 Player sedang berjalan, track masuk queue."
          );

        }

        return interaction.editReply(
          `🎵 **${track.title}** masuk ke queue!`
        );

      }

      // ==================================
      // GET PLAYER
      // ==================================

      const player =
        kazagumo.players.get(
          interaction.guildId
        );

      if (!player) {

        return interaction.reply({
          content:
            "❌ Tidak ada musik yang sedang diputar.",
          ephemeral: true,
        });

      }

      // ==================================
      // SKIP
      // ==================================

      if (
        interaction.commandName === "skip"
      ) {

        await player.skip();

        return interaction.reply(
          "⏭️ Lagu di-skip!"
        );

      }

      // ==================================
      // PAUSE
      // ==================================

      if (
        interaction.commandName === "pause"
      ) {

        await player.pause(true);

        return interaction.reply(
          "⏸️ Musik dipause."
        );

      }

      // ==================================
      // RESUME
      // ==================================

      if (
        interaction.commandName === "resume"
      ) {

        await player.pause(false);

        return interaction.reply(
          "▶️ Musik dilanjutkan."
        );

      }

      // ==================================
      // STOP
      // ==================================

      if (
        interaction.commandName === "stop"
      ) {

        player.queue.clear();

        await player.destroy();

        return interaction.reply(
          "⏹️ Musik dihentikan."
        );

      }

      // ==================================
      // QUEUE
      // ==================================

      if (
        interaction.commandName === "queue"
      ) {

        const tracks =
          player.queue;

        if (
          !tracks.length
        ) {

          return interaction.reply(
            "📭 Queue kosong."
          );

        }

        const list =
          tracks
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
      console.error(
        "================================"
      );
      console.error(
        "❌ COMMAND ERROR"
      );
      console.error(
        "================================"
      );
      console.error(error);

      const message =
        error?.message ||
        "Terjadi error.";

      try {

        if (
          interaction.deferred ||
          interaction.replied
        ) {

          await interaction.editReply(
            `❌ ${message}`
          );

        } else {

          await interaction.reply(
            `❌ ${message}`
          );

        }

      } catch {}

    }

  }
);

// ========================================
// CLIENT ERROR
// ========================================

client.on(
  "error",
  error => {

    console.error(
      "❌ Discord Client Error:",
      error
    );

  }
);

// ========================================
// START
// ========================================

console.log(
  "🚀 Starting EnMusic..."
);

client.login(TOKEN);
