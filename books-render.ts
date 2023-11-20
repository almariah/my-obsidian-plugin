import { App, TFile, FrontMatterCache, Notice, MarkdownPostProcessorContext } from 'obsidian';
import * as Yaml from 'yaml';

export class BooksRender {
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
                    const card = this.createBookCard(file, metadata, subFilePath)
                    el.appendChild(card);
                }
            }
        }

        /*const mdFiles = pathList.filter(file => file.path.startsWith(folderPath) && file.extension === 'md');

        for (const file of mdFiles) {
            const fileContent = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
            
            // Check if metadata exists before passing it to createBookCard
            if (metadata) {
                const card = this.createBookCard(file, fileContent, metadata);
                el.appendChild(card);
            } else {
                // Handle case where there is no metadata, or create a default card
                const card = this.createBookCard(file, fileContent, {});
                el.appendChild(card);
            }
        }*/
    }

    createBookCard(file: TFile, metadata: FrontMatterCache, titleLink: string): HTMLElement {
        const cardEl = document.createElement('div');
        cardEl.className = 'book-card';
    
        // Create the container for the card content and the image
        const cardContentEl = document.createElement('div');
        cardContentEl.className = 'book-card-content';
        cardEl.appendChild(cardContentEl);
    
        // Create and append the title link
        let titleEl = document.createElement('a');
        titleEl.href = titleLink;
        titleEl.addEventListener('click', (e) => {
            e.preventDefault();
            this.app.workspace.openLinkText(file.path, '/', false);
        });
        let h3El = document.createElement('h3');
        h3El.textContent = file.basename;
        titleEl.appendChild(h3El);
        cardContentEl.appendChild(titleEl);
    
        // Create and append the created date element
        const createdEl = document.createElement('p');
        createdEl.textContent = metadata.created;
        cardContentEl.appendChild(createdEl);
    
        // Create and append authors list if available in metadata
        if (metadata && metadata.authors) {
            const authorsDiv = document.createElement('div');
            metadata.authors.forEach((author: string, index: number) => {
                const authorLink = document.createElement('a');
                const smallTag = document.createElement('small');
                authorLink.href = `#${author.replace(/\s+/g, '-').toLowerCase()}`;
                authorLink.textContent = author;
                smallTag.appendChild(authorLink);
                authorsDiv.appendChild(smallTag);
                if (index < metadata.authors.length - 1) {
                    authorsDiv.appendChild(document.createTextNode(', '));
                }
            });
            cardContentEl.appendChild(authorsDiv);
        }
    
        // Create and append tags list if available in metadata
        if (metadata && metadata.tags) {
            const tagsDiv = document.createElement('div');
            metadata.tags.forEach((tag: string, index: number) => {
                const tagLink = document.createElement('a');
                const smallTag = document.createElement('small');
                tagLink.href = `/search?tag=${encodeURIComponent(tag)}`;
                tagLink.textContent = `#${tag}`;
                tagLink.onclick = function (event) {
                    event.preventDefault();
                };
                smallTag.appendChild(tagLink);
                tagsDiv.appendChild(smallTag);
                if (index < metadata.tags.length - 1) {
                    tagsDiv.appendChild(document.createTextNode(' '));
                }
            });
            cardContentEl.appendChild(tagsDiv);
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
                coverImageEl.className = 'book-cover-image';
                cardEl.appendChild(coverImageEl);
            }
        }
    
        return cardEl;
    }
    
}