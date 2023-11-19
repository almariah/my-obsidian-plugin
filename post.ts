import { App, TFile, Notice, TAbstractFile, Modal, Setting } from 'obsidian';
import { getDate, getFileUniqueName } from './utils'

export async function onPostCreation(app: App, file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
        return;
    }

    if (file.parent?.path != "Blog/posts") {
        return
    }

    await sleep(500);

    const title = file.basename
    let tags = ["English"]
    let dir = "ltr"
    let locale = "default"
    let comments = "en"
    let otherPostsHeading = "Other posts"
    let otherPostTags = ["English"]
    let tocHeading = "On this page"
    let intro = "Introduction"

    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(title)) {
        tags = ["العربية"]
        dir = "rtl"
        locale = "ar-Eg"
        comments = "ar"
        otherPostsHeading = "مقالات أخرى"
        otherPostTags = ["العربية"]
        tocHeading = "المحتويات"
        intro = "مقدمة"
    }

    const date = getDate()

    const content = `---
share: false
aliases:
type: Post
title: ${title}
date: ${date}
tags: [${tags.toString()}]

dir: ${dir}
locale: ${locale}
toc_heading: ${tocHeading}
comments: ${comments}
other_posts_heading: ${otherPostsHeading}
other_posts_limit: 10
other_posts: [${otherPostTags.toString()}]

created: ${date}
status:
status_updated:
summary:
cssclasses: disable-count
---
\`\`\`dataview
table without id file.mday as Updated
from "Blog/posts"
where file.name = this.file.name
\`\`\`
\`\`\`dataview
table WITHOUT ID summary as Summary
from "Blog/posts"
where file.name = this.file.name
\`\`\`

## ${intro}

`
    await app.vault.modify(file, content);
}

export class AddPost extends Modal {
    title: string = "";

    constructor(app: App) {
        super(app);
    }

    onOpen() {
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
                            new Notice("add post title");
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
