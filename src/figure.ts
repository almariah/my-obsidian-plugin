import { App, TFile, TAbstractFile, Modal, Setting, ButtonComponent, Notice } from 'obsidian';
import { getDate, getFileUniqueName } from './utils'

export async function onFigureCreation(app: App, file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
        return;
    }

    if (file.parent?.path != "Figures") {
        return
    }

    await sleep(500);

    const title = file.basename
    let secNotes = "Notes"
    let lang = "English"
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(title)) {
        secNotes = "ملحوظات"
        lang = "العربية"
    }

    const date = getDate()

    const content = `---
aliases:
type: Figure
name: ${title}
tags: [${lang}]
birth_date:
death_date:
birth_place:
death_place:
links:
created: ${date}
status:
status_updated: ${date}
summary:
image:
cssclass: disable-count
---
\`\`\`dataview
table WITHOUT ID birth_date as BDate, death_date as DDate, birth_place as BPlace, death_place as DPlace, file.mday as Updated
from "Figures"
where file.name = this.file.name
\`\`\`
\`\`\`dataview
table type as Type, status as Status
from "Books" or "Articles"
where contains(authors, this.file.name)
sort file.name asc
\`\`\`
\`\`\`dataview
table WITHOUT ID summary as Summary
from "Figures"
where file.name = this.file.name
\`\`\`

## ${secNotes}

`
    await app.vault.modify(file, content);

}

export class AddFigures extends Modal {

    figures: string[] = [];
    createButton: ButtonComponent;

    constructor(app: App) {
        super(app);
    }

    redrawFigureList(containerEl: HTMLElement) {
        containerEl.empty();
        this.figures.forEach((_, index) => {
            this.addFigureSetting(containerEl, index);
        });
    }

    addFigureSetting(contentEl: HTMLElement, index: number) {
        new Setting(contentEl)
            .addText(text => text
                .setValue(this.figures[index])
                .setPlaceholder("Enter figure name")
                .onChange(async (value) => {
                    this.figures[index] = value;
                })
            )
            .addExtraButton((cb) => {
                cb.setIcon("cross")
                    .setTooltip("Delete")
                    .onClick(() => {
                        this.figures.splice(index, 1);
                        this.redrawFigureList(contentEl);
                    })
            })
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Create Figures Notes" });

        new Setting(contentEl)
            .setName("Figures")
            .setDesc("Add figure")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional figure")
                    .setButtonText("+")
                    .setCta()
                    .onClick(() => {
                        this.figures.push("");
                        this.addFigureSetting(figuresContainer, this.figures.length - 1);
                    });
            });

        const figuresContainer = contentEl.createEl('div');

        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText('Create Figures')
                    .setCta()
                    .onClick(() => {
                        if (this.figures.length === 0) {
                            new Notice("Add at least one figure!");
                            return
                        }
                        if (this.figures.some(figure => figure.trim() === "")) {
                            new Notice("Figure name can not be empty!");
                            return
                        }
                        this.createFigures()
                        this.close()
                    });
                this.createButton = button
            })
            .addButton(button => {
                button
                    .setButtonText('Cancel')
                    .onClick(() => { this.close() })
            })
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }

    async createFigures() {
        for (const figure of this.figures) {
            const figureFile = `Figures/${figure}.md`
            const newFileName = getFileUniqueName(this.app, figureFile);
            this.app.vault.create(newFileName, "")
        }
    }
}
