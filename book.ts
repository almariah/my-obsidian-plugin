import { App, ButtonComponent, Modal, getBlobArrayBuffer, Setting, SuggestModal } from 'obsidian';

const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";

interface Book {
    id: string
    title: string;
    subtitle: string;
    authors: string[]
    tags: string[]
    pages: number
    publisher: string
    published: string
    isbn: string[]
    rating: number
    previewLink: string
    language: string
    summary: string
    coverURL: string
    industryIdentifiers: any[]
}

export class SearchBook extends SuggestModal<Book> {

    constructor(app: App) {
        super(app);
        this.setPlaceholder("Search book by content, title, ISBN")
        const instructions = [
            {
                command: "↑↓",
                purpose: "to navigate"
            },
            {
                command: "↵",
                purpose: "to add"
            },
            {
                command: "esc",
                purpose: "to dismiss"
            }
        ];
        this.setInstructions(instructions)
        this.emptyStateText = "No books found"
    }

    async searchBooks(query: string): Promise<Book[]> {

        const searchQueryURI = encodeURIComponent(query);
        const urlSearch = `${GOOGLE_BOOKS_API_URL}?q=${searchQueryURI}&maxResults=40`;

        try {
            const resSearch = await fetch(urlSearch);
            if (!resSearch.ok) {
                throw new Error(`Failed to fetch data from Google Books API: ${resSearch.status}`);
            }

            const data = await resSearch.json();

            if (!data.items) {
                return []
            }

            // Extract relevant book information from the API response
            const books: Book[] = data.items.map((item: any) => ({
                id: item.id,
                title: item.volumeInfo.title,
                subtitle: item.volumeInfo.subtitle,
                authors: item.volumeInfo.authors || [],
                tags: item.volumeInfo.categories,
                coverURL: item.volumeInfo.imageLinks?.smallThumbnail,
                publisher: item.volumeInfo.publisher,
                published: item.volumeInfo.publishedDate,
                isbn: item.volumeInfo.industryIdentifiers?.map((identifier: { identifier: any; }) => `${identifier.identifier}`) || [],
                pages: item.volumeInfo.pageCount || 0,
                summary: item.volumeInfo.description,
                previewLink: item.volumeInfo.previewLink,
                language: item.volumeInfo.language,
                rating: item.volumeInfo.averageRating || 0,
                industryIdentifiers: item.volumeInfo.industryIdentifiers
            }));

            return books;
        } catch (error) {
            console.error("Error searching for books:", error);
            throw error;
        }
    }

    // Returns all available suggestions.
    async getSuggestions(query: string): Promise<Book[]> {
        // Call the `searchBooks` function to get a list of books
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (query) {
            return await this.searchBooks(query);
        }
        return []
    }

    renderSuggestion(book: Book, el: HTMLElement) {
        let authorsText = ""
        if (book.authors && book.authors.length > 0) {
            authorsText = `Authors: ${book.authors.join(', ')}`
        }

        let isbnText = ""
        if (book.isbn && book.isbn.length > 0) {
            isbnText = `ISBNs: ${book.isbn.join(', ')}`
        }

        // Container for details and image
        const detailsContainer = el.createEl('div', { cls: 'details-container' });
        detailsContainer.style.display = 'flex';
        detailsContainer.style.justifyContent = 'space-between'; // Space between details and image
        detailsContainer.style.alignItems = 'flex-start'; // Align items at the top

        // Container for book details
        const infoContainer = detailsContainer.createEl('div', { cls: 'info-container' });

        // Create elements for book details
        const titleEl = infoContainer.createEl('div', { text: book.title, cls: 'book-title' });
        const subtitleEl = infoContainer.createEl('div', { text: book.subtitle || "", cls: 'book-author' });

        const lineBreakEl = infoContainer.createEl('div', { cls: 'line-break' });

        const authorEl = infoContainer.createEl('small', { text: authorsText, cls: 'book-author' });
        const publisherEl = infoContainer.createEl('small', { text: `Publisher: ${book.publisher}`, cls: 'book-author' });
        const publishedEl = infoContainer.createEl('small', { text: `Published: ${book.published}`, cls: 'book-author' });
        const pagesEl = infoContainer.createEl('small', { text: `Pages: ${book.pages}`, cls: 'book-author' });
        const isbnEl = infoContainer.createEl('small', { text: isbnText, cls: 'book-author' });

        const imgContainer = detailsContainer.createEl('div', { cls: 'img-container' });

        let cover = book.coverURL;
        if (!cover) {
            cover = "https://github.com/almariah/my-obsidian-plugin/blob/master/cover.jpg?raw=true"
        }

        const img = imgContainer.createEl('img', {
            attr: {
                src: cover,
            },
            cls: 'cover-image',
        });

        el.appendChild(detailsContainer);
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(book: Book, evt: MouseEvent | KeyboardEvent) {
        new CreateBook(this.app, book).open()
    }
}


class CreateBook extends Modal {

