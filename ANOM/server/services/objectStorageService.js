const COS = require('ibm-cos-sdk');


function client() {
  return new COS.S3({
    endpoint: process.env.IBM_COS_ENDPOINT,
    apiKeyId: process.env.IBM_COS_API_KEY,
    serviceInstanceId: process.env.IBM_COS_SERVICE_INSTANCE_ID,
    signatureVersion: "iam",
    ibmAuthEndpoint: "https://iam.cloud.ibm.com/identity/token",
  });
}
function bucket() { if (!process.env.IBM_COS_BUCKET) throw new Error('IBM_COS_BUCKET is not configured.'); return process.env.IBM_COS_BUCKET; }
async function uploadProfilePhoto(userId, file) { const key=`profiles/${userId}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_')}`; try {
  await client().putObject({
    Bucket: bucket(),
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }).promise();
} catch (err) {
  console.error("COS Upload Error:", err);
  throw err;
} const base=process.env.IBM_COS_PUBLIC_URL || process.env.IBM_COS_ENDPOINT.replace(/\/$/,''); return { key, url:`${base}/${bucket()}/${key}` }; }
module.exports={uploadProfilePhoto};
