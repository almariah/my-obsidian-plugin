import { App, TFile, FrontMatterCache, Notice, MarkdownRenderer, MarkdownPostProcessorContext } from 'obsidian';

import {unixTimeToDateString, trans} from './utils'

export class MetadataRender {
    app: App;
    lang: string = "English"

    constructor(app: App) {
        this.app = app
    }

    async run(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        if (!el.children) {
            return
        }
        if (!el.children[0]) {
            return
        }
        if (el.children[0].className !== "frontmatter") {
            return
        }

        const metadata = ctx.frontmatter

        const arabicRegex = /[\u0600-\u06FF]/;
        if (metadata && metadata.title) {
            if (arabicRegex.test(metadata.title)) {
                this.lang = "العربية"
        }
        }
        if (metadata && metadata.name) {
            if (arabicRegex.test(metadata.name)) {
                this.lang = "العربية"
            }
        }

        if (metadata) {
            const card = this.createCard("xxxx", metadata, "xxx")
            el.appendChild(card);
        }

        if (metadata && metadata.summary) {
            if (this.app.workspace.activeLeaf) {
                MarkdownRenderer.renderMarkdown(`**${trans(this.lang, "Summary")}**: ${metadata.summary}\n___`, el, '', this.app.workspace.activeLeaf.view);
            }
        }
    }

    createCard(folder: string, metadata: FrontMatterCache, basename: string): HTMLElement {
        const cardEl = document.createElement('div');
        cardEl.className = 'folder-card';

        // Create the container for the card content and the image
        const cardContentEl = document.createElement('div');
        cardContentEl.className = 'folder-card-content';
        cardEl.appendChild(cardContentEl);

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
        if (metadata && metadata.name) {
            if (this.app.workspace.activeLeaf) {
                MarkdownRenderer.renderMarkdown(`**${metadata.name}**`, cardContentEl, '', this.app.workspace.activeLeaf.view)
            }
        }

        // add/render authors list if available in metadata
        if (metadata && metadata.authors) {
            let authorLinks = `**${trans(this.lang, "Authors")}:**\n`;
            metadata.authors.forEach((author: string, index: number) => {
                const authorLink = `* [[Figures/${author}.md|${author}]]\n`;
                authorLinks += authorLink;
            });
            if (this.app.workspace.activeLeaf) {
                MarkdownRenderer.renderMarkdown(authorLinks, cardContentEl, '', this.app.workspace.activeLeaf.view);
            }
        }

        // handle figure md
        let figureMD = ""

        // add birth date
        if (metadata && metadata.birth_date) {
            figureMD = `**${trans(this.lang, "Birth Date")}:** ${metadata.birth_date}`
        }

        // add death date
        if (metadata && metadata.death_date) {

            figureMD = `${figureMD}
**${trans(this.lang, "Death Date")}:** ${metadata.death_date}`
        }

        // add birth place
        if (metadata && metadata.birth_place) {
            figureMD = `${figureMD}
**${trans(this.lang, "Birth Place")}:** ${metadata.birth_place}`
        }

        // add death place
        if (metadata && metadata.death_place) {
            figureMD = `${figureMD}
**${trans(this.lang, "Death Place")}:** ${metadata.death_place}`
        }

        // render figure MD
        if (this.app.workspace.activeLeaf) {
            MarkdownRenderer.renderMarkdown(figureMD, cardContentEl, '', this.app.workspace.activeLeaf.view);
        }

        const activeFile = this.app.workspace.getActiveFile()
        if (activeFile?.stat.mtime) {
            if (this.app.workspace.activeLeaf) {
                const d = unixTimeToDateString(activeFile.stat.mtime)
                const updated = `**${trans(this.lang, "Last Updated")}:** ${d}`
                MarkdownRenderer.renderMarkdown(updated, cardContentEl, '', this.app.workspace.activeLeaf.view);
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
