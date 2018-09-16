import React, { Component } from 'react';
import Webcam from 'react-webcam';
import Amplify, { Auth } from 'aws-amplify';
import AWS from 'aws-sdk';
import {v4 as uuid} from 'uuid';
import aws_exports from './aws-exports';
Amplify.configure(aws_exports);

const uploadImageToS3 = async (imgSrc, pathPrefix) => {
  const credentials = await Auth.currentCredentials();
  const s3 = new AWS.S3({
      apiVersion: '2013-04-01',
      credentials: Auth.essentialCredentials(credentials)
    });

  const base64Data = new Buffer(imgSrc.replace(/^data:image\/\w+;base64,/, ""), 'base64')
  const type = imgSrc.split(';')[0].split('/')[1]

  const params = {
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Key: `${pathPrefix}/${uuid()}.${type}`,
    Body: base64Data,
    ContentEncoding: 'base64',
    ContentType: `image/${type}`
  }

  return s3.upload(params).promise();
}


class WebcamCapture extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      captureInterval: null,
      label: ''
    }
  }
  setRef = webcam => {
    this.webcam = webcam;
  };
 
  capture = () => {
    const imageSrc = this.webcam.getScreenshot();
    uploadImageToS3(imageSrc, `public/${this.state.label}`);
  };

  toggleCapture = () => {
    this.state.captureInterval
      ? this.setState({ captureInterval: window.clearInterval(this.state.captureInterval) })
      : this.setState({ captureInterval: window.setInterval(this.capture, this.props.captureInterval) })
  }

  handleChange = (e) => this.setState({ [e.target.name]: e.target.value })

  render() {
    const videoConstraints = {
      width: 1280,
      height: 720,
      facingMode: "user"
    };
 
    return (
      <div>
        <div>
          <Webcam
            audio={false}
            height={350}
            ref={this.setRef}
            screenshotFormat="image/jpeg"
            screenshotWidth={224} // no sense capturing images in a resolution higher than what resnet wants
            width={350}
            videoConstraints={videoConstraints}
          />
        </div>
        <input placeholder='Enter a label name' type='text' onChange={this.handleChange} name='label' disabled={this.state.captureInterval} />
        <button onClick={this.toggleCapture} disabled={this.state.label === ''}>
          {
            this.state.captureInterval
              ? 'Stop Capturing'
              : 'Begin Capturing'
            }
        </button>
      </div>
    );
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <WebcamCapture captureInterval={300}/>
      </div>
    );
  }
}

export default App;
