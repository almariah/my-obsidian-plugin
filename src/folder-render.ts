import { App, TFile, FrontMatterCache, Notice, MarkdownRenderer, MarkdownPostProcessorContext } from 'obsidian';
import * as Yaml from 'yaml';

export class FolderRender {
    app: App;

    constructor(app: App) {
        this.app = app
    }

    async run(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {

        let yaml;
        try {
            yaml = Yaml.parse(source);
            if (!yaml) return;
        }
        catch (error) {
            new Notice(error);
            return
        }

        const folderPath = yaml.folderPath

        // filter tags
        const tags: string[] = yaml.tags || []

        let pathList = await this.app.vault.adapter.list(folderPath);
        const subFileList = pathList.files;

        // check tags and sort by birth date if exist (BC also handled)

        var mappedAndSortedFiles = subFileList.map(subFilePath => {
            let abstractFile = this.app.vault.getAbstractFileByPath(subFilePath);
            if (abstractFile instanceof TFile) {
                let metadata = this.app.metadataCache.getFileCache(abstractFile)?.frontmatter;
                let date = this.parseBirthDate(metadata?.birth_date);
                let hasDesiredTag = tags.every((tag: string) => (metadata?.tags || []).includes(tag));
                return { subFilePath, date, valid: hasDesiredTag };
            }
            return { subFilePath, date: 0, valid: false };
        }).filter(file => file.valid)
            .sort((a, b) => a.date - b.date);

        // iterate over MD files and create cards
        for (var i = 0; i < mappedAndSortedFiles.length; i++) {
            var { subFilePath } = mappedAndSortedFiles[i];
            if (!subFilePath.endsWith('.md')) continue;

            let file = this.app.vault.getAbstractFileByPath(subFilePath);
            if (file instanceof TFile) {
                const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (metadata) {
                    const card = this.createCard(folderPath, metadata, file.basename)
                    el.appendChild(card);
                }
            }
        }
    }

    parseBirthDate(birthDate: string) {
        if (!birthDate) return 0;
        let year = parseInt(birthDate);
        if (birthDate.includes('BC')) {
            year = -year;
        }
        return year;
    }

    createCard(folder: string, metadata: FrontMatterCache, basename: string): HTMLElement {
        const cardEl = document.createElement('div');
        cardEl.className = 'folder-card';

        // Create the container for the card content and the image
        const cardContentEl = document.createElement('div');
        cardContentEl.className = 'folder-card-content';
        cardEl.appendChild(cardContentEl);

        // render card title link
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(`### [[${folder}/${basename}.md|${basename}]]`, cardContentEl, '', this.app.workspace.activeLeaf.view)
        }

        // create title
        let titleMD = ''
        if (metadata && metadata.title) {
            titleMD = `**${metadata.title}**`
        }

        // add subtitle
        if (metadata && metadata.subtitle) {
            titleMD = `${titleMD}
*${metadata.subtitle}*`
        }
        
        // render title and subtitle
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(titleMD, cardContentEl, '', this.app.workspace.activeLeaf.view)
        }

        // add/render authors list if available in metadata
        if (metadata && metadata.authors) {
            let authorLinks = "**Authors:** ";
            metadata.authors.forEach((author: string, index: number) => {
                const authorLink = `[[Figures/${author}.md|${author}]]`;
                authorLinks += authorLink;
                // Add a comma and space after each author link, except the last one
                if (index < metadata.authors.length - 1) {
                    authorLinks += ", ";
                }
            });
            if (this.app.workspace.activeLeaf) {
                MarkdownRenderer.renderMarkdown(authorLinks, cardContentEl, '', this.app.workspace.activeLeaf.view);
            }
        }

        // handle figure md
        let figureMD = ""

        // add birth date
        if (metadata && metadata.birth_date) {
            figureMD = `**Birth date:** ${metadata.birth_date}`
        }

        // add death date
        if (metadata && metadata.death_date) {
            figureMD = `${figureMD}
**Death date:** ${metadata.death_date}`
        }

        // add birth place
        if (metadata && metadata.birth_place) {
            figureMD = `${figureMD}
**Birth place:** ${metadata.birth_place}`
        }

        // add death place
        if (metadata && metadata.death_place) {
            figureMD = `${figureMD}
**Death place:** ${metadata.death_place}`
        }

        // render figure MD
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(figureMD, cardContentEl, '', this.app.workspace.activeLeaf.view);
        }

        // handle status MD
        let statusMD = ''

        // add status
        if (metadata && metadata.status) {
            statusMD = `**Status:** ${metadata.status}`
        }

        // add status update date
        if (metadata && metadata.status_updated) {
            statusMD = `${statusMD}
**Updated:** ${metadata.status_updated}`
        }

        // render status MD
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(statusMD, cardContentEl, '', this.app.workspace.activeLeaf.view);
        }


        // handel/render tags
        if (metadata && metadata.tags) {
            let tagsText = ''; // Initialize an empty string for the tags

            metadata.tags.forEach((tag: string, index: number) => {
                tagsText += `#${tag}`; // Append each tag to the string

                if (index < metadata.tags.length - 1) {
                    tagsText += ' '; // Add a space after each tag, except the last one
                }
            });

            // Render the tags as Markdown
            if (this.app.workspace.activeLeaf) {
                MarkdownRenderer.renderMarkdown(tagsText, cardContentEl, '', this.app.workspace.activeLeaf.view);
            }

        }

        // render cover image
        if (metadata && metadata.cover) {
            const coverImagePath = metadata.cover;
            // Check if the file exists in the vault
            const coverImageFile = this.app.vault.getAbstractFileByPath(coverImagePath);
            if (coverImageFile instanceof TFile) {
                const coverImageEl = document.createElement('img');
                // Convert the file path to a URL that Obsidian can display
                coverImageEl.src = this.app.vault.getResourcePath(coverImageFile);
                coverImageEl.className = 'folder-cover-image';
                cardEl.appendChild(coverImageEl);
            }
        }

        return cardEl;
    }

}
