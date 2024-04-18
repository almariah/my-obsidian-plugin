import { App, TFile, Notice, TAbstractFile, Modal, Setting } from 'obsidian';
import { getDate, getFileUniqueName, trans } from './utils'

export async function onPostCreation(app: App, file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
        return;
    }

    if (file.parent?.path != "Blog/posts") {
        return
    }

    await sleep(500);

    const title = file.basename


    let lang = "English"
    let comments = "en"
    let direction = "ltr"
    let locale = "default"
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(title)) {
        lang = "العربية"
        comments = "ar"
        direction = "rtl"
        locale = "ar-Eg"
    }

    const date = getDate()

    const content = `---
share: false
aliases:
type: Post
title: ${title}
date: ${date}
tags: [${lang}]
direction: ${direction}
locale: ${locale}
toc_heading: ${trans(lang, "On this page")}
comments: ${comments}
other_posts_heading: ${trans(lang, "Other posts")}
other_posts_limit: 10
other_posts: [${lang}]
created: ${date}
status:
status_updated: ${date}
summary:
---

## ${trans(lang, "Introduction")}

`
    await app.vault.modify(file, content);
}

export class AddPost extends Modal {
    title: string = "";

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.containerEl.addClass('create-post')
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Create Post" });

        new Setting(contentEl)
            .setName("Post Title")
            .addText((text) =>
                text.onChange((value) => {
                    this.title = value
                })
            .setPlaceholder("Enter post title")
            );

        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText('Create Post')
                    .setCta()
                    .onClick(() => {
                        if (this.title === "") {
                            new Notice("Missing post title!");
                            return
                        }
                        this.createPost()
                        this.close()
                    });
            })
            .addButton(button => {
                button
                    .setButtonText('Cancel')
                    .onClick(() => { this.close() })
            })

    }

    async createPost() {
        const postFile = `Blog/posts/${this.title}.md`
        const newFileName = getFileUniqueName(this.app, postFile);
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
