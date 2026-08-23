```js
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField
} = require("discord.js");

const {
  Player
} = require("discord-player");

const {
  DefaultExtractors
} = require("@discord-player/extractor");

const ffmpegPath = require("ffmpeg-static");

// =====================================================
// CONFIG
// =====================================================

const TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN;

const CLIENT_ID =
  process.env.CLIENT_ID ||
  process.env.DISCORD_CLIENT_ID;

const GUILD_ID =
  process.env.GUILD_ID ||
  "1540915302370377749";

// =====================================================
// CHECK CONFIG
// =====================================================

if (!TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN / TOKEN tidak ditemukan!"
  );

  process.exit(1);
}

if (!CLIENT_ID) {
  console.error(
    "❌ CLIENT_ID / DISCORD_CLIENT_ID tidak ditemukan!"
  );

  process.exit(1);
}

// =====================================================
// FFMPEG
// =====================================================

process.env.FFMPEG_PATH = ffmpegPath;

console.log("================================");
console.log("🎬 FFMPEG CHECK");
console.log("================================");

console.log(
  "FFmpeg path: " +
  ffmpegPath
);

if (!ffmpegPath) {
  console.error(
    "❌ FFmpeg tidak ditemukan!"
  );

  process.exit(1);
}

console.log(
  "✅ FFmpeg tersedia!"
);

// =====================================================
// DISCORD CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// =====================================================
// DISCORD PLAYER
// =====================================================

const player = new Player(client);

console.log("================================");
console.log("🚀 Starting EnMusic...");
console.log("================================");

// =====================================================
// DEBUG
// =====================================================

player.on(
  "debug",
  function(message) {
    console.log(
      "🐛 PLAYER: " +
      message
    );
  }
);

// =====================================================
// PLAYER EVENTS
// =====================================================

player.events.on(
  "playerStart",
  function(queue, track) {

    console.log("================================");
    console.log("▶️ PLAYER START");
    console.log(
      "🎵 " +
      track.title
    );
    console.log(
      "🔗 " +
      track.url
    );
    console.log("================================");

  }
);

player.events.on(
  "playerFinish",
  function(queue, track) {

    console.log("================================");
    console.log("⏹️ PLAYER FINISH");

    if (track) {
      console.log(
        "🎵 " +
        track.title
      );
    }

    console.log("================================");

  }
);

player.events.on(
  "error",
  function(queue, error) {

    console.error("================================");
    console.error("❌ PLAYER ERROR");
    console.error(error);
    console.error("================================");

  }
);

player.events.on(
  "playerError",
  function(queue, error) {

    console.error("================================");
    console.error("❌ PLAYER STREAM ERROR");
    console.error(error);
    console.error("================================");

  }
);

player.events.on(
  "emptyQueue",
  function(queue) {

    console.log(
      "📭 QUEUE EMPTY"
    );

  }
);

player.events.on(
  "disconnect",
  function(queue) {

    console.log(
      "🔌 Bot disconnect dari voice channel"
    );

  }
);

player.events.on(
  "connectionError",
  function(queue, error) {

    console.error("================================");
    console.error("❌ VOICE CONNECTION ERROR");
    console.error(error);
    console.error("================================");

  }
);

// =====================================================
// SLASH COMMANDS
// =====================================================

const playCommand =
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Putar musik")
    .addStringOption(
      function(option) {

        return option
          .setName("song")
          .setDescription(
            "URL SoundCloud atau nama lagu"
          )
          .setRequired(true);

      }
    );

const stopCommand =
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Hentikan musik");

const skipCommand =
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Lewati lagu");

const pauseCommand =
  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause musik");

const resumeCommand =
  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Lanjutkan musik");

const commands = [
  playCommand.toJSON(),
  stopCommand.toJSON(),
  skipCommand.toJSON(),
  pauseCommand.toJSON(),
  resumeCommand.toJSON()
];

// =====================================================
// REGISTER COMMANDS
// =====================================================

async function registerCommands() {

  try {

    console.log("================================");
    console.log(
      "🔧 Registering guild commands..."
    );

    const rest =
      new REST({
        version: "10"
      }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log(
      "✅ GUILD COMMANDS REGISTERED"
    );

    console.log("================================");

  } catch (error) {

    console.error(
      "❌ COMMAND REGISTER ERROR"
    );

    console.error(error);

  }

}

// =====================================================
// READY
// =====================================================

client.once(
  "ready",
  async function() {

    console.log("================================");

    console.log(
      "🎵 " +
      client.user.tag +
      " ONLINE"
    );

    console.log("================================");

    console.log(
      "🎬 FFmpeg: " +
      process.env.FFMPEG_PATH
    );

    try {

      console.log(
        "🔍 Loading SoundCloud extractor..."
      );

      await player.extractors.loadMulti(
        DefaultExtractors
      );

      console.log(
        "✅ Extractor berhasil dimuat!"
      );

      console.log(
        "🎧 SoundCloud siap!"
      );

      await registerCommands();

      console.log("================================");
      console.log(
        "🟢 ENMUSIC SIAP DIGUNAKAN"
      );
      console.log("================================");

    } catch (error) {

      console.error(
        "❌ PLAYER INITIALIZATION ERROR"
      );

      console.error(error);

    }

  }
);

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async function(interaction) {

    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    console.log("================================");
    console.log(
      "📥 INTERACTION RECEIVED"
    );

    console.log(
      "Command: /" +
      interaction.commandName
    );

    console.log(
      "User: " +
      interaction.user.username
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

    // =================================================
    // PLAY
    // =================================================

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

      const botMember =
        interaction.guild.members.me;

      if (!botMember) {

        return interaction.reply({
          content:
            "❌ Data bot tidak ditemukan.",
          ephemeral: true
        });

      }

      const permissions =
        voiceChannel.permissionsFor(
          botMember
        );

      if (
        !permissions ||
        !permissions.has(
          PermissionsBitField.Flags.Connect
        )
      ) {

        return interaction.reply({
          content:
            "❌ Bot tidak punya permission Connect.",
          ephemeral: true
        });

      }

      if (
        !permissions.has(
          PermissionsBitField.Flags.Speak
        )
      ) {

        return interaction.reply({
          content:
            "❌ Bot tidak punya permission Speak.",
          ephemeral: true
        });

      }

      const query =
        interaction.options.getString(
          "song",
          true
        );

      console.log("================================");
      console.log("🎵 PLAY REQUEST");
      console.log("================================");

      console.log(
        "Guild: " +
        interaction.guild.name
      );

      console.log(
        "User: " +
        interaction.user.username
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

      await interaction.deferReply();

      try {

        const mainPlayer =
          player;

        console.log(
          "🔊 Mencoba connect ke voice..."
        );

        console.log(
          "🔎 Query: " +
          query
        );

        const result =
          await mainPlayer.play(
            voiceChannel,
            query,
            {
              nodeOptions: {

                metadata: {
                  channel:
                    interaction.channel,

                  requestedBy:
                    interaction.user
                },

                bufferingTimeout:
                  15000,

                leaveOnStop:
                  true,

                leaveOnStopCooldown:
                  5000,

                leaveOnEnd:
                  true,

                leaveOnEndCooldown:
                  10000,

                leaveOnEmpty:
                  true,

                leaveOnEmptyCooldown:
                  300000,

                skipOnNoStream:
                  false

              }
            }
          );

        console.log("================================");
        console.log("➕ TRACK ADDED");

        console.log(
          "🎵 " +
          result.track.title
        );

        console.log(
          "🔗 " +
          result.track.url
        );

        console.log("================================");

        await interaction.editReply(
          "🎵 **" +
          result.track.title +
          "** masuk queue!"
        );

        console.log(
          "✅ player.play() selesai!"
        );

      } catch (error) {

        console.error("================================");
        console.error(
          "❌ PLAY ERROR"
        );
        console.error(error);
        console.error("================================");

        try {

          await interaction.editReply(
            "❌ Gagal memutar musik.\n" +
            "`" +
            (
              error.message ||
              "Unknown error"
            ) +
            "`"
          );

        } catch (replyError) {

          console.error(
            "❌ Reply error:"
          );

          console.error(
            replyError
          );

        }

      }

      return;

    }

    // =================================================
    // GET QUEUE
    // =================================================

    const queue =
      player.nodes.get(
        interaction.guild.id
      );

    // =================================================
    // STOP
    // =================================================

    if (
      interaction.commandName === "stop"
    ) {

      try {

        if (!queue) {

          return interaction.reply(
            "❌ Tidak ada musik."
          );

        }

        queue.delete();

        return interaction.reply(
          "⏹️ Musik dihentikan."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply(
          "❌ Gagal stop."
        );

      }

    }

    // =================================================
    // SKIP
    // =================================================

    if (
      interaction.commandName === "skip"
    ) {

      try {

        if (
          !queue ||
          !queue.isPlaying()
        ) {

          return interaction.reply(
            "❌ Tidak ada musik."
          );

        }

        queue.node.skip();

        return interaction.reply(
          "⏭️ Lagu di-skip."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply(
          "❌ Gagal skip."
        );

      }

    }

    // =================================================
    // PAUSE
    // =================================================

    if (
      interaction.commandName === "pause"
    ) {

      try {

        if (!queue) {

          return interaction.reply(
            "❌ Tidak ada musik."
          );

        }

        queue.node.pause();

        return interaction.reply(
          "⏸️ Musik dipause."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply(
          "❌ Gagal pause."
        );

      }

    }

    // =================================================
    // RESUME
    // =================================================

    if (
      interaction.commandName === "resume"
    ) {

      try {

        if (!queue) {

          return interaction.reply(
            "❌ Tidak ada musik."
          );

        }

        queue.node.resume();

        return interaction.reply(
          "▶️ Musik dilanjutkan."
        );

      } catch (error) {

        console.error(error);

        return interaction.reply(
          "❌ Gagal resume."
        );

      }

    }

  }
);

// =====================================================
// ERROR HANDLERS
// =====================================================

client.on(
  "error",
  function(error) {

    console.error(
      "❌ DISCORD CLIENT ERROR"
    );

    console.error(error);

  }
);

process.on(
  "unhandledRejection",
  function(error) {

    console.error(
      "❌ UNHANDLED REJECTION"
    );

    console.error(error);

  }
);

process.on(
  "uncaughtException",
  function(error) {

    console.error(
      "❌ UNCAUGHT EXCEPTION"
    );

    console.error(error);

  }
);

// =====================================================
// LOGIN
// =====================================================

console.log(
  "🔐 Connecting to Discord..."
);

client.login(TOKEN);
```
