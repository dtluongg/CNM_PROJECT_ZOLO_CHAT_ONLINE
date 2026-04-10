const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Tên bucket S3
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;

// Domain CloudFront (vd: https://d1234abcdef.cloudfront.net)
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

module.exports = { s3Client, S3_BUCKET, CLOUDFRONT_DOMAIN };
