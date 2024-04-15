import { Plugin, TAbstractFile, Menu, MenuItem } from 'obsidian';
import { FolderRender } from './folder-render';
import { SearchBook } from './book'
import { AddFigures, onFigureCreation } from './figure'
import { AddArticle, onArticleCreation } from './article'
import { AddNote, onNoteCreation } from './note';
import { AddPost, onPostCreation } from './post';
import { CleanCovers } from './clean-covers'

export default class MyObsidianPlugin extends Plugin {
    async onload() {
        // register folder render
        this.registerMarkdownCodeBlockProcessor('folder', async (source, el, ctx) => {
            let render = new FolderRender(this.app);
            await render.run(source, el, ctx);
        });

        // add book command
        this.addCommand({
            id: 'add-book',
            name: 'Add Book',
            callback: () => {
                new SearchBook(this.app, "").open();
            }
        });

        // add search books for share menu
        // @ts-ignore
        this.app.workspace.on('receive-text-menu', (menu: Menu, shareText: string) => {
            menu.addItem((item: MenuItem) => {
                item.setTitle('Add Book');
                item.setIcon('book');
                item.onClick(() => { new SearchBook(this.app, shareText).open() });
            });
        }),

        // add figure command
        this.addCommand({
            id: 'add-figures',
            name: 'Add Figures',
            callback: () => {
                new AddFigures(this.app).open();
            }
        });

        // handle on figure creation
        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onFigureCreation(this.app, file)
            ));
        })

        // add article command
        this.addCommand({
            id: 'add-article',
            name: 'Add Article',
            callback: () => {
                new AddArticle(this.app).open();
            }
        });

        // handle on article creation
        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onArticleCreation(this.app, file)
            ));
        })

        // add note command
        this.addCommand({
            id: 'add-note',
            name: 'Add Note',
            callback: () => {
                new AddNote(this.app).open();
            }
        });

        // handle on note creation
        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onNoteCreation(this.app, file)
            ));
        })

        // add post command
        this.addCommand({
            id: 'add-post',
            name: 'Add Post',
            callback: () => {
                new AddPost(this.app).open();
            }
        });

        // handle on post creation
        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onPostCreation(this.app, file)
            ));
        })

        // add clean orphan covers command
        this.addCommand({
            id: 'clean-covers',
            name: 'Clean Covers',
            callback: () => {
                new CleanCovers(this.app).open();
            }
        });
    }
}
