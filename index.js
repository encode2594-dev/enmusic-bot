```js
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const { Kazagumo } = require("kazagumo");
const { Connectors } = require("shoukaku");

// ======================================================
// CONFIG
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1540915302370377749";

const LAVALINK_HOST = "lavalink.railway.internal";
const LAVALINK_PORT = 2333;
const LAVALINK_PASSWORD = "enmusic2026";

// ======================================================
// CHECK TOKEN
// ======================================================

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN tidak ditemukan!");
  process.exit(1);
}

// ======================================================
// DISCORD CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ======================================================
// LAVALINK NODE
// ======================================================

const Nodes = [
  {
    name: "Railway-Lavalink",
    url: `${LAVALINK_HOST}:${LAVALINK_PORT}`,
    auth: LAVALINK_PASSWORD,
    secure: false,
  },
];

// ======================================================
// KAZAGUMO
// ======================================================

const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: "soundcloud",

    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        console.error(
          `❌ Guild ${guildId} tidak ditemukan`
        );
        return;
      }

      guild.shard.send(payload);
    },
  },

  new Connectors.DiscordJS(client),

  Nodes
);

// ======================================================
// SLASH COMMANDS
// ======================================================

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

// ======================================================
// LAVALINK EVENTS
// ======================================================

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
    console.warn(
      `Reason: ${reason || "No reason"}`
    );
    console.warn("================================");

  }
);

kazagumo.shoukaku.on(
  "disconnect",
  (name, count) => {

    console.warn(
      `⚠️ Lavalink disconnected: ${name}`
    );

    console.warn(
      `Players affected: ${count}`
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

// ======================================================
// PLAYER EVENTS
// ======================================================

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
  player => {

    console.log("");
    console.log("================================");
    console.log("⏹️ PLAYER END");
    console.log(
      `Guild: ${player.guildId}`
    );
    console.log("================================");

  }
);

kazagumo.on(
  "playerEmpty",
  player => {

    console.log("");
    console.log("================================");
    console.log("📭 QUEUE EMPTY");
    console.log(
      `Guild: ${player.guildId}`
    );
    console.log("================================");

  }
);

kazagumo.on(
  "playerClosed",
  (player, data) => {

    console.warn("");
    console.warn("================================");
    console.warn("🔌 PLAYER CLOSED");
    console.warn(
      `Guild: ${player.guildId}`
    );
    console.warn(data);
    console.warn("================================");

  }
);

kazagumo.on(
  "playerException",
  (player, data) => {

    console.error("");
    console.error("================================");
    console.error("❌ PLAYER EXCEPTION");
    console.error(
      `Guild: ${player.guildId}`
    );
    console.error(data);
    console.error("================================");

  }
);

kazagumo.on(
  "playerStuck",
  (player, data) => {

    console.error("");
    console.error("================================");
    console.error("⚠️ PLAYER STUCK");
    console.error(
      `Guild: ${player.guildId}`
    );
    console.error(data);
    console.error("================================");

  }
);

kazagumo.on(
  "playerResolveError",
  (player, track, message) => {

    console.error("");
    console.error("================================");
    console.error("❌ TRACK RESOLVE ERROR");
    console.error(
      `Track: ${track?.title || "Unknown"}`
    );
    console.error(
      `Message: ${message || "Unknown"}`
    );
    console.error("================================");

  }
);

// ======================================================
// DISCORD READY
// ======================================================

client.once(
  "ready",
  async () => {

    console.log("");
    console.log("================================");
    console.log(
      `🎵 ${client.user.tag} ONLINE`
    );
    console.log("================================");

    console.log(
      `🔊 Lavalink: ${LAVALINK_HOST}:${LAVALINK_PORT}`
    );

    console.log(
      "🎧 Menunggu koneksi Lavalink..."
    );

    // ----------------------------------------------
    // REGISTER GUILD COMMANDS
    // ----------------------------------------------

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
        "❌ Gagal register commands:"
      );

      console.error(error);

    }

  }
);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    console.log("");
    console.log("================================");
    console.log("📥 INTERACTION RECEIVED");
    console.log(
      `Command: /${interaction.commandName}`
    );
    console.log(
      `User: ${interaction.user.tag}`
    );
    console.log(
      `Guild: ${interaction.guild?.name || "DM"}`
    );
    console.log("================================");

    // ==================================================
    // PLAY
    // ==================================================

    if (
      interaction.commandName === "play"
    ) {

      const voiceChannel =
        interaction.member?.voice?.channel;

      if (!voiceChannel) {

        return interaction.reply({
          content:
            "❌ Kamu harus masuk voice channel dulu!",
          ephemeral: true,
        });

      }

      const query =
        interaction.options.getString(
          "song",
          true
        );

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

      try {

        // Acknowledge interaction secepat mungkin.
        await interaction.deferReply();

        console.log(
          "✅ Discord interaction acknowledged!"
        );

        // --------------------------------------------
        // GET EXISTING PLAYER
        // --------------------------------------------

        let player =
          kazagumo.players.get(
            interaction.guildId
          );

        // --------------------------------------------
        // CREATE PLAYER
        // --------------------------------------------

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

          console.log(
            "♻️ Player sudah ada."
          );

          // Pindah voice bila diperlukan.
          if (
            player.voiceId !==
            voiceChannel.id
          ) {

            console.log(
              "🔄 Memindahkan player ke voice channel..."
            );

            player.setVoiceChannel(
              voiceChannel.id
            );

          }

          player.setTextChannel(
            interaction.channelId
          );

        }

        // --------------------------------------------
        // SEARCH
        // --------------------------------------------

        console.log(
          "🔎 Mencari track di Lavalink..."
        );

        let searchQuery = query;

        // Nama lagu biasa -> SoundCloud search.
        if (
          !query.includes(
            "soundcloud.com/"
          )
        ) {

          searchQuery =
            `scsearch:${query}`;

        }

        console.log(
          `🔎 Query: ${searchQuery}`
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
          `📦 Result type: ${result.type}`
        );

        console.log(
          `🎵 Jumlah track: ${result.tracks.length}`
        );

        if (
          !result.tracks.length
        ) {

          return interaction.editReply(
            "❌ Lagu tidak ditemukan oleh Lavalink."
          );

        }

        // --------------------------------------------
        // ADD TRACK
        // --------------------------------------------

        if (
          result.type === "PLAYLIST"
        ) {

          player.queue.add(
            result.tracks
          );

          console.log(
            `➕ ${result.tracks.length} track ditambahkan.`
          );

        } else {

          const track =
            result.tracks[0];

          player.queue.add(
            track
          );

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

        }

        // --------------------------------------------
        // PLAY
        // --------------------------------------------

        if (
          !player.playing &&
          !player.paused
        ) {

          console.log(
            "▶️ Menjalankan player.play()..."
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

        // --------------------------------------------
        // REPLY
        // --------------------------------------------

        if (
          result.type === "PLAYLIST"
        ) {

          return interaction.editReply(
            `📚 **${result.tracks.length} lagu** masuk queue.`
          );

        }

        return interaction.editReply(
          `🎵 **${result.tracks[0].title}** masuk queue!`
        );

      } catch (error) {

        console.error("");
        console.error(
          "================================"
        );
        console.error(
          "❌ PLAY ERROR"
        );
        console.error(
          "================================"
        );
        console.error(error);

        const message =
          error?.message ||
          "Unknown error";

        try {

          if (
            interaction.deferred ||
            interaction.replied
          ) {

            await interaction.editReply(
              `❌ Gagal memutar musik:\n\`${message}\``
            );

          }

        } catch (replyError) {

          console.error(
            "❌ Gagal mengirim error ke Discord:",
            replyError
          );

        }

      }

      return;
    }

    // ==================================================
    // OTHER COMMANDS
    // ==================================================

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

    // ==================================================
    // SKIP
    // ==================================================

    if (
      interaction.commandName === "skip"
    ) {

      try {

        player.skip();

        return interaction.reply(
          "⏭️ Lagu di-skip!"
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal skip lagu.",
          ephemeral: true,
        });

      }

    }

    // ==================================================
    // PAUSE
    // ==================================================

    if (
      interaction.commandName === "pause"
    ) {

      try {

        player.pause(true);

        return interaction.reply(
          "⏸️ Musik dipause."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal pause musik.",
          ephemeral: true,
        });

      }

    }

    // ==================================================
    // RESUME
    // ==================================================

    if (
      interaction.commandName === "resume"
    ) {

      try {

        player.pause(false);

        return interaction.reply(
          "▶️ Musik dilanjutkan."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal melanjutkan musik.",
          ephemeral: true,
        });

      }

    }

    // ==================================================
    // STOP
    // ==================================================

    if (
      interaction.commandName === "stop"
    ) {

      try {

        player.queue.clear();

        player.destroy();

        return interaction.reply(
          "⏹️ Musik dihentikan."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal menghentikan musik.",
          ephemeral: true,
        });

      }

    }

    // ==================================================
    // QUEUE
    // ==================================================

    if (
      interaction.commandName === "queue"
    ) {

      try {

        const tracks =
          player.queue;

        if (
          tracks.length === 0
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

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal membaca queue.",
          ephemeral: true,
        });

      }

    }

  }
);

// ======================================================
// GLOBAL ERROR HANDLERS
// ======================================================

client.on(
  "error",
  error => {

    console.error(
      "❌ Discord Client Error:",
      error
    );

  }
);

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ UNHANDLED REJECTION:",
      error
    );

  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ UNCAUGHT EXCEPTION:",
      error
    );

  }
);

// ======================================================
// START
// ======================================================

console.log("");
console.log("================================");
console.log("🚀 Starting EnMusic...");
console.log("================================");

client.login(TOKEN);
```
