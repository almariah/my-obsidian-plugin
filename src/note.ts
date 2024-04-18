import { App, TFile, Notice, TAbstractFile, Modal, Setting } from 'obsidian';
import { getDate, getFileUniqueName, trans } from './utils'

export async function onNoteCreation(app: App, file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
        return;
    }

    if (file.parent?.path != "Notes") {
        return
    }

    await sleep(500);

    const title = file.basename
    let lang = "English"
    let direction = "ltr"
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(title)) {
        lang = "العربية"
        direction = "rtl"
    }

    const date = getDate()

    const content = `---
aliases:
type: Note
title: ${title}
subtitle:
tags: [${lang}]
links:
created: ${date}
status:
status_updated: ${date}
summary:
direction: ${direction}
---

`
    let currentContent = ""
    if (file instanceof  TFile) {
        currentContent = await app.vault.read(file)
    }
    if (currentContent.startsWith("---")) {
        return
    }

    await app.vault.modify(file, content + currentContent);
}

export class AddNote extends Modal {
    title: string = "";

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.containerEl.addClass('create-note')
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Create Note" });

        new Setting(contentEl)
            .setName("Note Title")
            .addText((text) =>
                text.onChange((value) => {
                    this.title = value
                })
            .setPlaceholder("Enter Note title")
            );

        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText('Create Note')
                    .setCta()
                    .onClick(() => {
                        if (this.title === "") {
                            new Notice("Missing note title!");
                            return
                        }
                        this.createNote()
                        this.close()
                    });
            })
            .addButton(button => {
                button
                    .setButtonText('Cancel')
                    .onClick(() => { this.close() })
            })

    }

    async createNote() {
        const noteFile = `Notes/${this.title}.md`
        const newFileName = getFileUniqueName(this.app, noteFile);
        let created = await this.app.vault.create(newFileName, "")

        const active_leaf = this.app.workspace.activeLeaf;
        if (!active_leaf) {
            return;
        }
        await active_leaf.openFile(created, {
            state: { mode: "source" },
        });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
