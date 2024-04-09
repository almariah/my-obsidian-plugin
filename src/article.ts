import { App, TFile, Notice, TAbstractFile, Modal, Setting } from 'obsidian';
import { getDate, getFileUniqueName } from './utils'

export async function onArticleCreation(app: App, file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
        return;
    }

    if (file.parent?.path != "Articles") {
        return
    }

    await sleep(500);

    const title = file.basename
    let secIntro = "Introduction"
    let lang = "English"
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(title)) {
        secIntro = "مقدمة"
        lang = "العربية"
    }

    const date = getDate()

    const content = `---
aliases:
type: Article
title: ${title}
subtitle:
authors:
tags: [${lang}]
publisher:
published:
links:
created: ${date}
status: Unread
status_updated:
summary:
cssclass: disable-count
---
\`\`\`dataview
table WITHOUT ID
map(authors, (item) => link("Figures/"+item)) as Authors,
file.mday as Updated
from "Articles"
where file.name = this.file.name
\`\`\`
\`\`\`dataview
table WITHOUT ID summary as Summary
from "Articles"
where file.name = this.file.name
\`\`\`

## ${secIntro}

`
    await app.vault.modify(file, content);

}

export class AddArticle extends Modal {
    title: string = "";

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.containerEl.addClass('create-article')
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Create Article" });

        new Setting(contentEl)
            .setName("Article Title")
            .addText((text) =>
                text.onChange((value) => {
                    this.title = value
                })
            .setPlaceholder("Enter article title")
            );

        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText('Create Article')
                    .setCta()
                    .onClick(() => {
                        if (this.title === "") {
                            new Notice("Missing article title!");
                            return
                        }
                        this.createArticle()
                        this.close()
                    });
            })
            .addButton(button => {
                button
                    .setButtonText('Cancel')
                    .onClick(() => { this.close() })
            })

    }

    async createArticle() {
        const articleFile = `Articles/${this.title}.md`
        const newFileName = getFileUniqueName(this.app, articleFile);
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
