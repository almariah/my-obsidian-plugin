import { App, TFile, TAbstractFile } from 'obsidian';

export async function onFigureCreation(app: App, file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
        return;
    }

    if (file.parent?.path != "Figures") {
        return
    }

    await sleep(500);

    const title = file.basename
    let notes = "Notes"
    let lang = "English"
    var arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(title)) {
        notes = "ملحوظات"
        lang = "العربية"
    }

    var nowDate = new Date();
    var date = [
        nowDate.getFullYear(),
        (nowDate.getMonth() + 1).toString().padStart(2, '0'),
        nowDate.getDate().toString().padStart(2, '0')
    ].join('-');

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
status_updated:
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

## ${notes}

`
    await app.vault.modify(file, content);

}
