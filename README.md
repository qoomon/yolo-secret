# YOLO-secret
This is a secret share service.

## Features
* Secrets are encrypted at rest (aes-256-gcm)
* Secrets are deleted once they have been read
* Secrets can be eighter plain **Text** or a **File**
* Secrets have an expiration time (up to 14 days)
* Secrets can be protected by a passphrase in additon to the secret id

## Workflow
- Upload a Secret to create a Secret URL
    - Secret Share URL example: `https://yolo-secret.vercel.app/#AfNOis3I2GwIytTDxJvu6UW9e7rm6HGF` 
- Send Secret URL to recipient
- The recipient then can open then Secret URL and hit the REVEAL button
    - Once the secret is revealed it's already deleted and can not be accessed again  

## Development

```sh
npm install
npx vercel dev
```
