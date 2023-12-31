import { App, Plugin, PluginSettingTab, Setting, TAbstractFile, Platform, Menu, MenuItem, Notice } from 'obsidian';
import { SearchBook } from './book'
import { CleanCovers } from './clean-covers'
import { BlockRefCleaner } from './clean-block-ref'
import { onFigureCreation, AddFigures } from './figure'
import { onArticleCreation, AddArticle } from './article'
import { AddPost, onPostCreation } from 'post';
import { FolderRender } from 'folder-render';

import { YoutubeDownloader } from './youtube'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

export default class MyObsidianPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();


        this.registerMarkdownCodeBlockProcessor('folder', async (source, el, ctx) => {
            let render = new FolderRender(this.app);
            await render.run(source, el, ctx);
        });

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'add-book',
            name: 'Add Book',
            callback: () => {
                new SearchBook(this.app, "").open();
            }
        });

        this.addCommand({
            id: 'add-figures',
            name: 'Add Figures',
            callback: () => {
                new AddFigures(this.app).open();
            }
        });

        this.addCommand({
            id: 'add-post',
            name: 'Add Post',
            callback: () => {
                new AddPost(this.app).open();
            }
        });

        this.addCommand({
            id: 'add-article',
            name: 'Add Article',
            callback: () => {
                new AddArticle(this.app).open();
            }
        });

        this.addCommand({
            id: 'clean-covers',
            name: 'Clean Covers',
            callback: () => {
                new CleanCovers(this.app).open();
            }
        });


        this.addCommand({
            id: 'clean-block-ref',
            name: 'Clean Block REF',
            callback: () => {
                const blockRefFinder = new BlockRefCleaner(this.app);
                blockRefFinder.cleanUnusedBlockRefs();
            },
        })

        this.addCommand({
            id: 'download-youtube-videos',
            name: 'Download YouTube Videos',
            callback: () => {
                if (!Platform.isDesktop) {
                    new Notice('Video download is available only on the desktop platform.');
                    return
                }
                new YoutubeDownloader(this.app).open();
            },
        })

        // @ts-ignore
        this.app.workspace.on('receive-text-menu', (menu: Menu, shareText: string) => {
            menu.addItem((item: MenuItem) => {
                item.setTitle('Add Book');
                item.setIcon('book');
                item.onClick(() => { new SearchBook(this.app, shareText).open() });
            });
        }),

            // This adds a settings tab so the user can configure various aspects of the plugin
            this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        //this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
        //    console.log('click', evt);
        //});

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onFigureCreation(this.app, file)
            ));
        })
        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onPostCreation(this.app, file)
            ));
        })
        this.app.workspace.onLayoutReady(async () => {
            this.registerEvent(this.app.vault.on(
                "create",
                (file: TAbstractFile) => onArticleCreation(this.app, file)
            ));
        })
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyObsidianPlugin;

    constructor(app: App, plugin: MyObsidianPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
