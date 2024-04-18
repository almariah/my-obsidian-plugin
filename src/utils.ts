import { App, getBlobArrayBuffer } from 'obsidian';

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

export function sanitizeFilename(filename: string) {
    return filename.replace(/[\/#^[\]|\\:]/g, '');
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

export function getDate() {
    const nowDate = new Date();
    return [
        nowDate.getFullYear(),
        (nowDate.getMonth() + 1).toString().padStart(2, '0'),
        nowDate.getDate().toString().padStart(2, '0')
    ].join('-');
}

export async function downloadImage(url: string, path: string) {
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

export function unixTimeToDateString(unixTime: number) {
    // Create a new Date object using the Unix time
    const date = new Date(unixTime);

    // Define an array of month names
    const monthNames = [
      "January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"
    ];

    // Extract the components of the date
    const monthIndex = date.getMonth();
    const day = date.getDate();
    const year = date.getFullYear();

    // Format the date as desired
    const formattedDate = `${monthNames[monthIndex]} ${day}, ${year}`;

    return formattedDate;
}

export function trans(lang: string, lookup: string) {
    if (lang === "العربية") {
        if (lookup === "Summary") return "ملخص"
        if (lookup === "Authors") return "المؤلفون"
        if (lookup === "Birth Date") return "تاريخ الميلاد"
        if (lookup === "Death Date") return "تاريخ الوفاة"
        if (lookup === "Birth Place") return "مكان الولادة"
        if (lookup === "Death Place") return "مكان الوفاة"
        if (lookup === "Last Updated") return "آخر تحديث"
        if (lookup === "Introduction") return "مقدمة"
        if (lookup === "Reviews") return "مراجعات"
        if (lookup === "Notes") return "ملحوظات"
        if (lookup === "Other posts") return "مقالات أخرى"
        if (lookup === "On this page") return "المحتويات"
        return lookup
    }
    return lookup
}
