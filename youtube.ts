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

        if (Platform.isDesktop) {
            new Notice('Video download is available only on the desktop platform.');
            return
        }

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

        if (urls && urls.length) {
            for (let index = 0; index < urls.length; index++) {
                const url = urls[index];
                this.createProgressBar(url);
                this.downloadVideoToObsidian(url);
            }
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

    createProgressBar(fileName: string) {
        new Setting(this.contentEl)
            .setName(`Downloading: ${fileName}`)
            .addProgressBar((progressBar) => {
                // Logic to initialize and update the progress bar
                // You can store the progressBar reference in this.progressBars if needed
                progressBar.setValue(0); // Initialize with 0
                //progressBar.setIndeterminate(false); // Set if the progress is determinate or indeterminate
    
                // Store the progressBar reference to update it later
                this.progressBars.set(fileName, progressBar);
            });
    }

    async extractYoutubeUrlsFromActiveFile() {
        if (!this.activeFile) {
            new Notice('No active file selected.');
            return [];
        }

        const fileContent = await this.app.vault.read(this.activeFile);

        //const urlMatches = [...fileContent.matchAll(/<iframe.*?src="(https:\/\/www\.youtube-nocookie\.com\/embed\/[^"]+)"/g)];

        const urlMatches = [
            ...fileContent.matchAll(/<iframe.*?src="(https:\/\/www\.youtube-nocookie\.com\/embed\/[^"]+)"/g),
            ...fileContent.matchAll(/!\[.*?\]\((https:\/\/youtu\.be\/[^)]+)\)/g),
            ...fileContent.matchAll(/!\[.*?\]\((https:\/\/www\.youtube\.com\/watch\?v=[^)]+)\)/g)
        ];

        if (urlMatches.length) {
            return urlMatches.map(match => {
                if (match[1].includes('youtube-nocookie.com/embed')) {
                    // Convert embed URL to watch URL for iframe links
                    //return this.convertEmbedUrlToWatchUrl(match[1]);
                    return match[1];
                } else {
                    // Use the URL directly for Markdown image syntax links
                    return match[1];
                }
            });
        }
        return []
    }

    convertEmbedUrlToWatchUrl(embedUrl: string) {
        const videoId = embedUrl.split('/').pop();
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    async downloadVideoToObsidian(url: string) {
        // Check if the platform is desktop
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

                const videoPath = `_media/videos/${this.activeFile.basename} (${this.getVideoID(url)}).mp4`;

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

    getVideoID(url: string) {
        if (url.includes('https://www.youtube-nocookie.com/embed/')) {
            return url.replace("https://www.youtube-nocookie.com/embed/", "");
        }
        return new URL(url).searchParams.get('v');
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
}
