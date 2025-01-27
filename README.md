# YOLO Secrets [![starline](https://starlines.qoo.monster/assets/qoomon/yolo-secret)](https://github.com/qoomon/starlines)
This is a web app to share secrets in an easy but secure way. 

**Secrets can be read only once!**

**[Demo](https://yolo.qoo.monster/)**

## Features
- Secrets are deleted once they have been read
- Secrets can be either plain **Text** or a **File**
- Secrets have an expiration time (up to 14 days)
- Secrets are encrypted at rest (aes-256-gcm)
- Secrets can be protected by a passphrase in additon to the secret id

## Workflow
- Upload a Secret to create a Secret URL
    - Secret Share URL example: `https://yolo-secret.vercel.app/#AfNOis3I2GwIytTDxJvu6UW9e7rm6HGF` 
- Send Secret URL to recipient
- The recipient then can open then Secret URL and hit the REVEAL button
    - Once the secret is revealed it's already deleted and can not be accessed again  

##

## Development

### TODO
- Add a passphrase generator

### Run Local
```sh
npm install

npx vercel dev
```

### Operations Notes
- Delete all secrets from redis:
  - `EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 *`

