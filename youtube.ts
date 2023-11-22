import { Platform, App, Notice, Modal, Setting, TFile, ProgressBarComponent } from 'obsidian';

import { escapeRegExp } from 'utils';

export class YoutubeDownloader extends Modal {
    progressBars: Map<string, ProgressBarComponent>;
    originalFileContent: string;
    activeFile: TFile | null;
    ongoingDownloads: Set<string> = new Set();

    constructor(app: App) {
        super(app);
        this.progressBars = new Map();
    }

    async onOpen() {
        this.containerEl.addClass('youtube')
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Download YouTube Videos" });

        this.activeFile = this.app.workspace.getActiveFile();
        if (!this.activeFile) {
            new Notice('No active file selected.');
            return;
        }

        this.originalFileContent = await this.app.vault.read(this.activeFile);

        const urls = await this.extractYoutubeUrlsFromActiveFile();
        if (!urls.length) {
            contentEl.createEl("p", { text: "No YouTube videos found." });
            return
        }

        for (let index = 0; index < urls.length; index++) {
            const url = urls[index];
            const videoPath = `_media/videos/${this.getVideoID(url)}.mp4`
            const exist = this.app.vault.getAbstractFileByPath(videoPath)
            if (exist) {
                await this.replaceIframeWithLink(url, `![[${videoPath}]]`);
                this.createAlreadyExistVideo(url)
                continue
            }
            this.createProgressBar(url);
            this.downloadVideoToObsidian(url, videoPath);
        }
    }

    getVideoID(url: string) {
        if (url.includes('https://www.youtube-nocookie.com/embed/')) {
            return url.replace("https://www.youtube-nocookie.com/embed/", "");
        }
        return new URL(url).searchParams.get('v');
    }

    createAlreadyExistVideo(fileName: string) {
        new Setting(this.contentEl)
            .setName(`Already existing: ${fileName}`)
    }

    createProgressBar(fileName: string) {
        new Setting(this.contentEl)
            .setName(`Downloading: ${fileName}`)
            .addProgressBar((progressBar) => {
                progressBar.setValue(0);
                this.progressBars.set(fileName, progressBar);
            });
    }

    async extractYoutubeUrlsFromActiveFile() {
        const urlMatches = [
            ...this.originalFileContent.matchAll(/<iframe.*?src="(https:\/\/www\.youtube-nocookie\.com\/embed\/[^"]+)"/g),
            ...this.originalFileContent.matchAll(/!\[.*?\]\((https:\/\/youtu\.be\/[^)]+)\)/g),
            ...this.originalFileContent.matchAll(/!\[.*?\]\((https:\/\/www\.youtube\.com\/watch\?v=[^)]+)\)/g)
        ];

        return urlMatches.map(match => match[1]);
    }

    convertEmbedUrlToWatchUrl(embedUrl: string) {
        const videoId = embedUrl.split('/').pop();
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    async downloadVideoToObsidian(url: string, videoPath: string) {
        if (Platform.isDesktop) {
            try {
                // Dynamically import the ytdl-core module
                const ytdl = await import('ytdl-core');

                let dUrl = url;

                if (url.includes('youtube-nocookie.com/embed')) {
                    dUrl = this.convertEmbedUrlToWatchUrl(url);
                }

                const videoStream = ytdl.default(dUrl, { quality: 'highestvideo', filter: 'audioandvideo' });
                const chunks: Buffer[] = [];

                let downloaded = 0;
                let totalSize = 0;

                if (!this.activeFile) {
                    return;
                }

                // Add the URL to ongoingDownloads
                this.ongoingDownloads.add(url);

                videoStream.on('response', response => {
                    totalSize = parseInt(response.headers['content-length'], 10);
                });

                videoStream.on('data', chunk => {
                    if (!this.ongoingDownloads.has(url)) {
                        videoStream.destroy(); // Cancel the download
                        return;
                    }

                    chunks.push(chunk);
                    downloaded += chunk.length;
                    const progress = (downloaded / totalSize) * 100;
                    const progressBar = this.progressBars.get(url);
                    if (progressBar) {
                        progressBar.setValue(progress);
                    }
                });

                videoStream.on('end', async () => {
                    // Remove the URL from ongoingDownloads
                    this.ongoingDownloads.delete(url);

                    const buffer = Buffer.concat(chunks);
                    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

                    await this.app.vault.adapter.writeBinary(videoPath, arrayBuffer);
                    await this.replaceIframeWithLink(url, `![[${videoPath}]]`);
                    const progressBar = this.progressBars.get(url);
                    if (progressBar) {
                        progressBar.setValue(100);
                    }
                });
            } catch (error) {
                console.error('Error downloading video:', error);
            }
        }
    }

    async replaceIframeWithLink(originalUrl: string, markdownLink: string) {
        if (originalUrl.includes('youtube-nocookie.com/embed')) {
            this.originalFileContent = this.originalFileContent.replace(
                new RegExp(`<iframe.*?src="${escapeRegExp(originalUrl)}".*?<\/iframe>`, 'g'),
                markdownLink
            );
        } else {
            this.originalFileContent = this.originalFileContent.replace(
                new RegExp(`!\\[.*\\]\\(${escapeRegExp(originalUrl)}\\)`, 'g'),
                markdownLink
            );
        }
        if (this.activeFile) {
            await this.app.vault.modify(this.activeFile, this.originalFileContent);
        }
    }

    onClose() {
        for (const url of this.ongoingDownloads) {
            // Cancel ongoing downloads by removing them from the ongoingDownloads set
            this.ongoingDownloads.delete(url);
            new Notice(`Download: "${url}" have been canceled!`)
        }

        let { contentEl } = this;
        contentEl.empty();
        this.progressBars.clear();
    }
}
