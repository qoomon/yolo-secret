# YOLO Secrets [![starline](https://starlines.qoo.monster/assets/qoomon/yolo-secret)](https://github.com/qoomon/starlines)
This is a web app to share secrets in an easy but secure way. 

**Secrets can be read only once!**

**[Demo](https://yolo.qoo.monster/)**

## Features
- Secrets are deleted once they have been read
- Secrets can be either plain **Text** or a **File**
- Secrets have an expiration time (up to 14 days)
- Secrets are encrypted as an PGP message on the client side

## Workflow
- Upload a Secret to create a Secret URL
    - Secret Share URL example: `https://yolo.qoo.monster/ID#PASSPHRASE` 
- Send Secret URL to recipient
- The recipient open the Secret URL and hit the REVEAL button
    - Once the secret is revealed it's already deleted and can not be accessed again  

##

## Development

### Run Local
```sh
npm install

npx vercel dev
```

### Operations Notes
- Delete all secrets from redis:
  - `EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 *`

