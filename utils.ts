import { App } from 'obsidian';

export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeYAMLForbiddenChars(input: string) {
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

export function getFileUniqueName(app: App, fileName: string) {
    let attempt = 0;
    let exist;
    let newFileName = ""

    while (true) {

        if (attempt === 0) {
            newFileName = fileName
            exist = app.vault.getAbstractFileByPath(newFileName)
        } else {
            const fileParts = fileName.split('.');
            const baseName = fileParts[0];
            const extension = fileParts[1];
            newFileName = `${baseName} (${attempt}).${extension}`;
            exist = app.vault.getAbstractFileByPath(newFileName)
        }
        if (exist) {
            attempt++;
        } else {
            return newFileName
        }
    }
}

export function sanitizeFilename(filename: string) {
    return filename.replace(/[\/#^[\]|\\:]/g, '');
}

export function getDate() {
    const nowDate = new Date();
    return [
        nowDate.getFullYear(),
        (nowDate.getMonth() + 1).toString().padStart(2, '0'),
        nowDate.getDate().toString().padStart(2, '0')
    ].join('-');
}
