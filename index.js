````js
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const { Kazagumo } = require("kazagumo");
const { Connectors } = require("shoukaku");

// ======================================================
// CONFIG
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1540915302370377749";

const LAVALINK_HOST =
  process.env.LAVALINK_HOST ||
  "lavalink.railway.internal";

const LAVALINK_PORT =
  process.env.LAVALINK_PORT ||
  "2333";

const LAVALINK_PASSWORD =
  process.env.LAVALINK_PASSWORD ||
  "enmusic2026";

// ======================================================
// TOKEN CHECK
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
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ======================================================
// LAVALINK NODE
// ======================================================

const Nodes = [
  {
    name: "Railway-Lavalink",

    url:
      LAVALINK_HOST +
      ":" +
      LAVALINK_PORT,

    auth: LAVALINK_PASSWORD,

    secure: false
  }
];

// ======================================================
// KAZAGUMO
// ======================================================

const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: "soundcloud",

    send: function(guildId, payload) {
      const guild =
        client.guilds.cache.get(guildId);

      if (!guild) {
        console.error(
          "❌ Guild tidak ditemukan: " +
          guildId
        );
        return;
      }

      guild.shard.send(payload);
    }
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
    .addStringOption(function(option) {
      return option
        .setName("song")
        .setDescription(
          "URL SoundCloud atau nama lagu"
        )
        .setRequired(true);
    }),

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
    .setDescription("Lihat queue")

].map(function(command) {
  return command.toJSON();
});

// ======================================================
// LAVALINK EVENTS
// ======================================================

kazagumo.shoukaku.on(
  "ready",
  function(name) {

    console.log("");
    console.log("================================");
    console.log("🟢 LAVALINK READY");
    console.log("Node: " + name);
    console.log("================================");

  }
);

kazagumo.shoukaku.on(
  "error",
  function(name, error) {

    console.error("");
    console.error("================================");
    console.error("❌ LAVALINK ERROR");
    console.error("Node: " + name);
    console.error("================================");
    console.error(error);

  }
);

kazagumo.shoukaku.on(
  "close",
  function(name, code, reason) {

    console.warn("");
    console.warn("================================");
    console.warn("⚠️ LAVALINK CLOSED");
    console.warn("Node: " + name);
    console.warn("Code: " + code);
    console.warn(
      "Reason: " +
      (reason || "Tidak ada alasan")
    );
    console.warn("================================");

  }
);

kazagumo.shoukaku.on(
  "disconnect",
  function(name, count) {

    console.warn(
      "⚠️ Lavalink disconnected: " +
      name +
      " (" +
      count +
      ")"
    );

  }
);

kazagumo.shoukaku.on(
  "debug",
  function(name, info) {

    console.log(
      "[LAVALINK DEBUG] " +
      name +
      ": " +
      info
    );

  }
);

// ======================================================
// PLAYER EVENTS
// ======================================================

kazagumo.on(
  "playerStart",
  function(player, track) {

    console.log("");
    console.log("================================");
    console.log("▶️ PLAYER START");
    console.log("🎵 " + track.title);
    console.log("🔗 " + track.uri);
    console.log("================================");

  }
);

kazagumo.on(
  "playerEnd",
  function(player, track) {

    console.log("");
    console.log("================================");
    console.log("⏹️ PLAYER END");
    console.log(
      "Guild: " +
      player.guildId
    );

    if (track) {
      console.log(
        "🎵 " +
        track.title
      );
    }

    console.log("================================");

  }
);

kazagumo.on(
  "playerEmpty",
  function(player) {

    console.log("");
    console.log("================================");
    console.log("📭 QUEUE EMPTY");
    console.log(
      "Guild: " +
      player.guildId
    );
    console.log("================================");

  }
);

kazagumo.on(
  "playerClosed",
  function(player, data) {

    console.warn("");
    console.warn("================================");
    console.warn("🔌 PLAYER CLOSED");
    console.warn(
      "Guild: " +
      player.guildId
    );
    console.warn(data);
    console.warn("================================");

  }
);

kazagumo.on(
  "playerException",
  function(player, data) {

    console.error("");
    console.error("================================");
    console.error("❌ PLAYER EXCEPTION");
    console.error(data);
    console.error("================================");

  }
);

kazagumo.on(
  "playerStuck",
  function(player, data) {

    console.error("");
    console.error("================================");
    console.error("⚠️ PLAYER STUCK");
    console.error(data);
    console.error("================================");

  }
);

// ======================================================
// DISCORD READY
// ======================================================

