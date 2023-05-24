export async function readFileAsBase64String(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // data url format: 'data:[<mimetype>][;base64],<data>'
            const base64Data = (reader.result as string).split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = (e) => {
            reader.abort();
            reject(e);
        };
    });
}

export function downloadBase64File(data: string, filename: string) {
    const a = document.createElement('a')
    a.href = `data:application/octet-stream;base64,${data}`;
    a.download = filename;
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}


export function copyToClipboard(value?: string) {
    if(!value) return Promise.resolve();
    return navigator.clipboard.writeText(value);
}