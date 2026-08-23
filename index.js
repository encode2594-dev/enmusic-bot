const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  NoSubscriberBehavior,
} = require("@discordjs/voice");

const play = require("play-dl");
const ffmpegPath = require("ffmpeg-static");
const { spawn } = require("child_process");

// ========================================
// CONFIG
// ========================================

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = "1540915302370377749";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN tidak ditemukan!");
  process.exit(1);
}

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
// MUSIC STATE
// ========================================

const music = new Map();

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
].map(x => x.toJSON());

// ========================================
// GET GUILD MUSIC
// ========================================

function getMusic(guildId) {
  return music.get(guildId);
}

// ========================================
// PLAY STREAM
// ========================================

async function playTrack(guildId, track) {
  const data = music.get(guildId);

  if (!data) {
    throw new Error("Music session tidak ditemukan.");
  }

  console.log("");
  console.log("================================");
  console.log("🎵 STARTING AUDIO");
  console.log(`🎵 ${track.title}`);
  console.log(`🔗 ${track.url}`);
  console.log("================================");

  let stream;

  // ====================================
  // SOUNDCLOUD
  // ====================================

  if (track.url.includes("soundcloud.com")) {
    console.log("☁️ SoundCloud stream...");

    stream = await play.stream(track.url, {
      quality: 2,
      discordPlayerCompatibility: true,
    });

    console.log("✅ SoundCloud stream berhasil dibuat!");
  }

  // ====================================
  // YOUTUBE
  // ====================================

  else {
    console.log("▶️ YouTube/search stream...");

    const result = await play.search(track.url, {
      limit: 1,
      source: {
        youtube: "video",
      },
    });

    if (!result.length) {
      throw new Error("Lagu tidak ditemukan.");
    }

    stream = await play.stream(result[0].url, {
      quality: 2,
      discordPlayerCompatibility: true,
    });

    console.log("✅ YouTube stream berhasil dibuat!");
  }

  // ====================================
  // FFMPEG
  // ====================================

  console.log("🎬 Menjalankan FFmpeg...");
  console.log(`FFmpeg: ${ffmpegPath}`);

  const ffmpeg = spawn(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "warning",

      "-i",
      "pipe:0",

      "-vn",

      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",

      "pipe:1",
    ],
    {
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  // ====================================
  // PIPE INPUT
  // ====================================

  stream.stream.pipe(ffmpeg.stdin);

  ffmpeg.stderr.on("data", data => {
    const msg = data.toString().trim();

    if (msg) {
      console.log("FFMPEG:", msg);
    }
  });

  ffmpeg.on("error", error => {
    console.error("❌ FFmpeg error:", error);
  });

  ffmpeg.on("close", code => {
    console.log(`🎬 FFmpeg selesai. Code: ${code}`);
  });

  // ====================================
  // AUDIO RESOURCE
  // ====================================

  const resource = createAudioResource(
    ffmpeg.stdout,
    {
      inputType: StreamType.Raw,
      inlineVolume: true,
    }
  );

  resource.volume.setVolume(1.0);

  // ====================================
  // PLAY
  // ====================================

  data.player.play(resource);

  console.log("");
  console.log("================================");
  console.log("▶️ AUDIO PLAYER PLAYING");
  console.log(`🎵 ${track.title}`);
  console.log("================================");

  data.current = track;
}

// ========================================
// READY
// ========================================

client.once("clientReady", async () => {
  console.log("");
  console.log("================================");
  console.log(`🎵 ${client.user.tag} ONLINE`);
  console.log("================================");

  console.log(`🎬 FFmpeg: ${ffmpegPath}`);

  if (ffmpegPath) {
    console.log("✅ FFmpeg tersedia!");
  }

  try {
    const rest = new REST({
      version: "10",
    }).setToken(TOKEN);

    console.log("🔧 Registering guild commands...");

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
    console.error("❌ Command registration error:");
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

    await interaction.deferReply();

    // ==================================
    // PLAY
    // ==================================

    if (interaction.commandName === "play") {

      const voiceChannel =
        interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply(
          "❌ Kamu harus masuk voice channel dulu!"
        );
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
      console.log(`Guild: ${interaction.guild.name}`);
      console.log(`User: ${interaction.user.tag}`);
      console.log(`Voice: ${voiceChannel.name}`);
      console.log(`Voice ID: ${voiceChannel.id}`);
      console.log(`Song: ${query}`);
      console.log("================================");

      // --------------------------------
      // CREATE MUSIC SESSION
      // --------------------------------

      let data = getMusic(
        interaction.guildId
      );

      if (!data) {

        console.log("🔊 Membuat voice connection...");

        const connection =
          joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator:
              interaction.guild.voiceAdapterCreator,

            selfDeaf: true,
            selfMute: false,
          });

        console.log(
          "⏳ Menunggu voice connection..."
        );

        await entersState(
          connection,
          VoiceConnectionStatus.Ready,
          30000
        );

        console.log(
          "✅ Voice connection READY!"
        );

        const player =
          createAudioPlayer({
            behaviors: {
              noSubscriber:
                NoSubscriberBehavior.Play,
            },
          });

        connection.subscribe(player);

        data = {
          connection,
          player,
          queue: [],
          current: null,
        };

        music.set(
          interaction.guildId,
          data
        );

        // --------------------------------
        // PLAYER EVENTS
        // --------------------------------

        player.on(
          AudioPlayerStatus.Playing,
          () => {

            console.log("");
            console.log(
              "🎵 AUDIO PLAYER STATUS: PLAYING"
            );

            if (data.current) {
              console.log(
                `🎵 ${data.current.title}`
              );
            }
          }
        );

        player.on(
          AudioPlayerStatus.Idle,
          async () => {

            console.log("");
            console.log(
              "⏹️ AUDIO PLAYER STATUS: IDLE"
            );

            data.current = null;

            if (data.queue.length) {

              const next =
                data.queue.shift();

              try {
                await playTrack(
                  interaction.guildId,
                  next
                );
              } catch (error) {
                console.error(
                  "❌ Next track error:",
                  error
                );
              }

            } else {

              console.log(
                "📭 QUEUE EMPTY"
              );
            }
          }
        );

        player.on(
          "error",
          error => {
            console.error("");
            console.error(
              "================================"
            );
            console.error(
              "❌ AUDIO PLAYER ERROR"
            );
            console.error(
              "================================"
            );
            console.error(error);
          }
        );
      }

      // --------------------------------
      // FIND TRACK
      // --------------------------------

      let track;

      if (
        query.includes(
          "soundcloud.com/"
        )
      ) {

        console.log(
          "☁️ Membuka SoundCloud URL..."
        );

        const info =
          await play.soundcloud(query);

        track = {
          title: info.name,
          url: info.url,
        };

      } else {

        console.log(
          "🔎 Mencari lagu..."
        );

        const results =
          await play.search(
            query,
            {
              limit: 1,
              source: {
                soundcloud: "track",
                youtube: "video",
              },
            }
          );

        if (!results.length) {
          return interaction.editReply(
            "❌ Lagu tidak ditemukan."
          );
        }

        track = {
          title: results[0].title,
          url: results[0].url,
        };
      }

      console.log("");
      console.log(
        "➕ TRACK ADDED:"
      );
      console.log(track.title);

      // --------------------------------
      // IF PLAYING, QUEUE
      // --------------------------------

      if (
        data.player.state.status ===
        AudioPlayerStatus.Playing
      ) {

        data.queue.push(track);

        return interaction.editReply(
          `🎵 **${track.title}** masuk ke queue!`
        );
      }

      // --------------------------------
      // PLAY IMMEDIATELY
      // --------------------------------

      await playTrack(
        interaction.guildId,
        track
      );

      return interaction.editReply(
        `🎵 **${track.title}** sedang diputar!`
      );
    }

    // ==================================
    // GET SESSION
    // ==================================

    const data =
      getMusic(interaction.guildId);

    if (!data) {
      return interaction.editReply(
        "❌ Tidak ada musik."
      );
    }

    // ==================================
    // SKIP
    // ==================================

    if (
      interaction.commandName === "skip"
    ) {

      data.player.stop();

      return interaction.editReply(
        "⏭️ Lagu di-skip!"
      );
    }

    // ==================================
    // PAUSE
    // ==================================

    if (
      interaction.commandName === "pause"
    ) {

      data.player.pause();

      return interaction.editReply(
        "⏸️ Musik dipause."
      );
    }

    // ==================================
    // RESUME
    // ==================================

    if (
      interaction.commandName === "resume"
    ) {

      data.player.unpause();

      return interaction.editReply(
        "▶️ Musik dilanjutkan."
      );
    }

    // ==================================
    // STOP
    // ==================================

    if (
      interaction.commandName === "stop"
    ) {

      data.queue = [];
      data.current = null;

      data.player.stop();

      return interaction.editReply(
        "⏹️ Musik dihentikan."
      );
    }

    // ==================================
    // QUEUE
    // ==================================

    if (
      interaction.commandName === "queue"
    ) {

      if (!data.queue.length) {
        return interaction.editReply(
          "📭 Queue kosong."
        );
      }

      const list =
        data.queue
          .slice(0, 10)
          .map(
            (track, i) =>
              `${i + 1}. ${track.title}`
          )
          .join("\n");

      return interaction.editReply(
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

    try {
      await interaction.editReply(
        `❌ Error: ${error.message || error}`
      );
    } catch {}
  }
});

// ========================================
// CLIENT ERROR
// ========================================

client.on("error", error => {
  console.error(
    "❌ Discord client error:",
    error
  );
});

// ========================================
// LOGIN
// ========================================

console.log("🚀 Starting EnMusic...");

client.login(TOKEN);
