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

const ffmpeg = require("ffmpeg-static");
const youtubedl = require("youtube-dl-exec");
const { spawn } = require("child_process");

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// =====================================================
// DATA
// =====================================================

const queues = new Map();

// =====================================================
// COMMANDS
// =====================================================

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Putar musik")
    .addStringOption(option =>
      option
        .setName("song")
        .setDescription("URL SoundCloud / YouTube")
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

// =====================================================
// HELPERS
// =====================================================

function getQueue(guildId) {
  return queues.get(guildId);
}

function createQueue(guildId) {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  const queue = {
    guildId,
    voiceChannelId: null,
    connection: null,
    player,
    tracks: [],
    current: null,
    playing: false,
    ffmpeg: null,
    ytdlp: null,
  };

  player.on(AudioPlayerStatus.Playing, () => {
    console.log("================================");
    console.log("▶️ AUDIO PLAYER PLAYING");
    console.log("================================");

    if (queue.current) {
      console.log(
        "🎵",
        queue.current.title
      );
    }

    queue.playing = true;
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("⏹️ AUDIO PLAYER IDLE");

    queue.playing = false;

    cleanupProcesses(queue);

    if (queue.current) {
      console.log(
        "✅ SELESAI:",
        queue.current.title
      );
    }

    queue.current = null;

    if (queue.tracks.length > 0) {
      playNext(queue);
    }
  });

  player.on("error", error => {
    console.error("❌ AUDIO PLAYER ERROR:");
    console.error(error);

    queue.playing = false;

    cleanupProcesses(queue);

    queue.current = null;

    if (queue.tracks.length > 0) {
      setTimeout(() => {
        playNext(queue);
      }, 500);
    }
  });

  queues.set(guildId, queue);

  return queue;
}

function cleanupProcesses(queue) {
  if (queue.ffmpeg) {
    try {
      queue.ffmpeg.kill("SIGKILL");
    } catch {}
    queue.ffmpeg = null;
  }

  if (queue.ytdlp) {
    try {
      queue.ytdlp.kill("SIGKILL");
    } catch {}
    queue.ytdlp = null;
  }
}

// =====================================================
// VOICE CONNECTION
// =====================================================

async function connectVoice(queue, voiceChannel) {

  if (
    queue.connection &&
    queue.voiceChannelId === voiceChannel.id
  ) {
    try {
      await entersState(
        queue.connection,
        VoiceConnectionStatus.Ready,
        15000
      );

      return queue.connection;
    } catch {
      try {
        queue.connection.destroy();
      } catch {}

      queue.connection = null;
    }
  }

  console.log(
    "🔊 CONNECT:",
    voiceChannel.name
  );

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator:
      voiceChannel.guild.voiceAdapterCreator,

    selfDeaf: true,
    selfMute: false,
  });

  queue.connection = connection;
  queue.voiceChannelId = voiceChannel.id;

  console.log(
    "⏳ Menunggu Discord voice READY..."
  );

  await entersState(
    connection,
    VoiceConnectionStatus.Ready,
    20000
  );

  console.log(
    "✅ Voice READY!"
  );

  connection.subscribe(queue.player);

  console.log(
    "✅ Audio player subscribed!"
  );

  return connection;
}

// =====================================================
// EXTRACT STREAM
// =====================================================

async function getStreamInfo(url) {

  console.log("");
  console.log("🎬 EXTRACTING STREAM");
  console.log("URL:", url);

  const info = await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    noCheckCertificates: true,
    preferFreeFormats: true,

    format:
      "bestaudio/best",

    skipDownload: true,
  });

  if (!info) {
    throw new Error(
      "yt-dlp tidak mengembalikan data."
    );
  }

  console.log(
    "🎵 TITLE:",
    info.title
  );

  console.log(
    "⏱️ DURATION:",
    info.duration
  );

  return {
    title: info.title || "Unknown",
    url: info.url,
  };
}

// =====================================================
// PLAY NEXT
// =====================================================

