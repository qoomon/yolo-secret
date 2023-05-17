export type DataUrlObject = { mimetype: string, encoding: string, data: string }

export function parseBase64DataUrl(dataUrl: string): DataUrlObject {
    //data url format 'data:[<mimetype>][;base64],<data>'
    const [prefix, content] = splitAtFirst(':', dataUrl);
    if (prefix !== 'data:') throw new Error('Invalid data url');
    const [metaData, data] = splitAtFirst(',', content);
    const [mimetype, encoding] = splitAtFirst(';', metaData)
    if (encoding !== 'base64') throw new Error('Invalid data url');
    return {mimetype, encoding, data};
}

export function firstValueOf<Type>(value: Type | Type[]): Type {
    if (Array.isArray(value)) return value[0];
    return value;
}


function splitAtFirst(separator: string, string: string): [string, string?] {
    const separatorIndex = string.indexOf(separator);
    if (separatorIndex === -1) return [string];
    return [
        string.substring(0, separatorIndex),
        string.substring(separatorIndex + separator.length),
    ];
}

