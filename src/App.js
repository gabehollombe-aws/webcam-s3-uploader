import React, { Component } from 'react';
import Webcam from 'react-webcam';
import Amplify, { Auth } from 'aws-amplify';
import { S3Image } from 'aws-amplify-react';
import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { Form, Image } from 'semantic-ui-react';
import aws_exports from './aws-exports';
Amplify.configure(aws_exports);

const S3 = async () => {
  const credentials = await Auth.currentCredentials();
  return new AWS.S3({
    apiVersion: '2013-04-01',
    credentials: Auth.essentialCredentials(credentials)
  });
}

const uploadImageToS3 = async (imgSrc, pathPrefix) => {
  const base64Data = new Buffer(imgSrc.replace(/^data:image\/\w+;base64,/, ""), 'base64')
  const type = imgSrc.split(';')[0].split('/')[1]
  const extension = type === 'jpeg' ? 'jpg' : type;

  const params = {
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Key: `${pathPrefix}/${uuid()}.${extension}`,
    Body: base64Data,
    ContentEncoding: 'base64',
    ContentType: `image/${type}`
  }

  const s3 = await S3();
  await s3.upload(params).promise();
  return params.Key;
}

const getImageKeys = async (datasetName) => {
  console.log('Getting image keys for ' + datasetName)
  const s3 = await S3();
  const result = await s3.listObjectsV2({
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Prefix: `public/${datasetName}/`,
  }).promise();
  return result.Contents.map(o => o.Key);
}

class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };

  handleCapture = () => {
    const imageSrc = this.webcam.getScreenshot();
    this.props.onCapture(imageSrc);
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleCapture();
    }
  }

  componentWillMount = () => {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  render() {
    const videoConstraints = {
      width: 224,
      height: 224,
      facingMode: "user"
    };

    return (
      <div>
        <div>
          <Webcam
            audio={false}
            height={224}
            ref={this.setRef}
            screenshotFormat="image/jpeg"
            screenshotWidth={224} // no sense capturing images in a resolution higher than what resnet wants
            width={224}
            videoConstraints={videoConstraints}
          />
        </div>
        <Form.Button onClick={this.handleCapture} disabled={this.props.disabled}>
          Capture
        </Form.Button>
      </div>
    );
  }
}

class ImageWrapper extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.src) return <Image src={this.props.src} />;
    return <S3Image style={{display: 'inline-block'}} imgKey={this.props.imgKey.replace(/^public\//, '')} />
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      label: '',
      datasetName: '',
      totalUploads: 0,
      uploadsCompleted: 0,
      existingImageKeys: [],
      uploadedImages:{}
    };
  }

  fetchImageKeys = async (datasetName) => {
    if (datasetName === '') return;

    const existingImageKeys = await getImageKeys(datasetName);
    this.setState({ existingImageKeys })
  }

  handleChange = (e) => this.setState({ [e.target.name]: e.target.value })

  handleDatasetBlur = (e) => this.fetchImageKeys(e.target.value);

  upload = async (imageSrc) => {
    if (this.state.label === '') return;

    const imageKey = await uploadImageToS3(imageSrc, `public/${this.state.datasetName}/${this.state.label}`);

    this.setState({
      totalUploads: this.state.totalUploads + 1
    });
    this.setState({
      uploadsCompleted: this.state.uploadsCompleted + 1,
      uploadedImages: { ...this.state.uploadedImages, ...{[imageKey]: imageSrc} }
    });
  }

  render() {
    const UploadStatus = () => {
      if (this.state.totalUploads === 0) return <div>Waiting for capture...</div>
      return (
        <div>
          Uploaded {this.state.uploadsCompleted} of {this.state.totalUploads}
        </div>
      )
    }

    return (
      <div>
        <Form>
          <Form.Group widths='equal'>
            <Form.Input label='Dataset Name' placeholder='Dataset Name' name='datasetName' onChange={this.handleChange} onBlur={this.handleDatasetBlur} />
            <Form.Input label='Label' placeholder='Label' name='label' onChange={this.handleChange} />
          </Form.Group>
          
          <Form.Group>
            <WebcamCapture onCapture={this.upload} disabled={this.state.label === ''}/>
          </Form.Group>

          <UploadStatus />

          <Image.Group size='tiny'>
            { this.state.existingImageKeys.map(key => <ImageWrapper key={key} imgKey={key} />) }
            { Object.keys(this.state.uploadedImages).map(key => <ImageWrapper key={key} src={this.state.uploadedImages[key]} />) }
          </Image.Group>
        </Form>
      </div>
    );
  }
}

export default App;