    book: Book
    fileName: string

    constructor(app: App, book: Book) {
        super(app);

        this.book = book

        this.fetchBookFurtherDetails();
    }

    escapeYAMLForbiddenChars(input: string) {
        if (input == undefined) {
            return ""
        }
        // Define the list of YAML forbidden characters and their escape sequences
        const forbiddenChars: { [key: string]: string } = {
            '\\': '\\\\',
            '"': '\\"',
            '\n': '\\n',
            '\r': '\\r',
            '\t': '\\t',
            '\b': '\\b',
            '\f': '\\f',
            '\v': '\\v',
            '\0': '\\0',
            '\x85': '\\x85',
            '\u2028': '\\u2028',
            '\u2029': '\\u2029'
        };

        // Replace each forbidden character with its escape sequence
        return input.replace(/[\\\"\n\r\t\b\f\v\0\x85\u2028\u2029]/g, match => forbiddenChars[match]);
    }

    processCategories(categories1: string[], categories2: string[]) {
        console.log(categories1, categories2)
        if (categories1 == undefined && categories2 == undefined) {
            return []
        }

        let categories = []
        if (categories1 == undefined) {
            categories = categories2
        } else if (categories2 == undefined) {
            categories = categories1
        } else {
            categories = [...categories1, ...categories2]
        }

        const allItems = categories.flatMap(item =>
            item.split(/[&/]/).map(subItem => subItem.trim().split(/\s+/).join('-'))
        );
        return [...new Set(allItems)];
    }

    handleISBN(isbn: any[]) {
        if (isbn == undefined) {
            return []
        }
        return isbn.map(item => `"${item.identifier}"`)
    }

    getLanguage(lang1: string, lang2: string, title: string) {
        var arabicRegex = /[\u0600-\u06FF]/;
        if (arabicRegex.test(title)) {
            return "ar"
        }
        return lang2 || lang1 || "en"
    }

    getOldestDate(dateString1: string, dateString2: string) {
        if (dateString1 == undefined && dateString2 == undefined) {
            return ""
        }

        if (dateString1 == undefined) {
            return dateString2
        }

        if (dateString2 == undefined) {
            return dateString1
        }

        const date1 = new Date(dateString1);
        const date2 = new Date(dateString2);

        if (date1 < date2) {
            return dateString1;
        } else if (date2 < date1) {
            return dateString2;
        } else {
            return dateString1
        }
    }

    async fetchBookFurtherDetails() {
        try {
            const bookURL = GOOGLE_BOOKS_API_URL + "/" + encodeURIComponent(this.book.id);
            const bookRes = await fetch(bookURL);

            if (!bookRes.ok) {
                throw new Error(`HTTP error! status: ${bookRes.status}`);
            }

            const bookV2 = await bookRes.json();

            this.book.title = bookV2.volumeInfo.title || this.book.title
            this.book.subtitle = bookV2.volumeInfo.subtitle || this.book.subtitle || ""
            this.book.authors = bookV2.volumeInfo.authors || this.book.authors || []
            this.book.tags = this.processCategories(bookV2.volumeInfo.categories, this.book.tags)
            this.book.coverURL = bookV2.volumeInfo.imageLinks?.smallThumbnail || this.book.coverURL
            this.book.publisher = bookV2.volumeInfo.publisher || this.book.publisher || ""
            this.book.summary = this.escapeYAMLForbiddenChars(bookV2.volumeInfo.description || this.book.summary)
            this.book.previewLink = bookV2.volumeInfo.previewLink || this.book.previewLink
            this.book.isbn = this.handleISBN(bookV2.volumeInfo.industryIdentifiers || this.book.industryIdentifiers)
            this.book.language = this.getLanguage(this.book.language, bookV2.volumeInfo.language, this.book.title)
            this.book.published = this.getOldestDate(bookV2.volumeInfo.publishedDate, this.book.published)
            this.book.rating = bookV2.volumeInfo.averageRating || this.book.rating || 0
            this.book.pages = bookV2.volumeInfo.pageCount || this.book.pages || 0
        } catch (error) {
            console.error("Error fetching book details:", error);
        }
    }

    sanitizeFilename() {
        return this.book.title.replace(/[\/#^[\]|\\:]/g, '');
    }

    getBookFileUniqueName(bookFile: string) {

        let attempt = 0;
        let exist;
        let newFileName = ""

        while (true) {

            if (attempt === 0) {
                newFileName = bookFile
                exist = this.app.vault.getAbstractFileByPath(newFileName)
            } else {
                const fileParts = bookFile.split('.');
                const baseName = fileParts[0];
                const extension = fileParts[1];
                newFileName = `${baseName} (${attempt}).${extension}`;
                exist = this.app.vault.getAbstractFileByPath(newFileName)
            }
            if (exist) {
                attempt++;
            } else {
                return newFileName
            }
        }
    }

    redrawAuthorsList(containerEl: HTMLElement) {
        containerEl.empty(); // Clear the existing list
        this.book.authors.forEach((author, index) => {
            this.addAuthorSetting(containerEl, index);
        });
    }

    redrawISBNList(containerEl: HTMLElement) {
        containerEl.empty(); // Clear the existing list
        this.book.isbn.forEach((isbn, index) => {
            this.addISBNSetting(containerEl, index);
        });
    }

    addAuthorSetting(contentEl: HTMLElement, index: number) {
        new Setting(contentEl)
            .addText(text => text
                .setValue(this.book.authors[index])
                .setPlaceholder("Enter author name")
                .onChange(async (value) => {
                    this.book.authors[index] = value; // Update the author in the array
                })
            )
            .addExtraButton((cb) => {
                cb.setIcon("cross")
                    .setTooltip("Delete")
                    .onClick(() => {
                        this.book.authors.splice(
                            index,
                            1
                        );
                        this.redrawAuthorsList(contentEl);
                    })
            })
    }

    addISBNSetting(contentEl: HTMLElement, index: number) {
        new Setting(contentEl)
            .addText(text => text
                .setValue(this.book.isbn[index])
                .setPlaceholder("Enter ISBN")
                .onChange(async (value) => {
                    this.book.isbn[index] = value; // Update the author in the array
                })
            )
            .addExtraButton((cb) => {
                cb.setIcon("cross")
                    .setTooltip("Delete")
                    .onClick(() => {
                        this.book.isbn.splice(
                            index,
                            1
                        );
                        this.redrawISBNList(contentEl);
                    })
            })
    }

    onOpen() {
        this.containerEl.addClass('create-book')
        const { contentEl } = this;
        this.titleEl.textContent = "Create Book Note";

        this.fileName = `Books/${this.sanitizeFilename()}.md`

        new Setting(contentEl)
            .setName('File Name')
            .setDesc('Enter book file name')
            .addText(text => text
                .setValue(this.fileName)
                .onChange(async (value) => {
                    this.fileName = value
                }
                ))

        new Setting(contentEl)
            .setName('Title')
            .setDesc('Book title')
            .addText(text => text
                .setValue(this.book.title)
                .onChange(async (value) => {
                    this.book.title = value
                }
                ))

        new Setting(contentEl)
            .setName('Subtitle')
            .setDesc('Book subtitle')
            .addText(text => text
                .setValue(this.book.subtitle)
                .onChange(async (value) => {
                    this.book.subtitle = value
                }
                ))

        new Setting(this.contentEl)
            .setName("Add Author")
            .setDesc("Add Author")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional author")
                    .setButtonText("+")
                    .setCta()
                    .onClick(() => {
                        this.book.authors.push("");
                        this.addAuthorSetting(authorsContainer, this.book.authors.length - 1);
                    });
            });

        const authorsContainer = contentEl.createEl('div');
        //const s = new Setting(authorsContainer)

        this.book.authors.forEach((_, index) => {
            this.addAuthorSetting(authorsContainer, index);
        });

        new Setting(contentEl)
            .setName('Pages')
            .setDesc('Book pages')
            .addText(text => text
                .setValue(this.book.pages.toString())
                .onChange(async (value) => {
                    this.book.pages = Number(value)
                }
                ))

        new Setting(contentEl)
            .setName('Publisher')
            .setDesc('Book publisher')
            .addText(text => text
                .setValue(this.book.publisher)
                .onChange(async (value) => {
                    this.book.publisher = value
                }
                ))

        new Setting(contentEl)
            .setName('Published at')
            .setDesc('Book published at')
            .addMomentFormat(text => text
                .setDefaultFormat('YYYY-MM-DD')
                .setValue(this.book.published)
                .onChange(async (value) => {
                    this.book.published = value
                }
                ))

        new Setting(this.contentEl)
            .setName("Add ISBN")
            .setDesc("Add ISBN")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional ISBN")
                    .setButtonText("+")
                    .setCta()
                    .onClick(() => {
                        this.book.isbn.push("");
                        this.addISBNSetting(isbnContainer, this.book.isbn.length - 1);
                    });
            });

        const isbnContainer = contentEl.createEl('div');
        //const isbnC = new Setting(isbnContainer)

        this.book.isbn.forEach((isbn, index) => {
            this.addISBNSetting(isbnContainer, index);
        });

        new Setting(contentEl)
            .setName('Rating')
            .setDesc('Book rating')
            .addText(text => text
                .setValue(this.book.rating.toString())
                .onChange(async (value) => {
                    this.book.rating = Number(value)
                }
                ))

        new Setting(contentEl)
            .setName('Cover')
            .setDesc('Book cover')
            .addText(text => text
                .setValue(this.book.coverURL)
                .onChange(async (value) => {
                    this.book.coverURL = value
                }
                ))

        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText('Create Note')
                    .onClick(() => {
                        this.createBookNote()
                        this.close()
                    })
            })
            .addButton(button => {
                button
                    .setButtonText('Cancel')
                    .onClick(() => { this.close() })
            })

    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    async downloadImage(url: string, path: string) {
        const proxyUrl = 'https://corsproxy.io/?'

        const headers = { 'X-Requested-With': 'XMLHttpRequest' };

        const res = await fetch(`${proxyUrl}${url}`, {
            method: 'GET',
            mode: 'cors',
            headers: headers,
        });

        const imageblob = await res.blob()
        const image = await getBlobArrayBuffer(imageblob)

        try {
            await this.app.vault.createBinary(path, image);
        } catch (error) {
            throw new Error(`Could not download cover "${url}" to path "${path}": ${error}`);
        }

    }

