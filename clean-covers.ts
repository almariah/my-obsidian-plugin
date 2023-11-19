import { App, Modal, Setting } from "obsidian";

export class CleanCovers extends Modal {
    constructor(app: App) {
        super(app);
    }

    async findOrphanedCovers() {
        let orphanedCovers = [];

        // Get all files in the vault
        const files = this.app.vault.getFiles();
        // Filter out files in the "Books" directory
        const filesInBooksDir = files.filter(file => file.path.startsWith('Books/'));

        for (const file of filesInBooksDir) {
            if (file.extension === 'jpeg' || file.extension === 'jpg') {
                // Construct the corresponding markdown file path
                const markdownFilePath = file.path.replace(/\.(jpeg|jpg)$/, '.md');
                // Check if the markdown file exists
                const mdFileExists = files.some(f => f.path === markdownFilePath);

                if (!mdFileExists && file.path != "Books/cover.jpg") {
                    orphanedCovers.push(file.path);
                }
            }
        }

        return orphanedCovers;
    }

    async deleteFiles(filesToDelete: string[]) {
        for (const filePath of filesToDelete) {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file) {
                await this.app.vault.delete(file);
            }
        }
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Delete the following orphaned covers:" });

        const orphanedCovers = await this.findOrphanedCovers();
        if (orphanedCovers.length > 0) {
            const listEl = contentEl.createEl("ul");
            orphanedCovers.forEach(filePath => {
                listEl.createEl("li", { text: filePath });
            });

            new Setting(contentEl)
                .addButton(button => {
                    button
                        .setButtonText('Confirm Delete')
                        .setCta()
                        .onClick(async () => {
                            await this.deleteFiles(orphanedCovers);
                            this.close();
                        });
                })
                .addButton(button => {
                    button
                        .setButtonText('Cancel')
                        .onClick(() => { this.close() })
                });
        } else {
            contentEl.createEl("p", { text: "No orphaned covers found." });
            new Setting(contentEl)
                .addButton(button => {
                    button
                        .setButtonText('Ok')
                        .setCta()
                        .onClick(() => { this.close() })
                });
        }

    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
