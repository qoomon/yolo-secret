import * as argon2 from "argon2";

(async () => {
    const hash = await argon2.hash("password", {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 10,
        salt: Buffer.from("0000000000000000"),
    });
    console.log(hash)
    console.log([...hash].map((i) => i.charCodeAt(0)).reduce((a, b) => a + b));
})()
