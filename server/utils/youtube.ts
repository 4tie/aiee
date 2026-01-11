import path from "path";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function searchYoutube(query: string): Promise<any[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn("YOUTUBE_API_KEY not set, using mock search");
    return [];
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return (data.items || []).map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high.url,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  }));
}

export async function getLibraryVideos(): Promise<any[]> {
  // Since we don't have OAuth setup for "real account data" easily without a user login flow,
  // we'll fetch popular music videos or a default set from a specific channel if possible,
  // or just return some high-quality defaults for the "library" feel using search.
  return searchYoutube("lofi hip hop radio");
}

export async function downloadYoutubeMusic(url: string): Promise<string> {
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').trim() || "downloaded_music";
    const userdataDir = path.join(process.cwd(), "userdata");
    const downloadPath = path.join(userdataDir, `${title}.mp3`);

    // Ensure directory exists
    await fs.mkdir(userdataDir, { recursive: true });

    console.log(`Starting download for: ${title} from ${url}`);

    return new Promise((resolve, reject) => {
      const stream = ytdl(url, {
        filter: "audioonly",
        quality: "highestaudio",
      });

      ffmpeg(stream)
        .audioBitrate(128)
        .toFormat('mp3')
        .on("start", (commandLine) => {
          console.log('Spawned FFmpeg with command: ' + commandLine);
        })
        .on("end", () => {
          console.log(`Download completed: ${downloadPath}`);
          resolve(title);
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .save(downloadPath);
    });
  } catch (error) {
    console.error("YouTube download setup failed:", error);
    throw error;
  }
}
