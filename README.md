# Setup

- Rename serverless.yml.example serverless.yml
- Fill Variables in serverless.yml

# Deploy

- sls deploy with the profile name in the serverless.yml
- In AWS API Gateway, setup custom domain to point to deployment. Make sure to you path as /

# Usage

- POST Api with apikey for creating shorturl
- GET API when hit it will redirect to original url.
