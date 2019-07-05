const Utils = require('./utils');
const S3Service = require('./s3.service');

module.exports.index = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const short_code = event && event.pathParameters ? event.pathParameters.short_code || null : null;
  if (short_code && (await S3Service.doesObjectExist(short_code))) {
    return {
      statusCode: 301,
      headers: {
        Location: await S3Service.getUrlFromObject(short_code)
      }
    };
  } else {
    return {
      statusCode: 301,
      headers: {
        Location: process.env.DEFAULT_REDIRECT_URL
      }
    };
  }
};
module.exports.create = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let randomString = Utils.randomString(process.env.SHORT_CODE_LENGTH);
  let continueLoop = await S3Service.doesObjectExist(randomString);
  while (continueLoop) {
    randomString = Utils.randomString(process.env.SHORT_CODE_LENGTH);
    continueLoop = await S3Service.doesObjectExist(randomString);
  }
  const body = JSON.parse(event.body);
  if (await S3Service.uploadUrlToS3(randomString, body.url)) {
    return {
      statusCode: 201,
      body: JSON.stringify({
        longUrl: body.url,
        shortUrl: `${process.env.BASE_URL}/${randomString}`
      })
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'failed to create short url'
      })
    };
  }
};
