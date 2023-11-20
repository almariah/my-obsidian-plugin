import { App, TFile, Modal, Setting } from "obsidian";

export class BlockRefCleaner extends Modal {
    cleanedRefs: string[] = [];

    constructor(app: App) {
        super(app);
    }

    async cleanUnusedBlockRefs() {
        const files = this.app.vault.getMarkdownFiles();
        let allBlockRefs = new Map();

        // Collect all block references
        for (const file of files) {
            if (file.basename.endsWith('.excalidraw')) {
                continue;
            }
            const content = await this.app.vault.read(file);
            const blockRefs = this.extractBlockRefs(content);
            blockRefs.forEach(ref => {
                if (!allBlockRefs.has(ref)) {
                    allBlockRefs.set(ref, []);
                }
                allBlockRefs.get(ref).push(file.path);
            });
        }

        for (const [ref, paths] of allBlockRefs) {
            const linkedMentions = this.getLinkedMentions(ref, files);
            if (linkedMentions.length === 0) {
                await this.deleteBlockRef(ref, paths);
                // Specify the type of 'path' explicitly
                paths.forEach((path: string) => this.cleanedRefs.push(`${path}#^${ref}`));
            }
        }

        this.showCleanedRefsModal();
    }

    extractBlockRefs(content: string): string[] {
        const regex = /.*\s\^([^\s\[\]]+)$/gm;
        let match;
        let blockRefs: string[] = [];

        while ((match = regex.exec(content)) !== null) {
            blockRefs.push(match[1]);
        }

        return blockRefs;
    }

    getLinkedMentions(blockRef: string, files: TFile[]): string[] {
        let linkedMentions: string[] = [];
        const blockRefSuffix = `#^${blockRef}`;

        for (const file of files) {
            const allLinks = this.app.metadataCache.getFileCache(file)?.links || [];
            if (allLinks.some(link => link.link.endsWith(blockRefSuffix))) {
                linkedMentions.push(file.path);
            }
        }
        return linkedMentions;
    }

    // will use in future in case of performance issues
    // need to find a way to to get subpath block (^REF)
    // and compare it with blockRef
	getLinkedMentions_1(blockRef: string) {
		const allFiles = this.app.metadataCache.resolvedLinks;
		let linkedMentions: Array<string> = [];

        console.log(allFiles)

		Object.keys(allFiles).forEach((key) => {
			//console.log(allFiles[key])
		});

		return linkedMentions.sort();
	}

    async deleteBlockRef(blockRef: string, filePaths: string[]): Promise<void> {
        const refPattern = new RegExp(`\\s\\^${blockRef}$`, 'gm');

        for (const filePath of filePaths) {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
                let content = await this.app.vault.read(file);
                // Replace the pattern (space + ^blockRef at the end of a line) with an empty string
                const newContent = content.replace(refPattern, '');
                await this.app.vault.modify(file, newContent);
            }
        }
    }

    showCleanedRefsModal() {
        this.contentEl.empty(); // Clear any existing content in the modal
        this.contentEl.createEl("h2", { text: "Cleaned Block References:" });

        const list = this.contentEl.createEl('ul');
        if (this.cleanedRefs.length === 0) {
            list.createEl('li').textContent = 'No unused block references found.';
        } else {
            this.cleanedRefs.forEach(ref => {
                list.createEl('li').textContent = ref;
            });
        }

        new Setting(this.contentEl)
                .addButton(button => {
                    button
                        .setButtonText('Ok')
                        .setCta()
                        .onClick(() => { this.close() })
                });

        this.open(); // Open the modal
    }
}
