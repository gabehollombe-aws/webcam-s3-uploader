import React, { Component } from 'react';
import Webcam from 'react-webcam';
import Amplify, { Auth } from 'aws-amplify';
import AWS from 'aws-sdk';
import {v4 as uuid} from 'uuid';
import aws_exports from './aws-exports';
Amplify.configure(aws_exports);

const uploadImageToS3 = async (imgSrc) => {
  const credentials = await Auth.currentCredentials();
  const s3 = new AWS.S3({
      apiVersion: '2013-04-01',
      credentials: Auth.essentialCredentials(credentials)
    });


  const base64Data = new Buffer(imgSrc.replace(/^data:image\/\w+;base64,/, ""), 'base64')

  const type = imgSrc.split(';')[0].split('/')[1]

  const params = {
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Key: `public/${uuid()}.${type}`,
    Body: base64Data,
    // ACL: 'public-read',
    ContentEncoding: 'base64', // required
    ContentType: `image/${type}`
  }

  console.log('Uploading...')
  const result = await s3.upload(params).promise();
  console.dir(result);
}


class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };
 
  capture = () => {
    const imageSrc = this.webcam.getScreenshot();
    uploadImageToS3(imageSrc);
  };
 
  render() {
    const videoConstraints = {
      width: 1280,
      height: 720,
      facingMode: "user"
    };
 
    return (
      <div>
        <Webcam
          audio={false}
          height={350}
          ref={this.setRef}
          screenshotFormat="image/jpeg"
          width={350}
          videoConstraints={videoConstraints}
        />
        <button onClick={this.capture}>Capture photo</button>
      </div>
    );
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <WebcamCapture />
      </div>
    );
  }
}

export default App;
