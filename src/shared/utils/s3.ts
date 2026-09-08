import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const bucket = process.env.AWS_S3_BUCKET || 'imbrace';
const prefix = process.env.AWS_S3_BUCKET_PREFIX || 'uat';
const publicBase = process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.amazonaws.com`;

function randomStr(len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function getUploadPath(folder: string, orgId: string, ext: string): string {
    return `${prefix}/${folder}/${orgId}/file_${randomStr(26)}.${ext}`;
}

export function getUploadPathWithEmail(prefixFolder: string, email: string, ext: string): string {
    const fileType = ext.split('/').pop() || ext;
    return `${prefixFolder}/${email}/file_${randomStr(26)}.${fileType}`;
}

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read' as any,
    }));
    return `${publicBase}/${key}`;
}
