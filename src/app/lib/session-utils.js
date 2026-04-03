import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'default-secret-key-change-it';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Session expires in 24 hours
        .sign(key);
}

export async function decrypt(input) {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}
