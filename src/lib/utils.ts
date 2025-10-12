export async function readFileAsBase64String(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // data url format: 'data:[<mimetype>][;base64],<data>'
            const base64Data = (reader.result as string).split(',')[1] as string;
            resolve(base64Data);
        };
        reader.onerror = (e) => {
            reader.abort();
            reject(e);
        };
    });
}

export function downloadBase64File(dataBase64: string, filename: string) {
    const a = document.createElement('a')
    a.href = `data:application/octet-stream;base64,${dataBase64}`;
    a.download = filename;
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    /**
     * Converts a binary string (like the output from openpgp.js) into a Data URL.
     * @param binaryString The binary file data as a string.
     * @param mimeType The MIME type of the file (e.g., 'application/pdf').
     * @returns A Promise that resolves with the Data URL string.
     */
    async function binaryStringToDataUrl(binaryString: string, mimeType: string = 'application/octet-stream'): Promise<string> {
        const stringLength: number = binaryString.length;

        // 1. Convert Binary String to Uint8Array
        const dataView = new Uint8Array(stringLength);
        for (let i = 0; i < stringLength; i++) {
            dataView[i] = binaryString.charCodeAt(i);
        }

        // 2. Create a Blob
        const blob = new Blob([dataView], { type: mimeType });

        // 3. Generate the Data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error("FileReader result was not a string."));
                }
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(blob);
        });
    }

}


export function copyToClipboard(value?: string) {
    if (!value) return Promise.resolve();
    return navigator.clipboard.writeText(value);
}