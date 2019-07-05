const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const s3 = new AWS.S3();
module.exports.doesObjectExist = async s3Key => {
  const exists = await s3
    .headObject({
      Bucket: process.env.BUCKET,
      Key: s3Key
    })
    .promise()
    .then(
      () => true,
      err => {
        if (err.code === 'NotFound') {
          return false;
        }
        throw err;
      }
    );
  return exists;
};
module.exports.uploadUrlToS3 = async (key, url) => {
  const result = await s3
    .putObject({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: url
    })
    .promise()
    .then(
      () => true,
      err => {
        throw err;
      }
    );
  return result;
};
module.exports.getUrlFromObject = async key => {
  const fileBody = await s3
    .getObject({
      Bucket: process.env.BUCKET,
      Key: key
    })
    .promise()
    .then(
      data => data.Body.toString(),
      err => {
        throw err;
      }
    );
  return fileBody;
};
