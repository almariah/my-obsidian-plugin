import { Platform, App, Notice, Modal, Setting } from 'obsidian';

export class YoutubeDownloader extends Modal {
    progressBars: Map<string, HTMLProgressElement>;

    constructor(app: App) {
        super(app);
        this.progressBars = new Map();
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Download YouTube Videos" });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Download Videos")
                    .setCta()
                    .onClick(async () => {
                        const urls = await this.extractYoutubeUrlsFromActiveFile();
                        if (urls && urls.length) {
                            urls.forEach((url, index) => {
                                const fileName = `DownloadedVideo_${index + 1}.mp4`;
                                this.createProgressBar(fileName);
                                this.downloadVideoToObsidian(url, fileName);
                            });
                        }
                    }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
        this.progressBars.clear();
    }

    createProgressBar(fileName: string) {
        const progressBar = this.contentEl.createEl("progress", {
            attr: {
                max: 100,
                value: 0
            }
        });
        this.contentEl.createEl('span', { text: ` Downloading ${fileName}` });
        this.progressBars.set(fileName, progressBar);
    }

    async extractYoutubeUrlsFromActiveFile() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active file selected.');
            return [];
        }

        const fileContent = await this.app.vault.read(activeFile);
        const urlMatches = [...fileContent.matchAll(/<iframe.*?src="(https:\/\/www\.youtube-nocookie\.com\/embed\/[^"]+)"/g)];
        if (urlMatches.length) {
            return urlMatches.map(match => this.convertEmbedUrlToWatchUrl(match[1]));
        } else {
            new Notice('No YouTube iframes found in the active file.');
            return [];
        }
    }

    convertEmbedUrlToWatchUrl(embedUrl: string) {
        const videoId = embedUrl.split('/').pop();
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    async downloadVideoToObsidian(url: string, obsidianPath: string) {
        // Check if the platform is desktop
        if (Platform.isDesktop) {
            try {
                // Dynamically import the ytdl-core module
                const ytdl = await import('ytdl-core');

                const videoStream = ytdl.default(url, { quality: 'highest', filter: 'audioandvideo' });
                const chunks: Buffer[] = [];

                videoStream.on('data', chunk => chunks.push(chunk));
                videoStream.on('end', async () => {
                    const buffer = Buffer.concat(chunks);
                    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

                    console.log('Video downloading...');
                    await this.app.vault.adapter.writeBinary(obsidianPath, arrayBuffer);
                    console.log('Video downloaded successfully to Obsidian!');
                });
            } catch (error) {
                console.error('Error downloading video:', error);
            }
        } else {
            new Notice('Video download is available only on desktop platform.');
        }
    }
}


