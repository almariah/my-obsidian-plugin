import { App, ButtonComponent, Modal, Setting, SuggestModal, Notice } from 'obsidian';
import { escapeYAMLForbiddenChars, sanitizeFilename, getFileUniqueName, getDate, downloadImage, trans } from './utils'

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
    defaultQuery: string

    constructor(app: App, defaultQuery: string) {
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
        this.defaultQuery = defaultQuery
    }

    onOpen() {
        super.onOpen();
        const input = this.inputEl;
        if (input) {
            input.value = this.defaultQuery;
        }
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
            throw new Error(`Error searching for books: ${error}`);
        }
    }

    // Returns all available suggestions.
    async getSuggestions(query: string): Promise<Book[]> {
        if (!query) {
            query = this.inputEl.value
        }
        if (query) {
            return await this.searchBooks(query);
        }
        return []
    }

    renderSuggestion(book: Book, el: HTMLElement) {
        let authorsText = ""
        if (book.authors && book.authors.length > 0) {
            authorsText = `${book.authors.join(', ')}`
        }

        let isbnText = ""
        if (book.isbn && book.isbn.length > 0) {
            isbnText = `${book.isbn.join(', ')}`
        }

        // Container for details and image
        const bookDetailsContainer = el.createEl('div', { cls: 'book-details-container' });
        
        // Container for book info
        const bookInfoContainer = bookDetailsContainer.createEl('div', { cls: 'book-info-container' });

        // Create elements for book details
        // book title element
        bookInfoContainer.createEl('div', { text: book.title, cls: 'book-title' });
        // book subtitle element
        bookInfoContainer.createEl('div', { text: book.subtitle || "", cls: 'book-subtitle' });
        // book line break element
        bookInfoContainer.createEl('div', { cls: 'book-line-break' });

        let authorEL = bookInfoContainer.createEl('small', { cls: 'book-property' });
        authorEL.innerHTML = `<b>Authors:</b> ${authorsText}`;

        let publisherEL = bookInfoContainer.createEl('small', { cls: 'book-property' });
        publisherEL.innerHTML = `<b>Publisher:</b> ${book.publisher}`;

        let publishedEL = bookInfoContainer.createEl('small', { cls: 'book-property' });
        publishedEL.innerHTML = `<b>Published:</b> ${book.published}`;

        let pagesEL = bookInfoContainer.createEl('small', {cls: 'book-property' });
        pagesEL.innerHTML = `<b>Pages:</b> ${book.pages}`;

        let isbnEL = bookInfoContainer.createEl('small', { cls: 'book-property' });
        isbnEL.innerHTML = `<b>ISBNs:</b> ${isbnText}`;

        let cover = book.coverURL;
        if (!cover) {
            cover = "https://github.com/almariah/my-obsidian-plugin/blob/master/cover.jpg?raw=true"
        }

        bookDetailsContainer.createEl('img', {
            attr: {
                src: cover,
            },
            cls: 'book-cover-image',
        });

        el.appendChild(bookDetailsContainer);
    }

    // Perform action on the selected book.
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

    // flatten categories from search result and fetched book by ID
    processCategories(categories1: string[], categories2: string[]) {
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

    // compare lang from search result and query by ID
    // also detect arabic automatically
    // sometimes API not returing details about language
    getLanguage(lang1: string, lang2: string, title: string) {
        const arabicRegex = /[\u0600-\u06FF]/;
        if (arabicRegex.test(title)) {
            return "العربية"
        }
        return lang2 || lang1 || "en"
    }

    // compare two dates and return oldest
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


    // we use this because fetching specific book by ID from API sometimes gives 
    // more details than the fetched books details in the list of search query
    // then we override book details (fetched by search) by details fetched by ID
    async fetchBookFurtherDetails() {
        try {
            const bookURL = GOOGLE_BOOKS_API_URL + "/" + encodeURIComponent(this.book.id);
            const bookByIDResponse = await fetch(bookURL);

            if (!bookByIDResponse.ok) {
                throw new Error(`HTTP error! status: ${bookByIDResponse.status}`);
            }

            const bookByID = await bookByIDResponse.json();

            this.book.title = bookByID.volumeInfo.title || this.book.title
            this.book.subtitle = bookByID.volumeInfo.subtitle || this.book.subtitle || ""
            this.book.authors = bookByID.volumeInfo.authors || this.book.authors || []
            this.book.tags = this.processCategories(bookByID.volumeInfo.categories, this.book.tags)
            this.book.coverURL = bookByID.volumeInfo.imageLinks?.smallThumbnail || this.book.coverURL
            this.book.publisher = bookByID.volumeInfo.publisher || this.book.publisher || ""
            this.book.summary = escapeYAMLForbiddenChars(bookByID.volumeInfo.description || this.book.summary)
            this.book.previewLink = bookByID.volumeInfo.previewLink || this.book.previewLink
            this.book.isbn = this.handleISBN(bookByID.volumeInfo.industryIdentifiers || this.book.industryIdentifiers)
            this.book.language = this.getLanguage(this.book.language, bookByID.volumeInfo.language, this.book.title)
            this.book.published = this.getOldestDate(bookByID.volumeInfo.publishedDate, this.book.published)
            this.book.rating = bookByID.volumeInfo.averageRating || this.book.rating || 0
            this.book.pages = bookByID.volumeInfo.pageCount || this.book.pages || 0
        } catch (error) {
            console.error("Error fetching book details by ID:", error);
        }
    }

    // handle authors list on click delete
    redrawAuthorsList(containerEl: HTMLElement) {
        containerEl.empty(); // Clear the existing list
        this.book.authors.forEach((author, index) => {
            this.addAuthorSetting(containerEl, index);
        });
    }

    // handle ISBN list on click delete
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
        contentEl.createEl("h2", { text: "Create Book Note" });

        const coverElement = contentEl.createEl('img', {
            attr: {
                src: this.book.coverURL || "https://github.com/almariah/my-obsidian-plugin/blob/master/cover.jpg?raw=true",
            },
            cls: 'create-book-cover',
        });

        new Setting(contentEl)
            .setName('Cover URL')
            .setDesc('Enter book cover image URL')
            .addText(text => text
                .setValue(this.book.coverURL)
                .setPlaceholder("Enter book cover image URL")
                .onChange(async (value) => {
                    this.book.coverURL = value
                    coverElement.src = value || "https://github.com/almariah/my-obsidian-plugin/blob/master/cover.jpg?raw=true";
                }
                ))

        this.fileName = `Books/${sanitizeFilename(this.book.title)}.md`

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

        new Setting(contentEl)
            .setName("Authors")
            .setDesc("Add author")
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

        new Setting(contentEl)
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
            .addButton(button => {
                button
                    .setButtonText('Create Book Note')
                    .setCta()
                    .onClick(() => {
                        // handle list (authors/isbn) empty added elements
                        if (this.book.authors.some(author => author.trim() === "")) {
                            new Notice("Author name can not be empty!");
                            return
                        }
                        if (this.book.isbn.some(isbn => isbn.trim() === "")) {
                            new Notice("ISBN can not be empty!");
                            return
                        }
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

    async createBookNote() {

        const newFileName = getFileUniqueName(this.app, this.fileName);

        let coverFile = "Books/cover.jpg"
        if (this.book.coverURL != undefined && this.book.coverURL != "") {
            coverFile = `${newFileName.substring(0, newFileName.length - 3)}.jpeg`
        }

        if (this.book.language === "en") {
            this.book.tags.push("English")
        } else {
            this.book.tags.push(this.book.language)
        }

        let direction = "ltr"
        if (this.book.language === "العربية") {
            direction = "rtl"
        }

        const date = getDate()

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
status_updated: ${date}
summary: "${this.book.summary}"
cover: ${coverFile}
direction: ${direction}
---

## ${trans(this.book.language, "Reviews")}

## ${trans(this.book.language, "Notes")}

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
            await downloadImage(
                this.book.coverURL.trim(),
                coverFile
            )
        }
    }
}
