# Webcam S3 Uploader

This is a simple web app that makes it easy to upload images from your webcam into a 'folder' inside an S3 bucket on AWS.

You enter a 'Dataset Name' (think 'parent folder') and a 'class name' (think 'sub-folder'), and all images captured will appear in s3://<your_bucket_name_described_in_src/aws_exports.js>/public/<dataset_name>/<class_name>

## Setup

**This project uses AWS Amplify. Please see the [Amplify CLI Getting Started guide](https://aws-amplify.github.io/docs/cli/init#amplify-init) and install and configure the Amplify CLI before moving on to the next step.**

From the directory containing this README, run `amplify init`, then `amplify storage add` (making sure you enable read/write for unauthenticated guest users), then `amplify push`

## Running the app
From the directory containing this README, run `npm start`
