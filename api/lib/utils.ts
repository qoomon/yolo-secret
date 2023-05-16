//data url format 'data:[<mimetype>][;base64],<data>'
export const base64DataUrlRegex = /^data:(?<mimetype>[^;]*);base64,(?<data>.*)/;