async function playNext(queue) {

  if (queue.playing) {
    return;
  }

  if (!queue.tracks.length) {

    console.log(
      "📭 QUEUE EMPTY"
    );

    return;
  }

  const track =
    queue.tracks.shift();

  queue.current = track;
  queue.playing = true;

  console.log("");
  console.log("================================");
  console.log("🎵 PLAYING");
  console.log("================================");

  console.log(
    "TITLE:",
    track.title
  );

  console.log(
    "URL:",
    track.url
  );

  try {

    // =============================================
    // GET FRESH STREAM URL
    // =============================================

    const streamInfo =
      await getStreamInfo(
        track.url
      );

    // =============================================
    // YT-DLP STREAM
    // =============================================

    console.log(
      "🔊 Starting yt-dlp..."
    );

    const ytdlpProcess =
      youtubedl.exec(
        track.url,
        {
          output: "-",
          format:
            "bestaudio/best",

          noWarnings: true,
          noCallHome: true,
          noCheckCertificates: true,

          preferFreeFormats: true,
        }
      );

    queue.ytdlp =
      ytdlpProcess;

    // =============================================
    // FFMPEG
    // =============================================

    console.log(
      "🎬 Starting FFmpeg..."
    );

    const ffmpegProcess =
      spawn(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",

          "-i",
          "pipe:0",

          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",

          "pipe:1",
        ],
        {
          stdio: [
            "pipe",
            "pipe",
            "pipe",
          ],
        }
      );

    queue.ffmpeg =
      ffmpegProcess;

    // =============================================
    // PIPE YTDLP -> FFMPEG
    // =============================================

    ytdlpProcess.stdout.pipe(
      ffmpegProcess.stdin
    );

    // =============================================
    // FFMPEG ERROR
    // =============================================

    ffmpegProcess.stderr.on(
      "data",
      data => {
        const message =
          data.toString().trim();

        if (message) {
          console.error(
            "FFMPEG:",
            message
          );
        }
      }
    );

    ytdlpProcess.stderr.on(
      "data",
      data => {
        const message =
          data.toString().trim();

        if (message) {
          console.error(
            "YT-DLP:",
            message
          );
        }
      }
    );

    // =============================================
    // PROCESS ERRORS
    // =============================================

    ytdlpProcess.on(
      "error",
      error => {
        console.error(
          "❌ YT-DLP ERROR:",
          error
        );
      }
    );

    ffmpegProcess.on(
      "error",
      error => {
        console.error(
          "❌ FFMPEG ERROR:",
          error
        );
      }
    );

    // =============================================
    // AUDIO RESOURCE
    // =============================================

    const resource =
      createAudioResource(
        ffmpegProcess.stdout,
        {
          inputType:
            StreamType.Raw,

          inlineVolume: false,
        }
      );

    console.log(
      "🎧 AudioResource created!"
    );

    queue.player.play(
      resource
    );

    console.log(
      "🚀 Audio sent to Discord!"
    );

  } catch (error) {

    console.error(
      "❌ PLAY NEXT ERROR:"
    );

    console.error(error);

    cleanupProcesses(queue);

    queue.current = null;
    queue.playing = false;

    if (queue.tracks.length > 0) {
      setTimeout(() => {
        playNext(queue);
      }, 1000);
    }
  }
}

// =====================================================
// READY
// =====================================================

