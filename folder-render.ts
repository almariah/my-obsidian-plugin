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
        const tags: string[] = yaml.tags

        let pathList = await this.app.vault.adapter.list(folderPath);
        const subFolderList = pathList.folders;
        const subFileList = pathList.files;

        for (var i = 0; i < subFileList.length; i++) {
            var subFilePath = subFileList[i];
            if (!subFilePath.endsWith('.md')) continue;

            let file = this.app.vault.getAbstractFileByPath(subFilePath);
            if (file && file instanceof TFile) {
                const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;

                // Check if metadata contains any of the specific tags
                if (metadata) {
                    //if (metadata && metadata.tags && tags.some(tag => metadata.tags.includes(tag))) {
                    const card = this.createCard(metadata, file.basename)
                    el.appendChild(card);
                }
            }
        }
    }

    createCard(metadata: FrontMatterCache, basename: string): HTMLElement {
        const cardEl = document.createElement('div');
        cardEl.className = 'folder-card';

        // Create the container for the card content and the image
        const cardContentEl = document.createElement('div');
        cardContentEl.className = 'folder-card-content';
        cardEl.appendChild(cardContentEl);

        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(`### [[Books/${basename}.md|${basename}]]`, cardContentEl, '', this.app.workspace.activeLeaf.view)
        }

        let titleMD = ''
        if (metadata && metadata.title) {
            titleMD = `**${metadata.title}**`
        }
        if (metadata && metadata.subtitle) {
            titleMD = `${titleMD}
*${metadata.subtitle}*`
        }
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(titleMD, cardContentEl, '', this.app.workspace.activeLeaf.view)
        }

        //const createdEl = document.createElement('p');
        //createdEl.textContent = `Created: ${metadata.created}`;
        //cardContentEl.appendChild(createdEl);

        // Create and append authors list if available in metadata
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

        let figureMD = ""
        if (metadata && metadata.birth_date) {
            figureMD = `**Birth date:** ${metadata.birth_date}`
        }
        if (metadata && metadata.death_date) {
            figureMD = `${figureMD}
**Death date:** ${metadata.death_date}`
        }
        if (metadata && metadata.birth_place) {
            figureMD = `${figureMD}
**Birth place:** ${metadata.birth_place}`
        }
        if (metadata && metadata.death_place) {
            figureMD = `${figureMD}
**Death place:** ${metadata.death_place}`
        }
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(figureMD, cardContentEl, '', this.app.workspace.activeLeaf.view);
        }  

        let statusMD = ''
        if (metadata && metadata.status) {
            statusMD = `**Status:** ${metadata.status}`
        }
        if (metadata && metadata.status_updated) {
            statusMD = `${statusMD}
**Updated:** ${metadata.status_updated}`
        }

        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(statusMD, cardContentEl, '', this.app.workspace.activeLeaf.view);
        }

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

        // Add the cover image if it exists in the metadata
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