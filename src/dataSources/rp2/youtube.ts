import { exec } from "child_process";
import { promisify } from "util";
import { Link } from "../../models";

interface YouTubeUrl {
  title: string
  id: string
  _type: "url"
}

export async function youtubeUrlByTitle(playlistId: string, prefix = "re:publica 2023: "): Promise<Record<string, Link>> {
  const result: Record<string, Link> = {};
  const execAsync = promisify(exec);
  let stdout: string | undefined

  try {
    const which = await execAsync(`which yt-dlp`)
    console.info(which.stdout)
    const res = await execAsync(`yt-dlp --flat-playlist  -J "https://www.youtube.com/watch?list=${playlistId}"`)
    stdout = res.stdout;
    if (!stdout) {
      if (res.stderr) {
        console.error(`yt-dlp failed: ${res.stderr}`)    
      }
      return result;
    }
  } catch (error) {
    console.error(`yt-dlp failed: ${error}`)
    return result;
  }

  const parsed = JSON.parse(stdout) as Record<"entries", YouTubeUrl[]>

  for (const url of parsed.entries) {
    const title = url.title
      .replace(prefix, "")
    const titleWithoutDash = title.replace(/^.+ - /i, "")
    const youtubeUrl = `https://www.youtube.com/v/${url.id}`
    result[title] = {
      type: "recording",
      title,
      url: youtubeUrl,
      service: "youtube",
      thumbnail: `https://img.youtube.com/vi/${url.id}/default.jpg`
    }
    result[titleWithoutDash] = result[title]
  }
  return result;
}