client.once(
  "ready",
  async function() {

    console.log("");
    console.log("================================");
    console.log(
      "🎵 " +
      client.user.tag +
      " ONLINE"
    );
    console.log("================================");

    console.log(
      "🔊 Lavalink: " +
      LAVALINK_HOST +
      ":" +
      LAVALINK_PORT
    );

    console.log(
      "🎧 Menunggu koneksi Lavalink..."
    );

    // ================================================
    // REGISTER GUILD COMMANDS
    // ================================================

    try {

      const rest =
        new REST({
          version: "10"
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
          body: commands
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
// INTERACTION
// ======================================================

client.on(
  "interactionCreate",
  async function(interaction) {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    console.log("");
    console.log("================================");
    console.log("📥 INTERACTION RECEIVED");
    console.log(
      "Command: /" +
      interaction.commandName
    );
    console.log(
      "User: " +
      interaction.user.tag
    );
    console.log(
      "Guild: " +
      (
        interaction.guild
          ? interaction.guild.name
          : "DM"
      )
    );
    console.log("================================");

    // ==================================================
    // PLAY
    // ==================================================

    if (
      interaction.commandName === "play"
    ) {

      const voiceChannel =
        interaction.member &&
        interaction.member.voice
          ? interaction.member.voice.channel
          : null;

      if (!voiceChannel) {

        return interaction.reply({
          content:
            "❌ Kamu harus masuk voice channel dulu!",
          ephemeral: true
        });

      }

      const query =
        interaction.options.getString(
          "song",
          true
        );

      try {

        await interaction.deferReply();

        console.log(
          "✅ Discord interaction acknowledged!"
        );

        console.log("");
        console.log("================================");
        console.log("🎵 PLAY REQUEST");
        console.log("================================");
        console.log(
          "Guild: " +
          interaction.guild.name
        );
        console.log(
          "User: " +
          interaction.user.tag
        );
        console.log(
          "Voice: " +
          voiceChannel.name
        );
        console.log(
          "Voice ID: " +
          voiceChannel.id
        );
        console.log(
          "Song: " +
          query
        );
        console.log("================================");

        // ============================================
        // GET PLAYER
        // ============================================

        let player =
          kazagumo.players.get(
            interaction.guildId
          );

        // ============================================
        // CREATE PLAYER
        // ============================================

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

              deaf: true
            });

          console.log(
            "✅ Lavalink player berhasil dibuat!"
          );

        } else {

          console.log(
            "♻️ Player sudah ada."
          );

          if (
            player.voiceId !==
            voiceChannel.id
          ) {

            console.log(
              "🔄 Memindahkan player..."
            );

            await player.setVoiceChannel(
              voiceChannel.id
            );

          }

        }

        // ============================================
        // SEARCH
        // ============================================

        let searchQuery = query;

        if (
          query.indexOf(
            "soundcloud.com/"
          ) === -1
        ) {

          searchQuery =
            "scsearch:" +
            query;

        }

        console.log(
          "🔎 Search: " +
          searchQuery
        );

        const result =
          await kazagumo.search(
            searchQuery,
            {
              requester:
                interaction.user
            }
          );

        console.log(
          "📦 Result type: " +
          result.type
        );

        console.log(
          "🎵 Tracks found: " +
          result.tracks.length
        );

        if (
          !result.tracks.length
        ) {

          return interaction.editReply(
            "❌ Lagu tidak ditemukan."
          );

        }

        // ============================================
        // QUEUE
        // ============================================

        if (
          result.type === "PLAYLIST"
        ) {

          player.queue.add(
            result.tracks
          );

          console.log(
            "➕ " +
            result.tracks.length +
            " track ditambahkan."
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
            "🎵 " +
            track.title
          );
          console.log(
            "👤 " +
            track.author
          );
          console.log(
            "🔗 " +
            track.uri
          );

        }

        // ============================================
        // PLAY
        // ============================================

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
            "📥 Player sedang berjalan."
          );

        }

        // ============================================
        // RESPONSE
        // ============================================

        if (
          result.type === "PLAYLIST"
        ) {

          return interaction.editReply(
            "📚 " +
            result.tracks.length +
            " lagu masuk queue!"
          );

        }

        return interaction.editReply(
          "🎵 **" +
          result.tracks[0].title +
          "** masuk queue!"
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

        try {

          if (
            interaction.deferred ||
            interaction.replied
          ) {

            await interaction.editReply(
              "❌ Gagal memutar musik:\n" +
              "```" +
              (
                error.message ||
                "Unknown error"
              ) +
              "```"
            );

          }

        } catch (replyError) {

          console.error(
            "❌ Reply error:",
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
        ephemeral: true
      });

    }

    // ==================================================
    // SKIP
    // ==================================================

    if (
      interaction.commandName === "skip"
    ) {

      try {

        await player.skip();

        return interaction.reply(
          "⏭️ Lagu di-skip!"
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal skip.",
          ephemeral: true
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

        await player.pause(true);

        return interaction.reply(
          "⏸️ Musik dipause."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal pause.",
          ephemeral: true
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

        await player.pause(false);

        return interaction.reply(
          "▶️ Musik dilanjutkan."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal resume.",
          ephemeral: true
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

        await player.destroy();

        return interaction.reply(
          "⏹️ Musik dihentikan."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal stop.",
          ephemeral: true
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

        if (
          player.queue.length === 0
        ) {

          return interaction.reply(
            "📭 Queue kosong."
          );

        }

        const list =
          player.queue
            .slice(0, 10)
            .map(function(track, index) {

              return (
                (index + 1) +
                ". " +
                track.title
              );

            })
            .join("\n");

        return interaction.reply(
          "📜 **Queue:**\n" +
          list
        );

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            "❌ Gagal membaca queue.",
          ephemeral: true
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
  function(error) {

    console.error(
      "❌ Discord Client Error:",
      error
    );

  }
);

process.on(
  "unhandledRejection",
  function(error) {

    console.error(
      "❌ UNHANDLED REJECTION:",
      error
    );

  }
);

process.on(
  "uncaughtException",
  function(error) {

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
````