client.once("clientReady", async () => {

  console.log("");
  console.log("================================");
  console.log(
    `🎵 ${client.user.tag} ONLINE`
  );
  console.log("================================");

  console.log(
    "FFmpeg:",
    ffmpeg
  );

  try {

    const rest =
      new REST({
        version: "10",
      }).setToken(
        process.env.DISCORD_TOKEN
      );

    await rest.put(
      Routes.applicationCommands(
        client.user.id
      ),
      {
        body: commands,
      }
    );

    console.log(
      "✅ Slash commands registered!"
    );

  } catch (error) {

    console.error(
      "❌ COMMAND REGISTER ERROR:"
    );

    console.error(error);
  }
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    try {

      // =============================================
      // PLAY
      // =============================================

      if (
        interaction.commandName ===
        "play"
      ) {

        const voiceChannel =
          interaction.member.voice.channel;

        if (!voiceChannel) {

          return interaction.reply(
            "❌ Masuk voice channel dulu!"
          );
        }

        const song =
          interaction.options.getString(
            "song",
            true
          );

        await interaction.deferReply();

        console.log("");
        console.log(
          "================================"
        );
        console.log(
          "🎵 PLAY REQUEST"
        );
        console.log(
          "================================"
        );

        console.log(
          "Guild:",
          interaction.guild.name
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
          "Song:",
          song
        );

        // =========================================
        // QUEUE
        // =========================================

        let queue =
          getQueue(
            interaction.guildId
          );

        if (!queue) {
          queue =
            createQueue(
              interaction.guildId
            );
        }

        // =========================================
        // CONNECT
        // =========================================

        await connectVoice(
          queue,
          voiceChannel
        );

        // =========================================
        // ADD TRACK
        // =========================================

        queue.tracks.push({
          title: song,
          url: song,
        });

        console.log(
          "➕ Added to queue:",
          song
        );

        // =========================================
        // START
        // =========================================

        if (!queue.playing) {

          queue.playing = false;

          await playNext(
            queue
          );
        }

        return interaction.editReply(
          `🎵 **${song}** masuk queue!`
        );
      }

      // =============================================
      // QUEUE
      // =============================================

      const queue =
        getQueue(
          interaction.guildId
        );

      if (!queue) {

        return interaction.reply(
          "📭 Queue kosong."
        );
      }

      // =============================================
      // SKIP
      // =============================================

      if (
        interaction.commandName ===
        "skip"
      ) {

        if (!queue.current) {

          return interaction.reply(
            "❌ Tidak ada lagu."
          );
        }

        console.log(
          "⏭️ SKIP:"
        );

        cleanupProcesses(queue);

        queue.player.stop();

        return interaction.reply(
          "⏭️ Lagu di-skip!"
        );
      }

      // =============================================
      // PAUSE
      // =============================================

      if (
        interaction.commandName ===
        "pause"
      ) {

        queue.player.pause();

        return interaction.reply(
          "⏸️ Musik dipause."
        );
      }

      // =============================================
      // RESUME
      // =============================================

      if (
        interaction.commandName ===
        "resume"
      ) {

        queue.player.unpause();

        return interaction.reply(
          "▶️ Musik dilanjutkan."
        );
      }

      // =============================================
      // STOP
      // =============================================

      if (
        interaction.commandName ===
        "stop"
      ) {

        cleanupProcesses(queue);

        queue.tracks = [];

        queue.current = null;

        queue.player.stop();

        if (queue.connection) {

          try {
            queue.connection.destroy();
          } catch {}

          queue.connection =
            null;
        }

        queues.delete(
          interaction.guildId
        );

        return interaction.reply(
          "⏹️ Musik dihentikan."
        );
      }

      // =============================================
      // QUEUE
      // =============================================

      if (
        interaction.commandName ===
        "queue"
      ) {

        let text =
          "📜 **QUEUE**\n\n";

        if (queue.current) {

          text +=
            `▶️ ${queue.current.title}\n\n`;
        }

        if (!queue.tracks.length) {

          text +=
            "📭 Tidak ada lagu berikutnya.";

        } else {

          text +=
            queue.tracks
              .slice(0, 10)
              .map(
                (track, index) =>
                  `${index + 1}. ${track.url}`
              )
              .join("\n");
        }

        return interaction.reply(
          text
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

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        await interaction.editReply(
          `❌ Error: ${error.message}`
        );

      } else {

        await interaction.reply(
          `❌ Error: ${error.message}`
        );
      }
    }
  }
);

// =====================================================
// GLOBAL ERROR
// =====================================================

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

// =====================================================
// LOGIN
// =====================================================

client.login(
  process.env.DISCORD_TOKEN
);