    async createBookNote() {

        const newFileName = this.getBookFileUniqueName(this.fileName);

        let coverFile = "Books/cover.jpg"
        if (this.book.coverURL != undefined && this.book.coverURL != "") {
            coverFile = `${newFileName.substring(0, newFileName.length - 3)}.jpeg`
        }

        let noteReviews = "Reviews"
        let noteNotes = "Notes"
        if (this.book.language == "ar") {
            this.book.tags.push("العربية")
            noteReviews = "مراجعات"
            noteNotes = "ملحوظات"
        } else if (this.book.language == "en") {
            this.book.tags.push("English")
        }

        const nowDate = new Date();
        const date = [
            nowDate.getFullYear(),
            (nowDate.getMonth() + 1).toString().padStart(2, '0'),
            nowDate.getDate().toString().padStart(2, '0')
        ].join('-');

        const bookContent = `---
aliases:
type: Book
title: "${this.book.title}"
subtitle: "${this.book.subtitle}"
authors: [${this.book.authors}]
tags: [${this.book.tags}]
pages: ${this.book.pages}
publisher: "${this.book.publisher}"
published: ${this.book.published}
isbn: [${this.book.isbn}]
rating: ${this.book.rating}
preview: ${this.book.previewLink}
edition:
other_editions:
form:
links:
created: ${date}
status: Unread
status_updated:
summary: "${this.book.summary}"
cover: ${coverFile}
cssclass: disable-count
---
\`\`\`dataview
table WITHOUT ID embed(link(cover, "150")) as Cover,
map(authors, (item) => link("Figures/"+item)) as Authors,
file.cday as Updated
from "Books"
where file.name = this.file.name
\`\`\`
\`\`\`dataview
table WITHOUT ID summary as Summary
from "Books"
where file.name = this.file.name
\`\`\`

## ${noteReviews}

## ${noteNotes}

`
        let createdBook = null
        createdBook = await this.app.vault.create(newFileName, bookContent);

        const active_leaf = this.app.workspace.activeLeaf;
        if (!active_leaf) {
            return;
        }
        active_leaf.openFile(createdBook, {
            state: { mode: "source" },
        });

        if (this.book.coverURL != undefined && this.book.coverURL != "") {
            await this.downloadImage(
                this.book.coverURL.trim(),
                coverFile
            )
        }

    }
}
